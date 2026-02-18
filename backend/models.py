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
    
class MembershipStatus(str, Enum):
    ACTIVE = "active"
    PENDING_APPROVAL = "pending"
    SUSPENDED = "suspended"

class IssueStatus(str, Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class NotificationType(str, Enum):
    SYSTEM = "system"
    COMPANY = "company"
    PERSONAL = "personal"

# --- 1. Identity & Session Models ---

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    phone_number: str = Field(unique=True, index=True) 
    display_name: str
    hashed_password: str
    is_superadmin: bool = Field(default=False)
    is_profile_complete: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    profiles: List["CompanyProfile"] = Relationship(back_populates="user")
    sessions: List["UserSession"] = Relationship(back_populates="user")
    issues: List["Issue"] = Relationship(back_populates="user")
    events_proposed: List["Event"] = Relationship(back_populates="proposer")
    notifications: List["Notification"] = Relationship(back_populates="recipient")

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

class CompanyInvitation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    target_phone: str = Field(index=True)
    temp_name: Optional[str] = None 
    company_id: int = Field(foreign_key="company.id")
    department_id: Optional[int] = Field(default=None, foreign_key="department.id")
    proposed_role: Role = Field(default=Role.VIEWER)
    inviter_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CompanyProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    status: MembershipStatus = Field(default=MembershipStatus.ACTIVE)
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
    events: List["Event"] = Relationship(back_populates="company")

class Department(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    color: str = "#cccccc"
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")
    parent_id: Optional[int] = Field(default=None, foreign_key="department.id")
    company: Optional[Company] = Relationship(back_populates="departments")
    profiles: List["CompanyProfile"] = Relationship(back_populates="department")

# --- 3. Events (Read-Time Architecture) ---

class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    goal: Optional[str] = None
    target_audience: Optional[str] = None
    organizer: Optional[str] = None
    
    start_time: datetime = Field(index=True)
    end_time: datetime
    is_all_day: bool = False
    
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    
    # --- UI HINTS (Normalization Pattern) ---
    recurrence_ui_mode: Optional[str] = None # 'count' | 'date'
    recurrence_ui_count: Optional[int] = None # Original count input by user
    
    exception_dates: List[str] = Field(default=[], sa_column=Column(JSON))
    parent_id: Optional[int] = Field(default=None, foreign_key="event.id")
    original_start_time: Optional[datetime] = None
    
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
    company: Optional[Company] = Relationship(back_populates="events")
    
    parent: Optional["Event"] = Relationship(
        back_populates="exceptions", 
        sa_relationship_kwargs={"remote_side": "Event.id"}
    )
    exceptions: List["Event"] = Relationship(back_populates="parent")

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
    
    # --- New Fields for Creation ---
    recurrence_ui_mode: Optional[str] = None
    recurrence_ui_count: Optional[int] = None
    
    company_id: Optional[int] = None
    department_id: Optional[int] = None
    scope: Optional[EventScope] = None 
    target_rules: Optional[Dict[str, Any]] = None

# --- 4. Supporting Models ---
# (Notifications, Holidays, Issues, Tags, AnalyticsLog - SAME AS BEFORE)
class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    recipient_id: int = Field(foreign_key="user.id", index=True)
    type: NotificationType = Field(default=NotificationType.PERSONAL)
    title: str
    message: str
    is_read: bool = False
    reference_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    recipient: User = Relationship(back_populates="notifications")

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