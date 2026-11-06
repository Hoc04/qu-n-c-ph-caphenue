/**
 * caPHEnue - Admin Portal Logic (Backend)
 * Trang admin.html - Quản trị hệ thống & POS bán hàng tại quầy
 */

const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api'
  : '/api';

// ── STATE ────────────────────────────────────────────────────────────────────
let adminUser     = null;
let adminProducts = [];
let adminCart     = [];
let adminPromo    = null;
let adminReward   = null;
let adminCustPOS  = null;

// ── HELPERS ──────────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  if (typeof opts === 'string') {
    opts = { method: opts };
  }
  const token = localStorage.getItem('admin_token') || '';
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': 'caphenue_api_key_2026',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(opts.headers || {})
  };
  const res = await fetch(API + path, { ...opts, headers });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Phản hồi không hợp lệ (${res.status}): ${text.slice(0, 100)}`);
  }
  if (!res.ok) throw new Error(data.error || ('Lỗi ' + res.status));
  return data;
}

function fmt(n) { return Number(n).toLocaleString('vi-VN'); }

function showMsg(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast-notification ' + type;
  t.innerHTML = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function closeReceiptModal() {
  document.getElementById('receipt-modal').classList.add('hidden');
}

// ── LOGIN ────────────────────────────────────────────────────────────────────
async function handleAdminLoginPage(e) {
  e.preventDefault();
  const username = document.getElementById('admin-user-input').value.trim();
  const password = document.getElementById('admin-pass-input').value.trim();
  const errEl    = document.getElementById('login-error');

  try {
    const result = await api('/auth/admin', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    adminUser = result.user;
    localStorage.setItem('admin_token', result.token);
    localStorage.setItem('admin_user', JSON.stringify(result.user));

    // Ẩn login, hiện admin layout
    document.getElementById('admin-login-screen').classList.add('hidden');
    document.getElementById('admin-app-layout').classList.remove('hidden');

    document.getElementById('current-user-name').textContent = adminUser.full_name;
    document.getElementById('current-user-role').textContent = adminUser.role;
    document.getElementById('current-user-avatar').textContent = adminUser.role === 'ADMIN' ? 'AD' : 'ST';

    errEl.classList.add('hidden');
    showMsg('🌸 Đăng nhập thành công! Xin chào ' + adminUser.full_name);

    loadAllData();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

function handleAdminLogout() {
  adminUser = null;
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  document.getElementById('admin-login-screen').classList.remove('hidden');
  document.getElementById('admin-app-layout').classList.add('hidden');
}

// ── TAB NAVIGATION ───────────────────────────────────────────────────────────
function openAdminTab(name) {
  document.querySelectorAll('.sidebar-menu .menu-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(el => el.classList.remove('active'));

  const btn = document.getElementById('tab-' + name);
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('admin-tab-' + name);
  if (panel) panel.classList.add('active');

  if (name === 'tables')     loadAdminTables();
  if (name === 'dashboard')  loadDashboard();
  if (name === 'customers')  loadCustomers();
  if (name === 'orders')     loadOrders();
  if (name === 'products')   loadProducts();
  if (name === 'tiers')      loadTiers();
  if (name === 'rewards')    loadRewards();
  if (name === 'promos')     loadPromos();
  if (name === 'users')      loadUsers();
  if (name === 'reports')    loadReports();
  if (name === 'pos')        loadPosTableDropdown();
  if (name === 'staff')      loadStaffManagement();
}

// ── LOAD ALL DATA ────────────────────────────────────────────────────────────
async function loadAllData() {
  try {
    adminProducts = await api('/products');
    renderPOSProducts();
    loadDashboard();
    loadPosTableDropdown();
    syncAdminUserFromDB();
  } catch (e) {
    console.error('loadAllData:', e);
  }
}

// ── POS BÁN HÀNG TẠI QUẦY ────────────────────────────────────────────────────
function renderPOSProducts(filter = 'ALL', keyword = '') {
  const container = document.getElementById('pos-products-list');
  const catFilter = document.getElementById('pos-category-filter');
  if (!container) return;

  // Category pills
  const cats = [...new Set(adminProducts.map(p => p.category_name))];
  catFilter.innerHTML = `<button class="pill ${filter === 'ALL' ? 'active' : ''}" onclick="renderPOSProducts('ALL')">Tất cả</button>`
    + cats.map(c => `<button class="pill ${filter === c ? 'active' : ''}" onclick="renderPOSProducts('${c}')">${c}</button>`).join('');

  const kw = keyword.toLowerCase();
  const filtered = adminProducts.filter(p => {
    const matchCat = (filter === 'ALL' || p.category_name === filter);
    const matchKw  = !kw || p.name.toLowerCase().includes(kw);
    return matchCat && matchKw && p.is_active;
  });

  container.innerHTML = filtered.map(p => `
    <div class="pos-product-card" onclick="posAddToCart(${p.id})">
      <div class="pos-prod-img-box">
        <img src="${p.image_url || 'images/products/caphe_suada.jpg'}" alt="${p.name}" class="pos-prod-img" loading="lazy" decoding="async" width="500" height="500" onerror="this.onerror=null;this.src='images/logo_hoa_dao.png'">
      </div>
      <div class="pos-prod-info">
        <div class="pos-prod-name">${p.name}</div>
        <div class="pos-prod-price">${fmt(p.price)} đ</div>
      </div>
    </div>
  `).join('') || '<p class="text-muted" style="padding:20px;">Không tìm thấy sản phẩm phù hợp</p>';
}

function searchPosProducts(kw) {
  renderPOSProducts('ALL', kw);
}

function posAddToCart(id) {
  const prod = adminProducts.find(p => p.id === id);
  if (!prod) return;
  const existing = adminCart.find(i => i.id === id);
  if (existing) existing.qty++;
  else adminCart.push({ id: prod.id, name: prod.name, price: parseFloat(prod.price), qty: 1 });
  updatePOSBill();
}

function posChangeQty(id, delta) {
  const item = adminCart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) adminCart = adminCart.filter(i => i.id !== id);
  updatePOSBill();
}

function posClearCart() {
  adminCart = [];
  adminPromo = null;
  adminReward = null;
  adminCustPOS = null;
  document.getElementById('pos-cust-phone').value = '';
  document.getElementById('pos-cust-info').style.display = 'none';
  document.getElementById('pos-promo-code').value = '';
  document.getElementById('pos-reward-code').value = '';
  const btnRemove = document.getElementById('btn-remove-voucher');
  if (btnRemove) btnRemove.style.display = 'none';
  updatePOSBill();
}

async function posLookupCustomer() {
  const phone = document.getElementById('pos-cust-phone').value.trim();
  if (!phone) return;
  try {
    const c = await api('/customers/lookup?phone=' + encodeURIComponent(phone));
    adminCustPOS = c;
    const info = document.getElementById('pos-cust-info');
    info.style.display = 'block';
    document.getElementById('pos-cust-name').textContent = c.full_name;
    document.getElementById('pos-cust-tier').textContent = 'Hạng ' + c.tier_name + ' (-' + c.discount_percent + '%)';
    document.getElementById('pos-cust-points').textContent = fmt(c.points_balance) + ' pts';
    document.getElementById('pos-cust-multiplier').textContent = c.point_multiplier + 'x';
    showMsg('🌸 Đã nhận diện hội viên: ' + c.full_name + ' (' + c.tier_name + ')');
    updatePOSBill();
  } catch (e) {
    showMsg(e.message, 'error');
    adminCustPOS = null;
    document.getElementById('pos-cust-info').style.display = 'none';
  }
}

function posSelectWalkin() {
  adminCustPOS = null;
  document.getElementById('pos-cust-phone').value = '';
  document.getElementById('pos-cust-info').style.display = 'none';
  if (adminReward) {
    posRemoveRewardCode();
    showMsg('Đã chọn Khách vãng lai và hủy voucher của hội viên cũ', 'info');
  } else {
    showMsg('Đã chọn: Khách vãng lai');
  }
  updatePOSBill();
}

async function posApplyPromo() {
  const code = document.getElementById('pos-promo-code').value.trim();
  if (!code) return;
  const subtotal = adminCart.reduce((s, i) => s + i.price * i.qty, 0);
  try {
    adminPromo = await api('/promotions/validate', { method: 'POST', body: JSON.stringify({ code, subtotal }) });
    showMsg('Áp dụng mã ' + adminPromo.code + ': ' + adminPromo.name);
    updatePOSBill();
  } catch (e) { showMsg(e.message, 'error'); }
}

async function posApplyRewardCode() {
  const code = document.getElementById('pos-reward-code').value.trim().toUpperCase();
  if (!code) {
    showMsg('Vui lòng nhập mã Voucher (VD: UD-XXXXXX)', 'error');
    return;
  }
  const subtotal = adminCart.reduce((s, i) => s + i.price * i.qty, 0);
  if (subtotal <= 0) {
    showMsg('Vui lòng chọn món trước khi áp dụng voucher', 'error');
    return;
  }
  try {
    const res = await api('/vouchers/apply', {
      method: 'POST',
      body: JSON.stringify({
        code: code,
        subtotal: subtotal,
        customer_id: adminCustPOS?.id || null,
        mark_used: false
      })
    });
    adminReward = {
      code: res.code,
      value: parseFloat(res.discount_amount),
      name: res.reward_name
    };
    showMsg(`🌸 Áp dụng thành công Voucher ${res.code} (-${fmt(res.discount_amount)} đ)`);
    const btnRemove = document.getElementById('btn-remove-voucher');
    if (btnRemove) btnRemove.style.display = 'inline-block';
    updatePOSBill();
  } catch (e) {
    showMsg('Lỗi áp dụng voucher: ' + e.message, 'error');
    adminReward = null;
    const btnRemove = document.getElementById('btn-remove-voucher');
    if (btnRemove) btnRemove.style.display = 'none';
    updatePOSBill();
  }
}

function posRemoveRewardCode() {
  adminReward = null;
  document.getElementById('pos-reward-code').value = '';
  const btnRemove = document.getElementById('btn-remove-voucher');
  if (btnRemove) btnRemove.style.display = 'none';
  showMsg('Đã hủy áp dụng voucher');
  updatePOSBill();
}

function updatePOSBill() {
  const container = document.getElementById('pos-cart-items');
  if (adminCart.length === 0) {
    container.innerHTML = '<div class="text-center text-muted" style="padding:10px; font-size:0.85rem;">Chưa có món nào trong hóa đơn</div>';
  } else {
    container.innerHTML = adminCart.map(item => `
      <div class="cart-item-row">
        <span class="cart-item-name">${item.name}</span>
        <div class="cart-qty-ctrl">
          <button class="qty-btn" onclick="posChangeQty(${item.id},-1)">-</button>
          <span>${item.qty}</span>
          <button class="qty-btn" onclick="posChangeQty(${item.id},1)">+</button>
        </div>
        <span class="cart-item-total">${fmt(item.price * item.qty)} đ</span>
      </div>
    `).join('');
  }

  const subtotal = adminCart.reduce((s, i) => s + i.price * i.qty, 0);
  const tierPct  = adminCustPOS ? parseFloat(adminCustPOS.discount_percent) : 0;
  const tierMult = adminCustPOS ? parseFloat(adminCustPOS.point_multiplier) : 1;

  // No Double-Dipping: Nếu có voucher đổi điểm, giảm giá hạng thành viên = 0
  let tierDisc = Math.round(subtotal * tierPct / 100);
  const rewardDisc = adminReward ? adminReward.value : 0;

  if (adminReward) {
    tierDisc = 0; // Triệt tiêu giảm giá hạng
    document.getElementById('pos-tier-percent').textContent = '0% (Ưu tiên Voucher)';
  } else {
    document.getElementById('pos-tier-percent').textContent = tierPct + '%';
  }

  let promoDisc = 0, promoMult = 1;
  if (adminPromo && subtotal >= parseFloat(adminPromo.min_order_value)) {
    const afterBaseDiscount = Math.max(0, subtotal - tierDisc - rewardDisc);
    if (adminPromo.promo_type === 'PERCENT') promoDisc = Math.round(afterBaseDiscount * parseFloat(adminPromo.value) / 100);
    else if (adminPromo.promo_type === 'AMOUNT') promoDisc = parseFloat(adminPromo.value);
    else if (adminPromo.promo_type === 'POINT_MULTIPLIER') promoMult = parseFloat(adminPromo.value);
  }

  const total = Math.max(0, subtotal - tierDisc - promoDisc - rewardDisc);
  const effMult = Math.max(tierMult, promoMult);
  const pts = adminCustPOS ? Math.round(Math.floor(total / 10000) * effMult) : 0;

  document.getElementById('pos-subtotal').textContent = fmt(subtotal) + ' đ';
  document.getElementById('pos-tier-discount').textContent = '-' + fmt(tierDisc) + ' đ';
  document.getElementById('pos-promo-name').textContent = adminPromo ? adminPromo.code : 'None';
  document.getElementById('pos-promo-discount').textContent = '-' + fmt(promoDisc) + ' đ';
  document.getElementById('pos-reward-discount').textContent = '-' + fmt(rewardDisc) + ' đ';
  document.getElementById('pos-final-total').textContent = fmt(total) + ' đ';
  document.getElementById('pos-points-earned').textContent = '+' + pts + ' pts';

  // Cập nhật mã VietQR nếu đang chọn Chuyển khoản QR
  posHandlePaymentChange();
}

function posHandlePaymentChange() {
  const method = document.querySelector('input[name=paymentMethod]:checked')?.value || 'CASH';
  const qrBox = document.getElementById('pos-vietqr-box');
  const qrImg = document.getElementById('pos-vietqr-img');
  if (!qrBox || !qrImg) return;

  if (method === 'TRANSFER') {
    const totalEl = document.getElementById('pos-final-total');
    const totalVal = parseInt(totalEl?.textContent.replace(/[^0-9]/g, '') || '0', 10);
    const invoiceCode = document.getElementById('pos-invoice-code')?.textContent || 'HD-POS';
    if (totalVal > 0) {
      qrImg.src = `https://img.vietqr.io/image/MB-0901112233-compact2.jpg?amount=${totalVal}&addInfo=${encodeURIComponent(invoiceCode)}&accountName=TIEM%20CA%20PHE%20HOA%20DAO`;
      qrBox.style.display = 'block';
    } else {
      qrBox.style.display = 'none';
    }
  } else {
    qrBox.style.display = 'none';
  }
}

