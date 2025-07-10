

-- scrip para iniciar datos de la aplicacion
-- crear empresa
insert into lab.companies
(com_id,
com_nit,
com_dv,
com_nombre,
com_direccion,
com_telefono,
com_correo,
com_logo,
com_estado,
com_representante_legal,
com_fecha_creacion,
com_usuario_creacion,
com_fecha_modificacion,
com_usuario_modificacion)
values(
    '63dd7260-428b-49ec-958d-9bd335ec7f5c',
    '123456789',
    '1',
    'empresa demo',
    'direccion demo',
    'telefono',
    'correo',
    'logo',
    'ACTIVO',
    'REPRESENTANTE',
    '2024-12-18 22:56:42.052132',
    'USUSARIO',
    '2024-12-18 22:56:42.052132',
    NULL
);

/**
crear ususario
contraseña : oYWeR565DdXm
*/
insert into lab.usuarios(
use_id,
use_primer_nombre,
use_primer_apellido,
use_correo,
use_contrasena,
use_primer_ingreso,
use_fecha_creacion,
use_fecha_modificacion,
use_rol,
use_estado,
"companyComId"
)
values(
    'eea237da-c893-4088-9b82-00725987d8ee',
    'francisco',
    'diaz',
    'fd13122019@gmail.com',
    '$2b$10$cRLKaZsNADby4ib8gIbnuuCtTVwvCFsNEB3ZRAcQIvNMq9RQOVKWy',
    'false',
    '2024-12-30 12:15:47.215527',
    '2024-12-30 12:15:47.215527',
    'admin',
    'ACTIVO',
    '63dd7260-428b-49ec-958d-9bd335ec7f5c'
);


