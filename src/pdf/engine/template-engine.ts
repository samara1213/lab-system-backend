import Handlebars from 'handlebars';

/**
 * Motor de plantillas del PDF de resultados: un entorno de Handlebars aislado (solo los
 * helpers de esta lista), validación de las plantillas que sube el super administrador y
 * separación del encabezado y pie de página.
 *
 * Formato de una plantilla (HTML + Handlebars):
 * - El cuerpo es el documento completo.
 * - `<!-- pdf:header --> ... <!-- /pdf:header -->` se repite arriba en cada página y
 *   `<!-- pdf:footer --> ... <!-- /pdf:footer -->` abajo (con sus propios estilos; Chrome
 *   reemplaza `<span class="pageNumber">` y `<span class="totalPages">`).
 * - `<meta name="pdf:format" content="letter">` (letter, legal o a4) y
 *   `<meta name="pdf:margin" content="290px 40px 50px 40px">` (arriba, derecha, abajo, izquierda:
 *   el margen superior debe dejar espacio al encabezado).
 * - Solo `{{ }}` (texto escapado): no se permiten `{{{ }}}`, parciales ni helpers fuera de la lista.
 *   Sin JavaScript ni recursos externos: las imágenes llegan en los datos como `data:`.
 */

export const MAX_TEMPLATE_SIZE = 256 * 1024;

const hb = Handlebars.create();
// "log" escribiría en los logs del servidor datos del paciente
hb.unregisterHelper('log');

// helpers disponibles en las plantillas (los de la plantilla anterior + utilidades)
const HELPERS: Record<string, (...args: any[]) => unknown> = {
  eq: (a: unknown, b: unknown) => a === b,
  or: (...values: unknown[]) => values.slice(0, -1).some(Boolean),
  and: (...values: unknown[]) => values.slice(0, -1).every(Boolean),
  not: (value: unknown) => !value,
  contains: (str: unknown, substr: unknown) =>
    typeof str === 'string' &&
    typeof substr === 'string' &&
    str.toLowerCase().includes(substr.toLowerCase()),
  startsWith: (str: unknown, prefix: unknown) =>
    typeof str === 'string' &&
    typeof prefix === 'string' &&
    str.startsWith(prefix),
  substring: (str: unknown, start: unknown) =>
    typeof str === 'string' ? str.substring(Number(start) || 0) : str,
  toLowerCase: (str: unknown) =>
    typeof str === 'string' ? str.toLowerCase() : str,
  toUpperCase: (str: unknown) =>
    typeof str === 'string' ? str.toUpperCase() : str,
  // valor o texto alternativo si está vacío: {{default paciente.telefono "—"}}
  default: (value: unknown, fallback: unknown) =>
    value === null || value === undefined || value === '' ? fallback : value,
};
for (const [name, fn] of Object.entries(HELPERS)) hb.registerHelper(name, fn);

const BUILT_IN_HELPERS = ['if', 'unless', 'each', 'with', 'lookup'];
export const TEMPLATE_HELPERS = [
  ...BUILT_IN_HELPERS,
  ...Object.keys(HELPERS),
] as const;
const ALLOWED = new Set<string>(TEMPLATE_HELPERS);
const FORBIDDEN_PATH_PARTS = new Set(['__proto__', 'constructor', 'prototype']);

// opciones de compilación: solo los helpers conocidos (sin blockHelperMissing sobre datos)
const COMPILE_OPTIONS = {
  knownHelpers: Object.fromEntries(TEMPLATE_HELPERS.map((h) => [h, true])),
  knownHelpersOnly: true,
};

export class TemplateValidationError extends Error {
  constructor(readonly errors: string[]) {
    super(errors.join('; '));
  }
}

/**
 * Revisa el árbol de Handlebars y el HTML de una plantilla
 * @param source contenido de la plantilla
 * @returns lista de errores (vacía si es válida)
 */
