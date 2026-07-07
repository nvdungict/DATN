from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from pydantic import BaseModel

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.itinerary import ItineraryItem, ItemStatus
from sqlmodel import select
from datetime import datetime

router = APIRouter(prefix="/itinerary", tags=["itinerary"])


class BulkConfirmRequest(BaseModel):
    item_ids: list[int]


async def _get_item_for_user(
    item_id: int, user_id: int, session: AsyncSession
) -> ItineraryItem:
    from app.services.trip_service import TripService

    item = await session.get(ItineraryItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary item not found")

    trip = await TripService(session).get_trip(item.trip_id, user_id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary item not found")
    if trip.user_role == "VIEWER":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Viewers cannot update itinerary items")

    return item


@router.post("/{item_id}/confirm")
async def confirm_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    item = await _get_item_for_user(item_id, current_user.id, session)
    item.status = ItemStatus.CONFIRMED
    item.updated_at = datetime.utcnow()
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


@router.post("/bulk-confirm")
async def bulk_confirm_items(
    body: BulkConfirmRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not body.item_ids:
        return {"updated": 0, "items": []}

    result = await session.execute(
        select(ItineraryItem).where(ItineraryItem.id.in_(body.item_ids))
    )
    items = result.scalars().all()

    found_ids = {item.id for item in items}
    missing_ids = set(body.item_ids) - found_ids
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Itinerary items not found: {sorted(missing_ids)}",
        )

    from app.services.trip_service import TripService

    svc = TripService(session)
    trip_ids = {item.trip_id for item in items}
    for trip_id in trip_ids:
        trip = await svc.get_trip(trip_id, current_user.id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Itinerary items not found",
            )
        if trip.user_role == "VIEWER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Viewers cannot update itinerary items",
            )

    now = datetime.utcnow()
    updated = []
    for item in items:
        if item.status == ItemStatus.SUGGESTED:
            item.status = ItemStatus.CONFIRMED
            item.updated_at = now
            session.add(item)
            updated.append(item)

    await session.commit()
    for item in updated:
        await session.refresh(item)

    return {"updated": len(updated), "items": items}


@router.post("/{item_id}/complete")
async def complete_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    item = await _get_item_for_user(item_id, current_user.id, session)
    item.status = ItemStatus.COMPLETED
    item.updated_at = datetime.utcnow()
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item
