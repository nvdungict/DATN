from typing import Optional
from datetime import datetime
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.trip import Trip, TripCreate, TripUpdate, TripRead
from app.models.itinerary import ItineraryItem, ItineraryItemCreate


class TripService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_trips(self, user_id: int) -> list[TripRead]:
        # Get owned trips
        owned_result = await self.session.execute(
            select(Trip).where(Trip.user_id == user_id).order_by(Trip.created_at.desc())
        )
        owned_trips = owned_result.scalars().all()
        
        all_trips = []
        for t in owned_trips:
            t_read = TripRead.model_validate(t)
            t_read.user_role = "OWNER"
            all_trips.append(t_read)

        # Get collabs
        from app.models.trip import TripCollaborator
        collab_result = await self.session.execute(
            select(Trip, TripCollaborator).join(TripCollaborator, Trip.id == TripCollaborator.trip_id)
            .where(TripCollaborator.user_id == user_id, TripCollaborator.status == "ACCEPTED")
            .order_by(Trip.created_at.desc())
        )
        for t, c in collab_result.all():
            t_read = TripRead.model_validate(t)
            t_read.user_role = c.role
            all_trips.append(t_read)

        all_trips.sort(key=lambda x: x.created_at, reverse=True)
        return all_trips

    async def get_trip(self, trip_id: int, user_id: int) -> Optional[TripRead]:
        # Check owner
        result = await self.session.execute(
            select(Trip).where(Trip.id == trip_id, Trip.user_id == user_id)
        )
        trip = result.scalar_one_or_none()
        if trip:
            t_read = TripRead.model_validate(trip)
            t_read.user_role = "OWNER"
            return t_read
        
        # Check collaborator
        from app.models.trip import TripCollaborator
        result = await self.session.execute(
            select(Trip, TripCollaborator).join(TripCollaborator, Trip.id == TripCollaborator.trip_id)
            .where(Trip.id == trip_id, TripCollaborator.user_id == user_id, TripCollaborator.status == "ACCEPTED")
        )
        row = result.first()
        if row:
            trip, collab = row
            t_read = TripRead.model_validate(trip)
            t_read.user_role = collab.role
            return t_read
        return None

    async def create_trip(self, trip_data: TripCreate, user_id: int) -> Trip:
        trip = Trip(**trip_data.model_dump(), user_id=user_id)
        self.session.add(trip)
        await self.session.commit()
        await self.session.refresh(trip)
        return trip

    async def update_trip(self, trip: TripRead, update_data: TripUpdate) -> TripRead:
        update_dict = update_data.model_dump(exclude_unset=True)
        # We need to fetch the actual Trip from DB to update it
        db_trip = await self.session.get(Trip, trip.id)
        if not db_trip:
            raise ValueError("Trip not found")
        for key, value in update_dict.items():
            setattr(db_trip, key, value)
        db_trip.updated_at = datetime.utcnow()
        self.session.add(db_trip)
        await self.session.commit()
        await self.session.refresh(db_trip)
        
        t_read = TripRead.model_validate(db_trip)
        t_read.user_role = trip.user_role
        return t_read

    async def delete_trip(self, trip: TripRead) -> None:
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
        # 3. Xóa collaborators
        from app.models.trip import TripCollaborator
        await self.session.execute(
            delete(TripCollaborator).where(TripCollaborator.trip_id == trip.id)
        )
        # 4. Xoá trip
        db_trip = await self.session.get(Trip, trip.id)
        if db_trip:
            await self.session.delete(db_trip)
        await self.session.commit()

    async def get_itinerary(self, trip_id: int) -> list[ItineraryItem]:
        result = await self.session.execute(
            select(ItineraryItem)
            .where(ItineraryItem.trip_id == trip_id)
            .order_by(ItineraryItem.day_number, ItineraryItem.start_time)
        )
        items = result.scalars().all()
        return sorted(
            items,
            key=lambda item: (
                item.day_number,
                (item.activity_details or {}).get("_sort_order", 9999),
                item.start_time or datetime.min.time(),
                item.id or 0,
            ),
        )

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
        """Update existing itinerary items or create new ones, deleting missing ones."""
        existing = {item.id: item for item in await self.get_itinerary(trip_id)}
        new_items = []
        
        for item_dict in items_data:
            item_dict["trip_id"] = trip_id
            item_id = item_dict.get("id")
            
            # Convert string times to datetime.time to avoid asyncpg DataError
            for time_field in ["start_time", "end_time"]:
                val = item_dict.get(time_field)
                if isinstance(val, str):
                    try:
                        fmt = "%H:%M:%S" if val.count(":") == 2 else "%H:%M"
                        item_dict[time_field] = datetime.strptime(val, fmt).time()
                    except ValueError:
                        item_dict.pop(time_field, None)
            
            # Remove string timestamps so DB auto-handles them
            item_dict.pop("created_at", None)
            item_dict.pop("updated_at", None)
            
            if item_id and item_id in existing:
                item = existing[item_id]
                for k, v in item_dict.items():
                    if hasattr(item, k) and k not in ("id", "created_at", "updated_at"):
                        setattr(item, k, v)
                new_items.append(item)
                del existing[item_id]
            else:
                item_dict.pop("id", None)
                item = ItineraryItem(**item_dict)
                self.session.add(item)
                new_items.append(item)
                
        # Delete items that were removed
        for item in existing.values():
            await self.session.delete(item)

        await self.session.commit()
        for item in new_items:
            await self.session.refresh(item)
        return new_items
