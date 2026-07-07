import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from app.models.itinerary import ItineraryItem
from sqlmodel import select

async def debug():
    async with AsyncSessionLocal() as session:
        query = select(ItineraryItem).where(ItineraryItem.trip_id == 12)
        result = await session.execute(query)
        rows = result.scalars().all()
        for item in rows:
            details = item.activity_details or {}
            print(f"{item.type.value} | {details.get('name')} | lat={details.get('lat')}, lng={details.get('lng')}")

if __name__ == "__main__":
    asyncio.run(debug())
