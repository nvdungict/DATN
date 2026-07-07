# Hướng Dẫn Chạy Dự Án (AI Travel Assistant)

Dự án này là một ứng dụng trợ lý du lịch AI (AI Travel Assistant) bao gồm Frontend (Next.js), Backend (FastAPI), và Database (PostgreSQL + pgvector).

Dưới đây là các bước để cài đặt và chạy dự án. Bạn có thể chọn chạy bằng **Docker** (khuyên dùng để nhanh gọn) hoặc chạy **thủ công** từng dịch vụ để dễ dàng lập trình.

---

## 🐳 1. Cách 1: Chạy bằng Docker (Khuyên Dùng)

Đây là cách nhanh nhất, Docker sẽ tự động setup database, backend và frontend, sau đó kết nối chúng với nhau.

**Yêu cầu:** Máy bạn cần cài sẵn [Docker](https://www.docker.com/) (các phiên bản Docker Desktop mới hiện nay sử dụng lệnh `docker compose` thay vì `docker-compose` cũ).

1. Khởi động toàn bộ dự án:
   ```bash
   docker compose up -d --build
   ```
   - Cờ `--build` dùng để build lại các image (cần thiết cho lần đầu tiên hoặc khi có thay đổi thư viện trong `package.json` / `requirements.txt`).
   - **Các lần chạy sau:** Bạn chỉ cần gõ lệnh ngắn gọn (không build lại nên lên rất nhanh):
     ```bash
     docker compose up -d
     ```
   *(Lưu ý: Nếu máy bạn dùng phiên bản Docker cũ, hãy dùng lệnh `docker-compose up -d`)*

2. Các dịch vụ sẽ chạy tại:
   - **Frontend:** http://localhost:3000
   - **Backend API Docs:** http://localhost:8000/docs
   - **Database (PostgreSQL):** `localhost:5433` (Ánh xạ từ port 5432 của container)

3. Để tắt hệ thống, bạn chạy lệnh:
   ```bash
   docker compose down
   ```

---

## 💻 2. Cách 2: Chạy thủ công (Dành cho Development)

Nếu bạn muốn debug trực tiếp hoặc thay đổi code frontend/backend tiện lợi hơn thì chạy thủ công từng phần.

### 3.1. Chạy Database
Bạn vẫn nên dùng Docker để chạy PostgreSQL (có pgvector) cho nhanh, hoặc có thể sử dụng service DB trên local tùy ý.
```bash
docker compose up -d postgres
```
*(Database sẽ chạy ở port 5433. Nếu chạy riêng trên local, hãy sửa `DATABASE_URL` trong `.env` thành port tương ứng (VD: 5432))*

### 3.2. Chạy Backend (FastAPI)
**Yêu cầu:** Đã cài đặt [Python 3.10+](https://www.python.org/).

1. Mở terminal mới, di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```
2. Tạo môi trường ảo (Virtual Environment) và kích hoạt nó:
   ```bash
   python -m venv venv
   # Trên Mac/Linux:
   source venv/bin/activate
   # Trên Windows:
   # venv\Scripts\activate
   ```
3. Cài đặt các thư viện cần thiết:
   ```bash
   pip install -r requirements.txt
   ```
4. Khởi động server backend:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *(Backend đang chạy tại http://localhost:8000 - Bạn có thể xem Swagger UI tại http://localhost:8000/docs)*

### 3.3. Chạy Frontend (Next.js)
**Yêu cầu:** Đã cài đặt [Node.js](https://nodejs.org/) (Khuyên dùng v18+).

1. Mở terminal mới, di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```
2. Cài đặt các packages phụ thuộc:
   ```bash
   npm install
   ```
3. Khởi động server frontend chế độ dev:
   ```bash
   npm run dev
   ```
   *(Frontend đang chạy tại http://localhost:3000)*

---

## 🛠️ Một số lệnh hữu ích khác

- **Xem log của Docker:**
  ```bash
  docker compose logs -f
  # Xem log của từng dịch vụ cụ thể
  docker compose logs -f backend
  docker compose logs -f frontend
  ```
- **Xóa sạch data cũ của Database trong Docker:**
  ```bash
  docker compose down -v
  ```
