from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from pydantic import BaseModel

from database import get_session
from models import (
    User, CompanyProfile, Role, MembershipStatus, 
    CompanyInvitation, Notification, NotificationType
)
from security import get_current_user, get_password_hash
from utils.localization import normalize_phone

router = APIRouter()

# --- Schemas ---

class UserRead(BaseModel):
    id: Optional[int] = None
    username: Optional[str] = None
    display_name: str
    phone_number: str
    is_superadmin: bool = False
    role: Role = Role.VIEWER
    department_id: Optional[int] = None
    company_id: Optional[int] = None
    status: Union[MembershipStatus, str] = "active"
    type: str = "real"

class UserSearchResponse(BaseModel):
    found: bool
    user_id: Optional[int] = None
    display_name: Optional[str] = None
    phone_number: str
    is_already_member: bool = False

class InviteRequest(BaseModel):
    phone_number: str
    display_name_alias: Optional[str] = None
    department_id: Optional[int] = None
    role: Role = Role.VIEWER
    company_id: Optional[int] = None 
    replace_manager: bool = False # <--- NEW FLAG

class AdminUserCreate(BaseModel):
    username: str
    display_name: str
    phone_number: str
    password: str
    company_id: Optional[int] = None
    department_id: Optional[int] = None
    role: Role = Role.VIEWER
    is_superadmin: bool = False
    
class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[Role] = None
    department_id: Optional[int] = None # Can be None to unassign
    company_id: Optional[int] = None # Required to identify WHICH profile to update

