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

class IssueStatus(str, Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class TagType(str, Enum):
    GOAL = "goal"
    AUDIENCE = "audience" 
    ORGANIZER = "organizer"

# --- 1. Identity & Session Models ---

class User(SQLModel, table=True):
    """
    Identity Table: Stores WHO the user is.
    Permissions are now handled by CompanyProfile.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: Optional[str] = Field(default=None, index=True)
    display_name: str
    hashed_password: str
    is_superadmin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    profiles: List["CompanyProfile"] = Relationship(back_populates="user")
    sessions: List["UserSession"] = Relationship(back_populates="user")
    issues: List["Issue"] = Relationship(back_populates="user")
    events_proposed: List["Event"] = Relationship(back_populates="proposer")

class UserSession(SQLModel, table=True):
    """
    Session Table: Handles Multi-Device security and Preferences.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    token_hash: str = Field(index=True)
    
    # Security & Analytics
    device_fingerprint: Optional[str] = None
    ip_address: Optional[str] = None
    geo_location: Optional[str] = None # e.g., "Tehran, IR"
    last_active: datetime = Field(default_factory=datetime.utcnow)
    
    # User Preferences (Theme, Locale, Last Company)
    preferences: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    
    user: User = Relationship(back_populates="sessions")

class CompanyProfile(SQLModel, table=True):
    """
    Membership Table: Links Identity to Context.
    User Z can be a Manager in Company A and a Viewer in Company B.
    """
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
    settings: str = "{}" # JSON string for company-wide settings
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
    # Note: We removed direct 'users' list from Department/Company to enforce using Profile

# --- 3. Domain Models (Events & Logic) ---

class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    goal: Optional[str] = None # Will be hidden for Viewers via Serializer later
    target_audience: Optional[str] = None
    organizer: Optional[str] = None
    
    start_time: datetime
    end_time: datetime
    is_all_day: bool = False
    
    # Recurrence & Status
    recurrence_rule: Optional[str] = None
    status: str = "pending"
    rejection_reason: Optional[str] = None
    
    # Ownership
    proposer_id: int = Field(foreign_key="user.id")
    department_id: Optional[int] = Field(foreign_key="department.id")
    company_id: int = Field(foreign_key="company.id")
    
    proposer: User = Relationship(back_populates="events_proposed")
    company: Company = Relationship(back_populates="events")

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