import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';
import { FilterCustomerDto } from './dto/filter-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Auth()
  create(@Body() createCustomerDto: CreateCustomerDto,
  @GetUser() user: User) {
    return this.customersService.create(createCustomerDto, user);
  }

  @Get('/companies/:id')
  @Auth()
  findAll(@Param('id', ParseUUIDPipe) idCompany: string) {
    return this.customersService.findAllByCompany(idCompany);
  }

  @Post('/searches')
  @Auth()
  findOne(@Body() filterCustomerDto: FilterCustomerDto) {
    return this.customersService.findOneCustomer(filterCustomerDto);
  }

  @Patch(':id')
  @Auth()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateCustomerDto: UpdateCustomerDto,
  @GetUser() user: User) {
    return this.customersService.update(id, updateCustomerDto, user);
  }


}
