-- ============================================================================
-- caPHEnue - CƠ SỞ DỮ LIỆU CHUẨN POSTGRESQL / NEON SERVERLESS CLOUD
-- Dự án: Quản Lý Khách Hàng Thân Thiết Quán Cà Phê (caPHEnue)
-- Tương thích 100% Neon Console: https://console.neon.tech/app/org-holy-meadow-01893503/projects
-- ============================================================================

-- 1. DỌN DẸP BẢNG CŨ (NẾU ĐÃ TỒN TẠI)
DROP TABLE IF EXISTS point_transactions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS redemptions CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS membership_tiers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. KHỞI TẠO CẤU TRÚC BẢNG (DDL)

-- 2.1. Bảng users (Nhân viên & Quản trị viên)
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(15)  DEFAULT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('ADMIN', 'STAFF')),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.2. Bảng membership_tiers (4 Hạng thành viên: Đồng, Bạc, Vàng, Kim Cương)
CREATE TABLE membership_tiers (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(50)   NOT NULL UNIQUE,
  min_points       INT           NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2)  NOT NULL DEFAULT 0,
  point_multiplier NUMERIC(3,2)  NOT NULL DEFAULT 1
);

-- 2.3. Bảng customers (Khách hàng thân thiết)
CREATE TABLE customers (
  id              SERIAL PRIMARY KEY,
  tier_id         INT          NOT NULL REFERENCES membership_tiers(id),
  code            VARCHAR(20)  NOT NULL UNIQUE,
  full_name       VARCHAR(100) NOT NULL,
  phone           VARCHAR(15)  NOT NULL UNIQUE,
  email           VARCHAR(100),
  birthday        DATE,
  gender          VARCHAR(10),
  address         VARCHAR(255),
  points_balance  INT          NOT NULL DEFAULT 0,
  lifetime_points INT          NOT NULL DEFAULT 0,
  password_hash   VARCHAR(255) DEFAULT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_neon_customers_phone ON customers (phone);
CREATE INDEX idx_neon_customers_name  ON customers (full_name);

-- 2.4. Bảng product_categories (Danh mục món)
CREATE TABLE product_categories (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 2.5. Bảng products (13 Món ăn & Đồ uống hot trend)
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  category_id INT           NOT NULL REFERENCES product_categories(id),
  name        VARCHAR(150)  NOT NULL,
  price       NUMERIC(12,0) NOT NULL,
  image_emoji VARCHAR(20)   DEFAULT '☕',
  image_url   VARCHAR(255)  DEFAULT NULL,
  description VARCHAR(255)  DEFAULT NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE
);

-- 2.6. Bảng rewards (Ưu đãi đổi điểm: 1 điểm = 400đ)
CREATE TABLE rewards (
  id          SERIAL PRIMARY KEY,
  product_id  INT REFERENCES products(id),
  name        VARCHAR(150)  NOT NULL,
  points_cost INT           NOT NULL,
  reward_type VARCHAR(20)   NOT NULL CHECK (reward_type IN ('PERCENT', 'AMOUNT', 'FREE_ITEM')),
  value       NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock       INT,
  valid_from  DATE,
  valid_to    DATE,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE
);

-- 2.7. Bảng redemptions (Voucher khách đã đổi UD-XXXXXX)
CREATE TABLE redemptions (
  id           SERIAL PRIMARY KEY,
  customer_id  INT         NOT NULL REFERENCES customers(id),
  reward_id    INT         NOT NULL REFERENCES rewards(id),
  code         VARCHAR(20) NOT NULL UNIQUE,
  points_spent INT         NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'USED', 'CANCELLED')),
  is_used      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at      TIMESTAMP   DEFAULT NULL
);
CREATE INDEX idx_neon_redemptions_cust ON redemptions (customer_id, status);

