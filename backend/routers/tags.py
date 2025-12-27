from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from database import get_session
from models import Tag, User
from security import get_current_user

router = APIRouter()

class TagCreate(BaseModel):
    text: str
    category: str

@router.get("/", response_model=List[Tag])
def read_tags(
    category: str,
    status: str = "active", # Default to active
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    query = select(Tag).where(
        Tag.company_id == current_user.company_id,
        Tag.category == category
    )

    # Permission Logic
    # 1. Standard users only see ACTIVE tags
    # 2. Managers/Admins can see 'pending' or 'all' if they request it
    if current_user.role not in ["manager", "superadmin", "evaluator"]:
        query = query.where(Tag.status == "active")
    else:
        if status != "all":
            query = query.where(Tag.status == status)

    query = query.order_by(Tag.usage_count.desc()).limit(20)
    return session.exec(query).all()

@router.post("/", response_model=Tag)
def create_or_update_tag(
    tag_data: TagCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Check if exists
    statement = select(Tag).where(
        Tag.company_id == current_user.company_id,
        Tag.text == tag_data.text,
        Tag.category == tag_data.category
    )
    existing = session.exec(statement).first()
    
    if existing:
        existing.usage_count += 1
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    else:
        # Create as PENDING by default
        new_tag = Tag(
            text=tag_data.text,
            category=tag_data.category,
            usage_count=1,
            company_id=current_user.company_id,
            status="pending" 
        )
        session.add(new_tag)
        session.commit()
        session.refresh(new_tag)
        return new_tag

@router.delete("/{tag_id}")
def delete_tag(
    tag_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["manager", "superadmin"]:
         raise HTTPException(status_code=403, detail="Permission denied")
         
    tag = session.get(Tag, tag_id)
    if not tag or tag.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Tag not found")
        
    session.delete(tag)
    session.commit()
    return {"ok": True}