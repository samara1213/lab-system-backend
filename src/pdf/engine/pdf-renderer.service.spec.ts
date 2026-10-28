import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PdfRendererService } from './pdf-renderer.service';
import { compileTemplate, splitLayout } from './template-engine';
import { buildSampleReport } from '../report/sample-report';

// imprime con Chromium real (Puppeteer): tarda unos segundos la primera vez
describe('PdfRendererService (Chromium real)', () => {
  const renderer = new PdfRendererService();
  let server: Server;
  let requests = 0;
  let port: number;

  beforeAll(async () => {
    server = createServer((_req, res) => {
      requests++;
      res.end('x');
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await renderer.onModuleDestroy();
    await new Promise((done) => server.close(done));
  });

  it('imprime la plantilla base con los datos de ejemplo (encabezado y pie incluidos)', async () => {
    const template = readFileSync(
      resolve(__dirname, '../templates/resultados.html'),
      'utf8',
    );
    const layout = splitLayout(
      compileTemplate(template)(buildSampleReport(null, null)),
    );
    expect(layout.headerTemplate).toContain('María Fernanda Pérez López');
    const pdf = await renderer.render(layout);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(5_000);
  }, 60_000);

  it('no hace peticiones de red y reutiliza el navegador en paralelo', async () => {
    const html = `<html><head></head><body>
      <img src="http://127.0.0.1:${port}/img.png">
      <link rel="stylesheet" href="http://127.0.0.1:${port}/a.css">
      <p>Hola</p></body></html>`;
    const layout = {
      html,
      format: 'letter' as const,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    };
    const pdfs = await Promise.all([
      renderer.render(layout),
      renderer.render(layout),
      renderer.render(layout),
    ]);
    for (const pdf of pdfs) expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(requests).toBe(0);
  }, 60_000);
});