-- 2.8. Bảng promotions (Khuyến mãi chung)
CREATE TABLE promotions (
  id              SERIAL PRIMARY KEY,
  tier_id         INT REFERENCES membership_tiers(id),
  name            VARCHAR(150)  NOT NULL,
  code            VARCHAR(30)   NOT NULL UNIQUE,
  promo_type      VARCHAR(30)   NOT NULL CHECK (promo_type IN ('PERCENT', 'AMOUNT', 'POINT_MULTIPLIER')),
  value           NUMERIC(12,2) NOT NULL,
  min_order_value NUMERIC(12,0) NOT NULL DEFAULT 0,
  start_date      DATE          NOT NULL,
  end_date        DATE          NOT NULL,
  usage_limit     INT DEFAULT NULL,
  used_count      INT           NOT NULL DEFAULT 0,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE
);

-- 2.9. Bảng orders (Hóa đơn & Đơn hàng - Chống giảm giá kép)
CREATE TABLE orders (
  id              SERIAL PRIMARY KEY,
  customer_id     INT REFERENCES customers(id),
  staff_id        INT REFERENCES users(id),
  promotion_id    INT REFERENCES promotions(id),
  redemption_id   INT UNIQUE REFERENCES redemptions(id),
  voucher_code    VARCHAR(20)   DEFAULT NULL,
  code            VARCHAR(20)   NOT NULL UNIQUE,
  subtotal        NUMERIC(12,0) NOT NULL,
  tier_discount   NUMERIC(12,0) NOT NULL DEFAULT 0,
  promo_discount  NUMERIC(12,0) NOT NULL DEFAULT 0,
  reward_discount NUMERIC(12,0) NOT NULL DEFAULT 0,
  total           NUMERIC(12,0) NOT NULL,
  points_earned   INT           NOT NULL DEFAULT 0,
  payment_method  VARCHAR(20)   NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER')),
  status          VARCHAR(20)   NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED')),
  channel         VARCHAR(20)   NOT NULL DEFAULT 'POS' CHECK (channel IN ('POS', 'ONLINE')),
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_neon_orders_created  ON orders (created_at);
CREATE INDEX idx_neon_orders_customer ON orders (customer_id);

-- 2.10. Bảng order_items (Chi tiết từng món trong hóa đơn)
CREATE TABLE order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT           NOT NULL REFERENCES products(id),
  quantity   INT           NOT NULL,
  unit_price NUMERIC(12,0) NOT NULL,
  line_total NUMERIC(12,0) NOT NULL
);

