/**
 * caPHEnue - Client & Admin Portal Logic
 * Quản Lý Khách Hàng Thân Thiết Quán Cà Phê
 */

// ==================== DỮ LIỆU KHỞI TẠO (STATE) ====================
const DB = {
  tiers: [
    { id: 1, name: "Đồng", minPoints: 0, discountPercent: 0, pointMultiplier: 1.0, count: 850 },
    { id: 2, name: "Bạc", minPoints: 200, discountPercent: 2.0, pointMultiplier: 1.1, count: 260 },
    { id: 3, name: "Vàng", minPoints: 500, discountPercent: 5.0, pointMultiplier: 1.2, count: 112 },
    { id: 4, name: "Kim cương", minPoints: 1000, discountPercent: 8.0, pointMultiplier: 1.5, count: 26 }
  ],

  customers: [
    {
      id: 1,
      code: "KH0001",
      fullName: "Trần Thanh Hải",
      phone: "0912345678",
      password: "123456",
      email: "hai.tran@gmail.com",
      tier: "Vàng",
      tierId: 3,
      pointsBalance: 540,
      lifetimePoints: 760,
      status: "ACTIVE",
      createdAt: "2026-03-15",
      vouchers: [
        { code: "UD-7K3F9A", name: "Voucher giảm 20.000đ", value: 20000, status: "ISSUED", createdAt: "2026-10-24" }
      ],
      history: [
        { date: "2026-10-25 15:30", type: "EARN", points: "+14", balanceAfter: 540, desc: "Tích điểm từ hóa đơn HD20261025-0042" },
        { date: "2026-10-20 09:15", type: "REDEEM", points: "-50", balanceAfter: 526, desc: "Đổi Voucher giảm giá 20.000đ" },
        { date: "2026-10-14 11:45", type: "EARN", points: "+18", balanceAfter: 576, desc: "Tích điểm từ hóa đơn HD20261014-0019" }
      ]
    },
    {
      id: 2,
      code: "KH0002",
      fullName: "Nguyễn Thị Mai",
      phone: "0987654321",
      password: "123456",
      email: "mai.nguyen@gmail.com",
      tier: "Bạc",
      tierId: 2,
      pointsBalance: 210,
      lifetimePoints: 290,
      status: "ACTIVE",
      createdAt: "2026-04-10",
      vouchers: [],
      history: [
        { date: "2026-10-24 14:10", type: "EARN", points: "+9", balanceAfter: 210, desc: "Tích điểm từ hóa đơn HD20261024-0021" }
      ]
    },
    {
      id: 3,
      code: "KH0003",
      fullName: "Lê Hoàng Nam",
      phone: "0905111222",
      password: "123456",
      email: "nam.le@gmail.com",
      tier: "Kim cương",
      tierId: 4,
      pointsBalance: 1150,
      lifetimePoints: 1420,
      status: "ACTIVE",
      createdAt: "2026-01-08",
      vouchers: [],
      history: [
        { date: "2026-10-26 10:00", type: "EARN", points: "+27", balanceAfter: 1150, desc: "Tích điểm từ hóa đơn HD20261026-0005" }
      ]
    },
    {
      id: 4,
      code: "KH0004",
      fullName: "Phạm Thu Thảo",
      phone: "0933444555",
      password: "123456",
      email: "thao.pham@gmail.com",
      tier: "Đồng",
      tierId: 1,
      pointsBalance: 85,
      lifetimePoints: 85,
      status: "ACTIVE",
      createdAt: "2026-09-02",
      vouchers: [],
      history: [
        { date: "2026-10-22 16:40", type: "EARN", points: "+8", balanceAfter: 85, desc: "Tích điểm từ hóa đơn HD20261022-0033" }
      ]
    }
  ],

  products: [
    { id: 1, name: "Cà phê sữa đá caPHEnue", category: "Cà phê", price: 29000, emoji: "☕", imageUrl: "images/products/caphe_suada.jpg", description: "Hương cà phê Robusta đậm đà, béo ngậy vị sữa đặc", isActive: true },
    { id: 2, name: "Cà phê đen đá", category: "Cà phê", price: 25000, emoji: "🖤", imageUrl: "images/products/caphe_denda.jpg", description: "Tinh túy cà phê Việt - đen, đậm, mạnh cho ngày mới", isActive: true },
    { id: 3, name: "Bạc xỉu hoa đào", category: "Cà phê", price: 35000, emoji: "🌸", imageUrl: "images/products/bac_xiu.jpg", description: "Cà phê sữa nhẹ nhàng phảng phất hương hoa đào", isActive: true },
    { id: 4, name: "Cà phê muối béo", category: "Cà phê", price: 38000, emoji: "🧂", imageUrl: "images/products/caphe_muoi.jpg", description: "Vị cà phê quyện muối biển và kem béo ngậy", isActive: true },
    { id: 5, name: "Trà đào cam sả", category: "Trà hoa quả", price: 45000, emoji: "🍑", imageUrl: "images/products/tra_dao.jpg", description: "Trà thanh mát kết hợp đào tươi, cam vàng và sả", isActive: true },
    { id: 6, name: "Trà vải hoa hồng", category: "Trà hoa quả", price: 45000, emoji: "🌹", imageUrl: "images/products/tra_vai.jpg", description: "Vải thiều tươi ướp hoa hồng thanh nhã", isActive: true },
    { id: 7, name: "Trà ô long sen vàng", category: "Trà hoa quả", price: 42000, emoji: "🍵", imageUrl: "images/products/tra_olong.jpg", description: "Trà ô long thượng hạng hương sen vàng", isActive: true },
    { id: 8, name: "Bánh Croissant bơ tỏi", category: "Bánh ngọt", price: 32000, emoji: "🥐", imageUrl: "images/products/croissant.jpg", description: "Croissant Pháp giòn xốp bơ tỏi thơm lừng", isActive: true },
    { id: 9, name: "Bánh Tiramisu caPHEnue", category: "Bánh ngọt", price: 39000, emoji: "🎂", imageUrl: "images/products/tiramisu.jpg", description: "Espresso Mascarpone Ý nguyên chất", isActive: true },
    { id: 10, name: "Mousse đào hồng", category: "Bánh ngọt", price: 42000, emoji: "🍰", imageUrl: "images/products/mousse_dao.jpg", description: "Mousse đào hồng tan mịn trong miệng", isActive: true },
    { id: 11, name: "Cà phê trứng kem béo", category: "Cà phê", price: 39000, emoji: "🍳", imageUrl: "images/products/caphe_trung.jpg", description: "Cà phê phin truyền thống phủ lớp kem trứng béo ngậy thơm lừng chuẩn vị Hà Nội", isActive: true },
    { id: 12, name: "Trà mãng cầu hạt đác", category: "Trà hoa quả", price: 45000, emoji: "🍈", imageUrl: "images/products/tra_mang_cau.jpg", description: "Trà hoa quả hot trend kết hợp mãng cầu chua ngọt và hạt đác giòn dẻo", isActive: true },
    { id: 13, name: "Bánh phô mai nướng Basque", category: "Bánh ngọt", price: 45000, emoji: "🧀", imageUrl: "images/products/cheesecake_basque.jpg", description: "Basque Burnt Cheesecake cháy xém thơm bùi, nhân phô mai béo ngậy tan chảy", isActive: true },
    { id: 14, name: "Bánh su kem Choux Craquelin", category: "Bánh ngọt", price: 22000, emoji: "🧁", imageUrl: "images/products/banh_su_kem.jpg", description: "Vỏ su giòn rụm Craquelin kiểu Pháp, ngập tràn nhân kem trứng custard béo ngậy thanh mát.", isActive: true },
    { id: 15, name: "Cookie Socola hạt phỉ giòn", category: "Bánh ngọt", price: 25000, emoji: "🍪", imageUrl: "images/products/cookie_socola.jpg", description: "Bánh quy bơ nướng giòn tan kết hợp socola đen chip và hạt phỉ rang thơm bùi hấp dẫn.", isActive: true },
    { id: 16, name: "Bánh Muffin việt quất tươi", category: "Bánh ngọt", price: 28000, emoji: "🧁", imageUrl: "images/products/muffin_vietquat.jpg", description: "Cốt bánh muffin bơ sữa xốp mềm, hòa quyện từng quả việt quất tươi chua ngọt mọng nước.", isActive: true },
    { id: 17, name: "Bánh bông lan trứng muối mini", category: "Bánh ngọt", price: 29000, emoji: "🍰", imageUrl: "images/products/bonglan_trungmuoi.jpg", description: "Cốt bông lan Chiffon mềm mịn tan trong miệng, phủ sốt bơ kim sa và trứng muối béo ngậy.", isActive: true },
    { id: 18, name: "Bánh Mille Crepe Matcha Nhật Bản", category: "Bánh ngọt", price: 49000, emoji: "🍵", imageUrl: "images/products/crepe_matcha.jpg", description: "Tuyệt tác 20 lớp bánh crepe siêu mỏng xếp tầng cùng kem tươi trà xanh Uji Kyoto thượng hạng.", isActive: true },
    { id: 19, name: "Bánh Red Velvet nhung đỏ dâu tây", category: "Bánh ngọt", price: 52000, emoji: "🍓", imageUrl: "images/products/red_velvet.jpg", description: "Sắc đỏ nhung quý phái quyện cùng lớp kem phô mai Cream Cheese béo chua nhẹ và dâu tươi.", isActive: true },
    { id: 20, name: "Tart phúc bồn tử phô mai hoàng gia", category: "Bánh ngọt", price: 55000, emoji: "🫐", imageUrl: "images/products/tart_phucbontu.jpg", description: "Đế tart nướng bơ Pháp giòn rụm, kem phô mai Mascarpone mịn màng phủ đầy quả mâm xôi tươi.", isActive: true },
    { id: 21, name: "Macaron hoa đào cao cấp (Hộp 3 vị)", category: "Bánh ngọt", price: 56000, emoji: "🌸", imageUrl: "images/products/macaron_hoadao.jpg", description: "Hộp 3 bánh macaron bột hạnh nhân giòn tan vị hoa đào caPHEnue, hạt dẻ cười Pistachio và socola.", isActive: true },
    { id: 22, name: "Bánh Lava Socola Bỉ tan chảy", category: "Bánh ngọt", price: 58000, emoji: "🍫", imageUrl: "images/products/lava_socola.jpg", description: "Bánh nướng nóng hổi với dòng sốt socola đen nguyên chất 70% tuôn trào quyến rũ bất tận.", isActive: true }
  ],

  promotions: [
    {
      id: 1,
      code: "HE2026",
      name: "Chào hè rực rỡ 2026",
      type: "PERCENT",
      value: 10,
      minOrderValue: 60000,
      startDate: "2026-06-01",
      endDate: "2026-11-30",
      usageLimit: 500,
      usedCount: 142,
      isActive: true
    },
    {
      id: 2,
      code: "COFFEE30",
      name: "Giảm 30K cho hội viên",
      type: "AMOUNT",
      value: 30000,
      minOrderValue: 120000,
      startDate: "2026-10-01",
      endDate: "2026-11-15",
      usageLimit: 200,
      usedCount: 78,
      isActive: true
    },
    {
      id: 3,
      code: "X2POINT",
      name: "Cuối tuần nhân đôi điểm tích lũy",
      type: "POINT_MULTIPLIER",
      value: 2.0,
      minOrderValue: 50000,
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      usageLimit: 1000,
      usedCount: 310,
      isActive: true
    }
  ],

  rewards: [
    { id: 1, name: "Voucher giảm 20.000đ", type: "AMOUNT", value: 20000, pointsCost: 50, stock: 150, isActive: true },
    { id: 2, name: "Voucher giảm 50.000đ", type: "AMOUNT", value: 50000, pointsCost: 100, stock: 80, isActive: true },
    { id: 3, name: "01 Ly Cà phê muối béo free", type: "FREE_ITEM", value: 38000, pointsCost: 80, stock: 60, isActive: true },
    { id: 4, name: "01 Ly Trà đào cam sả free", type: "FREE_ITEM", value: 45000, pointsCost: 90, stock: 45, isActive: true },
    { id: 5, name: "01 Bánh Croissant bơ tỏi", type: "FREE_ITEM", value: 32000, pointsCost: 70, stock: 30, isActive: true },
    { id: 6, name: "Voucher giảm 100.000đ (VIP)", type: "AMOUNT", value: 100000, pointsCost: 180, stock: 20, isActive: true }
  ],

  orders: [
    {
      id: 101,
      code: "HD20261026-0001",
      customerName: "Trần Thanh Hải",
      phone: "0912345678",
      tier: "Vàng",
      createdAt: "2026-10-26 08:30",
      subtotal: 112000,
      tierDiscount: 5600,
      promoDiscount: 10640,
      rewardDiscount: 0,
      total: 95760,
      pointsEarned: 11,
      paymentMethod: "TRANSFER",
      channel: "POS",
      status: "COMPLETED",
      items: [
        { name: "Cà phê muối béo", qty: 2, price: 38000 },
        { name: "Bánh Croissant bơ tỏi", qty: 1, price: 32000 }
      ]
    },
    {
      id: 102,
      code: "HD20261026-0002",
      customerName: "Khách vãng lai",
      phone: "-",
      tier: "-",
      createdAt: "2026-10-26 09:15",
      subtotal: 58000,
      tierDiscount: 0,
      promoDiscount: 0,
      rewardDiscount: 0,
      total: 58000,
      pointsEarned: 0,
      paymentMethod: "CASH",
      channel: "POS",
      status: "COMPLETED",
      items: [
        { name: "Cà phê sữa đá caPHEnue", qty: 2, price: 29000 }
      ]
    }
  ]
};

