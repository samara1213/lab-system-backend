import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateExamClassificationDto } from './create-exam_classification.dto';

// el alcance (sistema o laboratorio) no cambia después de creada
export class UpdateExamClassificationDto extends PartialType(
  OmitType(CreateExamClassificationDto, ['laboratory'] as const),
) {}
