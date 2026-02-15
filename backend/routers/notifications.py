from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime

from database import get_session
from models import User, Notification, CompanyProfile, MembershipStatus, NotificationType
from security import get_current_user

router = APIRouter()

class NotificationRead(BaseModel):
    id: int
    title: str
    message: str
    type: NotificationType
    is_read: bool
    created_at: datetime
    reference_id: Optional[str] = None # e.g. "invite_12"

@router.get("/", response_model=List[NotificationRead])
def get_notifications(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Fetch unread first, then recent read ones
    notifs = session.exec(
        select(Notification)
        .where(Notification.recipient_id == current_user.id)
        .order_by(Notification.is_read, Notification.created_at.desc())
        .limit(50)
    ).all()
    return notifs

@router.post("/{notif_id}/read")
def mark_read(
    notif_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    notif = session.get(Notification, notif_id)
    if not notif or notif.recipient_id != current_user.id:
        raise HTTPException(404)
    notif.is_read = True
    session.add(notif)
    session.commit()
    return {"ok": True}

@router.post("/invites/{company_id}/{action}")
def handle_invite(
    company_id: int,
    action: str, # "accept" or "reject"
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Find the pending profile
    profile = session.exec(select(CompanyProfile).where(
        CompanyProfile.user_id == current_user.id,
        CompanyProfile.company_id == company_id,
        CompanyProfile.status == MembershipStatus.PENDING_APPROVAL
    )).first()
    
    if not profile:
        raise HTTPException(404, "Invitation not found or already processed")

    if action == "accept":
        profile.status = MembershipStatus.ACTIVE
        session.add(profile)
        msg = "Invitation accepted"
    elif action == "reject":
        session.delete(profile)
        msg = "Invitation rejected"
    else:
        raise HTTPException(400, "Invalid action")

    # 2. Cleanup related notifications
    ref_id = f"invite_{company_id}"
    notifs = session.exec(select(Notification).where(
        Notification.recipient_id == current_user.id,
        Notification.reference_id == ref_id
    )).all()
    
    for n in notifs:
        session.delete(n)

    session.commit()
    return {"message": msg}