import logging
import json
import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from uuid import uuid4

class StructuredLogger(logging.Logger):
    def _log(self, level, msg, args, exc_info=None, extra=None, stack_info=False):
        if extra is None: extra = {}
        # Force JSON structure
        payload = {
            "timestamp": time.time(),
            "level": logging.getLevelName(level),
            "message": msg,
            **extra
        }
        super()._log(level, json.dumps(payload), args, exc_info, stack_info)

logging.setLoggerClass(StructuredLogger)
logger = logging.getLogger("zaman_negar")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
logger.addHandler(handler)

class LogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid4())
        start_time = time.time()
        
        # Process Request
        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            
            # Log Success
            logger.info(
                "Request processed",
                extra={
                    "req_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "duration_ms": round(process_time, 2),
                    "ip": request.client.host
                }
            )
            return response
        except Exception as e:
            # Log Failure
            process_time = (time.time() - start_time) * 1000
            logger.error(
                "Request failed",
                extra={
                    "req_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": 500,
                    "duration_ms": round(process_time, 2),
                    "error": str(e)
                }
            )
            raise e