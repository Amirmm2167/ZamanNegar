from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select #type:ignore
from datetime import timedelta

# Import our robust tools
from database import get_session
from models import User
from security import get_current_user, get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()

# 1. SIGNUP: Create a new user
@router.post("/signup", response_model=User)
def signup(user_data: User, session: Session = Depends(get_session)):
    # Check if user already exists
    statement = select(User).where(User.username == user_data.username)
    user_exists = session.exec(statement).first()
    
    if user_exists:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Hash the password (Security!)
    user_data.hashed_password = get_password_hash(user_data.hashed_password)
    
    # Save to DB
    session.add(user_data)
    session.commit()
    session.refresh(user_data)
    return user_data

# 2. LOGIN: Get the Token
@router.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    session: Session = Depends(get_session)
):
    # Try to find the user
    statement = select(User).where(User.username == form_data.username)
    user = session.exec(statement).first()
    
    # Check password
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, 
        expires_delta=access_token_expires
    )
    
    # 👇 UPDATE THIS RETURN STATEMENT
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,        # <--- Added this
        "username": user.username # <--- Added this (helpful for UI)
    }
    
    
@router.get("/me", response_model=User)
def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Returns the currently logged-in user's details.
    Used by frontend to get ID and Role securely.
    """
    return current_user