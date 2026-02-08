from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from sqlmodel import Session, select
from database import engine 
from models import CompanyProfile, User
import jwt
import os

SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_THIS_TO_A_LONG_RANDOM_STRING")
ALGORITHM = "HS256"

class ContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. ALWAYS Initialize State (Prevents AttributeError)
        request.state.user = None
        request.state.company_id = None
        request.state.department_id = None
        request.state.role = None

        # 2. Extract Auth Token
        auth_header = request.headers.get("Authorization")
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                username = payload.get("sub")
                
                # DB Lookup
                with Session(engine) as session:
                     user = session.exec(select(User).where(User.username == username)).first()
                     if user:
                         request.state.user = user
                         
                         # 3. Handle Context Switching (Company Selection)
                         company_id_header = request.headers.get("X-Company-ID")
                         if company_id_header and company_id_header.isdigit():
                             company_id = int(company_id_header)
                             
                             # Check if user belongs to this company OR is Superadmin
                             if user.is_superadmin:
                                 request.state.company_id = company_id
                                 request.state.role = "superadmin"
                             else:
                                 # Regular User Verification
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
                                 
            except Exception as e:
                # Token invalid or DB error - Continue as anonymous
                print(f"Middleware Auth Error: {e}")
                pass 

        response = await call_next(request)
        return response