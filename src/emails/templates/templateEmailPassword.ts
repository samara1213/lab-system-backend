/**
 * Escapa un texto para insertarlo en el HTML del correo (nombres escritos por usuarios)
 */
export const escapeHtml = (value: string) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ],
  );

/**
 * Estructura comun de los correos de contraseña
 */
const layout = (title: string, body: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
</head>
<body style="margin:0;padding:24px 12px;background:#F4F6F8;font-family:Arial,sans-serif;color:#1B2433;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #DDE2E8;border-radius:10px;padding:28px;">
        <h1 style="margin:0 0 16px;font-size:22px;color:#34408C;">${title}</h1>
        ${body}
        <p style="margin:24px 0 0;font-size:13px;color:#5B6676;">Si no solicitaste este cambio, ignora este correo y avisa al administrador de tu laboratorio.</p>
    </div>
</body>
</html>`;

/**
 * Correo con el enlace para crear una contraseña nueva (recuperacion)
 * @param nombre nombre del usuario
 * @param link enlace con el token (vence en 30 minutos)
 */
export const templateEmailPasswordReset = (nombre: string, link: string) =>
  layout(
    'Recupera tu contraseña',
    `
        <p style="font-size:16px;line-height:1.5;">Hola, ${escapeHtml(nombre)}.</p>
        <p style="font-size:16px;line-height:1.5;">Recibimos una solicitud para cambiar tu contraseña. El enlace vence en 30 minutos y solo se puede usar una vez.</p>
        <p style="margin:24px 0;"><a href="${escapeHtml(link)}" style="display:inline-block;background:#34408C;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px;">Crear contraseña nueva</a></p>`,
  );

/**
 * Correo con la contraseña temporal que asigna el administrador
 * @param nombre nombre del usuario
 * @param email correo con el que ingresa
 * @param password contraseña temporal (se debe cambiar al ingresar)
 */
export const templateEmailTemporaryPassword = (
  nombre: string,
  email: string,
  password: string,
) =>
  layout(
    'Tu contraseña fue restablecida',
    `
        <p style="font-size:16px;line-height:1.5;">Hola, ${escapeHtml(nombre)}.</p>
        <p style="font-size:16px;line-height:1.5;">El administrador de tu laboratorio restableció tu contraseña. Ingresa con estos datos; el sistema te pedirá crear una nueva.</p>
        <p style="font-size:16px;line-height:1.7;">Usuario: <strong>${escapeHtml(email)}</strong><br />Contraseña temporal: <strong>${escapeHtml(password)}</strong></p>`,
  );
