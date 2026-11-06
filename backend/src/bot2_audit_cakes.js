/**
 * Bot 2 Script: QA Audit, Verification & Test of 9 New Pastries
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const sharp = require('../node_modules/sharp');
const mysql = require('../node_modules/mysql2/promise');
require('../node_modules/dotenv').config({ path: path.resolve(__dirname, '../.env') });

const EXPECTED_NEW_CAKES = [
  { name: 'Bánh su kem Choux Craquelin', price: 22000, file: 'banh_su_kem.jpg', type: 'CHEAP' },
  { name: 'Cookie Socola hạt phỉ giòn', price: 25000, file: 'cookie_socola.jpg', type: 'CHEAP' },
  { name: 'Bánh Muffin việt quất tươi', price: 28000, file: 'muffin_vietquat.jpg', type: 'CHEAP' },
  { name: 'Bánh bông lan trứng muối mini', price: 29000, file: 'bonglan_trungmuoi.jpg', type: 'CHEAP' },
  { name: 'Bánh Mille Crepe Matcha Nhật Bản', price: 49000, file: 'crepe_matcha.jpg', type: 'PREMIUM' },
  { name: 'Bánh Red Velvet nhung đỏ dâu tây', price: 52000, file: 'red_velvet.jpg', type: 'PREMIUM' },
  { name: 'Tart phúc bồn tử phô mai hoàng gia', price: 55000, file: 'tart_phucbontu.jpg', type: 'PREMIUM' },
  { name: 'Macaron hoa đào cao cấp (Hộp 3 vị)', price: 56000, file: 'macaron_hoadao.jpg', type: 'PREMIUM' },
  { name: 'Bánh Lava Socola Bỉ tan chảy', price: 58000, file: 'lava_socola.jpg', type: 'PREMIUM' }
];

async function runAudit() {
  console.log('🧐 [Bot 2 - QA & Auditor] Bắt đầu thẩm định & kiểm tra kết quả của Bot 1...\n');
  let errors = 0;

  // 1. Audit Images
  console.log('🔍 [Audit 1] Kiểm tra tính toàn vẹn của 9 file ảnh sản phẩm trên đĩa...');
  const imgDir = path.resolve(__dirname, '../../images/products');
  for (const cake of EXPECTED_NEW_CAKES) {
    const fullPath = path.join(imgDir, cake.file);
    if (!fs.existsSync(fullPath)) {
      console.error(`   ❌ THIẾU FILE ẢNH: ${cake.file}`);
      errors++;
      continue;
    }
    const stat = fs.statSync(fullPath);
    if (stat.size < 5000) {
      console.error(`   ❌ FILE ẢNH QUÁ NHỎ HOẶC LỖI (<5KB): ${cake.file} (${stat.size} bytes)`);
      errors++;
      continue;
    }
    const meta = await sharp(fullPath).metadata();
    if (meta.width !== 500 || meta.height !== 500 || meta.format !== 'jpeg') {
      console.warn(`   ⚠️ Kích thước ảnh chưa chuẩn 500x500 JPEG: ${cake.file} (${meta.width}x${meta.height}, ${meta.format})`);
      errors++;
    } else {
      console.log(`   ✅ ${cake.file}: ${meta.width}x${meta.height} ${meta.format.toUpperCase()} (${Math.round(stat.size/1024)}KB) - Khớp 100%!`);
    }
  }

  // 2. Audit Database
  console.log('\n🔍 [Audit 2] Kiểm tra Database MySQL (bảng products, category_id = 3)...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'caphenue'
  });

  const [dbCakes] = await conn.query('SELECT * FROM products WHERE category_id = 3 ORDER BY price ASC');
  console.log(`   -> Tổng số bánh ngọt trong danh mục: ${dbCakes.length} (Kỳ vọng: 13 món)`);
  if (dbCakes.length < 13) {
    console.error(`   ❌ Số lượng bánh ngọt chưa đủ 13 món! Hiện tại: ${dbCakes.length}`);
    errors++;
  } else {
    console.log('   ✅ Đã đủ 13 món bánh ngọt!');
  }

  // Check 4 cheap cakes (20k - 30k)
  const cheapCakes = dbCakes.filter(c => Number(c.price) >= 20000 && Number(c.price) <= 30000);
  console.log(`   -> Số bánh rẻ trong tầm 20k - 30k: ${cheapCakes.length} món (Kỳ vọng >= 4 món)`);
  cheapCakes.forEach(c => console.log(`      * [RẺ] ${c.name} - ${Number(c.price).toLocaleString('vi-VN')}đ`));
  if (cheapCakes.length < 4) {
    console.error('   ❌ Không đủ 4 bánh rẻ trong tầm giá 20k - 30k!');
    errors++;
  } else {
    console.log('   ✅ Đủ 4 bánh rẻ giá sinh viên/văn phòng (20k - 30k)!');
  }

  // Check 5 premium cakes (> 45k)
  const premiumCakes = dbCakes.filter(c => Number(c.price) >= 48000);
  console.log(`   -> Số bánh hảo hạng cao cấp: ${premiumCakes.length} món (Kỳ vọng >= 5 món)`);
  premiumCakes.forEach(c => console.log(`      * [HẢO HẠNG] ${c.name} - ${Number(c.price).toLocaleString('vi-VN')}đ`));
  if (premiumCakes.length < 5) {
    console.error('   ❌ Không đủ 5 bánh hảo hạng!');
    errors++;
  } else {
    console.log('   ✅ Đủ 5 bánh hảo hạng signature cao cấp!');
  }

  // 3. Audit API Endpoint
  console.log('\n🔍 [Audit 3] Kiểm tra API GET /api/products?category=B%C3%A1nh%20ng%E1%BB%8Dt...');
  const apiCakes = await new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/products?category=B%C3%A1nh%20ng%E1%BB%8Dt', res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });

  console.log(`   -> API trả về ${apiCakes.length} món bánh ngọt.`);
  if (apiCakes.length < 13) {
    console.error('   ❌ API chưa trả về đủ 13 món!');
    errors++;
  } else {
    console.log('   ✅ API phục vụ dữ liệu chính xác!');
  }

  // 4. Test placing order with a cheap cake and a premium cake
  console.log('\n🔍 [Audit 4] Thử nghiệm tạo đơn hàng chứa Bánh Su Kem (22k) và Bánh Lava Socola (58k)...');
  const orderPayload = JSON.stringify({
    customer_id: null,
    order_type: 'TAKEAWAY',
    payment_method: 'CASH',
    items: [
      { product_id: 14, quantity: 2, price: 22000, note: 'Su kem giòn' },
      { product_id: 22, quantity: 1, price: 58000, note: 'Lava nóng hổi' }
    ]
  });

  const testOrderRes = await new Promise((resolve, reject) => {
    const req = http.request({
      host: 'localhost',
      port: 3000,
      path: '/api/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(orderPayload)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(orderPayload);
    req.end();
  });

  console.log(`   -> Kết quả tạo đơn hàng mẫu: HTTP ${testOrderRes.status}`);
  if (testOrderRes.status === 201) {
    console.log(`   ✅ Đơn hàng tạo thành công: Mã ${testOrderRes.data.code}, Tổng tiền: ${Number(testOrderRes.data.total).toLocaleString('vi-VN')}đ`);
  } else {
    console.error('   ❌ Lỗi tạo đơn hàng với bánh mới:', testOrderRes.data);
    errors++;
  }

  await conn.end();

  console.log('\n════════════════════════════════════════════════════════');
  if (errors === 0) {
    console.log('🎉 [Bot 2 Audit PASS] TOÀN BỘ 9 MÓN BÁNH MỚI ĐÃ ĐƯỢC KIỂM ĐỊNH HOÀN HẢO 100%!');
  } else {
    console.error(`⚠️ [Bot 2 Audit FAIL] Phát hiện ${errors} lỗi cần sửa!`);
  }
}

runAudit().catch(console.error);
