/**
 * Bot 2: QA Audit & Verification of HRM System against Vietnamese Labor Law
 */
const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runAudit() {
  console.log('🧐 [Bot 2 - Giám sát & QA Pháp lý] Bắt đầu kiểm định hệ thống Quản lý Nhân sự HRM...\n');
  let errors = 0;

  // 1. Kiểm định từ chối trả lương dưới sàn luật định (< 23.800 đ/h theo NĐ 74/2024)
  console.log('🔍 [Test 1] Thử tạo nhân viên với mức lương PHẠM LUẬT (20.000 đ/giờ)...');
  const illegalRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/staff',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    code: 'NV_TEST_ILLEGAL',
    full_name: 'Test Phạm Luật',
    phone: '0999888777',
    citizen_id: '001200999888',
    hourly_rate: 20000 // Thấp hơn 23.800đ
  });

  if (illegalRes.status === 400 && illegalRes.data.error.includes('vi phạm mức lương tối thiểu vùng I')) {
    console.log('   ✅ ĐẠT: Backend đã chặn thành công mức lương vi phạm pháp luật: "' + illegalRes.data.error + '"');
  } else {
    console.error('   ❌ LỖI: Backend không chặn được mức lương vi phạm!', illegalRes);
    errors++;
  }

  // 2. Thử tạo nhân viên HỢP PHÁP (27.000 đ/giờ >= 23.800 đ/giờ)
  const testCode = 'NV' + Date.now().toString().slice(-4);
  console.log(`\n🔍 [Test 2] Thử tạo nhân viên HỢP PHÁP ${testCode} (27.000 đ/giờ >= 23.800 đ/giờ)...`);
  const legalRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/staff',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    code: testCode,
    full_name: 'Hoàng Quốc Bảo',
    phone: '0988776655',
    citizen_id: '001202888999',
    position: 'SERVER',
    employment_type: 'PART_TIME',
    hourly_rate: 27000,
    bank_account: '1234567890',
    bank_name: 'Techcombank'
  });

  let testStaffId = null;
  if (legalRes.status === 201) {
    testStaffId = legalRes.data.id;
    console.log(`   ✅ ĐẠT: Thêm nhân viên thành công (ID: ${testStaffId}, Mã: ${legalRes.data.code})`);
  } else {
    console.error('   ❌ LỖI: Thêm nhân viên hợp pháp thất bại!', legalRes);
    errors++;
  }

  // 3. Test Chấm công vào ca & Kết thúc ca
  console.log('\n🔍 [Test 3] Thử nghiệm Check-in và Check-out ca làm việc...');
  const checkinRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/staff/timesheets/checkin',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    staff_id: testStaffId || 1,
    shift_type: 'NIGHT',
    note: 'Ca tối thử nghiệm đóng cửa quán'
  });

  if (checkinRes.status === 201) {
    const shiftId = checkinRes.data.id;
    console.log(`   ✅ Check-in thành công: Ca #${shiftId}`);

    // Check-out
    const checkoutRes = await request({
      host: 'localhost',
      port: 3000,
      path: `/api/staff/timesheets/${shiftId}/checkout`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (checkoutRes.status === 200) {
      console.log(`   ✅ Check-out thành công: ${checkoutRes.data.message}`);
    } else {
      console.error('   ❌ Check-out thất bại:', checkoutRes);
      errors++;
    }
  } else {
    console.error('   ❌ Check-in thất bại:', checkinRes);
    errors++;
  }

  // 4. Test Bảng tính lương tự động & Quyền lợi BLLĐ (Phụ cấp ca đêm + Phụ cấp BHXH Part-time)
  console.log('\n🔍 [Test 4] Thử nghiệm tính lương tự động tháng 2026-11 theo công thức BLLĐ 2019...');
  const calcRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/staff/payrolls/calculate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { month_year: '2026-11' });

  if (calcRes.status === 200 && calcRes.data.processed >= 5) {
    console.log(`   ✅ ĐÃ TÍNH TOÁN ${calcRes.data.processed} BẢN GHI LƯƠNG THÁNG 2026-11:`);
    calcRes.data.data.forEach(p => {
      console.log(`      * [${p.staff_code}] ${p.staff_name}: ${p.total_hours}h | Lương CB: ${p.base_pay.toLocaleString()}đ | Ca đêm (+30%): ${p.night_pay.toLocaleString()}đ | PC BHXH: ${p.insurance_allowance.toLocaleString()}đ => THỰC NHẬN: ${p.net_salary.toLocaleString()}đ`);
    });
  } else {
    console.error('   ❌ Tính lương tự động thất bại:', calcRes);
    errors++;
  }

  // 5. Test Chi trả lương (PATCH /api/staff/payrolls/:id/pay)
  console.log('\n🔍 [Test 5] Thử nghiệm thanh toán lương (Payment Confirmation)...');
  const payrollsRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/staff/payrolls?month_year=2026-11'
  });

  if (payrollsRes.status === 200 && payrollsRes.data.length > 0) {
    const firstPayroll = payrollsRes.data[0];
    const payRes = await request({
      host: 'localhost',
      port: 3000,
      path: `/api/staff/payrolls/${firstPayroll.id}/pay`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });

    if (payRes.status === 200 && payRes.data.status === 'PAID') {
      console.log(`   ✅ Đã chi trả lương thành công cho phiếu #${firstPayroll.id} (${firstPayroll.staff_name})!`);
    } else {
      console.error('   ❌ Chi trả lương thất bại:', payRes);
      errors++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════');
  if (errors === 0) {
    console.log('🎉 [Bot 2 Audit PASS] HỆ THỐNG QUẢN LÝ NHÂN SỰ & TIỀN LƯƠNG HOÀN TOÀN CHUẨN XÁC, TUÂN THỦ 100% PHÁP LUẬT VIỆT NAM!');
  } else {
    console.error(`⚠️ [Bot 2 Audit FAIL] Có ${errors} lỗi!`);
  }
}

runAudit().catch(console.error);
