import { Test, TestingModule } from '@nestjs/testing';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';

describe('ResultsController', () => {
  let controller: ResultsController;
  let service: ResultsService;

  const mockResultsService = {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsController],
      providers: [
        { provide: ResultsService, useValue: mockResultsService },
      ],
    }).compile();

    controller = module.get<ResultsController>(ResultsController);
    service = module.get<ResultsService>(ResultsService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debería crear un resultado', async () => {
    const dto: CreateResultDto = { value: '10' } as any;
    const expected = { status: 201, message: 'ok' };
    mockResultsService.create.mockResolvedValue(expected);
    const result = await controller.create(dto);
    expect(result).toEqual(expected);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('debería retornar un resultado por id', async () => {
    const expected = { status: 200, data: { res_id: '1' } };
    mockResultsService.findOne.mockResolvedValue(expected);
    const result = await controller.findOne('1');
    expect(result).toEqual(expected);
    expect(service.findOne).toHaveBeenCalledWith('1');
  });

  it('debería actualizar un resultado', async () => {
    const dto: UpdateResultDto = { value: '20' } as any;
    const expected = { status: 200, message: 'ok' };
    mockResultsService.update.mockResolvedValue(expected);
    const result = await controller.update('1', dto);
    expect(result).toEqual(expected);
    expect(service.update).toHaveBeenCalledWith('1', dto);
  });
});
