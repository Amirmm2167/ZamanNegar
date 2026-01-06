from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_session
from models import AnalyticsLog, User
from security import get_current_user
from pydantic import BaseModel

router = APIRouter()

# DTO for receiving logs
class LogCreate(BaseModel):
    event_type: str
    details: Optional[str] = None

@router.post("/log")
def log_event(
    log_data: LogCreate,
    session: Session = Depends(get_session),
    # User is optional (we might log pre-login attempts)
    current_user: Optional[User] = Depends(get_current_user) 
):
    user_id = current_user.id if current_user else None
    
    log = AnalyticsLog(
        event_type=log_data.event_type,
        details=log_data.details,
        user_id=user_id
    )
    session.add(log)
    session.commit()
    return {"status": "logged"}

@router.get("/stats")
def get_analytics_stats(
    days: int = 7,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # 1. Daily Active Users (DAU)
    # Group by date, count distinct users
    # Note: SQLite date functions differ from Postgres. This is a generic approach.
    dau_query = select(
        func.date(AnalyticsLog.created_at).label("date"),
        func.count(func.distinct(AnalyticsLog.user_id))
    ).where(
        AnalyticsLog.created_at >= cutoff_date
    ).group_by(
        func.date(AnalyticsLog.created_at)
    ).order_by("date")
    
    dau_results = session.exec(dau_query).all()
    
    # 2. Action Breakdown
    actions_query = select(
        AnalyticsLog.event_type,
        func.count(AnalyticsLog.id)
    ).where(
        AnalyticsLog.created_at >= cutoff_date
    ).group_by(
        AnalyticsLog.event_type
    )
    
    actions_results = session.exec(actions_query).all()

    return {
        "dau": [{"date": str(r[0]), "count": r[1]} for r in dau_results],
        "actions": [{"action": r[0], "count": r[1]} for r in actions_results]
    }