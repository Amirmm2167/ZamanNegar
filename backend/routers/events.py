from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select, or_, col
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_session
from models import (
    EventMaster, EventInstance, EventCreate, 
    User, EventScope, EventStatus, Role
)
from security import get_current_user
from utils.recurrence import expand_master_to_instances

router = APIRouter()


class EventDetail(BaseModel):
    id: int
    master_id: int
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    is_all_day: bool
    status: str
    location: Optional[str] = None
    organizer: Optional[str] = None # CSV string
    target_audience: Optional[str] = None # CSV string
    goal: Optional[str] = None # CSV string
    recurrence_rule: Optional[str] = None
    scope: str
    company_id: int
    department_id: Optional[int] = None # <--- ADDED THIS
    is_locked: bool

# --- 1. READ EVENTS ---
@router.get("/", response_model=List[EventInstance])
def read_events(
    request: Request,
    start: datetime,
    end: datetime,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Base Query: Filter by date range
    query = select(EventInstance).where(
        EventInstance.start_time >= start,
        EventInstance.start_time <= end
    )
    
    # 2. Context Filtering
    # The middleware now guarantees this attribute exists (even if None)
    requested_company_id = request.state.company_id
    
    if current_user.is_superadmin:
        # Admin: If context is set, filter by it. If not, show EVERYTHING.
        if requested_company_id:
            query = query.where(EventInstance.company_id == requested_company_id)
    else:
        # Standard User: MUST be restricted to their allowed companies
        allowed_company_ids = [p.company_id for p in current_user.profiles]
        
        if not allowed_company_ids:
            return []

        if requested_company_id:
            # Verify they belong to this specific company context
            if requested_company_id not in allowed_company_ids:
                raise HTTPException(403, "Access denied to this company context")
            query = query.where(EventInstance.company_id == requested_company_id)
        else:
            # No specific context? Show events from ALL their companies
            query = query.where(col(EventInstance.company_id).in_(allowed_company_ids))
        
    return session.exec(query.order_by(EventInstance.start_time)).all()

# --- 2. CREATE EVENT ---
@router.post("/", response_model=EventMaster)
def create_event(
    request: Request,
    event_data: EventCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    company_id = request.state.company_id
    role = request.state.role 
    
    # 1. SCOPE LOGIC
    # Only Superadmin can set Scope != COMPANY
    if event_data.scope and event_data.scope != EventScope.COMPANY:
        if not current_user.is_superadmin:
            raise HTTPException(403, "Only Superadmins can create System events.")
    else:
        # Force Company Scope for standard users
        event_data.scope = EventScope.COMPANY
        if not current_user.is_superadmin:
            if not company_id:
                raise HTTPException(400, "Active Company Context required to create event")
            event_data.company_id = company_id

    # 2. PREPARE DATA FOR MODEL (Fixing Validation Errors)
    # Convert Pydantic model to dict, excluding unset fields to allow defaults to work
    # But explicitly handling the fields that caused errors.
    master_data = event_data.dict(exclude_unset=True)
    
    # Fix: Inject proposer_id BEFORE instantiation
    master_data["proposer_id"] = current_user.id
    
    # Fix: Ensure target_rules is a dict if it was missing or None
    if "target_rules" not in master_data or master_data["target_rules"] is None:
        master_data["target_rules"] = {}

    # Fix: Ensure company_id is set if scope is COMPANY
    if event_data.scope == EventScope.COMPANY and "company_id" not in master_data:
         master_data["company_id"] = company_id

    # 3. INSTANTIATE MASTER RECORD
    # Now validation will pass because proposer_id and target_rules are present/correct
    master = EventMaster.model_validate(master_data) 

    # 4. AUTO-APPROVE LOGIC
    # Superadmin OR Manager of THIS company
    if current_user.is_superadmin or role == Role.MANAGER or role == "manager":
        master.status = EventStatus.APPROVED
        master.is_locked = True
    else:
        master.status = EventStatus.PENDING
    
    session.add(master)
    session.commit()
    session.refresh(master)
    
    # 5. EXPAND RECURRENCE
    expand_master_to_instances(session, master)
    session.commit()
    
    return master

# --- 3. SEARCH ---
@router.get("/search", response_model=List[EventInstance])
def search_events(
    request: Request,
    query: str,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Security: Filter by allowed companies
    allowed_ids = [p.company_id for p in current_user.profiles]
    
    sql_query = select(EventInstance).join(EventMaster).where(
        or_(
            EventInstance.title.ilike(f"%{query}%"),
            EventMaster.description.ilike(f"%{query}%")
        )
    )
    
    if not current_user.is_superadmin:
        sql_query = sql_query.where(col(EventInstance.company_id).in_(allowed_ids))

    if start: sql_query = sql_query.where(EventInstance.start_time >= start)
    if end: sql_query = sql_query.where(EventInstance.start_time <= end)
    
    # Optional context refinement
    if request.state.company_id:
        sql_query = sql_query.where(EventInstance.company_id == request.state.company_id)

    return session.exec(sql_query.limit(50)).all()

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

@router.get("/{instance_id}", response_model=EventDetail)
def get_event_detail(
    instance_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    instance = session.get(EventInstance, instance_id)
    if not instance: raise HTTPException(404, "Event not found")

    if not current_user.is_superadmin:
        user_companies = [p.company_id for p in current_user.profiles]
        if instance.company_id not in user_companies:
            raise HTTPException(403, "Access denied")

    master = session.get(EventMaster, instance.master_id)
    
    return EventDetail(
        id=instance.id,
        master_id=master.id,
        title=instance.title, # Instance title might differ
        description=master.description,
        start_time=instance.start_time,
        end_time=instance.end_time,
        is_all_day=instance.is_all_day,
        status=instance.status,
        location=master.target_rules.get("location") if master.target_rules else None,
        organizer=master.organizer,
        target_audience=master.target_audience,
        goal=master.goal,
        recurrence_rule=master.recurrence_rule,
        scope=master.scope,
        company_id=instance.company_id,
        department_id=instance.department_id, # <--- POPULATED NOW
        is_locked=master.is_locked
    )