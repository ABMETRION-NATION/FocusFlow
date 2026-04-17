from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="FocusFlow API")
api_router = APIRouter(prefix="/api")


# ------------------------- Models -------------------------
class SessionCreate(BaseModel):
    duration_seconds: int = Field(..., gt=0, description="Duration of the focus session in seconds")
    label: Optional[str] = Field(default=None, max_length=64)
    mode: str = Field(default="focus", description="focus | break | custom")
    user_id: Optional[str] = Field(default="local")


class SessionOut(BaseModel):
    id: str
    duration_seconds: int
    label: Optional[str] = None
    mode: str
    user_id: str
    completed_at: str  # ISO string


class StatsOut(BaseModel):
    sessions_today: int
    total_focus_seconds_today: int
    total_focus_seconds_all_time: int
    streak_days: int


# ------------------------- Helpers -------------------------
def _serialize(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "duration_seconds": doc["duration_seconds"],
        "label": doc.get("label"),
        "mode": doc.get("mode", "focus"),
        "user_id": doc.get("user_id", "local"),
        "completed_at": doc["completed_at"],
    }


def _start_of_day(dt: datetime) -> datetime:
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


# ------------------------- Routes -------------------------
@api_router.get("/")
async def root():
    return {"message": "FocusFlow API", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "healthy", "time": datetime.now(timezone.utc).isoformat()}


@api_router.post("/sessions", response_model=SessionOut)
async def create_session(payload: SessionCreate):
    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "duration_seconds": payload.duration_seconds,
        "label": payload.label,
        "mode": payload.mode,
        "user_id": payload.user_id or "local",
        "completed_at": now.isoformat(),
    }
    await db.sessions.insert_one(doc.copy())
    return _serialize(doc)


@api_router.get("/sessions", response_model=List[SessionOut])
async def list_sessions(user_id: str = "local", limit: int = 100):
    cursor = db.sessions.find({"user_id": user_id}, {"_id": 0}).sort("completed_at", -1).limit(limit)
    results = await cursor.to_list(length=limit)
    return [_serialize(d) for d in results]


@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user_id: str = "local"):
    result = await db.sessions.delete_one({"id": session_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True, "id": session_id}


@api_router.get("/sessions/stats", response_model=StatsOut)
async def get_stats(user_id: str = "local"):
    now = datetime.now(timezone.utc)
    start_today = _start_of_day(now).isoformat()

    cursor = db.sessions.find(
        {"user_id": user_id, "mode": {"$ne": "break"}},
        {"_id": 0},
    ).sort("completed_at", -1)
    all_sessions = await cursor.to_list(length=5000)

    sessions_today = 0
    total_today = 0
    total_all = 0
    day_set = set()

    for s in all_sessions:
        total_all += int(s.get("duration_seconds", 0))
        completed_at_str = s.get("completed_at")
        if not completed_at_str:
            continue
        try:
            completed_at = datetime.fromisoformat(completed_at_str)
        except ValueError:
            continue
        if completed_at.tzinfo is None:
            completed_at = completed_at.replace(tzinfo=timezone.utc)

        if completed_at.isoformat() >= start_today:
            sessions_today += 1
            total_today += int(s.get("duration_seconds", 0))

        day_set.add(_start_of_day(completed_at).date())

    # streak: consecutive days up to today with at least 1 focus session
    streak = 0
    cursor_day = _start_of_day(now).date()
    while cursor_day in day_set:
        streak += 1
        cursor_day = cursor_day - timedelta(days=1)

    return StatsOut(
        sessions_today=sessions_today,
        total_focus_seconds_today=total_today,
        total_focus_seconds_all_time=total_all,
        streak_days=streak,
    )


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
