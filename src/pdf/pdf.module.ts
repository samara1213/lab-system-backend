import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { StorageModule } from '../storage/storage.module';
import { ExceptionModule } from '../exceptions/exception/exception.module';

@Module({
  imports: [StorageModule, ExceptionModule],
  controllers: [],
  providers: [PdfService],
  exports: [PdfService, PdfModule],
})
export class PdfModule {}
