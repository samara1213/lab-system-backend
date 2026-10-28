import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Param,
  ParseUUIDPipe,
  Get,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachedService } from './attached.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { resolveLaboratoryId } from '../auth/helpers/laboratory-access.helper';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { MAX_ATTACHED_SIZE } from '../storage/file-type.helper';

@Auth()
@Controller('attached')
export class AttachedController {
  constructor(private readonly attachedService: AttachedService) {}
  // adjuntos de una orden (sin la ruta en Storage)
  @RequirePermission('orders:view')
  @Get('order/:id')
  findByOrder(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.attachedService.findByOrder(id, resolveLaboratoryId(user));
  }

  // URL temporal (10 min) para ver un adjunto
  @RequirePermission('orders:view')
  @Get(':id/url')
  getViewUrl(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.attachedService.getViewUrl(id, resolveLaboratoryId(user));
  }

  @RequirePermission('orders:update')
  @Delete(':id')
  remove(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.attachedService.remove(id, resolveLaboratoryId(user));
  }

  @RequirePermission('orders:update')
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
