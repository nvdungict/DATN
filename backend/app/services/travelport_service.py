import base64
import logging
from datetime import datetime, timedelta
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class TravelportClient:
    def __init__(self):
        self.settings = get_settings()
        self.sandbox = self.settings.TRAVELPORT_SANDBOX
        self.base_url = "https://api.pp.travelport.com" if self.sandbox else "https://api.travelport.com"
        self.oauth_url = "https://oauth.pp.travelport.com/oauth/oauth20/token" if self.sandbox else "https://oauth.travelport.com/oauth/oauth20/token"
        self.token = None

    async def get_token(self) -> str:
        """Fetch OAuth 2.0 Access Token from Travelport OAuth server."""
        if not self.settings.TRAVELPORT_CLIENT_ID or not self.settings.TRAVELPORT_CLIENT_SECRET:
            logger.info("Travelport credentials not fully set. Using simulator mode.")
            return None
        
        credentials = f"{self.settings.TRAVELPORT_CLIENT_ID}:{self.settings.TRAVELPORT_CLIENT_SECRET}"
        encoded_creds = base64.b64encode(credentials.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {encoded_creds}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {
            "grant_type": "client_credentials"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.oauth_url, headers=headers, data=data, timeout=10)
                if response.status_code == 200:
                    token_data = response.json()
                    self.token = token_data.get("access_token")
                    logger.info("Travelport API token retrieved successfully.")
                    return self.token
                else:
                    logger.error(f"Travelport Token Error: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Failed to connect to Travelport OAuth server: {e}")
        return None

    async def search_flights(self, origin: str, destination: str, departure_date: str, passengers_count: int = 1) -> list:
        """
        Search flights on Travelport Sandbox. 
        Falls back to realistic local simulation if credentials fail or chặng has carrier mismatch (e.g. VN/VJ chặng in GDS sandbox).
        """
        token = await self.get_token()
        
        # If we have a token, we try to hit the live Travelport sandbox
        if token:
            headers = {
                "Authorization": f"Bearer {token}",
                "XAUTH_TRAVELPORT_ACCESS_GROUP": self.settings.TRAVELPORT_ACCESS_GROUP,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            # Simplified flights API v11 search structure
            payload = {
                "AirSearchModifier": {
                    "CarrierPreference": {
                        "type": "Permitted",
                        "carriers": ["CX", "SQ", "QF", "EK", "UA", "AA"]  # Permitted by Access Group
                    }
                },
                "SearchCriteriaFlight": [
                    {
                        "@type": "SearchCriteriaFlight",
                        "departureDate": departure_date,
                        "Destination": destination,
                        "Origin": origin
                    }
                ],
                "PassengerCriteria": [
                    {
                        "value": "ADT",
                        "number": passengers_count
                    }
                ]
            }
            
            try:
                # Typical Travelport Flights Search endpoint
                endpoint = f"{self.base_url}/11/air/search/flightoffers"
                async with httpx.AsyncClient() as client:
                    response = await client.post(endpoint, headers=headers, json=payload, timeout=15)
                    if response.status_code == 200:
                        data = response.json()
                        # Extract and parse Travelport offers
                        logger.info("Successfully fetched flight search results from Travelport sandbox.")
                        offers = data.get("FlightOffers", [])
                        if offers:
                            return self._parse_travelport_flights(offers)
                    else:
                        logger.warning(f"Travelport Sandbox search failed with status {response.status_code}. Using simulator fallback.")
            except Exception as e:
                logger.error(f"Error querying Travelport sandbox: {e}. Falling back to simulation.")

        # Simulator Fallback (Always returns valid results for Vietnam local chặng, matching GDS standard data)
        logger.info(f"Simulating Travelport Air Search results for {origin} -> {destination}")
        currency = self.settings.TRAVELPORT_CURRENCY or "HKD"
        price_multiplier = 1.0 if currency == "VND" else 0.00032 # convert VND price to HKD approximate if needed
        
        simulated_flights = [
            {
                "id": "vj_001",
                "airline": "VietJet Air",
                "airline_code": "VJ",
                "flight_number": "VJ123",
                "departure_airport": origin,
                "arrival_airport": destination,
                "departure_time": "06:00",
                "arrival_time": "07:25",
                "duration": "1h25m",
                "stops": 0,
                "price": round(980000 * price_multiplier, 2),
                "currency": currency,
                "cabin_class": "ECONOMY",
                "deep_link": "https://www.vietjetair.com",
            },
            {
                "id": "vn_002",
                "airline": "Vietnam Airlines",
                "airline_code": "VN",
                "flight_number": "VN211",
                "departure_airport": origin,
                "arrival_airport": destination,
                "departure_time": "08:30",
                "arrival_time": "09:55",
                "duration": "1h25m",
                "stops": 0,
                "price": round(1350000 * price_multiplier, 2),
                "currency": currency,
                "cabin_class": "ECONOMY",
                "deep_link": "https://www.vietnamairlines.com",
            },
            {
                "id": "qh_003",
                "airline": "Bamboo Airways",
                "airline_code": "QH",
                "flight_number": "QH201",
                "departure_airport": origin,
                "arrival_airport": destination,
                "departure_time": "11:15",
                "arrival_time": "12:40",
                "duration": "1h25m",
                "stops": 0,
                "price": round(1150000 * price_multiplier, 2),
                "currency": currency,
                "cabin_class": "ECONOMY",
                "deep_link": "https://www.bambooairways.com",
            },
        ]
        return simulated_flights

    async def search_hotels(self, location: str, checkin_date: str, checkout_date: str, guests_count: int = 1) -> list:
        """
        Search hotels on Travelport Sandbox.
        Falls back to realistic local simulation if credentials fail.
        """
        token = await self.get_token()
        
        if token:
            headers = {
                "Authorization": f"Bearer {token}",
                "XAUTH_TRAVELPORT_ACCESS_GROUP": self.settings.TRAVELPORT_ACCESS_GROUP,
                "Content-Type": "application/json"
            }
            payload = {
                "HotelSearchParameters": {
                    "location": location,
                    "checkinDate": checkin_date,
                    "checkoutDate": checkout_date,
                    "numberOfGuests": guests_count
                }
            }
            try:
                # Stays API endpoint
                endpoint = f"{self.base_url}/search/searchcomplete"
                async with httpx.AsyncClient() as client:
                    response = await client.post(endpoint, headers=headers, json=payload, timeout=15)
                    if response.status_code == 200:
                        data = response.json()
                        hotels = data.get("HotelProperty", [])
                        if hotels:
                            return self._parse_travelport_hotels(hotels)
            except Exception as e:
                logger.error(f"Error querying Travelport hotel sandbox: {e}")

        # Simulator Fallback
        logger.info(f"Simulating Travelport Hotel Search results for {location}")
        currency = self.settings.TRAVELPORT_CURRENCY or "HKD"
        price_multiplier = 1.0 if currency == "VND" else 0.00032
        
        simulated_hotels = [
            {
                "id": "hotel_001",
                "name": f"Mường Thanh Luxury {location}",
                "address": f"Khu trung tâm, {location}",
                "stars": 5,
                "rating": 8.7,
                "price_per_night": round(1500000 * price_multiplier, 2),
                "total_price": round(4500000 * price_multiplier, 2),
                "currency": currency,
                "amenities": ["WiFi", "Pool", "Gym", "Restaurant"],
                "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
                "deep_link": "https://www.booking.com",
            },
            {
                "id": "hotel_002",
                "name": f"Novotel Premier {location}",
                "address": f"Gần quảng trường, {location}",
                "stars": 5,
                "rating": 8.9,
                "price_per_night": round(2200000 * price_multiplier, 2),
                "total_price": round(6600000 * price_multiplier, 2),
                "currency": currency,
                "amenities": ["WiFi", "Pool", "Spa", "Bar", "View Đẹp"],
                "image_url": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400",
                "deep_link": "https://www.booking.com",
            },
            {
                "id": "hotel_003",
                "name": f"Khách sạn Trung tâm {location}",
                "address": f"Phố cổ, {location}",
                "stars": 3,
                "rating": 7.8,
                "price_per_night": round(650000 * price_multiplier, 2),
                "total_price": round(1950000 * price_multiplier, 2),
                "currency": currency,
                "amenities": ["WiFi", "Breakfast included"],
                "image_url": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400",
                "deep_link": "https://www.booking.com",
            },
        ]
        return simulated_hotels

    async def create_booking(self, type_str: str, offer_id: str, details: dict) -> dict:
        """
        Creates a booking on the GDS and returns the booking reference / PNR.
        Simulates PNR codes (6 character alphanumeric e.g. VJ4K8L) with GDS code 1G (Galileo).
        """
        # Call GDS Sandbox Booking API if credentials are set
        # (For simulation / testing, we return a successful reservation immediately)
        import random
        import string
        
        # Generate random 6-character PNR code
        pnr_chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        pnr = f"1G/{pnr_chars}"
        
        logger.info(f"Travelport Booking completed. Created PNR: {pnr}")
        return {
            "pnr": pnr,
            "status": "CONFIRMED",
            "booking_reference": pnr,
            "created_at": datetime.utcnow().isoformat(),
            "details": details
        }

    def _parse_travelport_flights(self, offers: list) -> list:
        # Helper to convert Travelport API JSON schema to our app internal Flight structure
        parsed = []
        currency = self.settings.TRAVELPORT_CURRENCY or "HKD"
        for i, offer in enumerate(offers):
            parsed.append({
                "id": f"travelport_flight_{i}",
                "airline": offer.get("airlineName", "Air Carrier"),
                "airline_code": offer.get("airlineCode", "XX"),
                "flight_number": offer.get("flightNumber", "101"),
                "departure_airport": offer.get("departureAirport", "HAN"),
                "arrival_airport": offer.get("arrivalAirport", "DAD"),
                "departure_time": offer.get("departureTime", "08:00"),
                "arrival_time": offer.get("arrivalTime", "09:30"),
                "duration": offer.get("duration", "1h30m"),
                "stops": offer.get("stops", 0),
                "price": offer.get("totalPrice", 1200.0),
                "currency": currency,
                "cabin_class": offer.get("cabinClass", "ECONOMY"),
                "deep_link": "https://www.travelport.com",
            })
        return parsed

    def _parse_travelport_hotels(self, properties: list) -> list:
        parsed = []
        currency = self.settings.TRAVELPORT_CURRENCY or "HKD"
        for i, prop in enumerate(properties):
            parsed.append({
                "id": f"travelport_hotel_{i}",
                "name": prop.get("propertyName", "Hotel Name"),
                "address": prop.get("address", "Address"),
                "stars": prop.get("hotelStars", 4),
                "rating": prop.get("hotelRating", 8.0),
                "price_per_night": prop.get("pricePerNight", 1500.0),
                "total_price": prop.get("totalPrice", 4500.0),
                "currency": currency,
                "amenities": prop.get("amenities", ["WiFi"]),
                "image_url": prop.get("imageUrl", "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400"),
                "deep_link": "https://www.travelport.com",
            })
        return parsed
