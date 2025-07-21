import { Controller, Body, Patch, Post, UploadedFile, UseInterceptors, Param, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachedService } from './attached.service';
import { Auth } from '../auth/decorators/auth.decorator';

@Auth()
@Controller('attached')
export class AttachedController {
  constructor(private readonly attachedService: AttachedService) {}
  @Post('upload/:id')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttached(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    
    return await this.attachedService.create(id, file);
  }
}
