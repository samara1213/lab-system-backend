import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { AuthModule } from '../auth/auth.module';
import { ExceptionModule } from '../exceptions/exception/exception.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order]),
            AuthModule,
            ExceptionModule], // Assuming Order is the entity for orders
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [TypeOrmModule], // Exporting TypeOrmModule and OrdersService for use in other modules
})
export class OrdersModule {}
