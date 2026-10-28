import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  compileTemplate,
  findTemplateErrors,
  MAX_TEMPLATE_SIZE,
  splitLayout,
  TemplateValidationError,
} from './template-engine';
import { buildSampleReport } from '../report/sample-report';

const baseTemplate = readFileSync(
  resolve(__dirname, '../templates/resultados.html'),
  'utf8',
);

describe('template-engine', () => {
  describe('findTemplateErrors', () => {
    it('acepta la plantilla base del sistema', () => {
      expect(findTemplateErrors(baseTemplate)).toEqual([]);
    });

    it.each([
      ['HTML sin escapar', '<p>{{{paciente.nombre}}}</p>', 'sin escapar'],
      ['HTML sin escapar con &', '<p>{{& paciente.nombre}}</p>', 'sin escapar'],
      ['parciales', '{{> encabezado}}', 'parciales'],
      [
        'helpers fuera de la lista',
        '{{blockHelperMissing x}}',
        'Helper no permitido',
      ],
      [
        'bloques sobre datos',
        '{{#paciente}}{{nombre}}{{/paciente}}',
        'Helper no permitido',
      ],
      [
        'subexpresiones no permitidas',
        '{{#if (lookupProp a "b")}}x{{/if}}',
        'Helper no permitido',
      ],
      ['acceso al prototipo', '{{paciente.constructor}}', 'Ruta no permitida'],
      ['JavaScript', '<script>alert(1)</script>', 'JavaScript'],
      [
        'atributos de eventos',
        '<img src="{{laboratorio.logo}}" onerror="x()">',
        'atributos de eventos',
      ],
      ['enlaces javascript:', '<a href="javascript:x()">a</a>', 'javascript:'],
      [
        'imágenes externas',
        '<img src="https://otro.sitio/x.png">',
        'recursos externos',
      ],
      [
        'fuentes externas',
        '<style>@import url(https://fonts.test/a.css);</style>',
        'externas',
      ],
      ['sintaxis inválida', '{{#if x}}sin cerrar', 'sintaxis'],
    ])('rechaza %s', (_case, source, message) => {
      const errors = findTemplateErrors(source);
      expect(errors.join(' ')).toContain(message);
    });

    it('indica la línea del error', () => {
      expect(findTemplateErrors('<p>ok</p>\n{{{x}}}')[0]).toContain('línea 2');
    });

    it('rechaza plantillas de más de 256 KB', () => {
      expect(findTemplateErrors('a'.repeat(MAX_TEMPLATE_SIZE + 1))).toContain(
        'La plantilla supera los 256 KB',
      );
    });
  });

  describe('compileTemplate', () => {
    it('escapa los datos (un nombre con HTML no se interpreta)', () => {
      const render = compileTemplate('<p>{{paciente.nombre}}</p>');
      expect(
        render({ paciente: { nombre: '<img src=x onerror=alert(1)>' } }),
      ).toBe('<p>&lt;img src&#x3D;x onerror&#x3D;alert(1)&gt;</p>');
    });

    it('lanza TemplateValidationError con una plantilla inválida', () => {
      expect(() => compileTemplate('{{{x}}}')).toThrow(TemplateValidationError);
    });

    it('ofrece los helpers de la plantilla anterior y "default"', () => {
      const render = compileTemplate(
        '{{#if (and (eq a 1) (or b c) (not d))}}si{{/if}}|{{toLowerCase "ABC"}}|{{default vacio "—"}}|{{#if (contains "Hemograma" "grama")}}h{{/if}}',
      );
      expect(render({ a: 1, c: true })).toBe('si|abc|—|h');
    });

    it('la plantilla base imprime los datos de ejemplo con el firmante de cada examen', () => {
      const html = compileTemplate(baseTemplate)(buildSampleReport(null, null));
      expect(html).toContain('María Fernanda Pérez López');
      expect(html).toContain('Laura Gómez');
      expect(html).toContain('Andrés Rojas');
      expect(html).toContain('Hombres: 13.5 – 17.5');
    });
  });

  describe('splitLayout', () => {
    const rendered = `<!DOCTYPE html><html><head><meta name="pdf:format" content="A4" />
      <meta name="pdf:margin" content="200px 30px 50px 30px" /></head><body>
      <!-- pdf:header --><div>Encabezado</div><!-- /pdf:header -->
      <!-- pdf:footer --><div>Pie</div><!-- /pdf:footer -->
      <main>Cuerpo</main></body></html>`;

    it('separa encabezado y pie del cuerpo y lee formato y márgenes', () => {
      const layout = splitLayout(rendered);
      expect(layout.headerTemplate).toBe('<div>Encabezado</div>');
      expect(layout.footerTemplate).toBe('<div>Pie</div>');
      expect(layout.html).not.toContain('Encabezado');
      expect(layout.html).toContain('<main>Cuerpo</main>');
      expect(layout.format).toBe('a4');
      expect(layout.margin).toEqual({
        top: '200px',
        right: '30px',
        bottom: '50px',
        left: '30px',
      });
    });

    it('agrega la política de contenido al inicio del <head>', () => {
      expect(splitLayout(rendered).html).toMatch(
        /<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:/,
      );
    });

    it('usa valores por defecto si faltan o no son válidos', () => {
      const layout = splitLayout(
        '<meta name="pdf:margin" content="10vh 1px"><meta name="pdf:format" content="tabloide"><p>x</p>',
      );
      expect(layout.format).toBe('letter');
      expect(layout.margin.top).toBe('40px');
      expect(layout.headerTemplate).toBeUndefined();
      expect(
        layout.html.startsWith('<meta http-equiv="Content-Security-Policy"'),
      ).toBe(true);
    });
  });
});
