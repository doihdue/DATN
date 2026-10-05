# HỆ THỐNG QUẢN LÝ HÀNG ĐỢI VÀ TƯ VẤN KHÁM BỆNH THÔNG MINH (MEDQUEUE)

Dự án Đồ án Tốt nghiệp được xây dựng theo kiến trúc Microservices & Client-Server hiện đại:
- **Frontend (FE):** Angular 22 (Standalone Components, SCSS, RxJS)
- **Backend (BE):** Spring Boot 4.x / Java 17, Spring Security + JWT, Spring Data JPA, WebSocket
- **Cơ sở dữ liệu (DB):** Microsoft SQL Server (Hỗ trợ toàn diện Unicode tiếng Việt `NVARCHAR`)
- **AI Service:** Python FastAPI, RAG Knowledge Base, Machine Learning Predictor (Dự báo thời gian chờ khám)

---

## 📋 1. Yêu cầu môi trường (Prerequisites)

Trước khi khởi chạy dự án, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:

1. **Java:** JDK 17 trở lên ([Tải OpenJDK 17](https://adoptium.net/))
   - Kiểm tra bằng lệnh: `java -version`
2. **Node.js & npm:** Node.js v18.x hoặc v20.x ([Tải Node.js](https://nodejs.org/))
   - Kiểm tra bằng lệnh: `node -v` và `npm -v`
3. **Cơ sở dữ liệu:** Microsoft SQL Server 2019 / 2022 hoặc SQL Server Express
   - Cần bật xác thực **SQL Server and Windows Authentication mode** (tài khoản `sa`)
   - Bật giao thức **TCP/IP** trên cổng mặc định `1433` trong *SQL Server Configuration Manager*.
4. **Python (Tùy chọn - Chạy Chatbot AI):** Python 3.10+ ([Tải Python](https://www.python.org/))

---

## 🗄️ 2. Cấu hình Cơ sở dữ liệu (SQL Server)

1. Mở **SQL Server Management Studio (SSMS)** và kết nối với máy chủ của bạn.
2. Tạo mới một cơ sở dữ liệu trống có tên `DATN`:
   ```sql
   CREATE DATABASE DATN;
   GO
   ```
3. Kiểm tra thông tin đăng nhập trong file cấu hình Backend tại:  
   `BE/src/main/resources/application.properties`
   ```properties
   spring.datasource.url=jdbc:sqlserver://localhost:1433;databaseName=DATN;encrypt=true;trustServerCertificate=true;sendStringParametersAsUnicode=true;characterEncoding=UTF-8;
   spring.datasource.username=sa
   spring.datasource.password=123456
   ```
   > ⚠️ **Lưu ý:** Nếu tài khoản `sa` trên máy bạn có mật khẩu khác `123456`, hãy sửa lại tham số `spring.datasource.password` cho tương ứng. Khi chạy lần đầu, Spring Boot sẽ tự động sinh bảng (`ddl-auto=update`).

---

## ⚙️ 3. Hướng dẫn khởi chạy Backend (Spring Boot)

### Cách 1: Chạy bằng dòng lệnh Terminal / PowerShell (Khuyến nghị)
Mở một cửa sổ Terminal tại thư mục gốc của dự án:

```bash
# 1. Di chuyển vào thư mục BE
cd BE

# 2. Khởi chạy ứng dụng bằng Maven Wrapper:
# Trên Windows (PowerShell / CMD):
.\mvnw.cmd spring-boot:run

# (Hoặc nếu máy đã cài sẵn Maven):
mvn clean spring-boot:run
```

### Cách 2: Chạy trên IDE (IntelliJ IDEA / Eclipse / VS Code)
1. Mở thư mục `BE` trong IntelliJ IDEA dưới dạng một **Maven Project**.
2. Đợi IDE tải xong các dependency trong `pom.xml`.
3. Tìm đến file khởi chạy chính: `src/main/java/com/demo/be/BeApplication.java`.
4. Nhấn nút **Run** (phím tắt `Shift + F10`).

> 🚀 **Kiểm tra:** Backend sẽ chạy thành công tại địa chỉ: `http://localhost:8080`.  
> API Base URL: `http://localhost:8080/api`

---

## 💻 4. Hướng dẫn khởi chạy Frontend (Angular)

Mở một cửa sổ Terminal mới (song song với Terminal chạy Backend):

```bash
# 1. Di chuyển vào thư mục FE
cd FE

# 2. Cài đặt các thư viện phụ thuộc (chỉ cần chạy ở lần đầu tiên):
npm install

# 3. Khởi chạy máy chủ phát triển (Development Server):
npm start
# (hoặc: npx ng serve)
```

> 🚀 **Kiểm tra:** 
> - Sau khi biên dịch thành công, mở trình duyệt truy cập: **`http://localhost:4200`**
> - Mọi thao tác trên giao diện sẽ tự động kết nối đến API Backend tại cổng `8080`.

---

## 🤖 5. Hướng dẫn khởi chạy AI Service (FastAPI - Module Chatbot)

Module AI đảm nhiệm việc tư vấn triệu chứng, tra cứu số thứ tự khám tự động và dự báo thời gian chờ bằng Machine Learning.

Mở một cửa sổ Terminal thứ ba:

### Cách 1: Chạy nhanh bằng file script có sẵn (Windows)
Vào thư mục `ai-service` và nhấp đúp chuột vào file:
```
ai-service/run_ai.bat
```

### Cách 2: Chạy bằng dòng lệnh
```bash
# 1. Di chuyển vào thư mục ai-service
cd ai-service

# 2. Cài đặt các thư viện cần thiết:
pip install -r requirements.txt

# 3. Khởi chạy FastAPI Server:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> 🚀 **Kiểm tra:**
> - AI Service sẽ chạy tại: `http://localhost:8000`
> - Trang kiểm tra tài liệu API: `http://localhost:8000/docs`

---

## 🌐 6. Bảng tổng hợp Cổng và Dịch vụ (Port Mapping)

| Thành phần | Công nghệ | Cổng mặc định (Port) | Đường dẫn truy cập |
| :--- | :--- | :---: | :--- |
| **Frontend** | Angular | `4200` | `http://localhost:4200` |
| **Backend** | Spring Boot | `8080` | `http://localhost:8080/api` |
| **AI Service** | FastAPI (Python) | `8000` | `http://localhost:8000` (Docs: `/docs`) |
| **Database** | SQL Server | `1433` | `localhost:1433` (DB: `DATN`) |

---

## 🛠️ 7. Xử lý sự cố thường gặp (Troubleshooting)

1. **Lỗi `Cannot connect to SQL Server on localhost:1433`:**
   - Mở *SQL Server Configuration Manager* $\rightarrow$ *SQL Server Network Configuration* $\rightarrow$ *Protocols for MSSQLSERVER*.
   - Đảm bảo **TCP/IP** đang ở trạng thái **Enabled**. Nhấp đúp vào TCP/IP, qua tab *IP Addresses*, cuộn xuống cuối mục *IPAll* đặt *TCP Port* là `1433`.
   - Khởi động lại dịch vụ SQL Server trong mục *SQL Server Services*.

2. **Lỗi `Port 8080 is already in use`:**
   - Kiểm tra ứng dụng khác đang chiếm cổng 8080 (hoặc mở Task Manager kết thúc tiến trình Java cũ).
   - Hoặc đổi port sang số khác trong `BE/src/main/resources/application.properties` (ví dụ `server.port=8081`).

3. **Lỗi `npm install` trên Frontend:**
   - Chạy lệnh: `npm cache clean --force` rồi chạy lại `npm install`.
   - Đảm bảo phiên bản Node.js của bạn nằm trong khoảng khuyến nghị (v18.x hoặc v20.x).
