import { Module } from '@nestjs/common';
import { EmailsService } from './emails.service';

@Module({
  controllers: [],
  providers: [EmailsService],
  exports: [EmailsService, EmailsModule],
})
export class EmailsModule {}
