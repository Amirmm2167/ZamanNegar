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
        existing = session.exec(
            select(EventInstance).where(EventInstance.master_id == master.id)
        ).all()
        for e in existing:
            session.delete(e)
    
    instances = []
    
    # 2. Determine Target Companies
    target_company_ids = []
    if master.scope == EventScope.SYSTEM:
        query = select(Company.id)
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
            print(f"Warning: EventMaster {master.id} has no company_id and scope is not SYSTEM.")
            return [] 

    # 3. Calculate Dates
    # Now correctly using the Master's start/end time
    base_start = master.start_time
    base_end = master.end_time
    duration = base_end - base_start

    # --- CASE A: NON-RECURRING ---
    if not master.recurrence_rule:
        for company_id in target_company_ids:
            instance = EventInstance(
                master_id=master.id,
                title=master.title,
                start_time=base_start,
                end_time=base_end,
                status=master.status,
                company_id=company_id,
                department_id=master.department_id,
                is_all_day=master.is_all_day
            )
            session.add(instance)
            instances.append(instance)
        
        return instances

    # --- CASE B: RECURRING ---
    try:
        # Parse RRULE
        # dtstart is required for rrulestr to calculate dates correctly relative to start
        rules = rrulestr(master.recurrence_rule, dtstart=base_start)
        
        # Generate dates for next 2 years
        now = datetime.utcnow()
        # Adjust 'now' to ensure we capture upcoming events if start date is in future
        search_start = min(now, base_start) 
        end_limit = now + timedelta(days=EXPANSION_WINDOW_DAYS)
        
        dates = list(rules.between(search_start, end_limit, inc=True))
        
        # Create Instance for each Date x Company
        for dt in dates:
            for company_id in target_company_ids:
                # Calculate End Time based on original duration
                instance_end = dt + duration
                
                instance = EventInstance(
                    master_id=master.id,
                    title=master.title,
                    start_time=dt,
                    end_time=instance_end,
                    status=master.status,
                    company_id=company_id,
                    department_id=master.department_id,
                    is_all_day=master.is_all_day
                )
                session.add(instance)
                instances.append(instance)
                
    except Exception as e:
        print(f"Error expanding RRULE for Master {master.id}: {e}")
        
    return instances