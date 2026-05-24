# 📋 Danh sách Chức năng & Phân quyền Người dùng
## AI Travel Assistant – Feature & Role Specification (v2.0)

---

## 1. User Roles (Phân quyền)

| Role | Mô tả | Ghi chú |
|---|---|---|
| **Guest** | Người dùng chưa đăng nhập | Chỉ xem trang Login, Register |
| **User** | Người dùng đã xác thực | Toàn quyền với dữ liệu của chính mình |
| **Admin** | Quản trị viên hệ thống | Xem thống kê, quản lý users |

> Mọi dữ liệu (trip, itinerary, memory) đều **cô lập theo user** – user không thể xem dữ liệu của người khác.

---

## 2. Ma trận Chức năng × Role

| Chức năng | Guest | User | Admin |
|---|:---:|:---:|:---:|
| Đăng ký / Đăng nhập | ✅ | ❌ | ❌ |
| Xem & quản lý trips của mình | ❌ | ✅ | ❌ |
| Tạo trip bằng AI | ❌ | ✅ | ❌ |
| Chat AI thời gian thực | ❌ | ✅ | ❌ |
| Kéo thả lịch trình | ❌ | ✅ | ❌ |
| Xem bản đồ tương tác | ❌ | ✅ | ❌ |
| Xuất PDF Itinerary | ❌ | ✅ | ❌ |
| Xuất PDF Budget | ❌ | ✅ | ❌ |
| AI tạo Checklist thông minh | ❌ | ✅ | ❌ |
| Xem thời tiết tại điểm đến | ❌ | ✅ | ❌ |
| Mock đặt khách sạn | ❌ | ✅ | ❌ |
| Xem thống kê hệ thống | ❌ | ❌ | ✅ |
| Quản lý danh sách users | ❌ | ❌ | ✅ |
| Xóa user | ❌ | ❌ | ✅ |

---

## 3. Danh sách Chức năng Chi tiết

---

### 🔐 Module 1: Xác thực & Tài khoản

#### F01 – Đăng ký tài khoản
- **Actor:** Guest
- **Mô tả:** Nhập Email + Password để tạo tài khoản.
- **Business rule:** Email chưa tồn tại. Password mã hóa bcrypt.
- **API:** `POST /auth/register`

#### F02 – Đăng nhập
- **Actor:** Guest
- **Mô tả:** Nhập Email/Password → nhận JWT token (lưu localStorage).
- **API:** `POST /auth/token`

#### F03 – Xem thông tin cá nhân
- **Actor:** User
- **API:** `GET /auth/me`

#### F04 – Đăng xuất
- **Actor:** User
- **Mô tả:** Xóa token khỏi localStorage, redirect về Login.
- **Xử lý:** Frontend only

---

### ✈️ Module 2: Quản lý Chuyến đi

#### F05 – Xem danh sách chuyến đi
- **Actor:** User
- **Mô tả:** Hiển thị tất cả trips của user, sắp xếp mới nhất trước.
- **API:** `GET /trips`

#### F06 – Xem chi tiết chuyến đi
- **Actor:** User
- **API:** `GET /trips/{id}` + `GET /trips/{id}/itinerary`

#### F07 – Tạo chuyến đi bằng AI ⭐
- **Actor:** User
- **Mô tả:** User nhập yêu cầu tự nhiên → AI Agent tự động lên lịch trình hoàn chỉnh.
- **Luồng AI:**
  1. Understand: parse intent + entities (LLM)
  2. Search: tìm địa điểm thật (Tavily API)
  3. Weather: lấy thời tiết tại điểm đến (OpenWeather API)
  4. Plan: sinh itinerary theo ngày có lat/lng (GPT-4o)
  5. Constraint: kiểm tra time overlap + budget
  6. Finalize: lưu DB + lưu memory + trả về trip id
- **API:** `POST /trips/generate`
- **Input:** `{ message: "Đi Đà Nẵng 3 ngày, ngân sách 3 triệu" }`

#### F08 – Cập nhật lịch trình (sau kéo thả)
- **Actor:** User
- **API:** `PATCH /trips/{id}/itinerary`

#### F09 – Xóa chuyến đi
- **Actor:** User (owner only)
- **API:** `DELETE /trips/{id}`

---

### 📅 Module 3: Quản lý Lịch trình

#### F10 – Xem timeline theo ngày
- **Actor:** User
- **Mô tả:** Hiển thị lịch trình dạng timeline nhóm theo ngày, có thời gian và chi phí.

#### F11 – Kéo thả sắp xếp lại ⭐
- **Actor:** User
- **Mô tả:** Drag & drop item trong ngày hoặc giữa các ngày.
- **Công nghệ:** `@dnd-kit/core`, `@dnd-kit/sortable`
- **Hành vi:** Sau thả → auto-save `PATCH /trips/{id}/itinerary`

#### F12 – Xác nhận hoạt động (Confirm)
- **Actor:** User
- **Mô tả:** `SUGGESTED` → `CONFIRMED`
- **API:** `POST /itinerary/{id}/confirm`

