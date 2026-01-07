import logging
import json
import time
import sys
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from uuid import uuid4
from sqlmodel import Session
from database import engine 
from models import AnalyticsLog 

# Configure Console Logger
class StructuredLogger(logging.Logger):
    def _log(self, level, msg, args, exc_info=None, extra=None, stack_info=False):
        if extra is None: extra = {}
        payload = {
            "timestamp": time.time(),
            "level": logging.getLevelName(level),
            "message": msg,
            **extra
        }
        try:
            json_payload = json.dumps(payload, default=str)
        except TypeError:
            json_payload = json.dumps({"message": "Log serialization failed"})
        
        # Pass arguments correctly to super
        super()._log(level, json_payload, args, exc_info=exc_info, extra=None, stack_info=stack_info)

logging.setLoggerClass(StructuredLogger)
logger = logging.getLogger("zaman_negar")
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(logging.StreamHandler(sys.stdout))

class LogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid4())
        start_time = time.time()
        
        # --- HELPER: Save to DB with Error Printing ---
        def save_log_to_db(event_type: str, details: dict, user_id: int = None):
            try:
                # IMPORTANT: Convert details dict to string immediately
                details_str = json.dumps(details, default=str)
                
                with Session(engine) as session:
                    log_entry = AnalyticsLog(
                        event_type=event_type,
                        details=details_str,
                        user_id=user_id
                    )
                    session.add(log_entry)
                    session.commit()
            except Exception as db_err:
                # PRINT ERROR TO DOCKER LOGS VISIBLY
                print(f"!!!!!!!! DB LOG ERROR !!!!!!!!: {db_err}")
                print(f"Attempted to save: {event_type}")

        # Process Request
        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            
            # --- LOGIC UPDATE: NOISE FILTER ---
            # Don't log static files, nextjs internals, OR analytics calls
            # This ensures the log viewer doesn't fill up with "Get Logs" requests
            is_noise = any(x in request.url.path for x in ["_next", "favicon.ico", "static", "/analytics/"])
            
            if request.url.path.startswith("/") and not is_noise:
                save_log_to_db(
                    "API_REQ", 
                    {
                        "method": request.method,
                        "path": request.url.path,
                        "status": response.status_code,
                        "latency": round(process_time, 2),
                        "ip": request.client.host if request.client else "unknown"
                    }
                )
            
            return response
            
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            
            # Log Error to DB
            save_log_to_db(
                "ERROR", 
                {
                    "path": request.url.path,
                    "error": str(e),
                    "latency": round(process_time, 2)
                }
            )
            
            logger.error("Request failed", extra={"error": str(e)})
            raise e