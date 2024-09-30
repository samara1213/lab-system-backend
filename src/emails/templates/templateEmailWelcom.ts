export const templateEmailWelcom = (nombre: string, email: string, password: string) => {

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Bienvenido</title>
        <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding: 10px 0;
            background-color: #007bff;
            color: #ffffff;
            border-radius: 8px 8px 0 0;
        }
        .content {
            padding: 20px;
            color: #333333;
        }
        .footer {
            text-align: center;
            padding: 10px;
            font-size: 12px;
            color: #888888;
        }
        @media only screen and (max-width: 600px) {
            .container {
            width: 100%;
            }
        }
        </style>
    </head>
    <body>
        <div class="container">
        <div class="header">
            <h1>Bienvenido</h1>
        </div>
        <div class="content">
            <p>Hola, ${nombre}!</p>
            <p>Gracias por registrarte en nuestra plataforma. Estamos emocionados de tenerte con nosotros.</p>
            <p>Tus credenciales de ingreso son las siguientes:</p>
            <p>Usuario: ${email}</p>
            <p>Password: ${password}</p>
        </div>
        <div class="footer">
            <p>© 2024 Nuestra Plataforma. Todos los derechos reservados.</p>
        </div>
        </div>
    </body>
    </html>
    `;
}