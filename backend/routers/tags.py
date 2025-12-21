from typing import List
from fastapi import APIRouter, Depends
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
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Fetch tags for this company and category, ordered by usage
    statement = select(Tag).where(
        Tag.company_id == current_user.company_id,
        Tag.category == category
    ).order_by(Tag.usage_count.desc()).limit(10)
    return session.exec(statement).all()

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
        new_tag = Tag(
            text=tag_data.text,
            category=tag_data.category,
            usage_count=1,
            company_id=current_user.company_id
        )
        session.add(new_tag)
        session.commit()
        session.refresh(new_tag)
        return new_tag