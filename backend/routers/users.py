from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select #type:ignore
from pydantic import BaseModel

from database import get_session
from models import User, Department
from security import get_current_user, get_password_hash

router = APIRouter()

# --- Pydantic Schemas for Requests ---
class UserCreate(BaseModel):
    username: str
    display_name: str
    password: str
    role: str = "viewer"
    department_id: Optional[int] = None

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    department_id: Optional[int] = None

class UserRead(BaseModel):
    id: int
    username: str
    display_name: str
    role: str
    department_id: Optional[int] = None
    company_id: Optional[int] = None

# 1. GET ALL USERS (SECURE)
@router.get("/", response_model=List[UserRead])
def read_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Base query
    statement = select(User)

    if current_user.role == "superadmin":
        # Superadmin sees everyone
        pass
    else:
        # Regular users/managers:
        # 1. Filter by THEIR company
        statement = statement.where(User.company_id == current_user.company_id)
        # 2. Hide Superadmins (Security)
        statement = statement.where(User.role != "superadmin")

    users = session.exec(statement).all()
    return users

# 2. CREATE USER
@router.post("/", response_model=UserRead)
def create_user(
    user_data: UserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Check if username exists
    existing = session.exec(select(User).where(User.username == user_data.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="نام کاربری تکراری است")

    # 2. Hash Password
    hashed_pwd = get_password_hash(user_data.password)
    
    # 3. Create Model
    new_user = User(
        username=user_data.username,
        display_name=user_data.display_name,
        hashed_password=hashed_pwd,
        role=user_data.role,
        department_id=user_data.department_id,
        company_id=current_user.company_id if current_user.company_id else 1
    )
    
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

# 3. UPDATE USER
@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    
    if user_data.display_name:
        user.display_name = user_data.display_name
    if user_data.role:
        user.role = user_data.role
    if user_data.department_id is not None:
        user.department_id = user_data.department_id
    if user_data.password:
        user.hashed_password = get_password_hash(user_data.password)

    session.add(user)
    session.commit()
    session.refresh(user)
    return user

# 4. DELETE USER
@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="شما نمی‌توانید حساب خود را حذف کنید")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    
    session.delete(user)
    session.commit()
    return {"ok": True}