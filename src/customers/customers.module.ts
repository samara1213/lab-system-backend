import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { AuthModule } from 'src/auth/auth.module';
import { LaboratoryModule } from 'src/laboratory/laboratory.module';

@Module({
  imports: [TypeOrmModule.forFeature([Customer]),
            AuthModule,
            LaboratoryModule
          ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [TypeOrmModule],
})
export class CustomersModule {}
