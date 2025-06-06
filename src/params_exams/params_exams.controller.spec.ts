import { Test, TestingModule } from '@nestjs/testing';
import { ParamsExamsController } from './params_exams.controller';
import { ParamsExamsService } from './params_exams.service';
import { CreateParamsExamDto } from './dto/create-params_exam.dto';
import { UpdateParamsExamDto } from './dto/update-params_exam.dto';

describe('ParamsExamsController', () => {
  let controller: ParamsExamsController;
  let service: ParamsExamsService;

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
    service = module.get<ParamsExamsService>(ParamsExamsService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debería crear un parámetro de examen', async () => {
    const dto: CreateParamsExamDto = { name: 'param' } as any;
    const expected = { status: 201, message: 'ok' };
    mockParamsExamsService.create.mockResolvedValue(expected);
    const result = await controller.create(dto);
    expect(result).toEqual(expected);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('debería actualizar un parámetro de examen', async () => {
    const dto: UpdateParamsExamDto = { name: 'nuevo' } as any;
    const expected = { status: 200, message: 'ok' };
    mockParamsExamsService.update.mockResolvedValue(expected);
    const result = await controller.update('uuid', dto);
    expect(result).toEqual(expected);
    expect(service.update).toHaveBeenCalledWith('uuid', dto);
  });

  it('debería buscar parámetros por id de examen', async () => {
    const expected = { status: 200, data: [] };
    mockParamsExamsService.findByExamId.mockResolvedValue(expected);
    const result = await controller.findByExamId('exa-uuid');
    expect(result).toEqual(expected);
    expect(service.findByExamId).toHaveBeenCalledWith('exa-uuid');
  });
});
