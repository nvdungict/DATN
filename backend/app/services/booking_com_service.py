import logging
from datetime import datetime
import httpx
from app.core.config import get_settings
import random
import string

logger = logging.getLogger(__name__)

class BookingComClient:
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.RAPIDAPI_KEY
        self.host = self.settings.RAPIDAPI_HOST
        self.base_url = f"https://{self.host}/api/v1"

    def _get_headers(self):
        return {
            "x-rapidapi-host": self.host,
            "x-rapidapi-key": self.api_key,
            "Content-Type": "application/json"
        }

    async def get_destination_id(self, query: str) -> str:
        """Search for a destination and return its dest_id."""
        if not self.api_key:
            logger.warning("RapidAPI key not set, skipping booking.com geocoding.")
            return None

        endpoint = f"{self.base_url}/hotels/searchDestination"
        params = {"query": query}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(endpoint, headers=self._get_headers(), params=params, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("data", [])
                    if results:
                        # Usually the first result is the best match
                        return results[0].get("dest_id")
                else:
                    logger.error(f"RapidAPI geocode failed: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"RapidAPI geocode exception: {e}")
        return None

    async def search_hotels(self, location: str, checkin_date: str, checkout_date: str, guests_count: int = 1) -> list:
        """Search for live hotels on Booking.com."""
        dest_id = await self.get_destination_id(location)
        
        if not dest_id:
            logger.warning(f"Could not find dest_id for {location}. Returning fallback empty list.")
            return []

        endpoint = f"{self.base_url}/hotels/searchHotels"
        params = {
            "dest_id": dest_id,
            "search_type": "city",
            "arrival_date": checkin_date,
            "departure_date": checkout_date,
            "adults": guests_count
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(endpoint, headers=self._get_headers(), params=params, timeout=20)
                if response.status_code == 200:
                    data = response.json()
                    hotels_data = data.get("data", [])
                    
                    # Some RapidAPI endpoints return nested properties, some return flat. 
                    # Usually it's in a list under data.
                    # Looking at the curl output, each item has 'property'
                    parsed_hotels = []
                    for item in hotels_data:
                        prop = item.get("property", {})
                        if not prop:
                            prop = item # fallback if structure is flat
                        
                        hotel_id = item.get("hotel_id") or prop.get("id")
                        if not hotel_id:
                            continue
                            
                        # Extract photo
                        photo_urls = prop.get("photoUrls", [])
                        image_url = photo_urls[0] if photo_urls else "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400"
                        
                        # Extract price
                        price_breakdown = prop.get("priceBreakdown", {})
                        gross_price = price_breakdown.get("grossPrice", {})
                        price_val = gross_price.get("value", 100.0)
                        
                        parsed_hotels.append({
                            "id": f"rapidapi_hotel_{hotel_id}",
                            "name": prop.get("name", "Unknown Hotel"),
                            "address": location, # booking.com search returns coords, address needs detail api
                            "stars": prop.get("accuratePropertyClass", 3) or 3,
                            "rating": prop.get("reviewScore", 8.0) or 8.0,
                            "price_per_night": round(price_val, 2),
                            "total_price": round(price_val, 2),
                            "currency": "USD", # Booking.com API usually returns USD in this endpoint
                            "amenities": ["WiFi", "Air Conditioning"],
                            "image_url": image_url,
                            "deep_link": f"https://www.booking.com/hotel/vn/{hotel_id}.html"
                        })
                        
                    return parsed_hotels
                else:
                    logger.error(f"RapidAPI search failed: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"RapidAPI search exception: {e}")
            
        return []

    async def create_booking(self, type_str: str, offer_id: str, details: dict) -> dict:
        """
        Mock booking creation for Booking.com.
        Generates a realistic BKG-XXXXX confirmation number.
        """
        conf_number = "".join(random.choices(string.digits, k=8))
        pin = "".join(random.choices(string.digits, k=4))
        pnr = f"BKG-{conf_number}"
        
        logger.info(f"Booking.com reservation completed. Created PNR: {pnr}")
        return {
            "pnr": pnr,
            "status": "CONFIRMED",
            "booking_reference": pnr,
            "pin": pin,
            "created_at": datetime.utcnow().isoformat(),
            "details": details
        }
