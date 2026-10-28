import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Browser } from 'puppeteer';
import { describeError } from '../../exceptions/exception/safe-error.helper';
import { PdfLayout } from './template-engine';

// páginas que se imprimen al mismo tiempo (cada una usa memoria de Chromium)
const MAX_PARALLEL = 2;
// se reinicia el navegador cada cierto número de PDFs para liberar memoria
const MAX_RENDERS_PER_BROWSER = 200;
const RENDER_TIMEOUT_MS = 30_000;

/**
 * Imprime HTML a PDF con un Chromium reutilizado (se lanza con el primer PDF y se reinicia
 * si se cae o tras MAX_RENDERS_PER_BROWSER). Cada página corre sin JavaScript y sin red:
 * solo se permiten recursos `data:`.
 */
@Injectable()
export class PdfRendererService implements OnModuleDestroy {
  private readonly logger = new Logger('PdfRenderer');
  private browser: Promise<Browser> | null = null;
  private renders = 0;
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  /**
   * Imprime un documento
   * @param layout HTML, encabezado, pie, formato y márgenes
   * @returns PDF
   */
  async render(layout: PdfLayout): Promise<Buffer> {
    await this.acquire();
    let page: Awaited<ReturnType<Browser['newPage']>> | undefined;
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();
        if (url.startsWith('data:') || url === 'about:blank')
          void request.continue();
        else void request.abort('blockedbyclient');
      });

      // todo va embebido: basta con el evento load
      await page.setContent(layout.html, {
        waitUntil: 'load',
        timeout: RENDER_TIMEOUT_MS,
      });
      const withHeaderFooter = Boolean(
        layout.headerTemplate || layout.footerTemplate,
      );
      const pdf = await page.pdf({
        format: layout.format,
        printBackground: true,
        margin: layout.margin,
        displayHeaderFooter: withHeaderFooter,
        headerTemplate: layout.headerTemplate || '<div></div>',
        footerTemplate: layout.footerTemplate || '<div></div>',
        timeout: RENDER_TIMEOUT_MS,
      });
      return Buffer.from(pdf);
    } finally {
      await page?.close().catch(() => undefined);
      this.renders++;
      // solo se recicla si no hay otro PDF en curso
      if (this.renders >= MAX_RENDERS_PER_BROWSER && this.active === 1)
        await this.closeBrowser();
      this.release();
    }
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  /**
   * Navegador compartido; se lanza la primera vez que se necesita
   */
  private getBrowser(): Promise<Browser> {
    if (!this.browser) {
      const launching = import('puppeteer').then(({ default: puppeteer }) =>
        puppeteer.launch({
          headless: true,
          // Railway corre el contenedor como root: Chromium no arranca con sandbox.
          // Compensa: sin JavaScript, sin red y plantillas validadas
          args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        }),
      );
      this.browser = launching;
      launching.then(
        (browser) =>
          browser.on('disconnected', () => {
            if (this.browser === launching) {
              this.logger.warn('Chromium se cerró; se lanzará de nuevo');
              this.browser = null;
            }
          }),
        (error) => {
          this.logger.error(
            `No se pudo lanzar Chromium: ${describeError(error)}`,
          );
          if (this.browser === launching) this.browser = null;
        },
      );
    }
    return this.browser;
  }

  private async closeBrowser() {
    const current = this.browser;
    this.browser = null;
    this.renders = 0;
    if (!current) return;
    try {
      await (await current).close();
    } catch {
      // ya estaba cerrado o no llegó a lanzarse
    }
  }

  // limita los PDF simultáneos a MAX_PARALLEL; los demás esperan su turno
  private async acquire() {
    if (this.active < MAX_PARALLEL) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  private release() {
    const next = this.waiting.shift();
    // el turno pasa directamente al siguiente (active no cambia)
    if (next) next();
    else this.active--;
  }
}
