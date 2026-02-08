from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, col

from database import get_session
from models import Department, User, CompanyProfile
from security import get_current_user

router = APIRouter()

from pydantic import BaseModel

class DepartmentCreate(BaseModel):
    name: str
    color: str = "#cccccc"
    parent_id: Optional[int] = None
    company_id: Optional[int] = None # Added this field

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None

# 1. GET ALL DEPARTMENTS
@router.get("/", response_model=List[Department])
def read_departments(
    company_id: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Department)

    if current_user.is_superadmin:
        # Superadmin can see everything, or filter by specific company if requested
        if company_id:
            statement = statement.where(Department.company_id == company_id)
    else:
        # Regular users: Find all company IDs they belong to
        user_company_ids = [p.company_id for p in current_user.profiles]
        
        if not user_company_ids:
            return []

        if company_id:
            # If they requested a specific company, verify they have access
            if company_id not in user_company_ids:
                raise HTTPException(status_code=403, detail="Access denied to this company")
            statement = statement.where(Department.company_id == company_id)
        else:
            # Otherwise, return departments from ALL their companies
            statement = statement.where(col(Department.company_id).in_(user_company_ids))
    
    return session.exec(statement).all()

# 2. CREATE DEPARTMENT
@router.post("/", response_model=Department)
def create_department(
    dept_data: DepartmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Determine Company ID
    target_company_id = dept_data.company_id
    
    # If not provided, try to guess from user's first profile (Fallback)
    if not target_company_id:
        if current_user.profiles:
            target_company_id = current_user.profiles[0].company_id
        elif current_user.is_superadmin:
            raise HTTPException(status_code=400, detail="Superadmins must specify company_id")
        else:
             raise HTTPException(status_code=400, detail="User not associated with any company")

    # Permission Check
    if not current_user.is_superadmin:
        user_company_ids = [p.company_id for p in current_user.profiles]
        if target_company_id not in user_company_ids:
             raise HTTPException(status_code=403, detail="You cannot create departments in this company")

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

# 3. UPDATE DEPARTMENT
@router.patch("/{dept_id}", response_model=Department)
def update_department(
    dept_id: int,
    dept_data: DepartmentUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    dept = session.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    # Permission Check
    if not current_user.is_superadmin:
        user_company_ids = [p.company_id for p in current_user.profiles]
        if dept.company_id not in user_company_ids:
             raise HTTPException(status_code=403, detail="Access denied")

    # Update fields
    if dept_data.name is not None:
        dept.name = dept_data.name
    if dept_data.color is not None:
        dept.color = dept_data.color
    if dept_data.parent_id is not None:
        if dept_data.parent_id == dept_id:
            raise HTTPException(status_code=400, detail="Cannot set parent to self")
        dept.parent_id = dept_data.parent_id

    session.add(dept)
    session.commit()
    session.refresh(dept)
    return dept

# 4. DELETE DEPARTMENT
@router.delete("/{dept_id}")
def delete_department(
    dept_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    dept = session.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    if not current_user.is_superadmin:
        user_company_ids = [p.company_id for p in current_user.profiles]
        if dept.company_id not in user_company_ids:
             raise HTTPException(status_code=403, detail="Access denied")
    
    session.delete(dept)
    session.commit()
    return {"ok": True}