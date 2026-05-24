# 🤖 Agentic AI – Phân tích Chi tiết Kiến trúc & Code

> File này giải thích **LangGraph Agent** trong dự án AI Travel Assistant:
> cơ chế hoạt động, từng node, luồng dữ liệu và toàn bộ code liên quan.

---

## 1. Agentic AI là gì?

Khác với **AI thông thường** (gửi prompt → nhận trả lời), **Agentic AI** hoạt động theo mô hình:

```
User Input
    │
    ▼
┌─────────────────────────────────┐
│          AI Agent               │
│                                 │
│  1. Quan sát  (Observe)         │
│  2. Suy nghĩ  (Reason/Plan)     │
│  3. Hành động (Act)             │
│  4. Quan sát lại kết quả       │
│  5. Lặp lại cho đến khi xong   │
└─────────────────────────────────┘
    │
    ▼
Kết quả có cấu trúc (chuyến đi hoàn chỉnh)
```

**Trong dự án này**, Agent có thể:
- **Gọi Tavily API** để tìm địa điểm thật
- **Truy vấn PostgreSQL** để lấy lịch sử
- **Gọi OpenAI** để sinh itinerary
- **Tự kiểm tra** logic (xung đột thời gian, vượt ngân sách)
- **Lưu DB** kết quả cuối cùng

---

## 2. LangGraph – Framework điều phối Agent

LangGraph là thư viện của LangChain cho phép xây dựng **State Machine** (máy trạng thái) để điều phối AI.

### Khái niệm cốt lõi

| Khái niệm | Giải thích |
|---|---|
| **State** | Một dictionary chia sẻ giữa tất cả các node |
| **Node** | Một hàm xử lý: nhận State → trả State đã cập nhật |
| **Edge** | Kết nối giữa hai node (cố định hoặc có điều kiện) |
| **Graph** | Tập hợp các Node + Edge tạo thành luồng xử lý |
| **Compile** | Biên dịch Graph thành Runnable có thể gọi được |

### Vì sao dùng LangGraph thay vì gọi LLM thẳng?

```python
# ❌ Cách đơn giản (không Agentic)
response = openai.chat("Lên lịch Đà Nẵng")
# Vấn đề: LLM không biết địa điểm thật, không lưu DB được,
#         không kiểm tra xung đột, không nhớ user

# ✅ Cách Agentic với LangGraph
result = await run_agent("Lên lịch Đà Nẵng", user_id=1, session=db)
# LangGraph tự động:
# 1. Parse intent
# 2. Tìm địa điểm thật (Tavily)
# 3. Generate itinerary (OpenAI)
# 4. Kiểm tra xung đột
# 5. Lưu DB và trả về kết quả có id
```

---

## 3. AgentState – Trái tim của Agent

**File:** `backend/app/agents/state.py`

```python
from typing import TypedDict, Optional

class AgentState(TypedDict):
    # ── INPUT (từ user) ─────────────────────────────
    user_message: str        # "Đi Đà Nẵng 3 ngày"
    user_id: int             # ID user đã đăng nhập
    trip_id: Optional[int]   # ID trip nếu đang sửa

    # ── SAU UNDERSTAND NODE ─────────────────────────
    intent: str              # "CREATE_TRIP" | "MODIFY_TRIP" | "ASK_INFO"
    entities: dict           # {location, num_days, budget, preferences...}

    # ── SAU RETRIEVE NODE ───────────────────────────
    existing_trip: Optional[dict]   # Trip hiện tại từ DB
    memory_context: list[str]       # Memories từ pgvector

    # ── SAU SEARCH NODE ─────────────────────────────
    search_results: list[dict]      # Kết quả từ Tavily

    # ── SAU PLAN NODE ───────────────────────────────
    trip_data: Optional[dict]       # Trip do AI tạo (chưa có id)
    itinerary_items: list[dict]     # Danh sách hoạt động

    # ── SAU CONSTRAINT NODE ─────────────────────────
    conflicts: list[dict]           # Xung đột thời gian/budget

    # ── SAU FINALIZE NODE ───────────────────────────
    messages: list[dict]            # Tin nhắn trả về user

    # ── INTERNAL ROUTING SIGNAL ─────────────────────
    next_node: str                  # "plan" | "retrieve" | "search"
```

