import { Test, TestingModule } from '@nestjs/testing';
import { AttachedController } from './attached.controller';
import { AttachedService } from './attached.service';

describe('AttachedController', () => {
  let controller: AttachedController;
  const mockAttachedService = { create: jest.fn() };
  const user = { laboratory: { lab_id: 'lab-a' } } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttachedController],
      providers: [{ provide: AttachedService, useValue: mockAttachedService }],
    }).compile();

    controller = module.get<AttachedController>(AttachedController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('sube el adjunto con el laboratorio del usuario', async () => {
    const file = { buffer: Buffer.from('x') } as Express.Multer.File;
    mockAttachedService.create.mockResolvedValue({ status: 201 });
    await controller.uploadAttached(user, 'ord-1', file);
    expect(mockAttachedService.create).toHaveBeenCalledWith('ord-1', 'lab-a', file);
  });
});
