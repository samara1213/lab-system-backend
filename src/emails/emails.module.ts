import { Module } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { ExceptionModule } from '../exceptions/exception/exception.module';

@Module({
  controllers: [],
  providers: [EmailsService],
  exports: [EmailsService, EmailsModule],
  imports: [ExceptionModule],
})
export class EmailsModule {}