// ==================== TRẠNG THÁI TOÀN CỤC (GLOBAL STATE) ====================
// Khách hàng đang đăng nhập trên website ngoài (Mặc định null: Chưa đăng nhập, khách tự bấm Đăng Nhập / Đăng Ký)
let currentLoggedInClient = null; 

// State Đặt món Online trên Web ngoài
let onlineCart = [];
let onlineAppliedPromo = null;
let onlineAppliedReward = null;
let onlineCurrentCategory = 'ALL';

// State POS bán hàng tại quầy (Nội bộ Admin)
let posCurrentCustomer = null;
let posCart = [];
let posAppliedPromo = null;
let posAppliedReward = null;
let posCurrentCategory = 'ALL';

let lastIssuedVoucherCode = "";

// ==================== ROUTING / NAVIGATION ====================
function switchView(viewName) {
  const clientView = document.getElementById("client-view");
  const mainHeader = document.querySelector(".main-header");
  const mainFooter = document.querySelector(".main-footer");

  // Reset active nav
  document.querySelectorAll(".nav-link").forEach(el => el.classList.remove("active"));

  // Nếu vào admin → chuyển sang trang admin.html riêng
  if (viewName === 'admin-login' || viewName.startsWith('admin-')) {
    window.location.href = 'admin.html';
    return;
  }

  // Phân hệ Khách hàng (Client View - Frontend)
  if (clientView) clientView.classList.remove("hidden");
  if (mainHeader) mainHeader.classList.remove("hidden");
  if (mainFooter) mainFooter.classList.remove("hidden");

  document.querySelectorAll(".page-content").forEach(el => el.classList.remove("active"));

  if (viewName === 'home') {
    document.getElementById("section-home")?.classList.add("active");
    document.getElementById("nav-home")?.classList.add("active");
  } else if (viewName === 'order') {
    document.getElementById("section-order")?.classList.add("active");
    document.getElementById("nav-order")?.classList.add("active");
    renderOnlineProducts();
    updateOnlineCustomerUI();
    updateOnlineCartUI();
  } else if (viewName === 'booking') {
    document.getElementById("section-booking")?.classList.add("active");
    document.getElementById("nav-booking")?.classList.add("active");
    prefillBookingForm();
  } else if (viewName === 'promos') {
    document.getElementById("section-promos")?.classList.add("active");
    document.getElementById("nav-promos")?.classList.add("active");
  } else if (viewName === 'rewards') {
    document.getElementById("section-rewards")?.classList.add("active");
    document.getElementById("nav-rewards")?.classList.add("active");
    renderClientRewards();
  } else if (viewName === 'tiers') {
    document.getElementById("section-tiers")?.classList.add("active");
    document.getElementById("nav-tiers")?.classList.add("active");
  } else if (viewName === 'lookup') {
    document.getElementById("section-lookup")?.classList.add("active");
    document.getElementById("nav-lookup")?.classList.add("active");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openAdminTab(tabName) {
  document.querySelectorAll(".sidebar-menu .menu-item").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".admin-panel").forEach(el => el.classList.remove("active"));

  const targetTabBtn = document.getElementById(`tab-a${getTabCode(tabName)}-${tabName}`);
  if (targetTabBtn) targetTabBtn.classList.add("active");

  const targetPanel = document.getElementById(`admin-tab-${tabName}`);
  if (targetPanel) targetPanel.classList.add("active");

  if (tabName === 'dashboard') {
    setTimeout(drawRevenueChart, 100);
  }
}

function getTabCode(name) {
  const map = {
    pos: '5',
    orders: '6',
    dashboard: '2',
    customers: '3',
    tiers: '8',
    rewards: '9',
    promos: '10',
    products: '7',
    reports: '11',
    users: '12'
  };
  return map[name] || '';
}

// ==================== AUTHENTICATION ADMIN ====================
function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById("admin-user-input").value.trim();
  const roleBadge = document.getElementById("current-user-role");
  const nameLabel = document.getElementById("current-user-name");

  if (username === 'staff') {
    nameLabel.textContent = "Vũ Tiến Dũng";
    roleBadge.textContent = "STAFF";
  } else {
    nameLabel.textContent = "Trịnh Thanh Học";
    roleBadge.textContent = "ADMIN";
  }

  document.getElementById("admin-login-screen").classList.add("hidden");
  document.getElementById("admin-app-layout").classList.remove("hidden");
  document.querySelector(".main-header")?.classList.add("hidden");
  document.querySelector(".main-footer")?.classList.add("hidden");
  openAdminTab('pos');
}

function handleAdminLogout() {
  document.getElementById("admin-login-screen").classList.add("hidden");
  document.getElementById("admin-app-layout").classList.add("hidden");
  document.querySelector(".main-header")?.classList.remove("hidden");
  document.querySelector(".main-footer")?.classList.remove("hidden");
  switchView('home');
}

// ==================== AUTHENTICATION KHÁCH HÀNG (AVATAR TRÒN GỌN GÀNG) ====================
function getInitials(name) {
  if (!name) return '🌸';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function renderClientAuthUI() {
  const container = document.getElementById("client-auth-status");
  if (!container) return;

  if (currentLoggedInClient) {
    const voucherCount = (currentLoggedInClient.vouchers || []).filter(v => v.status === 'ISSUED').length;
    const initials = getInitials(currentLoggedInClient.fullName);

    container.innerHTML = `
      <div class="user-menu-wrapper" id="user-menu-wrapper">
        <!-- Avatar hình tròn logo gọn gàng, không chiếm diện tích header -->
        <button class="user-avatar-btn" onclick="toggleUserDropdown(event)" title="Tài khoản: ${currentLoggedInClient.fullName}">
          <span class="user-avatar-text">${initials}</span>
          <span class="user-status-dot" title="Đang hoạt động"></span>
        </button>

        <!-- Dropdown Menu Trang Cá Nhân & Đăng Xuất -->
        <div class="user-dropdown-menu hidden" id="user-dropdown-menu">
          <div class="dropdown-header">
            <div class="dropdown-user-info">
              <div class="dropdown-avatar-circle">🌸</div>
              <div class="dropdown-text">
                <div class="dropdown-name">${currentLoggedInClient.fullName}</div>
                <div class="dropdown-phone">${currentLoggedInClient.phone || ''}</div>
              </div>
            </div>
            <div class="dropdown-tier-card">
              <span class="badge badge-${currentLoggedInClient.tier.toLowerCase()}">Hạng ${currentLoggedInClient.tier}</span>
              <span class="dropdown-points-val"><strong class="text-pink">${currentLoggedInClient.pointsBalance}</strong> pts</span>
            </div>
          </div>

          <div class="dropdown-divider"></div>

          <div class="dropdown-body">
            <a href="javascript:void(0)" class="dropdown-item" onclick="openUserProfile()">
              <span class="dropdown-item-icon">👤</span>
              <span class="dropdown-item-text">Trang cá nhân &amp; Lịch sử tích điểm</span>
            </a>
            <a href="javascript:void(0)" class="dropdown-item" onclick="openMyVouchers()">
              <span class="dropdown-item-icon">🎟️</span>
              <span class="dropdown-item-text">Kho Voucher ưu đãi</span>
              <span class="dropdown-badge">${voucherCount}</span>
            </a>
          </div>

          <div class="dropdown-divider"></div>

          <div class="dropdown-footer">
            <button class="dropdown-item logout-btn" onclick="handleClientLogout()">
              <span class="dropdown-item-icon">🚪</span>
              <span class="dropdown-item-text">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <button class="btn btn-primary btn-sm" onclick="openClientAuthModal('client-login')">
        🌸 Đăng Nhập
      </button>
    `;
  }

  // Cập nhật banner trên trang Rewards nếu đang mở
  renderClientRewards();
}

function toggleUserDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById("user-dropdown-menu");
  if (menu) menu.classList.toggle("hidden");
}

function closeUserDropdown() {
  const menu = document.getElementById("user-dropdown-menu");
  if (menu) menu.classList.add("hidden");
}

function openUserProfile() {
  closeUserDropdown();
  switchView('lookup');
  if (currentLoggedInClient && currentLoggedInClient.phone) {
    const input = document.getElementById("lookup-phone-input");
    if (input) input.value = currentLoggedInClient.phone;
    handleCustomerLookup();
  }
}

function openMyVouchers() {
  closeUserDropdown();
  switchView('rewards');
  toggleMyVouchersBox(true);
}

// Bấm bất kỳ đâu bên ngoài sẽ tự động đóng dropdown
document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('user-menu-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    closeUserDropdown();
  }
});

// ==================== CỔNG ĐĂNG NHẬP THÀNH VIÊN (CHUẨN DOANH NGHIỆP) ====================
function openClientAuthModal(target = 'client-login') {
  if (target === 'admin' || target === 'admin-login') {
    window.location.href = 'admin.html';
    return;
  }
  const modal = document.getElementById("client-auth-modal");
  if (!modal) return;
  modal.classList.remove("hidden");

  if (target === 'client-register' || target === 'register') {
    switchClientAuthTab('client-register');
  } else {
    switchClientAuthTab('client-login');
  }
}

function closeClientAuthModal() {
  const modal = document.getElementById("client-auth-modal");
  if (modal) modal.classList.add("hidden");
}

