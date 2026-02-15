# backend/routers/tags.py

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from pydantic import BaseModel

from database import get_session
from models import Tag, User, CompanyProfile, Role
from security import get_current_user

router = APIRouter()

class TagCreate(BaseModel):
    text: str
    category: str

class TagRead(BaseModel):
    id: int
    text: str
    category: str
    status: str

@router.get("/", response_model=List[TagRead])
def read_tags(
    category: Optional[str] = None,
    status: str = "active",
    request: Request = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Only show tags for the active company context
    company_id = request.state.company_id
    if not company_id:
        return []

    statement = select(Tag).where(Tag.company_id == company_id)
    
    if category:
        statement = statement.where(Tag.category == category)
    
    if status:
        statement = statement.where(Tag.status == status)
        
    return session.exec(statement).all()

@router.post("/", response_model=TagRead)
def create_tag(
    tag_data: TagCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    company_id = request.state.company_id
    if not company_id:
        raise HTTPException(400, "Context required")

    # 1. Check if exists
    existing = session.exec(select(Tag).where(
        Tag.text == tag_data.text,
        Tag.category == tag_data.category,
        Tag.company_id == company_id
    )).first()
    
    if existing:
        return existing

    # 2. Determine Status (Auto-approve for Managers/Admins)
    status = "pending"
    if current_user.is_superadmin:
        status = "active"
    else:
        # Check manager role
        profile = session.exec(select(CompanyProfile).where(
            CompanyProfile.user_id == current_user.id,
            CompanyProfile.company_id == company_id
        )).first()
        if profile and profile.role == Role.MANAGER:
            status = "active"

    # 3. Create
    tag = Tag(
        text=tag_data.text,
        category=tag_data.category,
        company_id=company_id,
        status=status,
        usage_count=1
    )
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return tag