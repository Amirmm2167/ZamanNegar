from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from jwt.exceptions import PyJWTError
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
import os

from database import get_session
from models import User, UserSession

SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_THIS_TO_A_LONG_RANDOM_STRING")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 
SESSION_EXPIRE_DAYS = 14 

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    session: Session = Depends(get_session)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        session_id: str = payload.get("session_id")
        
        if username is None or session_id is None:
            raise credentials_exception
            
    except PyJWTError:
        raise credentials_exception

    user = session.exec(select(User).where(User.username == username)).first()
    if user is None:
        raise credentials_exception

    user_session = session.exec(
        select(UserSession).where(UserSession.id == session_id)
    ).first()

    if not user_session:
        raise HTTPException(status_code=401, detail="Session expired or invalid. Please login again.")

    if datetime.utcnow() - user_session.last_active > timedelta(days=SESSION_EXPIRE_DAYS):
        session.delete(user_session)
        session.commit()
        raise HTTPException(status_code=401, detail="Session timed out due to inactivity.")

    user_session.last_active = datetime.utcnow()
    session.add(user_session)
    session.commit()

    return user

async def get_current_user_optional(
    token: str = Depends(oauth2_scheme), 
    session: Session = Depends(get_session)
) -> Optional[User]:
    """
    Safely attempts to get the current user. Returns None if ANY check fails.
    Used by Analytics or public-facing endpoints that change behavior if logged in.
    """
    try:
        # We manually call the logic to avoid the HTTPException raise
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except PyJWTError:
            return None
            
        username: str = payload.get("sub")
        session_id: str = payload.get("session_id")
        
        if not username or not session_id:
            return None
            
        user = session.exec(select(User).where(User.username == username)).first()
        if not user:
            return None
            
        user_session = session.exec(select(UserSession).where(UserSession.id == session_id)).first()
        if not user_session:
            return None
            
        # Check expiry but don't delete/commit side-effects in a GET (optional) check
        if datetime.utcnow() - user_session.last_active > timedelta(days=SESSION_EXPIRE_DAYS):
            return None
            
        return user
    except Exception:
        return None