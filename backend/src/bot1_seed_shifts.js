/**
 * Bot 1 Script: Xây dựng và phân bổ Lịch làm việc Ca Sáng & Ca Tối chuẩn chuỗi quán cà phê caPHEnue
 */
const mysql = require('../node_modules/mysql2/promise');
const path  = require('path');
require('../node_modules/dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function seedShifts() {
  console.log('🤖 [Bot 1] Bắt đầu phân bổ Ca Sáng & Ca Tối chuẩn F&B cho caPHEnue...\n');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'caphenue'
  });

  // 1. Dọn dẹp ca test cũ của ngày hôm nay để nạp lịch phân bổ chuẩn
  const todayStr = '2026-11-05';
  await conn.query('DELETE FROM staff_timesheets WHERE work_date = ?', [todayStr]);
  console.log(`  🧹 Đã dọn dẹp các ca test ngày ${todayStr}`);

  // Lấy ID của các nhân sự cốt lõi
  const [staffRows] = await conn.query('SELECT id, code, full_name, position FROM staff_members');
  const getStaffId = (code) => staffRows.find(s => s.code === code)?.id;

  const dungId = getStaffId('NV005'); // Quản lý
  const namId  = getStaffId('NV003'); // Pha chế Barista
  const thuId  = getStaffId('NV004'); // Thu ngân POS
  const maiId  = getStaffId('NV002'); // Phục vụ bàn (Ca sáng)
  const anId   = getStaffId('NV001'); // Phục vụ bàn (Ca tối)
  const baoId  = getStaffId('NV006') || getStaffId('NV6463'); // Phục vụ bàn (Ca tối)

  // 2. Danh sách ca làm việc chuẩn hóa cho ngày 05/11/2026:
  const shiftsToInsert = [
    // ═════════════════════════════════════════════════════════════════
    // 🌅 CA SÁNG (07:00 - 12:30) - Đã hoàn thành (COMPLETED)
    // ═════════════════════════════════════════════════════════════════
    {
      staff_id: dungId,
      work_date: todayStr,
      shift_type: 'MORNING',
      check_in: `${todayStr} 06:45:00`,
      check_out: `${todayStr} 12:30:00`,
      total_hours: 5.75,
      night_hours: 0,
      overtime_hours: 0,
      status: 'COMPLETED',
      note: 'Mở cửa quán, kiểm quỹ đầu ca sáng, kiểm tra máy pha cà phê'
    },
    {
      staff_id: namId,
      work_date: todayStr,
      shift_type: 'MORNING',
      check_in: `${todayStr} 07:00:00`,
      check_out: `${todayStr} 12:30:00`,
      total_hours: 5.5,
      night_hours: 0,
      overtime_hours: 0,
      status: 'COMPLETED',
      note: 'Pha chế chính ca sáng, sơ chế nguyên liệu trà & hạt Robusta'
    },
    {
      staff_id: thuId,
      work_date: todayStr,
      shift_type: 'MORNING',
      check_in: `${todayStr} 07:00:00`,
      check_out: `${todayStr} 12:30:00`,
      total_hours: 5.5,
      night_hours: 0,
      overtime_hours: 0,
      status: 'COMPLETED',
      note: 'Thu ngân quầy POS ca sáng, tích điểm thành viên, kết toán ca'
    },
    {
      staff_id: maiId,
      work_date: todayStr,
      shift_type: 'MORNING',
      check_in: `${todayStr} 07:00:00`,
      check_out: `${todayStr} 12:30:00`,
      total_hours: 5.5,
      night_hours: 0,
      overtime_hours: 0,
      status: 'COMPLETED',
      note: 'Phục vụ bàn khu vực tầng 1 & ban công, bưng bê bánh nước'
    },

    // ═════════════════════════════════════════════════════════════════
    // 🌙 CA TỐI (17:30 - 23:00 / 23:30) - Có giờ ca đêm hưởng +30%
    // ═════════════════════════════════════════════════════════════════
    {
      staff_id: dungId,
      work_date: todayStr,
      shift_type: 'NIGHT',
      check_in: `${todayStr} 17:30:00`,
      check_out: `${todayStr} 23:30:00`,
      total_hours: 6.0,
      night_hours: 1.5, // 22:00 -> 23:30 = 1.5 tiếng ca đêm
      overtime_hours: 0,
      status: 'COMPLETED',
      note: 'Quản lý ca tối, tiếp đón khách đặt bàn phòng VIP, chốt sổ đóng quán (1.5h đêm +30%)'
    },
    {
      staff_id: namId,
      work_date: todayStr,
      shift_type: 'NIGHT',
      check_in: `${todayStr} 17:30:00`,
      check_out: `${todayStr} 23:00:00`,
      total_hours: 5.5,
      night_hours: 1.0, // 22:00 -> 23:00 = 1.0 tiếng ca đêm
      overtime_hours: 0,
      status: 'COMPLETED',
      note: 'Pha chế ca tối, làm bánh Tiramisu & Crepe Matcha, vệ sinh máy bar (1h đêm +30%)'
    },
    {
      staff_id: thuId,
      work_date: todayStr,
      shift_type: 'NIGHT',
      check_in: `${todayStr} 17:30:00`,
      check_out: `${todayStr} 23:00:00`,
      total_hours: 5.5,
      night_hours: 1.0, // 22:00 -> 23:00 = 1.0 tiếng ca đêm
      overtime_hours: 0,
      status: 'COMPLETED',
      note: 'Thu ngân quầy POS ca tối, áp mã khuyến mãi & đổi voucher (1h đêm +30%)'
    },
    {
      staff_id: anId,
      work_date: todayStr,
      shift_type: 'NIGHT',
      check_in: `${todayStr} 17:30:00`,
      check_out: `${todayStr} 23:30:00`,
      total_hours: 6.0,
      night_hours: 1.5, // 22:00 -> 23:30 = 1.5 tiếng ca đêm
      overtime_hours: 0,
      status: 'COMPLETED',
      note: 'Phục vụ bàn ca tối, lau dọn khu vực sân vườn & gom ly tách (1.5h đêm +30%)'
    },
    {
      staff_id: baoId,
      work_date: todayStr,
      shift_type: 'NIGHT',
      check_in: `${todayStr} 18:00:00`,
      check_out: null, // Đang làm việc!
      total_hours: 0,
      night_hours: 0,
      overtime_hours: 0,
      status: 'WORKING',
      note: 'Phục vụ sảnh chính ca tối, hỗ trợ khách gọi món tại bàn (ĐANG TRONG CA)'
    }
  ];

  console.log('  📋 Đang nạp danh sách ca làm việc vào Database...');
  for (const s of shiftsToInsert) {
    if (!s.staff_id) continue;
    await conn.query(
      `INSERT INTO staff_timesheets (staff_id, work_date, shift_type, check_in, check_out, total_hours, night_hours, overtime_hours, status, note)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [s.staff_id, s.work_date, s.shift_type, s.check_in, s.check_out, s.total_hours, s.night_hours, s.overtime_hours, s.status, s.note]
    );
  }

  const [count] = await conn.query('SELECT count(*) as total, shift_type FROM staff_timesheets WHERE work_date = ? GROUP BY shift_type', [todayStr]);
  console.log(`\n✅ [Bot 1] Đã nạp thành công lịch phân bổ ca ngày ${todayStr}:`);
  count.forEach(c => console.log(`   - ${c.shift_type === 'MORNING' ? '🌅 Ca Sáng' : '🌙 Ca Tối'}: ${c.total} nhân sự`));

  await conn.end();
  console.log('\n✨ [Bot 1] Hoàn tất nạp lịch Ca Sáng & Ca Tối!');
}

seedShifts().catch(console.error);

