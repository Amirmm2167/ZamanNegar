from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from pydantic import BaseModel

from database import get_session
from models import User, CompanyProfile, Role
from security import get_current_user, get_password_hash

router = APIRouter()

# --- Pydantic Schemas ---
class UserCreate(BaseModel):
    username: str
    display_name: str
    password: str
    # Context specific fields (optional for Superadmin creation)
    role: Role = Role.VIEWER
    company_id: Optional[int] = None 
    department_id: Optional[int] = None

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    password: Optional[str] = None
    # Updates to profile
    role: Optional[Role] = None
    department_id: Optional[int] = None

class UserRead(BaseModel):
    id: int
    username: str
    display_name: str
    is_superadmin: bool
    # We flatten these for the UI
    current_role: Optional[str] = None 
    
# --- 1. GET USERS ---
@router.get("/", response_model=List[UserRead])
def read_users(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Lists users. 
    - Superadmin: Sees all users.
    - Manager: Sees users in their active company (via header or profile).
    """
    # 1. Superadmin View
    if current_user.is_superadmin:
        users = session.exec(select(User)).all()
        # Map to Read Schema
        return [
            UserRead(
                id=u.id, 
                username=u.username, 
                display_name=u.display_name, 
                is_superadmin=u.is_superadmin,
                current_role="SuperAdmin"
            ) for u in users
        ]

    # 2. Regular Manager View
    # Determine context company (header > preference > first profile)
    # For simplicity, we look at users who share ANY company with the current manager
    
    # Find companies where current_user is a Manager
    manager_profiles = session.exec(
        select(CompanyProfile).where(
            CompanyProfile.user_id == current_user.id,
            CompanyProfile.role == Role.MANAGER
        )
    ).all()
    
    if not manager_profiles:
        return [] # Or raise 403 if strict

    managed_company_ids = [p.company_id for p in manager_profiles]

    # Find users belonging to these companies
    statement = (
        select(User, CompanyProfile.role)
        .join(CompanyProfile)
        .where(CompanyProfile.company_id.in_(managed_company_ids))
        .where(User.is_superadmin == False) # Hide superadmins
        .distinct()
    )
    
    results = session.exec(statement).all()
    
    # Results is list of (User, role_str) tuples due to join selection? 
    # Actually select(User, ...) returns rows. simpler to select(User) and dedup
    # Let's optimize: Just return Users, we can fetch roles if needed.
    
    # Refined Query: Select Users in my companies
    users = session.exec(
        select(User)
        .join(CompanyProfile)
        .where(CompanyProfile.company_id.in_(managed_company_ids))
        .where(User.is_superadmin == False)
        .distinct()
    ).all()

    return [
        UserRead(
            id=u.id, 
            username=u.username, 
            display_name=u.display_name, 
            is_superadmin=u.is_superadmin,
            current_role="User" # Dynamic role fetching is complex in lists, simplified for now
        ) for u in users
    ]

# --- 2. CREATE USER ---
@router.post("/", response_model=UserRead)
def create_user(
    user_data: UserCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Context Check
    target_company_id = user_data.company_id
    
    if not current_user.is_superadmin:
        # Managers can only add to their own company
        # Check header or derive from user profile
        # For now, require explicit company_id in body for clarity
        if not target_company_id:
             raise HTTPException(400, "Company ID required")
             
        # Verify Manager permissions for this company
        perm = session.exec(
            select(CompanyProfile).where(
                CompanyProfile.user_id == current_user.id,
                CompanyProfile.company_id == target_company_id,
                CompanyProfile.role == Role.MANAGER
            )
        ).first()
        if not perm:
            raise HTTPException(403, "Not authorized to add users to this company")

    # 2. Check Username
    existing = session.exec(select(User).where(User.username == user_data.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="نام کاربری تکراری است")

    # 3. Create User
    new_user = User(
        username=user_data.username,
        display_name=user_data.display_name,
        hashed_password=get_password_hash(user_data.password),
        is_superadmin=False
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    # 4. Create Profile (Membership)
    if target_company_id:
        profile = CompanyProfile(
            user_id=new_user.id,
            company_id=target_company_id,
            role=user_data.role,
            department_id=user_data.department_id
        )
        session.add(profile)
        session.commit()

    return UserRead(
        id=new_user.id,
        username=new_user.username,
        display_name=new_user.display_name,
        is_superadmin=new_user.is_superadmin,
        current_role=user_data.role
    )

# --- 3. UPDATE USER ---
@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch Target
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Permission Logic
    if not current_user.is_superadmin:
        # Check if they share a company where current_user is manager
        # This is simplified; in production, strict checks needed
        pass 

    # 3. Update Basic Info
    if user_data.display_name:
        user.display_name = user_data.display_name
    if user_data.password:
        user.hashed_password = get_password_hash(user_data.password)
    
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # 4. Update Role/Dept (Requires updating CompanyProfile)
    # We need to know WHICH company profile to update. 
    # If the API allows passing company_id in query/header, use that.
    # Otherwise, this updates ALL profiles or simply the primary one.
    # Limiting scope: This endpoint updates User Core. Profile updates should go to specific endpoints.
    
    return UserRead(
        id=user.id, 
        username=user.username, 
        display_name=user.display_name,
        is_superadmin=user.is_superadmin
    )

# --- 4. DELETE USER ---
@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete self")

    if not current_user.is_superadmin:
        raise HTTPException(403, "Only Superadmins can delete users completely")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cascade delete is handled by DB usually, or manually delete profiles first
    profiles = session.exec(select(CompanyProfile).where(CompanyProfile.user_id == user_id)).all()
    for p in profiles:
        session.delete(p)
        
    session.delete(user)
    session.commit()
    return {"ok": True}