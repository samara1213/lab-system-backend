import { Test, TestingModule } from '@nestjs/testing';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';

const mockResult = { res_id: 'uuid', res_value: '100', order: { ord_id: 'order-uuid' }, exam: { exa_id: 'exam-uuid' }, param: { par_id: 'param-uuid' } };

const mockResultsService = {
  create: jest.fn().mockResolvedValue({ status: 201, message: 'El resultado se ha creado correctamente' }),
  update: jest.fn().mockResolvedValue({ status: 200, message: 'El resultado se ha actualizado correctamente' }),
  findOne: jest.fn().mockResolvedValue({ status: 200, data: [mockResult] }),
};

describe('ResultsController', () => {
  let controller: ResultsController;
  let service: ResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsController],
      providers: [
        { provide: ResultsService, useValue: mockResultsService },
      ],
    }).compile();
    controller = module.get<ResultsController>(ResultsController);
    service = module.get<ResultsService>(ResultsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe crear un resultado', async () => {
    const dto: CreateResultDto = { res_value: '100', order: 'order-uuid', exam: 'exam-uuid', param: 'param-uuid' } as any;
    const result = await controller.create(dto);
    expect(result).toEqual({ status: 201, message: expect.any(String) });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('debe actualizar un resultado', async () => {
    const dto: UpdateResultDto = { res_value: '110', order: 'order-uuid', exam: 'exam-uuid', param: 'param-uuid' } as any;
    const result = await controller.update('uuid', dto);
    expect(result).toEqual({ status: 200, message: expect.any(String) });
    expect(service.update).toHaveBeenCalledWith('uuid', dto);
  });

  it('debe consultar resultados por id de orden', async () => {
    const result = await controller.findOne('order-uuid');
    expect(result).toEqual({ status: 200, data: [mockResult] });
    expect(service.findOne).toHaveBeenCalledWith('order-uuid');
  });
});
