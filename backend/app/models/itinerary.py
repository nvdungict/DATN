from datetime import datetime, time
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field, Column, JSON


class ItemType(str, Enum):
    ATTRACTION = "ATTRACTION"
    MEAL = "MEAL"
    TRANSPORT = "TRANSPORT"
    LODGING = "LODGING"


class ItemStatus(str, Enum):
    SUGGESTED = "SUGGESTED"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"


class ItineraryItemBase(SQLModel):
    trip_id: int = Field(foreign_key="trips.id", index=True)
    day_number: int
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    type: ItemType
    activity_details: dict = Field(default_factory=dict, sa_column=Column(JSON))


class ItineraryItem(ItineraryItemBase, table=True):
    __tablename__ = "itinerary_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    status: ItemStatus = Field(default=ItemStatus.SUGGESTED)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ItineraryItemCreate(ItineraryItemBase):
    pass


class ItineraryItemRead(ItineraryItemBase):
    id: int
    status: ItemStatus
    created_at: datetime
    updated_at: datetime


class ItineraryItemUpdate(SQLModel):
    day_number: Optional[int] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    type: Optional[ItemType] = None
    activity_details: Optional[dict] = None
    status: Optional[ItemStatus] = None
