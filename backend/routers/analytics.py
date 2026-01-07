from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func, desc, delete
from typing import Optional, List
from datetime import datetime, timedelta
from database import get_session
from models import AnalyticsLog, User, Event, Department
from security import get_current_user
from pydantic import BaseModel
from utils.archiver import ArchiveManager

router = APIRouter()
archiver = ArchiveManager()

# --- DTOs ---
class LogCreate(BaseModel):
    event_type: str
    details: Optional[str] = None

# --- BASIC LOGGING & STATS ---

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

# --- ADVANCED INTELLIGENCE ---

@router.get("/system")
def get_system_snapshot(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Req #4 & #7: Events per Department, Users per Role"""
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")

    # 1. Events by Department
    events_by_dept = session.exec(
        select(Department.name, func.count(Event.id))
        .join(Event, isouter=True)
        .group_by(Department.name)
    ).all()
    
    # 2. Users by Role
    users_by_role = session.exec(
        select(User.role, func.count(User.id))
        .group_by(User.role)
    ).all()

    # 3. Total Storage (Approx Rows)
    total_logs = session.exec(select(func.count(AnalyticsLog.id))).one()

    return {
        "events_distribution": [{"name": r[0] or "No Dept", "count": r[1]} for r in events_by_dept],
        "user_demographics": [{"role": r[0], "count": r[1]} for r in users_by_role],
        "db_row_count": total_logs
    }

@router.get("/users/profiling")
def get_user_profiling(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Req #5 & #6: Power Users and Ghost Users"""
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")

    # 1. Power Users (Most logs in last 30 days)
    cutoff = datetime.utcnow() - timedelta(days=30)
    
    power_users = session.exec(
        select(User.display_name, func.count(AnalyticsLog.id).label("activity"))
        .join(AnalyticsLog)
        .where(AnalyticsLog.created_at >= cutoff)
        .group_by(User.id)
        .order_by(desc("activity"))
        .limit(10)
    ).all()

    return {
        "power_users": [{"name": r[0], "score": r[1]} for r in power_users]
    }

# --- ARCHIVING ---

@router.post("/archive")
def run_archive_job(
    days: int = 30,
    current_user: User = Depends(get_current_user)
):
    """Triggers the Archivist to clean DB"""
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = archiver.archive_logs(days_older_than=days)
    return result

@router.get("/archives")
def get_archives_list(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return archiver.list_archives()