#### F13 – Hoàn thành hoạt động (Complete)
- **Actor:** User
- **Mô tả:** `CONFIRMED` → `COMPLETED`
- **API:** `POST /itinerary/{id}/complete`

---

### 🗺️ Module 4: Bản đồ tương tác

#### F14 – Bản đồ với markers theo loại ⭐
- **Actor:** User
- **Công nghệ:** Leaflet.js + OpenStreetMap
- **Màu theo loại:** 🟣 ATTRACTION · 🟡 MEAL · 🔵 TRANSPORT · 🟢 LODGING · 🔴 LODGING (booked)

#### F15 – Lộ trình nối các điểm
- **Actor:** User
- **Mô tả:** Polyline nối các địa điểm trong ngày theo thứ tự thời gian.

#### F16 – Popup thông tin khi click marker
- **Actor:** User
- **Mô tả:** Click marker → popup: tên, địa chỉ, giờ, chi phí, trạng thái booking.

---

### 🤖 Module 5: AI Chat & Tool Calling

#### F17 – Chat AI qua WebSocket ⭐
- **Actor:** User
- **Kết nối:** `WS /ai/chat-stream?token=<JWT>`
- **Input:** `{ message, trip_id }`
- **Output (stream):**
  - `{ type: "token", content: "🔍 Understanding..." }`
  - `{ type: "token", content: "🌐 Searching places..." }`
  - `{ type: "token", content: "🌤 Getting weather..." }`
  - `{ type: "final", content: "...", metadata: { trip, items } }`

#### F18 – AI Tool Calling (Agentic) ⭐⭐⭐
- **Actor:** User (trigger tự động)
- **Mô tả:** AI tự quyết định gọi tool nào dựa trên ngữ cảnh, không theo luồng cố định.
- **Các tools AI có thể gọi:**

| Tool | Mô tả | API/Service |
|---|---|---|
| `search_places` | Tìm địa điểm, nhà hàng, điểm tham quan | Tavily API |
| `get_weather` | Lấy thời tiết tại điểm đến | OpenWeather API |
| `calculate_budget` | Tính tổng ngân sách + breakdown | Internal |
| `generate_checklist` | Tạo checklist thông minh theo context | LLM |
| `export_pdf` | Xuất file PDF itinerary/budget | Internal |
| `check_hotel_availability` | Kiểm tra và gợi ý khách sạn (mock) | Mock/Tavily |

- **Ví dụ:** User nói *"Đi Huế cuối tháng 10, hay mưa không?"*
  → AI tự gọi `get_weather(Hue, October)` trước khi plan

#### F19 – Hiển thị lịch sử chat
- **Actor:** User
- **Mô tả:** Toàn bộ tin nhắn trong phiên, phân biệt user và AI bằng màu sắc.

---

### 🌤 Module 6: Thông tin Thời tiết

#### F20 – Xem thời tiết tại điểm đến
- **Actor:** User
- **Mô tả:** Khi xem trip, hiển thị thời tiết dự báo tại điểm đến trong khoảng ngày đi.
- **Service:** OpenWeather API (free tier: 5 ngày forecast)
- **API:** `GET /trips/{id}/weather`
- **Hiển thị:** Nhiệt độ min/max, icon thời tiết, mô tả (Sunny, Rainy...) theo từng ngày

#### F21 – AI gợi ý dựa trên thời tiết
- **Actor:** System (tự động)
- **Mô tả:** Nếu thời tiết xấu, AI tự điều chỉnh lịch trình (ưu tiên hoạt động trong nhà, thêm áo mưa vào checklist).

---

### 📄 Module 7: Xuất File (Export)

#### F22 – Xuất PDF Lịch trình (Itinerary PDF) ⭐
- **Actor:** User
- **Mô tả:** Xuất toàn bộ lịch trình dạng PDF có layout đẹp.
- **Nội dung PDF:**
  - Trang bìa: tên trip, điểm đến, ngày đi, thời tiết tổng quan
  - Lịch trình từng ngày: giờ, tên hoạt động, địa chỉ, ghi chú
  - Bản đồ static (nếu có)
- **API:** `GET /trips/{id}/export/pdf`
- **Công nghệ:** `reportlab` hoặc `weasyprint` (Python)

#### F23 – Xuất PDF Ngân sách (Budget PDF) ⭐
- **Actor:** User
- **Mô tả:** Xuất báo cáo chi phí chi tiết dạng PDF.
- **Nội dung:**
  - Tổng ngân sách vs Chi phí ước tính
  - Breakdown theo ngày và loại (MEAL, ATTRACTION, TRANSPORT, LODGING)
  - Biểu đồ tròn (pie chart) phân bổ chi phí
- **API:** `GET /trips/{id}/export/budget`

#### F24 – Xuất Checklist thông minh (AI Checklist) ⭐⭐
- **Actor:** User
- **Mô tả:** AI tạo checklist đồ dùng cần mang dựa trên context chuyến đi.
- **Yếu tố AI xét đến:**
  - Điểm đến (biển → áo tắm, núi → giày leo núi)
  - Thời tiết (mưa → áo mưa, lạnh → áo ấm)
  - Số ngày (dài → nhiều đồ hơn)
  - Loại hoạt động (bơi lội, leo núi, ẩm thực...)
  - Profile user (trẻ em → thêm mục cho bé)
