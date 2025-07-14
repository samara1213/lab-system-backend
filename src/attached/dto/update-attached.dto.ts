import { PartialType } from '@nestjs/mapped-types';
import { CreateAttachedDto } from './create-attached.dto';

export class UpdateAttachedDto extends PartialType(CreateAttachedDto) {}
