from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import re

from database import get_session
from models import (
    Event, EventCreate, User, EventStatus, Role, EventScope
)
from security import get_current_user
from utils.recurrence import get_events_in_range

router = APIRouter()

class EventInstanceResponse(BaseModel):
    id: int
    master_id: int
    proposer_id: int
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    is_all_day: bool
    status: str
    company_id: int
    department_id: Optional[int] = None
    is_locked: bool
    recurrence_rule: Optional[str] = None
    goal: Optional[str] = None
    target_audience: Optional[str] = None
    organizer: Optional[str] = None
    
    # UI Hints
    recurrence_ui_mode: Optional[str] = None
    recurrence_ui_count: Optional[int] = None
    
    is_virtual: bool = False
    instance_date: Optional[str] = None

# --- 1. READ EVENTS ---
@router.get("/", response_model=List[EventInstanceResponse])
def read_events(
    request: Request,
    start: datetime,
    end: datetime,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    allowed_ids = []
    if current_user.is_superadmin:
        if request.state.company_id: allowed_ids = [request.state.company_id]
    else:
        allowed_ids = [p.company_id for p in current_user.profiles]
        if request.state.company_id:
            if request.state.company_id not in allowed_ids: raise HTTPException(403)
            allowed_ids = [request.state.company_id]

    if not allowed_ids and not current_user.is_superadmin: return []

    events = get_events_in_range(session, start, end, allowed_ids, is_superadmin=current_user.is_superadmin)
    return events

# --- 2. CREATE EVENT ---
@router.post("/", response_model=Event)
def create_event(
    request: Request,
    event_data: EventCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    company_id = request.state.company_id
    role = request.state.role 
    
    if event_data.scope and event_data.scope != EventScope.COMPANY:
        if not current_user.is_superadmin: raise HTTPException(403)
    else:
        event_data.scope = EventScope.COMPANY
        if not current_user.is_superadmin:
            if not company_id: raise HTTPException(400)
            event_data.company_id = company_id

    event_dict = event_data.dict(exclude_unset=True)
    event_dict["proposer_id"] = current_user.id
    
    if "target_rules" not in event_dict: event_dict["target_rules"] = {}
    if event_data.scope == EventScope.COMPANY and "company_id" not in event_dict:
         event_dict["company_id"] = company_id

    event = Event.model_validate(event_dict) 

    if current_user.is_superadmin or role in [Role.MANAGER, "manager"]:
        event.status = EventStatus.APPROVED
        event.is_locked = True
    else:
        event.status = EventStatus.PENDING
    
    session.add(event)
    session.commit()
    session.refresh(event)
    return event

# --- 3. UPDATE EVENT ---
@router.patch("/{event_id}", response_model=Event)
def update_event(
    event_id: int,
    request: Request,
    event_update: dict,
    scope: str = Query("all", enum=["all", "single", "future"]),
    instance_date_str: Optional[str] = Query(None, alias="date"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    event = session.get(Event, event_id)
    if not event: raise HTTPException(404, "Event not found")
        
    role = request.state.role
    if event.proposer_id != current_user.id and role not in [Role.MANAGER, Role.EVALUATOR]:
        raise HTTPException(403, "Not authorized")

    if event.is_locked:
        if role != Role.MANAGER: raise HTTPException(403, "Event Locked")
        if event_update.get("is_locked") is False: event.is_locked = False

    # 1. SIMPLE UPDATE
    if scope == "all" or not event.recurrence_rule:
        for k, v in event_update.items():
            if hasattr(event, k): setattr(event, k, v)
        session.add(event)
        session.commit()
        session.refresh(event)
        return event

    # 2. COMPLEX RECURRENCE UPDATE
    if not instance_date_str: raise HTTPException(400, "Instance date required")
    
    try:
        instance_date = datetime.fromisoformat(instance_date_str.replace("Z", "+00:00"))
        if instance_date.tzinfo: instance_date = instance_date.replace(tzinfo=None)
        date_str = instance_date.strftime("%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "Invalid date format")

    if scope == "single":
        # A. Add Exception to Parent
        current_ex = list(event.exception_dates or [])
        if date_str not in current_ex:
            current_ex.append(date_str)
            event.exception_dates = current_ex
            session.add(event)

        # B. Create Exception Event
        new_data = event.dict(exclude={"id", "created_at", "instances", "exceptions", "exception_dates", "parent", "parent_id"})
        new_data.update(event_update)
        
        # Link to Parent
        new_data["parent_id"] = event.id
        new_data["original_start_time"] = instance_date
        
        # Explicitly Disable Recurrence for the Single Exception
        new_data["recurrence_rule"] = None
        new_data["is_recurring"] = False
        new_data["recurrence_ui_mode"] = None
        new_data["recurrence_ui_count"] = None
        
        if "start_time" not in event_update: new_data["start_time"] = instance_date
        if "end_time" not in event_update:
             dur = event.end_time - event.start_time
             new_data["end_time"] = new_data["start_time"] + dur

        new_event = Event(**new_data)
        session.add(new_event)
        session.commit()
        session.refresh(new_event)
        return new_event

    elif scope == "future":
        # A. Truncate Old Series
        split_cutoff = instance_date - timedelta(days=1)
        cutoff_str = split_cutoff.strftime("%Y%m%dT235959")
        
        # We modify the PARENT rule to stop yesterday
        if event.recurrence_rule:
             base = re.sub(r';?UNTIL=[^;]+', '', event.recurrence_rule)
             event.recurrence_rule = f"{base};UNTIL={cutoff_str}"
        session.add(event)

        # B. Create New Series
        new_data = event.dict(exclude={"id", "created_at", "instances", "exceptions", "exception_dates", "parent", "parent_id"})
        new_data.update(event_update)
        
        # --- CRITICAL FIX ---
        # Trust the frontend's recurrence_rule in the payload (event_update).
        # Do NOT strip UNTIL from it. The frontend calculated the correct UNTIL for the new series.
        # Only if the frontend didn't send a rule (rare), we rely on the old one, but that shouldn't happen in a valid edit.
        
        if "start_time" not in event_update: new_data["start_time"] = instance_date
             
        new_event = Event(**new_data)
        session.add(new_event)
        session.commit()
        session.refresh(new_event)
        return new_event

    return event

@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    request: Request,
    scope: str = Query("all", enum=["all", "single", "future"]),
    instance_date_str: Optional[str] = Query(None, alias="date"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    event = session.get(Event, event_id)
    if not event: raise HTTPException(404)
    
    role = request.state.role
    if event.proposer_id != current_user.id and role != Role.MANAGER: raise HTTPException(403)

    if scope == "all" or not event.recurrence_rule:
        children = session.exec(select(Event).where(Event.parent_id == event.id)).all()
        for c in children: session.delete(c)
        session.delete(event)
        session.commit()
        return {"ok": True}
        
    if scope == "single" and instance_date_str:
        try:
            dt = datetime.fromisoformat(instance_date_str.replace("Z", "+00:00"))
            if dt.tzinfo: dt = dt.replace(tzinfo=None)
            date_str = dt.strftime("%Y-%m-%d")
            
            curr = list(event.exception_dates or [])
            if date_str not in curr:
                curr.append(date_str)
                event.exception_dates = curr
                session.add(event)
                session.commit()
        except:
            raise HTTPException(400, "Bad Date")
            
    return {"ok": True}

@router.get("/{id}", response_model=EventInstanceResponse)
def get_event_detail(
    id: int,
    session: Session = Depends(get_session)
):
    event = session.get(Event, id)
    if not event: raise HTTPException(404)
    
    return EventInstanceResponse(
        id=event.id,
        master_id=event.parent_id or event.id,
        proposer_id=event.proposer_id,
        title=event.title,
        description=event.description,
        start_time=event.start_time,
        end_time=event.end_time,
        is_all_day=event.is_all_day,
        status=event.status,
        company_id=event.company_id,
        department_id=event.department_id,
        is_locked=event.is_locked,
        recurrence_rule=event.recurrence_rule,
        recurrence_ui_mode=event.recurrence_ui_mode,
        recurrence_ui_count=event.recurrence_ui_count,
        goal=event.goal,
        target_audience=event.target_audience,
        organizer=event.organizer
    )