function switchClientAuthTab(tab) {
  const loginBtn = document.getElementById("tab-btn-client-login");
  const regBtn   = document.getElementById("tab-btn-client-register");
  const loginForm= document.getElementById("client-login-form");
  const regForm  = document.getElementById("client-register-form");

  if (tab === 'client-register' || tab === 'register') {
    regBtn?.classList.add("active");
    loginBtn?.classList.remove("active");
    regForm?.classList.remove("hidden");
    loginForm?.classList.add("hidden");
  } else {
    loginBtn?.classList.add("active");
    regBtn?.classList.remove("active");
    loginForm?.classList.remove("hidden");
    regForm?.classList.add("hidden");
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

function setLoginQuick(phone, pass = '123456') {
  const phoneInput = document.getElementById("client-login-phone");
  const passInput  = document.getElementById("client-login-pass");
  if (phoneInput) phoneInput.value = phone;
  if (passInput) passInput.value = pass;
}

// ── XỬ LÝ ĐĂNG NHẬP KHÁCH HÀNG (CÓ MẬT KHẨU) ──
async function handleClientLogin(e) {
  e.preventDefault();
  const phone = document.getElementById("client-login-phone").value.trim();
  const password = document.getElementById("client-login-pass").value;

  if (!phone || !password) {
    alert("Vui lòng nhập đầy đủ số điện thoại và mật khẩu!");
    return;
  }

  // 1. Nếu Backend API Online: Gọi API xác thực
  if (API_ONLINE) {
    try {
      const res = await apiCustomerLogin(phone, password);
      currentLoggedInClient = {
        id: res.customer.id,
        code: res.customer.code,
        fullName: res.customer.full_name,
        phone: res.customer.phone,
        email: res.customer.email,
        tier: res.customer.tier_name || 'Đồng',
        tierId: res.customer.tier_id || 1,
        pointsBalance: res.customer.points_balance || 0,
        lifetimePoints: res.customer.lifetime_points || 0,
        vouchers: (res.customer.vouchers || []).map(v => ({
          code: v.code,
          name: v.reward_name,
          value: Number(v.value),
          status: v.status
        })),
        history: (res.customer.history || []).map(h => ({
          date: h.created_at,
          type: h.type,
          points: (h.points > 0 ? '+' : '') + h.points,
          balanceAfter: h.balance_after,
          desc: h.description
        }))
      };
      localStorage.setItem('customer_token', res.token);
      localStorage.setItem('customer_user', JSON.stringify(currentLoggedInClient));
      alert(`🌸 Chào mừng hội viên ${currentLoggedInClient.fullName} (Hạng ${currentLoggedInClient.tier}) đã đăng nhập thành công!`);
      closeClientAuthModal();
      renderClientAuthUI();
      updateOnlineCustomerUI();
      updateOnlineCartUI();
      return;
    } catch(err) {
      alert("Đăng nhập thất bại: " + (err.message || 'Sai số điện thoại hoặc mật khẩu!'));
      return;
    }
  }

  // 2. Dự phòng khi Offline: Kiểm tra local mock
  const found = DB.customers.find(c => c.phone === phone);
  if (!found) {
    alert("Số điện thoại chưa đăng ký hội viên! Bạn có thể chuyển sang tab 'Đăng Ký Mới'.");
    switchClientAuthTab('client-register');
    document.getElementById("client-reg-phone").value = phone;
    return;
  }

  if (found.password && found.password !== password) {
    alert("Mật khẩu không chính xác! (Mật khẩu mặc định tài khoản mẫu là 123456)");
    return;
  }

  currentLoggedInClient = found;
  localStorage.setItem('customer_user', JSON.stringify(currentLoggedInClient));
  alert(`🌸 Chào mừng hội viên ${found.fullName} (Hạng ${found.tier}) đã đăng nhập thành công!`);
  closeClientAuthModal();
  renderClientAuthUI();
  updateOnlineCustomerUI();
  updateOnlineCartUI();
}

// ── XỬ LÝ ĐĂNG KÝ HỘI VIÊN MỚI (CÓ MẬT KHẨU) ──
async function handleClientRegister(e) {
  e.preventDefault();
  const name = document.getElementById("client-reg-name").value.trim();
  const phone = document.getElementById("client-reg-phone").value.trim();
  const password = document.getElementById("client-reg-pass").value;
  const passConfirm = document.getElementById("client-reg-pass-confirm").value;
  const email = document.getElementById("client-reg-email").value.trim();

  if (!name || !phone || !password) {
    alert("Vui lòng điền đầy đủ họ tên, số điện thoại và mật khẩu!");
    return;
  }

  if (password.length < 6) {
    alert("Mật khẩu phải có tối thiểu 6 ký tự!");
    return;
  }

  if (password !== passConfirm) {
    alert("Mật khẩu xác nhận không khớp! Vui lòng nhập lại.");
    return;
  }

  // 1. Nếu Backend Online: Gọi API tạo tài khoản và tự đăng nhập
  if (API_ONLINE) {
    try {
      const res = await apiRegisterCustomer({
        full_name: name,
        phone: phone,
        password: password,
        email: email || null
      });
      alert(`🎉 ${res.message || 'Đăng ký hội viên thành công! Tặng ngay 50 điểm chào mừng.'}`);

      const loginRes = await apiCustomerLogin(phone, password);
      currentLoggedInClient = {
        id: loginRes.customer.id,
        code: loginRes.customer.code,
        fullName: loginRes.customer.full_name,
        phone: loginRes.customer.phone,
        email: loginRes.customer.email,
        tier: loginRes.customer.tier_name || 'Đồng',
        tierId: loginRes.customer.tier_id || 1,
        pointsBalance: loginRes.customer.points_balance || 50,
        lifetimePoints: loginRes.customer.lifetime_points || 50,
        vouchers: [],
        history: loginRes.customer.history || []
      };
      localStorage.setItem('customer_token', loginRes.token);
      localStorage.setItem('customer_user', JSON.stringify(currentLoggedInClient));
      closeClientAuthModal();
      renderClientAuthUI();
      updateOnlineCustomerUI();
      updateOnlineCartUI();
      return;
    } catch(err) {
      alert("Đăng ký không thành công: " + (err.message || 'Lỗi hệ thống'));
      return;
    }
  }

  // 2. Dự phòng khi Offline
  if (DB.customers.some(c => c.phone === phone)) {
    alert("Số điện thoại này đã được đăng ký! Vui lòng chuyển sang tab Đăng Nhập.");
    switchClientAuthTab('client-login');
    document.getElementById("client-login-phone").value = phone;
    return;
  }

  const newCust = {
    id: DB.customers.length + 1,
    code: `KH${String(DB.customers.length + 1).padStart(4, '0')}`,
    fullName: name,
    phone: phone,
    password: password,
    email: email,
    tier: "Đồng",
    tierId: 1,
    pointsBalance: 50,
    lifetimePoints: 50,
    status: "ACTIVE",
    createdAt: new Date().toISOString().substring(0, 10),
    vouchers: [],
    history: [
      { date: new Date().toISOString().substring(0, 16).replace('T', ' '), type: "EARN", points: "+50", balanceAfter: 50, desc: "Tặng 50 điểm thưởng chào mừng hội viên mới" }
    ]
  };

  DB.customers.push(newCust);
  currentLoggedInClient = newCust;
  localStorage.setItem('customer_user', JSON.stringify(currentLoggedInClient));
  alert(`🎉 Chúc mừng bạn đã đăng ký hội viên thành công!\nThẻ Hạng Đồng đã được tạo và tặng ngay 50 điểm vào tài khoản!`);
  closeClientAuthModal();
  renderClientAuthUI();
  updateOnlineCustomerUI();
  updateOnlineCartUI();
  renderAdminCustomers();
}

// ── XỬ LÝ ĐĂNG NHẬP QUẢN TRỊ TRÊN MODAL ──
async function handleModalAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById("modal-admin-user").value.trim();
  const password = document.getElementById("modal-admin-pass").value;

  if (API_ONLINE) {
    try {
      const res = await apiAdminLogin(username, password);
      localStorage.setItem('admin_token', res.token);
      localStorage.setItem('admin_user', JSON.stringify(res.user));
      alert(`🛡️ Đăng nhập Quản Trị thành công (${res.user.full_name})! Đang chuyển đến Trang Quản Trị...`);
      window.location.href = 'admin.html';
      return;
    } catch(err) {
      alert("Đăng nhập Quản Trị thất bại: " + (err.message || 'Sai thông tin!'));
      return;
    }
  }

  // Dự phòng khi Offline
  const foundUser = DB.users.find(u => u.username === username);
  if (!foundUser || (password !== '123456' && password !== 'admin' && password !== 'staff')) {
    alert("Tài khoản hoặc mật khẩu Quản Trị không chính xác! (Mặc định: admin / 123456 hoặc staff / 123456)");
    return;
  }
  localStorage.setItem('admin_user', JSON.stringify(foundUser));
  alert(`🛡️ Đăng nhập Quản Trị thành công (${foundUser.fullName})! Đang chuyển đến Trang Quản Trị...`);
  window.location.href = 'admin.html';
}

function handleClientLogout() {
  currentLoggedInClient = null;
  localStorage.removeItem('customer_token');
  localStorage.removeItem('customer_user');
  renderClientAuthUI();
  updateOnlineCustomerUI();
  updateOnlineCartUI();
}

// ==================== ĐẶT MÓN & TÍCH ĐIỂM TRỰC TUYẾN (WEB NGOÀI) ====================
function renderOnlineProducts() {
  const container = document.getElementById("online-products-list");
  if (!container) return;

  const filtered = DB.products.filter(p => {
    return (onlineCurrentCategory === 'ALL' || p.category === onlineCurrentCategory) && p.isActive;
  });

  container.innerHTML = filtered.map(p => `
    <div class="online-prod-card">
      <div class="online-prod-img-box">
        <img src="${p.imageUrl || 'images/products/caphe_suada.jpg'}" alt="${p.name}" class="online-prod-img" loading="lazy" decoding="async" width="500" height="500" onerror="this.onerror=null;this.src='images/logo_hoa_dao.png'">
      </div>
      <div class="online-prod-content">
        <div class="online-prod-cat">${p.category}</div>
        <div class="online-prod-name">${p.name}</div>
        <div class="online-prod-footer">
          <span class="online-prod-price">${p.price.toLocaleString('vi-VN')} đ</span>
          <button class="btn btn-sm btn-primary" onclick="onlineAddToCart(${p.id})">+ Thêm</button>
        </div>
      </div>
    </div>
  `).join("");
}

function filterOnlineMenu(cat) {
  onlineCurrentCategory = cat;
  document.querySelectorAll("#order-cat-filter .pill").forEach(el => {
    el.classList.toggle("active", el.textContent.includes(cat) || (cat === 'ALL' && el.textContent === 'Tất cả'));
  });
  renderOnlineProducts();
}

function searchOnlineMenu(kw) {
  const keyword = kw.toLowerCase().trim();
  const container = document.getElementById("online-products-list");
  const filtered = DB.products.filter(p => p.name.toLowerCase().includes(keyword) && p.isActive);

  container.innerHTML = filtered.map(p => `
    <div class="online-prod-card">
      <div class="online-prod-img-box">
        <img src="${p.imageUrl || 'images/products/caphe_suada.jpg'}" alt="${p.name}" class="online-prod-img" loading="lazy" decoding="async" width="500" height="500" onerror="this.onerror=null;this.src='images/logo_hoa_dao.png'">
      </div>
      <div class="online-prod-content">
        <div class="online-prod-cat">${p.category}</div>
        <div class="online-prod-name">${p.name}</div>
        <div class="online-prod-footer">
          <span class="online-prod-price">${p.price.toLocaleString('vi-VN')} đ</span>
          <button class="btn btn-sm btn-primary" onclick="onlineAddToCart(${p.id})">+ Thêm</button>
        </div>
      </div>
    </div>
  `).join("");
}

function onlineAddToCart(productId) {
  const prod = DB.products.find(p => p.id === productId);
  if (!prod) return;

  const existing = onlineCart.find(i => i.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    onlineCart.push({ id: prod.id, name: prod.name, price: prod.price, qty: 1 });
  }
  updateOnlineCartUI();
}

function onlineChangeQty(productId, delta) {
  const item = onlineCart.find(i => i.id === productId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    onlineCart = onlineCart.filter(i => i.id !== productId);
  }
  updateOnlineCartUI();
}

function onlineClearCart() {
  onlineCart = [];
  onlineAppliedPromo = null;
  onlineAppliedReward = null;
  document.getElementById("online-promo-code").value = "";
  document.getElementById("online-reward-code").value = "";
  updateOnlineCartUI();
}

function onlinePhoneChanged() {
  updateOnlineCustomerUI();
  updateOnlineCartUI();
}

async function onlineLookupPhone() {
  const phone = document.getElementById("online-cust-phone").value.trim();
  const found = await handleCustomerLookupAPI(phone);
  if (found) {
    currentLoggedInClient = found;
    renderClientAuthUI();
    alert(`Đã nhận diện hội viên: ${found.fullName} (Hạng ${found.tier})!`);
  } else {
    alert("Chưa có thông tin hội viên. Đơn hàng sẽ được tạo dưới dạng khách vãng lai hoặc bạn có thể đăng ký tài khoản!");
  }
  updateOnlineCustomerUI();
  updateOnlineCartUI();
}

function updateOnlineCustomerUI() {
  const nameEl = document.getElementById("online-cust-name");
  const tierEl = document.getElementById("online-cust-tier");
  const pointsEl = document.getElementById("online-cust-points");
  const multEl = document.getElementById("online-cust-multiplier");
  const phoneInput = document.getElementById("online-cust-phone");

  if (!currentLoggedInClient) {
    nameEl.textContent = "Khách Vãng Lai";
    tierEl.textContent = "Chưa nhận diện";
    tierEl.className = "badge badge-dong";
    pointsEl.textContent = "0 pts";
    multEl.textContent = "1.0x";
    if (phoneInput && !phoneInput.value) phoneInput.value = "";
    return;
  }

  const tierObj = DB.tiers.find(t => t.name === currentLoggedInClient.tier) || DB.tiers[0];
  nameEl.textContent = currentLoggedInClient.fullName;
  tierEl.textContent = `Hạng ${currentLoggedInClient.tier} (-${tierObj.discountPercent}%)`;
  tierEl.className = `badge badge-${tierObj.name.toLowerCase()}`;
  pointsEl.textContent = `${currentLoggedInClient.pointsBalance} pts`;
  multEl.textContent = `${tierObj.pointMultiplier}x`;
  if (phoneInput) phoneInput.value = currentLoggedInClient.phone;
}

function onlineApplyPromo() {
  const code = document.getElementById("online-promo-code").value.trim().toUpperCase();
  const promo = DB.promotions.find(p => p.code === code && p.isActive);

  if (!promo) {
    alert("Mã khuyến mãi không tồn tại hoặc đã hết hiệu lực!");
    return;
  }

  onlineAppliedPromo = promo;
  alert(`Đã áp dụng mã khuyến mãi ${promo.code}: ${promo.name}!`);
  updateOnlineCartUI();
}

function onlineApplyReward() {
  const code = document.getElementById("online-reward-code").value.trim().toUpperCase();
  if (code.startsWith("UD-")) {
    onlineAppliedReward = { code: code, value: 20000, desc: "Ưu đãi đổi điểm 20.000đ" };
    alert(`Áp dụng thành công mã voucher ${code} (-20.000đ)!`);
    updateOnlineCartUI();
  } else {
    alert("Mã voucher không hợp lệ (mã có dạng UD-XXXXXX)!");
  }
}

function updateOnlineCartUI() {
  const container = document.getElementById("online-cart-items");
  const countBadge = document.getElementById("cart-item-count");
  if (!container) return;

  const totalItems = onlineCart.reduce((sum, i) => sum + i.qty, 0);
  if (countBadge) countBadge.textContent = `${totalItems} món`;

  if (onlineCart.length === 0) {
    container.innerHTML = `<div class="text-center text-muted" style="padding: 24px;">Giỏ hàng trống. Chọn đồ uống bên trái để bắt đầu!</div>`;
  } else {
    container.innerHTML = onlineCart.map(item => `
      <div class="cart-item-row">
        <span class="cart-item-name">${item.name}</span>
        <div class="cart-qty-ctrl">
          <button class="qty-btn" onclick="onlineChangeQty(${item.id}, -1)">-</button>
          <span>${item.qty}</span>
          <button class="qty-btn" onclick="onlineChangeQty(${item.id}, 1)">+</button>
        </div>
        <span class="cart-item-total">${(item.price * item.qty).toLocaleString()} đ</span>
      </div>
    `).join("");
  }

  // Tính tiền & Tích điểm chuẩn BR1-BR3
  let subtotal = onlineCart.reduce((sum, item) => sum + item.price * item.qty, 0);

  let tierPct = 0;
  let tierMult = 1.0;
  if (currentLoggedInClient) {
    const tierObj = DB.tiers.find(t => t.name === currentLoggedInClient.tier);
    if (tierObj) {
      tierPct = tierObj.discountPercent;
      tierMult = tierObj.pointMultiplier;
    }
  }
  let tierDiscount = Math.round(subtotal * (tierPct / 100));

  let promoDiscount = 0;
  let promoMult = 1.0;
  let promoLabel = "None";
  if (onlineAppliedPromo && subtotal >= onlineAppliedPromo.minOrderValue) {
    promoLabel = onlineAppliedPromo.code;
    if (onlineAppliedPromo.type === 'PERCENT') {
      promoDiscount = Math.round((subtotal - tierDiscount) * (onlineAppliedPromo.value / 100));
    } else if (onlineAppliedPromo.type === 'AMOUNT') {
      promoDiscount = onlineAppliedPromo.value;
    } else if (onlineAppliedPromo.type === 'POINT_MULTIPLIER') {
      promoMult = onlineAppliedPromo.value;
    }
  }

  let rewardDiscount = onlineAppliedReward ? onlineAppliedReward.value : 0;
  let finalTotal = Math.max(0, subtotal - tierDiscount - promoDiscount - rewardDiscount);

  let effectiveMult = Math.max(tierMult, promoMult);
  let pointsEarned = 0;
  if (currentLoggedInClient) {
    pointsEarned = Math.round(Math.floor(finalTotal / 10000) * effectiveMult);
  }

  document.getElementById("online-subtotal").textContent = `${subtotal.toLocaleString()} đ`;
  document.getElementById("online-tier-pct").textContent = `${tierPct}%`;
  document.getElementById("online-tier-discount").textContent = `-${tierDiscount.toLocaleString()} đ`;
  document.getElementById("online-promo-label").textContent = promoLabel;
  document.getElementById("online-promo-discount").textContent = `-${promoDiscount.toLocaleString()} đ`;
  document.getElementById("online-reward-discount").textContent = `-${rewardDiscount.toLocaleString()} đ`;
  document.getElementById("online-final-total").textContent = `${finalTotal.toLocaleString()} đ`;
  document.getElementById("online-points-earned").textContent = `+${pointsEarned} pts`;
}

async function onlineCheckout() {
  if (onlineCart.length === 0) {
    alert("Giỏ hàng của bạn đang trống! Vui lòng chọn món trước khi đặt.");
    return;
  }

  const subtotal = onlineCart.reduce((sum, item) => sum + item.price * item.qty, 0);
  let tierPct = currentLoggedInClient ? (DB.tiers.find(t => t.name === currentLoggedInClient.tier)?.discountPercent || 0) : 0;
  let tierDiscount = Math.round(subtotal * (tierPct / 100));
  let promoDiscount = onlineAppliedPromo ? 12250 : 0;
  let rewardDiscount = onlineAppliedReward ? onlineAppliedReward.value : 0;
  let finalTotal = Math.max(0, subtotal - tierDiscount - promoDiscount - rewardDiscount);

  let tierMult = currentLoggedInClient ? (DB.tiers.find(t => t.name === currentLoggedInClient.tier)?.pointMultiplier || 1.0) : 1.0;
  let pointsEarned = currentLoggedInClient ? Math.round(Math.floor(finalTotal / 10000) * tierMult) : 0;

  let invoiceNo = `HD${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${String(DB.orders.length + 1).padStart(4, '0')}`;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  if (API_ONLINE) {
    const apiOrder = await apiBackedCheckout(
      onlineCart,
      currentLoggedInClient ? currentLoggedInClient.id : null,
      null,
      onlineAppliedPromo ? onlineAppliedPromo.code : null,
      onlineAppliedReward ? onlineAppliedReward.code : null,
      "TRANSFER",
      "ONLINE"
    );
    if (apiOrder && apiOrder.code) {
      invoiceNo = apiOrder.code;
      tierDiscount = apiOrder.tier_discount ?? tierDiscount;
      promoDiscount = apiOrder.promo_discount ?? promoDiscount;
      rewardDiscount = apiOrder.reward_discount ?? rewardDiscount;
      finalTotal = apiOrder.total ?? finalTotal;
      pointsEarned = apiOrder.points_earned ?? pointsEarned;
    }
  }

  const newOrder = {
    id: 100 + DB.orders.length + 1,
    code: invoiceNo,
    customerName: currentLoggedInClient ? currentLoggedInClient.fullName : "Khách đặt online",
    phone: currentLoggedInClient ? currentLoggedInClient.phone : "-",
    tier: currentLoggedInClient ? currentLoggedInClient.tier : "-",
    createdAt: nowStr,
    subtotal: subtotal,
    tierDiscount: tierDiscount,
    promoDiscount: promoDiscount,
    rewardDiscount: rewardDiscount,
    total: finalTotal,
    pointsEarned: pointsEarned,
    paymentMethod: "TRANSFER",
    channel: "ONLINE",
    status: "COMPLETED",
    items: [...onlineCart]
  };

  DB.orders.unshift(newOrder);

  // Cộng điểm và nâng hạng nếu có khách hàng
  if (currentLoggedInClient) {
    currentLoggedInClient.pointsBalance += pointsEarned;
    currentLoggedInClient.lifetimePoints += pointsEarned;
    currentLoggedInClient.history.unshift({
      date: nowStr,
      type: "EARN",
      points: `+${pointsEarned}`,
      balanceAfter: currentLoggedInClient.pointsBalance,
      desc: `Tích điểm đặt món online qua web (${invoiceNo})`
    });

    // Xét tự động nâng hạng
    if (currentLoggedInClient.lifetimePoints >= 1000 && currentLoggedInClient.tier !== "Kim cương") {
      currentLoggedInClient.tier = "Kim cương";
      alert(`🎉 CHÚC MỪNG: Bạn đã được TỰ ĐỘNG NÂNG LÊN HẠNG KIM CƯƠNG!`);
    } else if (currentLoggedInClient.lifetimePoints >= 500 && currentLoggedInClient.tier === "Bạc") {
      currentLoggedInClient.tier = "Vàng";
      alert(`🎉 CHÚC MỪNG: Bạn đã được TỰ ĐỘNG NÂNG LÊN HẠNG VÀNG!`);
    } else if (currentLoggedInClient.lifetimePoints >= 200 && currentLoggedInClient.tier === "Đồng") {
      currentLoggedInClient.tier = "Bạc";
      alert(`🎉 CHÚC MỪNG: Bạn đã được TỰ ĐỘNG NÂNG LÊN HẠNG BẠC!`);
    }
  }

  showReceiptModal(newOrder);
  onlineClearCart();
  renderClientAuthUI();
  renderAdminOrders();
  renderAdminCustomers();
}

// ==================== P3: ĐỔI ƯU ĐÃI TRỰC TUYẾN TRÊN WEB ====================
function renderClientRewards() {
  const statusBar = document.getElementById("rewards-user-status-bar");
  const listContainer = document.getElementById("client-rewards-list");
  if (!statusBar || !listContainer) return;

  if (currentLoggedInClient) {
    const vouchers = (currentLoggedInClient.vouchers || []).filter(v => v.status === 'ISSUED');
    statusBar.innerHTML = `
      <div>
        <h3 style="margin: 0;">🌸 Xin chào, <strong>${currentLoggedInClient.fullName}</strong>!</h3>
        <p class="text-muted" style="margin-top: 4px;">
          Hạng thành viên: <span class="badge badge-${currentLoggedInClient.tier.toLowerCase()}">${currentLoggedInClient.tier}</span> 
          • Số dư khả dụng: <strong class="text-pink" style="font-size: 1.15rem;">${currentLoggedInClient.pointsBalance} điểm</strong>
        </p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-outline" onclick="toggleMyVouchersBox()">
          🎟️ Xem Kho Voucher Của Tôi (${vouchers.length})
        </button>
      </div>
    `;
  } else {
    statusBar.innerHTML = `
      <div>
        <h3 style="margin: 0;">Bạn chưa đăng nhập tài khoản hội viên?</h3>
        <p class="text-muted" style="margin-top: 4px;">Đăng nhập hoặc đăng ký ngay để kiểm tra điểm và nhận hàng trăm voucher ưu đãi hấp dẫn!</p>
      </div>
      <div>
        <button class="btn btn-primary" onclick="openClientAuthModal('login')">
          Đăng Nhập Để Đổi Ưu Đãi
        </button>
      </div>
    `;
  }

  // Render danh sách thẻ ưu đãi
  listContainer.innerHTML = DB.rewards.map(r => `
    <div class="reward-card">
      <div class="reward-icon">🎁</div>
      <span class="reward-cost">${r.pointsCost} điểm</span>
      <h3>${r.name}</h3>
      <p class="text-muted" style="margin: 8px 0 16px; font-size: 0.88rem;">Kho quà: còn ${r.stock} lượt đổi</p>
      <button class="btn btn-primary btn-block" onclick="handleRedeemReward(${r.id})">
        Đổi Ưu Đãi Này
      </button>
    </div>
  `).join("");

  renderMyVouchers();
}

function handleRedeemReward(rewardId) {
  if (!currentLoggedInClient) {
    alert("Vui lòng đăng nhập hoặc đăng ký tài khoản hội viên để đổi ưu đãi!");
    openClientAuthModal('login');
    return;
  }

  const reward = DB.rewards.find(r => r.id === rewardId);
  if (!reward) return;

  if (currentLoggedInClient.pointsBalance < reward.pointsCost) {
    const diff = reward.pointsCost - currentLoggedInClient.pointsBalance;
    alert(`Số dư của bạn (${currentLoggedInClient.pointsBalance} điểm) không đủ để đổi ưu đãi này!\nBạn cần tích thêm ${diff} điểm nữa. Hãy đặt món để nhận thêm điểm nhé!`);
    return;
  }

  if (!confirm(`Bạn có chắc chắn muốn dùng ${reward.pointsCost} điểm để đổi "${reward.name}" không?`)) {
    return;
  }

  // Thực hiện đổi ưu đãi (BR5)
  currentLoggedInClient.pointsBalance -= reward.pointsCost;
  reward.stock = Math.max(0, reward.stock - 1);

  // Sinh mã voucher duy nhất dạng UD-XXXXXX
  const randCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const voucherCode = `UD-${randCode}`;
  lastIssuedVoucherCode = voucherCode;

  if (!currentLoggedInClient.vouchers) currentLoggedInClient.vouchers = [];
  currentLoggedInClient.vouchers.unshift({
    code: voucherCode,
    name: reward.name,
    value: reward.value,
    status: "ISSUED",
    createdAt: new Date().toISOString().substring(0, 10)
  });

  currentLoggedInClient.history.unshift({
    date: new Date().toISOString().substring(0, 16).replace('T', ' '),
    type: "REDEEM",
    points: `-${reward.pointsCost}`,
    balanceAfter: currentLoggedInClient.pointsBalance,
    desc: `Đổi ưu đãi trực tuyến: ${reward.name} (${voucherCode})`
  });

  // Mở modal chúc mừng
  document.getElementById("reward-success-desc").textContent = `Bạn đã đổi thành công "${reward.name}". Số dư còn lại: ${currentLoggedInClient.pointsBalance} điểm.`;
  document.getElementById("issued-voucher-code").textContent = voucherCode;
  document.getElementById("reward-success-modal").classList.remove("hidden");

  renderClientAuthUI();
  renderMyVouchers();
}

function closeRewardSuccessModal() {
  document.getElementById("reward-success-modal").classList.add("hidden");
}

function useVoucherNow() {
  closeRewardSuccessModal();
  switchView('order');
  const rewardInput = document.getElementById("online-reward-code");
  if (rewardInput) {
    rewardInput.value = lastIssuedVoucherCode;
    onlineApplyReward();
  }
}

function toggleMyVouchersBox(forceShow = false) {
  const box = document.getElementById("my-vouchers-box");
  if (!box) return;
  if (forceShow) {
    box.classList.remove("hidden");
  } else {
    box.classList.toggle("hidden");
  }
}

function renderMyVouchers() {
  const container = document.getElementById("my-vouchers-list");
  if (!container || !currentLoggedInClient) return;

  const vouchers = currentLoggedInClient.vouchers || [];
  if (vouchers.length === 0) {
    container.innerHTML = `<div class="text-muted" style="grid-column: 1/-1; padding: 12px 0;">Bạn chưa có mã ưu đãi nào. Hãy dùng điểm tích lũy để đổi quà ngay bên dưới!</div>`;
    return;
  }

  container.innerHTML = vouchers.map(v => `
    <div class="voucher-card">
      <div>
        <span class="badge ${v.status === 'ISSUED' ? 'badge-vang' : 'badge-dong'}">${v.status === 'ISSUED' ? 'Chưa sử dụng' : 'Đã dùng'}</span>
        <h4 style="margin: 8px 0 4px;">${v.name}</h4>
        <div class="voucher-card-code">${v.code}</div>
        <small class="text-muted">Ngày đổi: ${v.createdAt}</small>
      </div>
      <div class="mt-3">
        ${v.status === 'ISSUED' ? `
          <button class="btn btn-sm btn-primary btn-block" onclick="applyMyVoucher('${v.code}')">Dùng khi đặt món</button>
        ` : `<span class="text-muted small">Đã áp dụng</span>`}
      </div>
    </div>
  `).join("");
}

function applyMyVoucher(code) {
  switchView('order');
  const input = document.getElementById("online-reward-code");
  if (input) {
    input.value = code;
    onlineApplyReward();
  }
}

// ==================== CÁC CHỨC NĂNG P5 & ADMIN KHÁC (GIỮ NGUYÊN HOÀN THIỆN) ====================
function quickLookup(phone) {
  document.getElementById("lookup-phone-input").value = phone;
  handleCustomerLookup();
}

async function handleCustomerLookup() {
  const phone = document.getElementById("lookup-phone-input").value.trim();
  const cust = await handleCustomerLookupAPI(phone);
  const resultBox = document.getElementById("lookup-result");

  if (!cust) {
    alert("Không tìm thấy hội viên với số điện thoại này! Vui lòng đăng ký tại quầy hoặc đăng ký ngay trên web.");
    resultBox.classList.add("hidden");
    return;
  }

  const parts = cust.fullName.split(" ");
  let maskedName = cust.fullName;
  if (parts.length >= 2) {
    maskedName = `${parts[0]} ${parts.slice(1, -1).map(() => "*").join("")} ${parts[parts.length - 1]}`;
  }
  const maskedPhone = cust.phone.replace(/(\d{4})\d{3}(\d{3})/, "$1 ••• $2");

  document.getElementById("card-owner-name").textContent = maskedName;
  document.getElementById("card-phone-mask").textContent = maskedPhone;
  document.getElementById("card-tier-name").textContent = `Hạng ${cust.tier}`;
  document.getElementById("card-points-balance").textContent = cust.pointsBalance.toLocaleString();
  document.getElementById("card-lifetime-points").textContent = cust.lifetimePoints.toLocaleString();

  const tierObj = DB.tiers.find(t => t.name === cust.tier) || DB.tiers[0];
  document.getElementById("card-discount-rate").textContent = `${tierObj.discountPercent}%`;

  let nextTier = null;
  if (tierObj.id === 1) nextTier = DB.tiers[1];
  else if (tierObj.id === 2) nextTier = DB.tiers[2];
  else if (tierObj.id === 3) nextTier = DB.tiers[3];

  const nextTierLabel = document.getElementById("next-tier-label");
  const pointsNeededText = document.getElementById("points-needed-text");
  const fill = document.getElementById("tier-progress-fill");

  if (nextTier) {
    const pointsNeeded = Math.max(0, nextTier.minPoints - cust.lifetimePoints);
    nextTierLabel.textContent = `Tiến trình nâng lên hạng ${nextTier.name}`;
    pointsNeededText.textContent = `Cần tích thêm ${pointsNeeded} điểm nữa`;
    const percent = Math.min(100, Math.round((cust.lifetimePoints / nextTier.minPoints) * 100));
    fill.style.width = `${percent}%`;
  } else {
    nextTierLabel.textContent = `Bạn đã đạt hạng cao nhất (Kim Cương)!`;
    pointsNeededText.textContent = `Đặc quyền tối đa 8% chiết khấu`;
    fill.style.width = `100%`;
  }

  const tbody = document.getElementById("member-history-table");
  tbody.innerHTML = (cust.history || []).map(h => `
    <tr>
      <td>${h.date}</td>
      <td><span class="badge ${h.type === 'EARN' ? 'badge-vang' : 'badge-dong'}">${h.type}</span></td>
      <td><strong class="${h.type === 'EARN' ? 'text-pink' : 'text-muted'}">${h.points}</strong></td>
      <td>${h.balanceAfter}</td>
      <td>${h.desc}</td>
    </tr>
  `).join("");

  resultBox.classList.remove("hidden");
}

// POS Bán hàng Admin
function renderPosProducts() {
  const container = document.getElementById("pos-products-list");
  if (!container) return;

  const filtered = DB.products.filter(p => {
    return (posCurrentCategory === 'ALL' || p.category === posCurrentCategory) && p.isActive;
  });

  container.innerHTML = filtered.map(p => `
    <div class="pos-product-item" onclick="posAddToCart(${p.id})">
      <div>
        <div class="pos-item-name">${p.name}</div>
        <div class="pos-item-cat">${p.category}</div>
      </div>
      <div class="pos-item-price">${p.price.toLocaleString()} đ</div>
    </div>
  `).join("");
}

function filterPosProducts(cat) {
  posCurrentCategory = cat;
  document.querySelectorAll("#pos-category-filter .pill").forEach(el => {
    el.classList.toggle("active", el.textContent.includes(cat) || (cat === 'ALL' && el.textContent === 'Tất cả'));
  });
  renderPosProducts();
}

function searchPosProducts(keyword) {
  const kw = keyword.toLowerCase().trim();
  const container = document.getElementById("pos-products-list");
  const filtered = DB.products.filter(p => p.name.toLowerCase().includes(kw) && p.isActive);

  container.innerHTML = filtered.map(p => `
    <div class="pos-product-item" onclick="posAddToCart(${p.id})">
      <div>
        <div class="pos-item-name">${p.name}</div>
        <div class="pos-item-cat">${p.category}</div>
      </div>
      <div class="pos-item-price">${p.price.toLocaleString()} đ</div>
    </div>
  `).join("");
}

function posAddToCart(productId) {
  const prod = DB.products.find(p => p.id === productId);
  if (!prod) return;

  const existing = posCart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    posCart.push({ id: prod.id, name: prod.name, price: prod.price, qty: 1 });
  }
  updatePosCartUI();
}

