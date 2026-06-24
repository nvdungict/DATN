from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class Notification(SQLModel, table=True):
    __tablename__ = "notifications"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    title: str
    content: str
    type: str = Field(default="TRIP_INVITE") # e.g., TRIP_INVITE, TRIP_REMINDER, ACTIVITY_REMINDER, BOOKING_REMINDER
    related_id: Optional[int] = None # For TRIP_INVITE/TRIP_REMINDER/BOOKING_REMINDER is trip_id, for ACTIVITY_REMINDER is itinerary_item_id
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationRead(SQLModel):
    id: int
    title: str
    content: str
    type: str
    related_id: Optional[int]
    is_read: bool
    created_at: datetime
