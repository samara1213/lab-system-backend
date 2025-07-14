import { Test, TestingModule } from '@nestjs/testing';
import { AttachedService } from './attached.service';

describe('AttachedService', () => {
  let service: AttachedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttachedService],
    }).compile();

    service = module.get<AttachedService>(AttachedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