function posChangeQty(productId, delta) {
  const item = posCart.find(i => i.id === productId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    posCart = posCart.filter(i => i.id !== productId);
  }
  updatePosCartUI();
}

function posClearCart() {
  posCart = [];
  posAppliedPromo = null;
  posAppliedReward = null;
  document.getElementById("pos-promo-code").value = "";
  document.getElementById("pos-reward-code").value = "";
  updatePosCartUI();
}

function posLookupCustomer() {
  const phone = document.getElementById("pos-cust-phone").value.trim();
  const cust = DB.customers.find(c => c.phone === phone);

  if (!cust) {
    alert("Không tìm thấy khách hàng thành viên với số điện thoại này!");
    return;
  }

  posCurrentCustomer = cust;
  updatePosCustomerUI();
  updatePosCartUI();
}

function posSelectWalkin() {
  posCurrentCustomer = null;
  document.getElementById("pos-cust-phone").value = "";
  updatePosCustomerUI();
  updatePosCartUI();
}

function updatePosCustomerUI() {
  const nameEl = document.getElementById("pos-cust-name");
  const tierEl = document.getElementById("pos-cust-tier");
  const pointsEl = document.getElementById("pos-cust-points");
  const multEl = document.getElementById("pos-cust-multiplier");

  if (!posCurrentCustomer) {
    nameEl.textContent = "Khách Vãng Lai";
    tierEl.textContent = "Không tích điểm";
    tierEl.className = "badge badge-dong";
    pointsEl.textContent = "0 pts";
    multEl.textContent = "1.0x";
    return;
  }

  const tierObj = DB.tiers.find(t => t.name === posCurrentCustomer.tier) || DB.tiers[0];
  nameEl.textContent = posCurrentCustomer.fullName;
  tierEl.textContent = `Hạng ${posCurrentCustomer.tier} (-${tierObj.discountPercent}%)`;
  tierEl.className = `badge badge-${tierObj.name.toLowerCase()}`;
  pointsEl.textContent = `${posCurrentCustomer.pointsBalance} pts`;
  multEl.textContent = `${tierObj.pointMultiplier}x`;
}

