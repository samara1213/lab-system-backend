import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';

describe('ExamsController', () => {
  let controller: ExamsController;
  const user = { laboratory: { lab_id: 'lab-a' } } as any;
  const mockExamsService = {
    create: jest.fn(),
    findAllByLaboratory: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamsController],
      providers: [{ provide: ExamsService, useValue: mockExamsService }],
    }).compile();
    controller = module.get<ExamsController>(ExamsController);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('crea el examen en el laboratorio del usuario', async () => {
    const dto = { exa_name: 'Hemograma', exa_price: 10, laboratory: 'lab-a' };
    await controller.create(user, dto as any);
    expect(mockExamsService.create).toHaveBeenCalledWith('lab-a', dto);
  });

  it('lista, consulta y actualiza dentro del laboratorio del usuario', async () => {
    await controller.findAllByCompany(user, 'lab-a');
    await controller.findOne(user, 'exa-1');
    await controller.update(user, 'exa-1', { exa_name: 'X' } as any);
    expect(mockExamsService.findAllByLaboratory).toHaveBeenCalledWith('lab-a');
    expect(mockExamsService.findOne).toHaveBeenCalledWith('exa-1', 'lab-a');
    expect(mockExamsService.update).toHaveBeenCalledWith('exa-1', 'lab-a', { exa_name: 'X' });
  });

  it('rechaza con 404 un laboratorio ajeno', () => {
    expect(() => controller.findAllByCompany(user, 'lab-b')).toThrow(NotFoundException);
    expect(() => controller.create(user, { laboratory: 'lab-b' } as any)).toThrow(NotFoundException);
    expect(mockExamsService.findAllByLaboratory).not.toHaveBeenCalled();
    expect(mockExamsService.create).not.toHaveBeenCalled();
  });
});
