import { escapeHtml } from './templateEmailPassword';

export interface ResultEmailData {
  // nombre del paciente
  name: string;
  // URL firmada del PDF
  url: string;
  expiresInHours: number;
  orderCode?: number | string;
  laboratory?: {
    lab_name?: string;
    lab_phone?: string;
    lab_email?: string;
  };
}

const validity = (hours: number) =>
  hours % 24 === 0
    ? `${hours / 24} ${hours === 24 ? 'día' : 'días'}`
    : `${hours} ${hours === 1 ? 'hora' : 'horas'}`;

/**
 * Correo con el enlace al PDF de resultados (todos los textos escapados)
 */
export const templateEmailResult = (data: ResultEmailData) => {
  const lab = data.laboratory ?? {};
  const labName = escapeHtml(lab.lab_name || 'Laboratorio clínico');
  const contact = [
    lab.lab_phone && `Tel. ${escapeHtml(lab.lab_phone)}`,
    lab.lab_email && escapeHtml(lab.lab_email),
  ]
    .filter(Boolean)
    .join(' · ');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Resultados de laboratorio</title>
</head>
<body style="margin:0;padding:24px 12px;background:#F4F6F8;font-family:Arial,sans-serif;color:#1B2433;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #DDE2E8;border-radius:10px;overflow:hidden;">
        <div style="padding:20px 28px;background:#34408C;color:#ffffff;">
            <div style="font-size:18px;font-weight:bold;">${labName}</div>
            <div style="margin-top:2px;font-size:13px;opacity:0.85;">Resultados de laboratorio</div>
        </div>
        <div style="padding:28px;font-size:15px;line-height:1.6;">
            <p style="margin:0 0 12px;">Hola, <strong>${escapeHtml(data.name)}</strong>:</p>
            <p style="margin:0 0 12px;">Tus resultados${data.orderCode ? ` de la orden <strong>${escapeHtml(String(data.orderCode))}</strong>` : ''} ya están disponibles.</p>
            <p style="margin:24px 0;text-align:center;">
                <a href="${escapeHtml(data.url)}" target="_blank" style="display:inline-block;padding:13px 26px;background:#34408C;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Ver resultados</a>
            </p>
            <p style="margin:0 0 12px;font-size:13px;color:#5B6676;">El enlace funciona durante ${validity(data.expiresInHours)}. Si vence, pide al laboratorio que te envíe los resultados de nuevo.</p>
            <p style="margin:0;font-size:13px;color:#5B6676;">Los resultados deben ser interpretados por tu médico.</p>
        </div>
        <div style="padding:16px 28px;border-top:1px solid #DDE2E8;font-size:12px;color:#5B6676;">
            ${labName}${contact ? `<br />${contact}` : ''}<br />
            Este correo se envió automáticamente; no lo respondas.
        </div>
    </div>
</body>
</html>
`;
};
