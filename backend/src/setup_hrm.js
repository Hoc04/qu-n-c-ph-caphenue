/**
 * Setup HRM (Human Resource Management) Database & Seed Data
 * Bảng: staff_members, staff_timesheets, staff_payrolls
 * Tuân thủ Bộ luật Lao động 2019 & Nghị định 74/2024/NĐ-CP (Lương tối thiểu giờ >= 23.800đ)
 */
const mysql = require('../node_modules/mysql2/promise');
const path  = require('path');
require('../node_modules/dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function setupHRM() {
  console.log('🤖 [Bot 1] Khởi tạo các bảng Quản lý Nhân sự & Tiền lương chuẩn BLLĐ 2019...');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'caphenue'
  });

  // 1. Bảng staff_members (Hồ sơ nhân viên & Hợp đồng lao động)
  await conn.query(`
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
      hourly_rate DECIMAL(10,2) NOT NULL, -- Tối thiểu 23.800đ/h
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
  `);
  console.log('  ✅ Bảng staff_members sẵn sàng');

  // 2. Bảng staff_timesheets (Chấm công ca làm & Phụ cấp ca đêm)
  await conn.query(`
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
  `);
  console.log('  ✅ Bảng staff_timesheets sẵn sàng');

  // 3. Bảng staff_payrolls (Bảng lương tháng & Quyền lợi BLLĐ)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS staff_payrolls (
      id INT AUTO_INCREMENT PRIMARY KEY,
      staff_id INT NOT NULL,
      month_year VARCHAR(7) NOT NULL, -- '2026-11'
      total_regular_hours DECIMAL(6,2) DEFAULT 0,
      total_night_hours DECIMAL(6,2) DEFAULT 0,
      total_overtime_hours DECIMAL(6,2) DEFAULT 0,
      hourly_rate DECIMAL(10,2) NOT NULL,
      base_pay DECIMAL(12,2) NOT NULL,            -- Giờ thường x Lương giờ
      night_pay DECIMAL(12,2) DEFAULT 0,           -- Giờ đêm x 30% x Lương giờ (Điều 98 BLLĐ)
      overtime_pay DECIMAL(12,2) DEFAULT 0,        -- Giờ thêm x 150% x Lương giờ
      insurance_allowance DECIMAL(12,2) DEFAULT 0, -- Khoản 3 Điều 168 BLLĐ (+21.5% lương đóng BHXH cho Part-time)
      bonus DECIMAL(12,2) DEFAULT 0,               -- Thưởng chuyên cần, tip, doanh số
      deduction DECIMAL(12,2) DEFAULT 0,           -- Khấu trừ (đi muộn, ứng trước)
      net_salary DECIMAL(12,2) NOT NULL,           -- Thực nhận
      payment_status ENUM('PENDING', 'PAID') DEFAULT 'PENDING',
      paid_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE CASCADE,
      UNIQUE KEY unique_staff_month (staff_id, month_year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('  ✅ Bảng staff_payrolls sẵn sàng');

  // Seed sample staff
  const sampleStaff = [
    {
      code: 'NV001',
      full_name: 'Nguyễn Văn An',
      phone: '0912345601',
      citizen_id: '001202001122',
      gender: 'Nam',
      birthday: '2004-03-15',
      position: 'SERVER',
      employment_type: 'PART_TIME',
      hourly_rate: 25000,
      bank_account: '1023456789',
      bank_name: 'MB Bank',
      start_date: '2026-01-10',
      contract_duration: 'Part-time 6 tháng (Kèm PC BHXH 21.5%)',
      status: 'ACTIVE'
    },
    {
      code: 'NV002',
      full_name: 'Trần Thị Mai',
      phone: '0912345602',
      citizen_id: '001203002233',
      gender: 'Nữ',
      birthday: '2003-08-20',
      position: 'SERVER',
      employment_type: 'PART_TIME',
      hourly_rate: 26000,
      bank_account: '9876543210',
      bank_name: 'Vietcombank',
      start_date: '2026-02-01',
      contract_duration: 'Part-time 6 tháng (Kèm PC BHXH 21.5%)',
      status: 'ACTIVE'
    },
    {
      code: 'NV003',
      full_name: 'Lê Hoàng Nam',
      phone: '0912345603',
      citizen_id: '001198003344',
      gender: 'Nam',
      birthday: '1998-11-05',
      position: 'BARISTA',
      employment_type: 'FULL_TIME',
      hourly_rate: 32000,
      bank_account: '0388889999',
      bank_name: 'Techcombank',
      start_date: '2025-10-15',
      contract_duration: 'HĐLĐ 24 tháng (Đóng BHXH đầy đủ)',
      status: 'ACTIVE'
    },
    {
      code: 'NV004',
      full_name: 'Phạm Minh Thu',
      phone: '0912345604',
      citizen_id: '001201004455',
      gender: 'Nữ',
      birthday: '2001-05-18',
      position: 'CASHIER',
      employment_type: 'PART_TIME',
      hourly_rate: 28000,
      bank_account: '1903332211',
      bank_name: 'VPBank',
      start_date: '2026-03-01',
      contract_duration: 'Part-time 12 tháng (Kèm PC BHXH 21.5%)',
      status: 'ACTIVE'
    },
    {
      code: 'NV005',
      full_name: 'Vũ Tiến Dũng',
      phone: '0902223344',
      citizen_id: '001195005566',
      gender: 'Nam',
      birthday: '1995-09-12',
      position: 'MANAGER',
      employment_type: 'FULL_TIME',
      hourly_rate: 45000,
      bank_account: '0902223344',
      bank_name: 'MB Bank',
      start_date: '2025-06-01',
      contract_duration: 'HĐLĐ Không xác định thời hạn (Quản lý)',
      status: 'ACTIVE'
    }
  ];

  for (const emp of sampleStaff) {
    const [existing] = await conn.query('SELECT id FROM staff_members WHERE code = ?', [emp.code]);
    if (existing.length === 0) {
      await conn.query(
        `INSERT INTO staff_members (code, full_name, phone, citizen_id, gender, birthday, position, employment_type, hourly_rate, bank_account, bank_name, start_date, contract_duration, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [emp.code, emp.full_name, emp.phone, emp.citizen_id, emp.gender, emp.birthday, emp.position, emp.employment_type, emp.hourly_rate, emp.bank_account, emp.bank_name, emp.start_date, emp.contract_duration, emp.status]
      );
      console.log(`  ➕ Thêm nhân viên mẫu: ${emp.code} - ${emp.full_name} (${emp.position}) - ${emp.hourly_rate}đ/h`);
    }
  }

  // Seed sample timesheets for today and yesterday
  const [staffRows] = await conn.query('SELECT id, code, hourly_rate, employment_type FROM staff_members');
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  
  for (const staff of staffRows) {
    const [existingTs] = await conn.query('SELECT id FROM staff_timesheets WHERE staff_id = ? AND work_date = ?', [staff.id, todayStr]);
    if (existingTs.length === 0) {
      // Create a completed shift for today
      await conn.query(
        `INSERT INTO staff_timesheets (staff_id, work_date, shift_type, check_in, check_out, total_hours, night_hours, overtime_hours, status, note)
         VALUES (?, ?, 'MORNING', ?, ?, 5.0, 0, 0, 'COMPLETED', 'Ca sáng hoàn thành tốt')`,
        [staff.id, todayStr, `${todayStr} 07:00:00`, `${todayStr} 12:00:00`]
      );
    }
  }

  // Seed sample night shift with night hours (+30% after 22h) for NV001
  const [nv1] = await conn.query('SELECT id FROM staff_members WHERE code = "NV001"');
  if (nv1.length > 0) {
    const [existingNight] = await conn.query('SELECT id FROM staff_timesheets WHERE staff_id = ? AND shift_type = "NIGHT"', [nv1[0].id]);
    if (existingNight.length === 0) {
      await conn.query(
        `INSERT INTO staff_timesheets (staff_id, work_date, shift_type, check_in, check_out, total_hours, night_hours, overtime_hours, status, note)
         VALUES (?, ?, 'NIGHT', ?, ?, 5.5, 1.5, 0, 'COMPLETED', 'Ca tối đóng cửa quán (1.5h sau 22h hưởng +30%)')`,
        [nv1[0].id, todayStr, `${todayStr} 18:00:00`, `${todayStr} 23:30:00`]
      );
    }
  }
  console.log('  ✅ Dữ liệu mẫu chấm công khởi tạo thành công');

  await conn.end();
  console.log('✨ [Bot 1] Setup HRM hoàn tất!');
}

setupHRM().catch(console.error);
