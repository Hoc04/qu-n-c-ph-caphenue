# ☕ caPHEnue - Hệ Thống Quản Lý Quán Cà Phê & Dịch Vụ Đặt Bàn, Đặt Món Trực Tuyến

Hệ thống số hóa toàn diện dành cho quán cà phê hiện đại, tích hợp đặt món trực tuyến, đặt bàn giữ chỗ, tích điểm thành viên, cổng quản trị POS và quản trị nhân sự (HRM) chuẩn Bộ luật Lao động Việt Nam.

---

## 🌟 Tính Năng Nổi Bật

### 1. 🛍️ Trải Nghiệm Khách Hàng (Customer Portal)
* **Thực đơn đa dạng**: Cà phê truyền thống (Cà phê trứng, muối, sữa đá), Trà hoa quả nhiệt đới, và Bánh ngọt phong phú (Croissant, Tiramisu, Cheesecake Basque, Red Velvet,...).
* **Giỏ hàng & Đặt hàng**: Đặt món trực tuyến, ghi chú đơn hàng, tính tiền thời gian thực.
* **Tích điểm & Hội viên**: Nhập số điện thoại để tra cứu hạng thẻ (Đồng, Bạc, Vàng, Kim Cương), tích lũy điểm và áp dụng mã voucher ưu đãi.
* **Đặt bàn trực tuyến**: Chọn ngày giờ, số lượng khách, đặt bàn sảnh thường, bàn sân vườn hoặc phòng VIP riêng tư.

### 2. 🛡️ Cổng Quản Trị & POS (Admin Portal - `admin.html`)
* **Bảng điều khiển doanh thu**: Thống kê doanh thu theo ngày, số lượng đơn hàng, hóa đơn tại quầy.
* **Quản lý thực đơn & Đơn hàng**: Cập nhật trạng thái pha chế, hoàn thành đơn, in hóa đơn.
* **Quản lý Đặt bàn**: Tiếp nhận và xác nhận lịch hẹn của khách.

### 3. 👥 Quản Trị Nhân Sự & Chấm Công (HRM)
* **Hồ sơ nhân sự & Hợp đồng**: Quản lý thông tin nhân viên, chức danh (Quản lý, Pha chế, Thu ngân, Phục vụ), mức lương theo giờ và loại hợp đồng lao động.
* **Bảng chấm công linh hoạt**:
  * Phân ca khoa học: **🌅 Ca Sáng (07:00 – 12:30)** và **🌙 Ca Tối (17:30 – 23:30)**.
  * Hỗ trợ chấm công vào ca và kết thúc ca thời gian thực.
  * Bộ lọc nhanh theo ca làm và trạng thái làm việc.
* **Tuân thủ Pháp lý Lao động (Điều 98 BLLĐ 2019)**:
  * Tự động nhận diện giờ làm việc ban đêm (sau 22:00) để cộng thêm **+30%** phụ cấp theo luật định.
  * Tự động tổng hợp giờ làm và tính bảng lương tháng chính xác.

---

## 🛠️ Công Nghệ Sử Dụng

* **Frontend**: HTML5, Modern CSS3 (Responsive Design, Glassmorphism, Theme hoa anh đào), JavaScript Vanilla (Single Page Application - SPA).
* **Backend**: Node.js, Express.js RESTful API, JSON Web Token (JWT).
* **Database**: MySQL / MariaDB (hỗ trợ cả Neon Serverless PostgreSQL với script `cafe_loyalty_neon.sql`).

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Clone mã nguồn
```bash
git clone https://github.com/Hoc04/qu-n-c-ph-caphenue.git
cd qu-n-c-ph-caphenue
```

### 2. Cài đặt thư viện Backend
```bash
cd backend
npm install
cd ..
```

### 3. Cấu hình Cơ sở dữ liệu
* Tạo cơ sở dữ liệu `caphenue` trong MySQL / phpMyAdmin.
* Import tệp `cafe_loyalty.sql` vào cơ sở dữ liệu.
* Tạo tệp `backend/.env` từ tệp mẫu `backend/.env.example`:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=caphenue
JWT_SECRET=caphenue_secret_key_2026_super_secure
API_KEY=caphenue_api_key_2026
```

### 4. Khởi chạy Server
```bash
# Cách 1: Chạy file batch có sẵn
start_backend.bat

# Cách 2: Chạy bằng npm
npm run dev
```

* Mở trình duyệt và truy cập:
  * **Trang chủ Khách hàng**: [http://localhost:3000](http://localhost:3000)
  * **Cổng Quản trị POS & HRM**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)  
    *(Tài khoản mặc định: `admin` / `123456`)*

---

## 📄 Bản Quyền
Dự án được xây dựng và phát triển bởi **Hoc04**. Mọi đóng góp và sao chép vui lòng ghi rõ nguồn tác giả.
