import { Test, TestingModule } from '@nestjs/testing';
import { AllianceController } from './alliance.controller';
import { AllianceService } from './alliance.service';
import { ExceptionService } from '../exceptions/exception/exception.service';

describe('AllianceController', () => {
  let controller: AllianceController;
  let service: AllianceService;

  const mockAllianceService = {
    create: jest.fn().mockResolvedValue({ status: 201, message: 'se ha creado correctamente la alianza' }),
    update: jest.fn().mockResolvedValue({ status: 200, message: 'Alianza actualizada correctamente' }),
    findAllByLaboratory: jest.fn().mockResolvedValue({ status: 200, data: [] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AllianceController],
      providers: [
        { provide: AllianceService, useValue: mockAllianceService },
        { provide: ExceptionService, useValue: { handleDBError: jest.fn() } },
      ],
    }).compile();

    controller = module.get<AllianceController>(AllianceController);
    service = module.get<AllianceService>(AllianceService);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debería crear una alianza', async () => {
    const dto = { ali_nombre: 'A', ali_direccion: 'D', ali_telefono: 'T', ali_nombre_contacto: 'C', ali_laboratory_id: 'uuid' };
    const result = await controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ status: 201, message: 'se ha creado correctamente la alianza' });
  });

  it('debería actualizar una alianza', async () => {
    const dto = { ali_nombre: 'Nuevo' };
    const result = await controller.update('uuid', dto as any);
    expect(service.update).toHaveBeenCalledWith('uuid', dto);
    expect(result).toEqual({ status: 200, message: 'Alianza actualizada correctamente' });
  });

  it('debería listar alianzas por laboratorio', async () => {
    const result = await controller.findAllByLaboratory('uuid');
    expect(service.findAllByLaboratory).toHaveBeenCalledWith('uuid');
    expect(result).toEqual({ status: 200, data: [] });
  });
});