async function posCheckout() {
  if (!adminCart.length) { showMsg('Giỏ hàng trống! Vui lòng chọn món.', 'error'); return; }

  const payment = document.querySelector('input[name=paymentMethod]:checked')?.value || 'CASH';
  const selectedTableId = document.getElementById('pos-table-select')?.value || null;
  const cartBackup = [...adminCart];
  const custBackup = adminCustPOS;
  try {
    const result = await api('/orders', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: adminCustPOS?.id || null,
        staff_id: adminUser?.id || null,
        table_id: selectedTableId ? parseInt(selectedTableId) : null,
        items: adminCart.map(i => ({ product_id: i.id, quantity: i.qty })),
        promo_code: adminPromo?.code || null,
        reward_code: adminReward?.code || null,
        voucher_code: adminReward?.code || null,
        payment_method: payment,
        channel: 'POS'
      })
    });
    showMsg('🎉 Đơn hàng ' + result.code + ' đã thanh toán thành công! Tích +' + result.points_earned + ' điểm');
    loadPosTableDropdown();

    // Hiển thị hóa đơn in
    const itemsHtml = cartBackup.map(i => `
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding: 2px 0;">
        <span>${i.name} x${i.qty}</span>
        <span>${fmt(i.price * i.qty)} đ</span>
      </div>
    `).join('');

    document.getElementById('receipt-content').innerHTML = `
      <div style="text-align:center; padding:12px;">
        <h2 style="margin-bottom:4px; font-family:'Playfair Display', serif; color:#3E2723; font-size: 1.4rem;">caPHEnue</h2>
        <p style="font-size:0.82rem; color:#6B7280;">Tiệm Cà Phê Hoa Đào • Hệ Thống POS</p>
        <div style="margin:10px 0; border-top:1px dashed #D1D5DB; border-bottom:1px dashed #D1D5DB; padding:6px 0; text-align: left;">
          <p style="margin:2px 0; font-size:0.82rem;">Mã HĐ: <strong>${result.code}</strong></p>
          <p style="margin:2px 0; font-size:0.8rem; color:#6B7280;">Thời gian: ${new Date().toLocaleString('vi-VN')}</p>
          <p style="margin:2px 0; font-size:0.82rem;">Khách hàng: <strong>${custBackup ? custBackup.full_name : 'Khách vãng lai'}</strong></p>
          <p style="margin:2px 0; font-size:0.8rem;">Thu ngân: <strong>${adminUser?.full_name || 'Thu ngân quầy'}</strong></p>
        </div>
        <div style="margin-bottom: 8px;">
          ${itemsHtml}
        </div>
        <div style="text-align:left; font-size:0.85rem; line-height:1.6; border-top: 1px dashed #D1D5DB; padding-top: 6px;">
          <p style="display:flex; justify-content:space-between; margin:2px 0;"><span>Tạm tính:</span> <span>${fmt(result.subtotal)} đ</span></p>
          ${parseFloat(result.tier_discount) > 0 ? `<p style="display:flex; justify-content:space-between; color:#059669; margin:2px 0;"><span>Giảm hạng:</span> <span>-${fmt(result.tier_discount)} đ</span></p>` : ''}
          ${parseFloat(result.promo_discount) > 0 ? `<p style="display:flex; justify-content:space-between; color:#2563EB; margin:2px 0;"><span>Khuyến mãi:</span> <span>-${fmt(result.promo_discount)} đ</span></p>` : ''}
          ${parseFloat(result.reward_discount) > 0 ? `<p style="display:flex; justify-content:space-between; color:#E8618C; margin:2px 0;"><span>Voucher đổi điểm:</span> <span>-${fmt(result.reward_discount)} đ</span></p>` : ''}
        </div>
        <div style="border-top:1px dashed #D1D5DB; margin:8px 0; padding-top:6px;">
          <h3 style="color:#E8618C; display:flex; justify-content:space-between; margin:0; font-size: 1.15rem;">
            <span>TỔNG CỘNG:</span>
            <span>${fmt(result.total)} đ</span>
          </h3>
          <p style="margin:4px 0 0 0; font-size:0.82rem; color:#059669;">
            Điểm tích lũy: <strong>+${result.points_earned} pts</strong>
          </p>
          <p style="margin:4px 0 0 0; font-size:0.8rem; color:#4B5563;">
            Phương thức: <strong>${payment === 'TRANSFER' ? 'Chuyển khoản VietQR' : (payment === 'CARD' ? 'Thẻ ngân hàng' : 'Tiền mặt')}</strong>
          </p>
          ${payment === 'TRANSFER' ? `
          <div style="margin-top:8px; text-align:center;">
            <img src="https://img.vietqr.io/image/MB-0901112233-compact2.jpg?amount=${result.total}&addInfo=${encodeURIComponent(result.code)}&accountName=TIEM%20CA%20PHE%20HOA%20DAO" style="width:130px;height:130px;border:1px solid #ddd;" alt="VietQR">
            <p style="font-size:0.75rem; color:#6B7280; margin:2px 0 0 0;">Mã chuẩn Napas 247</p>
          </div>` : ''}
        </div>
        <p style="margin-top:12px; font-size:0.75rem; color:#9CA3AF;">Cảm ơn Quý khách &amp; Hẹn gặp lại!</p>
      </div>
    `;
    document.getElementById('receipt-modal').classList.remove('hidden');

    posClearCart();
    // Tải lại đơn hàng và dashboard
    loadOrders();
    loadDashboard();
  } catch (e) {
    showMsg('Lỗi: ' + e.message, 'error');
  }
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const d = await api('/dashboard');
    document.getElementById('current-date-str').textContent = 'Hôm nay: ' + new Date().toLocaleDateString('vi-VN');

    document.getElementById('kpi-container').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon icon-blue">&#x1F465;</div>
        <div class="kpi-meta">
          <span class="kpi-title">Tổng Khách Hàng Thân Thiết</span>
          <span class="kpi-value">${fmt(d.total_customers)}</span>
          <span class="kpi-note text-success">Đang hoạt động trên hệ thống</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon icon-green">&#x1F4B0;</div>
        <div class="kpi-meta">
          <span class="kpi-title">Doanh Thu Hôm Nay</span>
          <span class="kpi-value">${fmt(d.today_revenue)} đ</span>
          <span class="kpi-note text-success">Hóa đơn hoàn tất</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon icon-pink">&#x1F338;</div>
        <div class="kpi-meta">
          <span class="kpi-title">Tổng Điểm Thưởng Đã Cấp</span>
          <span class="kpi-value">${fmt(d.total_points)} pts</span>
          <span class="kpi-note">Theo quy tắc tích điểm BR1</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon icon-gold">&#x1F9FE;</div>
        <div class="kpi-meta">
          <span class="kpi-title">Đơn Hàng Hôm Nay</span>
          <span class="kpi-value">${fmt(d.today_orders)}</span>
          <span class="kpi-note">Bao gồm cả POS và Online</span>
        </div>
      </div>
    `;

    // Doanh thu 7 ngày
    const rtb = document.getElementById('revenue-tbody');
    if (rtb && d.revenue_7days) {
      rtb.innerHTML = d.revenue_7days.map(r => `
        <tr><td>${new Date(r.date).toLocaleDateString('vi-VN')}</td><td>${r.orders} đơn</td><td><strong>${fmt(r.revenue)} đ</strong></td></tr>
      `).join('') || '<tr><td colspan="3" class="text-center text-muted">Chưa có dữ liệu</td></tr>';
    }

    // Phân bố hạng thành viên
    const total = d.tier_distribution.reduce((s, t) => s + t.count, 0) || 1;
    document.getElementById('dashboard-tier-dist').innerHTML = d.tier_distribution.map(t => {
      const pct = Math.round(t.count / total * 100);
      return `<div class="tier-dist-item">
        <div class="tier-dist-label"><span>Hạng ${t.tier_name}</span><span>${t.count} khách (${pct}%)</span></div>
        <div class="progress-bar-bg" style="height:6px;"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');

  } catch (e) { console.error('Dashboard:', e); }
}

