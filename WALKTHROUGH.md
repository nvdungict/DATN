# Phân tích Kiến trúc – AI Travel Assistant

## Tổng quan luồng dữ liệu

```
Browser (Next.js)
    │  REST API (JWT)      WebSocket (streaming)
    ▼                              ▼
FastAPI (Python)  ◄──────────────────────────
    │
    ├── Auth Routes       → bcrypt + JWT
    ├── Trip Routes       → CRUD + AI trigger
    ├── Itinerary Routes  → confirm/complete
    └── AI Chat Route     → WebSocket stream
            │
            ▼
      LangGraph Agent
            │
    ┌───────┴────────┐
    ▼                ▼
OpenAI API      Tavily API
(GPT-4o)       (web search)
            │
            ▼
     PostgreSQL + pgvector
     (tabellar data + vector memory)
```

---

## 1. Infrastructure – `docker-compose.yml`

```
DATN/
├── docker-compose.yml   ← orchestrate 3 services
├── .env                 ← tất cả secrets/config
├── backend/
└── frontend/
```

### 3 Services trong Docker:

| Service | Image | Port Host→Container |
|---|---|---|
| `postgres` | ankane/pgvector | 5433→5432 |
| `backend` | Python 3.11-slim (build) | 8000→8000 |
| `frontend` | Node 20-alpine (build) | 3000→3000 |

**Quan trọng:**
- `backend` depends on `postgres` với `condition: service_healthy` → backend chỉ start sau khi DB sẵn sàng
- Dùng Docker volume `postgres_data` để persist dữ liệu kể cả khi restart
- Biến `DATABASE_URL` inject vào backend qua environment (override `.env`)

---

## 2. Backend Core – `backend/app/`

```
app/
├── main.py          ← FastAPI entry point
├── core/
│   ├── config.py    ← Settings (env vars)
│   ├── database.py  ← async engine + session
│   └── security.py  ← JWT + bcrypt
├── models/          ← SQLModel tables
├── routes/          ← API endpoints
├── services/        ← business logic
└── agents/          ← LangGraph AI
```

### `main.py` – Entry Point
```python
# 1. Khởi tạo FastAPI app
app = FastAPI(title="AI Travel Assistant", lifespan=lifespan)

# 2. CORS Middleware (cho phép browser gọi API)
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)

# 3. Lifespan: tạo bảng DB khi startup
await create_db_and_tables()

# 4. Đăng ký 4 router groups
app.include_router(auth.router)       # /auth/*
app.include_router(trips.router)      # /trips/*
app.include_router(itinerary.router)  # /itinerary/*
app.include_router(ai_chat.router)    # /ai/* (WebSocket)
```

### `core/config.py` – Settings
```python
class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    OPENAI_API_KEY: str
    TAVILY_API_KEY: str
    ...
```
→ Pydantic v2 BaseSettings tự đọc từ `.env` file. Dùng `@lru_cache` để singleton.

### `core/database.py` – Async DB
```python
engine = create_async_engine(settings.DATABASE_URL)

# Dependency injection vào mọi route
async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

# Khởi tạo: bật pgvector extension + tạo bảng
async def create_db_and_tables():
    await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
    await conn.run_sync(SQLModel.metadata.create_all)
```

### `core/security.py` – Auth
```python
# Password hashing (bcrypt trực tiếp, không dùng passlib)
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

# JWT Token
def create_access_token(subject: int) -> str:
    payload = {"sub": str(subject), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

# Dependency: inject user vào route
async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    user = await session.get(User, int(payload["sub"]))
    return user
```

---

## 3. Database Models – `app/models/`

### User
```python
class User(SQLModel, table=True):
    id: int              # Primary key
    email: str           # Unique index
    hashed_password: str # bcrypt hash
    travel_profile: dict # JSON: dietary, budget, interests
    created_at: datetime
    is_active: bool
```

### Trip
```python
class Trip(SQLModel, table=True):
    id: int
    user_id: int          # FK → users.id
    title: str
    destination: str
    start_date: date
    end_date: date
    status: Enum          # PLANNED | ACTIVE | COMPLETED
    total_budget: float
    currency: str
```

### ItineraryItem
```python
class ItineraryItem(SQLModel, table=True):
    id: int
    trip_id: int          # FK → trips.id
    day_number: int       # Ngày thứ mấy
    start_time: time      # "08:00"
    end_time:   time      # "10:00"
    type: Enum            # ATTRACTION | MEAL | TRANSPORT | LODGING
    activity_details: dict  # JSON: {name, address, lat, lng, note, cost}
    status: Enum          # SUGGESTED | CONFIRMED | COMPLETED
```

### MemoryStream ⭐ (Quan trọng)
```python
class MemoryStream(SQLModel, table=True):
    id: int
    user_id: int
    trip_id: Optional[int]
    content: str            # Nội dung memory
    memory_type: str        # "preference" | "history" | "constraint"
    vector_embedding: list[float]  # pgvector: 1536 chiều (OpenAI embedding)
    created_at: datetime
```
→ Dùng để AI "nhớ" sở thích và lịch sử của user bằng semantic search

