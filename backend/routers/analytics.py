from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func, desc
from typing import Optional
from datetime import datetime, timedelta
from database import get_session
from models import AnalyticsLog, User, EventMaster, Department # <--- UPDATED IMPORT
from security import get_current_user, get_current_user_optional
from pydantic import BaseModel
from utils.snapshot_engine import SnapshotEngine
# from utils.data_fusion import DataFusionEngine # Comment out if not implemented yet

router = APIRouter()
snapshot_engine = SnapshotEngine()
# fusion_engine = DataFusionEngine()

# --- DTOs ---
class LogCreate(BaseModel):
    event_type: str
    details: Optional[str] = None

# --- BASIC LOGGING & STATS ---

@router.post("/log")
def log_event(
    log_data: LogCreate,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional) 
):
    user_id = current_user.id if current_user else None
    details_str = log_data.details if log_data.details else "{}"
    
    log = AnalyticsLog(
        event_type=log_data.event_type,
        details=details_str,
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

    # 1. Events by Department (Updated to use EventMaster)
    events_by_dept = session.exec(
        select(Department.name, func.count(EventMaster.id))
        .join(EventMaster, isouter=True)
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
        "user_demographics": [{"role": r[0] or "Unknown", "count": r[1]} for r in users_by_role],
        "db_row_count": total_logs
    }

@router.get("/users/profiling")
def get_user_profiling(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")

    query = (
        select(
            User.display_name,
            User.username,
            User.role,
            func.count(AnalyticsLog.id).label("total_actions"),
            func.max(AnalyticsLog.created_at).label("last_active")
        )
        .outerjoin(AnalyticsLog, User.id == AnalyticsLog.user_id)
        .group_by(User.id)
        .order_by(desc("last_active"))
    )
    
    results = session.exec(query).all()

    return [
        {
            "name": r[0],
            "username": r[1],
            "role": r[2],
            "total_actions": r[3],
            "last_active": r[4], 
            "status": "Active" if r[4] and r[4] > datetime.utcnow() - timedelta(days=30) else "Inactive"
        }
        for r in results
    ]

# --- ARCHIVING / SNAPSHOTS ---

@router.post("/archive")
def run_manual_snapshot(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = snapshot_engine.take_hourly_snapshot()
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
        
    return result

@router.get("/snapshots")
def get_snapshot_history(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return snapshot_engine.get_snapshots()