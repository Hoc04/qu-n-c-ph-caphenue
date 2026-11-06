-- ============================================================================
-- caPHEnue - Quản Lý Khách Hàng Thân Thiết Quán Cà Phê (MySQL / MariaDB)
-- CHUẨN HÓA NGHIỆP VỤ LOYALTY F&B:
--   1. Tích điểm: 10.000đ chi tiêu = 1 điểm tích lũy (nhân hệ số hạng).
--   2. Đổi quà: 1 điểm = 400đ giá trị voucher (20k=50đ, 50k=125đ, CF Muối 35k=90đ, Trà Đào 45k=110đ).
--   3. Chống giảm giá kép (No Double-Dipping): Chỉ chọn 1 trong 2 (Giảm theo Hạng HOẶC Dùng Voucher UD-XXXX).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS caphenue CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE caphenue;

DROP VIEW IF EXISTS v_daily_revenue;
DROP VIEW IF EXISTS employees;
DROP VIEW IF EXISTS customer_vouchers;
DROP VIEW IF EXISTS tiers;

DROP TABLE IF EXISTS point_transactions;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS redemptions;
DROP TABLE IF EXISTS rewards;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_categories;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS membership_tiers;
DROP TABLE IF EXISTS users;

-- 1.1. Bảng users (employees)
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(15)  DEFAULT NULL,
  role          ENUM('ADMIN','STAFF') NOT NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.2. Bảng membership_tiers (tiers)
CREATE TABLE membership_tiers (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(50)   NOT NULL UNIQUE,
  min_points       INT           NOT NULL UNIQUE,
  discount_percent DECIMAL(5,2)  NOT NULL DEFAULT 0,
  point_multiplier DECIMAL(3,2)  NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.3. Bảng customers
CREATE TABLE customers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  tier_id         INT          NOT NULL,
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
  status          ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tier_id) REFERENCES membership_tiers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_customers_phone ON customers (phone);
CREATE INDEX idx_customers_name  ON customers (full_name);

