from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import create_db_and_tables
from app.routes import auth, trips, itinerary, ai_chat, notifications, booking, payment

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    from app.services.scheduler import start_scheduler
    start_scheduler()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="AI-powered travel assistant with stateful trip planning",
    lifespan=lifespan,
)

# CORS – allow all origins in development so browser preflight (OPTIONS) passes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(itinerary.router)
app.include_router(ai_chat.router)
app.include_router(notifications.router)
app.include_router(booking.router)
app.include_router(payment.router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
