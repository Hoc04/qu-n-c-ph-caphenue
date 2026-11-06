import { Controller, Get, Post, Query, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('api')
export class CommonController {
  constructor(private readonly db: DatabaseService) {}

  @Get('ping')
  ping() {
    return { ok: true, server: 'caPHEnue NestJS API', time: new Date() };
  }

  @Get('tiers')
  async getTiers() {
    return await this.db.query('SELECT * FROM membership_tiers ORDER BY min_points ASC');
  }

  @Get('promotions')
  async getPromotions() {
    return await this.db.query('SELECT * FROM promotions WHERE is_active = 1 ORDER BY start_date DESC');
  }

  @Post('promotions/validate')
  async validatePromo(@Body() body: any) {
    const { code, subtotal } = body;
    const rows = await this.db.query(
      'SELECT * FROM promotions WHERE code = ? AND is_active = 1 AND CURDATE() BETWEEN start_date AND end_date',
      [code]
    );
    if (!rows.length) throw new HttpException('Mã khuyến mãi không hợp lệ hoặc đã hết hạn', HttpStatus.NOT_FOUND);
    const promo = rows[0];
    if (subtotal && subtotal < Number(promo.min_order_value)) {
      throw new HttpException(`Đơn hàng tối thiểu ${Number(promo.min_order_value).toLocaleString()}đ để dùng mã này`, HttpStatus.BAD_REQUEST);
    }
    return { valid: true, promotion: promo };
  }

  @Get('rewards')
  async getRewards() {
    return await this.db.query('SELECT * FROM rewards WHERE is_active = 1 ORDER BY points_cost ASC');
  }

  @Post('rewards/:id/redeem')
  async redeemReward(@Param('id') rewardId: string, @Body() body: any) {
    const { customer_id } = body;
    if (!customer_id) throw new HttpException('Cần customer_id', HttpStatus.BAD_REQUEST);

    const rewards = await this.db.query('SELECT * FROM rewards WHERE id = ?', [rewardId]);
    if (!rewards.length) throw new HttpException('Ưu đãi không tồn tại', HttpStatus.NOT_FOUND);
    const reward = rewards[0];

    const custs = await this.db.query('SELECT * FROM customers WHERE id = ?', [customer_id]);
    if (!custs.length) throw new HttpException('Khách hàng không tồn tại', HttpStatus.NOT_FOUND);
    const cust = custs[0];

    if (cust.points_balance < reward.points_cost) {
      throw new HttpException(`Không đủ điểm. Cần ${reward.points_cost} điểm, bạn có ${cust.points_balance} điểm`, HttpStatus.BAD_REQUEST);
    }

    const code = `UD-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
    await this.db.query(
      'INSERT INTO redemptions (customer_id, reward_id, code, points_spent, status) VALUES (?,?,?,?,?)',
      [customer_id, rewardId, code, reward.points_cost, 'ISSUED']
    );

    const newBalance = cust.points_balance - reward.points_cost;
    await this.db.query('UPDATE customers SET points_balance = ? WHERE id = ?', [newBalance, customer_id]);
    await this.db.query(
      `INSERT INTO point_transactions (customer_id, type, points, balance_after, description)
       VALUES (?, 'REDEEM', ?, ?, ?)`,
      [customer_id, -reward.points_cost, newBalance, `Đổi ưu đãi: ${reward.name} (${code})`]
    );

    return { code, reward_name: reward.name, points_spent: reward.points_cost, new_balance: newBalance };
  }

  @Get('dashboard')
  async getDashboard() {
    const [c1] = await this.db.query("SELECT COUNT(*) AS cnt FROM customers WHERE status='ACTIVE'");
    const [c2] = await this.db.query("SELECT COUNT(*) AS cnt, COALESCE(SUM(total),0) AS revenue FROM orders WHERE status='COMPLETED' AND DATE(created_at)=CURDATE()");
    const [c3] = await this.db.query("SELECT COALESCE(SUM(points_earned),0) AS issued FROM orders WHERE status='COMPLETED'");
    const tierDist = await this.db.query("SELECT t.name AS tier_name, COUNT(c.id) AS count FROM membership_tiers t LEFT JOIN customers c ON t.id=c.tier_id AND c.status='ACTIVE' GROUP BY t.id, t.name ORDER BY t.min_points");

    return {
      total_customers: c1.cnt,
      today_orders: c2.cnt,
      today_revenue: c2.revenue,
      total_points: c3.issued,
      tier_distribution: tierDist
    };
  }
}
