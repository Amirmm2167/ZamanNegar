from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select
from typing import List, Optional
from database import get_session
from models import Company, CompanyProfile, User, Role, Department
from security import get_current_user
from pydantic import BaseModel

router = APIRouter()

# --- DTOs ---
class CompanyCreate(BaseModel):
    name: str
    settings: Optional[str] = "{}"

class CompanyRead(BaseModel):
    id: int
    name: str
    created_at: str
    
class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    settings: Optional[str] = None

class AddMember(BaseModel):
    user_id: int
    role: Role
    department_id: Optional[int] = None

# --- ENDPOINTS ---

@router.post("/", response_model=Company)
def create_company(
    company_data: CompanyCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Superadmin only: Create a new Organization"""
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Only Superadmins can create companies")
    
    company = Company(name=company_data.name, settings=company_data.settings)
    session.add(company)
    session.commit()
    session.refresh(company)
    
    # Auto-add creator as Manager? (Optional, usually Superadmin remains outside or joins explicitly)
    return company

@router.get("/", response_model=List[Company])
def list_companies(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Superadmin: List all. Users: List visible (handled via /me endpoint usually)"""
    if current_user.is_superadmin:
        return session.exec(select(Company)).all()
    
    # For normal users, return only companies they belong to
    statement = (
        select(Company)
        .join(CompanyProfile)
        .where(CompanyProfile.user_id == current_user.id)
    )
    return session.exec(statement).all()

@router.get("/me", response_model=List[Company])
def get_my_companies(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Returns the list of companies the current user belongs to (for Workspace Switcher)"""
    statement = (
        select(Company)
        .join(CompanyProfile)
        .where(CompanyProfile.user_id == current_user.id)
    )
    return session.exec(statement).all()

@router.get("/{company_id}", response_model=Company)
def get_company(
    company_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    # Permission check: Must be superadmin OR a member of the company
    if not current_user.is_superadmin:
        membership = session.exec(
            select(CompanyProfile)
            .where(CompanyProfile.user_id == current_user.id, CompanyProfile.company_id == company_id)
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="Access denied")
            
    return company

@router.put("/{company_id}", response_model=Company)
def update_company(
    company_id: int,
    company_data: CompanyUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Not found")

    # Check permissions: Superadmin OR Manager of this company
    is_manager = False
    if not current_user.is_superadmin:
        profile = session.exec(
            select(CompanyProfile)
            .where(CompanyProfile.user_id == current_user.id, CompanyProfile.company_id == company_id)
        ).first()
        if not profile or profile.role != Role.MANAGER:
            raise HTTPException(status_code=403, detail="Only Managers can update settings")
    
    if company_data.name:
        company.name = company_data.name
    if company_data.settings:
        company.settings = company_data.settings
        
    session.add(company)
    session.commit()
    session.refresh(company)
    return company

@router.post("/{company_id}/members")
def add_member(
    company_id: int,
    member_data: AddMember,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Add a user to a company profile"""
    # 1. Permission Check
    if not current_user.is_superadmin:
        # Check if requester is Manager of this company
        requester_profile = session.exec(
            select(CompanyProfile)
            .where(CompanyProfile.user_id == current_user.id, CompanyProfile.company_id == company_id)
        ).first()
        if not requester_profile or requester_profile.role != Role.MANAGER:
            raise HTTPException(status_code=403, detail="Not authorized")

    # 2. Check if already exists
    existing = session.exec(
        select(CompanyProfile)
        .where(CompanyProfile.user_id == member_data.user_id, CompanyProfile.company_id == company_id)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User already in company")

    # 3. Create Profile
    new_profile = CompanyProfile(
        user_id=member_data.user_id,
        company_id=company_id,
        role=member_data.role,
        department_id=member_data.department_id
    )
    session.add(new_profile)
    session.commit()
    return {"status": "User added to company"}