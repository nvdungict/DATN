import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import json

engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:5432/travel_ai")

async def main():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id, type, activity_details FROM itinerary_item WHERE trip_id = 13"))
        for row in result:
            print(row[0], row[1], json.dumps(row[2]))

asyncio.run(main())
