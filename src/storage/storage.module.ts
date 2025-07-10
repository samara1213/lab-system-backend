import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ExceptionModule } from '../exceptions/exception/exception.module';

@Module({
  imports: [ExceptionModule],
  controllers: [],
  providers: [StorageService],
  exports: [StorageService, StorageModule],
})
export class StorageModule {}
