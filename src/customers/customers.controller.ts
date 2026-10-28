import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { PaginationDto, QUERY_PIPE } from '../common/dto/pagination.dto';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { FilterCustomerDto } from './dto/filter-customer.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { resolveLaboratoryId } from '../auth/helpers/laboratory-access.helper';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@Auth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @RequirePermission('customers:create')
  @Post()
  create(@GetUser() user: User, @Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(
      resolveLaboratoryId(user, createCustomerDto.laboratory),
      createCustomerDto,
    );
  }

  // pacientes del laboratorio paginados en el servidor (?page, ?limit, ?search)
  @RequirePermission('customers:view')
  @Get()
  findAllByLaboratory(
    @GetUser() user: User,
    @Query(QUERY_PIPE) dto: PaginationDto,
  ) {
    return this.customersService.findPaginated(resolveLaboratoryId(user), dto);
  }

  // compatibilidad (laboratorio en la url): quitar en la Fase 7
  @RequirePermission('customers:view', 'orders:create')
  @Get('/companies/:id')
  findAll(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) idCompany: string,
  ) {
    return this.customersService.findAllByCompany(
      resolveLaboratoryId(user, idCompany),
    );
  }

  @RequirePermission('customers:view', 'orders:create')
  @Post('/searches')
  findOneCustomer(
    @GetUser() user: User,
    @Body() filterCustomerDto: FilterCustomerDto,
  ) {
    return this.customersService.findOneCustomer({
      ...filterCustomerDto,
      laboratory: resolveLaboratoryId(user, filterCustomerDto.laboratory),
    });
  }

  @RequirePermission('customers:update')
  @Patch(':id')
  update(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(
      id,
      resolveLaboratoryId(user, updateCustomerDto.laboratory),
      updateCustomerDto,
    );
  }
}
