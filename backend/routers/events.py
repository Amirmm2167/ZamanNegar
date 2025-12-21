from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select #type:ignore
from dateutil.rrule import rrulestr
from pydantic import BaseModel

from database import get_session
from models import Event, EventCreate, User
from security import get_current_user

router = APIRouter()

# Schema for Updating (Optional fields)
class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    goal: Optional[str] = None
    
    # --- NEW FIELDS ---
    target_audience: Optional[str] = None
    organizer: Optional[str] = None
    # ------------------

    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_all_day: Optional[bool] = None
    status: Optional[str] = None
    rejection_reason: Optional[str] = None
    recurrence_rule: Optional[str] = None
    department_id: Optional[int] = None

# 1. GET ALL EVENTS (With Recurrence Expansion)
@router.get("/", response_model=List[Event])
def read_events(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now() + timedelta(days=60)

    # Base Filter: Company & Date Range
    statement = select(Event).where(
        Event.company_id == current_user.company_id,
        Event.recurrence_rule == None,
        Event.start_time >= start_date,
        Event.start_time <= end_date
    )

    # --- VISIBILITY LOGIC ---
    if current_user.role == "viewer":
        # Viewers only see APPROVED
        statement = statement.where(Event.status == "approved")
        
    elif current_user.role in ["manager", "superadmin", "evaluator"]:
        # Managers see APPROVED and PENDING
        # They DO NOT see REJECTED (as per your request)
        statement = statement.where(
            (Event.status == "approved") | (Event.status == "pending")
        )
        
    elif current_user.role == "proposer":
        # Proposers see:
        # 1. All APPROVED events (to know schedule)
        # 2. THEIR OWN Pending/Rejected events
        statement = statement.where(
            (Event.status == "approved") |
            (Event.proposer_id == current_user.id)
        )

    # Execute
    normal_events = session.exec(statement).all()

    # B. Fetch Recurring Masters (All active ones)
    statement_rec = select(Event).where(
        Event.company_id == current_user.company_id,
        Event.recurrence_rule != None
    )
    
    # Apply same visibility to recurring masters
    if current_user.role == "viewer":
        statement_rec = statement_rec.where(Event.status == "approved")
    elif current_user.role in ["manager", "superadmin", "evaluator"]:
        statement_rec = statement_rec.where((Event.status == "approved") | (Event.status == "pending"))
    elif current_user.role == "proposer":
        statement_rec = statement_rec.where((Event.status == "approved") | (Event.proposer_id == current_user.id))

    recurring_masters = session.exec(statement_rec).all()

    expanded_events = list(normal_events)

    # C. Expand Recurrence
    for master in recurring_masters:
        try:
            # Parse rule
            rule = rrulestr(master.recurrence_rule, dtstart=master.start_time)
            # Find occurrences in window
            instances = rule.between(start_date, end_date, inc=True)
            
            for dt in instances:
                duration = master.end_time - master.start_time
                
                # Clone master
                instance = master.model_copy()
                # Keep ID same (Frontend handles keys), update times
                instance.start_time = dt
                instance.end_time = dt + duration
                
                expanded_events.append(instance)
        except Exception as e:
            print(f"Recurrence Error {master.id}: {e}")
            continue

    return expanded_events

# 2. CREATE EVENT
@router.post("/", response_model=Event)
def create_event(
    event_data: EventCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Manager/Evaluator auto-approve, others pending
    initial_status = "approved" if current_user.role in ["manager", "evaluator", "superadmin"] else "pending"

    new_event = Event.model_validate(
        event_data, 
        update={
            "proposer_id": current_user.id,
            "company_id": current_user.company_id,
            "status": initial_status,
            # If user didn't send department, use their own
            "department_id": event_data.department_id or current_user.department_id
        }
    )
    
    session.add(new_event)
    session.commit()
    session.refresh(new_event)
    return new_event

# 3. UPDATE EVENT
@router.patch("/{event_id}", response_model=Event)
def update_event(
    event_id: int,
    event_data: EventUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="رویداد یافت نشد")

    # Permission Check: Owner or Manager
    is_owner = event.proposer_id == current_user.id
    is_manager = current_user.role in ["manager", "superadmin"]
    
    if not (is_owner or is_manager):
        raise HTTPException(status_code=403, detail="شما اجازه ویرایش این رویداد را ندارید")

    # Apply updates
    hero_data = event_data.model_dump(exclude_unset=True)
    for key, value in hero_data.items():
        setattr(event, key, value)

    session.add(event)
    session.commit()
    session.refresh(event)
    return event

# 4. DELETE EVENT
@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="رویداد یافت نشد")

    # Permission Check
    is_owner = event.proposer_id == current_user.id
    is_manager = current_user.role in ["manager", "superadmin"]
    
    if not (is_owner or is_manager):
        raise HTTPException(status_code=403, detail="شما اجازه حذف این رویداد را ندارید")

    session.delete(event)
    session.commit()
    return {"ok": True}