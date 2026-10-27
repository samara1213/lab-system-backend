import { Test, TestingModule } from '@nestjs/testing';
import { ParamsExamsController } from './params_exams.controller';
import { ParamsExamsService } from './params_exams.service';

describe('ParamsExamsController', () => {
  let controller: ParamsExamsController;
  const user = { laboratory: { lab_id: 'lab-a' } } as any;
  const mockParamsExamsService = {
    create: jest.fn(),
    update: jest.fn(),
    findByExamId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParamsExamsController],
      providers: [
        { provide: ParamsExamsService, useValue: mockParamsExamsService },
      ],
    }).compile();
    controller = module.get<ParamsExamsController>(ParamsExamsController);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('crea, actualiza y lista parámetros con el laboratorio del usuario', async () => {
    const dto = { par_name: 'Hemoglobina', par_range: false, exam: 'exa-1' };
    await controller.create(user, dto as any);
    await controller.update(user, 'par-1', { par_name: 'X' } as any);
    await controller.findByExamId(user, 'exa-1');
    expect(mockParamsExamsService.create).toHaveBeenCalledWith('lab-a', dto);
    expect(mockParamsExamsService.update).toHaveBeenCalledWith(
      'par-1',
      'lab-a',
      { par_name: 'X' },
    );
    expect(mockParamsExamsService.findByExamId).toHaveBeenCalledWith(
      'exa-1',
      'lab-a',
    );
  });
});
