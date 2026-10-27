import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachedService } from './attached.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { resolveLaboratoryId } from '../auth/helpers/laboratory-access.helper';
import { MAX_ATTACHED_SIZE } from '../storage/file-type.helper';

@Auth()
@Controller('attached')
export class AttachedController {
  constructor(private readonly attachedService: AttachedService) {}
  @Post('upload/:id')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_ATTACHED_SIZE, files: 1 },
    }),
  )
  async uploadAttached(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.attachedService.create(
      id,
      resolveLaboratoryId(user),
      file,
    );
  }
}
