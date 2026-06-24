# 📊 Tiến độ Chức năng – AI Travel Assistant
> Cập nhật: 2026-04-22

---

## Tóm tắt nhanh

| Trạng thái | Số lượng |
|---|---|
| ✅ Hoàn thành | 20 |
| 🟡 Một phần | 3 |
| ❌ Chưa làm | 9 |

---

## 🔐 Module 1: Xác thực & Tài khoản

| ID | Chức năng | Trạng thái | Ghi chú |
|---|---|---|---|
| F01 | Đăng ký tài khoản | ✅ | `POST /auth/register`, bcrypt hash |
| F02 | Đăng nhập | ✅ | `POST /auth/token`, trả JWT |
| F03 | Xem thông tin cá nhân | ✅ | `GET /auth/me` · `PATCH /auth/me` · Trang `/profile` + avatar trên navbar |
| F04 | Đăng xuất | ✅ | Frontend xoá token khỏi localStorage |

---

## ✈️ Module 2: Quản lý Chuyến đi

| ID | Chức năng | Trạng thái | Ghi chú |
|---|---|---|---|
| F05 | Xem danh sách chuyến đi | ✅ | `GET /trips` |
| F06 | Xem chi tiết chuyến đi | ✅ | `GET /trips/{id}` + `/itinerary` |
| F07 | Tạo chuyến đi bằng AI | ✅ | `POST /trips/generate` → LangGraph agent |
| F08 | Cập nhật lịch trình (sau kéo thả) | ✅ | `PATCH /trips/{id}/itinerary` |
| F09 | Xoá chuyến đi | ✅ | `DELETE /trips/{id}` · **Fix hôm nay:** cascade delete itinerary_items + memory |

---

## 📅 Module 3: Quản lý Lịch trình

| ID | Chức năng | Trạng thái | Ghi chú |
|---|---|---|---|
| F10 | Xem timeline theo ngày | ✅ | Frontend `Dashboard.tsx` |
| F11 | Kéo thả sắp xếp lại | ✅ | `@dnd-kit`, auto-save |
| F12 | Xác nhận hoạt động (CONFIRMED) | ✅ | `POST /itinerary/{id}/confirm` |
| F13 | Hoàn thành hoạt động (COMPLETED) | ✅ | `POST /itinerary/{id}/complete` |

---

## 🗺️ Module 4: Bản đồ tương tác

| ID | Chức năng | Trạng thái | Ghi chú |
|---|---|---|---|
| F14 | Bản đồ với markers theo loại | ✅ | Leaflet + OpenStreetMap, màu theo type |
| F15 | Lộ trình nối các điểm | ✅ | Polyline theo thứ tự thời gian |
| F16 | Popup thông tin khi click marker | ✅ | Tên, địa chỉ, giờ, chi phí |

---

## 🤖 Module 5: AI Chat & Tool Calling

| ID | Chức năng | Trạng thái | Ghi chú |
|---|---|---|---|
| F17 | Chat AI qua WebSocket | ✅ | `WS /ai/chat-stream` streaming · **Fix hôm nay:** auto-reconnect + token expired handling |
| F18 | AI Tool Calling (Agentic) | 🟡 | Agent có tools nhưng chưa đủ 6 tools theo spec (thiếu: export_pdf, generate_checklist, check_hotel_availability) |
| F19 | Hiển thị lịch sử chat | ✅ | **Fix hôm nay:** localStorage per `trip_id`, nút 🗑 xoá |

---

## 🌤 Module 6: Thông tin Thời tiết

| ID | Chức năng | Trạng thái | Ghi chú |
|---|---|---|---|
| F20 | Xem thời tiết tại điểm đến | ❌ | Chưa implement – cần `GET /trips/{id}/weather` + OpenWeather API |
| F21 | AI gợi ý dựa trên thời tiết | ❌ | Phụ thuộc F20 |

---

## 📄 Module 7: Xuất File (Export)

| ID | Chức năng | Trạng thái | Ghi chú |
|---|---|---|---|
| F22 | Xuất PDF Lịch trình | ❌ | Chưa implement – cần `GET /trips/{id}/export/pdf` |
| F23 | Xuất PDF Ngân sách | ❌ | Chưa implement |
| F24 | AI Checklist thông minh | ❌ | Chưa implement |

---

## 🏨 Module 8: Đặt Khách sạn (Mock)

| ID | Chức năng | Trạng thái | Ghi chú |
|---|---|---|---|
| F25 | AI gợi ý khách sạn | ❌ | Chưa implement |
| F26 | Mock đặt khách sạn | ❌ | Chưa implement – cần model Booking + `POST /trips/{id}/booking` |
| F27 | Xem danh sách đặt phòng | ❌ | Chưa implement |

---

## 🧠 Module 9: Bộ nhớ AI (Memory)

| ID | Chức năng | Trạng thái | Ghi chú |
|---|---|---|---|
| F28 | Lưu memory sau mỗi tương tác | ✅ | `finalize_node` → `save_memory()` → pgvector |
| F29 | Cá nhân hóa gợi ý từ memory | ✅ | `retrieve_node` → cosine similarity search |

---

## 👑 Module 10: Quản trị (Admin)

| ID | Chức năng | Trạng thái | Ghi chú |
|---|---|---|---|
| F30 | Dashboard thống kê | ❌ | Chưa implement – cần `GET /admin/stats` |
| F31 | Xem danh sách users | ❌ | Chưa implement |
| F32 | Xoá user (cascade) | ❌ | Chưa implement |

---

## 🛠️ Bug fixes thực hiện hôm nay (2026-04-22)

| # | Vấn đề | Fix |
|---|---|---|
| 1 | ASK_INFO tốn thêm 1 LLM call (plan_node) | Thêm `answer_node` + shortcut `search → answer → finalize` |
| 2 | Chat query Tavily không liên quan với câu hỏi | `search_node` dùng `user_message` trực tiếp cho ASK_INFO |
| 3 | AI trả lời "không có thông tin" dù biết | Cải thiện `answer_node` prompt cho phép dùng general knowledge |
| 4 | Gõ tiếng Việt bị tách câu thành 2 message | Thêm `isComposing` guard trong `handleKeyDown` |
| 5 | Chat history mất khi navigate | localStorage per `trip_id`, tối đa 100 tin |
| 6 | WebSocket lỗi liên tục (token hết hạn) | Detect close code 1008 → hiện thông báo, dừng reconnect |
| 7 | Xoá trip bị lỗi 500 (FK violation) | Cascade delete: xoá itinerary_items + memory trước |

---

## 🎯 Thứ tự ưu tiên tiếp theo

```
1. F20-F21  Weather Integration      (1-2 ngày)
2. F22-F23  Export PDF               (2-3 ngày)
3. F24      AI Checklist             (1 ngày)
4. F18      Tool Calling đầy đủ      (2-3 ngày)
5. F25-F27  Mock Hotel Booking       (2-3 ngày)
6. F30-F32  Admin Dashboard          (2 ngày)
```