-- 1.4. Bảng product_categories
CREATE TABLE product_categories (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(100) NOT NULL UNIQUE,
  is_active TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.5. Bảng products
CREATE TABLE products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT           NOT NULL,
  name        VARCHAR(150)  NOT NULL,
  price       DECIMAL(12,0) NOT NULL,
  image_emoji VARCHAR(20)   DEFAULT '☕',
  image_url   VARCHAR(255)  DEFAULT NULL,
  description VARCHAR(255)  DEFAULT NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  FOREIGN KEY (category_id) REFERENCES product_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.6. Bảng rewards (Tỷ lệ quy đổi chuẩn: 1 điểm = 400đ)
CREATE TABLE rewards (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT DEFAULT NULL,
  name        VARCHAR(150)  NOT NULL,
  points_cost INT           NOT NULL,
  reward_type ENUM('PERCENT','AMOUNT','FREE_ITEM') NOT NULL,
  value       DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock       INT,
  valid_from  DATE,
  valid_to    DATE,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.7. Bảng redemptions (customer_vouchers)
CREATE TABLE redemptions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  customer_id  INT         NOT NULL,
  reward_id    INT         NOT NULL,
  code         VARCHAR(20) NOT NULL UNIQUE,
  points_spent INT         NOT NULL,
  status       ENUM('ISSUED','USED','CANCELLED') NOT NULL DEFAULT 'ISSUED',
  is_used      TINYINT(1)  NOT NULL DEFAULT 0,
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at      DATETIME    DEFAULT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (reward_id)   REFERENCES rewards(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_redemptions_customer ON redemptions (customer_id, status);

-- 1.8. Bảng promotions
CREATE TABLE promotions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  tier_id         INT DEFAULT NULL,
  name            VARCHAR(150)  NOT NULL,
  code            VARCHAR(30)   NOT NULL UNIQUE,
  promo_type      ENUM('PERCENT','AMOUNT','POINT_MULTIPLIER') NOT NULL,
  value           DECIMAL(12,2) NOT NULL,
  min_order_value DECIMAL(12,0) NOT NULL DEFAULT 0,
  start_date      DATE          NOT NULL,
  end_date        DATE          NOT NULL,
  usage_limit     INT DEFAULT NULL,
  used_count      INT           NOT NULL DEFAULT 0,
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  FOREIGN KEY (tier_id) REFERENCES membership_tiers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.9. Bảng orders (Chống giảm giá kép: Hạng HOẶC Voucher UD-XXXX)
CREATE TABLE orders (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  customer_id     INT DEFAULT NULL,
  staff_id        INT DEFAULT NULL,
  promotion_id    INT DEFAULT NULL,
  redemption_id   INT UNIQUE DEFAULT NULL,
  voucher_code    VARCHAR(20)   DEFAULT NULL,
  code            VARCHAR(20)   NOT NULL UNIQUE,
  subtotal        DECIMAL(12,0) NOT NULL,
  tier_discount   DECIMAL(12,0) NOT NULL DEFAULT 0,
  promo_discount  DECIMAL(12,0) NOT NULL DEFAULT 0,
  reward_discount DECIMAL(12,0) NOT NULL DEFAULT 0,
  total           DECIMAL(12,0) NOT NULL,
  points_earned   INT           NOT NULL DEFAULT 0,
  payment_method  ENUM('CASH','CARD','TRANSFER') NOT NULL DEFAULT 'CASH',
  status          ENUM('COMPLETED','CANCELLED')  NOT NULL DEFAULT 'COMPLETED',
  channel         ENUM('POS','ONLINE')           NOT NULL DEFAULT 'POS',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id)   REFERENCES customers(id),
  FOREIGN KEY (staff_id)      REFERENCES users(id),
  FOREIGN KEY (promotion_id)  REFERENCES promotions(id),
  FOREIGN KEY (redemption_id) REFERENCES redemptions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_orders_created  ON orders (created_at);
CREATE INDEX idx_orders_customer ON orders (customer_id);

-- 1.10. Bảng order_items
CREATE TABLE order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT           NOT NULL,
  product_id INT           NOT NULL,
  quantity   INT           NOT NULL,
  unit_price DECIMAL(12,0) NOT NULL,
  line_total DECIMAL(12,0) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.11. Bảng point_transactions
CREATE TABLE point_transactions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  customer_id   INT         NOT NULL,
  order_id      INT DEFAULT NULL,
  created_by    INT DEFAULT NULL,
  type          ENUM('EARN','REDEEM','ADJUST','REFUND') NOT NULL,
  points        INT         NOT NULL,
  balance_after INT         NOT NULL,
  description   VARCHAR(255),
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (order_id)    REFERENCES orders(id),
  FOREIGN KEY (created_by)  REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_pt_customer ON point_transactions (customer_id, created_at);

-- ============================================================================
-- 2. NHẬP DỮ LIỆU MẪU (SEED DATA)
-- ============================================================================

-- 2.1. 4 Hạng thành viên
INSERT INTO membership_tiers (id, name, min_points, discount_percent, point_multiplier) VALUES
  (1, 'Đồng',       0,    0.0, 1.0),
  (2, 'Bạc',        200,  2.0, 1.1),
  (3, 'Vàng',       500,  5.0, 1.2),
  (4, 'Kim Cương',  1000, 8.0, 1.5);

-- 2.2. Nhóm sản phẩm
INSERT INTO product_categories (id, name, is_active) VALUES
  (1, 'Cà phê', 1),
  (2, 'Trà hoa quả', 1),
  (3, 'Bánh ngọt', 1);

-- 2.3. 13 Sản phẩm thực đơn (Đã bổ sung các món hot trend)
INSERT INTO products (id, category_id, name, price, image_emoji, image_url, description, is_active) VALUES
  (1,  1, 'Cà phê sữa đá caPHEnue',    29000, '☕', 'images/products/caphe_suada.jpg',      'Hương cà phê Robusta đậm đà, béo ngậy vị sữa đặc truyền thống', 1),
  (2,  1, 'Cà phê đen đá',             25000, '🖤', 'images/products/caphe_denda.jpg',      'Tinh túy cà phê Việt - đen, đậm, mạnh cho ngày mới', 1),
  (3,  1, 'Bạc xỉu hoa đào',           35000, '🌸', 'images/products/bac_xiu.jpg',          'Cà phê sữa nhẹ nhàng phảng phất hương hoa đào đặc trưng', 1),
  (4,  1, 'Cà phê muối béo',           35000, '🧂', 'images/products/caphe_muoi.jpg',        'Vị cà phê quyện muối biển và kem béo ngậy (35.000đ)', 1),
  (5,  2, 'Trà đào cam sả',            45000, '🍑', 'images/products/tra_dao.jpg',           'Trà thanh mát kết hợp đào tươi, cam vàng và sả (45.000đ)', 1),
  (6,  2, 'Trà vải hoa hồng',          45000, '🌹', 'images/products/tra_vai.jpg',           'Vải thiều tươi ướp hoa hồng thanh nhã', 1),
  (7,  2, 'Trà ô long sen vàng',       42000, '🍵', 'images/products/tra_olong.jpg',         'Trà ô long thượng hạng hương sen vàng', 1),
  (8,  3, 'Bánh Croissant bơ tỏi',     32000, '🥐', 'images/products/croissant.jpg',         'Croissant Pháp giòn xốp bơ tỏi thơm lừng', 1),
  (9,  3, 'Bánh Tiramisu caPHEnue',    39000, '🎂', 'images/products/tiramisu.jpg',          'Espresso Mascarpone Ý nguyên chất', 1),
  (10, 3, 'Mousse đào hồng',           42000, '🍰', 'images/products/mousse_dao.jpg',        'Mousse đào hồng tan mịn trong miệng', 1),
  (11, 1, 'Cà phê trứng kem béo',      39000, '🍳', 'images/products/caphe_trung.jpg',       'Cà phê phin truyền thống phủ lớp kem trứng béo ngậy thơm lừng chuẩn vị Hà Nội', 1),
  (12, 2, 'Trà mãng cầu hạt đác',      45000, '🍈', 'images/products/tra_mang_cau.jpg',      'Trà hoa quả hot trend kết hợp mãng cầu chua ngọt và hạt đác giòn dẻo', 1),
  (13, 3, 'Bánh phô mai nướng Basque', 45000, '🧀', 'images/products/cheesecake_basque.jpg',  'Basque Burnt Cheesecake cháy xém thơm bùi, nhân phô mai béo ngậy tan chảy', 1),
  (14, 3, 'Bánh su kem Choux Craquelin', 22000, '🧁', 'images/products/banh_su_kem.jpg', 'Vỏ su giòn rụm Craquelin kiểu Pháp, ngập tràn nhân kem trứng custard béo ngậy thanh mát', 1),
  (15, 3, 'Cookie Socola hạt phỉ giòn', 25000, '🍪', 'images/products/cookie_socola.jpg', 'Bánh quy bơ nướng giòn tan kết hợp socola đen chip và hạt phỉ rang thơm bùi hấp dẫn', 1),
  (16, 3, 'Bánh Muffin việt quất tươi', 28000, '🧁', 'images/products/muffin_vietquat.jpg', 'Cốt bánh muffin bơ sữa xốp mềm, hòa quyện từng quả việt quất tươi chua ngọt mọng nước', 1),
  (17, 3, 'Bánh bông lan trứng muối mini', 29000, '🍰', 'images/products/bonglan_trungmuoi.jpg', 'Cốt bông lan Chiffon mềm mịn tan trong miệng, phủ sốt bơ kim sa và trứng muối béo ngậy', 1),
  (18, 3, 'Bánh Mille Crepe Matcha Nhật Bản', 49000, '🍵', 'images/products/crepe_matcha.jpg', 'Tuyệt tác 20 lớp bánh crepe siêu mỏng xếp tầng cùng kem tươi trà xanh Uji Kyoto thượng hạng', 1),
  (19, 3, 'Bánh Red Velvet nhung đỏ dâu tây', 52000, '🍓', 'images/products/red_velvet.jpg', 'Sắc đỏ nhung quý phái quyện cùng lớp kem phô mai Cream Cheese béo chua nhẹ và dâu tươi', 1),
  (20, 3, 'Tart phúc bồn tử phô mai hoàng gia', 55000, '🫐', 'images/products/tart_phucbontu.jpg', 'Đế tart nướng bơ Pháp giòn rụm, kem phô mai Mascarpone mịn màng phủ đầy quả mâm xôi tươi', 1),
  (21, 3, 'Macaron hoa đào cao cấp (Hộp 3 vị)', 56000, '🌸', 'images/products/macaron_hoadao.jpg', 'Hộp 3 bánh macaron bột hạnh nhân giòn tan vị hoa đào caPHEnue, hạt dẻ cười Pistachio và socola', 1),
  (22, 3, 'Bánh Lava Socola Bỉ tan chảy', 58000, '🍫', 'images/products/lava_socola.jpg', 'Bánh nướng nóng hổi với dòng sốt socola đen nguyên chất 70% tuôn trào quyến rũ bất tận', 1);

-- 2.4. 2 Tài khoản đăng nhập mẫu (Admin & Thu ngân - Mật khẩu: 123456)
INSERT INTO users (id, username, password_hash, full_name, phone, role, is_active) VALUES
  (1, 'admin', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'Trịnh Thanh Học', '0901112233', 'ADMIN', 1),
  (2, 'staff', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'Vũ Tiến Dũng',   '0902223344', 'STAFF', 1);

-- 2.5. 5 Khách hàng mẫu đủ 4 hạng (Mật khẩu mặc định: 123456)
INSERT INTO customers (id, tier_id, code, full_name, phone, password_hash, email, birthday, gender, points_balance, lifetime_points, status) VALUES
  (1, 3, 'KH0001', 'Trần Thanh Hải', '0912345678', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'hai.tran@gmail.com',   '1995-05-12', 'Nam', 540,  760,  'ACTIVE'),
  (2, 2, 'KH0002', 'Nguyễn Thị Mai', '0987654321', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'mai.nguyen@gmail.com', '1998-11-20', 'Nữ',  210,  290,  'ACTIVE'),
  (3, 4, 'KH0003', 'Lê Hoàng Nam',   '0905111222', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'nam.le@gmail.com',     '1992-03-08', 'Nam', 1150, 1420, 'ACTIVE'),
  (4, 1, 'KH0004', 'Phạm Thu Thảo',  '0933444555', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'thao.pham@gmail.com',  '2001-08-15', 'Nữ',  85,   85,   'ACTIVE'),
  (5, 3, 'KH0005', 'Vũ Minh Quân',   '0944555666', '$2b$10$Iz1Edu317ThCcItfQWypmOIFJ40gGZjQ/coRLOOVCZ3YCRj1fvPMy', 'quan.vu@gmail.com',    '1996-12-01', 'Nam', 620,  680,  'ACTIVE');

-- 2.6. 6 Món quà / Voucher đổi điểm (Chuẩn tỷ lệ 1 điểm = 400đ)
INSERT INTO rewards (id, product_id, name, points_cost, reward_type, value, stock, valid_from, valid_to, is_active) VALUES
  (1, NULL, 'Voucher giảm 20.000đ',                50,  'AMOUNT',    20000, 150, '2026-01-01', '2026-12-31', 1),
  (2, NULL, 'Voucher giảm 50.000đ',                125, 'AMOUNT',    50000, 80,  '2026-01-01', '2026-12-31', 1),
  (3, 4,    '01 Ly Cà phê muối béo (35.000đ)',     90,  'FREE_ITEM', 35000, 60,  '2026-01-01', '2026-12-31', 1),
  (4, 5,    '01 Ly Trà đào cam sả (45.000đ)',      110, 'FREE_ITEM', 45000, 45,  '2026-01-01', '2026-12-31', 1),
  (5, 8,    '01 Bánh Croissant bơ tỏi (32.000đ)',  80,  'FREE_ITEM', 32000, 30,  '2026-01-01', '2026-12-31', 1),
  (6, NULL, 'Voucher giảm 100.000đ (VIP)',         250, 'AMOUNT',   100000, 20,  '2026-01-01', '2026-12-31', 1);

-- 2.7. Chương trình khuyến mãi
INSERT INTO promotions (id, tier_id, name, code, promo_type, value, min_order_value, start_date, end_date, usage_limit, used_count, is_active) VALUES
  (1, NULL, 'Chào hè rực rỡ 2026',               'HE2026',   'PERCENT',          10.0,  60000,  '2026-01-01', '2026-12-31', 500,  142, 1),
  (2, 2,    'Giảm 30K cho hội viên Bạc trở lên', 'COFFEE30', 'AMOUNT',           30000, 120000, '2026-01-01', '2026-12-31', 200,  78,  1),
  (3, NULL, 'Cuối tuần nhân đôi điểm tích lũy',  'X2POINT',  'POINT_MULTIPLIER', 2.0,   50000,  '2026-01-01', '2026-12-31', 1000, 310, 1);

-- 2.8. Kho Voucher cá nhân (6 mã mẫu: 3 mã ISSUED chưa dùng, 3 mã USED đã dùng trong đơn hàng)
INSERT INTO redemptions (id, customer_id, reward_id, code, points_spent, status, is_used, created_at, used_at) VALUES
  (1, 1, 1, 'UD-7K3F9A', 50,  'ISSUED', 0, DATE_SUB(NOW(), INTERVAL 5 DAY), NULL),
  (2, 3, 2, 'UD-9M2P4X', 125, 'ISSUED', 0, DATE_SUB(NOW(), INTERVAL 4 DAY), NULL),
  (3, 5, 3, 'UD-5H8L1Q', 90,  'ISSUED', 0, DATE_SUB(NOW(), INTERVAL 3 DAY), NULL),
  (4, 2, 1, 'UD-8B2X1P', 50,  'USED',   1, DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (5, 3, 4, 'UD-3T6W9Z', 110, 'USED',   1, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (6, 1, 3, 'UD-4N7V2K', 90,  'USED',   1, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY));

-- 2.9. 10 Đơn hàng mẫu (Tuân thủ No Double-Dipping: Dùng Hạng HOẶC Dùng Voucher UD-XXXX)
INSERT INTO orders (id, customer_id, staff_id, promotion_id, redemption_id, voucher_code, code, subtotal, tier_discount, promo_discount, reward_discount, total, points_earned, payment_method, status, channel, created_at) VALUES
  (1,  1,    1, NULL, NULL, NULL,        'HD20261101-0001', 108000, 5400,  0, 0,     102600, 12, 'CASH',     'COMPLETED', 'POS',    DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (2,  2,    2, NULL, 4,    'UD-8B2X1P', 'HD20261101-0002', 90000,  0,     0, 20000, 70000,  8,  'TRANSFER', 'COMPLETED', 'POS',    DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (3,  3,    1, NULL, NULL, NULL,        'HD20261102-0003', 154000, 12320, 0, 0,     141680, 21, 'CARD',     'COMPLETED', 'POS',    DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (4,  NULL, 2, NULL, NULL, NULL,        'HD20261102-0004', 58000,  0,     0, 0,     58000,  0,  'CASH',     'COMPLETED', 'POS',    DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (5,  4,    1, NULL, NULL, NULL,        'HD20261103-0005', 77000,  0,     0, 0,     77000,  7,  'TRANSFER', 'COMPLETED', 'ONLINE', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (6,  3,    2, NULL, 5,    'UD-3T6W9Z', 'HD20261103-0006', 135000, 0,     0, 45000, 90000,  14, 'TRANSFER', 'COMPLETED', 'POS',    DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (7,  5,    1, NULL, NULL, NULL,        'HD20261104-0007', 119000, 5950,  0, 0,     113050, 13, 'CASH',     'COMPLETED', 'POS',    DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (8,  1,    2, NULL, 6,    'UD-4N7V2K', 'HD20261104-0008', 99000,  0,     0, 35000, 64000,  7,  'TRANSFER', 'COMPLETED', 'ONLINE', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (9,  2,    1, NULL, NULL, NULL,        'HD20261105-0009', 84000,  1680,  0, 0,     82320,  9,  'CASH',     'COMPLETED', 'POS',    DATE_SUB(NOW(), INTERVAL 5 HOUR)),
  (10, 3,    1, NULL, NULL, NULL,        'HD20261105-0010', 164000, 13120, 0, 0,     150880, 23, 'TRANSFER', 'COMPLETED', 'POS',    DATE_SUB(NOW(), INTERVAL 2 HOUR));

-- 2.10. Chi tiết các món trong 10 đơn hàng mẫu
INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total) VALUES
  (1,  1, 2, 29000, 58000), (1,  2, 2, 25000, 50000),
  (2,  5, 2, 45000, 90000),
  (3,  4, 2, 35000, 70000), (3,  10, 1, 42000, 42000), (3, 7, 1, 42000, 42000),
  (4,  1, 2, 29000, 58000),
  (5,  3, 1, 35000, 35000), (5,  7, 1, 42000, 42000),
  (6,  5, 3, 45000, 135000),
  (7,  6, 2, 45000, 90000), (7,  1, 1, 29000, 29000),
  (8,  4, 1, 35000, 35000), (8,  8, 2, 32000, 64000),
  (9,  7, 2, 42000, 84000),
  (10, 5, 2, 45000, 90000), (10, 9, 1, 39000, 39000), (10, 3, 1, 35000, 35000);

-- 2.11. Sổ cái giao dịch điểm mẫu (EARN, REDEEM, ADJUST)
INSERT INTO point_transactions (customer_id, order_id, created_by, type, points, balance_after, description, created_at) VALUES
  (1, NULL, 1, 'REDEEM', -50,  530,  'Đổi Voucher giảm 20.000đ (UD-7K3F9A)', DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (1, 1,    1, 'EARN',   12,   542,  'Tích điểm đơn hàng HD20261101-0001', DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (2, 2,    2, 'EARN',   8,    210,  'Tích điểm đơn hàng HD20261101-0002 (Dùng voucher UD-8B2X1P)', DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (3, 3,    1, 'EARN',   21,   1141, 'Tích điểm đơn hàng HD20261102-0003', DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (4, 5,    1, 'EARN',   7,    85,   'Tích điểm đơn hàng HD20261103-0005', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (3, 6,    2, 'EARN',   14,   1127, 'Tích điểm đơn hàng HD20261103-0006 (Dùng voucher UD-3T6W9Z)', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (5, 7,    1, 'EARN',   13,   620,  'Tích điểm đơn hàng HD20261104-0007', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (1, 8,    2, 'EARN',   7,    540,  'Tích điểm đơn hàng HD20261104-0008 (Dùng voucher UD-4N7V2K)', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (2, 9,    1, 'EARN',   9,    219,  'Tích điểm đơn hàng HD20261105-0009', DATE_SUB(NOW(), INTERVAL 5 HOUR)),
  (3, 10,   1, 'EARN',   23,   1150, 'Tích điểm đơn hàng HD20261105-0010', DATE_SUB(NOW(), INTERVAL 2 HOUR));

-- ============================================================================
-- 3. CÁC VIEW ÁNH XẠ ĐỒNG BỘ TÊN BẢNG & BÁO CÁO DOANH THU
-- ============================================================================
CREATE OR REPLACE VIEW tiers AS
SELECT id, name, min_points, discount_percent, point_multiplier FROM membership_tiers;

CREATE OR REPLACE VIEW customer_vouchers AS
SELECT
  rd.id,
  rd.customer_id,
  rd.reward_id,
  rd.code AS voucher_code,
  rd.points_spent,
  rw.name AS reward_name,
  rw.value AS discount_value,
  rd.status,
  rd.is_used,
  rd.created_at,
  rd.used_at
FROM redemptions rd
JOIN rewards rw ON rd.reward_id = rw.id;

CREATE OR REPLACE VIEW employees AS
SELECT id, username, password_hash, full_name, phone, role, is_active, created_at FROM users;

-- 1.12. Bảng dining_tables (Quản lý Sơ đồ bàn & Khu vực tại quán)
CREATE TABLE IF NOT EXISTS dining_tables (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  table_number VARCHAR(20) NOT NULL UNIQUE,
  name         VARCHAR(100) NOT NULL,
  area         VARCHAR(50) NOT NULL DEFAULT 'INDOOR', -- INDOOR, OUTDOOR, VIP
  capacity     INT NOT NULL DEFAULT 4,
  status       ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED') NOT NULL DEFAULT 'AVAILABLE',
  is_active    TINYINT NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.13. Bảng reservations (Quản lý Đặt bàn trực tuyến & Lễ tân)
CREATE TABLE IF NOT EXISTS reservations (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  code             VARCHAR(30) NOT NULL UNIQUE,
  customer_id      INT DEFAULT NULL,
  customer_name    VARCHAR(100) NOT NULL,
  phone            VARCHAR(20) NOT NULL,
  table_id         INT DEFAULT NULL,
  party_size       INT NOT NULL DEFAULT 2,
  reservation_date DATE NOT NULL,
  reservation_time VARCHAR(10) NOT NULL,
  area_preference  VARCHAR(50) NOT NULL DEFAULT 'INDOOR',
  special_requests TEXT DEFAULT NULL,
  status           ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (table_id)    REFERENCES dining_tables(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.12. Dữ liệu mẫu Sơ đồ bàn
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
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2.13. Dữ liệu mẫu Phiếu đặt bàn
INSERT INTO reservations (id, code, customer_id, customer_name, phone, table_id, party_size, reservation_date, reservation_time, area_preference, special_requests, status) VALUES
  (1, 'DB20261105-001', 1, 'Trần Thanh Hải', '0912345678', 4, 6, '2026-11-05', '19:30', 'INDOOR', 'Cần bàn chuẩn bị sẵn ly nước lọc và gần ổ cắm điện', 'CONFIRMED'),
  (2, 'DB20261105-002', 3, 'Lê Hoàng Nam',   '0909123456', 11, 10, '2026-11-05', '20:00', 'VIP', 'Họp nhóm dự án startup, cần sử dụng máy chiếu', 'CONFIRMED'),
  (3, 'DB20261105-003', NULL, 'Nguyễn Thu Trang', '0987654321', 1, 2, '2026-11-05', '18:00', 'INDOOR', 'Kỷ niệm ngày cưới, setup bàn lãng mạn cạnh cửa sổ', 'PENDING')
ON DUPLICATE KEY UPDATE special_requests=VALUES(special_requests);

CREATE OR REPLACE VIEW v_daily_revenue AS
SELECT 
  DATE(created_at) AS order_date,
  COUNT(id) AS total_orders,
  COUNT(customer_id) AS member_orders,
  SUM(subtotal) AS gross_sales,
  SUM(tier_discount + promo_discount + reward_discount) AS total_discounts,
  SUM(total) AS net_revenue,
  SUM(points_earned) AS total_points_issued
FROM orders
WHERE status = 'COMPLETED'
GROUP BY DATE(created_at)
ORDER BY order_date DESC;

-- ════════════════════════════════════════════════════════════════════════════
-- PHẦN 3: PHÂN HỆ QUẢN LÝ NHÂN SỰ & BẢNG LƯƠNG (CHUẨN BỘ LUẬT LAO ĐỘNG 2019)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staff_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  citizen_id VARCHAR(20) NOT NULL,
  gender ENUM('Nam', 'Nữ', 'Khác') DEFAULT 'Nam',
  birthday DATE NULL,
  position ENUM('SERVER', 'BARISTA', 'CASHIER', 'SHIFT_LEADER', 'MANAGER') DEFAULT 'SERVER',
  employment_type ENUM('PART_TIME', 'FULL_TIME') DEFAULT 'PART_TIME',
  hourly_rate DECIMAL(10,2) NOT NULL, -- Tối thiểu 23.800đ/h (Nghị định 74/2024/NĐ-CP)
  bank_account VARCHAR(50) NULL,
  bank_name VARCHAR(50) NULL,
  start_date DATE NOT NULL,
  contract_duration VARCHAR(100) DEFAULT 'Part-time 6 tháng (Kèm PC BHXH 21.5%)',
  status ENUM('ACTIVE', 'ON_LEAVE', 'RESIGNED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (code),
  INDEX (position),
  INDEX (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_timesheets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL,
  work_date DATE NOT NULL,
  shift_type ENUM('MORNING', 'AFTERNOON', 'NIGHT', 'CUSTOM') DEFAULT 'CUSTOM',
  check_in DATETIME NOT NULL,
  check_out DATETIME NULL,
  total_hours DECIMAL(4,2) DEFAULT 0,
  night_hours DECIMAL(4,2) DEFAULT 0,    -- Giờ làm đêm sau 22:00 (+30% lương theo Điều 98 BLLĐ)
  overtime_hours DECIMAL(4,2) DEFAULT 0, -- Giờ làm thêm (+150%)
  status ENUM('WORKING', 'COMPLETED') DEFAULT 'WORKING',
  note VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE CASCADE,
  INDEX (work_date),
  INDEX (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_payrolls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL,
  month_year VARCHAR(7) NOT NULL,
  total_regular_hours DECIMAL(6,2) DEFAULT 0,
  total_night_hours DECIMAL(6,2) DEFAULT 0,
  total_overtime_hours DECIMAL(6,2) DEFAULT 0,
  hourly_rate DECIMAL(10,2) NOT NULL,
  base_pay DECIMAL(12,2) NOT NULL,
  night_pay DECIMAL(12,2) DEFAULT 0,
  overtime_pay DECIMAL(12,2) DEFAULT 0,
  insurance_allowance DECIMAL(12,2) DEFAULT 0, -- Khoản 3 Điều 168 BLLĐ (+21.5% lương đóng BHXH cho Part-time)
  bonus DECIMAL(12,2) DEFAULT 0,
  deduction DECIMAL(12,2) DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL,
  payment_status ENUM('PENDING', 'PAID') DEFAULT 'PENDING',
  paid_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE CASCADE,
  UNIQUE KEY unique_staff_month (staff_id, month_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO staff_members (id, code, full_name, phone, citizen_id, gender, birthday, position, employment_type, hourly_rate, bank_account, bank_name, start_date, contract_duration, status) VALUES
  (1, 'NV001', 'Nguyễn Văn An', '0912345601', '001202001122', 'Nam', '2004-03-15', 'SERVER',       'PART_TIME', 25000, '1023456789', 'MB Bank',     '2026-01-10', 'Part-time 6 tháng (Kèm PC BHXH 21.5%)', 'ACTIVE'),
  (2, 'NV002', 'Trần Thị Mai',  '0912345602', '001203002233', 'Nữ',  '2003-08-20', 'SERVER',       'PART_TIME', 26000, '9876543210', 'Vietcombank', '2026-02-01', 'Part-time 6 tháng (Kèm PC BHXH 21.5%)', 'ACTIVE'),
  (3, 'NV003', 'Lê Hoàng Nam',  '0912345603', '001198003344', 'Nam', '1998-11-05', 'BARISTA',      'FULL_TIME', 32000, '0388889999', 'Techcombank', '2025-10-15', 'HĐLĐ 24 tháng (Đóng BHXH đầy đủ)', 'ACTIVE'),
  (4, 'NV004', 'Phạm Minh Thu', '0912345604', '001201004455', 'Nữ',  '2001-05-18', 'CASHIER',      'PART_TIME', 28000, '1903332211', 'VPBank',      '2026-03-01', 'Part-time 12 tháng (Kèm PC BHXH 21.5%)', 'ACTIVE'),
  (5, 'NV005', 'Vũ Tiến Dũng',  '0902223344', '001195005566', 'Nam', '1995-09-12', 'MANAGER',      'FULL_TIME', 45000, '0902223344', 'MB Bank',     '2025-06-01', 'HĐLĐ Không xác định thời hạn (Quản lý)', 'ACTIVE')
ON DUPLICATE KEY UPDATE hourly_rate=VALUES(hourly_rate);
