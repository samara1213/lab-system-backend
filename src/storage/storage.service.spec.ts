import { InternalServerErrorException } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ExceptionService } from '../exceptions/exception/exception.service';

describe('StorageService', () => {
  let service: StorageService;
  const upload = jest.fn();
  const createSignedUrl = jest.fn();

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_KEY = 'clave-ficticia';
    process.env.SUPABASE_BUCKET = 'pruebas';
    service = new StorageService(new ExceptionService());
    // se reemplaza el cliente de Supabase: nunca se sube nada real
    (service as any).supabase = { storage: { from: () => ({ upload, createSignedUrl }) } };
    jest.clearAllMocks();
  });

  it('sube el archivo con el tipo indicado y retorna la ruta', async () => {
    upload.mockResolvedValue({ data: { path: 'lab-a/adjuntos/x.png' }, error: null });
    const path = await service.uploadFile(Buffer.from('x'), 'lab-a/adjuntos/x.png', 'image/png');
    expect(path).toBe('lab-a/adjuntos/x.png');
    expect(upload).toHaveBeenCalledWith('lab-a/adjuntos/x.png', expect.any(Buffer), expect.objectContaining({ contentType: 'image/png' }));
  });

  it('usa application/pdf por defecto', async () => {
    upload.mockResolvedValue({ data: { path: 'r.pdf' }, error: null });
    await service.uploadFile(Buffer.from('x'), 'r.pdf');
    expect(upload).toHaveBeenCalledWith('r.pdf', expect.any(Buffer), expect.objectContaining({ contentType: 'application/pdf' }));
  });

  it('responde un error genérico si Supabase falla', async () => {
    upload.mockResolvedValue({ data: null, error: { message: 'bucket not found', statusCode: '404' } });
    await expect(service.uploadFile(Buffer.from('x'), 'r.pdf')).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('genera una URL firmada', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://firmada' }, error: null });
    await expect(service.getSignedUrl('r.pdf', 60)).resolves.toBe('https://firmada');
    expect(createSignedUrl).toHaveBeenCalledWith('r.pdf', 60);
  });
});
