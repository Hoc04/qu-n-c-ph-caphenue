/**
 * caPHEnue Backend Server - Node.js + Express + MySQL (Single Standardized DB)
 * Port: 3000
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express     = require('express');
const compression = require('compression');
const mysql2      = require('mysql2/promise');
const cors        = require('cors');
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const path        = require('path');

const app        = express();
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'caphenue_secret_2026';

// ── HIGH-PERFORMANCE MIDDLEWARE ─────────────────────────────────────────────
// 1. Gzip/Deflate compression for fast loading over network & tunnel
app.use(compression({
  threshold: 512, // Compress anything larger than 512 bytes
  level: 6        // Balanced high compression ratio & CPU efficiency
}));

app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','x-api-key']
}));
app.use(express.json());

// Đảm bảo tất cả API response đều gửi header charset UTF-8
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Phục vụ file tĩnh với charset UTF-8 và Browser Caching tối ưu
app.use(express.static(path.resolve(__dirname, '..'), {
  maxAge: '1d',
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (/\.(jpg|jpeg|png|webp|svg|ico|gif|woff2?|ttf)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  }
}));

// ── DATABASE CONNECTION (DUY NHẤT MYSQL: caphenue) ──────────────────────────
const pool = mysql2.createPool({
  host              : process.env.DB_HOST || 'localhost',
  port              : Number(process.env.DB_PORT) || 3306,
  user              : process.env.DB_USER || 'root',
  password          : process.env.DB_PASS || '',
  database          : process.env.DB_NAME || 'caphenue',
  charset           : 'utf8mb4',
  waitForConnections: true,
  connectionLimit   : 10
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// ── HELPER ───────────────────────────────────────────────────────────────────
function randomCode(prefix = 'UD') {
  return `${prefix}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
}

function todayStr() {
  return new Date().toISOString().slice(0,10).replace(/-/g,'');
}

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/ping', (req, res) => res.json({ ok: true, time: new Date() }));

// ════════════════════════════════════════════════════════════════════════════
// 1. AUTHENTICATION & TÀI KHOẢN NHÂN VIÊN (ADMIN / THU NGÂN)
// ════════════════════════════════════════════════════════════════════════════
app.post('/api/auth/admin', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Thiếu username hoặc password' });

    const rows = await query('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    if (!rows.length)
      return res.status(401).json({ error: 'Tài khoản không tồn tại hoặc đã bị khóa' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Mật khẩu không đúng' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        phone: user.phone || '',
        role: user.role
      }
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Lấy danh sách tài khoản nhân viên (Tên, SĐT/Username, Vai trò Admin/Thu ngân)
app.get('/api/users', async (req, res) => {
  try {
    const rows = await query('SELECT id, username, full_name, phone, role, is_active, created_at FROM users ORDER BY id');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Đổi mật khẩu nhân viên (Admin / Thu ngân)
async function handleUserPasswordChange(req, res) {
  try {
    const userId = parseInt(req.params.id);
    const { new_password, password } = req.body;
    const rawPass = new_password || password;
    if (!rawPass || String(rawPass).length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
    }
    const users = await query('SELECT id, username, full_name FROM users WHERE id = ?', [userId]);
    if (!users.length) return res.status(404).json({ error: 'Không tìm thấy tài khoản nhân viên' });

    const hash = await bcrypt.hash(String(rawPass), 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    res.json({
      id: userId,
      username: users[0].username,
      message: `Đã đổi mật khẩu thành công cho nhân viên ${users[0].full_name} (${users[0].username})`
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
}
app.put('/api/users/:id/password', handleUserPasswordChange);
app.patch('/api/users/:id/password', handleUserPasswordChange);

// ════════════════════════════════════════════════════════════════════════════
// 2. AUTH CUSTOMER (KHÁCH HÀNG ĐĂNG NHẬP VỚI SĐT & MẬT KHẨU)
// ════════════════════════════════════════════════════════════════════════════
app.post('/api/auth/customer', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ error: 'Vui lòng nhập số điện thoại và mật khẩu' });

    const rows = await query(`
      SELECT c.*, t.name AS tier_name, t.discount_percent, t.point_multiplier
      FROM customers c JOIN membership_tiers t ON c.tier_id = t.id
      WHERE c.phone = ? AND c.status = 'ACTIVE'
    `, [phone]);

    if (!rows.length)
      return res.status(404).json({ error: 'Số điện thoại chưa đăng ký hội viên hoặc đã bị khóa' });

    const cust = rows[0];
    let isMatch = false;
    if (cust.password_hash) {
      isMatch = await bcrypt.compare(password, cust.password_hash);
    } else {
      isMatch = (password === '123456');
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Mật khẩu không chính xác' });
    }

    const vouchers = await query(
      `SELECT rd.*, rw.name AS reward_name, rw.value
       FROM redemptions rd JOIN rewards rw ON rd.reward_id = rw.id
       WHERE rd.customer_id = ? AND rd.status = 'ISSUED' ORDER BY rd.created_at DESC`,
      [cust.id]
    );

    const history = await query(
      'SELECT * FROM point_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10',
      [cust.id]
    );

    const token = jwt.sign({ id: cust.id, phone: cust.phone, role: 'CUSTOMER' }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeCust } = cust;
    res.json({
      token,
      customer: { ...safeCust, vouchers, history }
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 3. MEMBERSHIP TIERS (4 HẠNG THÀNH VIÊN)
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/tiers', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM membership_tiers ORDER BY min_points ASC');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// 4. PRODUCTS & CATEGORIES
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/products', async (req, res) => {
  try {
    const { category, active } = req.query;
    let sql = `SELECT p.*, c.name AS category_name
               FROM products p JOIN product_categories c ON p.category_id = c.id
               WHERE 1=1`;
    const params = [];
    if (active !== 'all') { sql += ' AND p.is_active = 1'; }
    if (category && category !== 'ALL') { sql += ' AND c.name = ?'; params.push(category); }
    sql += ' ORDER BY c.id, p.id';
    const rows = await query(sql, params);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/product-categories', async (req, res) => {
  try {
    const rows = await query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS total_products,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS active_products
      FROM product_categories c
      ORDER BY c.id
    `);
    res.json(rows.map(r => ({
      ...r,
      is_active: r.active_products > 0 ? 1 : 0
    })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/product-categories/:id/toggle', async (req, res) => {
  try {
    const catId = parseInt(req.params.id);
    const activeProds = await query('SELECT COUNT(*) AS cnt FROM products WHERE category_id = ? AND is_active = 1', [catId]);
    const newState = activeProds[0].cnt > 0 ? 0 : 1;
    await query('UPDATE product_categories SET is_active = ? WHERE id = ?', [newState, catId]);
    await query('UPDATE products SET is_active = ? WHERE category_id = ?', [newState, catId]);
    res.json({ id: catId, is_active: newState, message: newState ? 'Đã bật danh mục sản phẩm' : 'Đã tạm ngưng danh mục sản phẩm' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', async (req, res) => {
  try {
    const { category_id, name, price, image_emoji, image_url, description } = req.body;
    const catId = parseInt(category_id) || 1;
    const numPrice = parseFloat(price) || 0;
    const emoji = image_emoji || '☕';
    const imgUrl = image_url || 'images/products/caphe_suada.jpg';
    const desc = description || '';

    const result = await query(
      'INSERT INTO products (category_id, name, price, image_emoji, image_url, description, is_active) VALUES (?,?,?,?,?,?,1)',
      [catId, name, numPrice, emoji, imgUrl, desc]
    );
    res.status(201).json({ id: result.insertId, message: 'Thêm sản phẩm thành công' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, price, is_active, image_emoji, description } = req.body;
    const prodId = parseInt(req.params.id);
    await query(
      'UPDATE products SET name=?, price=?, is_active=?, image_emoji=?, description=? WHERE id=?',
      [name, price, is_active, image_emoji, description, prodId]
    );
    res.json({ message: 'Cập nhật thành công' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/products/:id/toggle', async (req, res) => {
  try {
    const prodId = parseInt(req.params.id);
    const rows = await query('SELECT id, name, is_active FROM products WHERE id = ?', [prodId]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    const newState = rows[0].is_active ? 0 : 1;
    await query('UPDATE products SET is_active = ? WHERE id = ?', [newState, prodId]);
    res.json({ id: prodId, is_active: newState, message: newState ? `Đã mở bán "${rows[0].name}"` : `Đã tạm ngưng "${rows[0].name}"` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// 5. PROMOTIONS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/promotions', async (req, res) => {
  try {
    const { active } = req.query;
    const whereClause = active === 'all' ? '1=1' : 'p.is_active = 1';
    const rows = await query(`
      SELECT p.*, t.name AS tier_name
      FROM promotions p LEFT JOIN membership_tiers t ON p.tier_id = t.id
      WHERE ${whereClause}
      ORDER BY p.id ASC
    `);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/promotions', async (req, res) => {
  try {
    const { code, name, promo_type, value, min_order_value, start_date, end_date, usage_limit } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'Thiếu mã hoặc tên chương trình khuyến mãi' });
    const cleanCode = code.trim().toUpperCase();
    const pType = promo_type || 'PERCENT';
    const pVal = parseFloat(value) || 10;
    const minVal = parseFloat(min_order_value) || 0;
    const sDate = start_date || '2026-01-01';
    const eDate = end_date || '2026-12-31';
    const uLimit = usage_limit ? parseInt(usage_limit) : 500;

    const result = await query(
      `INSERT INTO promotions (name, code, promo_type, value, min_order_value, start_date, end_date, usage_limit, used_count, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
      [name, cleanCode, pType, pVal, minVal, sDate, eDate, uLimit]
    );
    res.status(201).json({ id: result.insertId, code: cleanCode, message: 'Thêm chương trình khuyến mãi thành công' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/promotions/:id/toggle', async (req, res) => {
  try {
    const promoId = parseInt(req.params.id);
    const rows = await query('SELECT id, code, name, is_active FROM promotions WHERE id = ?', [promoId]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy chương trình khuyến mãi' });
    const newState = rows[0].is_active ? 0 : 1;
    await query('UPDATE promotions SET is_active = ? WHERE id = ?', [newState, promoId]);
    res.json({ id: promoId, is_active: newState, message: newState ? `Đã bật khuyến mãi ${rows[0].code}` : `Đã tạm dừng khuyến mãi ${rows[0].code}` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/promotions/validate', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const today = new Date().toISOString().slice(0,10);
    const rows = await query(
      `SELECT * FROM promotions WHERE code = ? AND is_active = 1
       AND start_date <= ? AND end_date >= ?`,
      [String(code || '').toUpperCase(), today, today]
    );
    if (!rows.length) return res.status(404).json({ error: 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn' });
    const promo = rows[0];
    if (subtotal !== undefined && subtotal < promo.min_order_value)
      return res.status(400).json({ error: `Đơn tối thiểu ${Number(promo.min_order_value).toLocaleString('vi-VN')}đ` });
    if (promo.usage_limit && promo.used_count >= promo.usage_limit)
      return res.status(400).json({ error: 'Mã đã hết lượt sử dụng' });
    res.json(promo);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// 6. REWARDS & VOUCHERS (1 ĐIỂM = 400Đ, ÁP DỤNG VOUCHER TẠI QUẦY)
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/rewards', async (req, res) => {
  try {
    const { active } = req.query;
    const today = new Date().toISOString().slice(0,10);
    if (active === 'all') {
      const rows = await query(`
        SELECT r.*, p.name AS product_name
        FROM rewards r LEFT JOIN products p ON r.product_id = p.id
        ORDER BY r.points_cost ASC
      `);
      return res.json(rows);
    }
    const rows = await query(`
      SELECT r.*, p.name AS product_name
      FROM rewards r LEFT JOIN products p ON r.product_id = p.id
      WHERE r.is_active = 1
        AND (r.valid_from IS NULL OR r.valid_from <= ?)
        AND (r.valid_to   IS NULL OR r.valid_to   >= ?)
      ORDER BY r.points_cost ASC
    `, [today, today]);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/rewards/:id/toggle', async (req, res) => {
  try {
    const rId = parseInt(req.params.id);
    const rows = await query('SELECT id, name, is_active FROM rewards WHERE id = ?', [rId]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy ưu đãi' });
    const newState = rows[0].is_active ? 0 : 1;
    await query('UPDATE rewards SET is_active = ? WHERE id = ?', [newState, rId]);
    res.json({ id: rId, is_active: newState, message: newState ? 'Đã bật ưu đãi' : 'Đã tạm ngưng ưu đãi' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Đổi điểm lấy voucher (Tỷ lệ chuẩn: 1 điểm = 400đ)
app.post('/api/rewards/:id/redeem', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { customer_id } = req.body;
    const rewardId = parseInt(req.params.id);

    const [rewards] = await conn.execute('SELECT * FROM rewards WHERE id = ? AND is_active = 1 FOR UPDATE', [rewardId]);
    if (!rewards.length) throw new Error('Ưu đãi không tồn tại hoặc đã ngưng áp dụng');
    const reward = rewards[0];

    const [custs] = await conn.execute('SELECT * FROM customers WHERE id = ? FOR UPDATE', [customer_id]);
    if (!custs.length) throw new Error('Khách hàng không tồn tại');
    const cust = custs[0];

    if (cust.points_balance < reward.points_cost)
      throw new Error(`Không đủ điểm. Cần ${reward.points_cost} điểm, hiện có ${cust.points_balance} điểm`);
    if (reward.stock !== null && reward.stock <= 0)
      throw new Error('Ưu đãi đã hết số lượng trong kho');

    const code = randomCode('UD');
    await conn.execute(
      'INSERT INTO redemptions (customer_id, reward_id, code, points_spent, status, is_used) VALUES (?,?,?,?,?,0)',
      [customer_id, rewardId, code, reward.points_cost, 'ISSUED']
    );
    const newBalance = cust.points_balance - reward.points_cost;
    await conn.execute('UPDATE customers SET points_balance = ? WHERE id = ?', [newBalance, customer_id]);
    if (reward.stock !== null) {
      await conn.execute('UPDATE rewards SET stock = stock - 1 WHERE id = ?', [rewardId]);
    }
    await conn.execute(
      `INSERT INTO point_transactions (customer_id, type, points, balance_after, description)
       VALUES (?,?,?,?,?)`,
      [customer_id, 'REDEEM', -reward.points_cost, newBalance, `Đổi ưu đãi: ${reward.name} (${code})`]
    );

    await conn.commit();
    res.json({
      code,
      reward_id: reward.id,
      reward_name: reward.name,
      reward_value: parseFloat(reward.value),
      points_spent: reward.points_cost,
      new_balance: newBalance,
      message: `Đổi ưu đãi thành công! Mã voucher: ${code}`
    });
  } catch(e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally { conn.release(); }
});

// Endpoint xác thực & áp dụng Voucher tại quầy (POST /api/vouchers/apply)
// Kiểm tra mã UD-XXXX, tính tiền giảm, đổi trạng thái sang Đã sử dụng (USED / is_used = 1)
app.post('/api/vouchers/apply', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { code, voucher_code, subtotal, customer_id, mark_used = true } = req.body;
    const rawCode = String(code || voucher_code || '').trim().toUpperCase();
    if (!rawCode) {
      throw new Error('Vui lòng nhập mã voucher (VD: UD-7K3F9A)');
    }

    const [rows] = await conn.execute(`
      SELECT rd.*, rw.name AS reward_name, rw.reward_type, rw.value AS reward_value,
             c.full_name AS customer_name, c.phone AS customer_phone
      FROM redemptions rd
      JOIN rewards rw ON rd.reward_id = rw.id
      JOIN customers c ON rd.customer_id = c.id
      WHERE rd.code = ?
      FOR UPDATE
    `, [rawCode]);

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ error: `Mã voucher "${rawCode}" không tồn tại trong hệ thống` });
    }

    const voucher = rows[0];
    if (voucher.status === 'USED' || voucher.is_used === 1) {
      await conn.rollback();
      return res.status(400).json({ error: `Mã voucher "${rawCode}" đã được sử dụng trước đó` });
    }
    if (voucher.status === 'CANCELLED') {
      await conn.rollback();
      return res.status(400).json({ error: `Mã voucher "${rawCode}" đã bị hủy` });
    }
    if (customer_id && Number(voucher.customer_id) !== Number(customer_id)) {
      // Cho phép thông báo rõ hoặc áp dụng đúng chủ sở hữu
    }

    const rewardVal = parseFloat(voucher.reward_value) || 0;
    const orderSubtotal = subtotal !== undefined ? parseFloat(subtotal) : rewardVal;
    const discountAmount = subtotal !== undefined ? Math.min(orderSubtotal, rewardVal) : rewardVal;

    // Đổi trạng thái sang Đã sử dụng nếu mark_used = true
    let newStatus = voucher.status;
    if (mark_used !== false) {
      newStatus = 'USED';
      await conn.execute(
        "UPDATE redemptions SET status = 'USED', is_used = 1, used_at = NOW() WHERE id = ?",
        [voucher.id]
      );
    }

    await conn.commit();
    res.json({
      valid: true,
      redemption_id: voucher.id,
      code: voucher.code,
      reward_name: voucher.reward_name,
      reward_type: voucher.reward_type,
      voucher_value: rewardVal,
      discount_amount: discountAmount,
      customer_id: voucher.customer_id,
      customer_name: voucher.customer_name,
      customer_phone: voucher.customer_phone,
      status: newStatus,
      is_used: newStatus === 'USED' ? 1 : 0,
      no_double_dipping_note: 'Áp dụng Voucher đổi điểm sẽ thay thế chiết khấu trực tiếp theo hạng thành viên (No Double-Dipping).',
      message: `Áp dụng thành công mã ${voucher.code} (${voucher.reward_name}: -${discountAmount.toLocaleString('vi-VN')}đ)`
    });
  } catch(e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 7. CUSTOMERS & ĐIỀU CHỈNH ĐIỂM THỦ CÔNG
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/customers', async (req, res) => {
  try {
    const { search, tier } = req.query;
    let sql = `SELECT c.*, c.points_balance AS current_points,
                      t.name AS tier_name, t.discount_percent, t.point_multiplier
               FROM customers c JOIN membership_tiers t ON c.tier_id = t.id WHERE 1=1`;
    const params = [];
    if (search) { sql += ' AND (c.full_name LIKE ? OR c.phone LIKE ? OR c.code LIKE ?)'; const s = `%${search}%`; params.push(s,s,s); }
    if (tier)   { sql += ' AND c.tier_id = ?'; params.push(tier); }
    sql += ' ORDER BY c.id ASC LIMIT 200';
    const rows = await query(sql, params);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/customers/lookup', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Cần nhập số điện thoại' });
    const rows = await query(`
      SELECT c.*, c.points_balance AS current_points,
             t.name AS tier_name, t.discount_percent, t.point_multiplier
      FROM customers c JOIN membership_tiers t ON c.tier_id = t.id
      WHERE c.phone = ?
    `, [phone]);
    if (!rows.length) return res.status(404).json({ error: 'Chưa có tài khoản hội viên với SĐT này' });

    const cust = rows[0];
    const history = await query(
      'SELECT * FROM point_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 15',
      [cust.id]
    );
    const vouchers = await query(
      `SELECT rd.*, rw.name AS reward_name, rw.value
       FROM redemptions rd JOIN rewards rw ON rd.reward_id = rw.id
       WHERE rd.customer_id = ? ORDER BY rd.created_at DESC`,
      [cust.id]
    );
    res.json({ ...cust, history, vouchers });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { full_name, phone, password, email, birthday, gender } = req.body;
    if (!full_name || !phone) return res.status(400).json({ error: 'Họ tên và SĐT là bắt buộc' });
    const rawPass = password || '123456';
    if (String(rawPass).length < 6) return res.status(400).json({ error: 'Mật khẩu phải có tối thiểu 6 ký tự' });

    const exist = await query('SELECT id FROM customers WHERE phone = ?', [phone]);
    if (exist.length) return res.status(409).json({ error: 'SĐT đã được đăng ký hội viên' });

    const count = await query('SELECT COUNT(*) AS cnt FROM customers');
    const code  = `KH${String(count[0].cnt + 1).padStart(4,'0')}`;
    const password_hash = await bcrypt.hash(String(rawPass), 10);

    const result = await query(
      `INSERT INTO customers (tier_id, code, full_name, phone, password_hash, email, birthday, gender, points_balance, lifetime_points)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, 50, 50)`,
      [code, full_name, phone, password_hash, email || null, birthday || null, gender || null]
    );
    const custId = result.insertId;
    await query(
      `INSERT INTO point_transactions (customer_id, type, points, balance_after, description)
       VALUES (?, 'EARN', 50, 50, 'Tặng 50 điểm chào mừng hội viên mới')`,
      [custId]
    );

    res.status(201).json({ id: custId, code, message: 'Đăng ký hội viên thành công! Tặng 50 điểm chào mừng.' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/customers/:id/toggle', async (req, res) => {
  try {
    const custId = parseInt(req.params.id);
    const rows = await query('SELECT id, code, full_name, phone, status FROM customers WHERE id = ?', [custId]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    const newStatus = rows[0].status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await query('UPDATE customers SET status = ? WHERE id = ?', [newStatus, custId]);
    res.json({
      id: custId,
      status: newStatus,
      message: newStatus === 'ACTIVE' ? `Đã kích hoạt tài khoản ${rows[0].full_name}` : `Đã khóa tài khoản ${rows[0].full_name}`
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { full_name, email, birthday, gender, address, status } = req.body;
    const custId = parseInt(req.params.id);
    await query(
      'UPDATE customers SET full_name=?, email=?, birthday=?, gender=?, address=?, status=? WHERE id=?',
      [full_name, email, birthday, gender, address, status, custId]
    );
    res.json({ message: 'Cập nhật khách hàng thành công' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Điều chỉnh điểm thủ công (POST /api/customers/:id/adjust-points)
app.post('/api/customers/:id/adjust-points', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { points, reason, description, created_by } = req.body;
    const delta = parseInt(points);
    if (isNaN(delta) || delta === 0) {
      throw new Error('Số điểm điều chỉnh phải là số nguyên khác 0 (ví dụ: 50 hoặc -30)');
    }
    const adjustReason = (reason || description || 'Admin điều chỉnh điểm thủ công').trim();

    const [custs] = await conn.execute('SELECT * FROM customers WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!custs.length) throw new Error('Khách hàng không tồn tại');
    const cust = custs[0];

    if (delta < 0 && cust.points_balance + delta < 0) {
      throw new Error(`Không thể trừ ${Math.abs(delta)} điểm vì khách chỉ còn ${cust.points_balance} điểm khả dụng`);
    }

    const newBalance = Math.max(0, cust.points_balance + delta);
    const newLifetime = delta > 0 ? cust.lifetime_points + delta : cust.lifetime_points;

    await conn.execute(
      'UPDATE customers SET points_balance = ?, lifetime_points = ? WHERE id = ?',
      [newBalance, newLifetime, cust.id]
    );

    // Tự động xét nâng hạng dựa trên lifetime_points
    let newTierName = null;
    const [tiers] = await conn.execute(
      'SELECT * FROM membership_tiers WHERE min_points <= ? ORDER BY min_points DESC LIMIT 1',
      [newLifetime]
    );
    if (tiers.length && tiers[0].id !== cust.tier_id) {
      await conn.execute('UPDATE customers SET tier_id = ? WHERE id = ?', [tiers[0].id, cust.id]);
      newTierName = tiers[0].name;
    }

    await conn.execute(
      `INSERT INTO point_transactions (customer_id, created_by, type, points, balance_after, description)
       VALUES (?, ?, 'ADJUST', ?, ?, ?)`,
      [cust.id, created_by || 1, delta, newBalance, adjustReason]
    );

    await conn.commit();
    res.json({
      customer_id: cust.id,
      full_name: cust.full_name,
      points_adjusted: delta,
      new_balance: newBalance,
      new_lifetime_points: newLifetime,
      upgraded_tier: newTierName,
      reason: adjustReason,
      message: `Đã ${delta > 0 ? 'cộng +' + delta : 'trừ ' + delta} điểm cho khách hàng ${cust.full_name}. Số dư mới: ${newBalance} điểm.`
    });
  } catch(e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally { conn.release(); }
});

// ════════════════════════════════════════════════════════════════════════════
// 8. ORDERS (HÓA ĐƠN & CHỐNG GIẢM GIÁ KÉP - NO DOUBLE-DIPPING)
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/orders', async (req, res) => {
  try {
    const { limit = 50, channel, customer_id } = req.query;
    let sql = `
      SELECT o.*,
             c.full_name AS customer_name,
             c.phone AS customer_phone,
             t.name AS tier_name,
             COALESCE(o.voucher_code, rd.code) AS applied_voucher_code,
             rw.name AS applied_reward_name,
             pr.code AS applied_promo_code,
             u.full_name AS staff_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN membership_tiers t ON c.tier_id = t.id
      LEFT JOIN redemptions rd ON o.redemption_id = rd.id
      LEFT JOIN rewards rw ON rd.reward_id = rw.id
      LEFT JOIN promotions pr ON o.promotion_id = pr.id
      LEFT JOIN users u ON o.staff_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (channel)     { sql += ' AND o.channel = ?'; params.push(channel); }
    if (customer_id) { sql += ' AND o.customer_id = ?'; params.push(customer_id); }
    sql += ` ORDER BY o.created_at DESC, o.id DESC LIMIT ${parseInt(limit) || 50}`;
    const orders = await query(sql, params);

    if (orders.length) {
      const orderIds = orders.map(o => o.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const allItems = await query(
        `SELECT oi.*, p.name AS product_name, p.image_emoji
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id IN (${placeholders})`,
        orderIds
      );
      const itemsByOrder = {};
      for (const it of allItems) {
        if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
        itemsByOrder[it.order_id].push(it);
      }
      for (const o of orders) {
        o.voucher_code = o.applied_voucher_code || null;
        o.items = itemsByOrder[o.id] || [];
      }
    }

    res.json(orders);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const rows = await query(
      `SELECT o.*, c.full_name AS customer_name, c.phone AS customer_phone,
              COALESCE(o.voucher_code, rd.code) AS applied_voucher_code
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN redemptions rd ON o.redemption_id = rd.id
       WHERE o.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    const order = rows[0];
    const items = await query(
      `SELECT oi.*, p.name AS product_name, p.image_emoji
       FROM order_items oi JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [order.id]
    );
    res.json({ ...order, voucher_code: order.applied_voucher_code || null, items });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Tạo đơn hàng mới (Tuân thủ chuẩn: 10.000đ = 1 điểm & Chống giảm giá kép No Double-Dipping)
app.post('/api/orders', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { customer_id, staff_id, table_id, items, promo_code, reward_code, voucher_code, payment_method, channel } = req.body;
    const inputVoucherCode = (reward_code || voucher_code || '').trim().toUpperCase();

    if (!items || !items.length) throw new Error('Đơn hàng cần ít nhất 1 sản phẩm');

    // 1. Lấy thông tin khách hàng & hạng thành viên
    let cust = null, tierMult = 1.0, tierId = null, tierDiscountPct = 0;
    if (customer_id) {
      const [custs] = await conn.execute(
        `SELECT c.*, t.discount_percent, t.point_multiplier FROM customers c
         JOIN membership_tiers t ON c.tier_id = t.id WHERE c.id = ? FOR UPDATE`,
        [customer_id]
      );
      if (custs.length) {
        cust = custs[0];
        tierMult = parseFloat(cust.point_multiplier) || 1.0;
        tierDiscountPct = parseFloat(cust.discount_percent) || 0;
        tierId = cust.tier_id;
      }
    }

    // 2. Validate số lượng món & tính Subtotal
    let subtotal = 0;
    const itemDetails = [];
    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Số lượng món không hợp lệ (${item.quantity}). Phải lớn hơn 0.`);
      }
      const [prods] = await conn.execute('SELECT * FROM products WHERE id = ?', [item.product_id]);
      if (!prods.length) throw new Error(`Sản phẩm ID ${item.product_id} không tồn tại`);
      const prod = prods[0];
      if (prod.is_active === 0) {
        throw new Error(`Món "${prod.name}" hiện đang tạm ngưng phục vụ.`);
      }
      const lineTotal = parseFloat(prod.price) * qty;
      subtotal += lineTotal;
      itemDetails.push({ ...item, quantity: qty, unit_price: parseFloat(prod.price), line_total: lineTotal });
    }

    // 3. Kiểm tra Voucher đổi điểm (UD-XXXX) & Áp dụng quy tắc CHỐNG GIẢM GIÁ KÉP (No Double-Dipping)
    // Khách hàng CHỈ ĐƯỢC CHỌN 1 trong 2:
    // - Hoặc dùng Voucher đổi điểm (reward_discount > 0, tier_discount = 0)
    // - Hoặc giảm trực tiếp theo Hạng thành viên (tier_discount > 0, reward_discount = 0)
    let rewardDiscount = 0, redemptionId = null, appliedVoucherCode = null;
    if (inputVoucherCode) {
      // Cho phép cả voucher đang ISSUED hoặc vừa được bấm apply tại quầy (chưa gắn vào order nào)
      const [redemps] = await conn.execute(
        `SELECT rd.*, rw.value, rw.reward_type
         FROM redemptions rd
         JOIN rewards rw ON rd.reward_id = rw.id
         LEFT JOIN orders o ON o.redemption_id = rd.id
         WHERE rd.code = ? AND rd.status IN ('ISSUED', 'USED') AND o.id IS NULL
         FOR UPDATE`,
        [inputVoucherCode]
      );
      if (!redemps.length) {
        throw new Error(`Mã voucher "${inputVoucherCode}" không hợp lệ hoặc đã được sử dụng ở hóa đơn khác`);
      }
      const redemp = redemps[0];

      // Ràng buộc bảo mật: Voucher phải thuộc quyền sở hữu của khách hàng (nếu có khách hàng)
      if (cust && Number(redemp.customer_id) !== Number(cust.id)) {
        throw new Error(`Voucher "${inputVoucherCode}" thuộc về khách hàng khác, không thể sử dụng cho đơn hàng này.`);
      }

      rewardDiscount = Math.min(subtotal, parseFloat(redemp.value) || 0);
      redemptionId = redemp.id;
      appliedVoucherCode = redemp.code;
      await conn.execute(
        "UPDATE redemptions SET status = 'USED', is_used = 1, used_at = COALESCE(used_at, NOW()) WHERE id = ?",
        [redemp.id]
      );
    }

    // Nếu đã dùng Voucher đổi điểm thì KHÔNG giảm giá theo hạng thành viên (No Double-Dipping)
    const tierDiscount = (appliedVoucherCode)
      ? 0
      : (cust ? Math.round(subtotal * (tierDiscountPct / 100)) : 0);

    // 4. Giảm khuyến mãi chiến dịch (nếu có)
    let promoDiscount = 0, promoMult = 1.0, promotionId = null;
    if (promo_code) {
      const today = new Date().toISOString().slice(0,10);
      const [promos] = await conn.execute(
        `SELECT * FROM promotions WHERE code = ? AND is_active = 1 AND start_date <= ? AND end_date >= ?`,
        [promo_code.toUpperCase(), today, today]
      );
      if (promos.length) {
        const promo = promos[0];
        if (subtotal >= promo.min_order_value) {
          promotionId = promo.id;
          const afterBaseDiscount = Math.max(0, subtotal - tierDiscount - rewardDiscount);
          if (promo.promo_type === 'PERCENT')               promoDiscount = Math.round(afterBaseDiscount * (parseFloat(promo.value) / 100));
          else if (promo.promo_type === 'AMOUNT')            promoDiscount = parseFloat(promo.value);
          else if (promo.promo_type === 'POINT_MULTIPLIER') promoMult = parseFloat(promo.value);
          await conn.execute('UPDATE promotions SET used_count = used_count + 1 WHERE id = ?', [promo.id]);
        }
      }
    }

    // 5. Số tiền thực trả cuối cùng & Tích điểm theo hạng (10.000đ = 1 điểm * hệ số)
    const total = Math.max(0, subtotal - tierDiscount - promoDiscount - rewardDiscount);
    const effectiveMult = Math.max(tierMult, promoMult);
    const pointsEarned  = cust ? Math.round(Math.floor(total / 10000) * effectiveMult) : 0;

    // 6. Sinh mã hóa đơn an toàn tuyệt đối chống Race Condition (Timestamp + Random)
    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `HD${todayStr()}-${Date.now().toString().slice(-4)}${randSuffix}`;

    const [orderResult] = await conn.execute(
      `INSERT INTO orders (customer_id, staff_id, table_id, promotion_id, redemption_id, voucher_code, code, subtotal, tier_discount, promo_discount, reward_discount, total, points_earned, payment_method, channel)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [customer_id || null, staff_id || null, table_id || null, promotionId, redemptionId, appliedVoucherCode, code,
       subtotal, tierDiscount, promoDiscount, rewardDiscount, total, pointsEarned,
       payment_method || 'CASH', channel || 'POS']
    );
    const orderId = orderResult.insertId;

    for (const item of itemDetails) {
      await conn.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total) VALUES (?,?,?,?,?)',
        [orderId, item.product_id, item.quantity, item.unit_price, item.line_total]
      );
    }

    // 7. Giải phóng bàn nếu đơn hàng gắn với bàn tại quán
    if (table_id) {
      await conn.execute('UPDATE dining_tables SET status = "AVAILABLE" WHERE id = ?', [table_id]);
    }

    // 8. Cộng điểm & tự động xét nâng hạng cho khách hàng
    if (cust && pointsEarned > 0) {
      const newBalance  = cust.points_balance + pointsEarned;
      const newLifetime = cust.lifetime_points + pointsEarned;

      await conn.execute(
        'UPDATE customers SET points_balance=?, lifetime_points=? WHERE id=?',
        [newBalance, newLifetime, cust.id]
      );

      const [newTiers] = await conn.execute(
        'SELECT * FROM membership_tiers WHERE min_points <= ? ORDER BY min_points DESC LIMIT 1',
        [newLifetime]
      );
      if (newTiers.length && newTiers[0].id !== tierId) {
        await conn.execute('UPDATE customers SET tier_id=? WHERE id=?', [newTiers[0].id, cust.id]);
      }

      const descNote = appliedVoucherCode
        ? `Tích điểm đơn hàng ${code} (Dùng voucher ${appliedVoucherCode})`
        : `Tích điểm đơn hàng ${code}`;
      await conn.execute(
        `INSERT INTO point_transactions (customer_id, order_id, created_by, type, points, balance_after, description)
         VALUES (?,?,?,'EARN',?,?,?)`,
        [cust.id, orderId, staff_id || null, pointsEarned, newBalance, descNote]
      );
    }

    await conn.commit();
    res.status(201).json({
      id: orderId,
      code,
      subtotal,
      tier_discount: tierDiscount,
      promo_discount: promoDiscount,
      reward_discount: rewardDiscount,
      voucher_code: appliedVoucherCode,
      total,
      points_earned: pointsEarned,
      message: `Đơn hàng ${code} đã được tạo thành công!`
    });
  } catch(e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally { conn.release(); }
});

// ════════════════════════════════════════════════════════════════════════════
// 9. REPORTS & DASHBOARD (GET /api/reports/dashboard & GET /api/dashboard)
// ════════════════════════════════════════════════════════════════════════════
async function buildDashboardAndReportData() {
  const today = new Date().toISOString().slice(0,10);

  const [totalCustomers] = await query("SELECT COUNT(*) AS cnt FROM customers WHERE status='ACTIVE'");
  const [todayOrders]    = await query("SELECT COUNT(*) AS cnt, COALESCE(SUM(total),0) AS revenue FROM orders WHERE DATE(created_at)=? AND status='COMPLETED'", [today]);

  // 4 Chỉ số tổng hợp cho Báo cáo Doanh thu & Điểm:
  // 1. Tổng doanh thu (total_revenue)
  // 2. Tổng điểm đã phát hành (total_points_issued)
  // 3. Tổng điểm đã đổi quà (total_points_redeemed)
  // 4. Tổng tiền đã giảm giá qua Loyalty (total_loyalty_discount)
  const [orderSummary] = await query(`
    SELECT
      COUNT(*) AS total_orders,
      COALESCE(SUM(subtotal), 0) AS total_gross,
      COALESCE(SUM(total), 0) AS total_revenue,
      COALESCE(SUM(tier_discount + reward_discount + promo_discount), 0) AS total_loyalty_discount,
      COALESCE(SUM(tier_discount), 0) AS total_tier_discount,
      COALESCE(SUM(reward_discount), 0) AS total_voucher_discount,
      COALESCE(SUM(promo_discount), 0) AS total_promo_discount,
      COALESCE(SUM(points_earned), 0) AS orders_points_earned
    FROM orders
    WHERE status = 'COMPLETED'
  `);

  const [earnSummary]   = await query("SELECT COALESCE(SUM(points),0) AS issued FROM point_transactions WHERE points > 0 AND type IN ('EARN','ADJUST')");
  const [redeemSummary] = await query("SELECT COALESCE(SUM(points_spent),0) AS redeemed FROM redemptions WHERE status IN ('ISSUED','USED')");

  const totalPointsIssued   = Math.max(Number(earnSummary.issued), Number(orderSummary.orders_points_earned));
  const totalPointsRedeemed = Number(redeemSummary.redeemed);

  const tierDist = await query(`
    SELECT t.id, t.name AS tier_name, COUNT(c.id) AS count
    FROM membership_tiers t
    LEFT JOIN customers c ON t.id = c.tier_id AND c.status = 'ACTIVE'
    GROUP BY t.id, t.name
    ORDER BY t.min_points
  `);

  // Bảng kê doanh thu theo ngày gần nhất
  const dailyRevenue = await query(`
    SELECT
      DATE_FORMAT(DATE(created_at), '%Y-%m-%d') AS date,
      COUNT(*) AS orders,
      COALESCE(SUM(subtotal), 0) AS gross_sales,
      COALESCE(SUM(tier_discount + reward_discount + promo_discount), 0) AS discounts,
      COALESCE(SUM(total), 0) AS revenue,
      COALESCE(SUM(points_earned), 0) AS points_issued
    FROM orders
    WHERE status = 'COMPLETED'
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) DESC
    LIMIT 14
  `);

  // Top 5 sản phẩm bán chạy
  const topProducts = await query(`
    SELECT p.name, p.image_emoji, c.name AS category_name,
           SUM(oi.quantity) AS total_qty, SUM(oi.line_total) AS revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN product_categories c ON p.category_id = c.id
    GROUP BY p.id, p.name, p.image_emoji, c.name
    ORDER BY total_qty DESC
    LIMIT 5
  `);

  return {
    // 4 chỉ số chuẩn cho Báo cáo Doanh thu & Điểm
    total_revenue          : Number(orderSummary.total_revenue),
    total_points_issued    : totalPointsIssued,
    total_points_redeemed  : totalPointsRedeemed,
    total_loyalty_discount : Number(orderSummary.total_loyalty_discount),
    // Chi tiết giảm giá
    total_tier_discount    : Number(orderSummary.total_tier_discount),
    total_voucher_discount : Number(orderSummary.total_voucher_discount),
    total_promo_discount   : Number(orderSummary.total_promo_discount),
    // Tương thích với Dashboard tổng quan
    total_customers        : Number(totalCustomers.cnt),
    today_orders           : Number(todayOrders.cnt),
    today_revenue          : Number(todayOrders.revenue),
    total_points           : totalPointsIssued,
    tier_distribution      : tierDist,
    daily_revenue          : dailyRevenue,
    revenue_7days          : dailyRevenue.slice(0, 7),
    top_products           : topProducts
  };
}

app.get('/api/reports/dashboard', async (req, res) => {
  try {
    const data = await buildDashboardAndReportData();
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const data = await buildDashboardAndReportData();
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reports/revenue', async (req, res) => {
  try {
    const { from, to } = req.query;
    const rows = await query(`
      SELECT DATE_FORMAT(DATE(created_at), '%Y-%m-%d') AS date,
        COUNT(*) AS total_orders,
        SUM(subtotal) AS gross,
        SUM(total) AS net,
        SUM(tier_discount + promo_discount + reward_discount) AS discounts,
        SUM(points_earned) AS points_issued
      FROM orders WHERE status='COMPLETED'
        AND (? IS NULL OR DATE(created_at) >= ?)
        AND (? IS NULL OR DATE(created_at) <= ?)
      GROUP BY DATE(created_at) ORDER BY DATE(created_at) DESC
    `, [from || null, from || null, to || null, to || null]);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// 10. REDEMPTIONS / CUSTOMER VOUCHERS (KHO VOUCHER)
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/redemptions', async (req, res) => {
  try {
    const { customer_id, status } = req.query;
    let sql = `SELECT rd.*, rw.name AS reward_name, rw.value AS discount_value,
                      c.full_name AS customer_name, c.phone AS customer_phone
               FROM redemptions rd
               JOIN rewards rw ON rd.reward_id = rw.id
               LEFT JOIN customers c ON rd.customer_id = c.id
               WHERE 1=1`;
    const params = [];
    if (customer_id) { sql += ' AND rd.customer_id = ?'; params.push(customer_id); }
    if (status)      { sql += ' AND rd.status = ?'; params.push(status); }
    sql += ' ORDER BY rd.created_at DESC LIMIT 100';
    const rows = await query(sql, params);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// 11. QUẢN LÝ SƠ ĐỒ BÀN & ĐẶT BÀN (TABLES & RESERVATIONS)
// ════════════════════════════════════════════════════════════════════════════
// Lấy danh sách bàn kèm thống kê theo khu vực
app.get('/api/tables', async (req, res) => {
  try {
    const { area, status } = req.query;
    let sql = 'SELECT * FROM dining_tables WHERE is_active = 1';
    const params = [];
    if (area)   { sql += ' AND area = ?'; params.push(area); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY area ASC, id ASC';
    const tables = await query(sql, params);

    const stats = {
      total: tables.length,
      available: tables.filter(t => t.status === 'AVAILABLE').length,
      occupied: tables.filter(t => t.status === 'OCCUPIED').length,
      reserved: tables.filter(t => t.status === 'RESERVED').length
    };

    res.json({ tables, stats });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Thêm bàn mới
app.post('/api/tables', async (req, res) => {
  try {
    const { table_number, name, area, capacity } = req.body;
    if (!table_number || !name) {
      return res.status(400).json({ error: 'Mã bàn và tên bàn là bắt buộc' });
    }
    const result = await query(
      'INSERT INTO dining_tables (table_number, name, area, capacity, status) VALUES (?,?,?,?, "AVAILABLE")',
      [table_number.trim().toUpperCase(), name.trim(), area || 'INDOOR', parseInt(capacity) || 4]
    );
    res.status(201).json({ id: result.insertId, message: 'Thêm bàn mới thành công' });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// Cập nhật trạng thái bàn nhanh
app.patch('/api/tables/:id/status', async (req, res) => {
  try {
    const tableId = parseInt(req.params.id);
    const { status } = req.body;
    if (!['AVAILABLE', 'OCCUPIED', 'RESERVED'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái bàn không hợp lệ (AVAILABLE, OCCUPIED, RESERVED)' });
    }
    await query('UPDATE dining_tables SET status = ? WHERE id = ?', [status, tableId]);
    res.json({ id: tableId, status, message: `Đã cập nhật trạng thái bàn sang ${status}` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Lấy danh sách phiếu đặt bàn
app.get('/api/reservations', async (req, res) => {
  try {
    const { status, date, search } = req.query;
    let sql = `
      SELECT r.*, t.table_number, t.name AS table_name, t.area AS table_area,
             c.code AS customer_code, c.lifetime_points, mt.name AS customer_tier
      FROM reservations r
      LEFT JOIN dining_tables t ON r.table_id = t.id
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN membership_tiers mt ON c.tier_id = mt.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { sql += ' AND r.status = ?'; params.push(status); }
    if (date)   { sql += ' AND r.reservation_date = ?'; params.push(date); }
    if (search) {
      sql += ' AND (r.customer_name LIKE ? OR r.phone LIKE ? OR r.code LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    sql += ' ORDER BY r.reservation_date DESC, r.reservation_time ASC LIMIT 100';
    const rows = await query(sql, params);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Khách hàng hoặc Lễ tân tạo phiếu đặt bàn mới
app.post('/api/reservations', async (req, res) => {
  try {
    const { customer_id, customer_name, phone, table_id, party_size, reservation_date, reservation_time, area_preference, special_requests } = req.body;
    if (!customer_name || !phone || !reservation_date || !reservation_time) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ họ tên, SĐT, ngày và giờ đặt bàn' });
    }

    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `DB${reservation_date.replace(/-/g,'')}-${rand}`;

    const result = await query(`
      INSERT INTO reservations (code, customer_id, customer_name, phone, table_id, party_size, reservation_date, reservation_time, area_preference, special_requests, status)
      VALUES (?,?,?,?,?,?,?,?,?,?, 'PENDING')
    `, [
      code,
      customer_id || null,
      customer_name.trim(),
      phone.trim(),
      table_id || null,
      parseInt(party_size) || 2,
      reservation_date,
      reservation_time,
      area_preference || 'INDOOR',
      special_requests ? special_requests.trim() : null
    ]);

    // Nếu đã gán bàn cụ thể thì chuyển trạng thái bàn sang RESERVED
    if (table_id) {
      await query('UPDATE dining_tables SET status = "RESERVED" WHERE id = ?', [table_id]);
    }

    res.status(201).json({
      id: result.insertId,
      code,
      message: `Đặt bàn thành công! Mã phiếu: ${code}. caPHEnue sẽ liên hệ xác nhận sớm nhất.`
    });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// Cập nhật trạng thái phiếu đặt bàn (Duyệt CONFIRMED, Nhận khách CHECKED_IN, Hủy CANCELLED, Hoàn tất COMPLETED)
app.patch('/api/reservations/:id/status', async (req, res) => {
  try {
    const resId = parseInt(req.params.id);
    const { status, table_id } = req.body;
    if (!['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái phiếu đặt không hợp lệ' });
    }

    const existing = await query('SELECT * FROM reservations WHERE id = ?', [resId]);
    if (!existing.length) return res.status(404).json({ error: 'Không tìm thấy phiếu đặt bàn' });
    const currentRes = existing[0];
    const targetTableId = table_id || currentRes.table_id;

    await query('UPDATE reservations SET status = ?, table_id = ? WHERE id = ?', [status, targetTableId || null, resId]);

    // Cập nhật sơ đồ bàn thời gian thực
    if (targetTableId) {
      if (status === 'CONFIRMED') {
        await query('UPDATE dining_tables SET status = "RESERVED" WHERE id = ?', [targetTableId]);
      } else if (status === 'CHECKED_IN') {
        await query('UPDATE dining_tables SET status = "OCCUPIED" WHERE id = ?', [targetTableId]);
      } else if (status === 'CANCELLED' || status === 'COMPLETED') {
        await query('UPDATE dining_tables SET status = "AVAILABLE" WHERE id = ?', [targetTableId]);
      }
    }

    res.json({ id: resId, status, message: `Đã cập nhật trạng thái phiếu ${currentRes.code} sang ${status}` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// 12. HRM - QUẢN LÝ NHÂN SỰ, CHẤM CÔNG & TIỀN LƯƠNG (CHUẨN BLLĐ 2019)
// ════════════════════════════════════════════════════════════════════════════
const REGION_I_MIN_HOURLY_WAGE = 23800; // Nghị định 74/2024/NĐ-CP: Vùng I tối thiểu 23.800 đ/giờ

// 1. Danh sách nhân viên
app.get('/api/staff', async (req, res) => {
  try {
    const { status, position } = req.query;
    let sql = 'SELECT * FROM staff_members WHERE 1=1';
    const params = [];
    if (status && status !== 'ALL') { sql += ' AND status = ?'; params.push(status); }
    if (position && position !== 'ALL') { sql += ' AND position = ?'; params.push(position); }
    sql += ' ORDER BY id ASC';
    const rows = await query(sql, params);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// 2. Thêm mới nhân viên kèm thẩm định Lương tối thiểu vùng
app.post('/api/staff', async (req, res) => {
  try {
    const { code, full_name, phone, citizen_id, gender, birthday, position, employment_type, hourly_rate, bank_account, bank_name, start_date, contract_duration } = req.body;
    if (!full_name || !phone || !citizen_id) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ Họ tên, Số điện thoại và CCCD' });
    }
    const rate = parseFloat(hourly_rate);
    if (isNaN(rate) || rate < REGION_I_MIN_HOURLY_WAGE) {
      return res.status(400).json({
        error: `Mức lương giờ ${rate ? rate.toLocaleString('vi-VN') : 0}đ vi phạm mức lương tối thiểu vùng I (${REGION_I_MIN_HOURLY_WAGE.toLocaleString('vi-VN')} đ/giờ) theo Nghị định 74/2024/NĐ-CP!`
      });
    }
    const empCode = code ? code.trim().toUpperCase() : `NV${Date.now().toString().slice(-4)}`;
    const [result] = await pool.execute(
      `INSERT INTO staff_members (code, full_name, phone, citizen_id, gender, birthday, position, employment_type, hourly_rate, bank_account, bank_name, start_date, contract_duration, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'ACTIVE')`,
      [empCode, full_name, phone, citizen_id, gender || 'Nam', birthday || null, position || 'SERVER', employment_type || 'PART_TIME', rate, bank_account || null, bank_name || null, start_date || todayStr(), contract_duration || '6 tháng']
    );
    res.status(201).json({ id: result.insertId, code: empCode, message: 'Thêm nhân viên thành công, tuân thủ Bộ luật Lao động!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// 3. Cập nhật thông tin nhân viên
app.put('/api/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, citizen_id, gender, birthday, position, employment_type, hourly_rate, bank_account, bank_name, start_date, contract_duration, status } = req.body;
    const rate = parseFloat(hourly_rate);
    if (isNaN(rate) || rate < REGION_I_MIN_HOURLY_WAGE) {
      return res.status(400).json({
        error: `Mức lương giờ vi phạm mức lương tối thiểu vùng I (${REGION_I_MIN_HOURLY_WAGE.toLocaleString('vi-VN')} đ/giờ) theo Nghị định 74/2024/NĐ-CP!`
      });
    }
    await pool.execute(
      `UPDATE staff_members SET full_name=?, phone=?, citizen_id=?, gender=?, birthday=?, position=?, employment_type=?, hourly_rate=?, bank_account=?, bank_name=?, start_date=?, contract_duration=?, status=?
       WHERE id=?`,
      [full_name, phone, citizen_id, gender || 'Nam', birthday || null, position || 'SERVER', employment_type || 'PART_TIME', rate, bank_account || null, bank_name || null, start_date || todayStr(), contract_duration || '6 tháng', status || 'ACTIVE', id]
    );
    res.json({ id, message: 'Cập nhật hồ sơ nhân viên thành công' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// 4. Lấy danh sách chấm công (hỗ trợ lọc theo Ngày, Ca Sáng/Tối, và Trạng thái ca)
app.get('/api/staff/timesheets', async (req, res) => {
  try {
    const { date, staff_id, shift_type, status } = req.query;
    let sql = `SELECT t.*, s.full_name AS staff_name, s.code AS staff_code, s.position, s.hourly_rate
               FROM staff_timesheets t JOIN staff_members s ON t.staff_id = s.id
               WHERE 1=1`;
    const params = [];
    if (date && date !== 'ALL') { sql += ' AND t.work_date = ?'; params.push(date); }
    if (staff_id && staff_id !== 'ALL') { sql += ' AND t.staff_id = ?'; params.push(staff_id); }
    if (shift_type && shift_type !== 'ALL') { sql += ' AND t.shift_type = ?'; params.push(shift_type); }
    if (status && status !== 'ALL') { sql += ' AND t.status = ?'; params.push(status); }
    sql += ' ORDER BY t.check_in ASC LIMIT 150';
    const rows = await query(sql, params);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// 5. Chấm công vào ca (Check-in)
app.post('/api/staff/timesheets/checkin', async (req, res) => {
  try {
    const { staff_id, shift_type, note } = req.body;
    if (!staff_id) return res.status(400).json({ error: 'Vui lòng chọn nhân viên' });
    const now = new Date();
    const workDate = now.toISOString().slice(0, 10);
    const [result] = await pool.execute(
      `INSERT INTO staff_timesheets (staff_id, work_date, shift_type, check_in, status, note)
       VALUES (?, ?, ?, ?, 'WORKING', ?)`,
      [staff_id, workDate, shift_type || 'CUSTOM', now, note || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Chấm công vào ca thành công!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// 6. Chấm công kết thúc ca (Check-out) - Tự động tính giờ công & giờ làm đêm (+30%)
app.post('/api/staff/timesheets/:id/checkout', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM staff_timesheets WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Không tìm thấy ca làm việc' });
    const ts = existing[0];
    if (ts.status === 'COMPLETED') return res.status(400).json({ error: 'Ca làm này đã được kết thúc trước đó' });

    const checkInTime = new Date(ts.check_in);
    const checkOutTime = new Date();
    const diffHours = Math.max(0.1, (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60));
    const totalHours = Math.round(diffHours * 10) / 10;

    // Tính giờ làm đêm (từ 22:00 đến 06:00 theo Điều 98 BLLĐ 2019)
    let nightHours = 0;
    const inHour = checkInTime.getHours();
    const outHour = checkOutTime.getHours();
    if (outHour >= 22 || inHour >= 22 || outHour < 6) {
      nightHours = Math.min(totalHours, Math.round(((checkOutTime.getTime() - Math.max(checkInTime.getTime(), new Date(checkInTime).setHours(22,0,0,0))) / (1000 * 60 * 60)) * 10) / 10);
      if (nightHours < 0) nightHours = 0;
    }

    const overtimeHours = totalHours > 8 ? Math.round((totalHours - 8) * 10) / 10 : 0;

    await pool.execute(
      `UPDATE staff_timesheets SET check_out = ?, total_hours = ?, night_hours = ?, overtime_hours = ?, status = 'COMPLETED'
       WHERE id = ?`,
      [checkOutTime, totalHours, nightHours, overtimeHours, id]
    );

    res.json({
      id,
      total_hours: totalHours,
      night_hours: nightHours,
      overtime_hours: overtimeHours,
      message: `Đã kết thúc ca: ${totalHours} giờ làm việc (Có ${nightHours}h ca đêm hưởng +30%)`
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// 7. Lấy bảng lương tháng
app.get('/api/staff/payrolls', async (req, res) => {
  try {
    const monthYear = req.query.month_year || new Date().toISOString().slice(0, 7);
    const rows = await query(
      `SELECT p.*, s.full_name AS staff_name, s.code AS staff_code, s.position, s.employment_type, s.bank_account, s.bank_name
       FROM staff_payrolls p JOIN staff_members s ON p.staff_id = s.id
       WHERE p.month_year = ?
       ORDER BY s.id ASC`,
      [monthYear]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// 8. Tính lương tự động cho toàn bộ nhân sự theo chuẩn Bộ luật Lao động 2019
app.post('/api/staff/payrolls/calculate', async (req, res) => {
  try {
    const monthYear = req.body.month_year || new Date().toISOString().slice(0, 7);
    const staffList = await query('SELECT * FROM staff_members WHERE status = "ACTIVE"');

    const results = [];
    for (const staff of staffList) {
      // Tổng hợp giờ làm trong tháng
      const [tsStats] = await query(
        `SELECT
           COALESCE(SUM(total_hours), 0) AS total_hours,
           COALESCE(SUM(night_hours), 0) AS night_hours,
           COALESCE(SUM(overtime_hours), 0) AS overtime_hours
         FROM staff_timesheets
         WHERE staff_id = ? AND work_date LIKE ? AND status = 'COMPLETED'`,
        [staff.id, `${monthYear}%`]
      );

      const totalHours    = parseFloat(tsStats.total_hours) || 0;
      const nightHours    = parseFloat(tsStats.night_hours) || 0;
      const overtimeHours = parseFloat(tsStats.overtime_hours) || 0;
      const rate          = parseFloat(staff.hourly_rate);

      // Công thức tính lương chuẩn BLLĐ 2019:
      // 1. Lương giờ thường
      const basePay = Math.round(totalHours * rate);
      // 2. Phụ cấp ca đêm (+30% theo Điều 98 BLLĐ)
      const nightPay = Math.round(nightHours * rate * 0.30);
      // 3. Làm thêm giờ (+150% theo Điều 98 BLLĐ)
      const overtimePay = Math.round(overtimeHours * rate * 1.50);
      // 4. Phụ cấp BHXH Part-time (+21.5% theo Khoản 3 Điều 168 BLLĐ 2019)
      const insuranceAllowance = staff.employment_type === 'PART_TIME' ? Math.round(basePay * 0.215) : 0;
      // 5. Thưởng mặc định (nếu có chuyên cần)
      const bonus = totalHours >= 80 ? 200000 : 0;
      const deduction = 0;
      // 6. Lương thực nhận
      const netSalary = basePay + nightPay + overtimePay + insuranceAllowance + bonus - deduction;

      await pool.execute(
        `INSERT INTO staff_payrolls (staff_id, month_year, total_regular_hours, total_night_hours, total_overtime_hours, hourly_rate, base_pay, night_pay, overtime_pay, insurance_allowance, bonus, deduction, net_salary, payment_status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'PENDING')
         ON DUPLICATE KEY UPDATE
           total_regular_hours = VALUES(total_regular_hours),
           total_night_hours = VALUES(total_night_hours),
           total_overtime_hours = VALUES(total_overtime_hours),
           hourly_rate = VALUES(hourly_rate),
           base_pay = VALUES(base_pay),
           night_pay = VALUES(night_pay),
           overtime_pay = VALUES(overtime_pay),
           insurance_allowance = VALUES(insurance_allowance),
           bonus = VALUES(bonus),
           deduction = VALUES(deduction),
           net_salary = VALUES(net_salary)`,
        [staff.id, monthYear, totalHours, nightHours, overtimeHours, rate, basePay, nightPay, overtimePay, insuranceAllowance, bonus, deduction, netSalary]
      );

      results.push({
        staff_code: staff.code,
        staff_name: staff.full_name,
        total_hours: totalHours,
        night_hours: nightHours,
        base_pay: basePay,
        night_pay: nightPay,
        insurance_allowance: insuranceAllowance,
        net_salary: netSalary
      });
    }

    res.json({ month_year: monthYear, processed: results.length, data: results, message: `Đã tính lương tháng ${monthYear} cho ${results.length} nhân viên chuẩn BLLĐ!` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// 9. Xác nhận chi trả lương cho nhân viên
app.patch('/api/staff/payrolls/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('UPDATE staff_payrolls SET payment_status = "PAID", paid_at = NOW() WHERE id = ?', [id]);
    res.json({ id, status: 'PAID', message: 'Đã xác nhận thanh toán lương cho nhân viên!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// START SERVER
// ════════════════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n🌸 caPHEnue Backend API đang chạy tại http://localhost:${PORT}`);
  console.log(`📌 Các API trọng tâm:`);
  console.log(`   GET  /api/ping                        – Health check`);
  console.log(`   POST /api/auth/admin                  – Đăng nhập Admin / Thu ngân`);
  console.log(`   GET  /api/users                       – Danh sách nhân viên`);
  console.log(`   PUT  /api/users/:id/password          – Đổi mật khẩu nhân viên`);
  console.log(`   POST /api/vouchers/apply              – Xác thực & áp dụng Voucher UD-XXXX tại quầy`);
  console.log(`   POST /api/customers/:id/adjust-points – Điều chỉnh điểm thủ công kèm lý do`);
  console.log(`   GET  /api/orders                      – Danh sách hóa đơn đầy đủ chi tiết`);
  console.log(`   POST /api/orders                      – Tạo đơn hàng (Chống giảm giá kép)`);
  console.log(`   GET  /api/reports/dashboard           – Báo cáo tổng hợp 4 chỉ số & doanh thu ngày\n`);
});
