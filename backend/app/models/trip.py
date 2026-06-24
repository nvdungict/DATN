from datetime import date, datetime
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field


class TripStatus(str, Enum):
    PLANNED = "PLANNED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class TripBase(SQLModel):
    title: str
    destination: str
    start_date: date
    end_date: date
    total_budget: float = 0.0
    currency: str = "USD"


class Trip(TripBase, table=True):
    __tablename__ = "trips"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    status: TripStatus = Field(default=TripStatus.PLANNED)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TripCreate(TripBase):
    pass


class TripRead(TripBase):
    id: int
    user_id: int
    status: TripStatus
    created_at: datetime
    updated_at: datetime
    user_role: Optional[str] = None


class TripUpdate(SQLModel):
    title: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_budget: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[TripStatus] = None

class TripCollaborator(SQLModel, table=True):
    __tablename__ = "trip_collaborators"

    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trips.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    role: str = Field(default="VIEWER") # OWNER, EDITOR, VIEWER
    status: str = Field(default="PENDING") # PENDING, ACCEPTED, REJECTED
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TripCollaboratorRead(SQLModel):
    id: int
    trip_id: int
    user_id: int
    role: str
    status: str
    created_at: datetime
