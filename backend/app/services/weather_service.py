import logging
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import httpx

from app.core.config import get_settings
from app.models.itinerary import ItineraryItem
from app.models.trip import TripRead

logger = logging.getLogger(__name__)


class WeatherAPIClient:
    forecast_url = "https://api.weatherapi.com/v1/forecast.json"
    future_url = "https://api.weatherapi.com/v1/future.json"

    def __init__(self) -> None:
        self.settings = get_settings()
        self.api_key = self.settings.WEATHERAPI_KEY

    async def get_trip_weather(
        self,
        trip: TripRead,
        itinerary_items: list[ItineraryItem],
    ) -> dict[str, Any]:
        return await self.get_weather_for_plan(
            destination=trip.destination,
            start_date=trip.start_date,
            end_date=trip.end_date,
            itinerary_items=itinerary_items,
        )

    async def get_weather_for_plan(
        self,
        destination: str,
        start_date: Any,
        end_date: Any,
        itinerary_items: list[ItineraryItem] | None = None,
    ) -> dict[str, Any]:
        if not self.api_key:
            return {
                "configured": False,
                "location": destination,
                "days": [],
                "alerts": [],
                "advice": [
                    "Add WEATHERAPI_KEY to the backend .env file to enable live weather insights."
                ],
            }

        query = self._build_location_query(destination, itinerary_items or [])
        trip_start, trip_end = self._trip_window(start_date, end_date)
        today = datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()

        if trip_end < today:
            return self._date_unavailable_response(
                trip.destination,
                trip_start,
                trip_end,
                "Chuyến đi này đã qua, nên không còn dữ liệu dự báo thời tiết cho các ngày đó.",
            )

        forecast_limit = today + timedelta(days=13)
        forecast_start = max(trip_start, today)
        forecast_end = min(trip_end, forecast_limit)

        if forecast_start <= forecast_end:
            return await self._get_forecast_weather(
                query=query,
                fallback_location=destination,
                trip_start=trip_start,
                trip_end=trip_end,
                forecast_start=forecast_start,
                forecast_end=forecast_end,
                today=today,
            )

        future_limit = today + timedelta(days=300)
        if trip_start <= future_limit:
            return await self._get_future_weather(
                query=query,
                fallback_location=destination,
                trip_start=trip_start,
                trip_end=min(trip_end, future_limit),
            )

        return self._date_unavailable_response(
            destination,
            trip_start,
            trip_end,
            "Ngày đi nằm quá xa phạm vi dự báo của WeatherAPI, hiện chưa thể lấy forecast chính xác.",
        )

    async def _get_forecast_weather(
        self,
        query: str,
        fallback_location: str,
        trip_start: date,
        trip_end: date,
        forecast_start: date,
        forecast_end: date,
        today: date,
    ) -> dict[str, Any]:
        params = {
            "key": self.api_key,
            "q": query,
            "days": (forecast_end - today).days + 1,
            "aqi": "yes",
            "alerts": "yes",
            "lang": "vi",
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.forecast_url, params=params, timeout=12)
                response.raise_for_status()
                payload = response.json()
        except httpx.HTTPStatusError as exc:
            logger.error(
                "WeatherAPI request failed: %s - %s",
                exc.response.status_code,
                exc.response.text,
            )
            return self._unavailable_response(fallback_location, trip_start, trip_end)
        except Exception as exc:
            logger.error("WeatherAPI request exception: %s", exc)
            return self._unavailable_response(fallback_location, trip_start, trip_end)

        return self._normalize(
            payload,
            trip_start=trip_start,
            trip_end=trip_end,
            forecast_start=forecast_start,
            forecast_end=forecast_end,
            mode="forecast",
        )

    async def _get_future_weather(
        self,
        query: str,
        fallback_location: str,
        trip_start: date,
        trip_end: date,
    ) -> dict[str, Any]:
        # WeatherAPI Future API returns one date per request. Cap to 14 trip days for a compact UI.
        requested_days = [trip_start + timedelta(days=offset) for offset in range((trip_end - trip_start).days + 1)]
        requested_days = requested_days[:14]

        location_payload: dict[str, Any] = {}
        forecast_days: list[dict[str, Any]] = []

        try:
            async with httpx.AsyncClient() as client:
                for target_date in requested_days:
                    response = await client.get(
                        self.future_url,
                        params={
                            "key": self.api_key,
                            "q": query,
                            "dt": target_date.isoformat(),
                            "lang": "vi",
                        },
                        timeout=12,
                    )
                    response.raise_for_status()
                    payload = response.json()
                    location_payload = payload.get("location", location_payload)
                    forecast_days.extend(payload.get("forecast", {}).get("forecastday", []))
        except httpx.HTTPStatusError as exc:
            logger.error(
                "WeatherAPI future request failed: %s - %s",
                exc.response.status_code,
                exc.response.text,
            )
            return self._date_unavailable_response(
                fallback_location,
                trip_start,
                trip_end,
                "WeatherAPI chưa trả được dự báo cho ngày đi này. Nếu dùng gói miễn phí, Future API có thể bị giới hạn.",
            )
        except Exception as exc:
            logger.error("WeatherAPI future request exception: %s", exc)
            return self._unavailable_response(fallback_location, trip_start, trip_end)

        return self._normalize(
            {"location": location_payload, "forecast": {"forecastday": forecast_days}},
            trip_start=trip_start,
            trip_end=trip_end,
            forecast_start=requested_days[0],
            forecast_end=requested_days[-1],
            mode="future",
        )

    def _build_location_query(
        self,
        destination: str,
        itinerary_items: list[ItineraryItem],
    ) -> str:
        coordinates: list[tuple[float, float]] = []

        for item in itinerary_items:
            details = item.activity_details or {}
            lat = details.get("lat")
            lng = details.get("lng")
            if self._is_valid_coordinate(lat, lng):
                coordinates.append((float(lat), float(lng)))

        if coordinates:
            avg_lat = sum(lat for lat, _ in coordinates) / len(coordinates)
            avg_lng = sum(lng for _, lng in coordinates) / len(coordinates)
            return f"{avg_lat:.6f},{avg_lng:.6f}"

        return destination

    def _trip_window(self, start_date: Any, end_date: Any) -> tuple[date, date]:
        try:
            start = date.fromisoformat(str(start_date)[:10])
            end = date.fromisoformat(str(end_date)[:10])
            if end < start:
                return start, start
            return start, end
        except Exception:
            today = datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()
            return today, today + timedelta(days=2)

    def _is_valid_coordinate(self, lat: Any, lng: Any) -> bool:
        try:
            lat_num = float(lat)
            lng_num = float(lng)
        except (TypeError, ValueError):
            return False

        return (
            -90 <= lat_num <= 90
            and -180 <= lng_num <= 180
            and not (lat_num == 0 and lng_num == 0)
        )

    def _normalize(
        self,
        payload: dict[str, Any],
        trip_start: date,
        trip_end: date,
        forecast_start: date,
        forecast_end: date,
        mode: str,
    ) -> dict[str, Any]:
        location = payload.get("location", {})
        current = payload.get("current", {})
        forecast_days = payload.get("forecast", {}).get("forecastday", [])
        alerts = payload.get("alerts", {}).get("alert", []) or []

        normalized_days = []
        for forecast in forecast_days:
            forecast_date = self._parse_date(forecast.get("date"))
            if forecast_date and not (forecast_start <= forecast_date <= forecast_end):
                continue

            day = forecast.get("day", {})
            condition = day.get("condition", {})
            normalized_days.append(
                {
                    "date": forecast.get("date"),
                    "condition": condition.get("text", "Unknown"),
                    "icon": condition.get("icon"),
                    "code": condition.get("code"),
                    "max_temp_c": day.get("maxtemp_c"),
                    "min_temp_c": day.get("mintemp_c"),
                    "avg_temp_c": day.get("avgtemp_c"),
                    "chance_of_rain": day.get("daily_chance_of_rain"),
                    "total_precip_mm": day.get("totalprecip_mm"),
                    "max_wind_kph": day.get("maxwind_kph"),
                    "uv": day.get("uv"),
                }
            )

        air_quality = current.get("air_quality") or {}
        partial = forecast_start > trip_start or forecast_end < trip_end
        result = {
            "configured": True,
            "mode": mode,
            "requested_start_date": trip_start.isoformat(),
            "requested_end_date": trip_end.isoformat(),
            "forecast_start_date": forecast_start.isoformat(),
            "forecast_end_date": forecast_end.isoformat(),
            "partial": partial,
            "coverage_note": self._coverage_note(trip_start, trip_end, forecast_start, forecast_end, mode),
            "location": ", ".join(
                part
                for part in [
                    location.get("name"),
                    location.get("region"),
                    location.get("country"),
                ]
                if part
            ),
            "local_time": location.get("localtime"),
            "current": {
                "temp_c": current.get("temp_c"),
                "feelslike_c": current.get("feelslike_c"),
                "condition": (current.get("condition") or {}).get("text"),
                "icon": (current.get("condition") or {}).get("icon"),
                "humidity": current.get("humidity"),
                "wind_kph": current.get("wind_kph"),
                "uv": current.get("uv"),
                "air_quality": {
                    "pm2_5": air_quality.get("pm2_5"),
                    "us_epa_index": air_quality.get("us-epa-index"),
                },
            },
            "days": normalized_days,
            "alerts": [
                {
                    "headline": alert.get("headline"),
                    "severity": alert.get("severity"),
                    "event": alert.get("event"),
                    "effective": alert.get("effective"),
                    "expires": alert.get("expires"),
                    "desc": alert.get("desc"),
                }
                for alert in alerts
            ],
        }
        result["advice"] = self._build_advice(result)
        return result

    def _parse_date(self, value: Any) -> date | None:
        try:
            return date.fromisoformat(str(value))
        except Exception:
            return None

    def _coverage_note(
        self,
        trip_start: date,
        trip_end: date,
        forecast_start: date,
        forecast_end: date,
        mode: str,
    ) -> str:
        if forecast_start == trip_start and forecast_end == trip_end:
            return "Dự báo đang khớp với các ngày trong chuyến đi."

        if mode == "forecast":
            return "WeatherAPI chỉ có forecast ngắn hạn, nên hiện mới phủ được một phần ngày trong chuyến đi."

        return "Dự báo ngày xa được lấy qua Future API và có thể phụ thuộc gói WeatherAPI đang dùng."

    def _build_advice(self, weather: dict[str, Any]) -> list[str]:
        advice: list[str] = []
        days = weather.get("days", [])
        current = weather.get("current", {})

        if weather.get("alerts"):
            advice.append("Có cảnh báo thời tiết, nên kiểm tra lại các hoạt động ngoài trời trước khi xuất phát.")

        if any((day.get("chance_of_rain") or 0) >= 60 for day in days):
            advice.append("Khả năng mưa cao, nên chuẩn bị áo mưa và có phương án indoor dự phòng.")

        if any((day.get("max_temp_c") or 0) >= 33 for day in days):
            advice.append("Nhiệt độ cao, nên ưu tiên tham quan ngoài trời vào sáng sớm hoặc chiều muộn.")

        if any((day.get("uv") or 0) >= 7 for day in days):
            advice.append("Chỉ số UV cao, nên mang kem chống nắng, mũ và nước uống.")

        air_quality = current.get("air_quality") or {}
        if (air_quality.get("us_epa_index") or 0) >= 3:
            advice.append("Chất lượng không khí không lý tưởng, nên hạn chế hoạt động ngoài trời kéo dài.")

        if not advice:
            advice.append("Thời tiết nhìn chung thuận lợi cho lịch trình hiện tại.")

        return advice

    def _date_unavailable_response(
        self,
        location: str,
        trip_start: date,
        trip_end: date,
        message: str,
    ) -> dict[str, Any]:
        return {
            "configured": True,
            "unavailable": True,
            "mode": "unavailable",
            "location": location,
            "requested_start_date": trip_start.isoformat(),
            "requested_end_date": trip_end.isoformat(),
            "days": [],
            "alerts": [],
            "advice": [message],
        }

    def _unavailable_response(self, location: str, trip_start: date, trip_end: date) -> dict[str, Any]:
        return {
            "configured": True,
            "unavailable": True,
            "mode": "unavailable",
            "location": location,
            "requested_start_date": trip_start.isoformat(),
            "requested_end_date": trip_end.isoformat(),
            "days": [],
            "alerts": [],
            "advice": ["WeatherAPI hiện chưa phản hồi, bạn thử lại sau ít phút."],
        }