**Quan trọng:** State được **truyền tuần tự** qua từng node, mỗi node chỉ cập nhật các field của mình.

---

## 4. Build Graph – Kết nối các Node

**File:** `backend/app/agents/graph.py`

```python
def build_graph(session: AsyncSession) -> StateGraph:

    # Bind DB session vào các node cần truy cập DB
    _retrieve = functools.partial(retrieve_node, session=session)
    _finalize = functools.partial(finalize_node, session=session)

    graph = StateGraph(AgentState)   # ← khai báo state schema

    # 1. Đăng ký tất cả nodes
    graph.add_node("understand", understand_node)
    graph.add_node("decision",   decision_node)
    graph.add_node("retrieve",   _retrieve)
    graph.add_node("search",     search_node)
    graph.add_node("plan",       plan_node)
    graph.add_node("constraint", constraint_node)
    graph.add_node("finalize",   _finalize)

    # 2. Entry point
    graph.set_entry_point("understand")

    # 3. Fixed edges (luôn đi theo chiều này)
    graph.add_edge("understand", "decision")
    graph.add_edge("retrieve",   "plan")
    graph.add_edge("search",     "plan")
    graph.add_edge("plan",       "constraint")
    graph.add_edge("constraint", "finalize")
    graph.add_edge("finalize",   END)

    # 4. Conditional edge (rẽ nhánh theo intent)
    graph.add_conditional_edges(
        "decision",
        route_after_decision,       # ← hàm quyết định
        {
            "plan":     "search",   # CREATE_TRIP → search trước
            "retrieve": "retrieve", # MODIFY_TRIP → lấy data cũ
            "search":   "search",   # ASK_INFO    → chỉ search
        },
    )

    return graph
```

### Sơ đồ Graph hoàn chỉnh

```
[START]
   │
   ▼
[understand] ──────────────────────── parse intent + entities
   │
   ▼
[decision] ─── route_after_decision() ──────────────
   │                                                │
   │ intent=CREATE_TRIP → "plan" → mapped to "search"
   │ intent=MODIFY_TRIP → "retrieve"
   │ intent=ASK_INFO    → "search"
   │
   ├──────────────────────┐
   ▼                      ▼
[retrieve]            [search]  ← Tavily API
   │                      │
   └──────────┬───────────┘
              ▼
           [plan]  ← OpenAI GPT-4o
              │
              ▼
        [constraint]  ← pure logic
              │
              ▼
         [finalize]  ← DB persist
              │
           [END]
```

---

## 5. Chi tiết từng Node

### Node 1: `understand_node`
**File:** `backend/app/agents/nodes/understand.py`

**Nhiệm vụ:** Gọi LLM để parse câu lệnh tự nhiên → structured JSON

```python
UNDERSTAND_PROMPT = """
User message: {message}

IMPORTANT RULES:
- Nếu user nhắc đến địa điểm + muốn đi → "CREATE_TRIP"
- Nếu muốn thay đổi kế hoạch cũ → "MODIFY_TRIP"
- Nếu chỉ hỏi thông tin → "ASK_INFO"
- Tin nhắn ngắn như "đi Đà Nẵng" → luôn là "CREATE_TRIP"
- Khi không chắc → ưu tiên "CREATE_TRIP"

Return JSON:
{
  "intent": "CREATE_TRIP",
  "entities": {
    "location": "Da Nang",
    "num_days": 3,
    "budget": null,
    "currency": "USD",
    "preferences": [],
    "constraints": []
  }
}
"""

async def understand_node(state: AgentState) -> AgentState:
    response = await llm.ainvoke(prompt)

    # Strip markdown fences nếu LLM bọc trong ```json
    content = response.content.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        # Fallback an toàn: mặc định CREATE_TRIP
        parsed = {"intent": "CREATE_TRIP", "entities": {"location": state["user_message"]}}

    state["intent"] = parsed.get("intent", "CREATE_TRIP")
    state["entities"] = parsed.get("entities", {})

    # Đảm bảo num_days không bị None
    if not state["entities"].get("num_days"):
        state["entities"]["num_days"] = 3

    return state
