from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime

from database import get_session
from models import Issue, User
from security import get_current_user

router = APIRouter()

class IssueCreate(BaseModel):
    title: str
    description: str

class IssueUpdate(BaseModel):
    status: str

# 1. User: Submit a Report
@router.post("/", response_model=Issue)
def create_issue(
    issue_data: IssueCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    new_issue = Issue(
        title=issue_data.title,
        description=issue_data.description,
        user_id=current_user.id
    )
    session.add(new_issue)
    session.commit()
    session.refresh(new_issue)
    return new_issue

# 2. Admin: Get All Reports (with User details)
@router.get("/", response_model=List[Issue])
def read_issues(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "superadmin":
        # Regular users only see their own
        statement = select(Issue).where(Issue.user_id == current_user.id)
    else:
        # Admins see everything
        statement = select(Issue).order_by(Issue.created_at.desc())
    
    return session.exec(statement).all()

# 3. Admin: Update Status
@router.patch("/{issue_id}", response_model=Issue)
def update_issue_status(
    issue_id: int,
    issue_data: IssueUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="فقط ادمین مجاز است")
        
    issue = session.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="یافت نشد")
        
    issue.status = issue_data.status
    session.add(issue)
    session.commit()
    session.refresh(issue)
    return issue