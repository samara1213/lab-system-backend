import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AllianceController } from './alliance.controller';
import { AllianceService } from './alliance.service';

describe('AllianceController', () => {
  let controller: AllianceController;
  const user = { laboratory: { lab_id: 'lab-a' } } as any;
  const mockAllianceService = {
    create: jest.fn(),
    update: jest.fn(),
    findAllByLaboratory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AllianceController],
      providers: [{ provide: AllianceService, useValue: mockAllianceService }],
    }).compile();
    controller = module.get<AllianceController>(AllianceController);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('crea, actualiza y lista dentro del laboratorio del usuario', async () => {
    const dto = { ali_nombre: 'Convenio', ali_laboratory_id: 'lab-a' };
    await controller.create(user, dto as any);
    await controller.update(user, 'ali-1', { ali_nombre: 'Nuevo' } as any);
    await controller.findAllByLaboratory(user, 'lab-a');
    expect(mockAllianceService.create).toHaveBeenCalledWith('lab-a', dto);
    expect(mockAllianceService.update).toHaveBeenCalledWith('ali-1', 'lab-a', {
      ali_nombre: 'Nuevo',
    });
    expect(mockAllianceService.findAllByLaboratory).toHaveBeenCalledWith(
      'lab-a',
    );
  });

  it('rechaza con 404 un laboratorio ajeno', () => {
    expect(() => controller.findAllByLaboratory(user, 'lab-b')).toThrow(
      NotFoundException,
    );
    expect(() =>
      controller.update(user, 'ali-1', { ali_laboratory_id: 'lab-b' } as any),
    ).toThrow(NotFoundException);
    expect(mockAllianceService.update).not.toHaveBeenCalled();
  });
});