// ── QUẢN LÝ KHÁCH HÀNG (CÓ BẬT / TẮT & ĐIỀU CHỈNH ĐIỂM) ──────────────────────
async function loadCustomers() {
  try {
    const search = document.getElementById('cust-filter-search')?.value || '';
    const custs = await api('/customers?search=' + encodeURIComponent(search));
    document.getElementById('admin-customers-tbody').innerHTML = custs.map(c => {
      const isActive = c.status === 'ACTIVE';
      return `
      <tr>
        <td><strong>${c.code}</strong></td>
        <td><strong>${c.full_name}</strong></td>
        <td>${c.phone}</td>
        <td><span class="badge badge-${c.tier_name.toLowerCase()}">Hạng ${c.tier_name}</span></td>
        <td class="text-pink"><strong>${fmt(c.points_balance)} pts</strong></td>
        <td>${fmt(c.lifetime_points)} pts</td>
        <td>
          <button class="status-toggle-btn ${isActive ? 'is-on' : 'is-off'}" onclick="toggleCustomerStatus(${c.id})">
            <span class="toggle-dot"></span>
            <span>${isActive ? 'BẬT (Hoạt động)' : 'TẮT (Đã khóa)'}</span>
          </button>
        </td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openAdjustPointsModal(${c.id}, '${c.full_name.replace(/'/g, "\\'")}', ${c.points_balance})">
            ⚖️ Chỉnh Điểm
          </button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="8" class="text-center text-muted">Không tìm thấy khách hàng nào</td></tr>';
  } catch (e) { console.error('Customers:', e); }
}

async function toggleCustomerStatus(id) {
  try {
    const res = await api(`/customers/${id}/toggle`, { method: 'PATCH' });
    showMsg(res.message || 'Đã cập nhật trạng thái khách hàng');
    await loadCustomers();
    await loadDashboard();
  } catch (e) {
    showMsg('Lỗi đổi trạng thái khách hàng: ' + e.message, 'error');
  }
}

// Modal Điều Chỉnh Điểm Khách Hàng
function openAdjustPointsModal(id, name, points) {
  document.getElementById('adjust-cust-id').value = id;
  document.getElementById('adjust-cust-name').value = name;
  document.getElementById('adjust-cust-current').value = fmt(points) + ' pts';
  document.getElementById('adjust-points-amount').value = '';
  document.getElementById('adjust-points-reason').value = '';
  document.getElementById('adjust-points-error').style.display = 'none';
  document.getElementById('adjust-points-modal').classList.remove('hidden');
}

function closeAdjustPointsModal() {
  document.getElementById('adjust-points-modal').classList.add('hidden');
}

async function submitAdjustPoints(e) {
  e.preventDefault();
  const id = document.getElementById('adjust-cust-id').value;
  const points = parseInt(document.getElementById('adjust-points-amount').value, 10);
  const reason = document.getElementById('adjust-points-reason').value.trim();
  const errEl = document.getElementById('adjust-points-error');

  if (isNaN(points) || points === 0) {
    errEl.textContent = 'Vui lòng nhập số điểm hợp lệ khác 0';
    errEl.style.display = 'block';
    return;
  }
  if (!reason) {
    errEl.textContent = 'Vui lòng nhập lý do điều chỉnh';
    errEl.style.display = 'block';
    return;
  }

  try {
    const res = await api(`/customers/${id}/adjust-points`, {
      method: 'POST',
      body: JSON.stringify({ points, reason })
    });
    showMsg(`🌸 ${res.message} (Số dư mới: ${fmt(res.new_balance)} pts)`);
    closeAdjustPointsModal();
    await loadCustomers();
    await loadDashboard();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
}

// ── DANH SÁCH ĐƠN HÀNG (ĐỔ DỮ LIỆU THỰC TẾ TỪ CSDL) ─────────────────────────
async function loadOrders() {
  try {
    const orders = await api('/orders?limit=50');
    const tbody = document.getElementById('admin-orders-tbody');
    if (!tbody) return;
    tbody.innerHTML = orders.map(o => {
      const disc = (parseFloat(o.tier_discount) || 0) + (parseFloat(o.promo_discount) || 0) + (parseFloat(o.reward_discount) || 0);
      const voucherDisplay = o.voucher_code ? `<span class="badge badge-pink" style="background:#FCE7F3;color:#D84A77;font-weight:bold;">${o.voucher_code}</span>` : '<span class="text-muted">-</span>';
      const tierDisplay = o.tier_name ? `<span class="badge badge-${o.tier_name.toLowerCase()}">Hạng ${o.tier_name}</span>` : '<span class="text-muted">Vãng lai</span>';
      return `<tr>
        <td><strong>${o.code}</strong></td>
        <td><strong>${o.customer_name || 'Khách vãng lai'}</strong></td>
        <td>${tierDisplay}</td>
        <td>${new Date(o.created_at).toLocaleString('vi-VN')}</td>
        <td>${fmt(o.subtotal)} đ</td>
        <td>${voucherDisplay}</td>
        <td class="text-success">-${fmt(disc)} đ</td>
        <td><strong class="text-pink">${fmt(o.total)} đ</strong></td>
        <td class="text-success"><strong>+${o.points_earned} pts</strong></td>
        <td><span class="badge">${o.channel || 'POS'}</span></td>
        <td><span class="badge badge-success">${o.status === 'COMPLETED' ? 'Hoàn tất' : o.status}</span></td>
      </tr>`;
    }).join('') || '<tr><td colspan="11" class="text-center text-muted">Chưa có đơn hàng nào</td></tr>';
  } catch (e) { console.error('Orders:', e); }
}

// ── SẢN PHẨM & DANH MỤC (CÓ BẬT / TẮT TRẠNG THÁI) ────────────────────────────
async function loadProducts() {
  try {
    const [cats, prods] = await Promise.all([
      api('/product-categories'),
      api('/products?active=all')
    ]);

    const catTbody = document.getElementById('admin-categories-tbody');
    if (catTbody && cats) {
      catTbody.innerHTML = cats.map(c => {
        const isActive = Boolean(c.is_active);
        return `
        <tr>
          <td>#${c.id}</td>
          <td><strong>${c.name}</strong></td>
          <td>${c.active_products || 0} / ${c.total_products || 0} món đang bán</td>
          <td>
            <button class="status-toggle-btn ${isActive ? 'is-on' : 'is-off'}" onclick="toggleCategoryStatus(${c.id})">
              <span class="toggle-dot"></span>
              <span>${isActive ? 'BẬT (Đang mở)' : 'TẮT (Tạm ngưng)'}</span>
            </button>
          </td>
        </tr>`;
      }).join('');
    }

    document.getElementById('admin-products-tbody').innerHTML = prods.map(p => {
      const isActive = Boolean(p.is_active);
      return `
      <tr>
        <td>${p.id}</td>
        <td><img src="${p.image_url || 'images/products/caphe_suada.jpg'}" style="width:46px;height:46px;object-fit:cover;border:1px solid #E5E7EB;" alt="${p.name}"></td>
        <td><strong>${p.name}</strong></td>
        <td>${p.category_name}</td>
        <td><strong>${fmt(p.price)} đ</strong></td>
        <td>
          <button class="status-toggle-btn ${isActive ? 'is-on' : 'is-off'}" onclick="toggleProductStatus(${p.id})">
            <span class="toggle-dot"></span>
            <span>${isActive ? 'BẬT (Đang bán)' : 'TẮT (Tạm ngưng)'}</span>
          </button>
        </td>
      </tr>`;
    }).join('');
  } catch (e) { console.error('Products:', e); }
}

async function toggleCategoryStatus(id) {
  try {
    const res = await api(`/product-categories/${id}/toggle`, { method: 'PATCH' });
    showMsg(res.message || 'Đã cập nhật trạng thái danh mục');
    await loadProducts();
    adminProducts = await api('/products');
    renderPOSProducts();
  } catch (e) {
    showMsg('Lỗi đổi trạng thái danh mục: ' + e.message, 'error');
  }
}

async function toggleProductStatus(id) {
  try {
    const res = await api(`/products/${id}/toggle`, { method: 'PATCH' });
    showMsg(res.message || 'Đã cập nhật trạng thái sản phẩm');
    await loadProducts();
    adminProducts = await api('/products');
    renderPOSProducts();
  } catch (e) {
    showMsg('Lỗi đổi trạng thái sản phẩm: ' + e.message, 'error');
  }
}

// ── HẠNG THÀNH VIÊN ──────────────────────────────────────────────────────────
async function loadTiers() {
  try {
    const tiers = await api('/tiers');
    document.getElementById('admin-tiers-tbody').innerHTML = tiers.map(t => `
      <tr>
        <td>${t.id}</td>
        <td><strong>Hạng ${t.name}</strong></td>
        <td>${fmt(t.min_points)} điểm</td>
        <td><strong>${t.discount_percent}%</strong></td>
        <td>${t.point_multiplier}x</td>
      </tr>
    `).join('');
  } catch (e) { console.error('Tiers:', e); }
}

// ── ƯU ĐÃI ĐỔI ĐIỂM (CÓ BẬT / TẮT) ───────────────────────────────────────────
async function loadRewards() {
  try {
    const rws = await api('/rewards?active=all');
    document.getElementById('admin-rewards-tbody').innerHTML = rws.map(r => {
      const isActive = Boolean(r.is_active);
      return `
      <tr>
        <td>${r.id}</td>
        <td><strong>${r.name}</strong></td>
        <td>${r.reward_type === 'AMOUNT' ? 'Giảm tiền' : (r.reward_type === 'FREE_ITEM' ? 'Tặng món' : 'Giảm %')}</td>
        <td class="text-pink"><strong>${r.points_cost} pts</strong></td>
        <td>${fmt(r.value)} đ</td>
        <td>${r.stock !== null ? (r.stock + ' voucher') : 'Không giới hạn'}</td>
        <td>
          <button class="status-toggle-btn ${isActive ? 'is-on' : 'is-off'}" onclick="toggleRewardStatus(${r.id})">
            <span class="toggle-dot"></span>
            <span>${isActive ? 'BẬT (Đang áp dụng)' : 'TẮT (Tạm ngưng)'}</span>
          </button>
        </td>
      </tr>`;
    }).join('');
  } catch (e) { console.error('Rewards:', e); }
}

async function toggleRewardStatus(id) {
  try {
    const res = await api(`/rewards/${id}/toggle`, { method: 'PATCH' });
    showMsg(res.message || 'Đã đổi trạng thái ưu đãi');
    await loadRewards();
  } catch (e) {
    showMsg('Lỗi đổi trạng thái ưu đãi: ' + e.message, 'error');
  }
}

// ── KHUYẾN MÃI (CÓ BẬT / TẮT TRẠNG THÁI) ─────────────────────────────────────
async function loadPromos() {
  try {
    const ps = await api('/promotions?active=all');
    document.getElementById('admin-promos-tbody').innerHTML = ps.map(p => {
      const isActive = Boolean(p.is_active);
      return `
      <tr>
        <td><strong>${p.code}</strong></td>
        <td>${p.name}</td>
        <td>${p.promo_type === 'PERCENT' ? 'Giảm %' : (p.promo_type === 'AMOUNT' ? 'Giảm tiền' : 'Nhân điểm')}</td>
        <td><strong>${p.promo_type === 'PERCENT' ? p.value + '%' : (p.promo_type === 'AMOUNT' ? fmt(p.value) + ' đ' : p.value + 'x')}</strong></td>
        <td>${fmt(p.min_order_value)} đ</td>
        <td>${String(p.start_date).slice(0, 10)} ~ ${String(p.end_date).slice(0, 10)}</td>
        <td>${p.used_count} / ${p.usage_limit || '∞'}</td>
        <td>
          <button class="status-toggle-btn ${isActive ? 'is-on' : 'is-off'}" onclick="togglePromoStatus(${p.id})">
            <span class="toggle-dot"></span>
            <span>${isActive ? 'BẬT (Đang chạy)' : 'TẮT (Tạm dừng)'}</span>
          </button>
        </td>
      </tr>`;
    }).join('');
  } catch (e) { console.error('Promos:', e); }
}

async function togglePromoStatus(id) {
  try {
    const res = await api(`/promotions/${id}/toggle`, { method: 'PATCH' });
    showMsg(res.message || 'Đã đổi trạng thái khuyến mãi');
    await loadPromos();
  } catch (e) {
    showMsg('Lỗi đổi trạng thái khuyến mãi: ' + e.message, 'error');
  }
}

// ── BÁO CÁO THỐNG KÊ (4 THẺ LOYALTY + DOANH THU THEO NGÀY) ──────────────────
async function loadReports() {
  try {
    const rep = await api('/reports/dashboard');
    const sum = rep.summary || {};

    // 1. Render 4 Thẻ KPI Loyalty
    const kpiContainer = document.getElementById('reports-kpi-container');
    if (kpiContainer) {
      kpiContainer.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-icon icon-green">&#x1F4B0;</div>
          <div class="kpi-meta">
            <span class="kpi-title">Tổng Doanh Thu Thực Thu</span>
            <span class="kpi-value">${fmt(sum.total_revenue || 0)} đ</span>
            <span class="kpi-note text-success">Đã trừ các khoản ưu đãi loyalty</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon icon-blue">&#x2B50;</div>
          <div class="kpi-meta">
            <span class="kpi-title">Tổng Điểm Phát Hành (Earned)</span>
            <span class="kpi-value">${fmt(sum.total_points_earned || 0)} pts</span>
            <span class="kpi-note">Theo quy tắc 10.000đ = 1 điểm</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon icon-pink">&#x1F381;</div>
          <div class="kpi-meta">
            <span class="kpi-title">Tổng Điểm Đã Đổi Quà</span>
            <span class="kpi-value">${fmt(sum.total_points_redeemed || 0)} pts</span>
            <span class="kpi-note">Voucher ưu đãi đã xuất kho</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon icon-gold">&#x1F3F7;</div>
          <div class="kpi-meta">
            <span class="kpi-title">Tổng Tiền Giảm Giá Loyalty</span>
            <span class="kpi-value">${fmt(sum.total_loyalty_discount || 0)} đ</span>
            <span class="kpi-note">Bao gồm giảm hạng &amp; voucher</span>
          </div>
        </div>
      `;
    }

    // 2. Render Bảng Kê Doanh Thu Theo Ngày
    const dailyTbody = document.getElementById('report-daily-revenue-tbody');
    if (dailyTbody && rep.daily_revenue) {
      dailyTbody.innerHTML = rep.daily_revenue.map(r => `
        <tr>
          <td><strong>${new Date(r.date || r.order_date).toLocaleDateString('vi-VN')}</strong></td>
          <td>${r.orders ?? r.order_count ?? 0} đơn</td>
          <td class="text-success"><strong>${fmt(r.revenue)} đ</strong></td>
          <td class="text-pink"><strong>+${fmt(r.points_issued || 0)} pts</strong></td>
        </tr>
      `).join('') || '<tr><td colspan="4" class="text-center text-muted">Chưa có dữ liệu</td></tr>';
    }

    // 3. Top 5 Khách hàng
    const topCusts = document.getElementById('report-top-customers');
    if (topCusts) {
      const custs = await api('/customers');
      const sorted = custs.sort((a, b) => b.lifetime_points - a.lifetime_points).slice(0, 5);
      topCusts.innerHTML = sorted.map(c => `
        <tr>
          <td><strong>${c.full_name}</strong></td>
          <td><span class="badge badge-${c.tier_name.toLowerCase()}">Hạng ${c.tier_name}</span></td>
          <td class="text-pink"><strong>${fmt(c.lifetime_points)} pts</strong></td>
          <td><strong>${fmt(c.lifetime_points * 10000)} đ</strong></td>
        </tr>
      `).join('') || '<tr><td colspan="4" class="text-center text-muted">Chưa có dữ liệu</td></tr>';
    }

    // 4. Top 5 Món bán chạy
    const topProds = document.getElementById('report-top-products');
    if (topProds) {
      const d = await api('/dashboard');
      if (d.top_products) {
        topProds.innerHTML = d.top_products.map(p => `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td>Đồ uống / Bánh</td>
            <td><strong>${p.total_qty} phần</strong></td>
            <td><strong>${fmt(p.revenue)} đ</strong></td>
          </tr>
        `).join('') || '<tr><td colspan="4" class="text-center text-muted">Chưa có dữ liệu</td></tr>';
      }
    }
  } catch (e) { console.error('Reports error:', e); }
}

// ── TÀI KHOẢN NHÂN VIÊN & ĐỔI MẬT KHẨU ────────────────────────────────────────
async function loadUsers() {
  try {
    const users = await api('/users');
    document.getElementById('admin-users-tbody').innerHTML = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td><strong>${u.username}</strong></td>
        <td>${u.full_name}</td>
        <td><span class="badge badge-kimcuong">${u.role}</span></td>
        <td><span class="badge badge-success">${u.is_active ? 'Đang hoạt động' : 'Tạm khóa'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openChangePasswordModal(${u.id}, '${u.username}')">
            🔑 Đổi MK
          </button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="text-center text-muted">Không có tài khoản nào</td></tr>';
  } catch (e) { console.error('Users:', e); }
}

function openChangePasswordModal(id, username) {
  document.getElementById('change-pass-user-id').value = id;
  document.getElementById('change-pass-username').value = username;
  document.getElementById('change-pass-new').value = '';
  document.getElementById('change-pass-error').style.display = 'none';
  document.getElementById('change-password-modal').classList.remove('hidden');
}

function closeChangePasswordModal() {
  document.getElementById('change-password-modal').classList.add('hidden');
}

async function submitChangePassword(e) {
  e.preventDefault();
  const id = document.getElementById('change-pass-user-id').value;
  const new_password = document.getElementById('change-pass-new').value;
  const errEl = document.getElementById('change-pass-error');

  if (!new_password || new_password.length < 6) {
    errEl.textContent = 'Mật khẩu phải có tối thiểu 6 ký tự';
    errEl.style.display = 'block';
    return;
  }

  try {
    const res = await api(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ new_password })
    });
    showMsg('🔑 ' + (res.message || 'Đổi mật khẩu thành công!'));
    closeChangePasswordModal();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
}

