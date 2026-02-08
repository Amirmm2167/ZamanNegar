from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select, or_
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_session
from models import (
    EventMaster, EventInstance, EventCreate, 
    User, EventScope, EventStatus, Role, Company
)
from security import get_current_user
from utils.recurrence import expand_master_to_instances

router = APIRouter()

# --- 1. CREATE (The "Master" Logic) ---

@router.post("/", response_model=EventMaster)
def create_event(
    request: Request,
    event_data: EventCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Creates an Event Master (Rule) and expands it into Instances.
    """
    # 1. Context & Permission Check
    company_id = request.state.company_id
    role = request.state.role
    
    # If standard user, force company_id from context
    if not current_user.is_superadmin:
        if not company_id:
            raise HTTPException(400, "Company Context Header (X-Company-ID) required")
        
        # Enforce Scope
        event_data.company_id = company_id
        # scope is forced to COMPANY for non-admins
        
    # 2. Create Master Record
    master = EventMaster.from_orm(event_data)
    master.proposer_id = current_user.id
    master.company_id = company_id # Ensure linkage
    
    # Set Initial Status based on Role
    if role == Role.MANAGER:
        master.status = EventStatus.APPROVED
        master.is_locked = True # Auto-lock manager events
    else:
        master.status = EventStatus.PENDING
    
    session.add(master)
    session.commit()
    session.refresh(master)
    
    # 3. Trigger Recurrence Expansion (The Engine)
    # This generates the instances in the 'EventInstance' table
    expand_master_to_instances(session, master)
    session.commit()
    
    return master

# --- 2. READ (The "Instance" Cache) ---

@router.get("/", response_model=List[EventInstance])
def read_events(
    request: Request,
    start: datetime,
    end: datetime,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Reads from the EventInstance cache. 
    Ultra-fast range query.
    """
    company_id = request.state.company_id
    
    if not company_id and not current_user.is_superadmin:
        raise HTTPException(400, "Context required")

    # Query Instances directly
    # This is O(1) complexity relative to recurrence rules
    query = select(EventInstance).where(
        EventInstance.start_time >= start,
        EventInstance.start_time <= end
    )
    
    # Filter by Context
    if company_id:
        query = query.where(EventInstance.company_id == company_id)
        
    # Order by time
    query = query.order_by(EventInstance.start_time)
    
    events = session.exec(query).all()
    return events

@router.get("/{event_id}", response_model=EventMaster)
def read_event_detail(
    event_id: int,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get full details of an Event Master.
    Used when opening the Edit Modal.
    """
    master = session.get(EventMaster, event_id)
    if not master:
        raise HTTPException(404, "Event not found")
        
    # Permission Check
    # Users can view events if they are in the same company
    company_id = request.state.company_id
    
    if not current_user.is_superadmin:
        if master.scope == EventScope.COMPANY and master.company_id != company_id:
             raise HTTPException(403, "Access denied")
             
    return master

# --- 3. UPDATE (The "Locking" Logic) ---

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