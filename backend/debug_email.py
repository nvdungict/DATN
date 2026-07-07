import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from app.models.trip import Trip
from app.models.user import User
from app.services.email_service import send_trip_reminder_email
from sqlmodel import select

async def debug():
    async with AsyncSessionLocal() as session:
        query = select(Trip, User).join(User, Trip.user_id == User.id).where(Trip.id == 12)
        result = await session.execute(query)
        row = result.first()
        if row:
            trip, user = row
            print(f"Bắn email cưỡng chế cho chuyến đi {trip.title} tới {user.email}")
            await send_trip_reminder_email(user.email, trip)
            print("Đã gửi xong!")

if __name__ == "__main__":
    asyncio.run(debug())
