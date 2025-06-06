import { Test, TestingModule } from '@nestjs/testing';
import { LaboratoryController } from './laboratory.controller';
import { LaboratoryService } from './laboratory.service';
import { CreateLaboratoryDto } from './dto/create-laboratory.dto';
import { UpdateLaboratoryDto } from './dto/update-laboratory.dto';

const mockLabService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

describe('LaboratoryController', () => {
  let controller: LaboratoryController;
  let service: LaboratoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LaboratoryController],
      providers: [
        { provide: LaboratoryService, useValue: mockLabService },
      ],
    }).compile();

    controller = module.get<LaboratoryController>(LaboratoryController);
    service = module.get<LaboratoryService>(LaboratoryService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debería crear un laboratorio', async () => {
    const dto: CreateLaboratoryDto = {
      lab_nit: '123',
      lab_name: 'Lab',
      lab_address: 'Dir',
      lab_phone: '123',
      lab_status: 'ACTIVO',
      lab_email: 'lab@email.com',
      lab_legal_representative: 'Rep',
    };
    const expected = { status: 201, message: 'ok' };
    mockLabService.create.mockResolvedValue(expected);
    const result = await controller.create(dto);
    expect(result).toEqual(expected);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('debería retornar todos los laboratorios', async () => {
    const expected = { status: 200, data: [] };
    mockLabService.findAll.mockResolvedValue(expected);
    const result = await controller.findAll();
    expect(result).toEqual(expected);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('debería retornar un laboratorio por id', async () => {
    const expected = { status: 200, data: { lab_id: '1' } };
    mockLabService.findOne.mockResolvedValue(expected);
    const result = await controller.findOne('1');
    expect(result).toEqual(expected);
    expect(service.findOne).toHaveBeenCalledWith('1');
  });

  it('debería actualizar un laboratorio', async () => {
    const dto: UpdateLaboratoryDto = { lab_name: 'Nuevo' };
    const expected = { status: 200, message: 'ok' };
    mockLabService.update.mockResolvedValue(expected);
    const result = await controller.update('1', dto);
    expect(result).toEqual(expected);
    expect(service.update).toHaveBeenCalledWith('1', dto);
  });
});
