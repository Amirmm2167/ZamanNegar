from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, desc
from typing import Optional, List
from datetime import datetime, timedelta
from database import get_session
from models import AnalyticsLog, User
from security import get_current_user
from pydantic import BaseModel

router = APIRouter()

class LogCreate(BaseModel):
    event_type: str
    details: Optional[str] = None

@router.post("/log")
def log_event(
    log_data: LogCreate,
    session: Session = Depends(get_session),
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

    # 1. DAU
    dau_query = select(
        func.date(AnalyticsLog.created_at).label("date"),
        func.count(func.distinct(AnalyticsLog.user_id))
    ).where(AnalyticsLog.created_at >= cutoff_date).group_by(func.date(AnalyticsLog.created_at)).order_by("date")
    dau_results = session.exec(dau_query).all()
    
    # 2. Top Actions
    actions_query = select(AnalyticsLog.event_type, func.count(AnalyticsLog.id)).where(AnalyticsLog.created_at >= cutoff_date).group_by(AnalyticsLog.event_type)
    actions_results = session.exec(actions_query).all()

    return {
        "dau": [{"date": str(r[0]), "count": r[1]} for r in dau_results],
        "actions": [{"action": r[0], "count": r[1]} for r in actions_results]
    }

# --- NEW: System Health & Logs ---

@router.get("/health")
def get_system_health(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    cutoff = datetime.utcnow() - timedelta(hours=24)
    
    # Error Rate (Last 24h)
    total_reqs = session.exec(select(func.count(AnalyticsLog.id)).where(AnalyticsLog.created_at >= cutoff)).one()
    total_errors = session.exec(select(func.count(AnalyticsLog.id)).where(AnalyticsLog.created_at >= cutoff, AnalyticsLog.event_type == "ERROR")).one()
    
    error_rate = (total_errors / total_reqs * 100) if total_reqs > 0 else 0
    
    return {
        "error_rate": round(error_rate, 2),
        "total_requests": total_reqs,
        "active_alerts": total_errors
    }

@router.get("/logs")
def get_recent_logs(
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    query = select(AnalyticsLog).order_by(desc(AnalyticsLog.created_at)).limit(limit).offset(offset)
    logs = session.exec(query).all()
    return logs