export function findTemplateErrors(source: string): string[] {
  const errors: string[] = [];
  if (Buffer.byteLength(source, 'utf8') > MAX_TEMPLATE_SIZE)
    errors.push('La plantilla supera los 256 KB');
  if (/<script[\s>]/i.test(source))
    errors.push('No se permite JavaScript (<script>)');
  if (/<[^>]*\son[a-z]+\s*=/i.test(source))
    errors.push(
      'No se permiten atributos de eventos (onclick, onerror, onload...)',
    );
  if (/(href|src)\s*=\s*["']?\s*javascript:/i.test(source))
    errors.push('No se permiten enlaces javascript:');
  if (/(src|href)\s*=\s*["']?\s*(https?:|\/\/|file:)/i.test(source))
    errors.push(
      'No se permiten recursos externos (src o href con una URL): las imágenes llegan en los datos',
    );
  if (
    /url\(\s*["']?\s*(https?:|\/\/|file:)/i.test(source) ||
    /@import/i.test(source)
  )
    errors.push('No se permiten estilos ni fuentes externas (url() o @import)');

  let ast: hbs.AST.Program;
  try {
    ast = hb.parse(source);
  } catch (error) {
    errors.push(
      `Error de sintaxis de Handlebars: ${String(error?.message ?? error).split('\n')[0]}`,
    );
    return errors;
  }

  const at = (node: hbs.AST.Node) =>
    node.loc ? ` (línea ${node.loc.start.line})` : '';
  const checkHelper = (path: hbs.AST.Expression, node: hbs.AST.Node) => {
    if (path.type !== 'PathExpression') return;
    const name = (path as hbs.AST.PathExpression).original;
    if (!ALLOWED.has(name))
      errors.push(`Helper no permitido "${name}"${at(node)}`);
  };
  const isCall = (node: { params: unknown[]; hash?: hbs.AST.Hash }) =>
    node.params.length > 0 || (node.hash?.pairs.length ?? 0) > 0;

  const visit = (node: any): void => {
    if (!node || typeof node !== 'object') return;
    switch (node.type) {
      case 'PartialStatement':
      case 'PartialBlockStatement':
        errors.push(`No se permiten parciales (>)${at(node)}`);
        return;
      case 'Decorator':
      case 'DecoratorBlock':
        errors.push(`No se permiten decoradores${at(node)}`);
        return;
      case 'MustacheStatement':
        if (!node.escaped)
          errors.push(
            `No se permite HTML sin escapar ({{{ }}} o {{& }})${at(node)}`,
          );
        if (isCall(node)) checkHelper(node.path, node);
        break;
      case 'BlockStatement':
        checkHelper(node.path, node);
        break;
      case 'SubExpression':
        checkHelper(node.path, node);
        break;
      case 'PathExpression':
        if (node.parts.some((part: string) => FORBIDDEN_PATH_PARTS.has(part)))
          errors.push(`Ruta no permitida "${node.original}"${at(node)}`);
        return;
    }
    for (const key of ['path', 'program', 'inverse', 'hash']) visit(node[key]);
    for (const key of ['body', 'params', 'pairs'])
      if (Array.isArray(node[key])) node[key].forEach(visit);
    if (node.type === 'HashPair') visit(node.value);
  };
  visit(ast);

  // sin repetir el mismo error
  return [...new Set(errors)];
}

/**
 * Compila una plantilla ya validada
 * @param source contenido de la plantilla
 * @returns función que recibe los datos del reporte y devuelve el HTML
 */
export function compileTemplate(source: string) {
  const errors = findTemplateErrors(source);
  if (errors.length) throw new TemplateValidationError(errors);

  return hb.compile(source, COMPILE_OPTIONS);
}

export interface PdfLayout {
  html: string;
  headerTemplate?: string;
  footerTemplate?: string;
  format: 'letter' | 'legal' | 'a4';
  margin: { top: string; right: string; bottom: string; left: string };
}

// política de contenido: sin scripts, sin red; imágenes y fuentes solo embebidas
const CSP =
  "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:";

const CSS_LENGTH = /^\d+(\.\d+)?(px|mm|cm|in)$/;

/**
 * Separa el HTML renderizado en cuerpo, encabezado y pie, y lee el formato y los márgenes
 * @param rendered HTML producido por la plantilla
 * @returns partes listas para el renderizador
 */
export function splitLayout(rendered: string): PdfLayout {
  const section = (name: string) => {
    const re = new RegExp(
      `<!--\\s*pdf:${name}\\s*-->([\\s\\S]*?)<!--\\s*/pdf:${name}\\s*-->`,
      'i',
    );
    const match = rendered.match(re);
    return { content: match?.[1].trim(), re };
  };
  const meta = (name: string) =>
    rendered
      .match(
        new RegExp(
          `<meta\\s+name=["']pdf:${name}["']\\s+content=["']([^"']*)["']`,
          'i',
        ),
      )?.[1]
      .trim();

  const header = section('header');
  const footer = section('footer');
  let html = rendered.replace(header.re, '').replace(footer.re, '');

  // la política de contenido va al inicio del <head> (o del documento)
  const cspTag = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;
  html = /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (tag) => `${tag}${cspTag}`)
    : `${cspTag}${html}`;

  const format = (meta('format') ?? 'letter').toLowerCase();
  const sides = (meta('margin') ?? '').split(/\s+/).filter(Boolean);
  const valid = sides.length === 4 && sides.every((v) => CSS_LENGTH.test(v));
  const [top, right, bottom, left] = valid
    ? sides
    : ['40px', '40px', '40px', '40px'];

  return {
    html,
    headerTemplate: header.content,
    footerTemplate: footer.content,
    format: (['letter', 'legal', 'a4'].includes(format)
      ? format
      : 'letter') as PdfLayout['format'],
    margin: { top, right, bottom, left },
  };
}