```

**Input State:** `user_message`  
**Output State:** `intent`, `entities`

---

### Node 2: `decision_node`
**File:** `backend/app/agents/nodes/decision.py`

**Nhiệm vụ:** Pure routing – không gọi AI, chỉ set signal routing

```python
def decision_node(state: AgentState) -> AgentState:
    intent = state.get("intent", "ASK_INFO")
    trip_id = state.get("trip_id")

    if intent == "CREATE_TRIP":
        state["next_node"] = "plan"      # → search → plan
    elif intent == "MODIFY_TRIP" or (intent == "CREATE_TRIP" and trip_id):
        state["next_node"] = "retrieve"  # → retrieve → plan
    elif intent == "ASK_INFO":
        state["next_node"] = "search"    # → search → plan
    else:
        state["next_node"] = "search"

    return state

def route_after_decision(state: AgentState) -> str:
    """LangGraph gọi hàm này để quyết định đi node nào tiếp theo."""
    return state.get("next_node", "search")
```

**Không có API call** → Nhanh nhất trong graph  
**Input State:** `intent`, `trip_id`  
**Output State:** `next_node`

---

### Node 3: `retrieve_node`
**File:** `backend/app/agents/nodes/retrieve.py`

**Nhiệm vụ:** Lấy trip hiện có + vector search memory từ DB

```python
async def retrieve_node(state: AgentState, session: AsyncSession) -> AgentState:

    # 1. Lấy trip + itinerary từ DB (cho MODIFY_TRIP)
    trip_id = state.get("trip_id")
    if trip_id:
        svc = TripService(session)
        trip = await svc.get_trip(trip_id, state["user_id"])
        items = await svc.get_itinerary_items(trip_id)

        state["existing_trip"] = trip.model_dump() if trip else None
        state["itinerary_items"] = [item.model_dump() for item in items]

    # 2. Vector search: tìm memories liên quan đến user message
    memories = await retrieve_memory(
        session=session,
        user_id=state["user_id"],
        query=state["user_message"],  # ← embed câu này
        top_k=5
    )
    state["memory_context"] = [m.content for m in memories]

    return state
```

**Cơ chế Vector Search (pgvector):**
```sql
-- Tìm 5 memories gần nhất về mặt ngữ nghĩa
SELECT content
FROM memory_streams
WHERE user_id = $1
ORDER BY vector_embedding <-> $2   -- <-> = cosine distance
LIMIT 5;
```

**Input State:** `trip_id`, `user_id`, `user_message`  
**Output State:** `existing_trip`, `itinerary_items`, `memory_context`

---

### Node 4: `search_node`
**File:** `backend/app/agents/nodes/search.py`

**Nhiệm vụ:** Tìm kiếm thông tin địa điểm thật từ web (Tavily API)

```python
async def search_node(state: AgentState) -> AgentState:
    entities = state.get("entities", {})
    location = entities.get("location") or "Vietnam"

    queries = [
        f"best tourist attractions in {location}",
        f"best local food restaurants in {location}",
        f"travel tips and transportation in {location}",
    ]

    results = []
    for query in queries:
        # Tavily trả về kết quả web thực tế
        data = await tool.search(query, max_results=3)
        results.extend(data.get("results", []))

    state["search_results"] = results[:10]  # giới hạn 10
    return state
```

**Tavily trả về gì?**
```json
{
  "results": [
    {
      "title": "Top 10 attractions in Da Nang",
      "content": "Ba Na Hills, My Khe Beach, Dragon Bridge...",
      "url": "https://..."
    }
  ]
}
```

**Input State:** `entities.location`  
**Output State:** `search_results`

---

### Node 5: `plan_node`
**File:** `backend/app/agents/nodes/plan.py`

**Nhiệm vụ:** Gọi GPT-4o để sinh lịch trình chi tiết từ tất cả thông tin đã thu thập

```python
PLAN_PROMPT = """
You are a professional travel planner.

User request: {user_message}
Destination: {location}         # "Da Nang, Vietnam"
Start date: {start_date}        # "2026-04-10"
End date: {end_date}            # "2026-04-12"
Budget: {budget} {currency}     # "3000000 VND"
Preferences: {preferences}      # "bún chả, phở"
Search results: {search_results} # Từ Tavily
Past memories: {memory_context}  # Từ pgvector

Generate day-by-day itinerary as JSON:
{
  "trip": {
    "title": "Khám phá Đà Nẵng 3 ngày",
    "destination": "Da Nang, Vietnam",
    "start_date": "2026-04-10",
    "end_date": "2026-04-12",
    "total_budget": 3000000,
    "currency": "VND"
  },
  "itinerary_items": [
    {
      "day_number": 1,
      "start_time": "08:00",
      "end_time": "10:00",
      "type": "ATTRACTION",
      "activity_details": {
        "name": "Bãi biển Mỹ Khê",
        "address": "Võ Nguyên Giáp, Mỹ An",
        "lat": 16.0544,          # ← tọa độ thật cho bản đồ
        "lng": 108.2477,
        "note": "Bãi biển đẹp nhất Đà Nẵng",
        "estimated_cost": 0
      }
    }
  ],
  "messages": [{"role": "assistant", "content": "Tôi đã lên kế hoạch cho bạn!"}]
}
"""

