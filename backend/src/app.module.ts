import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { CommonModule } from './common-modules/common.module';

@Module({
  imports: [
    DatabaseModule,
    ProductsModule,
    CustomersModule,
    AuthModule,
    OrdersModule,
    CommonModule
  ]
})
export class AppModule {}