---

## 4. AI Agent – LangGraph State Machine ⭐⭐

### State (`agents/state.py`)
```python
class AgentState(TypedDict):
    # Input từ user
    user_message: str
    user_id: int
    trip_id: Optional[int]

    # Kết quả từ mỗi node
    intent: str           # "CREATE_TRIP" | "MODIFY_TRIP" | "ASK_INFO"
    entities: dict        # {location, dates, budget, num_days...}
    existing_trip: dict   # Trip hiện tại (nếu MODIFY)
    memory_context: list  # Memories liên quan từ pgvector
    search_results: list  # Kết quả từ Tavily
    trip_data: dict       # Trip được AI tạo ra
    itinerary_items: list # Các hoạt động
    conflicts: list       # Xung đột thời gian/ngân sách
    messages: list        # Tin nhắn trả về cho user
    next_node: str        # Signal routing
```

### Luồng Graph (`agents/graph.py`)

```
[START]
   │
   ▼
[understand]  → LLM parse intent + entities từ message
   │
   ▼
[decision]    → Route theo intent
   │
   ├── CREATE_TRIP ──► [search] → Tavily tìm địa điểm thật
   │                      │
   ├── ASK_INFO ────► [search] → Tavily tìm thông tin
   │                      │
   └── MODIFY_TRIP ──► [retrieve] → Lấy trip + memory từ DB
                          │
                          ▼
                       [plan] (tất cả đều qua đây)
                          │  LLM generate itinerary JSON
                          ▼
                    [constraint] → Kiểm tra overlap + budget
                          │
                          ▼
                     [finalize] → Lưu DB + build response
                          │
                        [END]
```

### Chi tiết từng Node:

#### `understand_node`
```python
# Gọi GPT-4o để parse message thành structured data
prompt = """
User message: "đi Đà Nẵng 3 ngày"
→ { "intent": "CREATE_TRIP",
    "entities": {"location": "Da Nang", "num_days": 3} }
"""
# Fallback: nếu parse lỗi → mặc định CREATE_TRIP
```

#### `decision_node` (pure logic, không gọi AI)
```python
if intent == "CREATE_TRIP":  next_node = "plan"   # → search trước
if intent == "MODIFY_TRIP":  next_node = "retrieve"
if intent == "ASK_INFO":     next_node = "search"
```

#### `retrieve_node` (dùng pgvector)
```python
# 1. Lấy trip + itinerary hiện tại từ DB
trip = await session.get(Trip, trip_id)

# 2. Vector search: tìm memories liên quan
embedding = await openai.embed("user message")
memories = await session.execute(
    SELECT * FROM memory_streams
    ORDER BY embedding <-> query_embedding  # cosine distance
    LIMIT 5
)
```

#### `search_node` (dùng Tavily API)
```python
results = await tavily.search(
    "top tourist attractions in Da Nang",
    search_depth="advanced",
    max_results=5
)
# Trả về: tên, địa chỉ, giờ mở cửa, rating, description
```

#### `plan_node` (LLM generate itinerary)
```python
# Input: location, dates, budget, search_results, memory_context
# Output: JSON với trip + itinerary_items đầy đủ tọa độ lat/lng
prompt = """
Destination: Da Nang
Start: 2026-04-10, End: 2026-04-12
Budget: 3,000,000 VND
Search results: [Bà Nà Hills..., Mỹ Khê beach...]
→ Generate day-by-day itinerary as JSON
"""
```

#### `constraint_node` (pure logic)
```python
# Check 1: Time overlap trong cùng 1 ngày
for day in days:
    if item_A.end_time > item_B.start_time:
        conflicts.append({"type": "TIME_OVERLAP", ...})

# Check 2: Budget exceeded
if sum(estimated_costs) > total_budget:
    conflicts.append({"type": "BUDGET_EXCEEDED", ...})
```

#### `finalize_node` (lưu DB)
```python
# 1. Tạo trip trong DB
saved_trip = await svc.create_trip(TripCreate(...), user_id)
state["trip_data"]["id"] = saved_trip.id  # ← trả ID về frontend

# 2. Tạo itinerary items
for item in itinerary_items:
    db_item = ItineraryItem(**item)
    session.add(db_item)

# 3. Lưu memory (non-blocking)
await save_memory(content="User requested: ...", type="history")
```

---

## 5. API Routes

### Auth (`/auth/*`)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/auth/register` | Tạo tài khoản mới |
| POST | `/auth/token` | Đăng nhập → JWT |
| GET | `/auth/me` | Lấy thông tin user hiện tại |

### Trips (`/trips/*`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/trips` | Danh sách trips của user |
| GET | `/trips/{id}` | Chi tiết 1 trip |
| GET | `/trips/{id}/itinerary` | Danh sách items của trip |
| POST | `/trips/generate` | **AI Entry Point** |
| PATCH | `/trips/{id}/itinerary` | Cập nhật toàn bộ itinerary |
| DELETE | `/trips/{id}` | Xóa trip |

