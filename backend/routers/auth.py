from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import timedelta
import uuid

from database import get_session
from models import User, UserSession, CompanyProfile, MembershipStatus, CompanyInvitation, Notification, NotificationType
from security import (
    get_current_user, 
    get_password_hash, 
    verify_password, 
    create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from utils.localization import to_english_digits, normalize_phone

router = APIRouter()

# 1. LOGIN
@router.post("/token")
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    # Normalize inputs
    username = to_english_digits(form_data.username).lower()
    password = to_english_digits(form_data.password)

    # Try finding by username
    user = session.exec(select(User).where(User.username == username)).first()
    
    # If not found, try finding by phone
    if not user:
        normalized_phone = normalize_phone(username)
        user = session.exec(select(User).where(User.phone_number == normalized_phone)).first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # --- SESSION LOGIC (Restored) ---
    # 1. Manage Active Sessions (Limit 5)
    active_sessions = session.exec(
        select(UserSession)
        .where(UserSession.user_id == user.id)
        .order_by(UserSession.last_active)
    ).all()
    
    if len(active_sessions) >= 5:
        session.delete(active_sessions[0])
    
    # 2. Create New Session
    new_session_id = uuid.uuid4()
    client_ip = request.client.host if request.client else 'unknown'
    
    new_session = UserSession(
        id=new_session_id,
        user_id=user.id,
        token_hash="embedded-in-jwt",
        ip_address=client_ip,
        preferences={}
    )
    session.add(new_session)
    session.commit()
    
    # 3. Generate Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "session_id": str(new_session_id), "is_superadmin": user.is_superadmin},
        expires_delta=access_token_expires
    )
    
    # --- CONTEXT LOGIC (Fixed Serialization) ---
    # Fetch profiles with company data eagerly if possible, or just access attributes
    # We explicitly transform this to the shape frontend expects
    profiles = [p for p in user.profiles if p.status == MembershipStatus.ACTIVE]
    
    available_contexts = []
    for p in profiles:
        available_contexts.append({
            "company_id": p.company_id,
            # Handle potential missing company relationship if lazy loaded
            "company_name": p.company.name if p.company else "Organization", 
            "role": p.role,
            "department_id": p.department_id
        })

    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "session_id": str(new_session_id), # <--- RESTORED THIS
        "username": user.username,
        "is_superadmin": user.is_superadmin,
        "is_profile_complete": user.is_profile_complete,
        "available_contexts": available_contexts # <--- RESTORED THIS FORMAT
    }

# 2. SIGNUP (Keep your logic, it looks fine)
@router.post("/signup")
def signup(
    user_data: dict, 
    session: Session = Depends(get_session)
):
    raw_username = user_data.get("username", "")
    raw_phone = user_data.get("phone_number", "")
    raw_pass = user_data.get("password", "")
    
    username = to_english_digits(raw_username).lower()
    phone = normalize_phone(raw_phone)
    password = to_english_digits(raw_pass)
    
    if session.exec(select(User).where(User.username == username)).first():
        raise HTTPException(400, "Username already exists")
    if session.exec(select(User).where(User.phone_number == phone)).first():
        raise HTTPException(400, "Phone number already registered")

    new_user = User(
        username=username,
        phone_number=phone,
        display_name=user_data.get("display_name", username),
        hashed_password=get_password_hash(password),
        is_profile_complete=True 
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    # Handshake Logic
    invitations = session.exec(select(CompanyInvitation).where(CompanyInvitation.target_phone == phone)).all()
    
    for invite in invitations:
        membership = CompanyProfile(
            user_id=new_user.id,
            company_id=invite.company_id,
            department_id=invite.department_id,
            role=invite.proposed_role,
            status=MembershipStatus.PENDING_USER_APPROVAL
        )
        session.add(membership)
        
        notif = Notification(
            recipient_id=new_user.id,
            type=NotificationType.PERSONAL,
            title="دعوت‌نامه همکاری",
            message=f"شما به یک سازمان دعوت شده‌اید. لطفا بررسی کنید.",
            reference_id=f"invite_{invite.company_id}"
        )
        session.add(notif)
        session.delete(invite)
        
    session.commit()
    return {"message": "User created successfully", "invitations_processed": len(invitations)}

# 3. GET SESSION (Me)
@router.get("/me")
def read_users_me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
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

    return {
        "id": current_user.id,
        "username": current_user.username,
        "display_name": current_user.display_name,
        "is_superadmin": current_user.is_superadmin,
        "available_contexts": available_contexts 
    }