# BÁO CÁO GIẢI THÍCH KIẾN TRÚC HỆ THỐNG - AI TRAVEL ASSISTANT

Tài liệu này giải thích chi tiết sơ đồ kiến trúc hệ thống, tập trung vào **lý do tại sao chọn công nghệ đó** và **vai trò của nó trong bài toán Agentic AI**.

---

## 1. BROWSER (NEXT.JS) & GIAO THỨC GIAO TIẾP

**Công nghệ sử dụng:** Next.js (React), TailwindCSS, REST API, WebSocket.

### Tại sao lại cần cả REST API và WebSocket?
- **REST API (gắn JWT Token):** Dùng cho các thao tác chuẩn (CRUD) như lấy danh sách chuyến đi, cập nhật trạng thái hoạt động (Confirm/Complete), hoặc xác thực người dùng. REST phù hợp vì nó stateless, dễ scale và có tính nhất quán cao.
- **WebSocket (Streaming):** Đây là công nghệ cốt lõi cho tính năng AI Chat. Trái với HTTP truyền thống (client hỏi, chờ server xử lý xong mới trả lời toàn bộ), WebSocket mở một kết nối liên tục hai chiều. Khi AI Agent gọi OpenAI, nó nhận kết quả trả về theo **từng chữ (token streaming)** và đẩy ngay lập tức qua WebSocket về Browser. Điều này mang lại trải nghiệm mượt mà, cảm giác AI đang "gõ chữ" theo thời gian thực (real-time).

---

## 2. FASTAPI (PYTHON) - BACKEND SERVER

**Công nghệ sử dụng:** FastAPI, Pydantic, SQLAlchemy.

### Tại sao chọn FastAPI thay vì Node.js/Express?
Vì lõi AI của dự án (LangGraph/LangChain) được hỗ trợ tốt nhất bằng ngôn ngữ **Python**. FastAPI là framework Python hiện đại, xử lý bất đồng bộ (async/await) cực kỳ xuất sắc, có sẵn hỗ trợ WebSocket native và tự động sinh tài liệu API (Swagger).

### Cấu trúc 4 nhóm Routes chính:
1. **Auth Routes:** Đảm nhiệm bảo mật. Mật khẩu được băm (hash) bằng `bcrypt` trước khi lưu. Khi đăng nhập thành công, server cấp một `JWT` (JSON Web Token) để client dùng cho các request sau.
2. **Trip Routes:** Xử lý nghiệp vụ chính. Đặc biệt, khi có request tạo chuyến đi mới, Route này sẽ **kích hoạt (trigger) LangGraph Agent** chạy nền để tự động sinh lịch trình thay vì chỉ lưu data cứng.
3. **Itinerary Routes:** Cập nhật trạng thái từng địa điểm (Gợi ý -> Xác nhận -> Hoàn thành).
4. **AI Chat Route:** Quản lý kết nối WebSocket, nhận tin nhắn từ user, nạp vào LangGraph Agent và stream kết quả trả về.

---

## 3. LANGGRAPH AGENT - LÕI TRÍ TUỆ NHÂN TẠO

**Công nghệ sử dụng:** LangGraph (thuộc hệ sinh thái LangChain).

### Tại sao dùng LangGraph thay vì chỉ gọi OpenAI API thông thường?
Nếu chỉ gọi OpenAI API, hệ thống sẽ là một chatbot hỏi-đáp tĩnh.
Bằng cách dùng **LangGraph**, hệ thống trở thành một **Agentic AI** (AI tự chủ). Nghĩa là:
- AI không sinh câu trả lời ngay. Nó chạy qua một luồng đồ thị (graph pipeline):
  1. **Hiểu (Understand):** Phân tích xem user muốn gì (tạo trip, hỏi thông tin, hay thay đổi lịch trình).
  2. **Quyết định (Decision):** Lựa chọn công cụ phù hợp.
  3. **Truy vấn (Retrieve):** Lấy bối cảnh từ cơ sở dữ liệu.
  4. **Hành động (Action):** Gọi Search web hoặc sinh lịch trình JSON.
- Nó có khả năng **suy luận nhiều bước (multi-step reasoning)** trước khi đưa ra kết quả cuối cùng.

---

## 4. EXTERNAL APIs (OPENAI & TAVILY)

**Công nghệ sử dụng:** GPT-4o, Tavily Search Engine.

- **OpenAI API (GPT-4o):** Đóng vai trò là "bộ não" suy luận ngôn ngữ, trích xuất dữ liệu, định dạng cấu trúc JSON, và giao tiếp tự nhiên với người dùng.
- **Tavily API:** Đây là công cụ Search engine tối ưu hóa riêng cho LLMs. 
  - **Lý do sử dụng:** GPT-4o có thể bị "ảo giác" (hallucination) hoặc dữ liệu bị lỗi thời (VD: không biết quán ăn nào vừa đóng cửa tháng trước). Agent sẽ tự động gọi Tavily để tìm kiếm tin tức, giá cả, thời tiết theo thời gian thực (real-time grounding) trước khi trả lời user.

---

## 5. POSTGRESQL + PGVECTOR - LƯU TRỮ VÀ BỘ NHỚ AI

**Công nghệ sử dụng:** PostgreSQL 16, pgvector extension.

Hệ thống sử dụng cơ sở dữ liệu với 2 vai trò song song (Hybrid Database):

### 1. Tabular Data (Dữ liệu bảng cấu trúc)
Lưu trữ Users, Trips, Itinerary (lịch trình). Đây là phần dữ liệu nghiệp vụ truyền thống đảm bảo hệ thống hiển thị chính xác UI/UX.

### 2. Vector Memory (Bộ nhớ ngữ nghĩa) với pgvector
- **Vấn đề:** Làm sao để AI nhớ được toàn bộ cuộc hội thoại dài, hoặc nhớ sở thích của user từ các chuyến đi trước mà không bị quá tải token?
- **Giải pháp:** Sử dụng **pgvector**. Mỗi đoạn hội thoại hoặc sở thích của user được AI mã hóa thành các chuỗi số (Vector Embeddings). Khi user hỏi một câu mới, hệ thống tính toán **khoảng cách vector (cosine similarity)** để lôi ra những ký ức liên quan nhất ghép vào prompt (RAG - Retrieval-Augmented Generation). Nhờ đó, AI có "Trí nhớ dài hạn" (Long-term Memory) một cách tối ưu.

---

## KẾT LUẬN

Sự kết hợp giữa **FastAPI (Xử lý đa luồng, WebSocket)**, **LangGraph (Tư duy Agentic)**, **pgvector (Bộ nhớ Vector)** và **Next.js (Giao diện tương tác cao)** đã tạo nên một kiến trúc khác biệt hoàn toàn so với mô hình web CRUD truyền thống, đáp ứng đầy đủ yêu cầu khắt khe của một ứng dụng AI tạo sinh (GenAI) thế hệ mới.
