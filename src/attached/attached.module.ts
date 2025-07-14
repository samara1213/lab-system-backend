import { Module } from '@nestjs/common';
import { AttachedService } from './attached.service';
import { AttachedController } from './attached.controller';
import { AuthModule } from '../auth/auth.module';
import { PdfModule } from '../pdf/pdf.module';
import { ExceptionModule } from '../exceptions/exception/exception.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attached } from './entities/attached.entity';

@Module({
  controllers: [AttachedController],
  imports: [TypeOrmModule.forFeature([Attached]),
  AuthModule, PdfModule, ExceptionModule],
  providers: [AttachedService],
  exports: [TypeOrmModule], // Exporting TypeOrmModule and OrdersService for use in other modules
})
export class AttachedModule {}
