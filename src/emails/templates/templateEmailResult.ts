export const templateEmailResult = (urlResult: string, name: string) => {

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Entrega de resultados</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                width: 100%;
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
            }
            .header {
                text-align: center;
                background-color: #0046be;
                color: #ffffff;
                padding: 20px;
                border-radius: 12px 12px 0 0;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
            }
            .content {
                padding: 20px 10px;
                color: #333333;
                line-height: 1.6;
                font-size: 16px;
            }
            .content a.button {
                display: inline-block;
                margin-top: 20px;
                padding: 12px 24px;
                background-color: #0046be;
                color: #ffffff;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                transition: background-color 0.3s ease;
            }
            .content a.button:hover {
                background-color: #0035a0;
            }
            .footer {
                text-align: center;
                padding: 20px 10px 0 10px;
                font-size: 12px;
                color: #999999;
            }
            @media only screen and (max-width: 600px) {
                .container {
                    padding: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Resultados de laboratorio</h1>
            </div>
            <div class="content">
                <p>Hola <strong>${name}</strong>,</p>
                <p>Te informamos que tus resultados de laboratorio ya están disponibles.</p>
                <p>Puedes descargarlos haciendo clic en el siguiente botón:</p>
                <p><a href="${urlResult}" target="_blank" class="button">Descargar resultados</a></p>
                <p>Gracias por confiar en nosotros.</p>
            </div>
            <div class="footer">
                <p>© 2024 Nuestra Plataforma. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    `;
}