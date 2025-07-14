import { Test, TestingModule } from '@nestjs/testing';
import { AttachedController } from './attached.controller';
import { AttachedService } from './attached.service';

describe('AttachedController', () => {
  let controller: AttachedController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttachedController],
      providers: [AttachedService],
    }).compile();

    controller = module.get<AttachedController>(AttachedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