-- 2.11. Bảng point_transactions (Nhật ký biến động điểm)
CREATE TABLE point_transactions (
  id            SERIAL PRIMARY KEY,
  customer_id   INT         NOT NULL REFERENCES customers(id),
  order_id      INT REFERENCES orders(id),
  created_by    INT REFERENCES users(id),
  type          VARCHAR(20) NOT NULL CHECK (type IN ('EARN', 'REDEEM', 'ADJUST', 'REFUND')),
  points        INT         NOT NULL,
  balance_after INT         NOT NULL,
  description   VARCHAR(255),
  created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. NHẬP DỮ LIỆU MẪU CHUẨN HOÀN CHỈNH (SEED DATA)
-- ============================================================================

-- 3.1. 4 Hạng thành viên
INSERT INTO membership_tiers (id, name, min_points, discount_percent, point_multiplier) VALUES
  (1, 'Đồng',       0,    0.0, 1.0),
  (2, 'Bạc',        200,  2.0, 1.1),
  (3, 'Vàng',       500,  5.0, 1.2),
  (4, 'Kim Cương',  1000, 8.0, 1.5);

-- 3.2. 3 Danh mục sản phẩm
INSERT INTO product_categories (id, name, is_active) VALUES
  (1, 'Cà phê',     TRUE),
  (2, 'Trà hoa quả', TRUE),
  (3, 'Bánh ngọt',   TRUE);

-- 3.3. 13 Món ăn & Đồ uống hot trend
INSERT INTO products (id, category_id, name, price, image_emoji, image_url, description, is_active) VALUES
  (1,  1, 'Cà phê sữa đá caPHEnue',    29000, '☕', 'images/products/caphe_suada.jpg',      'Hương cà phê Robusta đậm đà, béo ngậy vị sữa đặc truyền thống', TRUE),
  (2,  1, 'Cà phê đen đá',             25000, '🖤', 'images/products/caphe_denda.jpg',      'Tinh túy cà phê Việt - đen, đậm, mạnh cho ngày mới', TRUE),
  (3,  1, 'Bạc xỉu hoa đào',           35000, '🌸', 'images/products/bac_xiu.jpg',          'Cà phê sữa nhẹ nhàng phảng phất hương hoa đào đặc trưng', TRUE),
  (4,  1, 'Cà phê muối béo',           35000, '🧂', 'images/products/caphe_muoi.jpg',        'Vị cà phê quyện muối biển và kem béo ngậy', TRUE),
  (5,  2, 'Trà đào cam sả',            45000, '🍑', 'images/products/tra_dao.jpg',           'Trà thanh mát kết hợp đào tươi, cam vàng và sả', TRUE),
  (6,  2, 'Trà vải hoa hồng',          45000, '🌹', 'images/products/tra_vai.jpg',           'Vải thiều tươi ướp hoa hồng thanh nhã', TRUE),
  (7,  2, 'Trà ô long sen vàng',       42000, '🍵', 'images/products/tra_olong.jpg',         'Trà ô long thượng hạng hương sen vàng', TRUE),
  (8,  3, 'Bánh Croissant bơ tỏi',     32000, '🥐', 'images/products/croissant.jpg',         'Croissant Pháp giòn xốp bơ tỏi thơm lừng', TRUE),
  (9,  3, 'Bánh Tiramisu caPHEnue',    39000, '🎂', 'images/products/tiramisu.jpg',          'Espresso Mascarpone Ý nguyên chất', TRUE),
  (10, 3, 'Mousse đào hồng',           42000, '🍰', 'images/products/mousse_dao.jpg',        'Mousse đào hồng tan mịn trong miệng', TRUE),
  (11, 1, 'Cà phê trứng kem béo',      39000, '🍳', 'images/products/caphe_trung.jpg',       'Cà phê phin truyền thống phủ lớp kem trứng béo ngậy thơm lừng chuẩn vị Hà Nội', TRUE),
  (12, 2, 'Trà mãng cầu hạt đác',      45000, '🍈', 'images/products/tra_mang_cau.jpg',      'Trà hoa quả hot trend kết hợp mãng cầu chua ngọt và hạt đác giòn dẻo', TRUE),
  (13, 3, 'Bánh phô mai nướng Basque', 45000, '🧀', 'images/products/cheesecake_basque.jpg',  'Basque Burnt Cheesecake cháy xém thơm bùi, nhân phô mai béo ngậy tan chảy', TRUE),
  (14, 3, 'Bánh su kem Choux Craquelin', 22000, '🧁', 'images/products/banh_su_kem.jpg', 'Vỏ su giòn rụm Craquelin kiểu Pháp, ngập tràn nhân kem trứng custard béo ngậy thanh mát', TRUE),
  (15, 3, 'Cookie Socola hạt phỉ giòn', 25000, '🍪', 'images/products/cookie_socola.jpg', 'Bánh quy bơ nướng giòn tan kết hợp socola đen chip và hạt phỉ rang thơm bùi hấp dẫn', TRUE),
  (16, 3, 'Bánh Muffin việt quất tươi', 28000, '🧁', 'images/products/muffin_vietquat.jpg', 'Cốt bánh muffin bơ sữa xốp mềm, hòa quyện từng quả việt quất tươi chua ngọt mọng nước', TRUE),
  (17, 3, 'Bánh bông lan trứng muối mini', 29000, '🍰', 'images/products/bonglan_trungmuoi.jpg', 'Cốt bông lan Chiffon mềm mịn tan trong miệng, phủ sốt bơ kim sa và trứng muối béo ngậy', TRUE),
  (18, 3, 'Bánh Mille Crepe Matcha Nhật Bản', 49000, '🍵', 'images/products/crepe_matcha.jpg', 'Tuyệt tác 20 lớp bánh crepe siêu mỏng xếp tầng cùng kem tươi trà xanh Uji Kyoto thượng hạng', TRUE),
  (19, 3, 'Bánh Red Velvet nhung đỏ dâu tây', 52000, '🍓', 'images/products/red_velvet.jpg', 'Sắc đỏ nhung quý phái quyện cùng lớp kem phô mai Cream Cheese béo chua nhẹ và dâu tươi', TRUE),
  (20, 3, 'Tart phúc bồn tử phô mai hoàng gia', 55000, '🫐', 'images/products/tart_phucbontu.jpg', 'Đế tart nướng bơ Pháp giòn rụm, kem phô mai Mascarpone mịn màng phủ đầy quả mâm xôi tươi', TRUE),
  (21, 3, 'Macaron hoa đào cao cấp (Hộp 3 vị)', 56000, '🌸', 'images/products/macaron_hoadao.jpg', 'Hộp 3 bánh macaron bột hạnh nhân giòn tan vị hoa đào caPHEnue, hạt dẻ cười Pistachio và socola', TRUE),
  (22, 3, 'Bánh Lava Socola Bỉ tan chảy', 58000, '🍫', 'images/products/lava_socola.jpg', 'Bánh nướng nóng hổi với dòng sốt socola đen nguyên chất 70% tuôn trào quyến rũ bất tận', TRUE);

-- 3.4. Tài khoản nhân viên (Mật khẩu: 123456)
INSERT INTO users (id, username, password_hash, full_name, phone, role, is_active) VALUES
  (1, 'admin', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'Trịnh Thanh Học', '0901112233', 'ADMIN', TRUE),
  (2, 'staff', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'Vũ Tiến Dũng',   '0902223344', 'STAFF', TRUE);

-- 3.5. 5 Khách hàng mẫu (Mật khẩu: 123456)
INSERT INTO customers (id, tier_id, code, full_name, phone, password_hash, email, birthday, gender, points_balance, lifetime_points, status) VALUES
  (1, 3, 'KH0001', 'Trần Thanh Hải', '0912345678', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'hai.tran@gmail.com',   '1995-05-12', 'Nam', 500,  770,  'ACTIVE'),
  (2, 2, 'KH0002', 'Nguyễn Thị Mai', '0987654321', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'mai.nguyen@gmail.com', '1998-11-20', 'Nữ',  210,  290,  'ACTIVE'),
  (3, 4, 'KH0003', 'Lê Hoàng Nam',   '0905111222', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'nam.le@gmail.com',     '1992-03-08', 'Nam', 1150, 1420, 'ACTIVE'),
  (4, 1, 'KH0004', 'Phạm Thu Thảo',  '0933444555', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'thao.pham@gmail.com',  '2001-08-15', 'Nữ',  85,   85,   'ACTIVE'),
  (5, 3, 'KH0005', 'Vũ Minh Quân',   '0977888999', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'quan.vu@gmail.com',    '1996-12-05', 'Nam', 480,  690,  'ACTIVE');

-- 3.6. 6 Ưu đãi đổi điểm (1 điểm = 400đ)
INSERT INTO rewards (id, product_id, name, points_cost, reward_type, value, stock, valid_from, valid_to, is_active) VALUES
  (1, NULL, 'Voucher giảm 20.000đ',       50,  'AMOUNT',    20000.00, 100,  '2026-01-01', '2026-12-31', TRUE),
  (2, NULL, 'Voucher giảm 50.000đ',       125, 'AMOUNT',    50000.00, 50,   '2026-01-01', '2026-12-31', TRUE),
  (3, 4,    'Đổi 1 Cà phê muối béo',      90,  'FREE_ITEM', 35000.00, 40,   '2026-01-01', '2026-12-31', TRUE),
  (4, 5,    'Đổi 1 Trà đào cam sả',       110, 'FREE_ITEM', 45000.00, 30,   '2026-01-01', '2026-12-31', TRUE),
  (5, NULL, 'Voucher giảm 15% tổng hóa đơn', 80, 'PERCENT',   15.00,    60,   '2026-01-01', '2026-12-31', TRUE),
  (6, 8,    'Đổi 1 Bánh Croissant bơ tỏi',80,  'FREE_ITEM', 32000.00, 25,   '2026-01-01', '2026-12-31', TRUE);

-- 3.7. Khuyến mãi chung
INSERT INTO promotions (id, tier_id, name, code, promo_type, value, min_order_value, start_date, end_date, usage_limit, used_count, is_active) VALUES
  (1, NULL, 'Chào hè rực rỡ 2026',    'HE2026',     'PERCENT',          10.00, 60000, '2026-06-01', '2026-08-31', 500,  3, TRUE),
  (2, 3,    'Tri ân Vàng & Kim Cương','VIPHOADAO',  'AMOUNT',           25000.00,80000, '2026-01-01', '2026-12-31', 200,  1, TRUE),
  (3, NULL, 'Nhân đôi điểm cuối tuần','WEEKEND2X',  'POINT_MULTIPLIER', 2.00,  50000, '2026-01-01', '2026-12-31', 1000, 0, TRUE);

-- Đồng bộ sequence cho PostgreSQL (để các bản ghi mới tự tăng tiếp từ 14 trở đi)
SELECT setval('membership_tiers_id_seq', (SELECT MAX(id) FROM membership_tiers));
SELECT setval('product_categories_id_seq', (SELECT MAX(id) FROM product_categories));
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));
SELECT setval('rewards_id_seq', (SELECT MAX(id) FROM rewards));
SELECT setval('promotions_id_seq', (SELECT MAX(id) FROM promotions));

