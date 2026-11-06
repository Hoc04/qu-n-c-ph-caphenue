/**
 * Bot 1 Script: Tải ảnh, nén chuẩn 500x500 Sharp, và seed 9 món bánh ngọt vào Database MySQL & SQL files
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('../node_modules/sharp');
const mysql = require('../node_modules/mysql2/promise');
require('../node_modules/dotenv').config({ path: path.resolve(__dirname, '../.env') });

const newCakes = [
  // 4 Bánh giá rẻ 20k -> 30k
  {
    name: 'Bánh su kem Choux Craquelin',
    price: 22000,
    category_id: 3,
    description: 'Vỏ su giòn rụm Craquelin kiểu Pháp, ngập tràn nhân kem trứng custard béo ngậy thanh mát.',
    image_file: 'banh_su_kem.jpg',
    url: 'https://images.unsplash.com/photo-1612203985729-70726954388c?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Cookie Socola hạt phỉ giòn',
    price: 25000,
    category_id: 3,
    description: 'Bánh quy bơ nướng giòn tan kết hợp socola đen chip và hạt phỉ rang thơm bùi hấp dẫn.',
    image_file: 'cookie_socola.jpg',
    url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Bánh Muffin việt quất tươi',
    price: 28000,
    category_id: 3,
    description: 'Cốt bánh muffin bơ sữa xốp mềm, hòa quyện từng quả việt quất tươi chua ngọt mọng nước.',
    image_file: 'muffin_vietquat.jpg',
    url: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Bánh bông lan trứng muối mini',
    price: 29000,
    category_id: 3,
    description: 'Cốt bông lan Chiffon mềm mịn tan trong miệng, phủ sốt bơ kim sa và trứng muối béo ngậy.',
    image_file: 'bonglan_trungmuoi.jpg',
    url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80'
  },

  // 5 Bánh hảo hạng cao cấp
  {
    name: 'Bánh Mille Crepe Matcha Nhật Bản',
    price: 49000,
    category_id: 3,
    description: 'Tuyệt tác 20 lớp bánh crepe siêu mỏng xếp tầng cùng kem tươi trà xanh Uji Kyoto thượng hạng.',
    image_file: 'crepe_matcha.jpg',
    url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Bánh Red Velvet nhung đỏ dâu tây',
    price: 52000,
    category_id: 3,
    description: 'Sắc đỏ nhung quý phái quyện cùng lớp kem phô mai Cream Cheese béo chua nhẹ và dâu tươi.',
    image_file: 'red_velvet.jpg',
    url: 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Tart phúc bồn tử phô mai hoàng gia',
    price: 55000,
    category_id: 3,
    description: 'Đế tart nướng bơ Pháp giòn rụm, kem phô mai Mascarpone mịn màng phủ đầy quả mâm xôi tươi.',
    image_file: 'tart_phucbontu.jpg',
    url: 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Macaron hoa đào cao cấp (Hộp 3 vị)',
    price: 56000,
    category_id: 3,
    description: 'Hộp 3 bánh macaron bột hạnh nhân giòn tan vị hoa đào caPHEnue, hạt dẻ cười Pistachio và socola.',
    image_file: 'macaron_hoadao.jpg',
    url: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Bánh Lava Socola Bỉ tan chảy',
    price: 58000,
    category_id: 3,
    description: 'Bánh nướng nóng hổi với dòng sốt socola đen nguyên chất 70% tuôn trào quyến rũ bất tận.',
    image_file: 'lava_socola.jpg',
    url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80'
  }
];

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  console.log('🤖 [Bot 1] Bắt đầu tải và tối ưu 9 ảnh bánh ngọt...');
  const imgDir = path.resolve(__dirname, '../../images/products');
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

  for (const item of newCakes) {
    const destPath = path.join(imgDir, item.image_file);
    console.log(` -> Tải ảnh: ${item.name} (${item.image_file})...`);
    try {
      const rawBuffer = await downloadImage(item.url);
      const optimizedBuffer = await sharp(rawBuffer)
        .resize(500, 500, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 82, progressive: true, mozjpeg: true })
        .toBuffer();
      fs.writeFileSync(destPath, optimizedBuffer);
      console.log(`    ✅ Đã lưu ${item.image_file} (${Math.round(optimizedBuffer.length / 1024)} KB)`);
    } catch (err) {
      console.error(`    ❌ Lỗi tải ảnh ${item.name}:`, err.message);
    }
  }

  console.log('\n🤖 [Bot 1] Đang cập nhật Database MySQL...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'caphenue'
  });

  for (const item of newCakes) {
    const relUrl = `images/products/${item.image_file}`;
    const [rows] = await conn.query('SELECT id FROM products WHERE name = ?', [item.name]);
    if (rows.length === 0) {
      await conn.query(
        'INSERT INTO products (category_id, name, price, description, image_url, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [item.category_id, item.name, item.price, item.description, relUrl]
      );
      console.log(`    ➕ Đã thêm vào DB: ${item.name} (${item.price}đ)`);
    } else {
      await conn.query(
        'UPDATE products SET price = ?, description = ?, image_url = ?, is_active = 1 WHERE id = ?',
        [item.price, item.description, relUrl, rows[0].id]
      );
      console.log(`    🔄 Đã cập nhật DB: ${item.name} (ID: ${rows[0].id})`);
    }
  }

  const [allPastries] = await conn.query('SELECT id, name, price, image_url FROM products WHERE category_id = 3 ORDER BY price ASC');
  console.log(`\n📋 Danh sách toàn bộ ${allPastries.length} bánh ngọt trong DB hiện tại:`);
  allPastries.forEach(p => console.log(`   #${p.id}: ${p.name} - ${Number(p.price).toLocaleString('vi-VN')}đ [${p.image_url}]`));

  await conn.end();
  console.log('\n✨ [Bot 1] Hoàn thành công việc đề xuất và tạo dữ liệu!');
}

run().catch(console.error);

