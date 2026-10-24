import { detectFileType } from './file-type.helper';

/**
 * Crea un buffer con la firma indicada seguida de relleno
 */
const withSignature = (signature: number[] | string) =>
  Buffer.concat([typeof signature === 'string' ? Buffer.from(signature, 'latin1') : Buffer.from(signature), Buffer.alloc(16)]);

describe('detectFileType', () => {
  it.each([
    ['%PDF-1.7', 'pdf', 'application/pdf'],
    [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'png', 'image/png'],
    [[0xff, 0xd8, 0xff, 0xe0], 'jpg', 'image/jpeg'],
    ['GIF89a', 'gif', 'image/gif'],
    ['RIFF\x00\x00\x00\x00WEBP', 'webp', 'image/webp'],
  ])('detecta %p como %s', (signature, ext, mime) => {
    expect(detectFileType(withSignature(signature as any))).toEqual({ ext, mime });
  });

  it('detecta un BMP con cabecera válida', () => {
    const bmp = Buffer.alloc(70);
    bmp.write('BM', 0, 'latin1');
    bmp.writeUInt32LE(70, 2);   // tamaño total del archivo
    bmp.writeUInt32LE(40, 14);  // cabecera BITMAPINFOHEADER
    expect(detectFileType(bmp)).toEqual({ ext: 'bmp', mime: 'image/bmp' });
  });

  it('rechaza un archivo que solo empieza con "BM"', () => {
    expect(detectFileType(withSignature('BM esto no es una imagen'))).toBeNull();
  });

  it('rechaza un archivo que no es PDF ni imagen aunque diga serlo', () => {
    expect(detectFileType(withSignature('<html><script>'))).toBeNull();
  });

  it('rechaza un archivo vacío o demasiado corto', () => {
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
    expect(detectFileType(Buffer.from('%PDF'))).toBeNull();
  });
});
