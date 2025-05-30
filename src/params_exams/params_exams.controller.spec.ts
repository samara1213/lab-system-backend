import { Test, TestingModule } from '@nestjs/testing';
import { ParamsExamsController } from './params_exams.controller';
import { ParamsExamsService } from './params_exams.service';
import { CreateParamsExamDto } from './dto/create-params_exam.dto';
import { UpdateParamsExamDto } from './dto/update-params_exam.dto';
import { User } from '../auth/entities/user.entity';

describe('ParamsExamsController', () => {
  let controller: ParamsExamsController;
  let service: ParamsExamsService;

  const userMock = { use_id: 'user-uuid' } as User;
  const createDto: CreateParamsExamDto = {
    par_name: 'Parametro',
    par_default_value: '10',
    par_range: false,
    par_unit_extent: 'mg/dL',
    par_min_man: 1,
    par_max_man: 10,
    par_min_woman: 2,
    par_max_woman: 9,
    par_min_child: 0.5,
    par_max_child: 8,
    exam: 'exam-uuid',
  };
  const updateDto: UpdateParamsExamDto = {
    par_name: 'Parametro actualizado',
    par_default_value: '20',
    par_range: true,
    par_unit_extent: 'g/L',
    par_min_man: 2,
    par_max_man: 12,
    par_min_woman: 3,
    par_max_woman: 11,
    par_min_child: 1,
    par_max_child: 9,
    exam: 'exam-uuid',
  };

  const paramsExamsServiceMock = {
    create: jest.fn().mockResolvedValue({ status: 201, message: 'El parametro para el examen se ha creado correctamente' }),
    update: jest.fn().mockResolvedValue({ status: 200, message: 'El registro del parametro se ha actualizado correctamente' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParamsExamsController],
      providers: [
        { provide: ParamsExamsService, useValue: paramsExamsServiceMock },
      ],
    }).compile();

    controller = module.get<ParamsExamsController>(ParamsExamsController);
    service = module.get<ParamsExamsService>(ParamsExamsService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe delegar a ParamsExamsService.create', async () => {
      const result = await controller.create(createDto, userMock);
      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result.status).toBe(201);
    });
  });

  describe('update', () => {
    it('debe delegar a ParamsExamsService.update', async () => {
      const result = await controller.update('par-id', updateDto, userMock);
      expect(service.update).toHaveBeenCalledWith('par-id', updateDto);
      expect(result.status).toBe(200);
    });
  });
});
