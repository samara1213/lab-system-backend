import { Test, TestingModule } from '@nestjs/testing';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

describe('ResultsController', () => {
  let controller: ResultsController;
  const user = { laboratory: { lab_id: 'lab-a' } } as any;
  const mockResultsService = {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsController],
      providers: [{ provide: ResultsService, useValue: mockResultsService }],
    }).compile();
    controller = module.get<ResultsController>(ResultsController);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('crea un resultado con el laboratorio del usuario', async () => {
    const dto = { res_value: '10', order: 'ord', exam: 'exa', param: 'par' };
    mockResultsService.create.mockResolvedValue({ status: 201 });
    const result = await controller.create(user, dto as any);
    expect(result).toEqual({ status: 201 });
    expect(mockResultsService.create).toHaveBeenCalledWith('lab-a', dto);
  });

  it('lista los resultados de una orden dentro del laboratorio', async () => {
    await controller.findOne(user, 'ord-1');
    expect(mockResultsService.findOne).toHaveBeenCalledWith('ord-1', 'lab-a');
  });

  it('actualiza un resultado dentro del laboratorio', async () => {
    const dto = { res_value: '20' };
    await controller.update(user, 'res-1', dto as any);
    expect(mockResultsService.update).toHaveBeenCalledWith(
      'res-1',
      'lab-a',
      dto,
    );
  });
});
