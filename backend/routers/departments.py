from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, col, func
from pydantic import BaseModel

from database import get_session
from models import Department, User, CompanyProfile
from security import get_current_user

router = APIRouter()

# --- Schemas ---
class DepartmentCreate(BaseModel):
    name: str
    color: str = "#cccccc"
    parent_id: Optional[int] = None
    company_id: Optional[int] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None

# New Schema for the Inspector
class DepartmentDetail(BaseModel):
    id: int
    name: str
    parent_id: Optional[int] = None
    company_id: int
    user_count: int
    users: List[dict] = []

# --- Endpoints ---

@router.get("/", response_model=List[Department])
def read_departments(
    company_id: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Department)
    if current_user.is_superadmin:
        if company_id: statement = statement.where(Department.company_id == company_id)
    else:
        user_company_ids = [p.company_id for p in current_user.profiles]
        if not user_company_ids: return []
        if company_id:
            if company_id not in user_company_ids: raise HTTPException(403)
            statement = statement.where(Department.company_id == company_id)
        else:
            statement = statement.where(col(Department.company_id).in_(user_company_ids))
    return session.exec(statement).all()

# --- NEW ENDPOINT: INSPECTOR DATA ---
@router.get("/{dept_id}", response_model=DepartmentDetail)
def get_department_details(
    dept_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    dept = session.get(Department, dept_id)
    if not dept: raise HTTPException(404, "Department not found")

    # Access Check
    if not current_user.is_superadmin:
        user_company_ids = [p.company_id for p in current_user.profiles]
        if dept.company_id not in user_company_ids: raise HTTPException(403)

    # Fetch users
    profiles = session.exec(
        select(CompanyProfile, User)
        .join(User)
        .where(CompanyProfile.department_id == dept_id)
    ).all()

    users_list = []
    for p, u in profiles:
        users_list.append({
            "id": u.id,
            "display_name": u.display_name,
            "username": u.username,
            "role": p.role,
            "profile_id": p.id
        })

    return DepartmentDetail(
        id=dept.id,
        name=dept.name,
        parent_id=dept.parent_id,
        company_id=dept.company_id,
        user_count=len(users_list),
        users=users_list
    )

@router.post("/", response_model=Department)
def create_department(
    dept_data: DepartmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    target_company_id = dept_data.company_id
    if not target_company_id:
        if current_user.profiles: target_company_id = current_user.profiles[0].company_id
        elif current_user.is_superadmin: raise HTTPException(400, "Company ID required")
        else: raise HTTPException(400, "No context")

    if not current_user.is_superadmin:
        user_company_ids = [p.company_id for p in current_user.profiles]
        if target_company_id not in user_company_ids: raise HTTPException(403)

    new_dept = Department(
        name=dept_data.name,
        color=dept_data.color,
        parent_id=dept_data.parent_id,
        company_id=target_company_id
    )
    session.add(new_dept)
    session.commit()
    session.refresh(new_dept)
    return new_dept

@router.patch("/{dept_id}", response_model=Department)
def update_department(
    dept_id: int,
    dept_data: DepartmentUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    dept = session.get(Department, dept_id)
    if not dept: raise HTTPException(404)
    
    if not current_user.is_superadmin:
        user_company_ids = [p.company_id for p in current_user.profiles]
        if dept.company_id not in user_company_ids: raise HTTPException(403)

    if dept_data.name: dept.name = dept_data.name
    if dept_data.color: dept.color = dept_data.color
    if dept_data.parent_id is not None:
        if dept_data.parent_id == dept_id: raise HTTPException(400, "Circular parent")
        dept.parent_id = dept_data.parent_id

    session.add(dept)
    session.commit()
    session.refresh(dept)
    return dept

@router.delete("/{dept_id}")
def delete_department(
    dept_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    dept = session.get(Department, dept_id)
    if not dept: raise HTTPException(404)
    
    if not current_user.is_superadmin:
        user_company_ids = [p.company_id for p in current_user.profiles]
        if dept.company_id not in user_company_ids: raise HTTPException(403)
    
    # Check members
    has_members = session.exec(select(CompanyProfile).where(CompanyProfile.department_id == dept_id)).first()
    if has_members: raise HTTPException(400, "Department is not empty. Move users first.")

    session.delete(dept)
    session.commit()
    return {"ok": True}