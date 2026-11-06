const mysql = require('../node_modules/mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'caphenue'
  });

  console.log('1. Creating dining_tables table...');
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS dining_tables (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      table_number VARCHAR(20) NOT NULL UNIQUE,
      name         VARCHAR(100) NOT NULL,
      area         VARCHAR(50) NOT NULL DEFAULT 'INDOOR',
      capacity     INT NOT NULL DEFAULT 4,
      status       ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED') NOT NULL DEFAULT 'AVAILABLE',
      is_active    TINYINT NOT NULL DEFAULT 1,
      created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('2. Creating reservations table...');
  await conn.execute(`
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
  `);

  const [existingTables] = await conn.execute('SELECT COUNT(*) AS cnt FROM dining_tables');
  if (existingTables[0].cnt === 0) {
    console.log('3. Seeding initial dining tables...');
    await conn.execute(`
      INSERT INTO dining_tables (table_number, name, area, capacity, status) VALUES
      ('T1-01', 'Bàn Cửa Sổ Hoa Đào', 'INDOOR', 2, 'AVAILABLE'),
      ('T1-02', 'Bàn Sofa Trung Tâm', 'INDOOR', 4, 'OCCUPIED'),
      ('T1-03', 'Bàn Gần Quầy Bar', 'INDOOR', 2, 'AVAILABLE'),
      ('T1-04', 'Bàn Gỗ Lớn Gia Đình', 'INDOOR', 6, 'RESERVED'),
      ('T1-05', 'Bàn Góc Đọc Sách', 'INDOOR', 2, 'AVAILABLE'),
      ('T2-01', 'Ban Công Ngắm Phố 1', 'OUTDOOR', 4, 'AVAILABLE'),
      ('T2-02', 'Ban Công Ngắm Phố 2', 'OUTDOOR', 2, 'AVAILABLE'),
      ('T2-03', 'Sân Vườn Hoa Đào', 'OUTDOOR', 6, 'AVAILABLE'),
      ('T2-04', 'Bàn Tròn Sân Thượng', 'OUTDOOR', 4, 'OCCUPIED'),
      ('VIP-01', 'Phòng VIP Hoa Đào 1', 'VIP', 8, 'AVAILABLE'),
      ('VIP-02', 'Phòng Họp Nhóm & Workshop', 'VIP', 12, 'RESERVED');
    `);
  }

  const [existingRes] = await conn.execute('SELECT COUNT(*) AS cnt FROM reservations');
  if (existingRes[0].cnt === 0) {
    console.log('4. Seeding initial reservations...');
    const today = new Date().toISOString().slice(0, 10);
    await conn.execute(`
      INSERT INTO reservations (code, customer_id, customer_name, phone, table_id, party_size, reservation_date, reservation_time, area_preference, special_requests, status) VALUES
      ('DB20261105-001', 1, 'Trần Thanh Hải', '0912345678', 4, 6, '${today}', '19:30', 'INDOOR', 'Cần bàn chuẩn bị sẵn ly nước lọc và gần ổ cắm điện', 'CONFIRMED'),
      ('DB20261105-002', 3, 'Lê Hoàng Nam', '0909123456', 11, 10, '${today}', '20:00', 'VIP', 'Họp nhóm dự án startup, cần sử dụng máy chiếu', 'CONFIRMED'),
      ('DB20261105-003', NULL, 'Nguyễn Thu Trang', '0987654321', 1, 2, '${today}', '18:00', 'INDOOR', 'Kỷ niệm ngày cưới, setup bàn lãng mạn cạnh cửa sổ', 'PENDING');
    `);
  }

  console.log('5. Adding table_id column to orders table if not exists...');
  const [cols] = await conn.execute(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'caphenue' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'table_id'
  `);
  if (cols.length === 0) {
    await conn.execute(`
      ALTER TABLE orders ADD COLUMN table_id INT DEFAULT NULL AFTER staff_id,
      ADD FOREIGN KEY (table_id) REFERENCES dining_tables(id) ON DELETE SET NULL;
    `);
    console.log('Added table_id to orders table.');
  }

  console.log('🎉 Setup Tables & Reservations successful!');
  await conn.end();
}

run().catch(err => {
  console.error('Error during setup:', err);
  process.exit(1);
});

