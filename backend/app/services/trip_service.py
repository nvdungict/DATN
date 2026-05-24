from typing import Optional
from datetime import datetime
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.trip import Trip, TripCreate, TripUpdate
from app.models.itinerary import ItineraryItem, ItineraryItemCreate


class TripService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_trips(self, user_id: int) -> list[Trip]:
        result = await self.session.execute(
            select(Trip).where(Trip.user_id == user_id).order_by(Trip.created_at.desc())
        )
        return result.scalars().all()

    async def get_trip(self, trip_id: int, user_id: int) -> Optional[Trip]:
        result = await self.session.execute(
            select(Trip).where(Trip.id == trip_id, Trip.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_trip(self, trip_data: TripCreate, user_id: int) -> Trip:
        trip = Trip(**trip_data.model_dump(), user_id=user_id)
        self.session.add(trip)
        await self.session.commit()
        await self.session.refresh(trip)
        return trip

    async def update_trip(self, trip: Trip, update_data: TripUpdate) -> Trip:
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(trip, key, value)
        trip.updated_at = datetime.utcnow()
        self.session.add(trip)
        await self.session.commit()
        await self.session.refresh(trip)
        return trip

    async def delete_trip(self, trip: Trip) -> None:
        """Cascade-delete trip: remove child rows first to avoid FK violation."""
        from app.models.memory import MemoryStream
        from sqlalchemy import delete

        # 1. Xoá itinerary items thuộc trip này
        await self.session.execute(
            delete(ItineraryItem).where(ItineraryItem.trip_id == trip.id)
        )
        # 2. Xoá memory streams liên quan đến trip này
        await self.session.execute(
            delete(MemoryStream).where(MemoryStream.trip_id == trip.id)
        )
        # 3. Xoá trip
        await self.session.delete(trip)
        await self.session.commit()

    async def get_itinerary(self, trip_id: int) -> list[ItineraryItem]:
        result = await self.session.execute(
            select(ItineraryItem)
            .where(ItineraryItem.trip_id == trip_id)
            .order_by(ItineraryItem.day_number, ItineraryItem.start_time)
        )
        return result.scalars().all()

    async def create_itinerary_items(
        self, items: list[ItineraryItemCreate]
    ) -> list[ItineraryItem]:
        db_items = [ItineraryItem(**item.model_dump()) for item in items]
        for item in db_items:
            self.session.add(item)
        await self.session.commit()
        for item in db_items:
            await self.session.refresh(item)
        return db_items

    async def update_itinerary_items(
        self, trip_id: int, items_data: list[dict]
    ) -> list[ItineraryItem]:
        """Replace all itinerary items for a trip with new data."""
        # Delete existing
        existing = await self.get_itinerary(trip_id)
        for item in existing:
            await self.session.delete(item)

        # Create new
        new_items = []
        for item_dict in items_data:
            item_dict["trip_id"] = trip_id
            item = ItineraryItem(**item_dict)
            self.session.add(item)
            new_items.append(item)

        await self.session.commit()
        for item in new_items:
            await self.session.refresh(item)
        return new_items
