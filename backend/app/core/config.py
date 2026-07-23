from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "AI Travel Assistant"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://travel:travelpass@localhost:5432/traveldb"

    # Security
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Tavily
    TAVILY_API_KEY: str = ""

    # WeatherAPI.com
    WEATHERAPI_KEY: str = ""

    # Geocoding
    ENABLE_GEOCODING: bool = False
    GEOCODING_MAX_ITEMS: int = 8

    # Email (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "TravelAI Assistant"

    # Travelport
    TRAVELPORT_USERNAME: str = ""
    TRAVELPORT_PASSWORD: str = ""
    TRAVELPORT_CLIENT_ID: str = ""
    TRAVELPORT_CLIENT_SECRET: str = ""
    TRAVELPORT_PCC: str = ""
    TRAVELPORT_ACCESS_GROUP: str = ""
    TRAVELPORT_CURRENCY: str = "HKD"
    TRAVELPORT_SANDBOX: bool = True
    TRAVELPORT_AUTH_URL: str = ""
    TRAVELPORT_API_BASE_URL: str = ""

    # RapidAPI Agoda
    RAPIDAPI_KEY: str = ""
    RAPIDAPI_HOST: str = "agoda-com.p.rapidapi.com"

    # VNPay
    VNPAY_TMN_CODE: str = ""
    VNPAY_HASH_SECRET: str = ""
    VNPAY_URL: str = ""
    VNPAY_RETURN_URL: str = ""

    # Frontend
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
