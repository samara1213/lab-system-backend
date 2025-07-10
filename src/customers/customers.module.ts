import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { AuthModule } from '../auth/auth.module';
import { LaboratoryModule } from '../laboratory/laboratory.module';
import { ExceptionModule } from '../exceptions/exception/exception.module';

@Module({
  imports: [TypeOrmModule.forFeature([Customer]),
            AuthModule,
            LaboratoryModule,
            ExceptionModule
          ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [TypeOrmModule],
})
export class CustomersModule {}
