import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { AuthModule } from '../auth/auth.module';
import { ExceptionModule } from '../exceptions/exception/exception.module';
import { PdfModule } from '../pdf/pdf.module';
import { EmailsModule } from '../emails/emails.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order]),
            AuthModule,
            ExceptionModule,
            PdfModule,
            EmailsModule,
            StorageModule], // Assuming Order is the entity for orders
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [TypeOrmModule, OrdersService], // Exporting TypeOrmModule and OrdersService for use in other modules
})
export class OrdersModule {}
