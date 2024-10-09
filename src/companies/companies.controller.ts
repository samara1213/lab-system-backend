import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Put } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Auth()
  create(@Body() createCompanyDto: CreateCompanyDto,
  @GetUser() user: User) {

    return this.companiesService.create(createCompanyDto, user);
  }

  @Get()
  @Auth()
  findAll() {
    return this.companiesService.findAll();
  }

  @Patch(':id')
  @Auth()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateCompanyDto: UpdateCompanyDto,
  @GetUser() user: User) {
    return this.companiesService.update(id, updateCompanyDto, user);
  }

  @Put(':id')
  @Auth()
  inactive(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.companiesService.inactive(id, user);
  }
}