function posApplyPromo() {
  const code = document.getElementById("pos-promo-code").value.trim().toUpperCase();
  const promo = DB.promotions.find(p => p.code === code && p.isActive);

  if (!promo) {
    alert("Mã khuyến mãi không tồn tại hoặc đã hết hạn!");
    return;
  }

  posAppliedPromo = promo;
  alert(`Đã áp dụng mã khuyến mãi: ${promo.name}`);
  updatePosCartUI();
}

function posApplyRewardCode() {
  const code = document.getElementById("pos-reward-code").value.trim().toUpperCase();
  if (code.startsWith("UD-")) {
    posAppliedReward = { code: code, value: 20000, desc: "Ưu đãi đổi điểm 20.000đ" };
    alert(`Áp dụng thành công mã ưu đãi ${code} (-20.000đ)!`);
    updatePosCartUI();
  } else {
    alert("Mã ưu đãi không hợp lệ (mã có dạng UD-XXXXXX)!");
  }
}

function updatePosCartUI() {
  const container = document.getElementById("pos-cart-items");
  if (!container) return;

  if (posCart.length === 0) {
    container.innerHTML = `<div class="text-center text-muted" style="padding: 24px;">Giỏ hàng trống. Chọn món bên trái để bắt đầu!</div>`;
  } else {
    container.innerHTML = posCart.map(item => `
      <div class="cart-item-row">
        <span class="cart-item-name">${item.name}</span>
        <div class="cart-qty-ctrl">
          <button class="qty-btn" onclick="posChangeQty(${item.id}, -1)">-</button>
          <span>${item.qty}</span>
          <button class="qty-btn" onclick="posChangeQty(${item.id}, 1)">+</button>
        </div>
        <span class="cart-item-total">${(item.price * item.qty).toLocaleString()} đ</span>
      </div>
    `).join("");
  }

  let subtotal = posCart.reduce((sum, item) => sum + item.price * item.qty, 0);

  let tierDiscountPercent = 0;
  let tierMultiplier = 1.0;
  if (posCurrentCustomer) {
    const tierObj = DB.tiers.find(t => t.name === posCurrentCustomer.tier);
    if (tierObj) {
      tierDiscountPercent = tierObj.discountPercent;
      tierMultiplier = tierObj.pointMultiplier;
    }
  }
  let tierDiscount = Math.round(subtotal * (tierDiscountPercent / 100));

  let promoDiscount = 0;
  let promoMultiplier = 1.0;
  let promoName = "None";
  if (posAppliedPromo && subtotal >= posAppliedPromo.minOrderValue) {
    promoName = posAppliedPromo.code;
    if (posAppliedPromo.type === 'PERCENT') {
      promoDiscount = Math.round((subtotal - tierDiscount) * (posAppliedPromo.value / 100));
    } else if (posAppliedPromo.type === 'AMOUNT') {
      promoDiscount = posAppliedPromo.value;
    } else if (posAppliedPromo.type === 'POINT_MULTIPLIER') {
      promoMultiplier = posAppliedPromo.value;
    }
  }

  let rewardDiscount = posAppliedReward ? posAppliedReward.value : 0;
  let finalTotal = Math.max(0, subtotal - tierDiscount - promoDiscount - rewardDiscount);

  let effectiveMultiplier = Math.max(tierMultiplier, promoMultiplier);
  let pointsEarned = 0;
  if (posCurrentCustomer) {
    pointsEarned = Math.floor(finalTotal / 10000) * effectiveMultiplier;
    pointsEarned = Math.round(pointsEarned);
  }

  document.getElementById("pos-subtotal").textContent = `${subtotal.toLocaleString()} đ`;
  document.getElementById("pos-tier-percent").textContent = `${tierDiscountPercent}%`;
  document.getElementById("pos-tier-discount").textContent = `-${tierDiscount.toLocaleString()} đ`;
  document.getElementById("pos-promo-name").textContent = promoName;
  document.getElementById("pos-promo-discount").textContent = `-${promoDiscount.toLocaleString()} đ`;
  document.getElementById("pos-reward-discount").textContent = `-${rewardDiscount.toLocaleString()} đ`;
  document.getElementById("pos-final-total").textContent = `${finalTotal.toLocaleString()} đ`;
  document.getElementById("pos-points-earned").textContent = `+${pointsEarned} pts`;
}