// ── AUTO-LOGIN CHECK & SỬA LỖI FONT LOCALSTORAGE CŨ ─────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('admin_user');
  if (saved) {
    try {
      adminUser = JSON.parse(saved);
      // Đảm bảo tên người dùng hiển thị chuẩn tiếng Việt 100%, ghi đè rác cũ
      if (adminUser.username === 'staff' || adminUser.id === 2) {
        adminUser.full_name = 'Vũ Tiến Dũng';
        adminUser.role = 'STAFF';
      } else {
        adminUser.full_name = 'Trịnh Thanh Học';
        adminUser.role = 'ADMIN';
      }
      localStorage.setItem('admin_user', JSON.stringify(adminUser));

      document.getElementById('admin-login-screen').classList.add('hidden');
      document.getElementById('admin-app-layout').classList.remove('hidden');
      document.getElementById('current-user-name').textContent = adminUser.full_name;
      document.getElementById('current-user-role').textContent = adminUser.role;
      document.getElementById('current-user-avatar').textContent = adminUser.role === 'ADMIN' ? 'TH' : 'TD';
      loadAllData();
    } catch (e) {
      localStorage.removeItem('admin_user');
    }
  }
});

// Đồng bộ lại tài khoản mới nhất từ database để xóa triệt để lỗi font cũ
async function syncAdminUserFromDB() {
  try {
    const users = await api('/users');
    if (users && users.length && adminUser) {
      const current = users.find(u => u.id === adminUser.id);
      if (current) {
        adminUser.full_name = current.full_name;
        adminUser.role = current.role;
        localStorage.setItem('admin_user', JSON.stringify(adminUser));
        document.getElementById('current-user-name').textContent = current.full_name;
        document.getElementById('current-user-role').textContent = current.role;
        document.getElementById('current-user-avatar').textContent = current.role === 'ADMIN' ? 'TH' : 'TD';
      }
    }
  } catch (e) {
    console.warn('Sync user error:', e);
  }
}

