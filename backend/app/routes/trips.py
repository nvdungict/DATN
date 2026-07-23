from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from pydantic import BaseModel

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.trip import TripCreate, TripRead, TripUpdate, TripCollaborator, TripCollaboratorRead
from app.models.itinerary import ItineraryItemRead, ItineraryItemCreate, ItemType, ItemStatus
from app.models.notification import Notification
from app.services.trip_service import TripService
from app.services.weather_service import WeatherAPIClient
from app.agents.graph import run_agent

router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("", response_model=List[TripRead])
async def list_trips(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    svc = TripService(session)
    return await svc.get_trips(current_user.id)


@router.get("/{trip_id}", response_model=TripRead)
async def get_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    svc = TripService(session)
    trip = await svc.get_trip(trip_id, current_user.id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


@router.patch("/{trip_id}", response_model=TripRead)
async def update_trip(
    trip_id: int,
    body: TripUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    svc = TripService(session)
    trip = await svc.get_trip(trip_id, current_user.id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    if trip.user_role == "VIEWER":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Viewers cannot update trip details")
    
    return await svc.update_trip(trip, body)


@router.get("/{trip_id}/itinerary", response_model=List[ItineraryItemRead])
async def get_itinerary(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    svc = TripService(session)
    trip = await svc.get_trip(trip_id, current_user.id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return await svc.get_itinerary(trip_id)


@router.get("/{trip_id}/weather")
async def get_trip_weather(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    svc = TripService(session)
    trip = await svc.get_trip(trip_id, current_user.id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    itinerary_items = await svc.get_itinerary(trip_id)
    weather = WeatherAPIClient()
    return await weather.get_trip_weather(trip, itinerary_items)


@router.patch("/{trip_id}/itinerary")
async def update_itinerary(
    trip_id: int,
    body: dict,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    svc = TripService(session)
    trip = await svc.get_trip(trip_id, current_user.id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    if trip.user_role == "VIEWER":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Viewers cannot update itinerary")

    items = body.get("items", [])
    updated = await svc.update_itinerary_items(trip_id, items)
    
    # Broadcast to websocket (We will implement this in the socket manager)
    from app.core.socket_manager import manager
    await manager.broadcast_to_trip(trip_id, {"type": "REFRESH_ITINERARY"})
    
    return {"updated": len(updated), "items": [i.model_dump(mode="json") for i in updated]}


@router.post("/generate")
async def generate_trip(
    body: dict,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """AI entry point: generate or modify a trip from natural language."""
    message = body.get("message", "")
    trip_id = body.get("trip_id")

    if trip_id:
        svc = TripService(session)
        trip = await svc.get_trip(trip_id, current_user.id)
        if trip and trip.user_role == "VIEWER":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Viewers cannot use AI chat")

    result = await run_agent(
        user_message=message,
        user_id=current_user.id,
        trip_id=trip_id,
        session=session,
    )
    
    if trip_id:
        from app.core.socket_manager import manager
        await manager.broadcast_to_trip(trip_id, {"type": "REFRESH_ITINERARY"})
        
    return result


@router.get("/{trip_id}/items/{item_id}/alternatives")
async def get_item_alternatives(
    trip_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    from app.services.trip_service import TripService
    from app.services.travelport_service import TravelportClient
    from app.services.booking_com_service import BookingComClient
    from app.models.itinerary import ItineraryItem, ItemType
    from datetime import date, timedelta
    
    svc = TripService(session)
    trip = await svc.get_trip(trip_id, current_user.id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
        
    query = select(ItineraryItem).where(
        ItineraryItem.id == item_id,
        ItineraryItem.trip_id == trip_id
    )
    result = await session.execute(query)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        
    details = item.activity_details or {}
    
    if item.type == ItemType.TRANSPORT and ("flight" in details.get("deep_link", "").lower() or "vj" in details.get("id", "").lower() or "flight" in details.get("name", "").lower() or "travelport" in details.get("deep_link", "").lower() or "viet" in details.get("airline", "").lower()):
        origin = details.get("departure_airport") or "HAN"
        destination = details.get("arrival_airport") or ("DAD" if "Đà Nẵng" in trip.destination else "SGN")
        
        try:
            target_date = (date.fromisoformat(trip.start_date) + timedelta(days=item.day_number - 1)).isoformat()
        except:
            target_date = str(date.today() + timedelta(days=7))
            
        passengers = int(details.get("passengers") or 1)
        booking_com = BookingComClient()
        flights = await booking_com.search_flights(origin, destination, target_date, passengers)
        if not flights:
            travelport = TravelportClient()
            flights = await travelport.search_flights(origin, destination, target_date, 1)
        return {"type": "FLIGHT", "options": flights}
        
    elif item.type == ItemType.LODGING:
        location = trip.destination
        try:
            checkin = str(date.fromisoformat(trip.start_date))
            checkout = str(date.fromisoformat(trip.end_date))
        except:
            checkin = str(date.today() + timedelta(days=7))
            checkout = str(date.today() + timedelta(days=10))
            
        booking_com = BookingComClient()
        hotels = await booking_com.search_hotels(location, checkin, checkout, 1)
        if not hotels:
            travelport = TravelportClient()
            hotels = await travelport.search_hotels(location, checkin, checkout, 1)
        return {"type": "HOTEL", "options": hotels}
        
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only find alternatives for Flights and Hotels")


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    svc = TripService(session)
    trip = await svc.get_trip(trip_id, current_user.id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    if trip.user_role != "OWNER":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can delete the trip")
    await svc.delete_trip(trip)


@router.post("/clone", response_model=TripRead)
async def clone_premade_tour(
    tour_data: dict,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Clone a pre-made tour into a new trip for the user."""
    svc = TripService(session)
    duration_days = tour_data.get("duration_days", 1)
    start_date = datetime.utcnow().date() + timedelta(days=1)
    end_date = start_date + timedelta(days=duration_days - 1)
    
    trip_create = TripCreate(
        title=tour_data.get("title", "New Trip"),
        destination=tour_data.get("destination", "Unknown"),
        start_date=start_date,
        end_date=end_date,
        currency="VND",
        total_budget=0.0
    )
    new_trip = await svc.create_trip(trip_create, current_user.id)
    
    itinerary_list = tour_data.get("itinerary", [])
    if itinerary_list:
        items_to_create = []
        for idx, item in enumerate(itinerary_list):
            try:
                st = datetime.strptime(item.get("start_time", "08:00:00"), "%H:%M:%S").time()
                et = datetime.strptime(item.get("end_time", "09:00:00"), "%H:%M:%S").time()
            except:
                st, et = None, None
                
            items_to_create.append(ItineraryItemCreate(
                trip_id=new_trip.id,
                day_number=item.get("day_number", 1),
                start_time=st,
                end_time=et,
                type=ItemType.ATTRACTION,
                activity_details={
                    "name": item.get("activity", "Unknown Activity"),
                    "address": item.get("location", ""),
                    "estimated_cost": item.get("cost_estimate", 0),
                    "note": item.get("notes", "")
                }
            ))
        await svc.create_itinerary_items(items_to_create)
    return new_trip


# ─── COLLABORATORS & INVITES ───────────────────────────────────────────────────

class InviteRequest(BaseModel):
    email: str
    role: str = "VIEWER"

@router.post("/{trip_id}/collaborators")
async def invite_collaborator(
    trip_id: int,
    body: InviteRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    svc = TripService(session)
    trip = await svc.get_trip(trip_id, current_user.id)
    if not trip or trip.user_role != "OWNER":
        raise HTTPException(status_code=403, detail="Only owners can invite")
    
    # Find user by email
    res = await session.execute(select(User).where(User.email == body.email))
    friend = res.scalar_one_or_none()
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
        
    if friend.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")
        
    # Check if already invited
    res_collab = await session.execute(select(TripCollaborator).where(
        TripCollaborator.trip_id == trip_id, TripCollaborator.user_id == friend.id
    ))
    if res_collab.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User already invited")
        
    # Create Collab
    collab = TripCollaborator(trip_id=trip_id, user_id=friend.id, role=body.role, status="PENDING")
    session.add(collab)
    
    # Create Notification
    notif = Notification(
        user_id=friend.id,
        title=f"Trip Invitation",
        content=f"{current_user.email} invited you to collaborate on {trip.title}",
        type="TRIP_INVITE",
        related_id=trip_id
    )
    session.add(notif)
    await session.commit()
    
    return {"message": "Invite sent successfully"}

@router.get("/{trip_id}/collaborators")
async def get_collaborators(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    svc = TripService(session)
    trip = await svc.get_trip(trip_id, current_user.id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # Get all collabs and their emails
    # Since we need the email, we join User
    result = await session.execute(
        select(TripCollaborator, User.email)
        .join(User, User.id == TripCollaborator.user_id)
        .where(TripCollaborator.trip_id == trip_id)
    )
    
    collabs = []
    for c, email in result.all():
        collabs.append({
            "id": c.id,
            "user_id": c.user_id,
            "email": email,
            "role": c.role,
            "status": c.status
        })
    return collabs

@router.delete("/{trip_id}/collaborators/{user_id}")
async def remove_collaborator(
    trip_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    svc = TripService(session)
    trip = await svc.get_trip(trip_id, current_user.id)
    if not trip or trip.user_role != "OWNER":
        raise HTTPException(status_code=403, detail="Only owners can remove collaborators")
        
    res = await session.execute(select(TripCollaborator).where(
        TripCollaborator.trip_id == trip_id, TripCollaborator.user_id == user_id
    ))
    collab = res.scalar_one_or_none()
    if collab:
        await session.delete(collab)
        await session.commit()
    return {"message": "Collaborator removed"}

class RespondRequest(BaseModel):
    action: str # "ACCEPT" or "REJECT"

@router.post("/{trip_id}/invites/respond")
async def respond_to_invite(
    trip_id: int,
    body: RespondRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    res = await session.execute(select(TripCollaborator).where(
        TripCollaborator.trip_id == trip_id, TripCollaborator.user_id == current_user.id
    ))
    collab = res.scalar_one_or_none()
    if not collab:
        raise HTTPException(status_code=404, detail="Invite not found")
        
    if body.action == "ACCEPT":
        collab.status = "ACCEPTED"
        session.add(collab)
    else:
        await session.delete(collab)
        
    # Mark notification as read
    res_notif = await session.execute(select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.related_id == trip_id,
        Notification.type == "TRIP_INVITE"
    ))
    for n in res_notif.scalars().all():
        n.is_read = True
        session.add(n)
        
    await session.commit()
    return {"message": "Invite responded"}
