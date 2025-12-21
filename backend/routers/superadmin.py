from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select #type:ignore
from pydantic import BaseModel
from datetime import date
from typing import Optional, List

from database import get_session
from models import Company, User, Holiday, Department
from security import get_current_user, get_password_hash

router = APIRouter()

# --- Security Dependency ---
def get_superadmin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="دسترسی غیرمجاز. فقط مدیر کل سیستم مجاز است."
        )
    return current_user

# --- Schemas ---
class CompanyCreate(BaseModel):
    name: str
    settings: str = "{}"

class ManagerCreate(BaseModel):
    username: str
    display_name: str
    password: str
    company_id: int

class GlobalHolidayUpdate(BaseModel):
    occasion: Optional[str] = None
    holiday_date: Optional[date] = None

# 1. Create Company
@router.post("/companies", response_model=Company)
def create_company(
    company_data: CompanyCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_superadmin_user)
):
    # Check for duplicate name
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

# 2. Create Manager for a Company
@router.post("/managers", response_model=User)
def create_manager(
    manager_data: ManagerCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_superadmin_user)
):
    # Validate Company
    company = session.get(Company, manager_data.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="شرکت یافت نشد")

    # Validate Username
    existing_user = session.exec(select(User).where(User.username == manager_data.username)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="نام کاربری تکراری است")

    # Create User
    new_manager = User(
        username=manager_data.username,
        display_name=manager_data.display_name,
        hashed_password=get_password_hash(manager_data.password),
        role="manager",  # Forced role
        company_id=manager_data.company_id, # Link to the company
        department_id=None # Managers don't strictly need a department yet
    )
    
    session.add(new_manager)
    session.commit()
    session.refresh(new_manager)
    return new_manager

# 3. Get All Companies (for the dashboard)
@router.get("/companies", response_model=list[Company])
def get_all_companies(
    session: Session = Depends(get_session),
    admin: User = Depends(get_superadmin_user)
):
    return session.exec(select(Company)).all()


# --- NEW: Global Holidays ---
class GlobalHolidayCreate(BaseModel):
    occasion: str
    holiday_date: date

@router.post("/holidays", response_model=Holiday)
def create_global_holiday(
    holiday_data: GlobalHolidayCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_superadmin_user)
):
    # company_id=None means GLOBAL
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
    admin: User = Depends(get_superadmin_user)
):
    holiday = session.get(Holiday, holiday_id)
    if not holiday or holiday.company_id is not None:
        raise HTTPException(status_code=404, detail="تعطیلی سراسری یافت نشد")
    session.delete(holiday)
    session.commit()
    return {"ok": True}

# 1. GET Global Holidays (Strictly globals)
@router.get("/holidays", response_model=List[Holiday])
def get_global_holidays(
    session: Session = Depends(get_session),
    admin: User = Depends(get_superadmin_user)
):
    # Fetch only where company_id is NULL
    return session.exec(select(Holiday).where(Holiday.company_id == None)).all()

# 2. UPDATE Global Holiday
@router.patch("/holidays/{holiday_id}", response_model=Holiday)
def update_global_holiday(
    holiday_id: int,
    holiday_data: GlobalHolidayUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_superadmin_user)
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

# --- NEW: Advanced User Creation (Any Company) ---
class AdminUserCreate(BaseModel):
    username: str
    display_name: str
    password: str
    role: str
    company_id: int
    department_id: Optional[int] = None

@router.post("/users", response_model=User)
def admin_create_user(
    user_data: AdminUserCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_superadmin_user)
):
    # Hash password
    hashed_pwd = get_password_hash(user_data.password)
    
    new_user = User(
        username=user_data.username,
        display_name=user_data.display_name,
        hashed_password=hashed_pwd,
        role=user_data.role,
        company_id=user_data.company_id,
        department_id=user_data.department_id
    )
    
    try:
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        return new_user
    except Exception:
        raise HTTPException(status_code=400, detail="خطا در ایجاد کاربر (نام کاربری تکراری؟)")