// ── TÍNH NĂNG MỞ RỘNG: XUẤT BÁO CÁO EXCEL (CSV UTF-8 BOM CHUẨN EXCEL) ────────
async function exportOrdersToExcel() {
  try {
    const orders = await api('/orders?limit=1000');
    if (!orders || !orders.length) {
      showMsg('Không có đơn hàng nào để xuất', 'error');
      return;
    }
    const headers = [
      'Mã Đơn',
      'Khách Hàng',
      'Hạng Thẻ',
      'Thời Gian',
      'Tạm Tính (đ)',
      'Mã Voucher',
      'Giảm Hạng (đ)',
      'Khuyến Mãi (đ)',
      'Voucher Giảm (đ)',
      'Thành Tiền (đ)',
      'Điểm Tích',
      'Thanh Toán',
      'Kênh Bán',
      'Trạng Thái'
    ];
    const rows = orders.map(o => [
      `"${o.code}"`,
      `"${o.customer_name || 'Khách vãng lai'}"`,
      `"${o.tier_name || 'Vãng lai'}"`,
      `"${new Date(o.created_at).toLocaleString('vi-VN')}"`,
      o.subtotal,
      `"${o.voucher_code || ''}"`,
      o.tier_discount || 0,
      o.promo_discount || 0,
      o.reward_discount || 0,
      o.total,
      o.points_earned,
      `"${o.payment_method}"`,
      `"${o.channel}"`,
      `"${o.status}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_Sach_Don_Hang_caPHEnue_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMsg('📥 Đã xuất file Excel đơn hàng thành công!');
  } catch (e) {
    showMsg('Lỗi xuất Excel: ' + e.message, 'error');
  }
}

async function exportRevenueToExcel() {
  try {
    const rep = await api('/reports/dashboard');
    if (!rep || !rep.daily_revenue || !rep.daily_revenue.length) {
      showMsg('Không có dữ liệu doanh thu để xuất', 'error');
      return;
    }
    const headers = [
      'Ngày',
      'Số Đơn Hàng',
      'Doanh Thu Gộp (đ)',
      'Tổng Chiết Khấu (đ)',
      'Doanh Thu Thực Thu (đ)',
      'Điểm Phát Hành'
    ];
    const rows = rep.daily_revenue.map(r => [
      `"${new Date(r.date || r.order_date).toLocaleDateString('vi-VN')}"`,
      r.orders || r.order_count || 0,
      r.gross_sales || r.revenue || 0,
      r.discounts || 0,
      r.revenue || 0,
      r.points_issued || 0
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_Doanh_Thu_caPHEnue_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMsg('📥 Đã xuất Báo Cáo Doanh Thu ra Excel thành công!');
  } catch (e) {
    showMsg('Lỗi xuất Excel: ' + e.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// QUẢN LÝ SƠ ĐỒ BÀN & ĐẶT CHỖ (TABLES & RESERVATIONS)
// ════════════════════════════════════════════════════════════════════════════
let adminTablesList = [];
let adminCurrentTableArea = 'ALL';

async function loadPosTableDropdown() {
  const sel = document.getElementById('pos-table-select');
  if (!sel) return;
  try {
    const res = await api('/tables');
    const tables = res.tables || res || [];
    adminTablesList = tables;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">-- Mang về / Chưa chọn bàn --</option>' +
      tables.map(t => {
        const areaLabel = t.area === 'INDOOR' ? 'T1' : (t.area === 'OUTDOOR' ? 'T2' : 'VIP');
        const statusIcon = t.status === 'AVAILABLE' ? '🟢' : (t.status === 'OCCUPIED' ? '🔴' : '🟡');
        return `<option value="${t.id}" ${t.id == currentVal ? 'selected' : ''}>${statusIcon} [${areaLabel}] ${t.table_number} - ${t.name} (${t.capacity} chỗ)</option>`;
      }).join('');
  } catch (e) {
    console.error('loadPosTableDropdown:', e);
  }
}

async function loadAdminTables() {
  try {
    const res = await api('/tables');
    const tables = res.tables || res || [];
    const stats = res.stats || {
      total: tables.length,
      available: tables.filter(t => t.status === 'AVAILABLE').length,
      occupied: tables.filter(t => t.status === 'OCCUPIED').length,
      reserved: tables.filter(t => t.status === 'RESERVED').length
    };
    adminTablesList = tables;

    // Cập nhật 4 thẻ KPI
    const elTot = document.getElementById('kpi-tables-total');
    const elAvail = document.getElementById('kpi-tables-available');
    const elOcc = document.getElementById('kpi-tables-occupied');
    const elRes = document.getElementById('kpi-tables-reserved');
    if (elTot) elTot.textContent = stats.total;
    if (elAvail) elAvail.textContent = stats.available;
    if (elOcc) elOcc.textContent = stats.occupied;
    if (elRes) elRes.textContent = stats.reserved;

    renderTablesMap();
    loadAdminReservations();
    loadPosTableDropdown();
  } catch (e) {
    console.error('loadAdminTables error:', e);
  }
}

function filterTablesArea(area) {
  adminCurrentTableArea = area;
  document.querySelectorAll('#table-area-filter .pill').forEach(p => p.classList.remove('active'));
  const btn = document.getElementById('pill-area-' + area);
  if (btn) btn.classList.add('active');
  renderTablesMap();
}

function renderTablesMap() {
  const container = document.getElementById('dining-tables-grid');
  if (!container) return;

  const filtered = adminCurrentTableArea === 'ALL'
    ? adminTablesList
    : adminTablesList.filter(t => t.area === adminCurrentTableArea);

  if (!filtered.length) {
    container.innerHTML = '<div class="text-center text-muted" style="grid-column: 1/-1; padding: 30px;">Không có bàn nào trong khu vực này</div>';
    return;
  }

  container.innerHTML = filtered.map(t => {
    let statusClass = 'border-success';
    let statusBg = '#F0FDF4';
    let statusBadge = '<span class="badge badge-success">🟢 TRỐNG</span>';
    let actionBtn = `
      <button class="btn btn-sm btn-primary btn-block" onclick="quickOccupyTable(${t.id}, '${t.table_number}')">
        Nhận khách vào bàn
      </button>
    `;

    if (t.status === 'OCCUPIED') {
      statusClass = 'border-danger';
      statusBg = '#FEF2F2';
      statusBadge = '<span class="badge badge-danger">🔴 ĐANG CÓ KHÁCH</span>';
      actionBtn = `
        <div style="display:flex; gap:4px; margin-top:4px;">
          <button class="btn btn-sm btn-outline" style="flex:1;" onclick="openPosForTable(${t.id})">Tạo đơn POS</button>
          <button class="btn btn-sm btn-secondary" onclick="quickReleaseTable(${t.id})">Trả bàn</button>
        </div>
      `;
    } else if (t.status === 'RESERVED') {
      statusClass = 'border-warning';
      statusBg = '#FFFBEB';
      statusBadge = '<span class="badge badge-warning">🟡 ĐÃ ĐẶT TRƯỚC</span>';
      actionBtn = `
        <div style="display:flex; gap:4px; margin-top:4px;">
          <button class="btn btn-sm btn-primary" style="flex:1;" onclick="quickOccupyTable(${t.id}, '${t.table_number}')">Khách vào</button>
          <button class="btn btn-sm btn-outline" onclick="quickReleaseTable(${t.id})">Hủy giữ</button>
        </div>
      `;
    }

    const areaName = t.area === 'INDOOR' ? '🌸 Tầng 1 (Máy lạnh)' : (t.area === 'OUTDOOR' ? '🌿 Tầng 2 (Sân vườn)' : '⭐ Phòng VIP');

    return `
      <div class="table-card ${statusClass}" style="background:${statusBg}; border:2px solid; padding:14px; display:flex; flex-direction:column; justify-content:space-between; min-height:160px; box-shadow:var(--shadow-sm); border-radius:0;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
            <strong style="font-size:1.15rem; color:#3E2723;">${t.table_number}</strong>
            ${statusBadge}
          </div>
          <div style="font-weight:600; font-size:0.88rem; color:#1F2937; margin-bottom:4px;">${t.name}</div>
          <div style="font-size:0.78rem; color:#6B7280; display:flex; justify-content:space-between;">
            <span>${areaName}</span>
            <span>👥 ${t.capacity} chỗ</span>
          </div>
        </div>
        <div style="margin-top:12px;">
          ${actionBtn}
        </div>
      </div>
    `;
  }).join('');
}

async function quickOccupyTable(tableId, tableNum) {
  try {
    await api('/tables/' + tableId + '/status', { method: 'PATCH', body: JSON.stringify({ status: 'OCCUPIED' }) });
    showMsg(`Đã nhận khách vào ${tableNum}`);
    loadAdminTables();
  } catch (e) {
    showMsg(e.message, 'error');
  }
}

async function quickReleaseTable(tableId) {
  try {
    await api('/tables/' + tableId + '/status', { method: 'PATCH', body: JSON.stringify({ status: 'AVAILABLE' }) });
    showMsg('Đã giải phóng bàn về trạng thái Trống');
    loadAdminTables();
  } catch (e) {
    showMsg(e.message, 'error');
  }
}

function openPosForTable(tableId) {
  openAdminTab('pos');
  const sel = document.getElementById('pos-table-select');
  if (sel) sel.value = tableId;
  showMsg('Đã chọn bàn phục vụ tại POS. Mời chọn món cho khách.');
}

async function loadAdminReservations() {
  const tbody = document.getElementById('reservations-tbody');
  if (!tbody) return;
  const statusFilter = document.getElementById('filter-res-status')?.value || '';
  try {
    const list = await api('/reservations' + (statusFilter ? '?status=' + statusFilter : ''));
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding:24px;">Không có phiếu đặt bàn nào</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(r => {
      let badge = '<span class="badge">PENDING</span>';
      if (r.status === 'CONFIRMED') badge = '<span class="badge badge-point">ĐÃ XÁC NHẬN</span>';
      else if (r.status === 'CHECKED_IN') badge = '<span class="badge badge-success">ĐÃ NHẬN BÀN</span>';
      else if (r.status === 'COMPLETED') badge = '<span class="badge">HOÀN TẤT</span>';
      else if (r.status === 'CANCELLED') badge = '<span class="badge badge-danger">ĐÃ HỦY</span>';

      const actions = [];
      if (r.status === 'PENDING') {
        actions.push(`<button class="btn btn-sm btn-primary" onclick="setReservationStatus(${r.id}, 'CONFIRMED', ${r.table_id || 'null'})">Duyệt</button>`);
        actions.push(`<button class="btn btn-sm btn-outline text-danger" onclick="setReservationStatus(${r.id}, 'CANCELLED', ${r.table_id || 'null'})">Hủy</button>`);
      } else if (r.status === 'CONFIRMED') {
        actions.push(`<button class="btn btn-sm btn-success" onclick="setReservationStatus(${r.id}, 'CHECKED_IN', ${r.table_id || 'null'})">Nhận khách</button>`);
        actions.push(`<button class="btn btn-sm btn-outline text-danger" onclick="setReservationStatus(${r.id}, 'CANCELLED', ${r.table_id || 'null'})">Hủy</button>`);
      } else if (r.status === 'CHECKED_IN') {
        actions.push(`<button class="btn btn-sm btn-outline" onclick="openPosForTable(${r.table_id || 'null'})">Mở POS</button>`);
        actions.push(`<button class="btn btn-sm btn-secondary" onclick="setReservationStatus(${r.id}, 'COMPLETED', ${r.table_id || 'null'})">Xong</button>`);
      }

      const areaText = r.area_preference === 'INDOOR' ? 'T1 - Máy lạnh' : (r.area_preference === 'OUTDOOR' ? 'T2 - Sân vườn' : 'Phòng VIP');
      const tableText = r.table_number ? `<strong>${r.table_number}</strong> (${r.table_name || ''})` : `<span class="text-muted">${areaText}</span>`;

      return `
        <tr>
          <td><strong style="font-family:monospace; color:#E8618C;">${r.code}</strong></td>
          <td><strong>${r.customer_name}</strong> ${r.customer_tier ? `<br><small class="text-pink">${r.customer_tier}</small>` : ''}</td>
          <td>${r.phone}</td>
          <td><strong>${r.party_size}</strong> người</td>
          <td>${tableText}</td>
          <td>${r.reservation_time} • ${r.reservation_date}</td>
          <td style="max-width:200px; font-size:0.8rem; color:#6B7280;">${r.special_requests || '—'}</td>
          <td>${badge}</td>
          <td><div style="display:flex; gap:4px;">${actions.join('')}</div></td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    console.error('loadAdminReservations:', e);
  }
}

async function setReservationStatus(resId, status, tableId) {
  try {
    await api('/reservations/' + resId + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ status, table_id: tableId })
    });
    showMsg('Đã cập nhật trạng thái phiếu đặt bàn!');
    loadAdminTables();
  } catch (e) {
    showMsg(e.message, 'error');
  }
}

