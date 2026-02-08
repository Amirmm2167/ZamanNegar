from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select, or_, text
from typing import List, Optional
from datetime import datetime

from database import get_session
from models import (
    EventMaster, EventInstance, EventCreate, 
    User, EventScope, EventStatus, Role
)
from security import get_current_user
from utils.recurrence import expand_master_to_instances

router = APIRouter()

# --- 1. CREATE ---

@router.post("/", response_model=EventMaster)
def create_event(
    request: Request,
    event_data: EventCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Context & Permission Check
    company_id = request.state.company_id
    role = request.state.role
    
    # Logic: Only Superadmin can set Scope != COMPANY
    if event_data.scope and event_data.scope != EventScope.COMPANY:
        if not current_user.is_superadmin:
            raise HTTPException(403, "Only Superadmins can create System events.")
        # System events don't belong to a single company, but we might store the creator's context
    else:
        # Force Company Scope for standard users
        event_data.scope = EventScope.COMPANY
        if not current_user.is_superadmin:
            if not company_id:
                raise HTTPException(400, "Company Context Header required")
            event_data.company_id = company_id

    # 2. Create Master Record
    master = EventMaster.from_orm(event_data)
    master.proposer_id = current_user.id
    # Ensure company_id is set if scope is COMPANY
    if master.scope == EventScope.COMPANY and not master.company_id:
        master.company_id = company_id

    # Auto-Approve logic
    if current_user.is_superadmin or role == Role.MANAGER:
        master.status = EventStatus.APPROVED
        master.is_locked = True
    else:
        master.status = EventStatus.PENDING
    
    session.add(master)
    session.commit()
    session.refresh(master)
    
    # 3. Expansion
    expand_master_to_instances(session, master)
    session.commit()
    
    return master

# --- 2. SEARCH (Phase 2.4) ---

@router.get("/search", response_model=List[EventInstance])
def search_events(
    request: Request,
    query: str,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    company_id = request.state.company_id
    if not company_id and not current_user.is_superadmin:
        raise HTTPException(400, "Context required")

    # Simple ILIKE search (Upgrade to tsvector in production DB migration)
    sql_query = select(EventInstance).join(EventMaster).where(
        or_(
            EventInstance.title.ilike(f"%{query}%"),
            EventMaster.description.ilike(f"%{query}%")
        )
    )
    
    if start: sql_query = sql_query.where(EventInstance.start_time >= start)
    if end: sql_query = sql_query.where(EventInstance.start_time <= end)
    
    if company_id:
        sql_query = sql_query.where(EventInstance.company_id == company_id)

    return session.exec(sql_query.limit(50)).all()

# --- 3. READ ---

@router.get("/", response_model=List[EventInstance])
def read_events(
    request: Request,
    start: datetime,
    end: datetime,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    company_id = request.state.company_id
    
    # Superadmin can see everything if no context is set, or filtered by context
    query = select(EventInstance).where(
        EventInstance.start_time >= start,
        EventInstance.start_time <= end
    )
    
    if company_id:
        query = query.where(EventInstance.company_id == company_id)
        
    return session.exec(query.order_by(EventInstance.start_time)).all()


@router.patch("/{event_id}", response_model=EventMaster)
def update_event(
    event_id: int,
    request: Request,
    event_update: dict, # Using dict to handle partial updates flexibly
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch Master
    master = session.get(EventMaster, event_id)
    if not master:
        raise HTTPException(404, "Event not found")
        
    role = request.state.role
    
    # 2. Permission Check
    if master.proposer_id != current_user.id and role not in [Role.MANAGER, Role.EVALUATOR]:
        raise HTTPException(403, "Not authorized to edit this event")

    # 3. Locking Logic
    if master.is_locked:
        # Only Manager can unlock or edit a locked event
        if role != Role.MANAGER:
            raise HTTPException(403, "Event is Locked. Ask a Manager to unlock it.")
            
        # If Manager is explicitly unlocking
        if event_update.get("is_locked") is False:
            master.is_locked = False
    
    # 4. Apply Updates
    for key, value in event_update.items():
        if hasattr(master, key):
            setattr(master, key, value)
            
    # 5. Logic: If critical fields changed, reset status & re-expand
    critical_fields = ["start_time", "end_time", "recurrence_rule"]
    needs_reexpansion = any(k in event_update for k in critical_fields)
    
    if needs_reexpansion:
        # If non-manager edited it, reset to PENDING
        if role != Role.MANAGER:
            master.status = EventStatus.PENDING
            master.is_locked = False
            
        session.add(master)
        session.commit() # Save Master first
        
        # Regenerate Instances
        expand_master_to_instances(session, master, clear_existing=True)
    else:
        session.add(master)
    
    session.commit()
    session.refresh(master)
    return master

@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    master = session.get(EventMaster, event_id)
    if not master:
        raise HTTPException(404, "Event not found")
        
    role = request.state.role
    if master.proposer_id != current_user.id and role != Role.MANAGER:
        raise HTTPException(403, "Not authorized")
        
    if master.is_locked and role != Role.MANAGER:
        raise HTTPException(403, "Event is locked")
        
    # Cascade delete is handled by DB FKs usually, but we explicit here for safety
    # Delete instances first
    instances = session.exec(select(EventInstance).where(EventInstance.master_id == master.id)).all()
    for i in instances:
        session.delete(i)
        
    session.delete(master)
    session.commit()
    return {"ok": True}