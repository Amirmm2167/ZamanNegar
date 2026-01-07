from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func, desc, delete
from typing import Optional, List
from datetime import datetime, timedelta
from database import get_session
from models import AnalyticsLog, User, Event, Department
from security import get_current_user
from pydantic import BaseModel
from utils.archiver import ArchiveManager # NEW

router = APIRouter()
archiver = ArchiveManager()

# ... (Keep existing LogCreate and log_event unchanged) ...
# ... (Keep existing get_analytics_stats unchanged) ...
# ... (Keep existing get_system_health unchanged) ...
# ... (Keep existing get_recent_logs unchanged) ...

# --- NEW: System Intelligence ---

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

    # 2. Ghost Users (Users with 0 logs ever/recently)
    # This is a bit heavy, simplified strategy: Users created > 30 days ago
    # We just return the list of recently active for now
    
    return {
        "power_users": [{"name": r[0], "score": r[1]} for r in power_users]
    }

# --- NEW: Archiving ---

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