function openAddTableModal() {
  const num = prompt('Nhập mã bàn mới (VD: T1-06 hoặc VIP-03):');
  if (!num) return;
  const name = prompt('Nhập tên bàn (VD: Bàn Hoa Đào Ban Công):');
  if (!name) return;
  const area = prompt('Khu vực (INDOOR: Tầng 1, OUTDOOR: Tầng 2, VIP: Phòng VIP):', 'INDOOR');
  const cap = prompt('Sức chứa số người (VD: 4):', '4');

  api('/tables', {
    method: 'POST',
    body: JSON.stringify({
      table_number: num,
      name: name,
      area: area || 'INDOOR',
      capacity: parseInt(cap) || 4
    })
  }).then(res => {
    showMsg('Thêm bàn mới thành công!');
    loadAdminTables();
  }).catch(e => showMsg(e.message, 'error'));
}

// ════════════════════════════════════════════════════════════════════════════
// 13. HRM & PAYROLL MANAGEMENT (CHUẨN BỘ LUẬT LAO ĐỘNG 2019)
// ════════════════════════════════════════════════════════════════════════════
let allStaffMembers = [];

function switchStaffSubTab(tab) {
  ['list', 'timesheet', 'payroll'].forEach(t => {
    document.getElementById(`staff-subtab-${t}`)?.classList.toggle('hidden', t !== tab);
    document.getElementById(`staff-subtab-btn-${t}`)?.classList.toggle('active', t === tab);
  });
  if (tab === 'list') loadStaffList();
  if (tab === 'timesheet') loadStaffTimesheets();
  if (tab === 'payroll') loadStaffPayrolls();
}

