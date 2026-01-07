import logging
import json
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from uuid import uuid4

class StructuredLogger(logging.Logger):
    def _log(self, level, msg, args, exc_info=None, extra=None, stack_info=False):
        if extra is None: extra = {}
        
        # Base log object
        payload = {
            "timestamp": time.time(),
            "level": logging.getLevelName(level),
            "message": msg,
            **extra
        }
        
        # Serialize to JSON
        try:
            json_payload = json.dumps(payload, default=str)
        except TypeError:
            json_payload = json.dumps({"timestamp": time.time(), "message": "Log serialization failed", "original_msg": str(msg)})

        # FIX: Pass arguments explicitly to avoid positional mismatch
        # extra=None because we baked the extra data into the message (json_payload)
        # stack_info is passed correctly as a keyword arg
        super()._log(level, json_payload, args, exc_info=exc_info, extra=None, stack_info=stack_info)

# Configure the global logger
logging.setLoggerClass(StructuredLogger)
logger = logging.getLogger("zaman_negar")
logger.setLevel(logging.INFO)

# Avoid adding duplicate handlers if reloaded
if not logger.handlers:
    handler = logging.StreamHandler()
    logger.addHandler(handler)

class LogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid4())
        start_time = time.time()
        
        # Context for this request
        log_context = {
            "req_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "ip": request.client.host if request.client else "unknown",
        }

        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            
            # Log Success (only API routes to reduce noise, or all if preferred)
            if request.url.path.startswith("/"): 
                logger.info(
                    "Request processed",
                    extra={
                        **log_context,
                        "status": response.status_code,
                        "duration_ms": round(process_time, 2)
                    }
                )
            return response
            
        except Exception as e:
            # Log Failure
            process_time = (time.time() - start_time) * 1000
            logger.error(
                "Request failed",
                extra={
                    **log_context,
                    "status": 500,
                    "duration_ms": round(process_time, 2),
                    "error": str(e)
                }
            )
            raise e