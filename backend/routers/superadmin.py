from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List, Dict

from database import get_session
from models import (
    Company, User, Holiday, Department, 
    CompanyProfile, Role, Event
)
from security import get_current_user, get_password_hash

router = APIRouter()

# --- Security Dependency ---
def get_superadmin_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="دسترسی غیرمجاز. فقط مدیر کل سیستم مجاز است."
        )
    return current_user

# --- Schemas ---
class GlobalStats(BaseModel):
    total_companies: int
    total_users: int
    total_events: int
    active_sessions: int

class CompanyCreate(BaseModel):
    name: str
    settings: str = "{}"

class ManagerCreate(BaseModel):
    username: str
    display_name: str
    password: str
    company_id: int

class AdminUserCreate(BaseModel):
    username: str
    display_name: str
    password: str
    role: Role
    company_id: int
    department_id: Optional[int] = None

class GlobalHolidayCreate(BaseModel):
    occasion: str
    holiday_date: date

class GlobalHolidayUpdate(BaseModel):
    occasion: Optional[str] = None
    holiday_date: Optional[date] = None

# --- 1. Dashboard Stats ---

@router.get("/stats", response_model=GlobalStats)
def get_global_stats(
    session: Session = Depends(get_session),
    _: User = Depends(get_superadmin_user)
):
    """Dashboard Stats for Super Admin"""
    return {
        "total_companies": session.exec(select(func.count(Company.id))).one(),
        "total_users": session.exec(select(func.count(User.id))).one(),
        # Count all stored events
        "total_events": session.exec(select(func.count(Event.id))).one(),
        "active_sessions": 0
    }

# --- 2. Company Management ---

@router.post("/companies", response_model=Company)
def create_company(
    company_data: CompanyCreate,
    session: Session = Depends(get_session),
    _: User = Depends(get_superadmin_user)
):
    existing = session.exec(select(Company).where(Company.name == company_data.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="شرکتی با این نام وجود دارد")

    new_company = Company(
        name=company_data.name,
        settings=company_data.settings
    )
    session.add(new_company)
    session.commit()
    session.refresh(new_company)
    return new_company

@router.get("/companies", response_model=List[Company])
def get_all_companies(
    session: Session = Depends(get_session),
    _: User = Depends(get_superadmin_user)
):
    return session.exec(select(Company)).all()

# --- 3. User & Manager Management ---

@router.post("/managers", response_model=User)
def create_manager(
    manager_data: ManagerCreate,
    session: Session = Depends(get_session),
    _: User = Depends(get_superadmin_user)
):
    company = session.get(Company, manager_data.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="شرکت یافت نشد")

    existing_user = session.exec(select(User).where(User.username == manager_data.username)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="نام کاربری تکراری است")

    new_manager = User(
        username=manager_data.username,
        display_name=manager_data.display_name,
        hashed_password=get_password_hash(manager_data.password),
        is_superadmin=False
    )
    session.add(new_manager)
    session.commit()
    session.refresh(new_manager)

    profile = CompanyProfile(
        user_id=new_manager.id,
        company_id=manager_data.company_id,
        role=Role.MANAGER,
        department_id=None
    )
    session.add(profile)
    session.commit()
    
    return new_manager

@router.post("/users", response_model=User)
def admin_create_user(
    user_data: AdminUserCreate,
    session: Session = Depends(get_session),
    _: User = Depends(get_superadmin_user)
):
    existing = session.exec(select(User).where(User.username == user_data.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="نام کاربری تکراری است")

    new_user = User(
        username=user_data.username,
        display_name=user_data.display_name,
        hashed_password=get_password_hash(user_data.password),
        is_superadmin=False
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    profile = CompanyProfile(
        user_id=new_user.id,
        company_id=user_data.company_id,
        role=user_data.role,
        department_id=user_data.department_id
    )
    session.add(profile)
    session.commit()

    return new_user

# --- 4. Global Holidays Management ---

@router.post("/holidays", response_model=Holiday)
def create_global_holiday(
    holiday_data: GlobalHolidayCreate,
    session: Session = Depends(get_session),
    _: User = Depends(get_superadmin_user)
):
    new_holiday = Holiday(
        occasion=holiday_data.occasion,
        holiday_date=holiday_data.holiday_date,
        company_id=None 
    )
    session.add(new_holiday)
    session.commit()
    session.refresh(new_holiday)
    return new_holiday

@router.delete("/holidays/{holiday_id}")
def delete_global_holiday(
    holiday_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_superadmin_user)
):
    holiday = session.get(Holiday, holiday_id)
    if not holiday or holiday.company_id is not None:
        raise HTTPException(status_code=404, detail="تعطیلی سراسری یافت نشد")
    session.delete(holiday)
    session.commit()
    return {"ok": True}

@router.get("/holidays", response_model=List[Holiday])
def get_global_holidays(
    session: Session = Depends(get_session),
    _: User = Depends(get_superadmin_user)
):
    return session.exec(select(Holiday).where(Holiday.company_id == None)).all()

@router.patch("/holidays/{holiday_id}", response_model=Holiday)
def update_global_holiday(
    holiday_id: int,
    holiday_data: GlobalHolidayUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(get_superadmin_user)
):
    holiday = session.get(Holiday, holiday_id)
    if not holiday or holiday.company_id is not None:
        raise HTTPException(status_code=404, detail="تعطیلی سراسری یافت نشد")
    
    if holiday_data.occasion:
        holiday.occasion = holiday_data.occasion
    if holiday_data.holiday_date:
        holiday.holiday_date = holiday_data.holiday_date
        
    session.add(holiday)
    session.commit()
    session.refresh(holiday)
    return holiday