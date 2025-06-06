import { Module } from '@nestjs/common';
import { ExceptionService } from './exception.service';

@Module({
  controllers: [],
  providers: [ExceptionService],
  exports: [ExceptionService, ExceptionModule],
  imports: [],
})
export class ExceptionModule {}
