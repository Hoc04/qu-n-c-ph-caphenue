import { Controller, Get, Post, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('api')
export class OrdersController {
  constructor(private readonly db: DatabaseService) {}

  @Get('orders')
  async getOrders(@Query('limit') limit: string = '50') {
    const l = Math.min(parseInt(limit) || 50, 200);
    return await this.db.query(`
      SELECT o.*, c.full_name AS customer_name, c.phone AS customer_phone, u.full_name AS staff_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u     ON o.staff_id = u.id
      ORDER BY o.created_at DESC LIMIT ?
    `, [l]);
  }

  @Post('orders')
  async createOrder(@Body() body: any) {
    const { customer_id, staff_id, items, promotion_code, voucher_code, payment_method, channel } = body;
    if (!items || !items.length) throw new HttpException('Đơn hàng không có sản phẩm', HttpStatus.BAD_REQUEST);

    // Tính subtotal
    let subtotal = 0;
    for (const it of items) {
      subtotal += Number(it.price) * Number(it.quantity);
    }

    // Lấy thông tin khách hàng & hạng
    let cust: any = null;
    let tierDiscount = 0;
    let multiplier = 1.0;
    if (customer_id) {
      const custs = await this.db.query(
        'SELECT c.*, t.discount_percent, t.point_multiplier FROM customers c JOIN membership_tiers t ON c.tier_id = t.id WHERE c.id = ?',
        [customer_id]
      );
      if (custs.length) {
        cust = custs[0];
        tierDiscount = Math.round(subtotal * (Number(cust.discount_percent) / 100));
        multiplier   = Number(cust.point_multiplier) || 1.0;
      }
    }

    // Khuyến mãi
    let promoDiscount = 0;
    let promoId: any = null;
    if (promotion_code) {
      const promos = await this.db.query(
        "SELECT * FROM promotions WHERE code = ? AND is_active = 1 AND CURDATE() BETWEEN start_date AND end_date",
        [promotion_code]
      );
      if (promos.length) {
        const promo = promos[0];
        promoId = promo.id;
        if (promo.promo_type === 'PERCENT') promoDiscount = Math.round(subtotal * (Number(promo.value) / 100));
        else if (promo.promo_type === 'AMOUNT') promoDiscount = Math.min(Number(promo.value), subtotal);
        else if (promo.promo_type === 'POINT_MULTIPLIER') multiplier *= Number(promo.value);
      }
    }

    // Voucher
    let rewardDiscount = 0;
    let redemptionId: any = null;
    if (voucher_code) {
      const v = await this.db.query(
        "SELECT rd.*, rw.value, rw.reward_type FROM redemptions rd JOIN rewards rw ON rd.reward_id = rw.id WHERE rd.code = ? AND rd.status = 'ISSUED'",
        [voucher_code]
      );
      if (v.length) {
        redemptionId = v[0].id;
        rewardDiscount = Math.min(Number(v[0].value), subtotal - tierDiscount - promoDiscount);
      }
    }

    const total = Math.max(0, subtotal - tierDiscount - promoDiscount - rewardDiscount);
    // Tích điểm BR1: Mỗi 10.000đ = 1 điểm * multiplier
    const pointsEarned = cust ? Math.floor((total / 10000) * multiplier) : 0;
    const code = `HD${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;

    const res = await this.db.query(`
      INSERT INTO orders (customer_id, staff_id, promotion_id, redemption_id, code, subtotal, tier_discount, promo_discount, reward_discount, total, points_earned, payment_method, status, channel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)
    `, [customer_id || null, staff_id || null, promoId, redemptionId, code, subtotal, tierDiscount, promoDiscount, rewardDiscount, total, pointsEarned, payment_method || 'CASH', channel || 'POS']);

    const orderId = res.insertId;

    // Chi tiết món
    for (const it of items) {
      await this.db.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total) VALUES (?,?,?,?,?)',
        [orderId, it.product_id, it.quantity, it.price, it.price * it.quantity]
      );
    }

    // Đánh dấu voucher đã dùng
    if (redemptionId) {
      await this.db.query("UPDATE redemptions SET status='USED', used_at=NOW() WHERE id=?", [redemptionId]);
    }

    // Cộng điểm cho khách
    if (cust && pointsEarned > 0) {
      const newBal = cust.points_balance + pointsEarned;
      const newLife = cust.lifetime_points + pointsEarned;
      await this.db.query(
        'UPDATE customers SET points_balance=?, lifetime_points=? WHERE id=?',
        [newBal, newLife, cust.id]
      );
      await this.db.query(
        `INSERT INTO point_transactions (customer_id, order_id, type, points, balance_after, description)
         VALUES (?, ?, 'EARN', ?, ?, ?)`,
        [cust.id, orderId, pointsEarned, newBal, `Tích điểm đơn hàng ${code}`]
      );
    }

    return {
      order_id: orderId,
      code,
      subtotal,
      tier_discount: tierDiscount,
      promo_discount: promoDiscount,
      reward_discount: rewardDiscount,
      total,
      points_earned: pointsEarned,
      message: 'Tạo đơn hàng thành công'
    };
  }
}
