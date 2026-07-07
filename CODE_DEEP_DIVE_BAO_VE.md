# Code Deep Dive - AI Travel Assistant

Tai lieu nay dung de doc hieu code theo huong bao ve do an: khong chi biet file nao lam gi, ma phai nam duoc **luong du lieu**, **ly do thiet ke**, **cach cac module phoi hop**, va **cach tra loi khi bi hoi phan bien**.

Du an la mot he thong **AI Travel Assistant** gom:

- Frontend: Next.js, React, TailwindCSS.
- Backend: FastAPI, SQLModel, SQLAlchemy async.
- Database: PostgreSQL + pgvector.
- AI layer: LangGraph + OpenAI + Tavily/Search + Weather + Booking/GDS services.
- Realtime: WebSocket cho chat AI va sync itinerary.

---

## Table Of Contents

1. [Tong Quan He Thong](#1-tong-quan-he-thong)
2. [Cau Truc Thu Muc](#2-cau-truc-thu-muc)
3. [Luong Chay Tong The Tu Frontend Den Backend](#3-luong-chay-tong-the-tu-frontend-den-backend)
4. [Backend Entry Point: FastAPI App](#4-backend-entry-point-fastapi-app)
5. [Cau Hinh He Thong](#5-cau-hinh-he-thong)
6. [Database Layer Va Async Session](#6-database-layer-va-async-session)
7. [Auth, Password Hashing Va JWT](#7-auth-password-hashing-va-jwt)
8. [Domain Models: Cac Bang Chinh](#8-domain-models-cac-bang-chinh)
9. [TripService: Lop Nghiep Vu Trung Tam](#9-tripservice-lop-nghiep-vu-trung-tam)
10. [Trips Routes: API Quan Ly Chuyen Di](#10-trips-routes-api-quan-ly-chuyen-di)
11. [Itinerary Routes: Xac Nhan Va Hoan Thanh Hoat Dong](#11-itinerary-routes-xac-nhan-va-hoan-thanh-hoat-dong)
12. [AI Agent Architecture Voi LangGraph](#12-ai-agent-architecture-voi-langgraph)
13. [AgentState: Bo Nho Tam Thoi Cua Mot Lan Chay Agent](#13-agentstate-bo-nho-tam-thoi-cua-mot-lan-chay-agent)
14. [Understand Node: Hieu Intent Va Extract Entities](#14-understand-node-hieu-intent-va-extract-entities)
15. [Supervisor Node: Chon Agent Con](#15-supervisor-node-chon-agent-con)
16. [Planning Agent: Tao Va Sua Lich Trinh](#16-planning-agent-tao-va-sua-lich-trinh)
17. [Search Node: Grounding Bang Tavily Va GDS Offers](#17-search-node-grounding-bang-tavily-va-gds-offers)
18. [Weather-Aware Planning](#18-weather-aware-planning)
19. [Plan Node: Prompt Sinh Itinerary JSON](#19-plan-node-prompt-sinh-itinerary-json)
20. [Constraint Node: Kiem Tra Xung Dot](#20-constraint-node-kiem-tra-xung-dot)
21. [Finalize Node: Luu Ket Qua AI Vao Database](#21-finalize-node-luu-ket-qua-ai-vao-database)
22. [Info Agent: Hoi Dap Thong Tin Du Lich](#22-info-agent-hoi-dap-thong-tin-du-lich)
23. [Booking Agent: Tim Chuyen Bay Va Khach San](#23-booking-agent-tim-chuyen-bay-va-khach-san)
24. [Memory Service Va pgvector](#24-memory-service-va-pgvector)
25. [WebSocket Chat Streaming](#25-websocket-chat-streaming)
26. [WebSocket Sync Itinerary](#26-websocket-sync-itinerary)
27. [Booking Flow: Flight/Hotel Booking](#27-booking-flow-flighthotel-booking)
28. [Payment Flow: VNPay](#28-payment-flow-vnpay)
29. [Collaborator, Invite Va Notification](#29-collaborator-invite-va-notification)
30. [Frontend Architecture](#30-frontend-architecture)
31. [Frontend API Client](#31-frontend-api-client)
32. [Dashboard: Tao Trip Bang AI](#32-dashboard-tao-trip-bang-ai)
33. [Trip Detail Page: Timeline, Map, Weather, Budget, Chat](#33-trip-detail-page-timeline-map-weather-budget-chat)
34. [ChatInterface: Realtime AI Copilot](#34-chatinterface-realtime-ai-copilot)
35. [Dashboard Component: Timeline, Drag-Drop, Confirm, Payment](#35-dashboard-component-timeline-drag-drop-confirm-payment)
36. [Docker Compose Va Cach Cac Service Noi Voi Nhau](#36-docker-compose-va-cach-cac-service-noi-voi-nhau)
37. [Cac Diem Manh De Noi Khi Bao Ve](#37-cac-diem-manh-de-noi-khi-bao-ve)
38. [Cac Diem Can Chu Y Khi Bi Phan Bien](#38-cac-diem-can-chu-y-khi-bi-phan-bien)
39. [Bo Cau Hoi Phan Bien Va Cach Tra Loi](#39-bo-cau-hoi-phan-bien-va-cach-tra-loi)
40. [Ban Tom Tat 3 Phut De Thuyet Trinh Code](#40-ban-tom-tat-3-phut-de-thuyet-trinh-code)

---

## 1. Tong Quan He Thong

Du an nay la mot ung dung lap ke hoach du lich bang AI. Nguoi dung co the:

- Dang ky, dang nhap.
- Tao chuyen di bang ngon ngu tu nhien.
- Tao chuyen di bang form guided planner.
- Xem lich trinh theo ngay.
- Xac nhan tung hoat dong.
- Keo tha sap xep lai itinerary.
- Xem ban do, thoi tiet, ngan sach.
- Chat voi AI de sua lich trinh hoac hoi thong tin.
- Moi nguoi khac cong tac trong trip.
- Dat gia lap ve may bay/khach san.
- Thanh toan bang VNPay sau khi confirm.

He thong duoc thiet ke theo mo hinh:

```text
Browser / Next.js
    |
    | REST API + JWT
    | WebSocket + JWT query token
    v
FastAPI Backend
    |
    | SQLAlchemy async / SQLModel
    v
PostgreSQL + pgvector
    |
    +-- Users, Trips, Itinerary, Booking, Notification
    +-- Memory vector embeddings

FastAPI Backend
    |
    +-- LangGraph Agent
          |
          +-- OpenAI LLM
          +-- OpenAI Embeddings
          +-- Tavily Search
          +-- WeatherAPI
          +-- Travelport / Booking.com services
```

Dieu quan trong nhat khi bao ve: day khong phai ung dung CRUD don thuan. Diem khac biet nam o **Agentic AI workflow**:

```text
understand -> supervisor -> planning/info/booking subgraph
```

AI khong chi tra loi text. No:

1. Hieu y dinh nguoi dung.
2. Chon nhanh agent phu hop.
3. Lay context tu DB va memory.
4. Tim thong tin ngoai qua search/weather/booking services.
5. Sinh lich trinh co cau truc JSON.
6. Kiem tra rang buoc thoi gian/ngan sach.
7. Luu ket qua vao database.
8. Day ket qua realtime ve frontend.

Cach noi ngan gon khi bao ve:

> He thong cua em ket hop full-stack web application voi mot tang agentic AI. Frontend Next.js phu trach giao dien va tuong tac realtime. Backend FastAPI xu ly authentication, business logic, WebSocket va agent orchestration. PostgreSQL luu du lieu nghiep vu, con pgvector luu embedding memory de AI co kha nang nho ngu canh dai han.

---

## 2. Cau Truc Thu Muc

Phan nay giai thich **thu muc nao chua loai code gi**, va **moi file chinh co nhiem vu gi**. Khi bao ve, neu thay chi vao mot file bat ky, m can noi duoc file do nam o tang nao: UI, API route, business service, database model, AI agent node, hay external integration.

### 2.1. Tong quan cay thu muc

Repo co 2 ung dung chinh:

- `backend/`: server FastAPI, AI agent, database models, services, API routes.
- `frontend/`: ung dung Next.js, giao dien nguoi dung, API client, WebSocket client.

Ngoai ra o root co cac file tai lieu, Docker va file phuc vu bao cao.

```text
backend/
  app/
    main.py
    core/
      config.py
      database.py
      security.py
      socket_manager.py
    models/
      user.py
      trip.py
      itinerary.py
      memory.py
      booking.py
      notification.py
    routes/
      auth.py
      trips.py
      itinerary.py
      ai_chat.py
      booking.py
      payment.py
      notifications.py
    services/
      trip_service.py
      memory_service.py
      weather_service.py
      travelport_service.py
      booking_com_service.py
      vnpay_service.py
    agents/
      graph.py
      state.py
      tools.py
      nodes/
      subgraphs/

frontend/
  app/
    page.tsx
    dashboard/
    trips/[id]/
    login/
    register/
  components/
    ChatInterface.tsx
    Dashboard.tsx
    GuidedPlanner.tsx
    InteractiveMap.tsx
    TripBudget.tsx
    WeatherInsight.tsx
  lib/
    api.ts
    websocket.ts
    currency.ts
  types/
    index.ts
```

### 2.2. Cac file o thu muc goc

```text
README.md
docker-compose.yml
.env.example
CODE_DEEP_DIVE_BAO_VE.md
BaoCao_ThietKe_XayDung_Draft.tex
KIEN_TRUC_HE_THONG_THUYET_TRINH.md
FEATURES.md
AGENTIC_AI.md
PROGRESS.md
section_2_2_functional_overview.md
section_2_3_functional_description.md
section_2_4_non_functional_requirements.md
```

Giai thich:

- `README.md`: huong dan chay du an bang Docker hoac chay tung service thu cong. Khi hoi "lam sao setup project", doc file nay.
- `docker-compose.yml`: khai bao 3 service chinh: `postgres`, `backend`, `frontend`. Day la file quan trong de giai thich cach cac service noi voi nhau.
- `.env.example`: mau bien moi truong. Chua cac key nhu OpenAI, Tavily, WeatherAPI, SMTP, Travelport, Booking.com, VNPay.
- `CODE_DEEP_DIVE_BAO_VE.md`: tai lieu nay, dung de hoc giai thich code.
- `BaoCao_ThietKe_XayDung_Draft.tex`: ban bao cao LaTeX.
- `KIEN_TRUC_HE_THONG_THUYET_TRINH.md`: tai lieu giai thich kien truc he thong cho thuyet trinh.
- `FEATURES.md`: mo ta cac tinh nang cua he thong.
- `AGENTIC_AI.md`: tai lieu rieng ve phan agentic AI.
- `PROGRESS.md`: ghi tien do/thay doi trong qua trinh lam.
- `section_2_*.md`: cac phan noi dung phuc vu bao cao, gom tong quan chuc nang, mo ta chuc nang, yeu cau phi chuc nang.

Neu can noi ngan gon:

> Thu muc goc chua file van hanh va tai lieu. `docker-compose.yml` la file khoi dong he thong, `.env.example` la mau cau hinh, con cac file `.md`/`.tex` phuc vu bao cao va thuyet trinh.

---

### 2.3. Backend root

```text
backend/
  Dockerfile
  requirements.txt
  check_db.py
  debug_coords.py
  debug_email.py
  dump.py
  test_vnpay.py
  app/
```

Giai thich:

- `backend/Dockerfile`: mo ta cach build Docker image cho backend. Docker Compose dung file nay de tao container `travel_backend`.
- `backend/requirements.txt`: danh sach Python dependencies: FastAPI, SQLModel, SQLAlchemy, LangGraph/LangChain, OpenAI, pgvector, httpx, bcrypt, jose, v.v.
- `backend/check_db.py`: script phu de kiem tra database/ket noi DB.
- `backend/debug_coords.py`: script debug toa do/geocoding.
- `backend/debug_email.py`: script debug gui email/SMTP.
- `backend/dump.py`: script phu de dump/kiem tra du lieu trong DB.
- `backend/test_vnpay.py`: script test rieng phan VNPay.
- `backend/app/`: ma nguon chinh cua backend.

Nhung file debug/test o backend root khong phai luong chay chinh cua app. Khi bao ve, neu thoi gian ngan, tap trung vao `backend/app/`.

---

### 2.4. Backend app

```text
backend/app/
  __init__.py
  main.py
  core/
  models/
  routes/
  services/
  agents/
```

- `__init__.py`: danh dau `app` la Python package.
- `main.py`: entry point cua FastAPI. Tao app, cau hinh CORS, goi lifespan, include routers. Day la file dau tien nen doc khi hieu backend.
- `core/`: cac thanh phan nen tang dung chung: config, database, security, socket manager.
- `models/`: SQLModel schemas, tuong ung cac bang database va request/response schemas.
- `routes/`: API endpoints FastAPI.
- `services/`: business logic va external integrations.
- `agents/`: LangGraph AI agent workflow.

Cach noi khi bao ve:

> Backend duoc chia theo tang. `routes` nhan request, `services` xu ly nghiep vu, `models` dinh nghia du lieu, `core` chua ha tang dung chung, con `agents` chua workflow AI.

---

### 2.5. Backend core

```text
backend/app/core/
  __init__.py
  config.py
  database.py
  security.py
  socket_manager.py
```

#### `config.py`

Nhiem vu:

- Dinh nghia class `Settings`.
- Doc bien moi truong tu `.env`.
- Gom cac cau hinh: app name, database URL, JWT secret, OpenAI, Tavily, WeatherAPI, SMTP, Travelport, Booking.com, VNPay.
- Cung cap `get_settings()` co `lru_cache`.

Khi nao duoc dung:

- `main.py` lay `APP_NAME`.
- `database.py` lay `DATABASE_URL`.
- `security.py` lay `SECRET_KEY`, `ALGORITHM`.
- AI services lay OpenAI/Tavily/Weather/Travelport keys.

#### `database.py`

Nhiem vu:

- Tao async database engine.
- Tao `AsyncSessionLocal`.
- Tao bang va enable pgvector extension.
- Cung cap dependency `get_session()`.

No la cau noi giua FastAPI va PostgreSQL.

#### `security.py`

Nhiem vu:

- Hash password bang bcrypt.
- Verify password.
- Tao JWT access token.
- Decode JWT.
- Dependency `get_current_user()` de bao ve route.

File nay tra loi cau hoi "he thong xac thuc nguoi dung nhu the nao".

#### `socket_manager.py`

Nhiem vu:

- Quan ly cac WebSocket connection theo `trip_id`.
- Moi trip la mot room.
- Broadcast message nhu `REFRESH_ITINERARY` cho tat ca client dang xem trip do.

File nay dung cho realtime collaboration/sync.

---

### 2.6. Backend models

```text
backend/app/models/
  __init__.py
  user.py
  trip.py
  itinerary.py
  memory.py
  booking.py
  notification.py
```

Models trong du an vua dong vai tro:

1. Database table schema, neu class co `table=True`.
2. Request/response schema, vi SQLModel/Pydantic model co the dung lam `response_model`.

#### `user.py`

Chua:

- `UserBase`: fields chung nhu email, full_name.
- `User`: bang `users`.
- `UserCreate`: schema dang ky user.
- `UserRead`: schema tra ve frontend, khong co password.
- `UserUpdate`: schema update profile.
- `UserChangePassword`: schema doi mat khau.

Nhiem vu:

- Luu tai khoan nguoi dung.
- Luu `travel_profile` dang JSON de AI ca nhan hoa.

#### `trip.py`

Chua:

- `TripStatus`: PLANNED, ACTIVE, COMPLETED.
- `TripBase`: title, destination, date, budget, currency.
- `Trip`: bang `trips`.
- `TripCreate`, `TripRead`, `TripUpdate`.
- `TripCollaborator`: bang lien ket user voi trip.
- `TripCollaboratorRead`.

Nhiem vu:

- Luu chuyen di.
- Luu collaborator va role cua nguoi duoc moi.

#### `itinerary.py`

Chua:

- `ItemType`: ATTRACTION, MEAL, TRANSPORT, LODGING, OTHER.
- `ItemStatus`: SUGGESTED, CONFIRMED, COMPLETED.
- `ItineraryItem`: bang `itinerary_items`.
- `ItineraryItemCreate`, `ItineraryItemRead`, `ItineraryItemUpdate`.

Nhiem vu:

- Luu tung hoat dong trong lich trinh.
- Moi item gan voi mot trip, mot ngay, mot khoang gio.
- `activity_details` la JSON linh hoat cho flight/hotel/meal/attraction.

#### `memory.py`

Chua:

- `MemoryStream`: bang `memory_streams`.
- `EMBEDDING_DIM = 1536`.
- `vector_embedding` dung `pgvector.sqlalchemy.Vector`.

Nhiem vu:

- Luu bo nho dai han cua AI.
- Moi memory co content text va vector embedding.
- Phuc vu retrieval bang semantic similarity.

#### `booking.py`

Chua:

- `Booking`: bang `bookings`.
- `BookingCreate`, `BookingRead`.

Nhiem vu:

- Luu thong tin dat flight/hotel.
- Luu PNR/booking reference.
- Lien ket booking voi trip va itinerary item.

#### `notification.py`

Chua:

- `Notification`: bang `notifications`.
- `NotificationRead`.

Nhiem vu:

- Luu thong bao cho user.
- Hien tai dung chinh cho trip invitation.

---

### 2.7. Backend routes

```text
backend/app/routes/
  __init__.py
  auth.py
  trips.py
  itinerary.py
  ai_chat.py
  notifications.py
  booking.py
  payment.py
```

Routes la tang nhan request HTTP/WebSocket tu frontend. Route khong nen chua qua nhieu logic phuc tap; logic chinh nen dua xuong service/agent.

#### `auth.py`

Prefix:

```text
/auth
```

Endpoints chinh:

- `POST /auth/register`: dang ky user.
- `POST /auth/token`: dang nhap, tra JWT.
- `GET /auth/me`: lay user hien tai.
- `PATCH /auth/me`: update profile.
- `PUT /auth/change-password`: doi mat khau.

No ket hop voi `security.py`.

#### `trips.py`

Prefix:

```text
/trips
```

Day la route lon nhat va quan trong nhat.

Endpoints chinh:

- `GET /trips`: danh sach trip cua user, gom owned va collaborated.
- `GET /trips/{trip_id}`: chi tiet trip.
- `PATCH /trips/{trip_id}`: update trip.
- `DELETE /trips/{trip_id}`: xoa trip.
- `GET /trips/{trip_id}/itinerary`: lay itinerary.
- `PATCH /trips/{trip_id}/itinerary`: update danh sach itinerary item.
- `GET /trips/{trip_id}/weather`: lay weather insight.
- `POST /trips/generate`: entry point tao/sua trip bang AI.
- `GET /trips/{trip_id}/items/{item_id}/alternatives`: tim flight/hotel thay the.
- `POST /trips/clone`: clone premade tour.
- Collaborator endpoints: invite, list, remove, respond.

Neu chi duoc chon mot file route de giai thich trong buoi bao ve, chon `trips.py`.

#### `itinerary.py`

Prefix:

```text
/itinerary
```

Endpoints:

- `POST /itinerary/{item_id}/confirm`: confirm mot item.
- `POST /itinerary/bulk-confirm`: confirm nhieu item.
- `POST /itinerary/{item_id}/complete`: mark completed.

No quan ly trang thai cua itinerary item sau khi AI tao goi y.

#### `ai_chat.py`

Prefix:

```text
/ai
```

WebSocket endpoints:

- `/ai/chat-stream`: chat voi AI, stream progress/final response.
- `/ai/sync/{trip_id}`: sync thay doi itinerary theo trip room.

Day la file giai thich realtime.

#### `notifications.py`

Prefix:

```text
/notifications
```

Endpoints:

- `GET /notifications`: lay notification cua current user.
- `PATCH /notifications/{notif_id}/read`: danh dau da doc.

#### `booking.py`

Prefix:

```text
/bookings
```

Endpoints:

- `GET /bookings`: lay bookings cua current user.
- `POST /bookings/flight`: dat flight, tao PNR.
- `POST /bookings/hotel`: dat hotel, tao confirmation code.

No lien ket voi `travelport_service.py` va `booking_com_service.py`.

#### `payment.py`

Prefix:

```text
/payments
```

Endpoints:

- `POST /payments/create-url`: tao URL thanh toan VNPay.
- `GET /payments/vnpay-return`: nhan redirect tu VNPay, verify signature, update trip status.

---

### 2.8. Backend services

```text
backend/app/services/
  __init__.py
  trip_service.py
  memory_service.py
  scheduler.py
  email_service.py
  weather_service.py
  travelport_service.py
  booking_com_service.py
  vnpay_service.py
```

Services la tang xu ly logic nghiep vu hoac ket noi API ngoai. Route goi service, service thao tac DB/API.

#### `trip_service.py`

Nhiem vu:

- Lay danh sach trips cua user.
- Lay mot trip co check owner/collaborator.
- Tao/sua/xoa trip.
- Lay itinerary.
- Tao/update itinerary items.
- Xoa cascade cac bang lien quan khi xoa trip.

Day la service trung tam cua nghiep vu trip.

#### `memory_service.py`

Nhiem vu:

- Goi OpenAI Embeddings.
- Luu memory kem vector embedding.
- Retrieve memory bang pgvector similarity search.

No la phan RAG/memory cua AI.

#### `scheduler.py`

Nhiem vu:

- Khoi dong background scheduler.
- Thuong dung cho reminder/notification theo thoi gian.

Trong `main.py`, scheduler duoc start trong lifespan.

#### `email_service.py`

Nhiem vu:

- Gui email qua SMTP.
- Co the dung cho notification/reminder/invite.

#### `weather_service.py`

Nhiem vu:

- Goi WeatherAPI.
- Lay forecast/future weather.
- Normalize response ve format frontend/agent de dung.
- Tao advice nhu mua cao, UV cao, can indoor backup.

#### `travelport_service.py`

Nhiem vu:

- Ket noi Travelport sandbox neu co credentials.
- Lay OAuth token Travelport.
- Search flights.
- Search hotels.
- Tao booking flight gia lap/sandbox.
- Fallback sang simulation neu thieu credentials hoac API loi.

#### `booking_com_service.py`

Nhiem vu:

- Goi Booking.com API qua RapidAPI.
- Tim destination id.
- Search hotels.
- Tao hotel booking gia lap.

#### `vnpay_service.py`

Nhiem vu:

- Tao payment URL theo format VNPay.
- Ky request bang hash secret.
- Verify payment return signature.

---

### 2.9. Backend agents

```text
backend/app/agents/
  __init__.py
  graph.py
  state.py
  tools.py
  nodes/
  subgraphs/
```

Day la phan loi AI cua do an.

#### `graph.py`

Nhiem vu:

- Build graph tong.
- Noi `understand -> supervisor -> planning/info/booking`.
- Cung cap `run_agent()` cho REST.
- Cung cap `run_agent_streaming()` cho WebSocket.
- Tao initial state.

Day la entry point cua AI agent.

#### `state.py`

Nhiem vu:

- Dinh nghia `AgentState`.
- Tat ca node doc/ghi vao state nay.
- State gom user_message, user_id, trip_id, intent, entities, memory_context, search_results, trip_data, itinerary_items, conflicts, messages, booking_results, weather_context.

#### `tools.py`

Nhiem vu:

- Dinh nghia interface `SearchTool`.
- Implement `TavilySearchTool`.
- Implement `MockSearchTool`.
- Chon search tool dua tren `TAVILY_API_KEY`.

### 2.10. Backend agents/nodes

```text
backend/app/agents/nodes/
  __init__.py
  understand.py
  retrieve.py
  search.py
  weather.py
  plan.py
  constraint.py
  finalize.py
  answer.py
  decision.py
```

Moi node la mot buoc trong AI workflow.

#### `understand.py`

Nhiem vu:

- Goi LLM de phan loai intent.
- Extract entities tu user message.
- Tao `booking_params` neu user muon search flight/hotel.

Input: `user_message`.

Output: `intent`, `entities`, `booking_params`.

#### `retrieve.py`

Nhiem vu:

- Lay user profile tu DB.
- Lay trip hien tai va itinerary neu co `trip_id`.
- Retrieve memory lien quan bang `memory_service.retrieve_memory`.

Input: `user_id`, `trip_id`, `user_message`.

Output: `user_profile`, `existing_trip`, `itinerary_items`, `memory_context`.

#### `search.py`

Nhiem vu:

- Tim thong tin diem den/nha hang/attractions bang Tavily hoac mock.
- Build query theo intent va context.
- Lay GDS offers: flight/hotel inventory tu Travelport/Booking.com.

Output: `search_results`, `gds_offers`.

#### `weather.py`

Nhiem vu:

- Lay weather context cho destination va ngay di.
- Tom tat weather thanh text de dua vao prompt planning.

Output: `weather_context`.

#### `plan.py`

Nhiem vu:

- Gom tat ca context thanh prompt lon.
- Goi LLM de sinh trip va itinerary JSON.
- Parse JSON.

Output: `trip_data`, `itinerary_items`, `messages`.

Day la file chua prompt quan trong nhat.

#### `constraint.py`

Nhiem vu:

- Kiem tra time overlap trong cung ngay.
- Kiem tra tong estimated cost co vuot budget khong.

Output: `conflicts`.

#### `finalize.py`

Nhiem vu:

- Tao/sua trip trong DB.
- Geocode dia diem de lay lat/lng.
- Luu itinerary items.
- Luu memory cua user request.
- Tao final assistant message neu can.

Day la node persist ket qua AI.

#### `answer.py`

Nhiem vu:

- Dung cho ASK_INFO.
- Tong hop search_results thanh cau tra loi tu nhien.
- Khong tao itinerary.

#### `decision.py`

File nay ton tai trong thu muc nodes. Trong kien truc hien tai, routing chinh dang nam o `supervisor.py`; neu `decision.py` khong duoc graph import thi co the la file cu hoac du phong cho thiet ke truoc do.

Khi bi hoi:

> Mot so file node co the la phan thiet ke/thu nghiem truoc. Luong agent hien tai duoc xac dinh trong `graph.py` va cac subgraph, nen file nao khong duoc import vao graph thi khong nam trong runtime path chinh.

### 2.11. Backend agents/subgraphs

```text
backend/app/agents/subgraphs/
  __init__.py
  supervisor.py
  planning.py
  info.py
  booking.py
```

#### `supervisor.py`

Nhiem vu:

- Doc `intent`.
- Set `agent_type`.
- Route sang planning/info/booking.

#### `planning.py`

Nhiem vu:

- Build planning subgraph cho CREATE_TRIP va MODIFY_TRIP.
- Noi cac node retrieve/search/weather/plan/constraint/finalize.

Luong CREATE_TRIP:

```text
planning_entry -> search -> weather_context -> plan -> constraint -> finalize
```

Luong MODIFY_TRIP:

```text
planning_entry -> retrieve -> weather_context -> plan -> constraint -> finalize
```

#### `info.py`

Nhiem vu:

- Build info subgraph cho ASK_INFO.
- Luong: `search -> answer -> finalize`.

#### `booking.py`

Nhiem vu:

- Build booking subgraph cho SEARCH_FLIGHT/SEARCH_HOTEL.
- Search flight/hotel.
- Format message final va booking results.

---

### 2.12. Frontend root

```text
frontend/
  Dockerfile
  package.json
  package-lock.json
  next.config.ts
  tsconfig.json
  postcss.config.mjs
  README.md
  CLAUDE.md
  AGENTS.md
  app/
  components/
  data/
  lib/
  public/
  types/
```

Giai thich:

- `frontend/Dockerfile`: build Docker image cho Next.js frontend.
- `package.json`: dependencies va scripts `dev`, `build`, `start`.
- `package-lock.json`: lock version dependencies.
- `next.config.ts`: cau hinh Next.js.
- `tsconfig.json`: cau hinh TypeScript.
- `postcss.config.mjs`: cau hinh PostCSS/Tailwind.
- `README.md`: huong dan rieng frontend neu co.
- `CLAUDE.md`, `AGENTS.md`: ghi chu/huong dan cho agent dev, khong phai runtime app.

---

### 2.13. Frontend app router

```text
frontend/app/
  layout.tsx
  globals.css
  page.tsx
  login/page.tsx
  register/page.tsx
  dashboard/page.tsx
  dashboard/DashboardInner.tsx
  trips/[id]/page.tsx
  profile/page.tsx
  settings/page.tsx
  budget/page.tsx
  calendar/page.tsx
  explore/page.tsx
  tours/page.tsx
  tours/[id]/page.tsx
  favicon.ico
```

#### `layout.tsx`

Root layout cua Next.js:

- Load fonts.
- Import global CSS.
- Khai bao metadata.
- Boc body chung cho toan app.

#### `globals.css`

CSS global:

- Tailwind base/utilities.
- Theme colors.
- Custom scrollbar/animation/classes neu co.

#### `page.tsx`

Landing page:

- Gioi thieu TravelAI.
- Mo ta workflow va modules.
- Link login/register.

Khong phai man hinh app chinh sau login.

#### `login/page.tsx`

Trang dang nhap:

- Lay email/password.
- Goi `login()` trong `frontend/lib/api.ts`.
- Luu token vao localStorage.
- Redirect dashboard.

#### `register/page.tsx`

Trang dang ky:

- Tao user moi.
- Gui email/password/travel_profile.
- Sau do user co the dang nhap.

#### `dashboard/page.tsx`

Wrapper page cho dashboard. Thong thuong dung de boc Suspense/Render `DashboardInner`.

#### `dashboard/DashboardInner.tsx`

Man hinh dashboard chinh sau login:

- Check token.
- Load trips.
- Load current user.
- Tao trip bang AI prompt.
- Tao trip bang GuidedPlanner.
- Hien stats va danh sach trip.
- Chon popular destination.

Day la file frontend quan trong de giai thich luong tao trip.

#### `trips/[id]/page.tsx`

Trang chi tiet mot trip:

- Lay `tripId` tu URL.
- Load trip, itinerary, weather.
- Mo WebSocket sync.
- Hien tabs timeline/map/weather/budget.
- Mo chat AI drawer.
- Hien invite/delete theo role.

Day la file frontend quan trong nhat cho luong xem/sua trip.

#### `profile/page.tsx`

Trang profile:

- Xem/cap nhat thong tin user.
- Cap nhat travel profile.

Travel profile co the duoc AI dung de ca nhan hoa.

#### `settings/page.tsx`

Trang cai dat:

- Cac tuy chon ung dung/user preference.
- Co the gom doi currency, password, display settings tuy code hien tai.

#### `budget/page.tsx`

Trang/nghiep vu ngan sach tong hop.

#### `calendar/page.tsx`

Trang lich, phuc vu xem trip/activity theo calendar.

#### `explore/page.tsx`

Trang kham pha diem den, co the day user sang guided planner voi destination da chon.

#### `tours/page.tsx` va `tours/[id]/page.tsx`

Trang tour mau:

- Hien premade tours.
- Xem chi tiet tour.
- Clone tour thanh trip cua user qua `/trips/clone`.

---

### 2.14. Frontend components

```text
frontend/components/
  ActivityDetailPanel.tsx
  ActivityFeed.tsx
  AlternativesModal.tsx
  BookingModal.tsx
  ChatInterface.tsx
  Dashboard.tsx
  DeleteConfirmModal.tsx
  FloatingCopilot.tsx
  GuidedPlanner.tsx
  InteractiveMap.tsx
  NotificationBell.tsx
  PopularDestinations.tsx
  ShareModal.tsx
  Sidebar.tsx
  StatsCard.tsx
  TripBudget.tsx
  TripCard.tsx
  WeatherInsight.tsx
```

#### `ChatInterface.tsx`

Nhiem vu:

- Tao WebSocket chat voi backend.
- Gui message + tripId.
- Nhan token/progress/final.
- Hien lich su chat.
- Render booking results trong chat.
- Mo BookingModal tu ket qua AI booking.

#### `Dashboard.tsx`

Nhiem vu:

- Hien timeline itinerary trong trip detail.
- Group items theo day.
- Drag-drop sap xep item.
- Confirm item/day/all.
- Complete item.
- Mo detail panel.
- Mo alternatives modal.
- Hien payment banner va goi VNPay.

Can chu y: ten component `Dashboard` o day khong phai dashboard page. No la timeline dashboard cua mot trip.

#### `GuidedPlanner.tsx`

Nhiem vu:

- Form tao trip co cau truc: origin, destination, date, budget, travelers, interests, pace, notes.
- Build prompt tu cac field.
- Goi callback `onGenerate(prompt)`.

Day la cach bien form thanh prompt cho AI.

#### `InteractiveMap.tsx`

Nhiem vu:

- Hien ban do Leaflet/React Leaflet.
- Lay lat/lng tu itinerary item.
- Hien marker/location/route.
- Bo qua item khong co toa do hop le.

#### `TripBudget.tsx`

Nhiem vu:

- Tinh va hien ngan sach trip.
- Breakdown chi phi theo category/type.
- Dung estimated_cost trong `activity_details`.

#### `WeatherInsight.tsx`

Nhiem vu:

- Render weather data tu `/trips/{id}/weather`.
- Hien forecast days, current weather, alerts, advice.

#### `BookingModal.tsx`

Nhiem vu:

- Form dat flight/hotel.
- Goi `bookFlight` hoac `bookHotel`.
- Hien ket qua PNR/confirmation.
- Neu booking gan voi itinerary item thi item duoc confirm.

#### `AlternativesModal.tsx`

Nhiem vu:

- Goi endpoint alternatives cho flight/hotel.
- Hien option thay the.
- Khi user chon, update itinerary item.

#### `ActivityDetailPanel.tsx`

Nhiem vu:

- Panel chi tiet mot itinerary item.
- Hien address, note, cost, booking info, weather note, v.v.

#### `ShareModal.tsx`

Nhiem vu:

- Invite collaborator bang email.
- Chon role VIEWER/EDITOR.
- Goi API collaborator.

#### `NotificationBell.tsx`

Nhiem vu:

- Hien notifications cua user.
- Xu ly invite notification.
- Mark read.

#### `Sidebar.tsx`

Nhiem vu:

- Navigation trong app.
- Hien recent trips.
- Link sang dashboard/explore/calendar/budget/settings.

#### `TripCard.tsx`

Nhiem vu:

- Card hien mot trip trong danh sach.
- Hien title, destination, date, status, image.
- Co helper lay image diem den.

#### `StatsCard.tsx`

Nhiem vu:

- Card thong ke nho tren dashboard: trips planned, destinations, active trips, total budget.

#### `PopularDestinations.tsx`

Nhiem vu:

- Hien cac diem den pho bien.
- Khi click, day destination vao GuidedPlanner.

#### `ActivityFeed.tsx`

Nhiem vu:

- Hien feed hoat dong/gan day tren dashboard.

#### `FloatingCopilot.tsx`

Nhiem vu:

- UI copilot noi neu duoc dung o mot so page.

#### `DeleteConfirmModal.tsx`

Nhiem vu:

- Modal xac nhan truoc khi xoa trip.

---

### 2.15. Frontend lib

```text
frontend/lib/
  api.ts
  websocket.ts
  currency.ts
```

#### `api.ts`

Nhiem vu:

- Chua `fetchAPI` wrapper.
- Tu dong gan `Authorization: Bearer token`.
- Xu ly 401 va redirect login.
- Export cac ham goi API: login, register, getTrips, generateTrip, confirmItem, bookFlight, etc.

Day la cau noi REST giua frontend va backend.

#### `websocket.ts`

Nhiem vu:

- Tao WebSocket connection toi `/ai/chat-stream`.
- Gui message JSON.
- Parse message backend tra ve.
- Boc thanh interface `ChatSocket`.

Day la cau noi realtime chat giua frontend va backend.

#### `currency.ts`

Nhiem vu:

- Format tien te.
- Normalize chi phi ve VND.
- Extract cost tu `activity_details`.
- Ho tro hien thi budget/thanh toan.

---

### 2.16. Frontend types

```text
frontend/types/
  index.ts
```

`index.ts` dinh nghia TypeScript interfaces mapping voi backend schemas:

- `User`.
- `Trip`.
- `ItineraryItem`.
- `ActivityDetails`.
- `TripWeather`.
- `MemoryStream`.
- `WSMessage`.
- `AgentResponse`.
- `Conflict`.

Y nghia:

> Frontend co type rieng de tranh sai field khi goi API va render UI. Cac type nay nen dong bo voi SQLModel/Pydantic schema backend.

---

### 2.17. Frontend data va public assets

```text
frontend/data/
  premadeTours.ts

frontend/public/
  destinations/
  defaults/
  *.svg
```

#### `data/premadeTours.ts`

Nhiem vu:

- Chua danh sach tour mau.
- Dung cho trang tours.
- Co the clone thanh trip that qua backend `/trips/clone`.

#### `public/destinations/`

Chua anh diem den:

- dalat.jpg.
- kyoto.jpg.
- phuquoc.jpg.
- singapore.jpg.
- dubai.jpg.
- hoian.jpg.
- hanoi.jpg.
- danang.jpg.
- etc.

`mapping.json` co the map destination name sang image file.

#### `public/defaults/`

Anh fallback/default cho trip card hoac destination khi khong co anh chinh xac.

#### `public/*.svg`

Icon/static assets cua Next.js hoac app.

---

### 2.18. Cach doc code theo muc tieu

Cach doc code:

- Muon hieu backend khoi dong: doc `backend/app/main.py`.
- Muon hieu DB: doc `backend/app/core/database.py` va `backend/app/models/*`.
- Muon hieu auth: doc `backend/app/core/security.py` va `backend/app/routes/auth.py`.
- Muon hieu tao trip: doc `frontend/app/dashboard/DashboardInner.tsx` -> `frontend/lib/api.ts` -> `backend/app/routes/trips.py` -> `backend/app/agents/graph.py`.
- Muon hieu AI: doc `backend/app/agents/state.py`, `graph.py`, `nodes/*`, `subgraphs/*`.
- Muon hieu chat realtime: doc `frontend/components/ChatInterface.tsx`, `frontend/lib/websocket.ts`, `backend/app/routes/ai_chat.py`.
- Muon hieu phan quyen: doc `backend/app/core/security.py`, `backend/app/services/trip_service.py`, `backend/app/routes/trips.py`.
- Muon hieu booking/payment: doc `frontend/components/BookingModal.tsx`, `backend/app/routes/booking.py`, `backend/app/routes/payment.py`, `backend/app/services/vnpay_service.py`.
- Muon hieu weather: doc `backend/app/services/weather_service.py`, `backend/app/agents/nodes/weather.py`, `frontend/components/WeatherInsight.tsx`.
- Muon hieu memory/RAG: doc `backend/app/models/memory.py`, `backend/app/services/memory_service.py`, `backend/app/agents/nodes/retrieve.py`.

### 2.19. Cach giai thich cau truc thu muc khi bao ve

Co the noi:

> Du an cua em chia thanh frontend va backend. Backend dung FastAPI va duoc tach theo tang: `core` chua cau hinh, database, security va WebSocket manager; `models` dinh nghia bang va schema; `routes` nhan request HTTP/WebSocket; `services` xu ly nghiep vu va goi API ngoai; `agents` chua LangGraph workflow. Frontend dung Next.js App Router, trong do `app` chua cac page, `components` chua UI tai su dung, `lib` chua API/WebSocket client, `types` chua TypeScript types, con `public` va `data` chua asset va du lieu tour mau.

---

## 3. Luong Chay Tong The Tu Frontend Den Backend

### 3.1. Tao trip bang AI tu Dashboard

Nguoi dung nhap prompt:

```text
Plan a 5-day trip to Tokyo with $1000 budget...
```

Tai frontend:

- File: `frontend/app/dashboard/DashboardInner.tsx`
- Ham: `handleGenerate`

Luoc do:

```text
User submit form
-> handleGenerate()
-> generateTrip(finalPrompt)
-> POST /trips/generate
-> backend run_agent()
-> LangGraph workflow
-> save trip + itinerary
-> return trip.id
-> router.push(`/trips/${trip.id}`)
```

Trong `frontend/lib/api.ts`:

```ts
export async function generateTrip(message: string, tripId?: number) {
  return fetchAPI('/trips/generate', {
    method: 'POST',
    body: JSON.stringify({ message, trip_id: tripId }),
  });
}
```

Nghia la frontend chi can gui message va optional `trip_id`. Neu khong co `trip_id`, backend hieu la tao chuyen moi. Neu co `trip_id`, backend hieu la sua chuyen hien co.

Tai backend:

- File: `backend/app/routes/trips.py`
- Endpoint: `POST /trips/generate`

```python
result = await run_agent(
    user_message=message,
    user_id=current_user.id,
    trip_id=trip_id,
    session=session,
)
```

Backend dua yeu cau vao agent. Agent tra ve:

- action/intent.
- trip data.
- itinerary items.
- conflicts.
- messages.
- booking results neu co.

Neu tao trip thanh cong, frontend nhan `trip.id` va redirect sang trang chi tiet.

### 3.2. Sua trip bang AI chat

Tai trang chi tiet trip:

- File: `frontend/app/trips/[id]/page.tsx`
- Component chat: `frontend/components/ChatInterface.tsx`

Nguoi dung mo AI Assistant, nhap:

```text
Doi bua toi ngay 2 sang nha hang hai san gan bien
```

Luong:

```text
ChatInterface
-> createChatSocket()
-> WebSocket /ai/chat-stream?token=...
-> send { message, trip_id }
-> backend run_agent_streaming()
-> stream token/progress
-> final message
-> broadcast REFRESH_ITINERARY
-> frontend loadData()
```

Dieu hay o day la chat khong doi HTTP response cuoi cung moi hien thi, ma backend stream trang thai qua WebSocket.

---

## 4. Backend Entry Point: FastAPI App

File: `backend/app/main.py`

Day la file khoi dong backend.

### 4.1. Import

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import create_db_and_tables
from app.routes import auth, trips, itinerary, ai_chat, notifications, booking, payment
```

Y nghia:

- `FastAPI`: framework backend.
- `CORSMiddleware`: cho frontend khac port goi API.
- `get_settings`: lay cau hinh tu env.
- `create_db_and_tables`: tao schema DB.
- `routes`: gom cac API module.

### 4.2. Settings singleton

```python
settings = get_settings()
```

Khong hard-code ten app, model, database URL trong `main.py`; tat ca lay tu `config.py`.

### 4.3. Lifespan

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    from app.services.scheduler import start_scheduler
    start_scheduler()
    yield
```

`lifespan` chay khi FastAPI startup. No dam bao DB va scheduler san sang truoc khi app nhan request.

Neu bi hoi vi sao khong tao bang bang migration:

> Trong ban demo/do an, em dung `SQLModel.metadata.create_all` de tu dong tao bang, giup setup nhanh. Neu trien khai production, nen dung Alembic migrations de quan ly version schema ro rang hon.

### 4.4. Tao app

```python
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="AI-powered travel assistant with stateful trip planning",
    lifespan=lifespan,
)
```

FastAPI tu sinh Swagger UI tai `/docs`, rat tien khi demo API.

### 4.5. CORS

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
```

Trong dev, frontend chay port 3000, backend port 8000. Browser chan cross-origin request neu backend khong khai bao CORS.

`allow_credentials=False` vi dang dung wildcard `*`. Neu dung credentials/cookie, phai chi dinh origin cu the.

### 4.6. Include routers

```python
app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(itinerary.router)
app.include_router(ai_chat.router)
app.include_router(notifications.router)
app.include_router(booking.router)
app.include_router(payment.router)
```

Moi router tu khai bao prefix:

- `/auth`
- `/trips`
- `/itinerary`
- `/ai`
- `/notifications`
- `/bookings`
- `/payments`

### 4.7. Health check

```python
@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
```

Dung de kiem tra backend co dang chay khong.

---

## 5. Cau Hinh He Thong

File: `backend/app/core/config.py`

### 5.1. Settings class

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
```

`BaseSettings` cua Pydantic tu dong doc bien moi truong va file `.env`.

`extra="ignore"` nghia la neu `.env` co bien khong khai bao trong class thi bo qua, khong loi.

### 5.2. Cac nhom cau hinh

App:

```python
APP_NAME: str = "AI Travel Assistant"
DEBUG: bool = False
```

Database:

```python
DATABASE_URL: str = "postgresql+asyncpg://travel:travelpass@localhost:5432/traveldb"
```

Security:

```python
SECRET_KEY: str = "change-me-in-production"
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
```

OpenAI:

```python
OPENAI_API_KEY: str = ""
OPENAI_MODEL: str = "gpt-4o"
OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
```

Tavily, WeatherAPI, SMTP, Travelport, RapidAPI Booking.com, VNPay.

Day la diem cong ve thiet ke:

> Cac thong tin nhay cam nhu API key, secret key, SMTP password, VNPay secret khong hard-code truc tiep trong code ma quan ly qua environment variables.

### 5.3. get_settings voi cache

```python
@lru_cache
def get_settings() -> Settings:
    return Settings()
```

Vi sao cache?

- Settings khong thay doi trong luc app chay.
- Nhieu module goi `get_settings()`.
- Cache giup tranh tao lai object va doc `.env` nhieu lan.

Tra loi phan bien:

> Em boc cau hinh vao `Settings` de dependency nao can config thi goi `get_settings()`. Ham nay co `lru_cache`, nen ve thuc te settings la singleton trong runtime.

---

## 6. Database Layer Va Async Session

File: `backend/app/core/database.py`

### 6.1. Tao async engine

```python
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)
```

`create_async_engine` tao ket noi bat dong bo toi PostgreSQL. URL dung driver `asyncpg`:

```text
postgresql+asyncpg://...
```

Vi sao async?

- FastAPI ho tro async/await.
- Nhieu API goi DB, goi HTTP ngoai, goi AI service.
- Async giup server khong bi block trong khi cho IO.

### 6.2. Session factory

```python
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
```

`sessionmaker` tao factory sinh session DB.

`expire_on_commit=False` giup object sau commit van con du lieu de doc tiep. Neu True, SQLAlchemy co the expire attributes va can lazy load lai.

### 6.3. Tao DB va table

```python
async def create_db_and_tables() -> None:
    async with engine.begin() as conn:
        await conn.execute(
            __import__("sqlalchemy").text("CREATE EXTENSION IF NOT EXISTS vector")
        )
        await conn.run_sync(SQLModel.metadata.create_all)
```

Hai viec:

1. Tao extension `vector`.
2. Tao tat ca table tu SQLModel models.

`SQLModel.metadata.create_all` doc metadata cua cac class `table=True`.

### 6.4. Dependency get_session

```python
async def get_session():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

Day la dependency cho FastAPI:

```python
session: AsyncSession = Depends(get_session)
```

Moi request co mot DB session rieng. Sau request, session duoc close.

Tra loi phan bien:

> Em dung dependency injection cua FastAPI de quan ly DB session. Moi request duoc cap mot session async, tranh chia se session giua request va dam bao ket noi duoc dong sau khi xu ly.

---

## 7. Auth, Password Hashing Va JWT

File:

- `backend/app/core/security.py`
- `backend/app/routes/auth.py`

### 7.1. Password hashing

Trong `security.py`:

```python
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
```

Mat khau khong luu plain text. Khi user dang ky:

```python
hashed_password=hash_password(user_in.password)
```

`bcrypt.gensalt()` tao salt ngau nhien. Cung mot password nhung hash co the khac nhau. Neu database bi lo, khong lay duoc password goc truc tiep.

Kiem tra password:

```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
```

### 7.2. Tao JWT

```python
def create_access_token(subject: Any, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {"sub": str(subject), "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
```

JWT payload co:

- `sub`: subject, o day la `user.id`.
- `exp`: thoi diem het han.

JWT duoc ky bang `SECRET_KEY`, algorithm `HS256`.

### 7.3. Decode token

```python
def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(...)
```

Neu token sai, het han, hoac bi sua, backend tra 401.

### 7.4. Lay current user

```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
```

FastAPI se doc header:

```text
Authorization: Bearer <token>
```

Ham:

```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
):
```

Luong:

```text
Request co Authorization header
-> oauth2_scheme lay token
-> decode_token
-> lay user_id tu payload["sub"]
-> query User trong DB
-> return user
```

Route nao can login thi khai bao:

```python
current_user: User = Depends(get_current_user)
```

### 7.5. Register route

File: `backend/app/routes/auth.py`

```python
@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, session: AsyncSession = Depends(get_session)):
```

Luong:

1. Check email da ton tai chua.
2. Hash password.
3. Tao User.
4. Commit DB.
5. Return UserRead.

Khong return `hashed_password`, vi response_model la `UserRead`.

### 7.6. Login route

```python
@router.post("/token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
```

Frontend gui form URL encoded:

```ts
const form = new URLSearchParams({ username: email, password });
```

Backend:

1. Tim user theo email.
2. Verify password.
3. Tao access token.
4. Return:

```json
{
  "access_token": "...",
  "token_type": "bearer"
}
```

Frontend luu token vao localStorage.

### 7.7. Diem can noi khi bao ve

> He thong dung bcrypt de hash password va JWT de xac thuc stateless. Sau khi dang nhap, frontend luu access token va gui trong Authorization header cho cac request sau. Backend dung dependency `get_current_user` de decode token, lay user tu DB va bao ve cac endpoint can dang nhap.

---

## 8. Domain Models: Cac Bang Chinh

Models nam trong `backend/app/models`.

### 8.1. User

File: `backend/app/models/user.py`

```python
class User(UserBase, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    travel_profile: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)
```

Bang `users` luu:

- email.
- full_name.
- hashed_password.
- travel_profile.
- created_at.
- is_active.

`travel_profile` la JSON, co the luu so thich:

```json
{
  "style": "relaxed",
  "interests": ["food", "culture"],
  "budget_level": "standard"
}
```

Dung JSON de linh hoat, vi profile co the thay doi cau truc theo thoi gian.

### 8.2. Trip

File: `backend/app/models/trip.py`

```python
class Trip(TripBase, table=True):
    __tablename__ = "trips"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    status: TripStatus = Field(default=TripStatus.PLANNED)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

Trip co:

- title.
- destination.
- start_date.
- end_date.
- total_budget.
- currency.
- user_id.
- status: PLANNED, ACTIVE, COMPLETED.

`user_id` la owner cua trip.

### 8.3. TripCollaborator

```python
class TripCollaborator(SQLModel, table=True):
    __tablename__ = "trip_collaborators"

    trip_id: int = Field(foreign_key="trips.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    role: str = Field(default="VIEWER")
    status: str = Field(default="PENDING")
```

Bang nay cho phep nguoi dung khac tham gia trip.

Role:

- OWNER: chu so huu, thuc te nam o `trips.user_id`.
- EDITOR: duoc sua lich trinh.
- VIEWER: chi xem.

Status:

- PENDING.
- ACCEPTED.
- REJECTED.

### 8.4. ItineraryItem

File: `backend/app/models/itinerary.py`

```python
class ItineraryItem(ItineraryItemBase, table=True):
    __tablename__ = "itinerary_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    status: ItemStatus = Field(default=ItemStatus.SUGGESTED)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

Base:

```python
trip_id: int
day_number: int
start_time: Optional[time]
end_time: Optional[time]
type: ItemType
activity_details: dict = Field(default_factory=dict, sa_column=Column(JSON))
```

Type:

- ATTRACTION.
- MEAL.
- TRANSPORT.
- LODGING.
- OTHER.

Status:

- SUGGESTED: AI goi y.
- CONFIRMED: user xac nhan.
- COMPLETED: da hoan thanh.

`activity_details` la JSON de luu thong tin linh hoat:

```json
{
  "name": "Hoi An Ancient Town",
  "address": "Hoi An, Quang Nam",
  "lat": 15.879,
  "lng": 108.335,
  "estimated_cost": 200000,
  "currency": "VND",
  "note": "Visit in the evening"
}
```

Viec dung JSON hop ly vi moi loai item co fields khac nhau. Flight can airline, flight_number; hotel can stars, rating; meal can restaurant note.

### 8.5. MemoryStream

File: `backend/app/models/memory.py`

```python
EMBEDDING_DIM = 1536
```

1536 la kich thuoc embedding cua `text-embedding-3-small`.

```python
class MemoryStream(MemoryStreamBase, table=True):
    __tablename__ = "memory_streams"

    vector_embedding: Optional[list[float]] = Field(
        default=None,
        sa_column=Column(Vector(EMBEDDING_DIM), nullable=True),
    )
```

Bang memory luu:

- user_id.
- trip_id optional.
- content.
- memory_type: preference/history/constraint.
- vector_embedding.
- created_at.

### 8.6. Booking

File: `backend/app/models/booking.py`

Luu booking flight/hotel:

- user_id.
- trip_id.
- itinerary_item_id.
- type: FLIGHT/HOTEL.
- pnr.
- status.
- details JSON.

### 8.7. Notification

File: `backend/app/models/notification.py`

Luu thong bao:

- user_id.
- title.
- content.
- type.
- related_id.
- is_read.

Dung cho invite collaborator.

---

## 9. TripService: Lop Nghiep Vu Trung Tam

File: `backend/app/services/trip_service.py`

`TripService` gom logic lien quan den trip va itinerary. Day la lop rat quan trong vi nhieu route khong query DB truc tiep ma goi service.

### 9.1. Constructor

```python
class TripService:
    def __init__(self, session: AsyncSession):
        self.session = session
```

Service nhan DB session tu route.

### 9.2. get_trips

```python
async def get_trips(self, user_id: int) -> list[TripRead]:
```

Ham nay lay:

1. Trip ma user la owner.
2. Trip ma user la collaborator accepted.

Voi owned trips:

```python
select(Trip).where(Trip.user_id == user_id)
```

Sau do gan:

```python
t_read.user_role = "OWNER"
```

Voi collaborator:

```python
select(Trip, TripCollaborator)
  .join(...)
  .where(TripCollaborator.user_id == user_id,
         TripCollaborator.status == "ACCEPTED")
```

Gan:

```python
t_read.user_role = c.role
```

Y nghia: frontend co the dua vao `user_role` de an/hien nut sua, xoa, invite.

### 9.3. get_trip

```python
async def get_trip(self, trip_id: int, user_id: int) -> Optional[TripRead]:
```

Ham nay dong vai tro authorization cap nghiep vu:

1. Neu user la owner -> return trip, role OWNER.
2. Neu user la collaborator ACCEPTED -> return trip, role tu collaborator.
3. Neu khong -> return None.

Day la pattern bao mat quan trong.

Tra loi khi bi hoi "lam sao ngan user xem trip cua nguoi khac?":

> Cac API trip deu goi `TripService.get_trip(trip_id, current_user.id)`. Ham nay chi return neu user la owner hoac collaborator da accept. Neu khong co quyen, route tra 404/403. Vi vay user khong the chi doi trip_id tren URL de xem trip cua nguoi khac.

### 9.4. create_trip

```python
async def create_trip(self, trip_data: TripCreate, user_id: int) -> Trip:
    trip = Trip(**trip_data.model_dump(), user_id=user_id)
    self.session.add(trip)
    await self.session.commit()
    await self.session.refresh(trip)
    return trip
```

`refresh` de lay ID do DB sinh ra.

### 9.5. update_trip

```python
update_dict = update_data.model_dump(exclude_unset=True)
```

`exclude_unset=True` chi lay field ma client gui len. Neu khong co, khong ghi de.

Sau khi update:

```python
db_trip.updated_at = datetime.utcnow()
```

### 9.6. delete_trip

```python
async def delete_trip(self, trip: TripRead) -> None:
```

Ham xoa cascade thu cong:

1. Xoa itinerary items.
2. Xoa memory streams lien quan trip.
3. Xoa collaborators.
4. Xoa trip.

Tai sao can xoa con truoc?

> Vi cac bang con co foreign key tro den trip. Neu xoa trip truoc, DB co the bao loi foreign key constraint.

### 9.7. get_itinerary

Lay item theo trip va sap xep:

```python
order_by(ItineraryItem.day_number, ItineraryItem.start_time)
```

Sau do Python sort them theo:

- day_number.
- `_sort_order` trong activity_details.
- start_time.
- id.

`_sort_order` dung khi frontend keo tha sap xep timeline.

### 9.8. update_itinerary_items

Day la ham quan trong cho drag-drop va sua itinerary bang AI.

Y tuong:

```text
existing = cac item hien co trong DB
for item client gui len:
    neu co id va id ton tai -> update
    neu khong co id -> create moi
nhung item existing con lai -> delete
commit
```

Ham nay cung convert string time:

```python
if isinstance(val, str):
    item_dict[time_field] = datetime.strptime(val, fmt).time()
```

Neu khong convert, asyncpg co the loi vi DB column la `time`, khong phai string.

---

## 10. Trips Routes: API Quan Ly Chuyen Di

File: `backend/app/routes/trips.py`

Router:

```python
router = APIRouter(prefix="/trips", tags=["trips"])
```

### 10.1. list_trips

```python
@router.get("", response_model=List[TripRead])
async def list_trips(current_user: User = Depends(get_current_user), ...)
```

Chi user da login moi lay duoc trips.

```python
svc = TripService(session)
return await svc.get_trips(current_user.id)
```

### 10.2. get_trip

```python
trip = await svc.get_trip(trip_id, current_user.id)
if not trip:
    raise HTTPException(404)
```

404 o day vua co nghia khong ton tai, vua tranh leak thong tin trip cua user khac.

### 10.3. update_trip

Truoc khi update:

```python
if trip.user_role == "VIEWER":
    raise HTTPException(403)
```

Viewer khong duoc sua.

### 10.4. get_itinerary

Truoc khi lay itinerary van check quyen qua `get_trip`. Neu user khong co quyen trip thi khong lay item.

### 10.5. get_trip_weather

```python
itinerary_items = await svc.get_itinerary(trip_id)
weather = WeatherAPIClient()
return await weather.get_trip_weather(trip, itinerary_items)
```

Weather lay destination va co the dung coordinates tu itinerary de build location query chinh xac hon.

### 10.6. update_itinerary

Dung khi frontend keo tha/sua itinerary:

```python
updated = await svc.update_itinerary_items(trip_id, items)
```

Sau khi update:

```python
await manager.broadcast_to_trip(trip_id, {"type": "REFRESH_ITINERARY"})
```

No bao cac client khac dang mo cung trip reload itinerary.

### 10.7. generate_trip

Day la entry point cua AI:

```python
@router.post("/generate")
async def generate_trip(...)
```

Input:

```json
{
  "message": "...",
  "trip_id": 123
}
```

Neu co `trip_id`, check viewer:

```python
if trip and trip.user_role == "VIEWER":
    raise HTTPException(403)
```

Sau do:

```python
result = await run_agent(...)
```

Neu la modify trip, broadcast refresh.

### 10.8. alternatives

Endpoint:

```python
GET /trips/{trip_id}/items/{item_id}/alternatives
```

Dung de tim phuong an thay the cho flight/hotel.

Neu item la TRANSPORT flight -> goi Travelport search flights.

Neu item la LODGING -> goi BookingCom search hotels.

### 10.9. clone premade tour

Endpoint:

```python
POST /trips/clone
```

Tao trip tu tour mau frontend gui len. No tao Trip roi tao ItineraryItem tu danh sach itinerary cua tour.

### 10.10. Collaborator routes

Nam trong cung `trips.py`:

- Invite collaborator.
- Get collaborators.
- Remove collaborator.
- Respond invite.

Owner moi invite/remove.

---

## 11. Itinerary Routes: Xac Nhan Va Hoan Thanh Hoat Dong

File: `backend/app/routes/itinerary.py`

Router:

```python
router = APIRouter(prefix="/itinerary", tags=["itinerary"])
```

### 11.1. _get_item_for_user

Ham helper:

```python
async def _get_item_for_user(item_id, user_id, session) -> ItineraryItem:
```

Luong:

1. Lay ItineraryItem theo item_id.
2. Lay trip cua item.
3. Goi `TripService.get_trip(item.trip_id, user_id)`.
4. Neu user khong co quyen -> 404.
5. Neu role VIEWER -> 403.
6. Return item.

Ham nay tranh lap lai logic auth cho confirm/complete.

### 11.2. confirm_item

```python
item.status = ItemStatus.CONFIRMED
item.updated_at = datetime.utcnow()
```

User chap nhan goi y cua AI.

### 11.3. bulk_confirm_items

Dung khi frontend bam "Confirm All" hoac "Confirm Day".

Dieu can chu y:

- Neu item_ids rong -> return updated 0.
- Kiem tra tat ca ids co ton tai.
- Kiem tra user co quyen voi tat ca trip lien quan.
- Chi update item dang SUGGESTED sang CONFIRMED.

### 11.4. complete_item

Chuyen status sang COMPLETED.

Dung de track tien do chuyen di.

---

## 12. AI Agent Architecture Voi LangGraph

File chinh:

- `backend/app/agents/graph.py`
- `backend/app/agents/state.py`
- `backend/app/agents/subgraphs/*`
- `backend/app/agents/nodes/*`

### 12.1. Vi sao dung LangGraph?

Neu chi goi OpenAI API truc tiep:

```text
prompt -> LLM -> text
```

Thi he thong giong chatbot binh thuong.

Nhung du an nay can:

- Phan loai intent.
- Lay memory tu DB.
- Search thong tin ngoai.
- Lay thoi tiet.
- Lay flight/hotel offers.
- Sinh JSON itinerary.
- Kiem tra rang buoc.
- Luu DB.
- Route sang info/booking/planning tuy nhu cau.

LangGraph phu hop vi bieu dien workflow nhu mot do thi node/edge.

### 12.2. Graph tong

Trong `graph.py`:

```python
Architecture:
    understand -> supervisor -> [planning | info | booking]
```

Graph co cac node:

```python
graph.add_node("understand", understand_node)
graph.add_node("supervisor", supervisor_node)
graph.add_node("planning", planning)
graph.add_node("info", info)
graph.add_node("booking", booking)
```

Edge:

```python
graph.set_entry_point("understand")
graph.add_edge("understand", "supervisor")
graph.add_conditional_edges("supervisor", route_after_supervisor, ...)
```

Noi cach khac:

```text
understand
   |
   v
supervisor
   |
   +--> planning subgraph
   +--> info subgraph
   +--> booking subgraph
```

### 12.3. run_agent

```python
async def run_agent(user_message, user_id, session, trip_id=None) -> dict:
```

Dung cho REST API `/trips/generate`.

Luong:

1. Build graph.
2. Compile graph.
3. Tao initial_state.
4. `await compiled.ainvoke(initial_state)`.
5. Return ket qua cuoi.

### 12.4. run_agent_streaming

Dung cho WebSocket chat.

```python
async for event in compiled.astream(initial_state):
```

Moi khi graph chay qua node, backend yield message:

- Sau understand: "Understanding your request..."
- Sau supervisor: "Creating itinerary..." hoac "Searching..." hoac "Thinking..."
- Sau planning/info/booking: final.

Quan trong: day khong phai token streaming that tu OpenAI tung token, ma la streaming theo tien trinh node cua graph. Khi bao ve co the noi la:

> Backend stream trang thai xu ly cua agent qua WebSocket de frontend hien thi realtime progress. Neu muon nang cap, co the stream token truc tiep tu LLM provider.

---

## 13. AgentState: Bo Nho Tam Thoi Cua Mot Lan Chay Agent

File: `backend/app/agents/state.py`

`AgentState` la TypedDict, dai dien cho state duoc truyen qua cac node cua LangGraph.

### 13.1. Input

```python
user_message: str
user_id: int
trip_id: Optional[int]
```

Day la dau vao goc.

### 13.2. Understand output

```python
intent: str
entities: dict
```

Sau understand node, agent biet:

- User muon tao trip?
- Sua trip?
- Hoi thong tin?
- Tim flight?
- Tim hotel?

Va cac entity:

- location.
- dates.
- budget.
- preferences.
- airport codes.
- adults.

### 13.3. Retrieved data

```python
existing_trip: Optional[dict]
user_profile: Optional[dict]
memory_context: list[str]
search_results: list[dict]
```

Dung cho planning/info.

### 13.4. Generated plan

```python
trip_data: Optional[dict]
itinerary_items: list[dict]
```

LLM sinh ra trip va itinerary dang JSON.

### 13.5. Constraint checking

```python
conflicts: list[dict]
```

Node constraint dua loi overlap/budget vao day.

### 13.6. Routing

```python
agent_type: str
booking_params: dict
booking_results: list
weather_context: dict
```

Du lieu rieng cho subgraph.

### 13.7. Vi sao can AgentState?

Khong node nao can biet toan bo logic. Moi node doc mot so field va ghi mot so field. Vi du:

- `understand_node`: ghi `intent`, `entities`.
- `supervisor_node`: ghi `agent_type`.
- `search_node`: ghi `search_results`, `gds_offers`.
- `weather_context_node`: ghi `weather_context`.
- `plan_node`: ghi `trip_data`, `itinerary_items`.
- `constraint_node`: ghi `conflicts`.
- `finalize_node`: luu DB va ghi `messages`.

Tra loi phan bien:

> `AgentState` giup cac node trong LangGraph trao doi du lieu co cau truc. Thay vi truyen prompt text khong kiem soat, moi buoc cua agent deu doc/ghi vao state, nen workflow ro rang va de debug.

---

## 14. Understand Node: Hieu Intent Va Extract Entities

File: `backend/app/agents/nodes/understand.py`

### 14.1. LLM setup

```python
llm = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0)
```

`temperature=0` vi task nay can output on dinh, dung JSON, khong can sang tao.

### 14.2. Prompt

Prompt yeu cau LLM tra JSON:

```text
Return a JSON object with exactly these keys:
- intent
- entities
```

Intent co the la:

- CREATE_TRIP.
- MODIFY_TRIP.
- ASK_INFO.
- SEARCH_FLIGHT.
- SEARCH_HOTEL.

Entities gom:

- location.
- start_date.
- end_date.
- num_days.
- budget.
- currency.
- preferences.
- constraints.
- origin_airport.
- destination_airport.
- city_code.
- checkin.
- checkout.
- adults.

### 14.3. Current date

```python
current_date=date.today().isoformat()
```

Prompt dua ngay hien tai vao de LLM hieu cac cau nhu "next week", "tomorrow".

### 14.4. Parse JSON

```python
content = response.content.strip()
if content.startswith("```"):
    content = content.split("```")[1]
```

Do LLM doi khi boc JSON trong markdown code fence. Code loai bo fence.

Sau do:

```python
parsed = json.loads(content) or {}
```

Neu parse loi:

```python
parsed = {
    "intent": "CREATE_TRIP",
    "entities": {"location": state["user_message"], ...},
}
```

Fallback giup he thong khong crash neu LLM tra format sai.

### 14.5. Booking params

Neu intent la SEARCH_FLIGHT hoac SEARCH_HOTEL:

```python
state["booking_params"] = {
    "origin": entities.get("origin_airport"),
    "destination": entities.get("destination_airport"),
    ...
}
```

Booking subgraph dung field nay.

Tra loi phan bien:

> Understand node la buoc bien ngon ngu tu nhien thanh du lieu co cau truc. No phan loai intent va extract entity. Sau buoc nay, cac node sau khong can tu hieu cau noi nua, ma lam viec tren state da duoc chuan hoa.

---

## 15. Supervisor Node: Chon Agent Con

File: `backend/app/agents/subgraphs/supervisor.py`

### 15.1. supervisor_node

```python
def supervisor_node(state: AgentState) -> AgentState:
    intent = state.get("intent", "ASK_INFO")

    if intent in ("CREATE_TRIP", "MODIFY_TRIP"):
        state["agent_type"] = "planning"
    elif intent in ("SEARCH_FLIGHT", "SEARCH_HOTEL"):
        state["agent_type"] = "booking"
    else:
        state["agent_type"] = "info"
```

No chi lam routing.

### 15.2. route_after_supervisor

```python
def route_after_supervisor(state: AgentState) -> str:
    return state.get("agent_type", "info")
```

LangGraph dung ket qua nay de chon edge.

### 15.3. Tai sao tach supervisor?

Neu sau nay co them agent:

- Budget optimization agent.
- Visa agent.
- Emergency support agent.
- Recommendation agent.

Chi can mo rong supervisor, khong can sua toan bo graph.

Tra loi phan bien:

> Supervisor node dong vai tro dieu phoi. No khong truc tiep lap lich, ma chon sub-agent phu hop dua tren intent. Kien truc nay de mo rong hon cach viet mot ham if/else lon.

---

## 16. Planning Agent: Tao Va Sua Lich Trinh

File: `backend/app/agents/subgraphs/planning.py`

Planning subgraph xu ly:

- CREATE_TRIP.
- MODIFY_TRIP.

### 16.1. Build graph

```python
graph.add_node("planning_entry", planning_entry_node)
graph.add_node("retrieve", _retrieve)
graph.add_node("search", search_node)
graph.add_node("weather_context", weather_context_node)
graph.add_node("plan", plan_node)
graph.add_node("constraint", constraint_node)
graph.add_node("finalize", _finalize)
```

### 16.2. Entry routing

```python
def route_planning_entry(state: AgentState) -> str:
    return "search" if state.get("intent") == "CREATE_TRIP" else "retrieve"
```

Neu tao moi:

```text
planning_entry -> search -> weather_context -> plan -> constraint -> finalize
```

Neu sua trip:

```text
planning_entry -> retrieve -> weather_context -> plan -> constraint -> finalize
```

Can chu y: trong code hien tai, MODIFY_TRIP di qua `retrieve` roi thang `weather_context`, khong di qua `search`. Nen khi sua trip, no uu tien du lieu hien co/memory hon search moi. Neu muon sua de hoi thong tin moi, co the them edge retrieve -> search -> weather_context.

### 16.3. Vai tro tung node

- `retrieve`: lay trip hien tai, itinerary hien tai, user profile, memory.
- `search`: lay thong tin diem den, nha hang, attraction, GDS offers.
- `weather_context`: lay du bao thoi tiet.
- `plan`: goi LLM sinh trip/itinerary JSON.
- `constraint`: check time overlap va budget.
- `finalize`: luu DB, geocode, save memory, tao message.

Tra loi phan bien:

> Planning agent khong sinh lich trinh ngay lap tuc. No gom nhieu buoc: lay context, grounding bang search va weather, sinh itinerary, kiem tra rang buoc, roi moi persist vao DB. Day la diem the hien tinh agentic thay vi chatbot thong thuong.

---

## 17. Search Node: Grounding Bang Tavily Va GDS Offers

File: `backend/app/agents/nodes/search.py`

### 17.1. Search tool

File: `backend/app/agents/tools.py`

```python
def get_search_tool() -> SearchTool:
    settings = get_settings()
    if settings.TAVILY_API_KEY:
        return TavilySearchTool(api_key=settings.TAVILY_API_KEY)
    return MockSearchTool()
```

Neu co Tavily API key, dung Tavily. Neu khong, dung mock.

Day la fallback pattern tot cho demo:

> He thong van chay duoc khi thieu API key, nhung ket qua search se la placeholder.

### 17.2. Build query

Trong `search_node`, neu intent ASK_INFO:

- Co hotel + destination -> query gan hotel va destination.
- Co destination -> query trong destination.
- Khong co -> query user message.

Neu CREATE/MODIFY:

```python
queries.append(f"top tourist attractions things to do in {destination}")
queries.append(f"best restaurants food in {destination}")
```

Muc dich:

> Tranh LLM tu bia dia diem. Search result duoc dua vao prompt plan de itinerary grounded hon.

### 17.3. Proactive GDS synchronization

Trong CREATE/MODIFY va co destination:

```python
travelport = TravelportClient()
booking_com = BookingComClient()
```

He thong lay:

- flight_offers.
- hotel_offers.

Sau do ghi:

```python
state["gds_offers"] = {
    "flights": flight_offers,
    "hotels": hotel_offers
}
```

`plan_node` bat buoc LLM chon flight/hotel tu inventory nay.

### 17.4. get_airport helper

Search node co mapping dia diem sang IATA:

- Hanoi -> HAN.
- Ho Chi Minh/Saigon -> SGN.
- Da Nang -> DAD.
- Nha Trang -> CXR.
- Phu Quoc -> PQC.
- Da Lat -> DLI.
- Hue -> HUI.

Diem nay de demo nhanh voi cac dia diem pho bien.

### 17.5. Diem can noi

> Search node giup agent co du lieu ngoai thuc te va danh sach dich vu kha dung. Tavily cung cap thong tin dia diem, con Travelport/Booking.com service cung cap inventory chuyen bay/khach san. Cac du lieu nay duoc dua vao prompt de LLM lap ke hoach co can cu hon.

---

## 18. Weather-Aware Planning

File:

- `backend/app/agents/nodes/weather.py`
- `backend/app/services/weather_service.py`

### 18.1. weather_context_node

Node nay lay:

- destination.
- start_date.
- end_date.

Neu thieu ngay, fallback:

```python
start_date = today + 7 days
end_date = start_date + num_days - 1
```

Sau do:

```python
weather = await WeatherAPIClient().get_weather_for_plan(...)
```

Ket qua duoc summarize thanh text:

```python
state["weather_context"] = {
    "available": ...,
    "raw": weather,
    "summary": _summarize_weather(weather),
}
```

### 18.2. Weather service

`WeatherAPIClient` ho tro:

- forecast API cho ngay gan.
- future API cho ngay xa hon.
- unavailable response neu qua xa hoac thieu key.

### 18.3. Location query

Neu itinerary da co coordinates, service tinh trung binh lat/lng de query weather:

```python
avg_lat, avg_lng
return f"{avg_lat:.6f},{avg_lng:.6f}"
```

Neu khong co coordinates thi dung destination.

### 18.4. Normalize

WeatherAPI payload duoc normalize thanh:

- location.
- current.
- days.
- alerts.
- advice.

Frontend chi can render object da chuan hoa.

### 18.5. Weather-aware prompt

Trong `plan.py`, prompt yeu cau:

- Neu rain >= 60%, uu tien indoor.
- Neu hot >= 33C hoac UV >= 7, de outdoor sang som/sau 16h.
- Neu alert, tranh hoat dong nhay cam thoi tiet.
- Neu forecast unavailable, khong bia thoi tiet.

Tra loi phan bien:

> Weather-aware planning la mot buoc grounding bo sung. AI khong chi lap lich theo dia diem, ma can nhac thoi tiet theo ngay de chon indoor/outdoor activities hop ly.

---

## 19. Plan Node: Prompt Sinh Itinerary JSON

File: `backend/app/agents/nodes/plan.py`

Day la file quan trong nhat cua AI planning.

### 19.1. LLM setup

```python
llm = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0.3)
```

`temperature=0.3` giup co chut sang tao khi lap lich, nhung van kha on dinh.

### 19.2. Input prompt

Prompt gom:

- user request.
- destination.
- start/end date.
- total days.
- budget/currency.
- adults.
- preferences.
- search results.
- memory context.
- existing itinerary.
- weather context.
- GDS available inventory.

Noi cach khac, plan node gom tat ca context da thu thap vao mot prompt duy nhat.

### 19.3. Critical instruction cho MODIFY_TRIP

```text
If an Existing Itinerary is provided, you MUST preserve all activities and timings that the user did not explicitly ask to change.
```

Diem nay rat quan trong. Khi sua trip, AI khong nen viet lai toan bo lich trinh neu user chi doi mot bua an.

### 19.4. Duration rule

```text
You MUST generate exactly {num_days} days of activities.
```

Tranh LLM sinh thieu/ngay du.

### 19.5. Logistics rule

Prompt bat buoc:

- Day 1 co transport inbound neu co flight inventory.
- Day 1 co hotel check-in 14:00-15:00.
- Last day co hotel checkout 11:00-12:00.
- Moi ngay co local transportation.
- Co contingency fund.
- Tong cost khong vuot budget.

### 19.6. Group pricing

Prompt yeu cau multiply theo adults:

```text
GDS prices are base prices for 1 adult. You MUST multiply ...
```

De tranh loi lap lich cho 4 nguoi nhung gia chi cho 1 nguoi.

### 19.7. Itinerary density

Prompt yeu cau moi ngay co:

- Breakfast.
- Morning activity.
- Lunch.
- Afternoon activity.
- Dinner.
- Evening activity.

Y nghia:

> Dam bao itinerary chi tiet, khong qua so sai.

### 19.8. Output format

LLM phai tra JSON:

```json
{
  "trip": {
    "title": "...",
    "destination": "...",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "total_budget": 0,
    "currency": "..."
  },
  "itinerary_items": [
    {
      "day_number": 1,
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "type": "ATTRACTION",
      "activity_details": {}
    }
  ],
  "messages": [
    {"role": "assistant", "content": "..."}
  ]
}
```

### 19.9. Parse response

Code loai markdown fence, parse JSON. Neu loi JSON:

```python
state["messages"] = [{
    "role": "assistant",
    "content": "I generated a plan but encountered a formatting issue. Please try again.",
}]
```

### 19.10. Diem can noi

> Plan node la noi bien context da thu thap thanh mot itinerary co cau truc. Em ep output JSON de backend co the parse va luu vao DB, thay vi chi hien text. Day la diem quan trong giup AI ket noi duoc voi ung dung that.

---

## 20. Constraint Node: Kiem Tra Xung Dot

File: `backend/app/agents/nodes/constraint.py`

### 20.1. Muc dich

LLM co the sinh:

- Hai hoat dong trung gio.
- Tong chi phi vuot budget.

Constraint node check lai.

### 20.2. Check time overlap

Group item theo day:

```python
days.setdefault(day, []).append(item)
```

Sort theo start_time:

```python
sorted_items = sorted(day_items, key=lambda x: _parse_time(x.get("start_time")) or time.min)
```

Check overlap:

```python
return not (end1 <= start2 or end2 <= start1)
```

Neu overlap, add conflict:

```python
{
  "type": "TIME_OVERLAP",
  "day": day,
  "message": "Day X: Time overlap detected between activities"
}
```

### 20.3. Check budget

```python
total_cost = sum(float(item.get("activity_details", {}).get("estimated_cost", 0)) for item in items)
```

Neu `total_cost > total_budget`, add:

```python
{
  "type": "BUDGET_EXCEEDED",
  "estimated_total": total_cost,
  "budget": total_budget
}
```

### 20.4. Gioi han hien tai

Constraint node moi check 2 loai:

- TIME_OVERLAP.
- BUDGET_EXCEEDED.

Co the mo rong:

- Travel time giua hai dia diem.
- Gio mo cua dia diem.
- Weather-sensitive conflicts.
- Visa/health constraints.

Tra loi phan bien:

> Constraint node la buoc validation sau LLM. Vi LLM co the sinh noi dung khong hoan hao, em tach mot node rule-based de bat loi co cau truc nhu trung gio va vuot ngan sach. Kien truc nay co the mo rong them cac constraint khac.

---

## 21. Finalize Node: Luu Ket Qua AI Vao Database

File: `backend/app/agents/nodes/finalize.py`

Day la node bien output cua AI thanh du lieu that trong DB.

### 21.1. Parse date/time

```python
def _parse_date(d: str | None) -> date | None:
```

```python
def _parse_time(t: str | None) -> dt_time | None:
```

LLM tra string, DB can `date` va `time`.

### 21.2. CREATE_TRIP

Neu intent la CREATE_TRIP:

```python
trip_create = TripCreate(...)
saved_trip = await svc.create_trip(trip_create, user_id)
state["trip_data"] = {**trip_data, "id": saved_trip.id}
```

Viec ghi `id` vao state quan trong vi frontend can redirect sang trip detail.

### 21.3. MODIFY_TRIP

Neu intent MODIFY_TRIP:

```python
existing = await svc.get_trip(trip_id, user_id)
if existing:
    saved_trip = existing
    state["trip_data"] = {**trip_data, "id": trip_id}
```

Sau do update itinerary items:

```python
await svc.update_itinerary_items(trip_id, items_to_save)
```

### 21.4. Geocoding

Truoc khi save itinerary, code dung Nominatim:

```python
location = await asyncio.to_thread(geolocator.geocode, search_query, timeout=5)
```

Neu tim thay:

```python
details["lat"] = location.latitude
details["lng"] = location.longitude
```

Noi khi bao ve:

> LLM co the hallucinate toa do, nen em overwrite lat/lng bang geocoding thuc te dua tren address/name. Toa do nay dung cho map visualization.

Co sleep:

```python
await asyncio.sleep(1.1)
```

De ton trong rate limit cua Nominatim.

### 21.5. Save itinerary CREATE_TRIP

Voi moi item:

```python
item_create = ItineraryItemCreate(...)
db_item = ItineraryItem(**item_create.model_dump())
session.add(db_item)
```

Sau do commit.

### 21.6. Save memory

```python
await save_memory(
    session=session,
    user_id=user_id,
    content=f"User requested: {state['user_message']}",
    memory_type="history",
    trip_id=saved_trip.id
)
```

Memory save duoc boc try/except:

```python
except Exception:
    pass
```

Vi memory la non-critical. Neu OpenAI embedding loi, trip van duoc tao.

### 21.7. Build message

Neu state chua co message:

- Co conflicts -> noi plan co conflict.
- Khong -> "Your trip has been planned successfully!"

Tra loi phan bien:

> Finalize node la ranh gioi giua AI output va du lieu he thong. No parse JSON, chuan hoa date/time, geocode dia diem, luu trip/itinerary vao DB va luu memory. Em tach buoc nay rieng de dam bao LLM khong truc tiep thao tac DB, ma phai di qua validation va mapping cua backend.

---

## 22. Info Agent: Hoi Dap Thong Tin Du Lich

File:

- `backend/app/agents/subgraphs/info.py`
- `backend/app/agents/nodes/answer.py`

### 22.1. Graph

```text
search -> answer -> finalize
```

ASK_INFO khong tao itinerary.

### 22.2. answer_node

Prompt:

```text
Answer directly and concisely based on all available information.
Do NOT generate a travel itinerary.
```

Input:

- user question.
- search results.

Output:

```python
state["messages"] = [{"role": "assistant", "content": response.content.strip()}]
```

### 22.3. Vi sao info agent van qua finalize?

Finalize trong truong hop ASK_INFO khong tao trip, nhung dam bao message cuoi cung co san.

Tra loi phan bien:

> Em tach ASK_INFO khoi planning de tranh viec user chi hoi thong tin ma he thong lai tao trip. Info agent la duong nhanh cho Q&A, co search grounding va answer synthesis.

---

## 23. Booking Agent: Tim Chuyen Bay Va Khach San

File: `backend/app/agents/subgraphs/booking.py`

Booking intent:

- SEARCH_FLIGHT.
- SEARCH_HOTEL.

### 23.1. booking_search_node

Neu SEARCH_FLIGHT:

```python
results = await travelport.search_flights(origin, destination, dep_date, adults)
state["booking_results"] = results
```

Neu SEARCH_HOTEL:

```python
results = await travelport.search_hotels(location, checkin, checkout, adults)
```

### 23.2. booking_finalize_node

Neu khong co result:

```python
"Không tìm thấy kết quả phù hợp..."
```

Neu flight:

```python
cheapest = min(results, key=lambda x: x.get("price", 0))
```

Tao message tom tat gia re nhat.

Neu hotel:

```python
cheapest = min(results, key=lambda x: x.get("price_per_night", 0))
```

### 23.3. Mock data va Travelport fallback

Trong file co MOCK_FLIGHTS/MOCK_HOTELS, nhung node hien tai goi `TravelportClient`. Travelport service neu thieu credentials se simulate data.

Day la diem demo:

> External booking APIs thuong can account sandbox, access group, credential. He thong co fallback simulator de demo flow dat cho, PNR va UI ma khong phu thuoc 100% vao external service.

---

## 24. Memory Service Va pgvector

File:

- `backend/app/services/memory_service.py`
- `backend/app/models/memory.py`

### 24.1. Embedding

```python
async def embed_text(text: str) -> list[float]:
    response = await openai_client.embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding
```

Text -> vector 1536 chieu.

### 24.2. Save memory

```python
memory = MemoryStream(
    user_id=user_id,
    trip_id=trip_id,
    content=content,
    memory_type=memory_type,
    vector_embedding=embedding,
)
```

Sau moi lan tao/sua trip, finalize luu:

```text
User requested: ...
```

### 24.3. Retrieve memory

```python
query_embedding = await embed_text(query)
```

Sau do raw SQL:

```sql
SELECT ..., 1 - (ms.vector_embedding <-> '[...]'::vector) AS similarity
FROM memory_streams ms
WHERE ms.user_id = :user_id
ORDER BY similarity DESC
LIMIT :top_k
```

Toan tu `<->` cua pgvector tinh distance.

Code tinh:

```sql
1 - distance AS similarity
```

### 24.4. Trip filter

Neu co trip_id:

```sql
AND (ms.trip_id = :trip_id OR ms.trip_id IS NULL)
```

Lay memory lien quan trip hien tai hoac memory global.

### 24.5. Diem can chu y

`embedding_literal` duoc chen vao SQL string. Comment trong code noi safe vi embedding la floats tu OpenAI, khong phai user input. Tuy nhien neu bao ve, co the noi:

> Query user input khong chen truc tiep vao SQL. Embedding literal duoc tao tu danh sach float do OpenAI tra ve. Cac tham so nhu user_id, top_k, trip_id van dung SQL parameters.

### 24.6. RAG explanation

RAG o day:

```text
User query
-> embedding
-> vector search memory
-> memory_context
-> dua vao prompt planning
```

Tra loi phan bien:

> pgvector giup AI co bo nho dai han. Thay vi dua toan bo lich su chat vao prompt, he thong embedding cac memory va khi can thi truy van top-k memory gan nghia nhat voi yeu cau hien tai. Cach nay tiet kiem token va ca nhan hoa ke hoach.

---

## 25. WebSocket Chat Streaming

File:

- Backend: `backend/app/routes/ai_chat.py`
- Frontend: `frontend/lib/websocket.ts`, `frontend/components/ChatInterface.tsx`

### 25.1. Backend endpoint

```python
@router.websocket("/chat-stream")
async def chat_stream(websocket: WebSocket, token: str = Query(...)):
```

WebSocket khong gui Authorization header theo cach fetch thong thuong, nen token dua qua query string:

```text
/ai/chat-stream?token=...
```

### 25.2. Accept va authenticate

```python
await websocket.accept()
payload = decode_token(token)
user_id = int(payload["sub"])
```

Neu token invalid:

```python
await _send(websocket, {"type": "error", "content": "Unauthorized"})
await websocket.close(code=1008)
```

Code 1008 la policy violation/unauthorized.

### 25.3. Receive loop

```python
while True:
    raw = await websocket.receive_text()
    data = json.loads(raw)
    message = data.get("message", "")
    trip_id = data.get("trip_id")
```

Moi message user gui se chay agent:

```python
async for chunk in run_agent_streaming(...):
    await _send(websocket, chunk)
```

### 25.4. Refresh itinerary

Sau khi agent hoan thanh:

```python
if trip_id:
    await manager.broadcast_to_trip(trip_id, {"type": "REFRESH_ITINERARY"})
```

Tat ca client dang mo trip se reload.

### 25.5. Frontend websocket.ts

```ts
const ws = new WebSocket(`${WS_BASE}/ai/chat-stream?token=${token}`);
```

Send:

```ts
ws.send(JSON.stringify({ message, trip_id: tripId }));
```

### 25.6. ChatInterface

Khi nhan `token`:

- Tao/update loading assistant message.
- Hien progress.

Khi nhan `final`:

- Replace loading message bang final answer.
- Neu metadata co itinerary_items thi call `onTripUpdate()`.

### 25.7. Reconnect

ChatInterface co reconnect backoff:

```ts
reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
```

Neu close code 1008 thi khong reconnect, vi token sai/het han.

Tra loi phan bien:

> Em dung WebSocket cho AI chat vi qua trinh agent co nhieu buoc va co the mat thoi gian. WebSocket cho phep backend day progress/final message ve frontend realtime, trai nghiem tot hon HTTP request doi ket qua cuoi.

---

## 26. WebSocket Sync Itinerary

File:

- `backend/app/core/socket_manager.py`
- `backend/app/routes/ai_chat.py`
- `frontend/app/trips/[id]/page.tsx`

### 26.1. ConnectionManager

```python
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
```

Map:

```text
trip_id -> list of websocket connections
```

### 26.2. connect

```python
await websocket.accept()
self.active_connections[trip_id].append(websocket)
```

### 26.3. broadcast_to_trip

```python
payload = json.dumps(message)
for connection in self.active_connections[trip_id]:
    await connection.send_text(payload)
```

### 26.4. Endpoint

```python
@router.websocket("/sync/{trip_id}")
```

Frontend trip detail mo:

```ts
const ws = new WebSocket(`${wsUrl}/ai/sync/${tripId}?token=${token}`);
```

Khi nhan:

```ts
if (data.type === 'REFRESH_ITINERARY') {
  loadData();
}
```

### 26.5. Muc dich

Khi mot nguoi sua itinerary, nguoi khac dang xem cung trip se tu dong reload.

Tra loi phan bien:

> Ngoai chat AI, em co WebSocket sync theo trip room. Moi trip_id la mot room. Khi itinerary thay doi, backend broadcast `REFRESH_ITINERARY`, frontend reload data de cac collaborator thay doi dong bo.

---

## 27. Booking Flow: Flight/Hotel Booking

File:

- `backend/app/routes/booking.py`
- `backend/app/services/travelport_service.py`
- `backend/app/services/booking_com_service.py`
- `frontend/components/BookingModal.tsx`

### 27.1. Booking routes

Router:

```python
router = APIRouter(prefix="/bookings", tags=["bookings"])
```

Endpoints:

- `GET /bookings`
- `POST /bookings/flight`
- `POST /bookings/hotel`

### 27.2. book_flight

Input:

- trip_id.
- itinerary_item_id optional.
- flight_details.
- passenger_details.

Flow:

```text
frontend BookingModal
-> POST /bookings/flight
-> TravelportClient.create_booking()
-> tao Booking row
-> neu co itinerary_item_id, mark item CONFIRMED
-> return BookingRead
```

### 27.3. PNR

Travelport service simulate:

```python
pnr = f"1G/{random_code}"
```

`1G` la ma Galileo/GDS style.

### 27.4. book_hotel

Tuong tu flight, nhung goi BookingComClient.

Hotel booking tao:

```text
BKG-XXXXXXXX
```

### 27.5. Update itinerary item

Sau booking:

```python
item.status = ItemStatus.CONFIRMED
activity_details["pnr"] = db_booking.pnr
activity_details["booking_id"] = db_booking.id
```

Diem nay lien ket booking voi itinerary.

### 27.6. Diem can chu y

Trong routes booking hien tai, code chua check trip ownership bang `TripService.get_trip`, chi dung current_user de tao booking. Neu bi hoi bao mat, nen noi:

> Flow booking da yeu cau JWT, nhung de chat hon, em nen bo sung check `TripService.get_trip(req.trip_id, current_user.id)` truoc khi tao booking, dam bao user co quyen voi trip. Day la mot diem co the cai tien.

---

## 28. Payment Flow: VNPay

File:

- `backend/app/routes/payment.py`
- `backend/app/services/vnpay_service.py`
- `frontend/components/Dashboard.tsx`

### 28.1. Dieu kien hien payment

Frontend `Dashboard.tsx`:

```ts
const isAllConfirmed = timelineItems.length > 0 && timelineItems.every(i => i.status !== 'SUGGESTED');
const showPaymentBanner = isAllConfirmed && !readOnly && tripStatus !== 'ACTIVE';
```

Chi khi tat ca activity da confirm va trip chua ACTIVE thi hien Pay with VNPay.

### 28.2. Create payment URL

Endpoint:

```python
POST /payments/create-url
```

Input:

```json
{"trip_id": 123}
```

Backend:

1. Fetch trip.
2. Check owner:

```python
if not trip or trip.user_id != current_user.id:
    raise HTTPException(404)
```

3. Lay confirmed itinerary items.
4. Tinh tong estimated_cost.
5. Convert sang VND.
6. Tao order_ref.
7. Generate VNPay URL.

### 28.3. Redirect

Frontend:

```ts
window.location.href = data.url;
```

Nguoi dung bi redirect sang VNPay.

### 28.4. Return URL

Endpoint:

```python
GET /payments/vnpay-return
```

Flow:

1. Lay query params tu VNPay.
2. Verify signature.
3. Parse trip_id tu `vnp_TxnRef`.
4. Neu response code `00`, update trip status ACTIVE.
5. Redirect frontend:

```text
/trips/{trip_id}?payment=success
```

### 28.5. Diem can noi

> Payment flow chi cho owner thanh toan. Tong tien lay tu cac itinerary item da CONFIRMED. Sau khi VNPay return thanh cong va verify signature hop le, backend cap nhat trip status sang ACTIVE.

---

## 29. Collaborator, Invite Va Notification

File:

- `backend/app/routes/trips.py`
- `backend/app/routes/notifications.py`
- `backend/app/models/notification.py`

### 29.1. Invite collaborator

Endpoint:

```python
POST /trips/{trip_id}/collaborators
```

Chi owner:

```python
if not trip or trip.user_role != "OWNER":
    raise HTTPException(403)
```

Flow:

1. Tim user theo email.
2. Khong cho invite chinh minh.
3. Check da invite chua.
4. Tao TripCollaborator status PENDING.
5. Tao Notification cho friend.

### 29.2. Respond invite

Endpoint:

```python
POST /trips/{trip_id}/invites/respond
```

Neu ACCEPT:

```python
collab.status = "ACCEPTED"
```

Neu REJECT:

```python
await session.delete(collab)
```

Mark notification as read.

### 29.3. Notification APIs

```python
GET /notifications
PATCH /notifications/{notif_id}/read
```

User chi lay notification cua minh:

```python
where(Notification.user_id == current_user.id)
```

Tra loi phan bien:

> Collaboration duoc tach thanh bang `trip_collaborators`, luu role va status invite. Notification la bang rieng de hien thong bao cho nguoi duoc moi. Quyen thao tac trip dua tren role: owner/editor/viewer.

---

## 30. Frontend Architecture

Frontend dung Next.js App Router.

### 30.1. Layout

File: `frontend/app/layout.tsx`

Load font, global CSS, metadata.

### 30.2. Landing page

File: `frontend/app/page.tsx`

Trang gioi thieu he thong, workflow, modules, architecture.

### 30.3. Dashboard

Files:

- `frontend/app/dashboard/page.tsx`
- `frontend/app/dashboard/DashboardInner.tsx`

Chuc nang:

- Load trips.
- Load user.
- Tao trip bang AI prompt.
- Tao trip bang GuidedPlanner.
- Hien stats.
- Hien trips.
- Popular destinations.
- Travel styles.

### 30.4. Trip detail page

File: `frontend/app/trips/[id]/page.tsx`

Chuc nang:

- Load trip.
- Load itinerary.
- Load weather.
- Mo WebSocket sync.
- Tabs: timeline/map/weather/budget.
- Chat drawer.
- Invite/delete.

### 30.5. Components quan trong

- `ChatInterface.tsx`: chat AI realtime.
- `Dashboard.tsx`: timeline itinerary.
- `GuidedPlanner.tsx`: form tao prompt.
- `InteractiveMap.tsx`: ban do.
- `TripBudget.tsx`: ngan sach.
- `WeatherInsight.tsx`: thoi tiet.
- `BookingModal.tsx`: dat flight/hotel.
- `AlternativesModal.tsx`: doi flight/hotel.
- `ShareModal.tsx`: invite collaborators.

---

## 31. Frontend API Client

File: `frontend/lib/api.ts`

### 31.1. API base

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
```

### 31.2. getToken

```ts
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}
```

Vi Next.js co server-side rendering, can check `typeof window`.

### 31.3. fetchAPI wrapper

Wrapper tu dong:

- Set Content-Type JSON.
- Add Authorization Bearer token.
- Xu ly 401.
- Parse error.
- Return JSON.

```ts
if (res.status === 401) {
  localStorage.removeItem('access_token');
  window.location.href = '/login';
}
```

### 31.4. Auth functions

- login.
- register.
- getMe.
- updateMe.
- changePassword.

Login dung form URL encoded vi backend dung `OAuth2PasswordRequestForm`.

### 31.5. Trip functions

- getTrips.
- getTrip.
- updateTrip.
- getTripItinerary.
- updateTripItinerary.
- getTripWeather.
- generateTrip.
- clonePremadeTour.
- deleteTrip.

### 31.6. Itinerary functions

- confirmItem.
- confirmItems.
- completeItem.

### 31.7. Collaborator, notification, booking functions

API client giup component khong lap lai fetch logic.

Tra loi phan bien:

> Frontend co mot API client chung de gom logic token, error handling va base URL. Component chi goi ham nghiep vu nhu `generateTrip`, `getTripItinerary`, `confirmItem`, giup code UI sach hon.

---

## 32. Dashboard: Tao Trip Bang AI

File: `frontend/app/dashboard/DashboardInner.tsx`

### 32.1. Auth check

Trong `useEffect`:

```ts
const token = localStorage.getItem('access_token');
if (!token) { router.push('/login'); return; }
```

Neu chua login, redirect.

### 32.2. loadTrips

```ts
const data = await getTrips() as Trip[];
setTrips(data);
```

Neu loi, redirect login.

### 32.3. AI Planner

State:

```ts
const [newTripMsg, setNewTripMsg] = useState('');
const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
```

Khi submit:

```ts
let finalPrompt = newTripMsg.trim();
if (selectedStyles.length > 0) {
  finalPrompt += `... ${selectedStyles.join(', ')}`;
}
```

Sau do:

```ts
const result = await generateTrip(finalPrompt)
if (result?.trip?.id) router.push(`/trips/${result.trip.id}`);
```

### 32.4. Guided Planner

`GuidedPlanner` khong goi backend truc tiep. No build prompt:

```ts
return `Create a detailed ${days}-day itinerary ...`
```

Sau do parent goi:

```ts
handleGuidedGenerate(prompt)
```

Tuc la AI Planner va Guided Planner dung chung backend `/trips/generate`. Khac nhau chi la cach tao prompt.

Tra loi phan bien:

> Guided form giup nguoi dung khong quen viet prompt van tao duoc yeu cau day du. Form se chuyen input co cau truc thanh prompt tu nhien, sau do van di qua cung agent pipeline.

---

## 33. Trip Detail Page: Timeline, Map, Weather, Budget, Chat

File: `frontend/app/trips/[id]/page.tsx`

### 33.1. Lay tripId

```ts
const params = useParams();
const tripId = Number(params.id);
```

### 33.2. loadData

```ts
const [tripData, itemsData] = await Promise.all([
  getTrip(tripId),
  getTripItinerary(tripId),
]);
```

Lay trip va itinerary song song.

Weather load rieng:

```ts
getTripWeather(tripId)
  .then(...)
  .catch(...)
```

De weather loi khong lam hong ca page.

### 33.3. Payment status

Doc query param:

```ts
payment=success
payment=failed
payment=failed_signature
```

Hien alert roi remove query.

### 33.4. Sync WebSocket

```ts
const ws = new WebSocket(`${wsUrl}/ai/sync/${tripId}?token=${token}`);
```

Neu nhan REFRESH_ITINERARY:

```ts
loadData();
```

### 33.5. Tabs

```ts
activeTab: 'timeline' | 'map' | 'weather' | 'budget'
```

Render:

- timeline -> `Dashboard`.
- map -> `InteractiveMap`.
- weather -> `WeatherInsight`.
- budget -> `TripBudget`.

### 33.6. Role-based UI

Neu `trip.user_role === 'VIEWER'`:

- Khong hien chat AI.
- Timeline readOnly.
- Khong hien delete/invite.

Tra loi phan bien:

> Frontend dung `user_role` do backend tra ve de dieu chinh UI. Tuy nhien backend van la noi enforce quyen that su; frontend chi giup trai nghiem nguoi dung tot hon.

---

## 34. ChatInterface: Realtime AI Copilot

File: `frontend/components/ChatInterface.tsx`

### 34.1. Local chat history

Chat luu localStorage theo trip:

```ts
const STORAGE_KEY = `chat_history_trip_${tripId}`;
```

Moi trip co lich su chat rieng.

### 34.2. Connect

```ts
const socket = createChatSocket(handleMessage, onOpen, onClose);
```

Khi connected:

```ts
setConnected(true)
reconnectDelay.current = 1000
```

### 34.3. Auto-prompt

Neu URL co `auto_prompt`, khi connected se tu gui prompt mot lan.

### 34.4. handleMessage

Neu `msg.type === 'token'`:

- Bat typing.
- Them noi dung vao loading message.

Neu `msg.type === 'final'`:

- Tat typing.
- Replace loading message bang final.
- Neu co itinerary_items -> `onTripUpdate()`.

Neu `error`:

- Hien error.

### 34.5. Booking results trong chat

Neu metadata co `booking_results`, component render card flight/hotel va nut Book.

### 34.6. Send message

```ts
socketRef.current.send(text, tripId);
```

Gui message kem tripId de backend biet dang sua trip nao.

### 34.7. IME handling

```ts
if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing)
```

Tranh viec dang go tieng Viet/Nhat/Han bang IME ma Enter bi submit som.

---

## 35. Dashboard Component: Timeline, Drag-Drop, Confirm, Payment

File: `frontend/components/Dashboard.tsx`

Component nay la timeline trong trip detail, khong phai dashboard page.

### 35.1. Drag-drop

Dung dnd-kit:

```ts
DndContext
SortableContext
useSortable
```

Khi drag end:

```ts
const reorderedItems = withSortOrder(arrayMove(items, oldIndex, newIndex));
onItemsChange(reorderedItems);
await updateTripItinerary(tripId, reorderedItems);
```

`withSortOrder` ghi `_sort_order` vao `activity_details`, de backend sort dung lan sau.

Neu save loi:

```ts
onItemsChange(previousItems);
alert('Could not save...')
```

Day la optimistic UI update co rollback.

### 35.2. Confirm item

```ts
await confirmItem(id);
onItemsChange(items.map(... status: 'CONFIRMED'))
```

### 35.3. Bulk confirm

Dung modal confirm day/all. Goi:

```ts
confirmItems(itemIds)
```

### 35.4. Complete item

```ts
await completeItem(id);
status: 'COMPLETED'
```

### 35.5. Alternatives

Nut Change mo `AlternativesModal`. Khi chon option:

```ts
const newDetails = { ...selectedAltItem.activity_details, ...opt };
newDetails.estimated_cost = newCost;
```

Sau do PATCH `/trips/{tripId}/itinerary`.

### 35.6. Payment banner

Chi hien khi all confirmed:

```ts
showPaymentBanner
```

Click Pay:

```ts
POST /payments/create-url
window.location.href = data.url
```

---

## 36. Docker Compose Va Cach Cac Service Noi Voi Nhau

File: `docker-compose.yml`

Services:

- postgres.
- backend.
- frontend.

### 36.1. Postgres

```yaml
image: ankane/pgvector:latest
ports:
  - "5433:5432"
```

Dung image co san pgvector.

Ben ngoai may host connect port 5433, ben trong container la 5432.

### 36.2. Backend

```yaml
environment:
  DATABASE_URL: postgresql+asyncpg://...@postgres:5432/...
```

Trong docker network, host database la service name `postgres`, khong phai localhost.

Backend mount:

```yaml
volumes:
  - ./backend:/app
```

Sua code backend local thi container reload.

### 36.3. Frontend

```yaml
NEXT_PUBLIC_API_URL: http://localhost:8000
NEXT_PUBLIC_WS_URL: ws://localhost:8000
```

Browser chay tren may host, nen goi backend qua localhost:8000.

---

## 37. Cac Diem Manh De Noi Khi Bao Ve

### 37.1. Kien truc tach lop

- Routes: HTTP/WebSocket endpoints.
- Services: business logic.
- Models: database schema.
- Agents: AI workflow.
- Frontend components: UI.

### 37.2. Agentic AI ro rang

Khong chi chatbot. Co graph:

```text
understand -> supervisor -> sub-agent -> tools -> validation -> persistence
```

### 37.3. Structured output

LLM tra JSON, backend parse va luu DB. Day la ung dung AI co hanh dong, khong chi sinh text.

### 37.4. Realtime

WebSocket dung cho:

- chat progress.
- sync itinerary giua collaborators.

### 37.5. Memory voi pgvector

Luu embedding va retrieve memory bang similarity search.

### 37.6. Weather-aware planning

AI can nhac du bao thoi tiet khi lap lich.

### 37.7. Booking/payment demo flow

Co luong flight/hotel booking va VNPay.

---

## 38. Cac Diem Can Chu Y Khi Bi Phan Bien

### 38.1. CORS dang mo rong

`allow_origins=["*"]` phu hop dev, production nen gioi han domain.

### 38.2. SECRET_KEY default

Trong config co default `"change-me-in-production"`. Production phai dat env secret manh.

### 38.3. Chua dung migration

Dang dung `create_all`, production nen dung Alembic.

### 38.4. LLM JSON co the loi

Code co fallback JSON parse, nhung de chat hon co the dung structured output/schema validation.

### 38.5. Booking route nen check permission chat hon

Nen them `TripService.get_trip` trong `/bookings/flight` va `/bookings/hotel`.

### 38.6. Geocoding Nominatim co rate limit

Da sleep 1.1s, nhung voi itinerary dai co the cham. Production nen cache geocoding.

### 38.7. Payment return hard-code localhost

`payment.py` redirect ve `http://localhost:3000`. Production nen dua vao config FRONTEND_URL.

### 38.8. Memory save non-critical

Neu embedding loi, trip van tao duoc. Day la design chap nhan duoc vi memory la optional enhancement.

---

## 39. Bo Cau Hoi Phan Bien Va Cach Tra Loi

### Q1. Vi sao dung FastAPI thay vi Node.js?

FastAPI ho tro async tot, type hint/Pydantic validation tot, auto Swagger docs. Quan trong hon, ecosystem AI nhu LangGraph, LangChain, OpenAI Python SDK, SQLModel tich hop rat manh voi Python, phu hop de xay backend co AI agent.

### Q2. Vi sao can LangGraph? Goi OpenAI truc tiep khong duoc sao?

Goi OpenAI truc tiep chi phu hop hoi dap don buoc. He thong nay can nhieu buoc: hieu intent, route agent, retrieve memory, search web, lay weather, lay booking offers, sinh itinerary, validate, luu DB. LangGraph giup mo hinh hoa quy trinh do thanh graph node/edge de de mo rong va debug.

### Q3. AI co tu luu DB khong?

Khong. AI chi sinh JSON co cau truc. Backend parse, validate va map JSON thanh SQLModel object trong `finalize_node`. Dieu nay giup kiem soat du lieu va tranh de LLM thao tac DB truc tiep.

### Q4. Lam sao biet user co quyen xem/sua trip?

Moi request can dang nhap qua JWT. Backend lay `current_user`, sau do route trip goi `TripService.get_trip(trip_id, user_id)`. Ham nay chi return neu user la owner hoac collaborator ACCEPTED. Neu role la VIEWER thi chan update.

### Q5. pgvector dung de lam gi?

pgvector luu embedding vector cua memory. Khi user tao/sua trip, he thong luu noi dung yeu cau vao memory. Lan sau, query cua user duoc embedding va so sanh vector de lay top-k memory lien quan. Memory nay dua vao prompt de AI ca nhan hoa ke hoach.

### Q6. Vi sao dung WebSocket?

AI planning co the mat nhieu giay vi phai goi LLM, search, weather, DB. WebSocket cho phep backend day progress/final result ve frontend realtime. Ngoai ra WebSocket sync giup collaborator thay doi itinerary thi cac client khac reload.

### Q7. Neu external API loi thi sao?

Mot so service co fallback. Search dung MockSearchTool neu thieu Tavily key. Travelport co simulator fallback neu thieu credential. Weather service tra response configured=false/unavailable thay vi crash. Memory save duoc coi non-critical.

### Q8. LLM sinh lich trinh sai gio/qua ngan sach thi sao?

Sau plan node co constraint node. Node nay rule-based check time overlap va budget exceeded, ghi vao `conflicts`. Day la tang validation sau LLM. Co the mo rong them travel time, opening hours, weather constraints.

### Q9. Vi sao activity_details dung JSON thay vi cot rieng?

Vi moi loai itinerary item co du lieu khac nhau. Flight can airline, flight_number, airports; hotel can stars, rating; attraction can lat/lng/note. JSON giup linh hoat ma van giu schema chinh cho trip_id, day_number, time, type, status.

### Q10. Co diem nao can cai tien neu deploy production?

Co. Nen dung Alembic migrations, gioi han CORS origin, thay SECRET_KEY manh, them permission check cho booking routes, cache geocoding, dua FRONTEND_URL vao config, va dung structured output/schema validation chat hon cho LLM.

---

## 40. Ban Tom Tat 3 Phut De Thuyet Trinh Code

Co the noi nhu sau:

> Du an cua em la AI Travel Assistant, gom frontend Next.js, backend FastAPI va PostgreSQL + pgvector. Frontend cho phep nguoi dung tao chuyen di bang prompt hoac guided form, sau do xem timeline, map, weather, budget va chat voi AI de dieu chinh lich trinh.
>
> Backend duoc chia thanh cac router: auth, trips, itinerary, ai_chat, booking, payment va notifications. Xac thuc dung JWT, mat khau duoc hash bang bcrypt. Cac API trip deu lay current user va kiem tra quyen qua TripService, trong do user co the la owner hoac collaborator voi role editor/viewer.
>
> Diem chinh cua he thong la LangGraph agent. Khi user gui yeu cau, agent chay qua understand node de phan loai intent va trich xuat entity. Supervisor node chon planning, info hoac booking agent. Planning agent se lay context, search thong tin dia diem, lay weather, lay flight/hotel offers, sau do prompt LLM sinh itinerary JSON. Ket qua duoc constraint node kiem tra trung gio va vuot ngan sach, roi finalize node moi luu trip va itinerary vao database.
>
> He thong cung co memory bang pgvector. Moi yeu cau quan trong cua user duoc embedding bang OpenAI embedding model va luu vao PostgreSQL. Khi lap lich moi, agent retrieve cac memory lien quan bang vector similarity de ca nhan hoa ke hoach.
>
> Chat AI dung WebSocket de stream tien trinh realtime. Ngoai ra trip detail cung mo mot WebSocket sync theo trip_id, giup cac client dang xem cung trip reload khi itinerary thay doi. Phan booking/payment co flow dat flight/hotel gia lap voi PNR va thanh toan VNPay de minh hoa vong doi day du cua mot chuyen di.