-- ── 11. BẢNG DINING_TABLES (SƠ ĐỒ BÀN & KHU VỰC) ──────────────────────────
CREATE TABLE IF NOT EXISTS dining_tables (
  id           SERIAL PRIMARY KEY,
  table_number VARCHAR(20) NOT NULL UNIQUE,
  name         VARCHAR(100) NOT NULL,
  area         VARCHAR(50) NOT NULL DEFAULT 'INDOOR',
  capacity     INT NOT NULL DEFAULT 4,
  status       VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
  is_active    SMALLINT NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 12. BẢNG RESERVATIONS (QUẢN LÝ ĐẶT BÀN) ──────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
  id               SERIAL PRIMARY KEY,
  code             VARCHAR(30) NOT NULL UNIQUE,
  customer_id      INT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name    VARCHAR(100) NOT NULL,
  phone            VARCHAR(20) NOT NULL,
  table_id         INT REFERENCES dining_tables(id) ON DELETE SET NULL,
  party_size       INT NOT NULL DEFAULT 2,
  reservation_date DATE NOT NULL,
  reservation_time VARCHAR(10) NOT NULL,
  area_preference  VARCHAR(50) NOT NULL DEFAULT 'INDOOR',
  special_requests TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO dining_tables (id, table_number, name, area, capacity, status) VALUES
  (1,  'T1-01', 'Bàn Cửa Sổ Hoa Đào',       'INDOOR',  2,  'AVAILABLE'),
  (2,  'T1-02', 'Bàn Sofa Trung Tâm',        'INDOOR',  4,  'OCCUPIED'),
  (3,  'T1-03', 'Bàn Gần Quầy Bar',          'INDOOR',  2,  'AVAILABLE'),
  (4,  'T1-04', 'Bàn Gỗ Lớn Gia Đình',       'INDOOR',  6,  'RESERVED'),
  (5,  'T1-05', 'Bàn Góc Đọc Sách',          'INDOOR',  2,  'AVAILABLE'),
  (6,  'T2-01', 'Ban Công Ngắm Phố 1',       'OUTDOOR', 4,  'AVAILABLE'),
  (7,  'T2-02', 'Ban Công Ngắm Phố 2',       'OUTDOOR', 2,  'AVAILABLE'),
  (8,  'T2-03', 'Sân Vườn Hoa Đào',          'OUTDOOR', 6,  'AVAILABLE'),
  (9,  'T2-04', 'Bàn Tròn Sân Thượng',       'OUTDOOR', 4,  'OCCUPIED'),
  (10, 'VIP-01', 'Phòng VIP Hoa Đào 1',      'VIP',     8,  'AVAILABLE'),
  (11, 'VIP-02', 'Phòng Họp Nhóm & Workshop', 'VIP',     12, 'RESERVED')
ON CONFLICT (table_number) DO NOTHING;

SELECT setval('dining_tables_id_seq', (SELECT MAX(id) FROM dining_tables));

-- ── 13. BẢNG STAFF_MEMBERS, STAFF_TIMESHEETS, STAFF_PAYROLLS (POSTGRES / NEON) ──
CREATE TABLE IF NOT EXISTS staff_members (
  id SERIAL PRIMARY KEY,
  user_id INT,
  code VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  citizen_id VARCHAR(20) NOT NULL,
  gender VARCHAR(10) DEFAULT 'Nam',
  birthday DATE,
  position VARCHAR(30) DEFAULT 'SERVER',
  employment_type VARCHAR(20) DEFAULT 'PART_TIME',
  hourly_rate NUMERIC(10,2) NOT NULL,
  bank_account VARCHAR(50),
  bank_name VARCHAR(50),
  start_date DATE NOT NULL,
  contract_duration VARCHAR(100) DEFAULT 'Part-time 6 tháng (Kèm PC BHXH 21.5%)',
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_timesheets (
  id SERIAL PRIMARY KEY,
  staff_id INT NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  shift_type VARCHAR(20) DEFAULT 'CUSTOM',
  check_in TIMESTAMP NOT NULL,
  check_out TIMESTAMP,
  total_hours NUMERIC(4,2) DEFAULT 0,
  night_hours NUMERIC(4,2) DEFAULT 0,
  overtime_hours NUMERIC(4,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'WORKING',
  note VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_payrolls (
  id SERIAL PRIMARY KEY,
  staff_id INT NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL,
  total_regular_hours NUMERIC(6,2) DEFAULT 0,
  total_night_hours NUMERIC(6,2) DEFAULT 0,
  total_overtime_hours NUMERIC(6,2) DEFAULT 0,
  hourly_rate NUMERIC(10,2) NOT NULL,
  base_pay NUMERIC(12,2) NOT NULL,
  night_pay NUMERIC(12,2) DEFAULT 0,
  overtime_pay NUMERIC(12,2) DEFAULT 0,
  insurance_allowance NUMERIC(12,2) DEFAULT 0,
  bonus NUMERIC(12,2) DEFAULT 0,
  deduction NUMERIC(12,2) DEFAULT 0,
  net_salary NUMERIC(12,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'PENDING',
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_staff_neon_month UNIQUE (staff_id, month_year)
);

INSERT INTO staff_members (id, code, full_name, phone, citizen_id, gender, birthday, position, employment_type, hourly_rate, bank_account, bank_name, start_date, contract_duration, status) VALUES
  (1, 'NV001', 'Nguyễn Văn An', '0912345601', '001202001122', 'Nam', '2004-03-15', 'SERVER',       'PART_TIME', 25000, '1023456789', 'MB Bank',     '2026-01-10', 'Part-time 6 tháng (Kèm PC BHXH 21.5%)', 'ACTIVE'),
  (2, 'NV002', 'Trần Thị Mai',  '0912345602', '001203002233', 'Nữ',  '2003-08-20', 'SERVER',       'PART_TIME', 26000, '9876543210', 'Vietcombank', '2026-02-01', 'Part-time 6 tháng (Kèm PC BHXH 21.5%)', 'ACTIVE'),
  (3, 'NV003', 'Lê Hoàng Nam',  '0912345603', '001198003344', 'Nam', '1998-11-05', 'BARISTA',      'FULL_TIME', 32000, '0388889999', 'Techcombank', '2025-10-15', 'HĐLĐ 24 tháng (Đóng BHXH đầy đủ)', 'ACTIVE'),
  (4, 'NV004', 'Phạm Minh Thu', '0912345604', '001201004455', 'Nữ',  '2001-05-18', 'CASHIER',      'PART_TIME', 28000, '1903332211', 'VPBank',      '2026-03-01', 'Part-time 12 tháng (Kèm PC BHXH 21.5%)', 'ACTIVE'),
  (5, 'NV005', 'Vũ Tiến Dũng',  '0902223344', '001195005566', 'Nam', '1995-09-12', 'MANAGER',      'FULL_TIME', 45000, '0902223344', 'MB Bank',     '2025-06-01', 'HĐLĐ Không xác định thời hạn (Quản lý)', 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

SELECT setval('staff_members_id_seq', (SELECT MAX(id) FROM staff_members));


