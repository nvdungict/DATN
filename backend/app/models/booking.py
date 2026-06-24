from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column, JSON

class Booking(SQLModel, table=True):
    __tablename__ = "bookings"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    trip_id: int = Field(foreign_key="trips.id", index=True)
    itinerary_item_id: Optional[int] = Field(default=None, foreign_key="itinerary_items.id", index=True, nullable=True)
    type: str  # "FLIGHT" or "HOTEL"
    pnr: Optional[str] = None  # Travelport PNR code / booking reference
    status: str = Field(default="CONFIRMED")  # PENDING, CONFIRMED, CANCELLED
    details: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BookingCreate(SQLModel):
    trip_id: int
    itinerary_item_id: Optional[int] = None
    type: str
    pnr: Optional[str] = None
    details: dict = {}

class BookingRead(SQLModel):
    id: int
    user_id: int
    trip_id: int
    itinerary_item_id: Optional[int]
    type: str
    pnr: Optional[str]
    status: str
    details: dict
    created_at: datetime