async function loadStaffManagement() {
  const monthInput = document.getElementById('payroll-month-input');
  if (monthInput && !monthInput.value) {
    const d = new Date();
    monthInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  setTimesheetToday();
  await loadStaffList();
}

async function loadStaffList() {
  const posFilter = document.getElementById('filter-staff-position')?.value || 'ALL';
  const statusFilter = document.getElementById('filter-staff-status')?.value || 'ALL';
  const tbody = document.getElementById('staff-list-tbody');
  if (!tbody) return;

  try {
    const list = await api(`/staff?position=${posFilter}&status=${statusFilter}`);
    allStaffMembers = list;
    
    // Cập nhật KPI
    const totalStaffEl = document.getElementById('stat-total-staff');
    if (totalStaffEl) totalStaffEl.textContent = list.filter(s => s.status === 'ACTIVE').length;

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding:24px;">Chưa có nhân sự nào</td></tr>';
      return;
    }

    const posNames = {
      SERVER: '☕ Phục vụ bàn',
      BARISTA: '🍹 Pha chế (Barista)',
      CASHIER: '💵 Thu ngân',
      SHIFT_LEADER: '⭐ Trưởng ca',
      MANAGER: '👑 Quản lý quán'
    };

    tbody.innerHTML = list.map(s => {
      const isCompliant = parseFloat(s.hourly_rate) >= 23800;
      const posText = posNames[s.position] || s.position;
      const typeBadge = s.employment_type === 'PART_TIME'
        ? '<span class="tier-badge" style="background:#EEF2FF; color:#4F46E5; border:1px solid #C7D2FE;">Part-time</span>'
        : '<span class="tier-badge" style="background:#ECFDF5; color:#059669; border:1px solid #A7F3D0;">Full-time</span>';

      const statusBadge = s.status === 'ACTIVE'
        ? '<span class="badge badge-success">Đang làm</span>'
        : (s.status === 'ON_LEAVE' ? '<span class="badge badge-warning">Nghỉ phép</span>' : '<span class="badge badge-danger">Đã nghỉ</span>');

      return `
        <tr>
          <td><strong>${s.code}</strong></td>
          <td>
            <div style="font-weight:600; color:#3E2723;">${s.full_name}</div>
            <small class="text-muted">${s.gender} • Vào làm: ${s.start_date || 'N/A'}</small>
          </td>
          <td>
            <div>📞 ${s.phone}</div>
            <small class="text-muted">CCCD: ${s.citizen_id}</small>
          </td>
          <td>${posText}</td>
          <td>${typeBadge}</td>
          <td>
            <div style="font-weight:700; color:#059669;">${fmt(s.hourly_rate)} đ/h</div>
            ${isCompliant ? '<small style="color:#059669;">✓ Chuẩn Vùng I</small>' : '<small style="color:#DC2626;">⚠️ Dưới sàn luật</small>'}
          </td>
          <td>
            <div style="font-size:0.82rem;">${s.contract_duration || '6 tháng'}</div>
            <small class="text-muted">${s.bank_name ? `${s.bank_name}: ${s.bank_account}` : 'Chưa có STK'}</small>
          </td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="openEditStaffModal(${s.id})">Sửa</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    showMsg('Lỗi tải nhân sự: ' + e.message, 'error');
  }
}

function openAddStaffModal() {
  document.getElementById('staff-modal-title').textContent = '👔 Thêm Hồ Sơ Nhân Viên Mới';
  document.getElementById('staff-form-id').value = '';
  document.getElementById('staff-form-code').value = 'NV' + String(allStaffMembers.length + 1).padStart(3, '0');
  document.getElementById('staff-form-name').value = '';
  document.getElementById('staff-form-phone').value = '';
  document.getElementById('staff-form-cccd').value = '';
  document.getElementById('staff-form-position').value = 'SERVER';
  document.getElementById('staff-form-type').value = 'PART_TIME';
  document.getElementById('staff-form-rate').value = 25000;
  document.getElementById('staff-form-bank-acc').value = '';
  document.getElementById('staff-form-bank-name').value = 'MB Bank';
  document.getElementById('staff-form-start-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('staff-form-contract').value = 'Part-time 6 tháng (Kèm PC BHXH 21.5%)';
  document.getElementById('staff-form-error').style.display = 'none';
  document.getElementById('staff-modal').classList.remove('hidden');
}

function openEditStaffModal(id) {
  const staff = allStaffMembers.find(s => s.id === id);
  if (!staff) return;

  document.getElementById('staff-modal-title').textContent = '✏️ Chỉnh Sửa Hồ Sơ Nhân Viên ' + staff.code;
  document.getElementById('staff-form-id').value = staff.id;
  document.getElementById('staff-form-code').value = staff.code;
  document.getElementById('staff-form-code').readOnly = true;
  document.getElementById('staff-form-name').value = staff.full_name;
  document.getElementById('staff-form-phone').value = staff.phone;
  document.getElementById('staff-form-cccd').value = staff.citizen_id;
  document.getElementById('staff-form-position').value = staff.position;
  document.getElementById('staff-form-type').value = staff.employment_type;
  document.getElementById('staff-form-rate').value = staff.hourly_rate;
  document.getElementById('staff-form-bank-acc').value = staff.bank_account || '';
  document.getElementById('staff-form-bank-name').value = staff.bank_name || '';
  document.getElementById('staff-form-start-date').value = staff.start_date ? staff.start_date.slice(0, 10) : '';
  document.getElementById('staff-form-contract').value = staff.contract_duration || '';
  document.getElementById('staff-form-error').style.display = 'none';
  document.getElementById('staff-modal').classList.remove('hidden');
}

function closeStaffModal() {
  document.getElementById('staff-modal').classList.add('hidden');
  document.getElementById('staff-form-code').readOnly = false;
}

async function submitStaffForm(e) {
  e.preventDefault();
  const id = document.getElementById('staff-form-id').value;
  const rate = parseFloat(document.getElementById('staff-form-rate').value);

  if (rate < 23800) {
    const err = document.getElementById('staff-form-error');
    err.textContent = '❌ Mức lương giờ không được thấp hơn 23.800 đ/giờ (chuẩn Vùng I theo Nghị định 74/2024/NĐ-CP)!';
    err.style.display = 'block';
    return;
  }

  const payload = {
    code: document.getElementById('staff-form-code').value,
    full_name: document.getElementById('staff-form-name').value,
    phone: document.getElementById('staff-form-phone').value,
    citizen_id: document.getElementById('staff-form-cccd').value,
    position: document.getElementById('staff-form-position').value,
    employment_type: document.getElementById('staff-form-type').value,
    hourly_rate: rate,
    bank_account: document.getElementById('staff-form-bank-acc').value,
    bank_name: document.getElementById('staff-form-bank-name').value,
    start_date: document.getElementById('staff-form-start-date').value,
    contract_duration: document.getElementById('staff-form-contract').value
  };

  try {
    if (id) {
      await api(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showMsg('Cập nhật nhân viên thành công!');
    } else {
      await api('/staff', { method: 'POST', body: JSON.stringify(payload) });
      showMsg('Thêm nhân viên mới thành công (Đạt chuẩn BLLĐ)!');
    }
    closeStaffModal();
    loadStaffList();
  } catch (err) {
    const errDiv = document.getElementById('staff-form-error');
    errDiv.textContent = err.message;
    errDiv.style.display = 'block';
  }
}

function setTimesheetToday() {
  const dateInput = document.getElementById('filter-timesheet-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().slice(0, 10);
    loadStaffTimesheets();
  }
}

async function loadStaffTimesheets() {
  const date   = document.getElementById('filter-timesheet-date')?.value || '';
  const shift  = document.getElementById('filter-timesheet-shift')?.value || 'ALL';
  const status = document.getElementById('filter-timesheet-status')?.value || 'ALL';
  const tbody  = document.getElementById('staff-timesheet-tbody');
  if (!tbody) return;

  try {
    const list = await api(`/staff/timesheets?date=${date}&shift_type=${shift}&status=${status}`);
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted" style="padding:24px;">Không tìm thấy ca làm việc phù hợp với bộ lọc</td></tr>';
      return;
    }

    const shiftBadges = {
      MORNING: '<span class="tier-badge" style="background:#FEF3C7; color:#B45309; border:1px solid #FDE68A; font-weight:700;">🌅 Ca Sáng (07:00 - 12:30)</span>',
      NIGHT: '<span class="tier-badge" style="background:#EDE9FE; color:#6D28D9; border:1px solid #DDD6FE; font-weight:700;">🌙 Ca Tối (17:30 - 23:30)</span>',
      AFTERNOON: '<span class="tier-badge" style="background:#E0F2FE; color:#0369A1; border:1px solid #BAE6FD; font-weight:700;">☀️ Ca Chiều</span>',
      CUSTOM: '<span class="tier-badge">Linh hoạt</span>'
    };

    const posNames = {
      MANAGER: '<span style="color:#B45309; font-weight:700;">👑 Quản lý</span>',
      BARISTA: '<span style="color:#059669; font-weight:700;">🍹 Pha chế</span>',
      CASHIER: '<span style="color:#2563EB; font-weight:700;">💵 Thu ngân</span>',
      SERVER: '<span style="color:#4B5563;">☕ Phục vụ</span>'
    };

    tbody.innerHTML = list.map(t => {
      const isWorking = t.status === 'WORKING';
      const inTime = new Date(t.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const outTime = t.check_out ? new Date(t.check_out).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';

      return `
        <tr>
          <td><strong>#${t.id}</strong></td>
          <td>
            <div style="font-weight:600; color:#3E2723;">${t.staff_name}</div>
            <small class="text-muted">${t.staff_code}</small>
          </td>
          <td>${posNames[t.position] || t.position}</td>
          <td>${shiftBadges[t.shift_type] || t.shift_type}</td>
          <td><span style="color:#059669; font-weight:700; font-size:0.95rem;">${inTime}</span></td>
          <td><span style="color:#2563EB; font-weight:700; font-size:0.95rem;">${outTime}</span></td>
          <td><strong>${t.total_hours || 0}h</strong></td>
          <td>
            ${parseFloat(t.night_hours) > 0 ? `<span class="badge badge-warning" style="background:#FFFBEB; color:#B45309; border:1px solid #FCD34D;">+${t.night_hours}h (+30%)</span>` : '<span class="text-muted">0h</span>'}
          </td>
          <td>
            ${isWorking ? '<span class="badge badge-warning" style="background:#FEF3C7; color:#92400E;">Đang trong ca</span>' : '<span class="badge badge-success">Đã hoàn thành</span>'}
          </td>
          <td class="small text-muted" style="max-width: 220px;">${t.note || ''}</td>
          <td>
            ${isWorking ? `<button class="btn btn-sm btn-primary" onclick="checkoutShift(${t.id})">⏹️ Kết thúc ca</button>` : '<span style="color:#059669; font-weight:600;">✓ Đã chốt</span>'}
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    showMsg('Lỗi tải chấm công: ' + e.message, 'error');
  }
}

async function openCheckinModal() {
  const sel = document.getElementById('checkin-staff-select');
  if (!sel) return;
  if (!allStaffMembers.length) {
    allStaffMembers = await api('/staff');
  }
  sel.innerHTML = allStaffMembers
    .filter(s => s.status === 'ACTIVE')
    .map(s => `<option value="${s.id}">${s.code} - ${s.full_name} (${s.position} - ${fmt(s.hourly_rate)}đ/h)</option>`)
    .join('');
  document.getElementById('checkin-modal').classList.remove('hidden');
}

function closeCheckinModal() {
  document.getElementById('checkin-modal').classList.add('hidden');
}

async function submitCheckinForm(e) {
  e.preventDefault();
  const staffId = document.getElementById('checkin-staff-select').value;
  const shiftType = document.getElementById('checkin-shift-type').value;
  const note = document.getElementById('checkin-note').value;

  try {
    await api('/staff/timesheets/checkin', {
      method: 'POST',
      body: JSON.stringify({ staff_id: staffId, shift_type: shiftType, note })
    });
    showMsg('Chấm công vào ca thành công!');
    closeCheckinModal();
    loadStaffTimesheets();
  } catch (err) {
    showMsg(err.message, 'error');
  }
}

async function checkoutShift(id) {
  if (!confirm('Xác nhận kết thúc ca làm việc này và tính tổng giờ công?')) return;
  try {
    const res = await api(`/staff/timesheets/${id}/checkout`, { method: 'POST' });
    showMsg(res.message);
    loadStaffTimesheets();
  } catch (err) {
    showMsg(err.message, 'error');
  }
}

async function loadStaffPayrolls() {
  const month = document.getElementById('payroll-month-input')?.value || new Date().toISOString().slice(0, 7);
  const tbody = document.getElementById('staff-payroll-tbody');
  if (!tbody) return;

  try {
    const list = await api(`/staff/payrolls?month_year=${month}`);
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted" style="padding:24px;">Chưa có dữ liệu bảng lương tháng ${month}. Vui lòng bấm "⚡ Tính Lương Tự Động".</td></tr>`;
      return;
    }

    let totalPayrollAmount = 0;
    let totalWorkHours = 0;

    tbody.innerHTML = list.map(p => {
      totalPayrollAmount += parseFloat(p.net_salary) || 0;
      totalWorkHours += parseFloat(p.total_regular_hours) || 0;

      const isPaid = p.payment_status === 'PAID';
      const statusBadge = isPaid
        ? '<span class="badge badge-success">✓ Đã chi trả</span>'
        : '<span class="badge badge-warning">Chờ thanh toán</span>';

      return `
        <tr>
          <td><strong>${p.staff_code}</strong></td>
          <td><div style="font-weight:600; color:#3E2723;">${p.staff_name}</div></td>
          <td>
            <small>${p.position} • <strong>${p.employment_type}</strong></small>
          </td>
          <td><strong>${p.total_regular_hours}h</strong></td>
          <td>${fmt(p.hourly_rate)} đ</td>
          <td>${fmt(p.base_pay)} đ</td>
          <td style="color:#D97706;">+${fmt(p.night_pay)} đ</td>
          <td style="color:#4F46E5;">+${fmt(p.insurance_allowance)} đ</td>
          <td style="font-weight:800; color:#E8618C; font-size:1.05rem;">
            ${fmt(p.net_salary)} đ
          </td>
          <td>${statusBadge}</td>
          <td>
            ${!isPaid
              ? `<button class="btn btn-sm btn-primary" onclick="payStaffPayroll(${p.id}, '${p.staff_name}', ${p.net_salary})">💵 Chi trả lương</button>`
              : `<small class="text-muted">${p.paid_at ? new Date(p.paid_at).toLocaleDateString('vi-VN') : 'Đã thanh toán'}</small>`
            }
          </td>
        </tr>
      `;
    }).join('');

    const hoursEl = document.getElementById('stat-total-hours');
    if (hoursEl) hoursEl.textContent = `${totalWorkHours}h`;
    const payEl = document.getElementById('stat-total-payroll');
    if (payEl) payEl.textContent = `${fmt(totalPayrollAmount)} đ`;
  } catch (e) {
    showMsg('Lỗi tải bảng lương: ' + e.message, 'error');
  }
}

async function calculateAutoPayroll() {
  const month = document.getElementById('payroll-month-input')?.value || new Date().toISOString().slice(0, 7);
  try {
    const res = await api('/staff/payrolls/calculate', {
      method: 'POST',
      body: JSON.stringify({ month_year: month })
    });
    showMsg(`🎉 ${res.message}`);
    loadStaffPayrolls();
  } catch (e) {
    showMsg(e.message, 'error');
  }
}

async function payStaffPayroll(id, name, amount) {
  if (!confirm(`Xác nhận chi trả lương ${fmt(amount)}đ cho nhân viên ${name}?`)) return;
  try {
    await api(`/staff/payrolls/${id}/pay`, { method: 'PATCH' });
    showMsg(`Đã xác nhận thanh toán lương cho ${name}!`);
    loadStaffPayrolls();
  } catch (e) {
    showMsg(e.message, 'error');
  }
}


