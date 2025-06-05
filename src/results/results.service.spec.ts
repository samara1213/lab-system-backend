import { Test, TestingModule } from '@nestjs/testing';
import { ResultsService } from './results.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from './entities/result.entity';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';

describe('ResultsService', () => {
  let service: ResultsService;
  let repo: Repository<Result>;

  const mockResult = { res_id: 'uuid', res_value: '100', order: { ord_id: 'order-uuid' }, exam: { exa_id: 'exam-uuid' }, param: { par_id: 'param-uuid' } };

  const mockRepo = {
    create: jest.fn().mockReturnValue(mockResult),
    save: jest.fn().mockResolvedValue(mockResult),
    preload: jest.fn().mockResolvedValue(mockResult),
    find: jest.fn().mockResolvedValue([mockResult]),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsService,
        { provide: getRepositoryToken(Result), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<ResultsService>(ResultsService);
    repo = module.get(getRepositoryToken(Result));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear un resultado', async () => {
    const dto: CreateResultDto = { res_value: '100', order: 'order-uuid', exam: 'exam-uuid', param: 'param-uuid' } as any;
    const result = await service.create(dto);
    expect(result).toHaveProperty('status', 201);
    expect(repo.create).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
  });

  it('debe actualizar un resultado', async () => {
    const dto: UpdateResultDto = { res_value: '110', order: 'order-uuid', exam: 'exam-uuid', param: 'param-uuid' } as any;
    const result = await service.update('uuid', dto);
    expect(result).toHaveProperty('status', 200);
    expect(repo.preload).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
  });

  it('debe consultar resultados por id de orden', async () => {
    const result = await service.findOne('order-uuid');
    expect(result).toHaveProperty('status', 200);
    expect(Array.isArray(result.data)).toBe(true);
    expect(repo.find).toHaveBeenCalledWith({
      where: { order: { ord_id: 'order-uuid' } },
      relations: ['order', 'exam', 'param'],
    });
  });
});
