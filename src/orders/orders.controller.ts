import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Get,
  Query,
} from '@nestjs/common';
import { FindOrdersDto } from './dto/find-orders.dto';
import { QUERY_PIPE } from '../common/dto/pagination.dto';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FilterOrderDto } from './dto/filter-order.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { resolveLaboratoryId } from '../auth/helpers/laboratory-access.helper';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@Auth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @RequirePermission('orders:create')
  @Post()
  create(@GetUser() user: User, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(
      resolveLaboratoryId(user, createOrderDto.lab_id),
      createOrderDto,
    );
  }

  // búsqueda paginada en el servidor (Buscar órdenes)
  @RequirePermission('orders:view')
  @Get()
  findAll(@GetUser() user: User, @Query(QUERY_PIPE) dto: FindOrdersDto) {
    return this.ordersService.findPaginated(resolveLaboratoryId(user), dto);
  }

  @RequirePermission('orders:view')
  @Post('customers/laboaratory')
  findByCustomerAndLaboratory(
    @GetUser() user: User,
    @Body() filterOrderDto: FilterOrderDto,
  ) {
    return this.ordersService.findByCustomerAndLaboratory({
      ...filterOrderDto,
      lab_id: resolveLaboratoryId(user, filterOrderDto.lab_id),
    });
  }

  @RequirePermission('orders:view')
  @Post('laboratory')
  findByLaboratoryAndStatus(
    @GetUser() user: User,
    @Body() filterOrderDto: FilterOrderDto,
  ) {
    return this.ordersService.findByLaboratoryAndStatus({
      ...filterOrderDto,
      lab_id: resolveLaboratoryId(user, filterOrderDto.lab_id),
    });
  }

  @RequirePermission('orders:view')
  @Post('laboaratory/status')
  countOrdersByStatusAndLaboratory(
    @GetUser() user: User,
    @Body() filterOrderDto: FilterOrderDto,
  ) {
    return this.ordersService.countOrdersByStatusAndLaboratory({
      ...filterOrderDto,
      lab_id: resolveLaboratoryId(user, filterOrderDto.lab_id),
    });
  }

  @RequirePermission('orders:view')
  @Post('laboratory/:lab_id')
  countOrdersToday(
    @GetUser() user: User,
    @Param('lab_id', ParseUUIDPipe) lab_id: string,
  ) {
    return this.ordersService.countOrdersToday(
      resolveLaboratoryId(user, lab_id),
    );
  }

  @RequirePermission('orders:update')
  @Patch('change/status')
  changeStatus(@GetUser() user: User, @Body() filterOrderDto: FilterOrderDto) {
    return this.ordersService.changeStatus(
      filterOrderDto,
      resolveLaboratoryId(user),
    );
  }

  @RequirePermission('orders:view')
  @Post('cancel/:lab_id')
  countOrdersCancel(@GetUser() user: User, @Param('lab_id') lab_id: string) {
    return this.ordersService.countOrdersCancel(
      resolveLaboratoryId(user, lab_id),
    );
  }

  @RequirePermission('orders:view', 'results:view')
  @Get(':id')
  findOne(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id, resolveLaboratoryId(user));
  }

  @RequirePermission('orders:delete')
  @Delete(':id')
  remove(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.remove(id, resolveLaboratoryId(user));
  }

  @RequirePermission('orders:view', 'results:view')
  @Get('results/:id')
  findResultsByOrder(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findResultsByOrder(id, resolveLaboratoryId(user));
  }

  @RequirePermission('orders:update', 'results:create')
  @Get('generates/results/:id')
  generatePdfResults(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.generatePdfResults(id, resolveLaboratoryId(user));
  }

  @RequirePermission('orders:update')
  @Get('emails/:id')
  sendEmailResults(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.sendEmailResults(id, resolveLaboratoryId(user));
  }

  @RequirePermission('orders:view')
  @Get('urlprefirmate/:id')
  generateUrlPrefirmate(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.generateUrlPrefirmate(
      id,
      resolveLaboratoryId(user),
    );
  }
}