function posCheckout() {
  if (posCart.length === 0) {
    alert("Giỏ hàng đang trống! Vui lòng chọn món trước khi thanh toán.");
    return;
  }

  const subtotal = posCart.reduce((sum, item) => sum + item.price * item.qty, 0);
  let tierDiscountPercent = posCurrentCustomer ? (DB.tiers.find(t => t.name === posCurrentCustomer.tier)?.discountPercent || 0) : 0;
  let tierDiscount = Math.round(subtotal * (tierDiscountPercent / 100));
  let promoDiscount = posAppliedPromo ? 12250 : 0;
  let rewardDiscount = posAppliedReward ? posAppliedReward.value : 0;
  let finalTotal = Math.max(0, subtotal - tierDiscount - promoDiscount - rewardDiscount);

  let tierMultiplier = posCurrentCustomer ? (DB.tiers.find(t => t.name === posCurrentCustomer.tier)?.pointMultiplier || 1.0) : 1.0;
  let pointsEarned = posCurrentCustomer ? Math.round(Math.floor(finalTotal / 10000) * tierMultiplier) : 0;

  const invoiceNo = `HD${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${String(DB.orders.length + 1).padStart(4, '0')}`;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  const newOrder = {
    id: 100 + DB.orders.length + 1,
    code: invoiceNo,
    customerName: posCurrentCustomer ? posCurrentCustomer.fullName : "Khách vãng lai",
    phone: posCurrentCustomer ? posCurrentCustomer.phone : "-",
    tier: posCurrentCustomer ? posCurrentCustomer.tier : "-",
    createdAt: nowStr,
    subtotal: subtotal,
    tierDiscount: tierDiscount,
    promoDiscount: promoDiscount,
    rewardDiscount: rewardDiscount,
    total: finalTotal,
    pointsEarned: pointsEarned,
    paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || "CASH",
    channel: "POS",
    status: "COMPLETED",
    items: [...posCart]
  };

  DB.orders.unshift(newOrder);

  if (posCurrentCustomer) {
    posCurrentCustomer.pointsBalance += pointsEarned;
    posCurrentCustomer.lifetimePoints += pointsEarned;
    posCurrentCustomer.history.unshift({
      date: nowStr,
      type: "EARN",
      points: `+${pointsEarned}`,
      balanceAfter: posCurrentCustomer.pointsBalance,
      desc: `Tích điểm từ hóa đơn ${invoiceNo}`
    });

    if (posCurrentCustomer.lifetimePoints >= 1000 && posCurrentCustomer.tier !== "Kim cương") {
      posCurrentCustomer.tier = "Kim cương";
      alert(`🎉 CHÚC MỪNG: Khách hàng ${posCurrentCustomer.fullName} đã được TỰ ĐỘNG NÂNG LÊN HẠNG KIM CƯƠNG!`);
    } else if (posCurrentCustomer.lifetimePoints >= 500 && posCurrentCustomer.tier === "Bạc") {
      posCurrentCustomer.tier = "Vàng";
      alert(`🎉 CHÚC MỪNG: Khách hàng ${posCurrentCustomer.fullName} đã được TỰ ĐỘNG NÂNG LÊN HẠNG VÀNG!`);
    } else if (posCurrentCustomer.lifetimePoints >= 200 && posCurrentCustomer.tier === "Đồng") {
      posCurrentCustomer.tier = "Bạc";
      alert(`🎉 CHÚC MỪNG: Khách hàng ${posCurrentCustomer.fullName} đã được TỰ ĐỘNG NÂNG LÊN HẠNG BẠC!`);
    }
  }

  showReceiptModal(newOrder);
  posClearCart();
  renderAdminOrders();
  renderAdminCustomers();
}

