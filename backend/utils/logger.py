import logging
import json
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from uuid import uuid4
from sqlmodel import Session
from database import engine 
from models import AnalyticsLog 

# Keep the console logger for Docker logs
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
        
        super()._log(level, json_payload, args, exc_info=exc_info, extra=None, stack_info=stack_info)

logging.setLoggerClass(StructuredLogger)
logger = logging.getLogger("zaman_negar")
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(logging.StreamHandler())

class LogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid4())
        start_time = time.time()
        
        # Helper to save to DB safely
        def save_log_to_db(event_type: str, details: dict, user_id: int = None):
            try:
                with Session(engine) as session:
                    log_entry = AnalyticsLog(
                        event_type=event_type,
                        details=json.dumps(details, default=str),
                        user_id=user_id
                    )
                    session.add(log_entry)
                    session.commit()
            except Exception as db_err:
                print(f"Failed to write log to DB: {db_err}")

        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            
            # 1. Log to Console (Standard Output)
            logger.info("Request processed", extra={
                "req_id": request_id,
                "status": response.status_code,
                "duration": process_time
            })

            # 2. Log to Database (Only for API routes to avoid spamming assets)
            if request.url.path.startswith("/"):
                # We do this in background or just fire-and-forget logic here
                # For robust apps, use BackgroundTasks, but here sync is fine for safety
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
            
            # Re-raise so FastAPI handles the 500 response
            logger.error("Request failed", extra={"error": str(e)})
            raise e