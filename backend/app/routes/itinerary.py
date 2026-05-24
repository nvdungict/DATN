from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.itinerary import ItineraryItem, ItemStatus
from sqlmodel import select
from datetime import datetime

router = APIRouter(prefix="/itinerary", tags=["itinerary"])


async def _get_item_for_user(
    item_id: int, user_id: int, session: AsyncSession
) -> ItineraryItem:
    from app.models.trip import Trip

    result = await session.execute(
        select(ItineraryItem)
        .join(Trip, Trip.id == ItineraryItem.trip_id)
        .where(ItineraryItem.id == item_id, Trip.user_id == user_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary item not found")
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
