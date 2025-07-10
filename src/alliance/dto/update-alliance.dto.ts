import { PartialType } from '@nestjs/mapped-types';
import { CreateAllianceDto } from './create-alliance.dto';

export class UpdateAllianceDto extends PartialType(CreateAllianceDto) {}
