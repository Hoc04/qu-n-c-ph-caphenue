import { Controller, Get, Post, Put, Query, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcryptjs';

@Controller('api/customers')
export class CustomersController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async getCustomers(@Query('search') search: string, @Query('tier') tier: string) {
    let sql = `SELECT c.*, t.name AS tier_name, t.discount_percent, t.point_multiplier
               FROM customers c JOIN membership_tiers t ON c.tier_id = t.id WHERE 1=1`;
    const params: any[] = [];
    if (search) {
      sql += ' AND (c.full_name LIKE ? OR c.phone LIKE ? OR c.code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (tier) {
      sql += ' AND c.tier_id = ?';
      params.push(tier);
    }
    sql += ' ORDER BY c.created_at DESC LIMIT 200';
    return await this.db.query(sql, params);
  }

  @Get('lookup')
  async lookup(@Query('phone') phone: string) {
    if (!phone) throw new HttpException('Cần nhập số điện thoại', HttpStatus.BAD_REQUEST);
    const rows = await this.db.query(`
      SELECT c.*, t.name AS tier_name, t.discount_percent, t.point_multiplier
      FROM customers c JOIN membership_tiers t ON c.tier_id = t.id
      WHERE c.phone = ?
    `, [phone]);

    if (!rows.length) throw new HttpException('Chưa có tài khoản hội viên với SĐT này', HttpStatus.NOT_FOUND);

    const cust = rows[0];
    const history = await this.db.query(
      'SELECT * FROM point_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10',
      [cust.id]
    );
    const vouchers = await this.db.query(`
      SELECT rd.*, rw.name AS reward_name, rw.value
      FROM redemptions rd JOIN rewards rw ON rd.reward_id = rw.id
      WHERE rd.customer_id = ? AND rd.status = 'ISSUED' ORDER BY rd.created_at DESC
    `, [cust.id]);

    return { ...cust, history, vouchers };
  }

  @Post()
  async register(@Body() body: any) {
    const { full_name, phone, password, email, birthday, gender } = body;
    if (!full_name || !phone) throw new HttpException('Họ tên và SĐT là bắt buộc', HttpStatus.BAD_REQUEST);
    if (!password || password.length < 6) throw new HttpException('Mật khẩu phải có tối thiểu 6 ký tự', HttpStatus.BAD_REQUEST);

    const exist = await this.db.query('SELECT id FROM customers WHERE phone = ?', [phone]);
    if (exist.length) throw new HttpException('SĐT đã được đăng ký hội viên', HttpStatus.CONFLICT);

    const count = await this.db.query('SELECT COUNT(*) AS cnt FROM customers');
    const code = `KH${String(count[0].cnt + 1).padStart(4, '0')}`;
    const password_hash = await bcrypt.hash(password, 10);

    const result = await this.db.query(
      `INSERT INTO customers (tier_id, code, full_name, phone, password_hash, email, birthday, gender, points_balance, lifetime_points)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, 50, 50)`,
      [code, full_name, phone, password_hash, email || null, birthday || null, gender || null]
    );

    const custId = result.insertId;
    await this.db.query(
      `INSERT INTO point_transactions (customer_id, type, points, balance_after, description)
       VALUES (?, 'EARN', 50, 50, 'Tặng 50 điểm chào mừng hội viên mới')`,
      [custId]
    );

    return { id: custId, code, message: 'Đăng ký hội viên thành công! Tặng 50 điểm chào mừng.' };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const { full_name, email, birthday, gender, address, status } = body;
    await this.db.query(
      'UPDATE customers SET full_name=?, email=?, birthday=?, gender=?, address=?, status=? WHERE id=?',
      [full_name, email, birthday, gender, address, status, id]
    );
    return { ok: true, message: 'Cập nhật thành công' };
  }
}