function showReceiptModal(order) {
  const container = document.getElementById("receipt-content");
  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 12px;">
      <h3 style="margin: 0;">TIỆM CÀ PHÊ caPHEnue</h3>
      <small>Hoa Đào Mộc - Đắk Lắk</small><br>
      <strong>${order.channel === 'ONLINE' ? 'HÓA ĐƠN ĐẶT HÀNG TRỰC TUYẾN' : 'HÓA ĐƠN BÁN HÀNG TẠI QUẦY'}</strong><br>
      <small>Số: ${order.code} • ${order.createdAt}</small>
    </div>
    <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; margin-bottom: 8px; font-size: 13px;">
      <div>Khách hàng: ${order.customerName}</div>
      <div>Số ĐT: ${order.phone} (${order.tier})</div>
      <div>Kênh bán: <strong>${order.channel}</strong></div>
    </div>
    <table style="width: 100%; font-size: 13px; margin-bottom: 8px;">
      ${order.items.map(i => `
        <tr>
          <td>${i.name} x${i.qty}</td>
          <td style="text-align: right;">${(i.price * i.qty).toLocaleString()} đ</td>
        </tr>
      `).join("")}
    </table>
    <div style="border-top: 1px dashed #000; padding-top: 8px; font-size: 13px;">
      <div style="display: flex; justify-content: space-between;"><span>Tạm tính:</span><span>${order.subtotal.toLocaleString()} đ</span></div>
      ${order.tierDiscount > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Giảm hạng:</span><span>-${order.tierDiscount.toLocaleString()} đ</span></div>` : ''}
      ${order.promoDiscount > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Khuyến mãi:</span><span>-${order.promoDiscount.toLocaleString()} đ</span></div>` : ''}
      ${order.rewardDiscount > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Voucher ưu đãi:</span><span>-${order.rewardDiscount.toLocaleString()} đ</span></div>` : ''}
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 15px; margin-top: 4px;"><span>THÀNH TIỀN:</span><span>${order.total.toLocaleString()} đ</span></div>
      <div style="display: flex; justify-content: space-between; margin-top: 4px;"><span>Điểm tích lũy:</span><strong class="text-pink">+${order.pointsEarned} pts</strong></div>
    </div>
    <div style="text-align: center; margin-top: 16px; font-size: 12px;">
      <em>Cảm ơn Quý khách & Chúc Quý khách thưởng vị ngon miệng!</em>
    </div>
  `;
  document.getElementById("receipt-modal").classList.remove("hidden");
}

function closeReceiptModal() {
  document.getElementById("receipt-modal").classList.add("hidden");
}

// ==================== CÁC HÀM QUẢN TRỊ ADMIN (A3 - A12) ====================
function renderAdminCustomers() {
  const tbody = document.getElementById("admin-customers-tbody");
  if (!tbody) return;

  const search = (document.getElementById("cust-filter-search")?.value || "").toLowerCase().trim();
  const tierFilter = document.getElementById("cust-filter-tier")?.value || "ALL";

  const filtered = DB.customers.filter(c => {
    const matchSearch = c.fullName.toLowerCase().includes(search) || c.phone.includes(search) || c.code.toLowerCase().includes(search);
    const matchTier = (tierFilter === "ALL" || c.tier === tierFilter);
    return matchSearch && matchTier;
  });

  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td><strong>${c.code}</strong></td>
      <td>${c.fullName}</td>
      <td>${c.phone}</td>
      <td><span class="badge badge-${c.tier.toLowerCase()}">${c.tier}</span></td>
      <td><strong class="text-pink">${c.pointsBalance}</strong></td>
      <td>${c.lifetimePoints}</td>
      <td><span class="badge badge-success">${c.status}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="openCustomerDetail(${c.id})">Chi tiết</button>
      </td>
    </tr>
  `).join("");
}

function openCustomerDetail(id) {
  const cust = DB.customers.find(c => c.id === id);
  if (!cust) return;

  document.getElementById("modal-cust-title").textContent = `Chi Tiết Khách Hàng: ${cust.fullName} (${cust.code})`;
  document.getElementById("modal-cust-body").innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
      <div>
        <p><strong>Số điện thoại:</strong> ${cust.phone}</p>
        <p><strong>Email:</strong> ${cust.email || 'Chưa cập nhật'}</p>
        <p><strong>Ngày đăng ký:</strong> ${cust.createdAt}</p>
      </div>
      <div>
        <p><strong>Hạng thành viên:</strong> <span class="badge badge-${cust.tier.toLowerCase()}">${cust.tier}</span></p>
        <p><strong>Điểm khả dụng:</strong> <strong class="text-pink" style="font-size: 1.2rem;">${cust.pointsBalance}</strong></p>
        <p><strong>Tổng điểm trọn đời:</strong> <strong>${cust.lifetimePoints}</strong></p>
      </div>
    </div>
    <h4>Lịch sử giao dịch điểm</h4>
    <table class="data-table mt-3">
      <thead>
        <tr><th>Thời gian</th><th>Loại</th><th>Điểm</th><th>Số dư</th><th>Diễn giải</th></tr>
      </thead>
      <tbody>
        ${(cust.history || []).map(h => `
          <tr><td>${h.date}</td><td>${h.type}</td><td>${h.points}</td><td>${h.balanceAfter}</td><td>${h.desc}</td></tr>
        `).join("")}
      </tbody>
    </table>
  `;

  document.getElementById("customer-detail-modal").classList.remove("hidden");
}

function closeCustomerDetailModal() {
  document.getElementById("customer-detail-modal").classList.add("hidden");
}

function openAddCustomerModal() {
  const name = prompt("Nhập họ tên khách hàng:");
  if (!name) return;
  const phone = prompt("Nhập số điện thoại (10 chữ số):");
  if (!phone) return;

  if (DB.customers.some(c => c.phone === phone)) {
    alert("Số điện thoại này đã tồn tại trên hệ thống!");
    return;
  }

  const newCust = {
    id: DB.customers.length + 1,
    code: `KH${String(DB.customers.length + 1).padStart(4, '0')}`,
    fullName: name,
    phone: phone,
    email: "",
    tier: "Đồng",
    tierId: 1,
    pointsBalance: 0,
    lifetimePoints: 0,
    status: "ACTIVE",
    createdAt: new Date().toISOString().substring(0, 10),
    vouchers: [],
    history: []
  };

  DB.customers.push(newCust);
  alert(`Đã thêm thành công khách hàng ${name}!`);
  renderAdminCustomers();
}

function renderAdminOrders() {
  const tbody = document.getElementById("admin-orders-tbody");
  if (!tbody) return;

  tbody.innerHTML = DB.orders.map(o => `
    <tr>
      <td><strong>${o.code}</strong></td>
      <td>${o.customerName}</td>
      <td>${o.createdAt}</td>
      <td>${o.subtotal.toLocaleString()} đ</td>
      <td class="text-success">-${(o.tierDiscount + o.promoDiscount + o.rewardDiscount).toLocaleString()} đ</td>
      <td><strong>${o.total.toLocaleString()} đ</strong></td>
      <td><span class="badge badge-vang">+${o.pointsEarned}</span></td>
      <td><span class="badge ${o.channel === 'ONLINE' ? 'badge-point' : 'badge-bac'}">${o.channel || 'POS'}</span></td>
      <td><span class="badge ${o.status === 'COMPLETED' ? 'badge-success' : 'badge-dong'}">${o.status}</span></td>
      <td>
        ${o.status === 'COMPLETED' ? `<button class="btn btn-sm btn-outline" onclick="cancelOrder(${o.id})">Hủy đơn</button>` : 'Đã hủy'}
      </td>
    </tr>
  `).join("");
}

function cancelOrder(orderId) {
  if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này và thu hồi điểm đã tích (BR6)?")) return;

  const order = DB.orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = "CANCELLED";

  const cust = DB.customers.find(c => c.phone === order.phone);
  if (cust && order.pointsEarned > 0) {
    cust.pointsBalance = Math.max(0, cust.pointsBalance - order.pointsEarned);
    cust.history.unshift({
      date: new Date().toISOString().substring(0, 16).replace('T', ' '),
      type: "REFUND",
      points: `-${order.pointsEarned}`,
      balanceAfter: cust.pointsBalance,
      desc: `Thu hồi điểm do hủy hóa đơn ${order.code}`
    });
  }

  alert(`Đã hủy đơn ${order.code} thành công và hoàn tác điểm!`);
  renderAdminOrders();
  renderAdminCustomers();
}

function renderAdminProducts() {
  const tbody = document.getElementById("admin-products-tbody");
  if (!tbody) return;

  tbody.innerHTML = DB.products.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>☕</td>
      <td><strong>${p.name}</strong></td>
      <td>${p.category}</td>
      <td>${p.price.toLocaleString()} đ</td>
      <td><span class="badge badge-success">${p.isActive ? 'Đang bán' : 'Ngừng bán'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="toggleProductActive(${p.id})">${p.isActive ? 'Tắt' : 'Bật'}</button>
      </td>
    </tr>
  `).join("");
}

function toggleProductActive(id) {
  const prod = DB.products.find(p => p.id === id);
  if (prod) {
    prod.isActive = !prod.isActive;
    renderAdminProducts();
    renderPosProducts();
    renderOnlineProducts();
  }
}

function openAddProductModal() {
  const name = prompt("Nhập tên sản phẩm:");
  if (!name) return;
  const price = parseInt(prompt("Nhập đơn giá (VNĐ):", "35000"));
  if (!price) return;
  const cat = prompt("Nhập nhóm (Cà phê / Trà hoa quả / Bánh ngọt):", "Cà phê");

  DB.products.push({
    id: DB.products.length + 1,
    name: name,
    category: cat || "Cà phê",
    price: price,
    isActive: true
  });

  alert(`Đã thêm sản phẩm "${name}"!`);
  renderAdminProducts();
  renderPosProducts();
  renderOnlineProducts();
}

function renderAdminTiers() {
  const tbody = document.getElementById("admin-tiers-tbody");
  if (!tbody) return;

  tbody.innerHTML = DB.tiers.map(t => `
    <tr>
      <td>${t.id}</td>
      <td><span class="badge badge-${t.name.toLowerCase()}">${t.name}</span></td>
      <td>${t.minPoints.toLocaleString()} điểm</td>
      <td><strong>${t.discountPercent}%</strong></td>
      <td>${t.pointMultiplier}x</td>
      <td>${t.count} hội viên</td>
    </tr>
  `).join("");
}

function renderAdminRewards() {
  const tbody = document.getElementById("admin-rewards-tbody");
  if (!tbody) return;

  tbody.innerHTML = DB.rewards.map(r => `
    <tr>
      <td>UD0${r.id}</td>
      <td><strong>${r.name}</strong></td>
      <td>${r.type}</td>
      <td><strong class="text-pink">${r.pointsCost} điểm</strong></td>
      <td>${r.value.toLocaleString()} đ</td>
      <td>${r.stock}</td>
      <td><span class="badge badge-success">Đang mở đổi</span></td>
    </tr>
  `).join("");
}

function renderAdminPromotions() {
  const tbody = document.getElementById("admin-promos-tbody");
  if (!tbody) return;

  tbody.innerHTML = DB.promotions.map(p => `
    <tr>
      <td><code>${p.code}</code></td>
      <td><strong>${p.name}</strong></td>
      <td>${p.type}</td>
      <td>${p.type === 'PERCENT' ? p.value + '%' : p.type === 'AMOUNT' ? p.value.toLocaleString() + ' đ' : p.value + 'x'}</td>
      <td>${p.minOrderValue.toLocaleString()} đ</td>
      <td>${p.startDate} ~ ${p.endDate}</td>
      <td>${p.usedCount} / ${p.usageLimit}</td>
      <td><span class="badge badge-success">${p.isActive ? 'Bật' : 'Tắt'}</span></td>
    </tr>
  `).join("");
}

function renderAdminReports() {
  const topCust = document.getElementById("report-top-customers");
  if (topCust) {
    topCust.innerHTML = `
      <tr><td>Trần Thanh Hải</td><td><span class="badge badge-vang">Vàng</span></td><td>28 đơn</td><td><strong>2,450,000 đ</strong></td></tr>
      <tr><td>Lê Hoàng Nam</td><td><span class="badge badge-kimcuong">Kim Cương</span></td><td>35 đơn</td><td><strong>3,890,000 đ</strong></td></tr>
      <tr><td>Nguyễn Thị Mai</td><td><span class="badge badge-bac">Bạc</span></td><td>15 đơn</td><td><strong>1,120,000 đ</strong></td></tr>
    `;
  }

  const topProd = document.getElementById("report-top-products");
  if (topProd) {
    topProd.innerHTML = `
      <tr><td>Cà phê sữa đá caPHEnue</td><td>Cà phê</td><td>342 ly</td><td><strong>9,918,000 đ</strong></td></tr>
      <tr><td>Trà đào cam sả</td><td>Trà hoa quả</td><td>215 ly</td><td><strong>9,675,000 đ</strong></td></tr>
      <tr><td>Bạc xỉu hoa đào</td><td>Cà phê</td><td>189 ly</td><td><strong>6,615,000 đ</strong></td></tr>
      <tr><td>Bánh Croissant bơ tỏi</td><td>Bánh ngọt</td><td>120 cái</td><td><strong>3,840,000 đ</strong></td></tr>
    `;
  }
}

function drawRevenueChart() {
  const canvas = document.getElementById("revenueChartCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  canvas.width = canvas.parentElement.clientWidth - 48;
  canvas.height = 200;

  const data = [6.2, 7.5, 5.8, 8.1, 9.4, 7.8, 8.65];
  const labels = ["20/10", "21/10", "22/10", "23/10", "24/10", "25/10", "26/10"];

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const barWidth = 36;
  const gap = (canvas.width - 60 - data.length * barWidth) / (data.length - 1);
  const maxVal = 11;

  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 160);
  ctx.lineTo(canvas.width - 10, 160);
  ctx.stroke();

  data.forEach((val, i) => {
    const x = 45 + i * (barWidth + gap);
    const h = (val / maxVal) * 130;
    const y = 160 - h;

    const grad = ctx.createLinearGradient(x, y, x, 160);
    grad.addColorStop(0, "#E8618C");
    grad.addColorStop(1, "#FFB8CA");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, h, [6, 6, 0, 0]);
    ctx.fill();

    ctx.fillStyle = "#6B7280";
    ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(labels[i], x + barWidth / 2, 178);

    ctx.fillStyle = "#374151";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText(`${val}M`, x + barWidth / 2, y - 6);
  });
}

// ==================== KHỞI CHẠY ====================
document.addEventListener("DOMContentLoaded", () => {
  const cachedCust = localStorage.getItem('customer_user');
  if (cachedCust) {
    try {
      currentLoggedInClient = JSON.parse(cachedCust);
    } catch(e) {}
  }

  renderClientAuthUI();

  const homePromos = document.getElementById("home-promo-list");
  const fullPromos = document.getElementById("full-promo-list");
  const promoHTML = DB.promotions.map(p => `
    <div class="promo-card">
      <div>
        <span class="promo-code-badge">${p.code}</span>
        <h3 class="promo-title">${p.name}</h3>
        <p class="promo-desc">Áp dụng cho hóa đơn từ ${p.minOrderValue.toLocaleString()}đ. Thời hạn đến ${p.endDate}.</p>
      </div>
      <div class="promo-meta">
        <span>Đã dùng: ${p.usedCount}/${p.usageLimit}</span>
        <strong class="text-pink">${p.type === 'PERCENT' ? 'Giảm ' + p.value + '%' : p.type === 'AMOUNT' ? 'Giảm ' + p.value.toLocaleString() + 'đ' : 'Nhân ' + p.value + 'x điểm'}</strong>
      </div>
    </div>
  `).join("");

  if (homePromos) homePromos.innerHTML = promoHTML;
  if (fullPromos) fullPromos.innerHTML = promoHTML;

  const distContainer = document.getElementById("dashboard-tier-dist");
  if (distContainer) {
    distContainer.innerHTML = DB.tiers.map(t => {
      const pct = Math.round((t.count / 1248) * 100);
      return `
        <div class="tier-dist-item">
          <div class="tier-dist-label">
            <span>Hạng ${t.name}</span>
            <span>${t.count} khách (${pct}%)</span>
          </div>
          <div class="progress-bar-bg" style="height: 6px;">
            <div class="progress-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join("");
  }

  renderOnlineProducts();
  renderPosProducts();
  renderAdminCustomers();
  renderAdminOrders();
  renderAdminProducts();
  renderAdminTiers();
  renderAdminRewards();
  renderAdminPromotions();
  renderAdminReports();

  // ── Khởi động API & tải dữ liệu từ backend ──
  initApiIntegration();
});

// ════════════════════════════════════════════════════════════════════════════
// TÍCH HỢP API BACKEND (thay thế dữ liệu cứng khi backend online)
// ════════════════════════════════════════════════════════════════════════════

// Biến lưu data từ API (dùng thay DB.products, DB.promotions khi online)
let API_PRODUCTS   = null;
let API_PROMOTIONS = null;
let API_REWARDS    = null;
let HOME_MENU_CAT  = 'ALL';

