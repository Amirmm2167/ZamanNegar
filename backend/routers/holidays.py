from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import date

from database import get_session
from models import Holiday, User
from security import get_current_user

router = APIRouter()

class HolidayCreate(BaseModel):
    occasion: str
    holiday_date: date

class HolidayRead(BaseModel):
    id: int
    occasion: str
    holiday_date: date

# 1. GET HOLIDAYS
@router.get("/", response_model=List[HolidayRead])
def read_holidays(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Holiday).where(Holiday.company_id == current_user.company_id)
    return session.exec(statement).all()

# 2. CREATE HOLIDAY
@router.post("/", response_model=HolidayRead)
def create_holiday(
    holiday_data: HolidayCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Prevent duplicate dates? Optional, but good UX.
    
    new_holiday = Holiday(
        occasion=holiday_data.occasion,
        holiday_date=holiday_data.holiday_date,
        company_id=current_user.company_id
    )
    
    session.add(new_holiday)
    session.commit()
    session.refresh(new_holiday)
    return new_holiday

# 3. DELETE HOLIDAY
@router.delete("/{holiday_id}")
def delete_holiday(
    holiday_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    holiday = session.get(Holiday, holiday_id)
    if not holiday or holiday.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="تعطیلی یافت نشد")
    
    session.delete(holiday)
    session.commit()
    return {"ok": True}