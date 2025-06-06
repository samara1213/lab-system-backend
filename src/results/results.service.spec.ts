import { Test, TestingModule } from '@nestjs/testing';
import { ResultsService } from './results.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Result } from './entities/result.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';

describe('ResultsService', () => {
  let service: ResultsService;
  const mockResultRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    preload: jest.fn(),
  };
  const mockExceptionService = { handleDBError: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsService,
        { provide: getRepositoryToken(Result), useValue: mockResultRepo },
        { provide: ExceptionService, useValue: mockExceptionService },
      ],
    }).compile();
    service = module.get<ResultsService>(ResultsService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear un resultado', async () => {
    const dto = { value: '10', order: 'ord', exam: 'exa', param: 'par' };
    const resultEntity = { ...dto, order: { ord_id: 'ord' }, exam: { exa_id: 'exa' }, param: { par_id: 'par' } };
    mockResultRepo.create.mockReturnValue(resultEntity);
    mockResultRepo.save.mockResolvedValue(resultEntity);
    const result = await service.create(dto as any);
    expect(result.status).toBe(201);
    expect(mockResultRepo.create).toHaveBeenCalledWith({
      ...dto,
      order: { ord_id: dto.order },
      exam: { exa_id: dto.exam },
      param: { par_id: dto.param },
    });
    expect(mockResultRepo.save).toHaveBeenCalledWith(resultEntity);
  });

  it('debería retornar resultados por id de orden', async () => {
    const results = [{ res_id: '1' }];
    mockResultRepo.find.mockResolvedValue(results);
    const result = await service.findOne('ord-uuid');
    expect(result.status).toBe(200);
    expect(result.data).toEqual(results);
    expect(mockResultRepo.find).toHaveBeenCalledWith({
      where: { order: { ord_id: 'ord-uuid' } },
      relations: ['order', 'exam', 'param'],
    });
  });

  it('debería actualizar un resultado', async () => {
    const dto = { value: '20', order: 'ord', exam: 'exa', param: 'par' };
    const resultEntity = { res_id: 'res', ...dto, order: { ord_id: 'ord' }, exam: { exa_id: 'exa' }, param: { par_id: 'par' } };
    mockResultRepo.preload.mockResolvedValue(resultEntity);
    mockResultRepo.save.mockResolvedValue(resultEntity);
    const result = await service.update('res', dto as any);
    expect(result.status).toBe(200);
    expect(mockResultRepo.preload).toHaveBeenCalledWith({
      res_id: 'res',
      ...dto,
      order: { ord_id: dto.order },
      exam: { exa_id: dto.exam },
      param: { par_id: dto.param },
    });
    expect(mockResultRepo.save).toHaveBeenCalledWith(resultEntity);
  });
});
