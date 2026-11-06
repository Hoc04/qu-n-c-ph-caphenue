/**
 * caPHEnue - API Client (Frontend → Backend)
 * Kết nối tới http://localhost:3000/api
 */

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api'
  : '/api';
let API_ONLINE = false;

// ── HELPER ───────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  if (typeof options === 'string') {
    options = { method: options };
  }
  const url = `${API_BASE}${path}`;
  const token = localStorage.getItem('admin_token') || localStorage.getItem('customer_token') || '';
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': 'caphenue_api_key_2026',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const res = await fetch(url, {
    ...options,
    headers
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Phản hồi không hợp lệ (${res.status}): ${text.slice(0, 100)}`);
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── CONNECTIVITY CHECK ────────────────────────────────────────────────────────
async function checkApiStatus() {
  try {
    await apiFetch('/ping');
    API_ONLINE = true;
    updateApiStatusBar(true);
  } catch {
    API_ONLINE = false;
    updateApiStatusBar(false);
  }
}

function updateApiStatusBar(online) {
  let bar = document.getElementById('api-status-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'api-status-bar';
    bar.className = 'api-status-bar';
    document.body.appendChild(bar);
  }
  bar.innerHTML = `
    <div class="api-dot ${online ? '' : 'offline'}"></div>
    Backend: ${online ? '🟢 Kết nối OK' : '🔴 Offline (dùng dữ liệu mẫu)'}
  `;
}

function showToast(msg, type = 'success', duration = 3500) {
  const t = document.createElement('div');
  t.className = `toast-notification ${type}`;
  t.innerHTML = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

// ── PRODUCTS ─────────────────────────────────────────────────────────────────
async function apiGetProducts(category = 'ALL') {
  if (!API_ONLINE) return null;
  const qs = category !== 'ALL' ? `?category=${encodeURIComponent(category)}` : '';
  return await apiFetch(`/products${qs}`);
}

// ── PROMOTIONS ────────────────────────────────────────────────────────────────
async function apiGetPromotions() {
  if (!API_ONLINE) return null;
  return await apiFetch('/promotions');
}

async function apiValidatePromo(code, subtotal) {
  return await apiFetch('/promotions/validate', {
    method: 'POST',
    body: JSON.stringify({ code, subtotal })
  });
}

// ── REWARDS & VOUCHERS (1 ĐIỂM = 400Đ) ───────────────────────────────────────
async function apiGetRewards() {
  if (!API_ONLINE) return null;
  return await apiFetch('/rewards');
}

async function apiRedeemReward(rewardId, customerId) {
  return await apiFetch(`/rewards/${rewardId}/redeem`, {
    method: 'POST',
    body: JSON.stringify({ customer_id: customerId })
  });
}

// Xác thực & áp dụng mã Voucher (UD-XXXX) tại quầy / online
async function apiApplyVoucher(code, subtotal, customerId = null, markUsed = true) {
  return await apiFetch('/vouchers/apply', {
    method: 'POST',
    body: JSON.stringify({
      code,
      subtotal,
      customer_id: customerId,
      mark_used: markUsed
    })
  });
}

// ── CUSTOMERS & ĐIỀU CHỈNH ĐIỂM THỦ CÔNG ─────────────────────────────────────
async function apiLookupCustomer(phone) {
  return await apiFetch(`/customers/lookup?phone=${encodeURIComponent(phone)}`);
}

async function apiRegisterCustomer(data) {
  return await apiFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function apiGetCustomers(search = '', tier = '') {
  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  if (tier)   qs.set('tier', tier);
  return await apiFetch(`/customers?${qs.toString()}`);
}

// Cộng / trừ điểm thủ công kèm lý do (Admin)
async function apiAdjustCustomerPoints(customerId, points, reason, createdBy = 1) {
  return await apiFetch(`/customers/${customerId}/adjust-points`, {
    method: 'POST',
    body: JSON.stringify({
      points: parseInt(points),
      reason,
      description: reason,
      created_by: createdBy
    })
  });
}

// ── ORDERS (CHỐNG GIẢM GIÁ KÉP - NO DOUBLE-DIPPING) ──────────────────────────
async function apiCreateOrder(orderData) {
  return await apiFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
}

async function apiGetOrders(limit = 50, channel = '', customerId = '') {
  const qs = new URLSearchParams();
  if (limit)      qs.set('limit', limit);
  if (channel)    qs.set('channel', channel);
  if (customerId) qs.set('customer_id', customerId);
  return await apiFetch(`/orders?${qs.toString()}`);
}

// ── AUTH & TÀI KHOẢN NHÂN VIÊN ───────────────────────────────────────────────
async function apiAdminLogin(username, password) {
  return await apiFetch('/auth/admin', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

async function apiCustomerLogin(phone, password) {
  return await apiFetch('/auth/customer', {
    method: 'POST',
    body: JSON.stringify({ phone, password })
  });
}

async function apiGetUsers() {
  return await apiFetch('/users');
}

async function apiChangeUserPassword(userId, newPassword) {
  return await apiFetch(`/users/${userId}/password`, {
    method: 'PUT',
    body: JSON.stringify({ new_password: newPassword })
  });
}

// ── REPORTS & DASHBOARD ──────────────────────────────────────────────────────
async function apiGetReportsDashboard() {
  if (!API_ONLINE) return null;
  return await apiFetch('/reports/dashboard');
}

async function apiGetDashboard() {
  if (!API_ONLINE) return null;
  return await apiFetch('/reports/dashboard');
}

// ── TIERS ────────────────────────────────────────────────────────────────────
async function apiGetTiers() {
  if (!API_ONLINE) return null;
  return await apiFetch('/tiers');
}

// ── DINING TABLES & RESERVATIONS (SƠ ĐỒ BÀN & ĐẶT CHỖ) ───────────────────────
async function apiGetTables(area = '', status = '') {
  const qs = new URLSearchParams();
  if (area) qs.set('area', area);
  if (status) qs.set('status', status);
  return await apiFetch(`/tables?${qs.toString()}`);
}

async function apiUpdateTableStatus(tableId, status) {
  return await apiFetch(`/tables/${tableId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

async function apiGetReservations(status = '', date = '', search = '') {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (date)   qs.set('date', date);
  if (search) qs.set('search', search);
  return await apiFetch(`/reservations?${qs.toString()}`);
}

async function apiCreateReservation(resData) {
  return await apiFetch('/reservations', {
    method: 'POST',
    body: JSON.stringify(resData)
  });
}

async function apiUpdateReservationStatus(resId, status, tableId = null) {
  return await apiFetch(`/reservations/${resId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, table_id: tableId })
  });
}