### Itinerary (`/itinerary/*`)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/itinerary/{id}/confirm` | Đổi trạng thái → CONFIRMED |
| POST | `/itinerary/{id}/complete` | Đổi trạng thái → COMPLETED |

### WebSocket (`/ai/chat-stream`)
```
ws://localhost:8000/ai/chat-stream?token=<JWT>

Client → { "message": "...", "trip_id": 1 }

Server → { "type": "token",  "content": "🔍 Searching..." }
Server → { "type": "token",  "content": "📅 Planning..." }
Server → { "type": "final",  "content": "Your trip is ready!",
           "metadata": { "trip": {...}, "itinerary_items": [...] } }
```

---

## 6. Frontend – Next.js 14

```
frontend/
├── app/                     ← App Router
│   ├── layout.tsx           ← Root layout, Google Font Inter
│   ├── page.tsx             ← Redirect → /dashboard
│   ├── login/page.tsx       ← Form đăng nhập
│   ├── register/page.tsx    ← Form đăng ký
│   ├── dashboard/page.tsx   ← Danh sách trips + AI prompt
│   └── trips/[id]/page.tsx  ← Chi tiết trip
├── components/
│   ├── Dashboard.tsx        ← Timeline DnD (dnd-kit)
│   ├── InteractiveMap.tsx   ← Leaflet map + markers
│   └── ChatInterface.tsx    ← WebSocket chat sidebar
├── lib/
│   ├── api.ts               ← REST client (fetch + JWT header)
│   └── websocket.ts         ← WebSocket factory
└── types/index.ts           ← TypeScript interfaces
```

### Luồng tạo Trip từ Dashboard

```
User gõ prompt → handleGenerate()
    │
    ▼
fetchAPI("POST /trips/generate")
    │
    ▼
AI Agent xử lý (~10-20 giây)
    │
    ▼
result = { action, trip: {id: 5, ...}, itinerary_items, messages }
    │
    ▼
await loadTrips()        ← refresh danh sách
router.push(`/trips/5`) ← redirect sang trip mới
```

### `ChatInterface.tsx` – WebSocket Streaming
```typescript
// Kết nối WebSocket khi mở trang
const socket = createChatSocket(handleMessage)

// Nhận từng loại message
function handleMessage(msg: WSMessage) {
    if (msg.type === "token") {
        // Hiển thị trạng thái đang xử lý (animate)
        setMessages(prev => [...prev, { content: msg.content, loading: true }])
    }
    if (msg.type === "final") {
        // Hiển thị kết quả cuối + refresh trip data
        onTripUpdate()
    }
    if (msg.type === "error") {
        // Hiển thị lỗi màu đỏ
    }
}
```

### `InteractiveMap.tsx` – Leaflet
```typescript
// Tạo marker màu khác nhau theo type
const color = { ATTRACTION: "#818cf8", MEAL: "#f59e0b", ... }

// Vẽ route nối các điểm
L.polyline(markerPositions, { color: "#6366f1", dashArray: "5,8" })

// Popup khi click marker
L.marker([lat, lng]).bindPopup(`<b>${name}</b><br/>${address}`)
```

---

## 7. Memory System (pgvector)

```
User chat: "Tôi không ăn được hải sản"
    │
    ▼
OpenAI Embeddings API
→ vector [0.023, -0.157, 0.891, ...] (1536 chiều)
    │
    ▼
Lưu vào MemoryStream {
    content: "Tôi không ăn được hải sản",
    memory_type: "constraint",
    vector_embedding: [0.023, ...]
}

--- Lần sau user chat ---

User: "Đi Hội An 2 ngày"
    │
    ▼
embed("Đi Hội An 2 ngày") → vector_query
    │
    ▼
SELECT * FROM memory_streams
ORDER BY vector_embedding <-> vector_query  ← cosine distance
LIMIT 5
→ ["Tôi không ăn được hải sản"] ← AI nhớ và tránh gợi ý hải sản
```

---

## 8. Điểm mạnh và Hạn chế hiện tại

### ✅ Điểm mạnh
- **Async 100%**: FastAPI + asyncpg → xử lý nhiều request đồng thời
- **Modular**: mỗi node của LangGraph là 1 file độc lập, dễ thay thế
- **Type-safe**: Pydantic v2 validate mọi input/output
- **Stateful**: pgvector memory ghi nhớ user qua nhiều session

### ⚠️ Hạn chế hiện tại
- **Không có Alembic**: Schema thay đổi cần xóa-tạo lại bảng
- **CORS `allow_origins=["*"]`**: Chỉ dùng cho dev, production cần thu hẹp
- **ASK_INFO cũng qua Plan node**: Câu hỏi đơn giản vẫn tốn cả 1 LLM call để plan
- **Memory save đồng bộ**: Nếu OpenAI Embedding API timeout → memory bị bỏ qua