async def plan_node(state: AgentState) -> AgentState:
    # Chuẩn hóa None values từ entities
    location  = entities.get("location") or "Unknown destination"
    budget    = entities.get("budget") or 500
    currency  = entities.get("currency") or "USD"
    num_days  = int(entities.get("num_days") or 3)

    response = await llm.ainvoke(prompt)
    parsed = json.loads(clean_response(response.content))

    # Sanitize: đảm bảo total_budget không bao giờ là None
    trip = parsed.get("trip") or {}
    trip["total_budget"] = float(trip.get("total_budget") or 0)

    state["trip_data"] = trip
    state["itinerary_items"] = parsed.get("itinerary_items") or []
    state["messages"] = parsed.get("messages", [])
    return state
```

**Input State:** `entities`, `search_results`, `memory_context`, `existing_trip`  
**Output State:** `trip_data`, `itinerary_items`, `messages`

---

### Node 6: `constraint_node`
**File:** `backend/app/agents/nodes/constraint.py`

**Nhiệm vụ:** Kiểm tra logic – không gọi AI, pure Python

```python
async def constraint_node(state: AgentState) -> AgentState:
    items = state.get("itinerary_items", [])
    trip  = state.get("trip_data") or {}
    total_budget = float(trip.get("total_budget") or float("inf"))
    conflicts = []

    # ── Check 1: Time Overlap ───────────────────────────
    # Nhóm items theo ngày, kiểm tra overlap
    by_day = defaultdict(list)
    for item in items:
        by_day[item.get("day_number", 1)].append(item)

    for day, day_items in by_day.items():
        sorted_items = sort_by_start_time(day_items)
        for i in range(len(sorted_items) - 1):
            curr_end   = parse_time(sorted_items[i]["end_time"])
            next_start = parse_time(sorted_items[i+1]["start_time"])
            if curr_end and next_start and curr_end > next_start:
                conflicts.append({
                    "type": "TIME_OVERLAP",
                    "day": day,
                    "message": f"Day {day}: '{sorted_items[i]['name']}' overlaps with next activity"
                })

    # ── Check 2: Budget Exceeded ──────────────────────
    total_estimated = sum(
        float(item.get("activity_details", {}).get("estimated_cost") or 0)
        for item in items
    )
    if total_estimated > total_budget and total_budget != float("inf"):
        conflicts.append({
            "type": "BUDGET_EXCEEDED",
            "message": f"Total cost {total_estimated} exceeds budget {total_budget}"
        })

    state["conflicts"] = conflicts
    return state
