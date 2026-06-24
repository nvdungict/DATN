import logging
from datetime import date, datetime, timedelta
from sqlmodel import select
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.database import AsyncSessionLocal
from app.models.trip import Trip, TripStatus
from app.models.user import User
from app.models.notification import Notification
from app.models.itinerary import ItineraryItem, ItemStatus, ItemType
from app.services.email_service import (
    send_trip_reminder_email,
    send_activity_reminder_email,
    send_booking_reminder_email
)

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def check_trip_reminders():
    logger.info("Running job: check_trip_reminders")
    tomorrow = date.today() + timedelta(days=1)
    
    async with AsyncSessionLocal() as session:
        query = select(Trip, User).join(User, Trip.user_id == User.id).where(Trip.start_date == tomorrow)
        result = await session.execute(query)
        rows = result.all()
        
        for trip, user in rows:
            # Duplicate check
            exist_query = select(Notification).where(
                Notification.type == "TRIP_REMINDER",
                Notification.related_id == trip.id
            )
            exist_result = await session.execute(exist_query)
            if exist_result.first():
                logger.info(f"Trip reminder already sent for trip {trip.id}. Skipping.")
                continue
            
            # Create in-app notification
            notif = Notification(
                user_id=trip.user_id,
                title="🎒 Chuyến đi sắp bắt đầu ngày mai!",
                content=f"Chuyến đi đến {trip.destination} của bạn sẽ bắt đầu vào ngày mai ({trip.start_date.strftime('%d/%m/%Y')}). Hãy chuẩn bị sẵn sàng!",
                type="TRIP_REMINDER",
                related_id=trip.id
            )
            session.add(notif)
            await session.commit()
            
            # Send email reminder
            await send_trip_reminder_email(user.email, trip)

async def check_activity_reminders():
    logger.info("Running job: check_activity_reminders")
    now = datetime.now()
    
    async with AsyncSessionLocal() as session:
        # Get active or planned trips
        query = select(Trip, User).join(User, Trip.user_id == User.id).where(Trip.status != TripStatus.COMPLETED)
        result = await session.execute(query)
        rows = result.all()
        
        for trip, user in rows:
            # Get confirmed itinerary items
            itinerary_query = select(ItineraryItem).where(
                ItineraryItem.trip_id == trip.id,
                ItineraryItem.status == ItemStatus.CONFIRMED
            )
            itinerary_result = await session.execute(itinerary_query)
            items = itinerary_result.scalars().all()
            
            for item in items:
                if not item.start_time:
                    continue
                
                # Calculate activity datetime
                item_date = trip.start_date + timedelta(days=item.day_number - 1)
                item_datetime = datetime.combine(item_date, item.start_time)
                
                # Check if it starts in the next 3 hours
                time_diff = item_datetime - now
                if timedelta(seconds=0) <= time_diff <= timedelta(hours=3):
                    details = item.activity_details or {}
                    name = details.get("name", "Hoạt động")
                    
                    # Duplicate check
                    exist_query = select(Notification).where(
                        Notification.type == "ACTIVITY_REMINDER",
                        Notification.related_id == trip.id,
                        Notification.content.like(f"%'{name}'%")
                    )
                    exist_result = await session.execute(exist_query)
                    if exist_result.first():
                        continue
                    
                    # Create in-app notification
                    notif = Notification(
                        user_id=trip.user_id,
                        title="⏰ Sắp đến giờ hoạt động!",
                        content=f"Hoạt động '{name}' của bạn sẽ bắt đầu lúc {item.start_time.strftime('%H:%M')} hôm nay.",
                        type="ACTIVITY_REMINDER",
                        related_id=trip.id
                    )
                    session.add(notif)
                    await session.commit()
                    
                    # Send email reminder
                    await send_activity_reminder_email(user.email, trip, item)

async def check_booking_reminders():
    logger.info("Running job: check_booking_reminders")
    three_days_later = date.today() + timedelta(days=3)
    
    async with AsyncSessionLocal() as session:
        query = select(Trip, User).join(User, Trip.user_id == User.id).where(Trip.start_date == three_days_later)
        result = await session.execute(query)
        rows = result.all()
        
        for trip, user in rows:
            # Check for unbooked transport/lodging items
            itinerary_query = select(ItineraryItem).where(
                ItineraryItem.trip_id == trip.id,
                ItineraryItem.status == ItemStatus.SUGGESTED,
                (ItineraryItem.type == ItemType.TRANSPORT) | (ItineraryItem.type == ItemType.LODGING)
            )
            itinerary_result = await session.execute(itinerary_query)
            unbooked_items = itinerary_result.scalars().all()
            
            if not unbooked_items:
                continue
                
            # Duplicate check
            exist_query = select(Notification).where(
                Notification.type == "BOOKING_REMINDER",
                Notification.related_id == trip.id
            )
            exist_result = await session.execute(exist_query)
            if exist_result.first():
                logger.info(f"Booking reminder already sent for trip {trip.id}. Skipping.")
                continue
                
            # Create in-app notification
            notif = Notification(
                user_id=trip.user_id,
                title="✈️ Đừng quên đặt vé và phòng!",
                content=f"Chuyến đi đến {trip.destination} còn 3 ngày nữa sẽ bắt đầu. Bạn có các hoạt động di chuyển/lưu trú gợi ý chưa đặt chỗ.",
                type="BOOKING_REMINDER",
                related_id=trip.id
            )
            session.add(notif)
            await session.commit()
            
            # Send email reminder
            await send_booking_reminder_email(user.email, trip, unbooked_items)

def start_scheduler():
    if not scheduler.running:
        # Check reminders every hour
        scheduler.add_job(
            check_trip_reminders,
            trigger="interval",
            hours=1,
            id="check_trip_reminders",
            replace_existing=True
        )
        scheduler.add_job(
            check_activity_reminders,
            trigger="interval",
            hours=1,
            id="check_activity_reminders",
            replace_existing=True
        )
        # Check booking reminders daily at 8:00 AM
        scheduler.add_job(
            check_booking_reminders,
            trigger=CronTrigger(hour=8, minute=0),
            id="check_booking_reminders",
            replace_existing=True
        )
        scheduler.start()
        logger.info("Background scheduler started successfully.")
