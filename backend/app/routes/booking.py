from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.booking import Booking, BookingRead
from app.models.itinerary import ItineraryItem, ItemStatus
from app.services.travelport_service import TravelportClient
from app.services.booking_com_service import BookingComClient

router = APIRouter(prefix="/bookings", tags=["bookings"])
travelport = TravelportClient()
booking_com = BookingComClient()

class FlightBookingRequest(object):
    # Pydantic standard validator helper
    from pydantic import BaseModel
    class Model(BaseModel):
        trip_id: int
        itinerary_item_id: Optional[int] = None
        flight_details: dict
        passenger_details: dict

class HotelBookingRequest(object):
    from pydantic import BaseModel
    class Model(BaseModel):
        trip_id: int
        itinerary_item_id: Optional[int] = None
        hotel_details: dict
        guest_details: dict

@router.get("", response_model=List[BookingRead])
async def list_bookings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Retrieve all bookings of the current user."""
    query = select(Booking).where(Booking.user_id == current_user.id).order_by(Booking.created_at.desc())
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/flight", response_model=BookingRead)
async def book_flight(
    req: FlightBookingRequest.Model,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Book a flight and generate a GDS PNR."""
    try:
        # Create booking via Travelport Client
        booking_data = await travelport.create_booking(
            type_str="FLIGHT",
            offer_id=req.flight_details.get("id", "unknown"),
            details={
                "flight": req.flight_details,
                "passenger": req.passenger_details
            }
        )
        
        # Save Booking in database
        db_booking = Booking(
            user_id=current_user.id,
            trip_id=req.trip_id,
            itinerary_item_id=req.itinerary_item_id,
            type="FLIGHT",
            pnr=booking_data.get("pnr"),
            status=booking_data.get("status"),
            details=booking_data.get("details"),
            created_at=datetime.utcnow()
        )
        session.add(db_booking)
        
        # Update itinerary item to CONFIRMED if present
        if req.itinerary_item_id:
            itinerary_query = select(ItineraryItem).where(
                ItineraryItem.id == req.itinerary_item_id,
                ItineraryItem.trip_id == req.trip_id
            )
            itinerary_result = await session.execute(itinerary_query)
            item = itinerary_result.scalar_one_or_none()
            if item:
                item.status = ItemStatus.CONFIRMED
                activity_details = item.activity_details or {}
                activity_details["pnr"] = db_booking.pnr
                activity_details["booking_id"] = db_booking.id
                item.activity_details = activity_details
                session.add(item)

        await session.commit()
        await session.refresh(db_booking)
        return db_booking
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Flight booking failed: {str(e)}"
        )

@router.post("/hotel", response_model=BookingRead)
async def book_hotel(
    req: HotelBookingRequest.Model,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Book a hotel room and generate a confirmation code via Booking.com."""
    try:
        booking_data = await booking_com.create_booking(
            type_str="HOTEL",
            offer_id=req.hotel_details.get("id", "unknown"),
            details={
                "hotel": req.hotel_details,
                "guest": req.guest_details
            }
        )
        
        db_booking = Booking(
            user_id=current_user.id,
            trip_id=req.trip_id,
            itinerary_item_id=req.itinerary_item_id,
            type="HOTEL",
            pnr=booking_data.get("pnr"),
            status=booking_data.get("status"),
            details=booking_data.get("details"),
            created_at=datetime.utcnow()
        )
        session.add(db_booking)
        
        if req.itinerary_item_id:
            itinerary_query = select(ItineraryItem).where(
                ItineraryItem.id == req.itinerary_item_id,
                ItineraryItem.trip_id == req.trip_id
            )
            itinerary_result = await session.execute(itinerary_query)
            item = itinerary_result.scalar_one_or_none()
            if item:
                item.status = ItemStatus.CONFIRMED
                activity_details = item.activity_details or {}
                activity_details["pnr"] = db_booking.pnr
                activity_details["booking_id"] = db_booking.id
                item.activity_details = activity_details
                session.add(item)

        await session.commit()
        await session.refresh(db_booking)
        return db_booking
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hotel booking failed: {str(e)}"
        )
