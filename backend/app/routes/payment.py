from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
import uuid

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.trip import Trip, TripStatus
from app.models.itinerary import ItineraryItem, ItemStatus
from app.services.vnpay_service import VNPayService

router = APIRouter(prefix="/payments", tags=["payments"])
vnpay_service = VNPayService()

class CreatePaymentRequest(object):
    from pydantic import BaseModel
    class Model(BaseModel):
        trip_id: int

@router.post("/create-url")
async def create_payment_url(
    req: CreatePaymentRequest.Model,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Generate VNPay URL for the given trip.
    It calculates the total cost of all CONFIRMED itinerary items.
    """
    # Fetch Trip
    trip = await session.get(Trip, req.trip_id)
    if not trip or trip.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Fetch all confirmed items
    query = select(ItineraryItem).where(
        ItineraryItem.trip_id == req.trip_id,
        ItineraryItem.status == ItemStatus.CONFIRMED
    )
    result = await session.execute(query)
    confirmed_items = result.scalars().all()

    if not confirmed_items:
        raise HTTPException(status_code=400, detail="No confirmed items to pay for.")

    # Calculate total in original currency
    total_cost_original = 0.0
    for item in confirmed_items:
        if item.activity_details and item.activity_details.get("estimated_cost"):
            total_cost_original += item.activity_details["estimated_cost"]

    # Simple exchange rate mock for VNPay (requires VND)
    exchange_rate = 25000 if trip.currency == "USD" else (3000 if trip.currency == "HKD" else 1)
    total_cost_vnd = int(total_cost_original * exchange_rate)

    if total_cost_vnd <= 0:
        raise HTTPException(status_code=400, detail="Total cost is zero.")

    # Get client IP for VNPay
    ip_addr = request.client.host if request.client else "127.0.0.1"
    
    # Generate a unique order ref
    order_ref = f"TRIP_{trip.id}_{uuid.uuid4().hex[:6].upper()}"

    payment_url = vnpay_service.generate_payment_url(
        order_id=order_ref,
        amount_vnd=total_cost_vnd,
        order_desc=f"Thanh toan cho chuyen di {trip.title}",
        ip_address=ip_addr
    )

    if not payment_url:
        debug_info = f"tmn: '{vnpay_service.tmn_code}', secret: '{vnpay_service.hash_secret}'"
        raise HTTPException(status_code=500, detail=f"Failed to generate payment URL. Debug: {debug_info}")

    return {"url": payment_url, "amount_vnd": total_cost_vnd}

@router.get("/vnpay-return")
async def vnpay_return(
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """
    Handle VNPay redirect return.
    """
    params = dict(request.query_params)
    
    # Verify Signature
    is_valid = vnpay_service.verify_payment(params)
    if not is_valid:
        # Invalid signature, might be tampered
        return RedirectResponse(url="http://localhost:3000?payment=failed_signature")

    response_code = params.get("vnp_ResponseCode")
    order_info = params.get("vnp_OrderInfo", "")
    txn_ref = params.get("vnp_TxnRef", "")

    # Extract Trip ID from order_ref (TRIP_123_XYZ)
    try:
        parts = txn_ref.split("_")
        trip_id = int(parts[1])
    except:
        return RedirectResponse(url="http://localhost:3000?payment=failed_parse")

    if response_code == "00":
        # Success! Update Trip status
        trip = await session.get(Trip, trip_id)
        if trip:
            trip.status = TripStatus.ACTIVE
            session.add(trip)
            await session.commit()
            return RedirectResponse(url=f"http://localhost:3000/trips/{trip_id}?payment=success")
    
    # Failed payment
    return RedirectResponse(url=f"http://localhost:3000/trips/{trip_id}?payment=failed")
