import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfService } from './pdf.service';
import { PdfTemplatesService } from './pdf-templates.service';
import { PdfTemplatesController } from './pdf-templates.controller';
import { PdfRendererService } from './engine/pdf-renderer.service';
import { TemplateResolverService } from './engine/template-resolver.service';
import { PdfTemplate } from './entities/pdf_template.entity';
import { Laboratory } from '../laboratory/entities/laboratory.entity';
import { StorageModule } from '../storage/storage.module';
import { ExceptionModule } from '../exceptions/exception/exception.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PdfTemplate, Laboratory]),
    StorageModule,
    ExceptionModule,
    AuthModule,
  ],
  controllers: [PdfTemplatesController],
  providers: [
    PdfService,
    PdfTemplatesService,
    PdfRendererService,
    TemplateResolverService,
  ],
  exports: [PdfService],
})
export class PdfModule {}
