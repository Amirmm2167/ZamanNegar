from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON
from enum import Enum
import uuid

# --- Enums ---
class Role(str, Enum):
    VIEWER = "viewer"
    PROPOSER = "proposer"
    EVALUATOR = "evaluator"
    MANAGER = "manager"

class EventScope(str, Enum):
    COMPANY = "company"
    SYSTEM = "system"

class EventStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class IssueStatus(str, Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

# --- 1. Identity & Session Models ---

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: Optional[str] = Field(default=None, index=True)
    display_name: str
    hashed_password: str
    is_superadmin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    profiles: List["CompanyProfile"] = Relationship(back_populates="user")
    sessions: List["UserSession"] = Relationship(back_populates="user")
    issues: List["Issue"] = Relationship(back_populates="user")
    # Relationship to EventMaster (Proposer)
    events_proposed: List["EventMaster"] = Relationship(back_populates="proposer")

class UserSession(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    token_hash: str = Field(index=True)
    device_fingerprint: Optional[str] = None
    ip_address: Optional[str] = None
    geo_location: Optional[str] = None
    last_active: datetime = Field(default_factory=datetime.utcnow)
    preferences: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    
    user: User = Relationship(back_populates="sessions")

class CompanyProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    company_id: int = Field(foreign_key="company.id")
    department_id: Optional[int] = Field(default=None, foreign_key="department.id")
    role: Role = Field(default=Role.VIEWER)
    
    user: User = Relationship(back_populates="profiles")
    company: "Company" = Relationship(back_populates="profiles")
    department: Optional["Department"] = Relationship(back_populates="profiles")

# --- 2. Organization Models ---

class Company(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    settings: str = "{}" 
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    departments: List["Department"] = Relationship(back_populates="company")
    profiles: List["CompanyProfile"] = Relationship(back_populates="company")
    event_masters: List["EventMaster"] = Relationship(back_populates="company")
    event_instances: List["EventInstance"] = Relationship(back_populates="company")

class Department(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    color: str = "#cccccc"
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")
    parent_id: Optional[int] = Field(default=None, foreign_key="department.id")
    
    company: Optional[Company] = Relationship(back_populates="departments")
    profiles: List["CompanyProfile"] = Relationship(back_populates="department")

# --- 3. Recurrence Engine Models ---

class EventMaster(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    goal: Optional[str] = None
    target_audience: Optional[str] = None
    organizer: Optional[str] = None
    
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    
    scope: EventScope = Field(default=EventScope.COMPANY)
    target_rules: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    
    status: EventStatus = Field(default=EventStatus.PENDING)
    is_locked: bool = False
    lock_version: int = 0
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    proposer_id: int = Field(foreign_key="user.id")
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")
    department_id: Optional[int] = Field(default=None, foreign_key="department.id")
    
    proposer: User = Relationship(back_populates="events_proposed")
    company: Optional[Company] = Relationship(back_populates="event_masters")
    instances: List["EventInstance"] = Relationship(back_populates="master")
    exceptions: List["EventException"] = Relationship(back_populates="master")

class EventInstance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    master_id: int = Field(foreign_key="eventmaster.id")
    
    title: str 
    start_time: datetime = Field(index=True)
    end_time: datetime = Field(index=True)
    is_all_day: bool = False
    status: EventStatus = Field(default=EventStatus.PENDING)
    
    company_id: int = Field(foreign_key="company.id", index=True)
    department_id: Optional[int] = Field(default=None, foreign_key="department.id")
    
    master: EventMaster = Relationship(back_populates="instances")
    company: Company = Relationship(back_populates="event_instances")

class EventException(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    master_id: int = Field(foreign_key="eventmaster.id")
    original_date: datetime
    new_date: Optional[datetime] = None
    is_cancelled: bool = False
    master: EventMaster = Relationship(back_populates="exceptions")

class EventCreate(SQLModel):
    title: str
    description: Optional[str] = None
    goal: Optional[str] = None
    target_audience: Optional[str] = None
    organizer: Optional[str] = None
    start_time: datetime
    end_time: datetime
    is_all_day: bool = False
    recurrence_rule: Optional[str] = None
    company_id: Optional[int] = None
    department_id: Optional[int] = None

# --- 4. Supporting Models ---

class Holiday(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    occasion: str
    holiday_date: datetime
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")

class Issue(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: IssueStatus = Field(default=IssueStatus.NEW)
    user_id: int = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="issues")

class Tag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    category: str
    usage_count: int = 0
    company_id: int = Field(foreign_key="company.id")
    status: str = Field(default="pending")

class AnalyticsLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_type: str = Field(index=True)
    details: Optional[str] = None
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)