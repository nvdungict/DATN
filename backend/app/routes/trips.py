from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.trip import TripCreate, TripRead, TripUpdate
from app.models.itinerary import ItineraryItemRead
from app.services.trip_service import TripService
from app.agents.graph import run_agent

router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("", response_model=list[TripRead])
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


@router.get("/{trip_id}/itinerary", response_model=list[ItineraryItemRead])
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


@router.post("/generate")
async def generate_trip(
    body: dict,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """AI entry point: generate or modify a trip from natural language."""
    message = body.get("message", "")
    trip_id = body.get("trip_id")

    result = await run_agent(
        user_message=message,
        user_id=current_user.id,
        trip_id=trip_id,
        session=session,
    )
    return result


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

    items = body.get("items", [])
    updated = await svc.update_itinerary_items(trip_id, items)
    return {"updated": len(updated), "items": [i.model_dump() for i in updated]}


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
    await svc.delete_trip(trip)
