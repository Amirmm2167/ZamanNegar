from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, col
from pydantic import BaseModel
from datetime import date

from database import get_session
from models import Holiday, User
from security import get_current_user

router = APIRouter()

class HolidayCreate(BaseModel):
    occasion: str
    holiday_date: date
    company_id: int = None # Allow passing it, or default to context

class HolidayRead(BaseModel):
    id: int
    occasion: str
    holiday_date: date
    company_id: int

@router.get("/", response_model=List[HolidayRead])
def read_holidays(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user_company_ids = [p.company_id for p in current_user.profiles]
    
    if current_user.is_superadmin:
        statement = select(Holiday)
    else:
        if not user_company_ids:
            return []
        statement = select(Holiday).where(col(Holiday.company_id).in_(user_company_ids))
        
    return session.exec(statement).all()

@router.post("/", response_model=HolidayRead)
def create_holiday(
    holiday_data: HolidayCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    target_company_id = holiday_data.company_id
    
    # If not provided, try to guess from user's profiles
    if not target_company_id:
        if current_user.profiles:
            target_company_id = current_user.profiles[0].company_id
        else:
             raise HTTPException(400, "Company ID required")

    # Permission Check
    if not current_user.is_superadmin:
        user_company_ids = [p.company_id for p in current_user.profiles]
        if target_company_id not in user_company_ids:
            raise HTTPException(403, "Access denied")

    new_holiday = Holiday(
        occasion=holiday_data.occasion,
        holiday_date=holiday_data.holiday_date,
        company_id=target_company_id
    )
    
    session.add(new_holiday)
    session.commit()
    session.refresh(new_holiday)
    return new_holiday

@router.delete("/{holiday_id}")
def delete_holiday(
    holiday_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    holiday = session.get(Holiday, holiday_id)
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
        
    if not current_user.is_superadmin:
        user_company_ids = [p.company_id for p in current_user.profiles]
        if holiday.company_id not in user_company_ids:
            raise HTTPException(403, "Access denied")
    
    session.delete(holiday)
    session.commit()
    return {"ok": True}