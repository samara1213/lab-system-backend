import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PdfTemplatesService } from './pdf-templates.service';
import {
  CreatePdfTemplateDto,
  FindPdfTemplatesDto,
  PreviewPdfTemplateDto,
  UpdatePdfTemplateDto,
} from './dto/pdf-template.dto';
import { MAX_TEMPLATE_SIZE } from './engine/template-engine';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

const TEMPLATE_UPLOAD = { limits: { fileSize: MAX_TEMPLATE_SIZE, files: 1 } };

// el PDF se muestra en el navegador (vista previa), no se descarga
const asPdf = (buffer: Buffer) =>
  new StreamableFile(buffer, {
    type: 'application/pdf',
    disposition: 'inline; filename="vista-previa.pdf"',
  });

// módulo global: solo el super administrador tiene estos permisos
@Auth()
@RequirePermission('pdf_templates:view')
@Controller('pdf-templates')
export class PdfTemplatesController {
  constructor(private readonly templatesService: PdfTemplatesService) {}

  @Get()
  findAll(@Query() query: FindPdfTemplatesDto) {
    return this.templatesService.findAll(query.laboratory);
  }

  // plantilla base para descargar y adaptar
  @Get('default')
  getDefault() {
    return this.templatesService.getDefault();
  }

  @Post('preview')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', TEMPLATE_UPLOAD))
  async previewFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: PreviewPdfTemplateDto,
  ) {
    return asPdf(await this.templatesService.previewFile(file, dto.laboratory));
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOne(id);
  }

  @Get(':id/preview')
  async previewSaved(@Param('id', ParseUUIDPipe) id: string) {
    return asPdf(await this.templatesService.previewSaved(id));
  }

  @Post()
  @RequirePermission('pdf_templates:create')
  @UseInterceptors(FileInterceptor('file', TEMPLATE_UPLOAD))
  create(
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreatePdfTemplateDto,
  ) {
    return this.templatesService.create(user, file, dto);
  }

  @Patch(':id/activate')
  @RequirePermission('pdf_templates:update')
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.activate(id);
  }

  @Patch(':id/deactivate')
  @RequirePermission('pdf_templates:update')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.deactivate(id);
  }

  @Patch(':id')
  @RequirePermission('pdf_templates:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePdfTemplateDto,
  ) {
    return this.templatesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('pdf_templates:delete')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.remove(id);
  }
}
