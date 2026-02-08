from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import timedelta
import uuid

from database import get_session
from models import User, UserSession, CompanyProfile
from security import (
    get_current_user, 
    get_password_hash, 
    verify_password, 
    create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter()

@router.post("/signup", response_model=User)
def signup(user_data: User, session: Session = Depends(get_session)):
    statement = select(User).where(User.username == user_data.username)
    if session.exec(statement).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    
    user_data.hashed_password = get_password_hash(user_data.hashed_password)
    session.add(user_data)
    session.commit()
    session.refresh(user_data)
    return user_data

@router.post("/token")
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    session: Session = Depends(get_session)
):
    # 1. Verify Credentials
    user = session.exec(select(User).where(User.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. The "5-Seat" Logic: Manage Active Sessions
    active_sessions = session.exec(
        select(UserSession)
        .where(UserSession.user_id == user.id)
        .order_by(UserSession.last_active) # Oldest first
    ).all()
    
    if len(active_sessions) >= 5:
        session.delete(active_sessions[0])
    
    # 3. Create New Session
    new_session_id = uuid.uuid4()
    user_agent = request.headers.get('user-agent', 'unknown')
    client_ip = request.client.host if request.client else 'unknown'
    
    new_session = UserSession(
        id=new_session_id,
        user_id=user.id,
        token_hash="embedded-in-jwt",
        device_fingerprint=f"{user_agent[:50]}...",
        ip_address=client_ip,
        preferences={}
    )
    session.add(new_session)
    session.commit()
    
    # 4. Generate Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "session_id": str(new_session_id)}, 
        expires_delta=access_token_expires
    )
    
    # 5. Get Available Profiles
    profiles = session.exec(
        select(CompanyProfile).where(CompanyProfile.user_id == user.id)
    ).all()
    
    available_contexts = [
        {
            "company_id": p.company_id, 
            "company_name": p.company.name if p.company else "Unknown",
            "role": p.role,
            "department_id": p.department_id
        } 
        for p in profiles
    ]

    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "session_id": str(new_session_id),
        "username": user.username,
        "is_superadmin": user.is_superadmin,  # <--- ADDED THIS
        "available_contexts": available_contexts
    }

@router.get("/me")
def read_users_me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 1. Get Profiles (Contexts) - EXACTLY like the login endpoint
    profiles = session.exec(
        select(CompanyProfile).where(CompanyProfile.user_id == current_user.id)
    ).all()
    
    available_contexts = [
        {
            "company_id": p.company_id, 
            "company_name": p.company.name if p.company else "Unknown",
            "role": p.role,
            "department_id": p.department_id
        } 
        for p in profiles
    ]

    # 2. Return the full session shape
    return {
        "id": current_user.id,
        "username": current_user.username,
        "display_name": current_user.display_name,
        "is_superadmin": current_user.is_superadmin,
        # We include this so the frontend can rebuild its state
        "available_contexts": available_contexts 
    }