```

**Input State:** `itinerary_items`, `trip_data`  
**Output State:** `conflicts`

---

### Node 7: `finalize_node`
**File:** `backend/app/agents/nodes/finalize.py`

**Nhiệm vụ:** Persist tất cả vào DB + lưu memory + build response

```python
async def finalize_node(state: AgentState, session: AsyncSession) -> AgentState:
    intent = state.get("intent", "ASK_INFO")
    svc = TripService(session)

    if intent in ("CREATE_TRIP", "MODIFY_TRIP") and state.get("trip_data"):
        trip_data = state["trip_data"]

        if intent == "CREATE_TRIP":
            # 1. Tạo Trip trong DB
            saved_trip = await svc.create_trip(TripCreate(
                title=trip_data.get("title") or "My Trip",
                destination=trip_data.get("destination") or "",
                total_budget=float(trip_data.get("total_budget") or 0),
                currency=trip_data.get("currency") or "USD",
                ...
            ), user_id)

            # 2. ⭐ Quan trọng: ghi DB id ngược về state
            #    Để frontend có thể redirect đến /trips/{id}
            state["trip_data"] = {**trip_data, "id": saved_trip.id}

        # 3. Tạo từng ItineraryItem trong DB
        for item_dict in state.get("itinerary_items", []):
            try:
                db_item = ItineraryItem(
                    trip_id=saved_trip.id,
                    day_number=item_dict.get("day_number", 1),
                    start_time=parse_time(item_dict.get("start_time")),
                    end_time=parse_time(item_dict.get("end_time")),
                    type=ItemType(item_dict.get("type", "ATTRACTION")),
                    activity_details=item_dict.get("activity_details", {}),
                )
                session.add(db_item)
            except Exception:
                pass  # Skip item lỗi, không crash cả flow

        await session.commit()

        # 4. Lưu memory (non-blocking, catch exception)
        try:
            await save_memory(
                session=session,
                user_id=user_id,
                content=f"User requested: {state['user_message']}",
                memory_type="history",
                trip_id=saved_trip.id,
            )
        except Exception:
            pass  # Memory lỗi không ảnh hưởng flow chính

    return state
```

**Input State:** toàn bộ  
**Output State:** `trip_data` (với `id` từ DB), `messages`

---

## 6. Hai chế độ chạy Agent

### Chế độ 1: `run_agent()` – REST API
**Dùng cho:** `POST /trips/generate`

```python
async def run_agent(user_message, user_id, session, trip_id=None) -> dict:
    graph = build_graph(session)
    compiled = graph.compile()

    # Chạy tuần tự, chờ kết quả cuối
    final_state = await compiled.ainvoke(initial_state)

    return {
        "action":          final_state.get("intent"),
        "trip":            final_state.get("trip_data"),   # có id từ DB
        "itinerary_items": final_state.get("itinerary_items"),
        "conflicts":       final_state.get("conflicts"),
        "messages":        final_state.get("messages"),
    }
```

### Chế độ 2: `run_agent_streaming()` – WebSocket
**Dùng cho:** `WS /ai/chat-stream`

```python
async def run_agent_streaming(...) -> AsyncGenerator[dict, None]:
    async for event in compiled.astream(initial_state):
        for node_name, node_output in event.items():
            # Mỗi node hoàn thành → emit 1 event về client
            if node_name == "understand":
                yield {"type": "token", "content": "🔍 Understanding..."}

            elif node_name == "search":
                yield {"type": "token", "content": "🌐 Searching places..."}

            elif node_name == "plan":
                yield {"type": "token", "content": "📅 Creating itinerary..."}

            elif node_name == "finalize":
                yield {
                    "type": "final",
                    "content": "Your trip is ready! 🎉",
                    "metadata": {
                        "trip": node_output.get("trip_data"),
                        "itinerary_items": node_output.get("itinerary_items"),
                    }
                }
```

**Khác biệt:** REST chờ kết quả cuối, WebSocket emit từng bước → UX tốt hơn

---

## 7. Memory System – pgvector

### Lưu Memory
```python
async def save_memory(session, user_id, content, memory_type, trip_id=None):
    # 1. Gọi OpenAI để embed content thành vector 1536 chiều
    embedding = await openai.embeddings.create(
        input=content,
        model="text-embedding-3-small"
    )
    vector = embedding.data[0].embedding  # list[float], len=1536

    # 2. Lưu vào DB
    memory = MemoryStream(
        user_id=user_id,
        content=content,
        memory_type=memory_type,
        vector_embedding=vector,
        trip_id=trip_id,
    )
    session.add(memory)
    await session.commit()
```

### Truy xuất Memory (Semantic Search)
```python
async def retrieve_memory(session, user_id, query, top_k=5):
    # 1. Embed câu query
    query_vector = await embed(query)

    # 2. Tìm memories gần nhất theo cosine similarity
    result = await session.execute(
        text("""
            SELECT *, 1 - (vector_embedding <-> :qv) AS similarity
            FROM memory_streams
            WHERE user_id = :uid
            ORDER BY vector_embedding <-> :qv
            LIMIT :k
        """),
        {"uid": user_id, "qv": str(query_vector), "k": top_k}
    )
    return result.fetchall()