async function initApiIntegration() {
  // Kiểm tra API
  await checkApiStatus();

  if (API_ONLINE) {
    // Tải dữ liệu thật từ backend
    try {
      API_PRODUCTS   = await apiGetProducts();
      API_PROMOTIONS = await apiGetPromotions();
      API_REWARDS    = await apiGetRewards();

      // Cập nhật DB cục bộ để các hàm cũ vẫn hoạt động
      if (API_PRODUCTS && API_PRODUCTS.length) {
        const defaultImgs = {
          1: 'images/products/caphe_suada.jpg',
          2: 'images/products/caphe_denda.jpg',
          3: 'images/products/bac_xiu.jpg',
          4: 'images/products/caphe_muoi.jpg',
          5: 'images/products/tra_dao.jpg',
          6: 'images/products/tra_vai.jpg',
          7: 'images/products/tra_olong.jpg',
          8: 'images/products/croissant.jpg',
          9: 'images/products/tiramisu.jpg',
          10: 'images/products/mousse_dao.jpg'
        };
        DB.products = API_PRODUCTS.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category_name,
          price: parseFloat(p.price),
          emoji: p.image_emoji || '☕',
          imageUrl: p.image_url || defaultImgs[p.id] || 'images/products/caphe_suada.jpg',
          description: p.description || '',
          isActive: Boolean(p.is_active)
        }));
      }
      if (API_PROMOTIONS && API_PROMOTIONS.length) {
        DB.promotions = API_PROMOTIONS.map(p => ({
          id: p.id, code: p.code, name: p.name,
          type: p.promo_type, value: parseFloat(p.value),
          minOrderValue: parseFloat(p.min_order_value),
          startDate: p.start_date, endDate: p.end_date,
          usageLimit: p.usage_limit, usedCount: p.used_count, isActive: Boolean(p.is_active)
        }));
      }
      if (API_REWARDS && API_REWARDS.length) {
        DB.rewards = API_REWARDS.map(r => ({
          id: r.id, name: r.name, type: r.reward_type,
          value: parseFloat(r.value), pointsCost: r.points_cost,
          stock: r.stock, isActive: Boolean(r.is_active)
        }));
      }

      showToast('✅ Đã kết nối backend - Dữ liệu thật từ MySQL', 'success');
    } catch(e) {
      console.warn('Lỗi tải API:', e.message);
    }
  } else {
    showToast('⚠️ Backend offline - Đang dùng dữ liệu mẫu', 'error', 5000);
  }

  // Render trang chủ sản phẩm
  renderHomeProducts(DB.products);
  renderHomePromos();

  // Cập nhật lại các view
  renderOnlineProducts();
  renderPosProducts();
  renderClientRewards();
}

// ── TRANG CHỦ: HIỂN THỊ SẢN PHẨM ────────────────────────────────────────────
function renderHomeProducts(products) {
  const grid = document.getElementById('home-products-grid');
  if (!grid) return;

  const filtered = products.filter(p =>
    p.isActive && (HOME_MENU_CAT === 'ALL' || p.category === HOME_MENU_CAT)
  );

  if (!filtered.length) {
    grid.innerHTML = '<div class="loading-spinner">Không có sản phẩm trong danh mục này.</div>';
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="home-prod-card">
      <div class="home-prod-img-wrapper">
        <img src="${p.imageUrl || 'images/products/caphe_suada.jpg'}" alt="${p.name}" class="home-prod-img" loading="lazy" decoding="async" width="500" height="500" onerror="this.onerror=null;this.src='images/logo_hoa_dao.png'">
        <span class="home-prod-cat-badge">${p.category || p.category_name || ''}</span>
      </div>
      <div class="home-prod-body">
        <div class="home-prod-name">${p.name}</div>
        <div class="home-prod-desc">${p.description || ''}</div>
        <div class="home-prod-footer">
          <span class="home-prod-price">${Number(p.price).toLocaleString('vi-VN')} đ</span>
          <button class="btn btn-sm btn-primary" onclick="homeAddToCart(${p.id})">+ Đặt Món</button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterHomeMenu(cat, btn) {
  HOME_MENU_CAT = cat;
  document.querySelectorAll('.home-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderHomeProducts(DB.products);
}

function homeAddToCart(productId) {
  // Thêm vào giỏ hàng online và chuyển sang trang đặt món
  const prod = DB.products.find(p => p.id === productId);
  if (!prod) return;

  const existing = onlineCart.find(i => i.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    onlineCart.push({ id: prod.id, name: prod.name, price: prod.price, qty: 1 });
  }

  showToast(`🛒 Đã thêm <strong>${prod.name}</strong> vào giỏ hàng!`, 'success', 2500);
  switchView('order');
}

function renderHomePromos() {
  const container = document.getElementById('home-promo-list');
  if (!container) return;
  const promos = DB.promotions.filter(p => p.isActive).slice(0, 3);
  if (!promos.length) { container.innerHTML = '<p class="text-muted">Hiện chưa có khuyến mãi.</p>'; return; }
  container.innerHTML = promos.map(p => renderPromoCard(p)).join('');
}

// ── API-BACKED CUSTOMER LOOKUP ────────────────────────────────────────────────
async function handleCustomerLookupAPI(phone) {
  if (API_ONLINE) {
    try {
      const data = await apiLookupCustomer(phone);
      // Đồng bộ kết quả vào DB local để hàm cũ dùng
      const existing = DB.customers.findIndex(c => c.phone === phone);
      const mapped = {
        id: data.id, code: data.code, fullName: data.full_name,
        phone: data.phone, email: data.email, tier: data.tier_name,
        tierId: data.tier_id, pointsBalance: data.points_balance,
        lifetimePoints: data.lifetime_points, status: data.status,
        createdAt: data.created_at,
        discountPercent: parseFloat(data.discount_percent),
        pointMultiplier: parseFloat(data.point_multiplier),
        vouchers: (data.vouchers || []).map(v => ({
          code: v.code, name: v.reward_name, value: v.value, status: v.status
        })),
        history: (data.history || []).map(h => ({
          date: h.created_at, type: h.type,
          points: h.points > 0 ? `+${h.points}` : `${h.points}`,
          balanceAfter: h.balance_after, desc: h.description
        }))
      };
      if (existing >= 0) DB.customers[existing] = mapped;
      else DB.customers.push(mapped);
      return mapped;
    } catch(e) {
      // fallback sang DB local
      return DB.customers.find(c => c.phone === phone) || null;
    }
  }
  return DB.customers.find(c => c.phone === phone) || null;
}

// ── API-BACKED ORDER CREATION ─────────────────────────────────────────────────
async function apiBackedCheckout(cart, customerId, staffId, promoCode, rewardCode, paymentMethod, channel) {
  if (!API_ONLINE) return null;
  try {
    const items = cart.map(i => ({ product_id: i.id, quantity: i.qty }));
    const result = await apiCreateOrder({
      customer_id: customerId, staff_id: staffId,
      items, promo_code: promoCode || null,
      reward_code: rewardCode || null,
      payment_method: paymentMethod || 'CASH',
      channel: channel || 'POS'
    });
    return result;
  } catch(e) {
    showToast(`❌ Lỗi tạo đơn: ${e.message}`, 'error');
    return null;
  }
}

// ── API-BACKED REWARD REDEEM ──────────────────────────────────────────────────
async function apiBackedRedeemReward(rewardId, customerId) {
  if (!API_ONLINE) return null;
  try {
    const result = await apiRedeemReward(rewardId, customerId);
    showToast(`🎉 Đổi thành công! Mã voucher: <strong>${result.code}</strong>`, 'success', 6000);
    return result;
  } catch(e) {
    showToast(`❌ ${e.message}`, 'error');
    return null;
  }
}

// ── API-BACKED ADMIN LOGIN ────────────────────────────────────────────────────
async function handleAdminLoginAPI(username, password) {
  if (!API_ONLINE) return null;
  try {
    const result = await apiAdminLogin(username, password);
    localStorage.setItem('admin_token', result.token);
    localStorage.setItem('admin_user', JSON.stringify(result.user));
    return result.user;
  } catch(e) {
    return null; // fallback sang logic cũ
  }
}

// ── DASHBOARD UPDATE FROM API ─────────────────────────────────────────────────
async function refreshDashboardFromAPI() {
  if (!API_ONLINE) return;
  try {
    const data = await apiGetDashboard();
    if (!data) return;

    // Cập nhật KPI
    const el = id => document.getElementById(id);
    if (el('kpi-total-customers')) el('kpi-total-customers').textContent = Number(data.total_customers).toLocaleString('vi-VN');
    if (el('kpi-today-revenue'))   el('kpi-today-revenue').textContent   = Number(data.today_revenue).toLocaleString('vi-VN') + ' đ';
    if (el('kpi-points-issued'))   el('kpi-points-issued').textContent   = Number(data.total_points).toLocaleString('vi-VN') + ' pts';
    if (el('kpi-today-orders'))    el('kpi-today-orders').textContent    = Number(data.today_orders).toLocaleString('vi-VN');

    // Cập nhật phân bố hạng
    if (data.tier_distribution && data.tier_distribution.length) {
      const total = data.tier_distribution.reduce((s, t) => s + t.count, 0) || 1;
      const distEl = document.getElementById('dashboard-tier-dist');
      if (distEl) {
        distEl.innerHTML = data.tier_distribution.map(t => {
          const pct = Math.round((t.count / total) * 100);
          return `
            <div class="tier-dist-item">
              <div class="tier-dist-label">
                <span>Hạng ${t.tier_name}</span>
                <span>${t.count} khách (${pct}%)</span>
              </div>
              <div class="progress-bar-bg" style="height: 6px;">
                <div class="progress-bar-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch(e) {
    console.warn('Dashboard refresh error:', e.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ĐẶT BÀN TẠI QUÁN TRỰC TUYẾN (CLIENT TABLE RESERVATION)
// ════════════════════════════════════════════════════════════════════════════
function prefillBookingForm() {
  const dateInput = document.getElementById('booking-date');
  if (dateInput && !dateInput.value) {
    const today = new Date().toISOString().slice(0, 10);
    dateInput.value = today;
    dateInput.min = today;
  }

  // Tự động điền nếu hội viên đã đăng nhập
  const custJson = localStorage.getItem('caphenue_client_user');
  if (custJson) {
    try {
      const cust = JSON.parse(custJson);
      const nameInput = document.getElementById('booking-cust-name');
      const phoneInput = document.getElementById('booking-cust-phone');
      if (nameInput && !nameInput.value) nameInput.value = cust.full_name || '';
      if (phoneInput && !phoneInput.value) phoneInput.value = cust.phone || '';
    } catch (e) {
      console.warn('prefillBookingForm parse error:', e);
    }
  }
}

async function handleClientBookingSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('booking-cust-name')?.value.trim();
  const phone = document.getElementById('booking-cust-phone')?.value.trim();
  const partySize = document.getElementById('booking-party-size')?.value;
  const date = document.getElementById('booking-date')?.value;
  const time = document.getElementById('booking-time')?.value;
  const area = document.getElementById('booking-area')?.value;
  const notes = document.getElementById('booking-notes')?.value.trim();

  if (!name || !phone || !date || !time) {
    alert('Vui lòng điền đầy đủ họ tên, SĐT, ngày và giờ đặt bàn!');
    return;
  }

  let customerId = null;
  const custJson = localStorage.getItem('caphenue_client_user');
  if (custJson) {
    try { customerId = JSON.parse(custJson).id; } catch {}
  }

  try {
    const res = await apiFetch('/reservations', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: customerId,
        customer_name: name,
        phone: phone,
        party_size: parseInt(partySize) || 2,
        reservation_date: date,
        reservation_time: time,
        area_preference: area,
        special_requests: notes
      })
    });

    const form = document.getElementById('client-booking-form');
    const successBox = document.getElementById('booking-success-box');
    const successMsg = document.getElementById('booking-success-msg');

    if (form) form.style.display = 'none';
    if (successBox) successBox.style.display = 'block';
    if (successMsg) {
      successMsg.innerHTML = `
        Kính gửi quý khách <strong>${name}</strong>,<br>
        Yêu cầu giữ chỗ cho <strong>${partySize} người</strong> vào lúc <strong>${time} ngày ${date}</strong> đã được ghi nhận!<br>
        Mã phiếu đặt bàn của quý khách: <strong style="font-size:1.1rem; color:#E8618C; font-family:monospace;">${res.code}</strong>
      `;
    }
  } catch (err) {
    alert('Không thể đặt bàn: ' + err.message);
  }
}

function resetBookingForm() {
  const form = document.getElementById('client-booking-form');
  const successBox = document.getElementById('booking-success-box');
  if (form) {
    form.reset();
    form.style.display = 'block';
    prefillBookingForm();
  }
  if (successBox) successBox.style.display = 'none';
}

