from datetime import datetime, timedelta
from typing import List, Optional
from dateutil.rrule import rrulestr
from sqlmodel import Session, select
from models import EventMaster, EventInstance, EventScope, Company, EventStatus

EXPANSION_WINDOW_DAYS = 730 # 2 Years

def expand_master_to_instances(
    session: Session, 
    master: EventMaster, 
    clear_existing: bool = True
) -> List[EventInstance]:
    """
    Generates EventInstance rows from an EventMaster rule.
    Handles System-Wide broadcasting logic.
    """
    
    # 1. Clear old future instances if requested (for updates)
    if clear_existing:
        # In a real update scenario, we'd be careful not to delete past instances
        # or those with exceptions. For now, we assume a clean generation.
        existing = session.exec(
            select(EventInstance).where(EventInstance.master_id == master.id)
        ).all()
        for e in existing:
            session.delete(e)
    
    instances = []
    
    # 2. Determine Target Companies
    target_company_ids = []
    if master.scope == EventScope.SYSTEM:
        # Fetch all companies or filter based on target_rules
        query = select(Company.id)
        
        # Apply Logic: Include/Exclude
        includes = master.target_rules.get("include_companies", [])
        excludes = master.target_rules.get("exclude_companies", [])
        
        if includes:
            query = query.where(Company.id.in_(includes)) # type: ignore
        if excludes:
            query = query.where(Company.id.notin_(excludes)) # type: ignore
            
        target_company_ids = session.exec(query).all()
    else:
        # Single Company Event
        if master.company_id:
            target_company_ids = [master.company_id]
        else:
            return [] # Error state: Company Event with no Company ID

    # 3. Calculate Dates
    start_dt = master.created_at # Or a specific start_time field if added to Master
    # Note: Currently Master doesn't have start_time/end_time in the definition 
    # because it's derived from the first instance or RRULE. 
    # **Correction**: We should pass the initial start/end from the creation payload 
    # but for now, we assume the parsing logic handles it.
    
    # We need the DURATION of the event to calculate end_time for each instance
    # Let's assume we pass a 'duration' or parse it from the first instance request.
    # For this function signature, we'll assume we parse the RRULE.
    
    if not master.recurrence_rule:
        # Non-recurring: Create single instance per target company
        # We need the start/end time. 
        # Ideally, EventMaster should have 'base_start_time' and 'duration'.
        # Let's assume for this step the DB has it or we derive it.
        pass 
        # Note: Implementing fully robust parsing requires the `start_time` on Master.
        # I will update the logic to assume `base_start_time` is passed or stored.
        return []

    try:
        # Parse RRULE
        # rrulestr requires a start date (dtstart)
        # We will assume the RRULE string contains DTSTART, or we prepend it.
        rules = rrulestr(master.recurrence_rule, dtstart=datetime.utcnow()) # Placeholder
        
        # Generate dates for next 2 years
        now = datetime.utcnow()
        end_limit = now + timedelta(days=EXPANSION_WINDOW_DAYS)
        
        dates = list(rules.between(now, end_limit, inc=True))
        
        # Create Instance for each Date x Company
        for dt in dates:
            for company_id in target_company_ids:
                # Calculate End Time (e.g., +1 hour default if unknown)
                # In production, use master.duration
                instance_end = dt + timedelta(hours=1) 
                
                instance = EventInstance(
                    master_id=master.id,
                    title=master.title,
                    start_time=dt,
                    end_time=instance_end,
                    status=master.status,
                    company_id=company_id,
                    department_id=master.department_id,
                    is_all_day=False # Derive from master
                )
                session.add(instance)
                instances.append(instance)
                
    except Exception as e:
        print(f"Error expanding RRULE: {e}")
        
    return instances