```

**Ví dụ thực tế:**
```
User nói: "Tôi không ăn được đồ cay"
→ Lưu vào memory_streams với vector embedding

Lần sau user: "Đi Hội An ăn gì ngon?"
→ embed("Đi Hội An ăn gì ngon?")
→ cosine similarity với "Tôi không ăn được đồ cay" = 0.78 (cao)
→ AI nhớ preference: tránh gợi ý đồ cay
```

---

## 8. Inject DB Session vào Node

Đây là điểm tinh tế của thiết kế:

```python
# ❌ KHÔNG thể làm thế này trong LangGraph
graph.add_node("finalize", finalize_node(session))  # sai

# ✅ Dùng functools.partial để bind session vào function
_finalize = functools.partial(finalize_node, session=session)
graph.add_node("finalize", _finalize)

# Kết quả: LangGraph gọi _finalize(state) → tương đương finalize_node(state, session=session)
```

**Lý do cần làm vậy:**
- LangGraph node chỉ nhận `state` làm argument
- Nhưng `finalize_node` cần `session` (async DB connection)
- `functools.partial` "đóng gói" session vào trước, giữ interface `(state) -> state`

---

## 9. Luồng Dữ liệu Đầy đủ – Ví dụ Thực tế

**Input:** User gõ `"Đi Đà Nẵng 3 ngày"`

```
[understand_node]
  Input:  user_message = "Đi Đà Nẵng 3 ngày"
  LLM:    → {intent: "CREATE_TRIP", entities: {location: "Da Nang", num_days: 3}}
  Output: state.intent = "CREATE_TRIP"
          state.entities = {location: "Da Nang", num_days: 3, ...}

[decision_node]
  Input:  intent = "CREATE_TRIP"
  Logic:  next_node = "plan"
  Output: state.next_node = "plan"

[search_node]  ← "plan" → mapped to "search" edge
  Input:  entities.location = "Da Nang"
  Tavily: search("best attractions in Da Nang")
          search("best food in Da Nang")
  Output: state.search_results = [{title, content}, ...]

[plan_node]
  Input:  location, dates, search_results, memory_context
  GPT-4o: generate full JSON itinerary
  Output: state.trip_data = {title, destination, total_budget: 3000000, ...}
          state.itinerary_items = [9 items với lat/lng]

[constraint_node]
  Input:  itinerary_items, trip_data.total_budget
  Logic:  check time overlaps + budget
  Output: state.conflicts = []  (không có conflict)

[finalize_node]
  Input:  trip_data, itinerary_items, user_id
  DB:     INSERT INTO trips → id = 5
          INSERT INTO itinerary_items (9 rows)
          INSERT INTO memory_streams (embedding of user message)
  Output: state.trip_data.id = 5  ← key cho frontend redirect
          state.messages = [{"role": "assistant", "content": "Chuyến đi đã sẵn sàng!"}]

[REST Response]
{
  "action": "CREATE_TRIP",
  "trip": {"id": 5, "title": "Khám phá Đà Nẵng", ...},
  "itinerary_items": [...],
  "messages": [...]
}

[Frontend]
  result.trip.id = 5
  → router.push("/trips/5")   ← redirect đến trang trip
```

---

## 10. Những Bug Đã Fix và Bài Học

| Bug | Nguyên nhân | Bài học |
|---|---|---|
| Intent sai với câu ngắn | LLM classify "đi Đà Nẵng" là ASK_INFO | Thêm explicit rules vào prompt |
| `float(None)` crash | LLM trả về `"total_budget": null` | Luôn dùng `or` thay vì default trong `.get()` |
| Frontend không redirect | `trip_data` thiếu `id` sau DB save | Phải ghi ngược `saved_trip.id` vào state |
| JSON parse fail | LLM bọc JSON trong ` ```json ``` ` | Strip markdown fences trước khi parse |
| CORS block register | `allow_origins` list từ env bị ignore | Dùng `["*"]` cho dev, bỏ `allow_credentials` |
