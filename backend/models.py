from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship #type:ignore
from enum import Enum

# 1. Company: The top-level tenant
class Company(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    settings: str = "{}"  # Storing JSON settings as a string
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships (One Company -> Many Departments/Users)
    departments: List["Department"] = Relationship(back_populates="company")
    users: List["User"] = Relationship(back_populates="company")

# 2. Department: Groups users
class Department(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    color: str = "#cccccc"
    
    # Foreign Keys
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")
    parent_id: Optional[int] = Field(default=None, foreign_key="department.id")

    # Relationships
    company: Optional[Company] = Relationship(back_populates="departments")
    users: List["User"] = Relationship(back_populates="department")

# 3. User: The logic for roles and login
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    display_name: str
    hashed_password: str
    role: str = "viewer"  # manager, evaluator, proposer, viewer
    issues: List["Issue"] = Relationship(back_populates="user")
    
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")
    department_id: Optional[int] = Field(default=None, foreign_key="department.id")

    company: Optional[Company] = Relationship(back_populates="users")
    department: Optional[Department] = Relationship(back_populates="users")

# 4. Event: The core calendar data
class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    goal: Optional[str] = None
    
    target_audience: Optional[str] = None
    organizer: Optional[str] = None
    
    start_time: datetime
    end_time: datetime
    is_all_day: bool = False
    
    
    # Enhanced Recurrence: Storing standard RFC 5545 rules (e.g., "FREQ=WEEKLY")
    recurrence_rule: Optional[str] = None
    
    status: str = "pending"
    rejection_reason: Optional[str] = None
    
    # Foreign Keys
    proposer_id: int = Field(foreign_key="user.id")
    department_id: Optional[int] = Field(foreign_key="department.id")
    company_id: int = Field(foreign_key="company.id")

# --- SCHEMAS (DTOs) ---
# These are used for API Validation, not database tables.

class EventCreate(SQLModel):
    title: str
    description: Optional[str] = None
    goal: Optional[str] = None
    start_time: datetime
    end_time: datetime
    is_all_day: bool = False
    recurrence_rule: Optional[str] = None
    target_audience: Optional[str] = None
    organizer: Optional[str] = None
    
    # We allow them to link a department, but logic will check if they are allowed to
    department_id: Optional[int] = None

# 1. Update Holiday Class (Make company_id Optional)
class Holiday(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    occasion: str
    holiday_date: datetime
    # If None, it applies to EVERYONE (Global Holiday)
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")

# 2. Add Issue Class (For User Reports)
class IssueStatus(str, Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class Issue(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = IssueStatus.NEW
    
    # Who reported it?
    user_id: int = Field(foreign_key="user.id")
    # We explicitly link the user relationship to fetch their name easily
    user: "User" = Relationship(back_populates="issues")
    
    
class TagType(str, Enum):
    GOAL = "goal"
    AUDIENCE = "audience" # For
    ORGANIZER = "organizer" # By

class Tag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    category: str # 'goal', 'for', 'by'
    usage_count: int = 0
    company_id: int = Field(foreign_key="company.id")
    status: str = Field(default="pending") # 'pending', 'active'