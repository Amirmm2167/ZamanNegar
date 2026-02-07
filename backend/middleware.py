from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from sqlmodel import Session, select
from database import engine 
from models import UserSession, CompanyProfile, User
import jwt
import os

SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_THIS_TO_A_LONG_RANDOM_STRING")
ALGORITHM = "HS256"

class ContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Initialize State
        request.state.user = None
        request.state.company_id = None
        request.state.department_id = None
        request.state.role = None

        # 2. Extract Auth Token (Manual parsing to avoid Dependency issues in Middleware)
        auth_header = request.headers.get("Authorization")
        user_id = None
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                # We don't validate session strictly here (Auth Dependency does that),
                # We just need the ID to find the profile.
                # To be robust, we'd need to look up the User from the DB.
                # For performance, we'll do a quick DB lookup only if Company ID is present.
                username = payload.get("sub")
                
                # We need a DB session for this request scope
                with Session(engine) as session:
                     user = session.exec(select(User).where(User.username == username)).first()
                     if user:
                         request.state.user = user
                         user_id = user.id
                         
                         # 3. Handle Context Switching
                         company_id_header = request.headers.get("X-Company-ID")
                         if company_id_header and company_id_header.isdigit():
                             company_id = int(company_id_header)
                             
                             # Verify Membership
                             profile = session.exec(
                                 select(CompanyProfile).where(
                                     CompanyProfile.user_id == user.id,
                                     CompanyProfile.company_id == company_id
                                 )
                             ).first()
                             
                             if profile:
                                 request.state.company_id = profile.company_id
                                 request.state.department_id = profile.department_id
                                 request.state.role = profile.role
                                 
            except Exception:
                pass # Fail silently, let the Auth Dependency handle 401s later

        response = await call_next(request)
        return response