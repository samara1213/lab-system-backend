import { Test, TestingModule } from '@nestjs/testing';
import { LaboratoryController } from './laboratory.controller';
import { LaboratoryService } from './laboratory.service';
import { CreateLaboratoryDto } from './dto/create-laboratory.dto';
import { UpdateLaboratoryDto } from './dto/update-laboratory.dto';

describe('LaboratoryController', () => {
  let controller: LaboratoryController;
  let service: LaboratoryService;

  const mockLaboratoryService = {
    create: jest.fn(dto => ({ status: 201, message: 'El registro de laboratorio se ha creado correctamente' })),
    findAll: jest.fn(() => ({ status: 200, data: [] })),
    findOne: jest.fn(id => ({ status: 200, data: { lab_id: id } })),
    update: jest.fn((id, dto) => ({ status: 200, message: 'El registro de laboratorio se ha actualizado correctamente' })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LaboratoryController],
      providers: [
        {
          provide: LaboratoryService,
          useValue: mockLaboratoryService,
        },
      ],
    }).compile();

    controller = module.get<LaboratoryController>(LaboratoryController);
    service = module.get<LaboratoryService>(LaboratoryService);
  });

  it('debería estar definido el controlador', () => {
    expect(controller).toBeDefined();
  });

  it('debería crear un laboratorio', () => {
    const dto: CreateLaboratoryDto = {
      lab_nit: '123456789',
      lab_dv: '1',
      lab_name: 'LabTest',
      lab_address: 'Address',
      lab_phone: '123456',
      lab_status: 'ACTIVO',
      lab_logo: '',
      lab_email: 'test@lab.com',
      lab_legal_representative: 'Rep',
    };
    expect(controller.create(dto)).toEqual({ status: 201, message: 'El registro de laboratorio se ha creado correctamente' });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('debería retornar todos los laboratorios', () => {
    expect(controller.findAll()).toEqual({ status: 200, data: [] });
    expect(service.findAll).toHaveBeenCalled();
  });

  it('debería retornar un laboratorio por id', () => {
    expect(controller.findOne('uuid')).toEqual({ status: 200, data: { lab_id: 'uuid' } });
    expect(service.findOne).toHaveBeenCalledWith('uuid');
  });

  it('debería actualizar un laboratorio', () => {
    const dto: UpdateLaboratoryDto = { lab_name: 'Updated' } as any;
    expect(controller.update('uuid', dto)).toEqual({ status: 200, message: 'El registro de laboratorio se ha actualizado correctamente' });
    expect(service.update).toHaveBeenCalledWith('uuid', dto);
  });
});