# --- 1. GET USERS (Unchanged) ---
@router.get("/", response_model=List[UserRead])
def read_users(
    request: Request,
    mode: str = Query("global", enum=["global", "memberships"]),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # ... (Keep existing implementation)
    results = []
    if current_user.is_superadmin and not request.state.company_id:
        if mode == "memberships":
            profiles = session.exec(select(CompanyProfile, User).join(User)).all()
            for p, u in profiles:
                results.append(UserRead(
                    id=u.id, username=u.username, display_name=u.display_name,
                    phone_number=u.phone_number, is_superadmin=u.is_superadmin,
                    role=p.role, department_id=p.department_id, company_id=p.company_id,
                    status=p.status, type="real"
                ))
            return results
        else:
            users = session.exec(select(User)).all()
            for u in users:
                results.append(UserRead(
                    id=u.id, username=u.username, display_name=u.display_name,
                    phone_number=u.phone_number, is_superadmin=u.is_superadmin,
                    role=Role.VIEWER, status="active", type="real"
                ))
            return results

    company_id = request.state.company_id
    if not company_id: return []

    profiles = session.exec(select(CompanyProfile, User).join(User).where(CompanyProfile.company_id == company_id)).all()
    for p, u in profiles:
        results.append(UserRead(
            id=u.id, username=u.username, display_name=u.display_name,
            phone_number=u.phone_number, is_superadmin=u.is_superadmin,
            role=p.role, department_id=p.department_id, company_id=p.company_id,
            status=p.status, type="real"
        ))

    invitations = session.exec(select(CompanyInvitation).where(CompanyInvitation.company_id == company_id)).all()
    for i in invitations:
        results.append(UserRead(
            id=i.id, username="ghost", display_name=i.temp_name or "Guest",
            phone_number=i.target_phone, role=i.proposed_role,
            department_id=i.department_id, company_id=i.company_id,
            status="invited", type="ghost"
        ))
    return results

# --- 2. LOOKUP (Unchanged) ---
@router.get("/lookup", response_model=UserSearchResponse)
def lookup_user(
    phone: str, request: Request, session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    target = normalize_phone(phone)
    cid = request.state.company_id
    user = session.exec(select(User).where(User.phone_number == target)).first()
    
    if user:
        is_mem = False
        if cid:
            if session.exec(select(CompanyProfile).where(CompanyProfile.user_id == user.id, CompanyProfile.company_id == cid)).first():
                is_mem = True
        return UserSearchResponse(found=True, user_id=user.id, display_name=user.display_name, phone_number=user.phone_number, is_already_member=is_mem)
    else:
        is_inv = False
        if cid:
            if session.exec(select(CompanyInvitation).where(CompanyInvitation.target_phone == target, CompanyInvitation.company_id == cid)).first():
                is_inv = True
        return UserSearchResponse(found=False, phone_number=target, is_already_member=is_inv)

# --- 3. INVITE (UPDATED FOR MANAGER SWAP) ---
@router.post("/invite")
def invite_user(
    invite_data: InviteRequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Context
    company_id = request.state.company_id or invite_data.company_id
    if not company_id: raise HTTPException(400, "Company Context Required")

    # 2. Permissions
    if request.state.company_id != company_id and not current_user.is_superadmin:
        perm = session.exec(select(CompanyProfile).where(
            CompanyProfile.user_id == current_user.id, CompanyProfile.company_id == company_id, CompanyProfile.role == Role.MANAGER
        )).first()
        if not perm: raise HTTPException(403, "Not authorized")

    # --- 2.5 MANAGER CHECK LOGIC ---
    if invite_data.role == Role.MANAGER:
        # Check if company already has a manager
        existing_manager = session.exec(select(CompanyProfile).where(
            CompanyProfile.company_id == company_id,
            CompanyProfile.role == Role.MANAGER
        )).first()

        if existing_manager:
            # If we are NOT replacing, return Conflict so frontend asks user
            if not invite_data.replace_manager:
                return JSONResponse(
                    status_code=409,
                    content={
                        "detail": "Manager exists",
                        "code": "MANAGER_EXISTS",
                        "current_manager_name": existing_manager.user.display_name
                    }
                )
            else:
                # Downgrade old manager
                existing_manager.role = Role.VIEWER
                session.add(existing_manager)
                # Notify old manager
                session.add(Notification(
                    recipient_id=existing_manager.user_id,
                    type=NotificationType.COMPANY,
                    title="تغییر نقش",
                    message="نقش مدیریتی شما در سازمان تغییر یافت.",
                    reference_id=f"role_change_{company_id}"
                ))

    target_phone = normalize_phone(invite_data.phone_number)
    
    # 3. Real User Logic
    user = session.exec(select(User).where(User.phone_number == target_phone)).first()
    if user:
        existing = session.exec(select(CompanyProfile).where(CompanyProfile.user_id == user.id, CompanyProfile.company_id == company_id)).first()
        if existing:
            # If replacing manager and user exists, just update role
            if invite_data.role == Role.MANAGER and invite_data.replace_manager:
                existing.role = Role.MANAGER
                session.add(existing)
                session.commit()
                return {"status": "ok", "message": "Manager replaced"}
            raise HTTPException(400, "User already member")
            
        profile = CompanyProfile(
            user_id=user.id,
            company_id=company_id,
            department_id=invite_data.department_id,
            role=invite_data.role,
            status=MembershipStatus.PENDING_APPROVAL 
        )
        session.add(profile)
        session.add(Notification(
            recipient_id=user.id, type=NotificationType.COMPANY,
            title="دعوت به همکاری", message=f"شما به یک سازمان دعوت شدید.",
            reference_id=f"invite_{company_id}"
        ))
        session.commit()
        return {"status": "ok", "type": "real"}
    
    # 4. Ghost Logic
    else:
        existing_invite = session.exec(select(CompanyInvitation).where(CompanyInvitation.target_phone == target_phone, CompanyInvitation.company_id == company_id)).first()
        if existing_invite: raise HTTPException(400, "User already invited")
            
        invite = CompanyInvitation(
            target_phone=target_phone,
            temp_name=invite_data.display_name_alias or "کاربر مهمان",
            company_id=company_id,
            department_id=invite_data.department_id,
            proposed_role=invite_data.role,
            inviter_id=current_user.id
        )
        session.add(invite)
        session.commit()
        return {"status": "ok", "type": "ghost"}


# --- 4. ADMIN CREATE ---
@router.post("/", response_model=UserRead)
def admin_create_user(
    user_data: AdminUserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_superadmin:
        raise HTTPException(403, "Only Superadmin can force-create users")
        
    target_phone = normalize_phone(user_data.phone_number)
    if session.exec(select(User).where(User.username == user_data.username)).first():
        raise HTTPException(400, "Username taken")
    if session.exec(select(User).where(User.phone_number == target_phone)).first():
        raise HTTPException(400, "Phone taken")
        
    new_user = User(
        username=user_data.username,
        display_name=user_data.display_name,
        phone_number=target_phone,
        hashed_password=get_password_hash(user_data.password),
        is_superadmin=user_data.is_superadmin,
        is_profile_complete=True
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    if user_data.company_id:
        profile = CompanyProfile(
            user_id=new_user.id,
            company_id=user_data.company_id,
            department_id=user_data.department_id,
            role=user_data.role,
            status=MembershipStatus.ACTIVE
        )
        session.add(profile)
        session.commit()
        
    return UserRead(
        id=new_user.id,
        username=new_user.username,
        display_name=new_user.display_name,
        phone_number=new_user.phone_number,
        is_superadmin=new_user.is_superadmin,
        company_id=user_data.company_id,
        status="active",
        type="real"
    )

# --- 5. DELETE ---
@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    type: str = Query("real", enum=["real", "ghost"]),
    request: Request = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    company_id = request.state.company_id
    
    if type == "ghost":
        invite = session.get(CompanyInvitation, user_id)
        if not invite: raise HTTPException(404)
        if company_id and invite.company_id != company_id and not current_user.is_superadmin:
            raise HTTPException(403)
        session.delete(invite)
        session.commit()
        return {"ok": True}
        
    else:
        # SUPERADMIN GLOBAL DELETE
        if current_user.is_superadmin and not company_id:
            user = session.get(User, user_id)
            if not user: raise HTTPException(404)
            
            # Cascade delete everything
            session.exec(select(CompanyProfile).where(CompanyProfile.user_id == user_id)).delete()
            session.exec(select(CompanyInvitation).where(CompanyInvitation.inviter_id == user_id)).delete()
            # Note: More cascades (events, etc) handled by DB or explicit deletion if needed
            
            session.delete(user)
            session.commit()
        else:
            # MANAGER REMOVE FROM CONTEXT
            if not company_id: raise HTTPException(400, "Context needed to remove user")
            profile = session.exec(select(CompanyProfile).where(
                CompanyProfile.user_id == user_id,
                CompanyProfile.company_id == company_id
            )).first()
            if not profile: raise HTTPException(404, "Member not found")
            session.delete(profile)
            session.commit()
            
        return {"ok": True}
@router.patch("/{user_id}")
def update_user_context(
    user_id: int,
    update_data: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Updates a user's profile within a specific company (Role, Department).
    """
    # 1. Determine Context (Company)
    # We need to know WHICH company profile to update.
    # The frontend UserDrawer should send the company_id in the body or we infer it.
    
    target_company_id = update_data.company_id
    if not target_company_id:
        # Fallback: try to find common company if manager
        # ideally frontend sends it
        raise HTTPException(400, "Company ID required to update context")

    # 2. Permission Check
    if not current_user.is_superadmin:
        manager_perm = session.exec(select(CompanyProfile).where(
            CompanyProfile.user_id == current_user.id,
            CompanyProfile.company_id == target_company_id,
            CompanyProfile.role == "manager"
        )).first()
        if not manager_perm:
            raise HTTPException(403, "Not authorized to edit users in this company")

    # 3. Get Target Profile
    profile = session.exec(select(CompanyProfile).where(
        CompanyProfile.user_id == user_id,
        CompanyProfile.company_id == target_company_id
    )).first()
    
    if not profile:
        raise HTTPException(404, "User is not a member of this company")

    # 4. Apply Updates
    if update_data.role:
        profile.role = update_data.role
    
    # Handle Department Move
    # Note: passing department_id=None (explicit null) should clear it
    if hasattr(update_data, 'department_id'): 
        profile.department_id = update_data.department_id

    # 5. Update Display Name (Global User Attribute)
    # Only if the requester is Superadmin or the user themselves? 
    # Usually Managers can only alias, but if you want them to edit real name:
    if update_data.display_name:
        user = session.get(User, user_id)
        user.display_name = update_data.display_name
        session.add(user)

    session.add(profile)
    session.commit()
    return {"ok": True}