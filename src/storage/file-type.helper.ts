/**
 * Tipos de archivo permitidos para los adjuntos de una orden, identificados
 * por la firma de sus primeros bytes (no por la extension ni el mimetype del cliente)
 */
const FILE_SIGNATURES: { ext: string; mime: string; matches: (b: Buffer) => boolean }[] = [
  { ext: 'pdf',  mime: 'application/pdf', matches: b => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  { ext: 'png',  mime: 'image/png',       matches: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'jpg',  mime: 'image/jpeg',      matches: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'gif',  mime: 'image/gif',       matches: b => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1')) },
  { ext: 'webp', mime: 'image/webp',      matches: b => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  { ext: 'bmp',  mime: 'image/bmp',       matches: isBmp },
];

/**
 * La firma de BMP ('BM') es muy corta: se valida tambien el tamaño declarado
 * del archivo y el tamaño de la cabecera DIB
 */
function isBmp(b: Buffer): boolean {
  if (b.length < 18 || b.subarray(0, 2).toString('latin1') !== 'BM') return false;
  return b.readUInt32LE(2) === b.length && [12, 40, 52, 56, 108, 124].includes(b.readUInt32LE(14));
}

// tamaño maximo de un adjunto
export const MAX_ATTACHED_SIZE = 10 * 1024 * 1024;

/**
 * Detecta el tipo real de un archivo por su contenido
 * @param buffer contenido del archivo
 * @returns extension y mimetype, o null si no es un tipo permitido
 */
export function detectFileType(buffer: Buffer): { ext: string; mime: string } | null {

  if (!buffer || buffer.length < 12) return null;

  const type = FILE_SIGNATURES.find(signature => signature.matches(buffer));

  return type ? { ext: type.ext, mime: type.mime } : null;
}
