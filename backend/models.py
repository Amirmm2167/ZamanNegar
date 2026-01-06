from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship #type:ignore
from enum import Enum

# 1. Company
class Company(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    settings: str = "{}"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    departments: List["Department"] = Relationship(back_populates="company")
    users: List["User"] = Relationship(back_populates="company")

# 2. Department
class Department(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    color: str = "#cccccc"
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")
    parent_id: Optional[int] = Field(default=None, foreign_key="department.id")
    company: Optional[Company] = Relationship(back_populates="departments")
    users: List["User"] = Relationship(back_populates="department")

# 3. User
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    display_name: str
    hashed_password: str
    role: str = "viewer"
    issues: List["Issue"] = Relationship(back_populates="user")
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")
    department_id: Optional[int] = Field(default=None, foreign_key="department.id")
    company: Optional[Company] = Relationship(back_populates="users")
    department: Optional[Department] = Relationship(back_populates="users")

# 4. Event
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
    recurrence_rule: Optional[str] = None
    status: str = "pending"
    rejection_reason: Optional[str] = None
    proposer_id: int = Field(foreign_key="user.id")
    department_id: Optional[int] = Field(foreign_key="department.id")
    company_id: int = Field(foreign_key="company.id")

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
    department_id: Optional[int] = None

class Holiday(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    occasion: str
    holiday_date: datetime
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")

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
    user_id: int = Field(foreign_key="user.id")
    user: "User" = Relationship(back_populates="issues")

class TagType(str, Enum):
    GOAL = "goal"
    AUDIENCE = "audience" 
    ORGANIZER = "organizer"

class Tag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    category: str
    usage_count: int = 0
    company_id: int = Field(foreign_key="company.id")
    status: str = Field(default="pending")

# --- NEW: Analytics Model ---
class AnalyticsLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_type: str = Field(index=True) # e.g., 'LOGIN', 'ERROR', 'PWA_INSTALL'
    details: Optional[str] = None       # JSON string or text details
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)