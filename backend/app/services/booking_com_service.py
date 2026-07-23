import logging
from datetime import datetime
import asyncio
import httpx
from app.core.config import get_settings
import random
import string
import unicodedata

logger = logging.getLogger(__name__)

class BookingComClient:
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.RAPIDAPI_KEY
        self.host = self.settings.RAPIDAPI_HOST
        self.base_url = f"https://{self.host}"

    def _get_headers(self):
        return {
            "x-rapidapi-host": self.host,
            "x-rapidapi-key": self.api_key,
            "Content-Type": "application/json"
        }

    def _normalize_location(self, value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value or "")
        normalized = normalized.encode("ascii", "ignore").decode("ascii")
        normalized = normalized.lower().replace("-", " ")
        return " ".join(normalized.split())

    def _known_destination_id(self, query: str) -> str | None:
        loc = self._normalize_location(query)
        known_destinations = {
            # Major cities and common aliases.
            "ha noi": "1_2758",
            "hanoi": "1_2758",
            "ho chi minh": "1_13170",
            "ho chi minh city": "1_13170",
            "sai gon": "1_13170",
            "saigon": "1_13170",
            "da nang": "1_16440",
            "danang": "1_16440",
            "hai phong": "1_17161",
            "can tho": "1_16079",
            "hue": "1_3738",
            "thua thien hue": "1_3738",

            # Popular travel destinations.
            "nha trang": "1_2679",
            "khanh hoa": "1_2679",
            "da lat": "1_15932",
            "dalat": "1_15932",
            "lam dong": "1_15932",
            "phu quoc": "1_17188",
            "phu quoc island": "1_17188",
            "vung tau": "1_17190",
            "ba ria vung tau": "1_17190",
            "hoi an": "1_16552",
            "quy nhon": "1_17242",
            "binh dinh": "1_17242",
            "phan thiet": "1_16264",
            "mui ne": "1_16264",
            "binh thuan": "1_16264",
            "ha long": "1_17182",
            "quang ninh": "1_17182",
            "sapa": "1_17160",
            "sa pa": "1_17160",
            "lao cai": "1_17160",
            "moc chau": "1_226464",
            "son la": "1_204068",
            "ta xua": "1_217010",
            "bac yen": "1_217010",

            # Vietnam provinces/cities. Agoda often maps a province to its main city.
            "an giang": "1_17162",
            "bac giang": "1_204053",
            "bac kan": "1_204054",
            "bac lieu": "1_204055",
            "bac ninh": "1_115625",
            "ben tre": "1_204056",
            "binh duong": "1_115678",
            "binh phuoc": "1_728004",
            "ca mau": "1_115629",
            "cao bang": "1_204057",
            "dak lak": "1_19603",
            "dak nong": "1_204058",
            "dien bien": "1_19657",
            "dong nai": "1_221760",
            "dong thap": "1_204059",
            "gia lai": "1_78906",
            "ha giang": "1_204060",
            "ha nam": "1_204061",
            "ha tinh": "1_230985",
            "hai duong": "1_115635",
            "hau giang": "1_222541",
            "hoa binh": "1_18044",
            "hung yen": "1_115651",
            "kien giang": "1_106012",
            "kon tum": "1_204063",
            "lai chau": "1_18867",
            "lang son": "1_204064",
            "long an": "1_225825",
            "nam dinh": "1_204065",
            "nghe an": "1_115666",
            "ninh binh": "1_17245",
            "ninh thuan": "1_21557",
            "phu tho": "1_215124",
            "phu yen": "1_78908",
            "quang binh": "1_18866",
            "quang nam": "1_115742",
            "quang ngai": "1_106067",
            "quang tri": "1_204067",
            "soc trang": "1_115748",
            "tay ninh": "1_115751",
            "thai binh": "1_115753",
            "thai nguyen": "1_115754",
            "thanh hoa": "1_115756",
            "tien giang": "1_214967",
            "tra vinh": "1_204070",
            "tuyen quang": "1_204071",
            "vinh long": "1_115734",
            "vinh phuc": "1_232995",
            "yen bai": "1_204072",
        }
        for key in sorted(known_destinations, key=len, reverse=True):
            if key in loc:
                return known_destinations[key]
        return None

    async def _lookup_public_agoda_destination_id(self, query: str) -> str | None:
        """Use Agoda public suggest to resolve names without consuming RapidAPI quota."""
        endpoint = "https://www.agoda.com/api/cronos/search/GetUnifiedSuggestResult/3/1/1/0/en-us/"
        search_terms = [query, f"{query} Vietnam"]

        async with httpx.AsyncClient() as client:
            for term in search_terms:
                try:
                    response = await client.get(endpoint, params={"searchText": term}, timeout=8)
                    response.raise_for_status()
                    data = response.json()
                except Exception as exc:
                    logger.warning(f"Agoda public destination lookup failed for {term}: {exc}")
                    continue

                items = data.get("ViewModelList") or data.get("ResultList") or []
                normalized_term = self._normalize_location(term).replace(" vietnam", "")

                for item in items:
                    name = self._normalize_location(item.get("Name") or "")
                    if item.get("CountryId") == 38 and normalized_term in name:
                        city_id = item.get("CityId") or item.get("ObjectId")
                        if city_id:
                            return f"1_{city_id}"

                for item in items:
                    if item.get("CountryId") == 38 and item.get("CityId"):
                        return f"1_{item['CityId']}"

                for item in items:
                    object_id = item.get("ObjectId")
                    if object_id and object_id != 0 and normalized_term == self._normalize_location(item.get("Name") or ""):
                        return f"1_{object_id}"

        return None

    async def get_destination_id(self, query: str) -> str:
        """Return an Agoda destination id for the requested city."""
        if not self.api_key:
            logger.warning("RapidAPI key not set, skipping Agoda destination lookup.")
            return None

        mapped_id = self._known_destination_id(query)
        if mapped_id:
            return mapped_id

        public_id = await self._lookup_public_agoda_destination_id(query)
        if public_id:
            logger.info(f"Resolved Agoda destination id for {query} via public suggest.")
            return public_id

        logger.warning(f"No Agoda destination id found for {query}.")
        return None

    async def search_hotels(self, location: str, checkin_date: str, checkout_date: str, guests_count: int = 1) -> list:
        """Search hotels on Agoda via RapidAPI."""
        dest_id = await self.get_destination_id(location)
        
        if not dest_id:
            logger.warning(f"Could not find Agoda destination id for {location}. Returning fallback empty list.")
            return []

        endpoint = f"{self.base_url}/hotels/search-overnight"
        params = {
            "id": dest_id,
            "checkinDate": checkin_date,
            "checkoutDate": checkout_date,
            "adults": guests_count,
            "rooms": 1,
            "currency": "VND",
            "language": "en-us",
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(endpoint, headers=self._get_headers(), params=params, timeout=15)
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_agoda_hotels(data, location)
                else:
                    logger.error(f"Agoda RapidAPI search failed: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Agoda RapidAPI search exception: {e}")
            
        return []

    async def search_flights(self, origin: str, destination: str, departure_date: str, passengers_count: int = 1) -> list:
        """Search one-way flights on Agoda via RapidAPI."""
        if not self.api_key:
            logger.warning("RapidAPI key not set, skipping Agoda flight lookup.")
            return []

        endpoint = f"{self.base_url}/flights/search-one-way"
        params = {
            "origin": origin,
            "destination": destination,
            "departureDate": departure_date,
            "adults": max(int(passengers_count or 1), 1),
            "currency": "VND",
            "locale": "en-us",
        }

        try:
            async with httpx.AsyncClient() as client:
                for attempt in range(3):
                    response = await client.get(endpoint, headers=self._get_headers(), params=params, timeout=20)
                    if response.status_code != 200:
                        logger.error(f"Agoda flight search failed: {response.status_code} - {response.text}")
                        return []

                    data = response.json()
                    flights = self._parse_agoda_flights(data, origin, destination, params["adults"])
                    trips = data.get("trips") or []
                    is_completed = bool(trips and trips[0].get("isCompleted"))
                    if flights or is_completed or attempt == 2:
                        return flights

                    retry_ms = ((data.get("retry") or {}).get("next") or 2000)
                    await asyncio.sleep(min(float(retry_ms) / 1000, 2))
        except Exception as e:
            logger.error(f"Agoda flight search exception: {e}")

        return []

    def _parse_agoda_flights(self, data: dict, origin: str, destination: str, passengers_count: int) -> list:
        def format_time(value: str | None) -> str:
            if not value:
                return ""
            try:
                return datetime.fromisoformat(value).strftime("%H:%M")
            except ValueError:
                return value[-5:]

        def format_duration(minutes: int | float | None) -> str:
            try:
                total = int(minutes or 0)
            except (TypeError, ValueError):
                total = 0
            hours, mins = divmod(total, 60)
            if hours and mins:
                return f"{hours}h{mins:02d}m"
            if hours:
                return f"{hours}h"
            return f"{mins}m"

        def extract_price(bundle: dict) -> tuple[float, float]:
            price_items = bundle.get("bundlePrice") or []
            if not price_items:
                return 0.0, 0.0
            price_root = ((price_items[0].get("price") or {}).get("vnd") or {})
            display = price_root.get("display") or {}
            per_book = display.get("perBook") or {}
            per_pax = (display.get("perPax") or [{}])[0] or {}
            total = per_book.get("allInclusive") or ((price_root.get("charges") or [{}])[0].get("total") or {}).get("inc") or 0
            per_adult = per_pax.get("allInclusive") or (float(total or 0) / max(passengers_count, 1))
            try:
                return round(float(total), 2), round(float(per_adult), 2)
            except (TypeError, ValueError):
                return 0.0, 0.0

        flights = []
        for trip in data.get("trips") or []:
            for index, bundle in enumerate(trip.get("bundles") or []):
                outbound = bundle.get("outboundSlice") or {}
                segments = outbound.get("segments") or []
                if not segments:
                    continue

                first_segment = segments[0]
                last_segment = segments[-1]
                carrier = first_segment.get("carrierContent") or first_segment.get("operatingCarrierContent") or {}
                carrier_code = carrier.get("carrierCode") or ""
                flight_no = first_segment.get("flightNumber") or ""
                total_price, price_per_adult = extract_price(bundle)
                if total_price <= 0:
                    continue

                itinerary = ((bundle.get("itineraries") or [{}])[0].get("itineraryInfo") or {})
                flight_id = itinerary.get("externalItineraryId") or itinerary.get("id") or bundle.get("key") or index
                flights.append({
                    "id": f"agoda_flight_{flight_id}",
                    "airline": carrier.get("carrierName") or carrier_code or "Agoda Flight",
                    "airline_code": carrier_code,
                    "flight_number": f"{carrier_code}{flight_no}" if carrier_code and flight_no else flight_no,
                    "departure_airport": first_segment.get("originAirport") or origin,
                    "arrival_airport": last_segment.get("destinationAirport") or destination,
                    "departure_time": format_time(first_segment.get("departDateTime")),
                    "arrival_time": format_time(last_segment.get("arrivalDateTime")),
                    "duration": format_duration(outbound.get("duration") or itinerary.get("totalTripDuration")),
                    "stops": max(len(segments) - 1, 0),
                    "price": price_per_adult,
                    "total_price": total_price,
                    "price_per_adult": price_per_adult,
                    "passengers": passengers_count,
                    "currency": "VND",
                    "cabin_class": ((first_segment.get("cabinClassContent") or {}).get("cabinName") or "Economy Class").upper(),
                    "deep_link": "https://www.agoda.com/flights",
                })

        return flights

    def _parse_agoda_hotels(self, data: dict, location: str) -> list:
        def normalize_image_url(url: str | None) -> str | None:
            if not url:
                return None
            if url.startswith("//"):
                return f"https:{url}"
            return url

        def extract_image(item: dict, hotel: dict, content: dict) -> str | None:
            direct_image = (
                hotel.get("image")
                or hotel.get("imageUrl")
                or hotel.get("photoUrl")
                or item.get("image")
                or item.get("imageUrl")
            )
            if isinstance(direct_image, list):
                direct_image = direct_image[0] if direct_image else None
            direct_image = normalize_image_url(direct_image)
            if direct_image:
                return direct_image

            image_groups = ((content.get("images") or {}).get("hotelImages") or [])
            for image_item in image_groups:
                for url_item in image_item.get("urls") or []:
                    image_url = normalize_image_url(url_item.get("value"))
                    if image_url:
                        return image_url

            return None

        def extract_review_score(content: dict, hotel: dict) -> float | None:
            cumulative = ((content.get("reviews") or {}).get("cumulative") or {})
            score = cumulative.get("score") or hotel.get("reviewScore") or hotel.get("rating")
            try:
                return round(float(score), 1)
            except (TypeError, ValueError):
                return None

        def extract_star_rating(summary: dict, hotel: dict) -> int:
            rating = hotel.get("stars") or hotel.get("starRating") or summary.get("rating") or 4
            try:
                return max(1, min(5, int(round(float(rating)))))
            except (TypeError, ValueError):
                return 4

        def find_list(node, keys=("properties", "hotels", "results")):
            if isinstance(node, dict):
                for key in keys:
                    value = node.get(key)
                    if isinstance(value, list):
                        return value
                for value in node.values():
                    found = find_list(value, keys)
                    if found:
                        return found
            elif isinstance(node, list):
                return node
            return []

        candidates = find_list(data)

        parsed_hotels = []
        for item in candidates:
            content = item.get("content") or {}
            summary = content.get("informationSummary") or {}
            address = summary.get("address") or {}
            geo = summary.get("geoInfo") or {}
            hotel = item.get("hotel") or item.get("property") or summary or item
            hotel_id = (
                hotel.get("id")
                or hotel.get("hotelId")
                or hotel.get("hotel_id")
                or item.get("propertyId")
                or item.get("id")
            )
            if not hotel_id:
                continue

            pricing = item.get("pricing") or item.get("price") or {}
            agoda_room_price = None
            if isinstance(pricing, dict):
                try:
                    agoda_room_price = (
                        pricing["offers"][0]["roomOffers"][0]["room"]["pricing"][0]["price"]
                    )
                except (KeyError, IndexError, TypeError):
                    agoda_room_price = None
            price_candidates = [
                hotel.get("price"),
                hotel.get("dailyRate"),
                hotel.get("roomRate"),
                item.get("price"),
                item.get("dailyRate"),
            ]
            if isinstance(pricing, dict):
                price_candidates.extend([
                    pricing.get("displayPrice"),
                    pricing.get("price"),
                    pricing.get("perNight"),
                    pricing.get("perNightPerRoom"),
                    pricing.get("perBooking"),
                ])
            if isinstance(agoda_room_price, dict):
                price_candidates.extend([
                    (((agoda_room_price.get("perBook") or {}).get("inclusive") or {}).get("display")),
                    (((agoda_room_price.get("perBook") or {}).get("exclusive") or {}).get("display")),
                    (((agoda_room_price.get("perRoomPerNight") or {}).get("inclusive") or {}).get("display")),
                    (((agoda_room_price.get("perNight") or {}).get("inclusive") or {}).get("display")),
                ])
            price = next((candidate for candidate in price_candidates if candidate), {})
            if isinstance(price, dict):
                price_value = (
                    price.get("value")
                    or price.get("amount")
                    or price.get("display")
                    or price.get("exclusive")
                    or price.get("inclusive")
                    or 0
                )
                currency = price.get("currency") or "VND"
            else:
                price_value = price or 0
                currency = hotel.get("currency") or item.get("currency") or "VND"

            try:
                price_value = float(str(price_value).replace(",", ""))
            except (TypeError, ValueError):
                price_value = 0.0
            if price_value <= 0:
                continue

            image = extract_image(item, hotel, content)
            review_score = extract_review_score(content, hotel)
            star_rating = extract_star_rating(summary, hotel)

            address_value = hotel.get("address")
            if isinstance(address_value, dict):
                address_value = (
                    (address_value.get("area") or {}).get("name")
                    or (address_value.get("city") or {}).get("name")
                    or location
                )

            parsed_hotels.append({
                "id": f"agoda_hotel_{hotel_id}",
                "name": hotel.get("name") or hotel.get("hotelName") or summary.get("localeName") or summary.get("defaultName") or "Agoda Hotel",
                "address": address_value or address.get("area", {}).get("name") or address.get("city", {}).get("name") or location,
                "lat": geo.get("latitude"),
                "lng": geo.get("longitude"),
                "stars": star_rating,
                "rating": review_score,
                "price_per_night": round(price_value, 2),
                "total_price": round(price_value, 2),
                "currency": currency,
                "amenities": hotel.get("amenities") or ["WiFi", "Air Conditioning"],
                "image_url": image or "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
                "deep_link": hotel.get("url") or hotel.get("deepLink") or "https://www.agoda.com",
            })

        return parsed_hotels

    async def create_booking(self, type_str: str, offer_id: str, details: dict) -> dict:
        """
        Mock booking creation for Agoda.
        Generates a realistic BKG-XXXXX confirmation number.
        """
        conf_number = "".join(random.choices(string.digits, k=8))
        pin = "".join(random.choices(string.digits, k=4))
        pnr = f"BKG-{conf_number}"
        
        logger.info(f"Agoda reservation completed. Created PNR: {pnr}")
        return {
            "pnr": pnr,
            "status": "CONFIRMED",
            "booking_reference": pnr,
            "pin": pin,
            "created_at": datetime.utcnow().isoformat(),
            "details": details
        }
