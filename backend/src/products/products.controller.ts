import { Controller, Get, Query, Post, Body, Res } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('api')
export class ProductsController {
  constructor(private readonly db: DatabaseService) {}

  @Get('products')
  async getProducts(@Query('category') category: string) {
    let sql = `SELECT p.*, c.name AS category_name
               FROM products p
               JOIN product_categories c ON p.category_id = c.id
               WHERE p.is_active = 1`;
    const params: any[] = [];
    if (category && category !== 'ALL') {
      sql += ' AND c.name = ?';
      params.push(category);
    }
    sql += ' ORDER BY p.category_id ASC, p.id ASC';
    return await this.db.query(sql, params);
  }

  @Get('product-categories')
  async getCategories() {
    return await this.db.query('SELECT * FROM product_categories ORDER BY id ASC');
  }

  @Post('products')
  async createProduct(@Body() body: any) {
    const { category_id, name, price, description, image_url, image_emoji } = body;
    const res = await this.db.query(
      `INSERT INTO products (category_id, name, price, description, image_url, image_emoji, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [category_id || 1, name, price, description || '', image_url || null, image_emoji || '☕']
    );
    return { id: res.insertId, name, price, message: 'Thêm sản phẩm thành công' };
  }
}
