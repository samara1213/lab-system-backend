import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Linea base: el esquema tal como estaba en produccion antes de introducir
 * migraciones (generado desde las entidades).
 *
 * - En una base vacia (desarrollo, pruebas e2e, entornos nuevos) crea todas las tablas.
 * - En una base que ya tiene las tablas (produccion) no ejecuta nada: solo queda
 *   registrada como aplicada en la tabla "migrations".
 *
 * El esquema sale de DB_SCHEMA (no se fija en el SQL).
 */
export class Baseline1792881301954 implements MigrationInterface {
    name = 'Baseline1792881301954'

    public async up(queryRunner: QueryRunner): Promise<void> {

        const schema = process.env.DB_SCHEMA || 'public';

        // produccion: las tablas ya existen, se registra la linea base sin tocar nada
        if (await queryRunner.hasTable(`${schema}.orders`)) return;

        // los ids usan uuid_generate_v4() (extension uuid-ossp)
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        await queryRunner.query(`CREATE TABLE "${schema}"."menus" ("men_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "men_name" text NOT NULL, "men_level" integer, "men_url" text, "men_icon" text, "menParentMenId" uuid, CONSTRAINT "PK_470e4ea8db0f59c46cfa5ad1024" PRIMARY KEY ("men_id"))`);
        await queryRunner.query(`CREATE TABLE "${schema}"."roles" ("rol_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rol_nombre" text NOT NULL, CONSTRAINT "UQ_96aaed1c729577ea6fe99348402" UNIQUE ("rol_nombre"), CONSTRAINT "PK_3c527fdab46502238021eab2e22" PRIMARY KEY ("rol_id"))`);
        await queryRunner.query(`CREATE TABLE "${schema}"."usuarios" ("use_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "use_primer_nombre" text, "use_primer_apellido" text, "use_correo" text NOT NULL, "use_contrasena" text, "use_primer_ingreso" boolean NOT NULL DEFAULT true, "use_fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(), "use_fecha_modificacion" TIMESTAMP NOT NULL DEFAULT now(), "use_rol" text DEFAULT 'admin', "use_estado" text DEFAULT 'ACTIVO', "laboratoryLabId" uuid, "roleRolId" uuid, CONSTRAINT "PK_a38c6ad5ab4dc6b0cd1d2001674" PRIMARY KEY ("use_id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_66632c0d213547afb060c924f6" ON "${schema}"."usuarios"  ("use_correo") `);
        await queryRunner.query(`CREATE TABLE "${schema}"."exams_parameters" ("par_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "par_name" text NOT NULL, "par_default_value" text NOT NULL, "par_range" boolean NOT NULL DEFAULT false, "par_unit_extent" text, "par_min_man" numeric, "par_max_man" numeric, "par_min_woman" numeric, "par_max_woman" numeric, "par_min_child" numeric, "par_max_child" numeric, "par_reference_value" text, "par_creation_date" TIMESTAMP NOT NULL DEFAULT now(), "par_modification_date" TIMESTAMP NOT NULL DEFAULT now(), "par_state" text NOT NULL DEFAULT 'ACTIVO', "par_order" integer NOT NULL DEFAULT '0', "examExaId" uuid NOT NULL, CONSTRAINT "PK_303d1c75260788835bdc23291c6" PRIMARY KEY ("par_id"))`);
        await queryRunner.query(`CREATE TABLE "${schema}"."customers" ("cus_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cus_document_type" text NOT NULL, "cus_document_number" text NOT NULL, "cus_first_lastname" text NOT NULL, "cus_second_lastname" text NOT NULL, "cus_first_name" text NOT NULL, "cus_second_name" text NOT NULL, "cus_address" text NOT NULL, "cus_gender" text NOT NULL, "cus_birthdate" date NOT NULL, "cus_phone" text NOT NULL, "cus_email" text NOT NULL, "cus_created_at" TIMESTAMP NOT NULL DEFAULT now(), "cus_updated_at" TIMESTAMP NOT NULL DEFAULT now(), "laboratoryLabId" uuid NOT NULL, CONSTRAINT "UQ_f8dbd159e7cc76c33c2e333235f" UNIQUE ("cus_document_number", "laboratoryLabId"), CONSTRAINT "PK_1dc0df2fc297978207333fee595" PRIMARY KEY ("cus_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ab7b99498f740dcdc5971f74d0" ON "${schema}"."customers"  ("laboratoryLabId") `);
        await queryRunner.query(`CREATE TABLE "${schema}"."results" ("res_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "res_value" text NOT NULL, "res_observation" text, "res_reference" text, "res_created_at" TIMESTAMP NOT NULL DEFAULT now(), "res_updated_at" TIMESTAMP NOT NULL DEFAULT now(), "orderOrdId" uuid NOT NULL, "examExaId" uuid NOT NULL, "paramParId" uuid NOT NULL, CONSTRAINT "PK_d2fcdfd1003a2a21623dbb4ac6f" PRIMARY KEY ("res_id"))`);
        await queryRunner.query(`CREATE TABLE "${schema}"."attached" ("att_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "att_file_url" text NOT NULL, "att_created_at" TIMESTAMP NOT NULL DEFAULT now(), "orderOrdId" uuid NOT NULL, CONSTRAINT "PK_e6bbf440a91a380f27bcec314d6" PRIMARY KEY ("att_id"))`);
        await queryRunner.query(`CREATE TABLE "${schema}"."orders" ("ord_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ord_code" SERIAL NOT NULL, "ord_created_at" TIMESTAMP NOT NULL DEFAULT now(), "ord_updated_at" TIMESTAMP NOT NULL DEFAULT now(), "ord_total_value" numeric(10,2) NOT NULL, "ord_discount_percentage" numeric(5,2) NOT NULL DEFAULT '0', "ord_discount_value" numeric(10,2) NOT NULL DEFAULT '0', "ord_status" text NOT NULL DEFAULT 'PENDIENTE', "ord_pdf_url" text, "laboratoryLabId" uuid NOT NULL, "customerCusId" uuid NOT NULL, CONSTRAINT "UQ_501435017786e182924e8005cf0" UNIQUE ("ord_code"), CONSTRAINT "PK_b642fdbb3ea449ae2ff67bbde5e" PRIMARY KEY ("ord_id"))`);
        await queryRunner.query(`CREATE TABLE "${schema}"."exams" ("exa_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "exa_name" text NOT NULL, "exa_description" text, "exa_price" numeric(10,2) NOT NULL, "exa_classification" text, "exa_created" TIMESTAMP NOT NULL DEFAULT now(), "exa_updated" TIMESTAMP NOT NULL DEFAULT now(), "laboratoryLabId" uuid, "allianceAliId" uuid, CONSTRAINT "PK_c1d8df1805d71adde5223e72d57" PRIMARY KEY ("exa_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f5bbefb4ee13a319103ae93017" ON "${schema}"."exams"  ("laboratoryLabId") `);
        await queryRunner.query(`CREATE TABLE "${schema}"."laboratories" ("lab_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lab_nit" text NOT NULL, "lab_dv" text, "lab_name" text NOT NULL, "lab_address" text NOT NULL, "lab_phone" text NOT NULL, "lab_status" text NOT NULL, "lab_logo" text, "lab_email" text NOT NULL, "lab_legal_representative" text NOT NULL, "lab_signature" text, "lab_created_at" TIMESTAMP NOT NULL DEFAULT now(), "lab_updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5f635c85638411728f2729d0702" UNIQUE ("lab_nit"), CONSTRAINT "UQ_316c8ba1516f57813d445c2a7d8" UNIQUE ("lab_email"), CONSTRAINT "PK_86966e0301042365d2cf6911356" PRIMARY KEY ("lab_id"))`);
        await queryRunner.query(`CREATE TABLE "${schema}"."alliances" ("ali_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ali_nombre" text NOT NULL, "ali_direccion" text NOT NULL, "ali_telefono" text NOT NULL, "ali_nombre_contacto" text NOT NULL, "ali_fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(), "ali_fecha_actualizacion" TIMESTAMP NOT NULL DEFAULT now(), "laboratoryLabId" uuid, CONSTRAINT "PK_f3b74eef0523fdb6dc5f684e0ef" PRIMARY KEY ("ali_id"))`);
        await queryRunner.query(`CREATE TABLE "${schema}"."roles_menus" ("rolesRolId" uuid NOT NULL, "menusMenId" uuid NOT NULL, CONSTRAINT "PK_3525448df21c618cca298680979" PRIMARY KEY ("rolesRolId", "menusMenId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6d5984218246d386cae6d2de41" ON "${schema}"."roles_menus"  ("rolesRolId") `);
        await queryRunner.query(`CREATE INDEX "IDX_df0cabee0f418cd530a669573c" ON "${schema}"."roles_menus"  ("menusMenId") `);
        await queryRunner.query(`CREATE TABLE "${schema}"."orders_exams" ("ord_id" uuid NOT NULL, "exa_id" uuid NOT NULL, CONSTRAINT "PK_a11d468c317763e2a582fc7bdfe" PRIMARY KEY ("ord_id", "exa_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_135c1e6baad7c710e7bf994c28" ON "${schema}"."orders_exams"  ("ord_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6a616b97ce99e596076ce41d5e" ON "${schema}"."orders_exams"  ("exa_id") `);
        await queryRunner.query(`ALTER TABLE "${schema}"."menus" ADD CONSTRAINT "FK_df340d46904469c32eba11a035f" FOREIGN KEY ("menParentMenId") REFERENCES "${schema}"."menus"("men_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."usuarios" ADD CONSTRAINT "FK_99cc14c9c08bfcd22534f02b7ac" FOREIGN KEY ("laboratoryLabId") REFERENCES "${schema}"."laboratories"("lab_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."usuarios" ADD CONSTRAINT "FK_c80fa253fc66797c3fd043f5d1e" FOREIGN KEY ("roleRolId") REFERENCES "${schema}"."roles"("rol_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."exams_parameters" ADD CONSTRAINT "FK_c4bc36cdaa976de7e277d834058" FOREIGN KEY ("examExaId") REFERENCES "${schema}"."exams"("exa_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."customers" ADD CONSTRAINT "FK_ab7b99498f740dcdc5971f74d0d" FOREIGN KEY ("laboratoryLabId") REFERENCES "${schema}"."laboratories"("lab_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."results" ADD CONSTRAINT "FK_3e1f54532753d73d1e65dcab4db" FOREIGN KEY ("orderOrdId") REFERENCES "${schema}"."orders"("ord_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."results" ADD CONSTRAINT "FK_4201eff01103e5ea1d5df217c73" FOREIGN KEY ("examExaId") REFERENCES "${schema}"."exams"("exa_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."results" ADD CONSTRAINT "FK_b7e1e6bc2e74edadf33a5d5bab4" FOREIGN KEY ("paramParId") REFERENCES "${schema}"."exams_parameters"("par_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."attached" ADD CONSTRAINT "FK_a91c2af2ee8e36437570cf7b724" FOREIGN KEY ("orderOrdId") REFERENCES "${schema}"."orders"("ord_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."orders" ADD CONSTRAINT "FK_dbe9ce7e4a9d7ae6d920e113ee4" FOREIGN KEY ("laboratoryLabId") REFERENCES "${schema}"."laboratories"("lab_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."orders" ADD CONSTRAINT "FK_a7103a3834c17b3fdd0292a28ae" FOREIGN KEY ("customerCusId") REFERENCES "${schema}"."customers"("cus_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."exams" ADD CONSTRAINT "FK_f5bbefb4ee13a319103ae930172" FOREIGN KEY ("laboratoryLabId") REFERENCES "${schema}"."laboratories"("lab_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."exams" ADD CONSTRAINT "FK_e608455caac14bb5771de8dd802" FOREIGN KEY ("allianceAliId") REFERENCES "${schema}"."alliances"("ali_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."alliances" ADD CONSTRAINT "FK_dd70fb37bc0b82f35b7b49d3414" FOREIGN KEY ("laboratoryLabId") REFERENCES "${schema}"."laboratories"("lab_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "${schema}"."roles_menus" ADD CONSTRAINT "FK_6d5984218246d386cae6d2de41e" FOREIGN KEY ("rolesRolId") REFERENCES "${schema}"."roles"("rol_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "${schema}"."roles_menus" ADD CONSTRAINT "FK_df0cabee0f418cd530a669573c5" FOREIGN KEY ("menusMenId") REFERENCES "${schema}"."menus"("men_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "${schema}"."orders_exams" ADD CONSTRAINT "FK_135c1e6baad7c710e7bf994c281" FOREIGN KEY ("ord_id") REFERENCES "${schema}"."orders"("ord_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "${schema}"."orders_exams" ADD CONSTRAINT "FK_6a616b97ce99e596076ce41d5ef" FOREIGN KEY ("exa_id") REFERENCES "${schema}"."exams"("exa_id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(): Promise<void> {

        // revertir la linea base borraria todas las tablas con sus datos
        throw new Error('La migración Baseline no se revierte: eliminaría todo el esquema. Restaure un respaldo si necesita volver atrás.');
    }

}
