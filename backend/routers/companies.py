from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select, func
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta

from database import get_session
from models import (
    Company, CompanyProfile, User, Role, Department, 
    Event, MembershipStatus
)
from security import get_current_user
from utils.recurrence import get_events_in_range

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

class CompanyStats(BaseModel):
    id: int
    name: str
    user_count: int
    department_count: int
    event_stats: Dict[str, int]

# ==========================================
# 1. SUPERADMIN DASHBOARD & STATS
# ==========================================

@router.get("/superadmin/stats", response_model=List[CompanyStats])
def get_companies_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Superadmin access required")

    companies = session.exec(select(Company)).all()
    results = []

    for comp in companies:
        user_count = session.exec(
            select(func.count(CompanyProfile.id))
            .where(CompanyProfile.company_id == comp.id)
        ).one()

        dept_count = session.exec(
            select(func.count(Department.id))
            .where(Department.company_id == comp.id)
        ).one()

        # Count 'Event' rows (Plans/Parents + Singles)
        event_counts = session.exec(
            select(Event.status, func.count(Event.id))
            .where(Event.company_id == comp.id)
            .group_by(Event.status)
        ).all()
        
        stats_map = {
            "approved": 0, "pending": 0, "rejected": 0, "cancelled": 0
        }
        for status_val, count in event_counts:
            status_str = status_val.value if hasattr(status_val, 'value') else str(status_val)
            if status_str in stats_map:
                stats_map[status_str] = count

        results.append(CompanyStats(
            id=comp.id,
            name=comp.name,
            user_count=user_count,
            department_count=dept_count,
            event_stats=stats_map
        ))

    return results

# ==========================================
# 2. CORE CRUD OPERATIONS
# ==========================================

@router.post("/", response_model=Company)
def create_company(
    company_data: CompanyCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Only Superadmins can create companies")
    
    company = Company(name=company_data.name, settings=company_data.settings)
    session.add(company)
    session.commit()
    session.refresh(company)
    
    return company

@router.get("/", response_model=List[Company])
def list_companies(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.is_superadmin:
        return session.exec(select(Company)).all()
    
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

@router.delete("/{company_id}")
def delete_company(
    company_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Only Superadmins can delete companies")

    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Manual Cascade Cleanup
    session.exec(select(CompanyProfile).where(CompanyProfile.company_id == company_id)).delete()
    session.exec(select(Department).where(Department.company_id == company_id)).delete()
    
    # Cascade events (Single, Recurring, Exceptions)
    session.exec(select(Event).where(Event.company_id == company_id)).delete()

    session.delete(company)
    session.commit()
    return {"ok": True, "message": f"Company {company_id} deleted"}

# ==========================================
# 3. SUB-RESOURCE MANAGEMENT
# ==========================================

@router.post("/{company_id}/members")
def add_member(
    company_id: int,
    member_data: AddMember,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_superadmin:
        requester_profile = session.exec(
            select(CompanyProfile)
            .where(CompanyProfile.user_id == current_user.id, CompanyProfile.company_id == company_id)
        ).first()
        if not requester_profile or requester_profile.role != Role.MANAGER:
            raise HTTPException(status_code=403, detail="Not authorized")

    existing = session.exec(
        select(CompanyProfile)
        .where(CompanyProfile.user_id == member_data.user_id, CompanyProfile.company_id == company_id)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User already in company")

    new_profile = CompanyProfile(
        user_id=member_data.user_id,
        company_id=company_id,
        role=member_data.role,
        department_id=member_data.department_id,
        status=MembershipStatus.ACTIVE
    )
    session.add(new_profile)
    session.commit()
    return {"status": "User added to company"}

@router.get("/{company_id}/users")
def get_company_users(
    company_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_superadmin:
        membership = session.exec(select(CompanyProfile).where(
            CompanyProfile.user_id == current_user.id, 
            CompanyProfile.company_id == company_id
        )).first()
        if not membership:
            raise HTTPException(403, "Access denied")

    results = session.exec(
        select(User, CompanyProfile)
        .join(CompanyProfile)
        .where(CompanyProfile.company_id == company_id)
    ).all()
    
    users_data = []
    for user, profile in results:
        users_data.append({
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "role": profile.role,
            "department_id": profile.department_id,
            "status": profile.status,
            "profile_id": profile.id
        })
    return users_data

@router.get("/{company_id}/events")
def get_company_upcoming_events(
    company_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Returns upcoming Event instances using the Read-Time engine.
    """
    if not current_user.is_superadmin:
        membership = session.exec(select(CompanyProfile).where(
            CompanyProfile.user_id == current_user.id, 
            CompanyProfile.company_id == company_id
        )).first()
        if not membership:
            raise HTTPException(403, "Access denied")

    # Define range: Now to +30 days
    start = datetime.utcnow()
    end = start + timedelta(days=30)

    events = get_events_in_range(
        session,
        start,
        end,
        company_ids=[company_id],
        is_superadmin=current_user.is_superadmin
    )
    
    # Return flattened dicts matching frontend expectations
    return events