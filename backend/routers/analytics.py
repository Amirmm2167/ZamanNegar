from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func, desc, or_
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from database import get_session
from models import AnalyticsLog, User, Event, Department, EventStatus
from security import get_current_user, get_current_user_optional
from pydantic import BaseModel
from utils.snapshot_engine import SnapshotEngine

router = APIRouter()
snapshot_engine = SnapshotEngine()

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
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Not authorized")

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # 1. DAU (Daily Active Users)
    dau_query = select(
        func.date(AnalyticsLog.created_at).label("date"),
        func.count(func.distinct(AnalyticsLog.user_id))
    ).where(AnalyticsLog.created_at >= cutoff_date).group_by(func.date(AnalyticsLog.created_at)).order_by("date")
    dau_results = session.exec(dau_query).all()
    
    # 2. Top Actions
    actions_query = select(AnalyticsLog.event_type, func.count(AnalyticsLog.id)).where(AnalyticsLog.created_at >= cutoff_date).group_by(AnalyticsLog.event_type)
    actions_results = session.exec(actions_query).all()

    # 3. Totals
    total_users = session.exec(select(func.count(User.id))).one()
    # Count stored events (Masters + Exceptions + Singles)
    total_events = session.exec(select(func.count(Event.id))).one()

    return {
        "dau": [{"date": str(r[0]), "count": r[1]} for r in dau_results],
        "actions": [{"action": r[0], "count": r[1]} for r in actions_results],
        "total_events": total_events,
        "active_users": total_users
    }

@router.get("/health")
def get_system_health(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_superadmin:
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
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    query = select(AnalyticsLog).order_by(desc(AnalyticsLog.created_at)).limit(limit).offset(offset)
    logs = session.exec(query).all()
    return logs

# --- ADVANCED INTELLIGENCE ---

@router.get("/fusion/breakdown")
def get_fusion_breakdown(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Returns event distribution by status for Pie Charts"""
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Not authorized")

    results = session.exec(
        select(Event.status, func.count(Event.id))
        .group_by(Event.status)
    ).all()
    
    data = [{"name": r[0] or "Unknown", "value": r[1]} for r in results]
    
    if not data:
        data = [
            {"name": "Approved", "value": 0},
            {"name": "Pending", "value": 0},
            {"name": "Rejected", "value": 0}
        ]
    return data

@router.get("/fusion/timeline")
def get_fusion_timeline(
    range: str = "24h",
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Returns activity over time for Area Charts"""
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Not authorized")

    now = datetime.utcnow()
    if range == "7d":
        start_date = now - timedelta(days=7)
    else:
        start_date = now - timedelta(hours=24)

    logs = session.exec(
        select(AnalyticsLog.created_at, AnalyticsLog.event_type)
        .where(AnalyticsLog.created_at >= start_date)
        .order_by(AnalyticsLog.created_at)
    ).all()

    buckets = {}
    for i in range(24):
        h_key = (now - timedelta(hours=i)).strftime("%H:00")
        buckets[h_key] = {"total": 0, "error": 0}

    for log in logs:
        key = log.created_at.strftime("%H:00")
        if key in buckets:
            buckets[key]["total"] += 1
            if log.event_type == "ERROR":
                buckets[key]["error"] += 1
    
    sorted_data = []
    for i in range(23, -1, -1):
        h_key = (now - timedelta(hours=i)).strftime("%H:00")
        sorted_data.append({
            "date": h_key,
            "total": buckets[h_key]["total"],
            "error": buckets[h_key]["error"]
        })

    return sorted_data

@router.get("/system")
def get_system_snapshot(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Events per Department"""
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Not authorized")

    events_by_dept = session.exec(
        select(Department.name, func.count(Event.id))
        .join(Event, isouter=True)
        .group_by(Department.name)
    ).all()
    
    superadmins = session.exec(select(func.count(User.id)).where(User.is_superadmin == True)).one()
    regular_users = session.exec(select(func.count(User.id)).where(User.is_superadmin == False)).one()
    
    users_data = [
        {"role": "SuperAdmin", "count": superadmins},
        {"role": "User", "count": regular_users}
    ]

    total_logs = session.exec(select(func.count(AnalyticsLog.id))).one()

    return {
        "events_distribution": [{"name": r[0] or "No Dept", "count": r[1]} for r in events_by_dept],
        "user_demographics": users_data,
        "db_row_count": total_logs
    }

@router.get("/users/profiling")
def get_user_profiling(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Not authorized")

    query = (
        select(
            User.display_name,
            User.username,
            User.is_superadmin,
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
            "role": "SuperAdmin" if r[2] else "User",
            "total_actions": r[3],
            "last_active": r[4], 
            "status": "Active" if r[4] and r[4] > datetime.utcnow() - timedelta(days=30) else "Inactive"
        }
        for r in results
    ]

@router.post("/archive")
def run_manual_snapshot(
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = snapshot_engine.take_hourly_snapshot()
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
        
    return result

@router.get("/snapshots")
def get_snapshot_history(
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return snapshot_engine.get_snapshots()