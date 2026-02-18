from datetime import datetime, timedelta
from typing import List, Dict
from dateutil.rrule import rrulestr
from sqlmodel import Session, select, or_
from models import Event, EventScope

def _to_date_str(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")

def _ensure_naive(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt

def get_events_in_range(
    session: Session, 
    start_range: datetime, 
    end_range: datetime, 
    company_ids: List[int],
    is_superadmin: bool = False
) -> List[Dict]:
    
    start_range = _ensure_naive(start_range)
    end_range = _ensure_naive(end_range)

    query = select(Event)
    
    if not is_superadmin:
        query = query.where(
            or_(
                Event.company_id.in_(company_ids), # type: ignore
                Event.scope == EventScope.SYSTEM
            )
        )
    
    query = query.where(Event.start_time <= end_range)
    all_events = session.exec(query).all()
    
    results = []
    exceptions_map = {}
    
    for evt in all_events:
        if evt.parent_id and evt.original_start_time:
            key = (evt.parent_id, _to_date_str(evt.original_start_time))
            exceptions_map[key] = evt

    for evt in all_events:
        evt_start = _ensure_naive(evt.start_time)
        evt_end = _ensure_naive(evt.end_time)

        if not evt.recurrence_rule:
            if evt_start >= start_range and evt_start <= end_range:
                results.append(_event_to_dict(evt, evt_start, evt_end))
            continue

        if evt.parent_id:
            continue

        try:
            rules = rrulestr(evt.recurrence_rule, dtstart=evt_start)
            instances = rules.between(start_range, end_range, inc=True)
            
            duration = evt_end - evt_start
            exdates = set(evt.exception_dates or [])
            
            for dt in instances:
                dt = _ensure_naive(dt)
                date_key = _to_date_str(dt)
                
                if date_key in exdates:
                    continue
                
                override_key = (evt.id, date_key)
                if override_key in exceptions_map:
                    continue
                
                instance_end = dt + duration
                # FIX: is_virtual (no underscore)
                results.append(_event_to_dict(evt, dt, instance_end, is_virtual=True))
                
        except Exception as e:
            print(f"Recurrence Error Event {evt.id}: {e}")
            if evt_start >= start_range and evt_start <= end_range:
                results.append(_event_to_dict(evt, evt_start, evt_end))

    results.sort(key=lambda x: x['start_time'])
    return results

def _event_to_dict(evt: Event, start: datetime, end: datetime, is_virtual: bool = False) -> Dict:
    return {
        "id": evt.id, 
        "master_id": evt.id if is_virtual else (evt.parent_id or evt.id),
        "proposer_id": evt.proposer_id,
        "title": evt.title,
        "description": evt.description,
        "start_time": start,
        "end_time": end,
        "is_all_day": evt.is_all_day,
        "status": evt.status,
        "company_id": evt.company_id,
        "department_id": evt.department_id,
        "is_locked": evt.is_locked,
        "recurrence_rule": evt.recurrence_rule,
        "goal": evt.goal,
        "target_audience": evt.target_audience,
        "organizer": evt.organizer,
        # FIX: Remove underscores for JSON serialization
        "is_virtual": is_virtual,
        "instance_date": _to_date_str(start) 
    }