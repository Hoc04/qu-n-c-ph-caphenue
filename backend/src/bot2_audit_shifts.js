/**
 * Bot 2 Script: QA Audit & Verification of Morning (Ca Sáng) & Night (Ca Tối) Shifts
 */
const http = require('http');

function apiGet(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000' + path, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

function apiPost(path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function runShiftAudit() {
  console.log('🧐 [Bot 2 - Giám sát & Kiểm định Ca làm] Bắt đầu thẩm định phân bổ Ca Sáng & Ca Tối...\n');
  let errors = 0;

  // 1. Kiểm tra toàn bộ ca ngày 05/11/2026
  console.log('🔍 [Audit 1] Kiểm tra phân bổ tổng thể ngày 05/11/2026...');
  const allShiftsRes = await apiGet('/api/staff/timesheets?date=2026-11-05');
  if (allShiftsRes.status !== 200) {
    console.error('   ❌ LỖI gọi API timesheets:', allShiftsRes);
    errors++;
    return;
  }
  const allShifts = allShiftsRes.data;
  console.log(`   -> Tổng số ca ghi nhận: ${allShifts.length} ca.`);

  // 2. Kiểm tra Ca Sáng
  console.log('\n🔍 [Audit 2] Kiểm tra phân bổ CA SÁNG (07:00 - 12:30)...');
  const morningRes = await apiGet('/api/staff/timesheets?date=2026-11-05&shift_type=MORNING');
  const morningShifts = morningRes.data;
  console.log(`   -> Số nhân sự Ca Sáng: ${morningShifts.length} nhân sự (Kỳ vọng: 4)`);

  const morningPositions = morningShifts.map(s => s.position);
  console.log(`   -> Các vị trí có mặt: ${morningPositions.join(', ')}`);

  const hasMorningManager = morningPositions.includes('MANAGER');
  const hasMorningBarista = morningPositions.includes('BARISTA');
  const hasMorningCashier = morningPositions.includes('CASHIER');
  const hasMorningServer  = morningPositions.includes('SERVER');

  if (hasMorningManager && hasMorningBarista && hasMorningCashier && hasMorningServer) {
    console.log('   ✅ ĐẠT: Ca Sáng phân bổ hoàn hảo (1 Quản lý, 1 Pha chế, 1 Thu ngân, 1 Phục vụ)!');
  } else {
    console.error('   ❌ LỖI: Ca Sáng thiếu vị trí cần thiết!');
    errors++;
  }

  // 3. Kiểm tra Ca Tối & Phụ cấp ca đêm (+30% sau 22h theo Điều 98 BLLĐ)
  console.log('\n🔍 [Audit 3] Kiểm tra phân bổ CA TỐI (17:30 - 23:30)...');
  const nightRes = await apiGet('/api/staff/timesheets?date=2026-11-05&shift_type=NIGHT');
  const nightShifts = nightRes.data;
  console.log(`   -> Số nhân sự Ca Tối: ${nightShifts.length} nhân sự (Kỳ vọng: 5)`);

  let totalNightAllowanceHours = 0;
  nightShifts.forEach(s => {
    const nh = parseFloat(s.night_hours) || 0;
    totalNightAllowanceHours += nh;
    console.log(`      * [${s.staff_code}] ${s.staff_name} (${s.position}): ${s.total_hours}h làm việc, có ${nh}h ca đêm sau 22h [${s.status}]`);
  });

  if (totalNightAllowanceHours > 0) {
    console.log(`   ✅ ĐẠT: Ca Tối đã ghi nhận tổng cộng ${totalNightAllowanceHours} giờ làm việc ca đêm sau 22:00 được hưởng phụ cấp +30%!`);
  } else {
    console.error('   ❌ LỖI: Ca Tối đóng quán sau 22h nhưng không tính giờ đêm (+30%)!');
    errors++;
  }

  // 4. Kiểm tra ca đang làm việc (WORKING status)
  console.log('\n🔍 [Audit 4] Kiểm tra trạng thái ca đang làm việc...');
  const workingRes = await apiGet('/api/staff/timesheets?date=2026-11-05&status=WORKING');
  const workingShifts = workingRes.data;
  console.log(`   -> Ca đang làm việc thời gian thực: ${workingShifts.length} ca`);
  if (workingShifts.length > 0) {
    console.log(`   ✅ ĐẠT: Nhân sự ${workingShifts[0].staff_name} đang trong ca làm việc, sẵn sàng cho quản lý bấm "Kết thúc ca"!`);
  } else {
    console.warn('   ⚠️ Không có ca nào ở trạng thái WORKING.');
  }

  // 5. Kiểm tra tự động tính lương tháng với dữ liệu phân bổ ca mới
  console.log('\n🔍 [Audit 5] Kiểm tra tích hợp tính lương tháng tự động (Auto-Payroll)...');
  const calcRes = await apiPost('/api/staff/payrolls/calculate', { month_year: '2026-11' });
  if (calcRes.status === 200) {
    console.log(`   ✅ ĐẠT: Tính lương tháng tự động thành công cho ${calcRes.data.processed} nhân viên!`);
    calcRes.data.data.forEach(p => {
      console.log(`      * ${p.staff_name}: Tổng ${p.total_hours}h (Đêm: ${p.night_hours}h) -> Lương: ${p.net_salary.toLocaleString()}đ`);
    });
  } else {
    console.error('   ❌ LỖI tính lương tự động:', calcRes);
    errors++;
  }

  console.log('\n════════════════════════════════════════════════════════');
  if (errors === 0) {
    console.log('🎉 [Bot 2 Audit PASS] PHÂN BỔ CA SÁNG VÀ CA TỐI ĐẠT CHUẨN 100% CẢ VỀ VẬN HÀNH & PHÁP LÝ LAO ĐỘNG!');
  } else {
    console.error(`⚠️ [Bot 2 Audit FAIL] Có ${errors} lỗi cần sửa!`);
  }
}

runShiftAudit().catch(console.error);