- **API:** `GET /trips/{id}/export/checklist`
- **Output:** File PDF hoặc Markdown có checkbox

---

### 🏨 Module 8: Đặt Khách sạn (Mock Booking)

#### F25 – AI gợi ý khách sạn phù hợp ⭐
- **Actor:** User
- **Mô tả:** Dựa trên điểm đến + ngân sách + preferences, AI gợi ý danh sách khách sạn phù hợp.
- **Nguồn dữ liệu:** Tavily search + LLM ranking
- **Hiển thị:** Tên, địa chỉ, giá ước tính/đêm, rating, link đặt phòng thật (Booking.com)

#### F26 – Mock đặt khách sạn ⭐
- **Actor:** User
- **Mô tả:** User chọn khách sạn → hệ thống tạo "booking confirmation" mô phỏng.
- **Luồng:**
  1. User click "Book này" trên card khách sạn
  2. Nhập ngày check-in/out (auto-fill từ trip dates)
  3. Hệ thống tạo confirmation: `BOOKING-{random_id}`
  4. Lưu vào DB, thêm item `LODGING` vào itinerary với status `CONFIRMED`
  5. Marker trên bản đồ chuyển sang màu đỏ 🔴 (đã đặt)
- **API:** `POST /trips/{id}/booking`
- **Lưu ý:** Đây là **simulation** – không kết nối API đặt phòng thật

#### F27 – Xem danh sách đặt phòng
- **Actor:** User
- **Mô tả:** Hiển thị tất cả bookings của trip với trạng thái và mã xác nhận.
- **API:** `GET /trips/{id}/bookings`

---

### 🧠 Module 9: Bộ nhớ AI (Memory System)

#### F28 – Lưu memory sau mỗi tương tác
- **Actor:** System (tự động)
- **Mô tả:** Sau mỗi lần tạo/sửa trip, lưu nội dung dưới dạng vector embedding.
- **Công nghệ:** OpenAI `text-embedding-3-small` + pgvector

#### F29 – Cá nhân hóa gợi ý từ memory
- **Actor:** System (tự động)
- **Mô tả:** Khi tạo trip mới, AI tìm memories liên quan (cosine similarity) để cá nhân hóa.
- **Ví dụ:** Nhớ "không ăn hải sản" → không gợi ý nhà hàng hải sản

---

### 👑 Module 10: Quản trị (Admin)

#### F30 – Xem dashboard thống kê
- **Actor:** Admin
- **Mô tả:** Trang tổng quan với các số liệu hệ thống.
- **Hiển thị:**
  - Tổng số users, trips, itinerary items
  - Biểu đồ trips tạo theo ngày/tuần
  - Top destinations được tạo nhiều nhất
- **API:** `GET /admin/stats`

#### F31 – Xem danh sách users
- **Actor:** Admin
- **Mô tả:** Bảng danh sách tất cả users với email, ngày tạo, số trips.
- **API:** `GET /admin/users`

#### F32 – Xóa user (cascade)
- **Actor:** Admin
- **Mô tả:** Xóa user và toàn bộ dữ liệu liên quan (trips, itinerary, memory).
- **API:** `DELETE /admin/users/{id}`

---

## 4. Trạng thái (Status Flows)

### Itinerary Item
```
SUGGESTED → CONFIRMED → COMPLETED
```

### Trip
```
PLANNED → ACTIVE → COMPLETED
```

### Booking (mới)
```
PENDING → CONFIRMED → CANCELLED
```

---

## 5. Tổng hợp (v2.0)

| Loại | Số lượng |
|---|---|
| User Roles | 3 (Guest, User, Admin) |
| Modules | 10 |
| Chức năng (Features) | 32 |
| REST API Endpoints | ~20 |
| WebSocket Endpoints | 1 |
| AI Tools (Tool Calling) | 6 |
| External APIs | 3 (OpenAI, Tavily, OpenWeather) |
| Loại Itinerary Item | 4 (ATTRACTION, MEAL, TRANSPORT, LODGING) |
| File Export | 3 (Itinerary PDF, Budget PDF, Checklist) |

---

## 6. Roadmap Triển khai

```
✅ Đã hoàn thành:
   F01-F04  Auth
   F05-F09  Trip CRUD
   F10-F13  Itinerary management
   F14-F16  Interactive Map
   F17, F19 Chat Interface + WebSocket streaming
   F28-F29  Memory System

🚧 Đang làm:
   F07      AI Trip Generation (fix bugs)

📌 Sẽ làm (theo thứ tự ưu tiên):
   F20-F21  Weather Integration      (1-2 ngày)
   F22-F23  Export PDF               (2-3 ngày)
   F24      AI Checklist             (1 ngày)
   F18      Tool Calling             (2-3 ngày)
   F25-F27  Mock Hotel Booking       (2-3 ngày)
   F30-F32  Admin Dashboard          (2 ngày)
```
