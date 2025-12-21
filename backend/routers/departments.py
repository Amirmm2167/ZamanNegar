from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select #type:ignore

from database import get_session
from models import Department, User
from security import get_current_user

router = APIRouter()

# Schema for input validation (Pydantic)
from pydantic import BaseModel

class DepartmentCreate(BaseModel):
    name: str
    color: str = "#cccccc"
    parent_id: Optional[int] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None

# 1. GET ALL DEPARTMENTS (Updated for Superadmin filtering)
@router.get("/", response_model=List[Department])
def read_departments(
    company_id: Optional[int] = None, # <--- New Query Parameter
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Department)

    if current_user.role == "superadmin":
        # If Admin sends a specific company_id, filter by it
        if company_id:
            statement = statement.where(Department.company_id == company_id)
        # Otherwise return all (or handle as needed)
    else:
        # Regular users ALWAYS filtered by their own company
        statement = statement.where(Department.company_id == current_user.company_id)
    
    return session.exec(statement).all()

# 2. CREATE DEPARTMENT
@router.post("/", response_model=Department)
def create_department(
    dept_data: DepartmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Determine Company ID
    company_id = current_user.company_id if current_user.company_id else 1
    
    new_dept = Department(
        name=dept_data.name,
        color=dept_data.color,
        parent_id=dept_data.parent_id,
        company_id=company_id
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
    
    # Update fields if provided
    if dept_data.name is not None:
        dept.name = dept_data.name
    if dept_data.color is not None:
        dept.color = dept_data.color
    if dept_data.parent_id is not None:
        # Prevent circular reference (a dept cannot be its own parent)
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
    
    session.delete(dept)
    session.commit()
    return {"ok": True}