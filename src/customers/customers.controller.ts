import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { FilterCustomerDto } from './dto/filter-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post() 
  create(@Body() createCustomerDto: CreateCustomerDto  ) {
    return this.customersService.create(createCustomerDto);
  }

  @Get('/companies/:id')
  findAll(@Param('id', ParseUUIDPipe) idCompany: string) {
    return this.customersService.findAllByCompany(idCompany);
  }

  @Post('/searches')
  findOneCustomer(@Body() filterCustomerDto: FilterCustomerDto) {
    return this.customersService.findOneCustomer(filterCustomerDto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateCustomerDto);
  }


}
