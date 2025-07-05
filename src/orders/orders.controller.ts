import { Controller, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Get } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { FilterOrderDto } from './dto/filter-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Post('customers/laboaratory')
  findByCustomerAndLaboratory(@Body() filterOrderDto: FilterOrderDto) {
    return this.ordersService.findByCustomerAndLaboratory(filterOrderDto);
  }

  @Post('laboratory')
  findByLaboratoryAndStatus(@Body() filterOrderDto: FilterOrderDto) {
    return this.ordersService.findByLaboratoryAndStatus(filterOrderDto);
  }

  @Post('laboaratory/status')
  countOrdersByStatusAndLaboratory(@Body() filterOrderDto: FilterOrderDto) {
    return this.ordersService.countOrdersByStatusAndLaboratory(filterOrderDto);
  }

  @Post('laboratory/:lab_id')
  countOrdersToday(@Param('lab_id', ParseUUIDPipe) lab_id: string) {
    return this.ordersService.countOrdersToday(lab_id);
  }

  @Patch('change/status')
  changeStatus(@Body() filterOrderDto: FilterOrderDto) {
    return this.ordersService.changeStatus(filterOrderDto);
  }

  @Post('cancel/:lab_id')
  countOrdersCancel(@Param('lab_id') lab_id: string) {
    return this.ordersService.countOrdersCancel(lab_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.remove(id);
  }

  
  @Get('results/:id')
  findResultsByOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findResultsByOrder(id);
  }

  @Get('generates/results/:id')
  generatePdfResults(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.generatePdfResults(id);
  }
  
  @Get('emails/:id')
  sendEmailResults(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.sendEmailResults(id);
  }

  @Get('urlprefirmate/:id')
  generateUrlPrefirmate(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.generateUrlPrefirmate(id);
  }
}
