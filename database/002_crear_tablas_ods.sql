/* Modelo mínimo: tres tablas para ventas, clientes y materiales.
   Cada entrega incluye version: V1, V2, etc.
   Nombres normalizados: mapear las columnas de las consultas de origen.
   No elimina ni transforma tablas existentes. No carga datos.
   Ejecutar completo en SSMS. */
USE [DTM_PEDIDOS_SUGERIDOS];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() <> N'DTM_PEDIDOS_SUGERIDOS'
    THROW 50001, N'Base incorrecta.', 1;
IF OBJECT_ID(N'ods.DIM_CLIENTE') IS NOT NULL
   OR OBJECT_ID(N'ods.DIM_MATERIAL') IS NOT NULL
   OR OBJECT_ID(N'ods.FACT_VENTAS') IS NOT NULL
    THROW 50002, N'Alguna tabla destino ya existe. No se sobrescribe; revise la estructura antes de continuar.', 1;
BEGIN TRY
    BEGIN TRANSACTION;
    IF SCHEMA_ID(N'ods') IS NULL
        EXEC(N'CREATE SCHEMA [ods] AUTHORIZATION [dbo];');

    CREATE TABLE ods.DIM_CLIENTE (
        version varchar(20) NOT NULL,
        ruc nvarchar(50) NULL,
        farmacia nvarchar(300) NULL,
        cp_cliente nvarchar(400) NULL,
        direccion nvarchar(500) NULL,
        grupo_cliente nvarchar(100) NULL,
        categorizacion nvarchar(50) NULL,
        quintil varchar(2) NULL,
        lima_provincias nvarchar(50) NULL,
        departamento nvarchar(100) NULL,
        distrito nvarchar(150) NULL,
        region nvarchar(150) NULL,
        brick nvarchar(200) NULL,
        codigo_brick varchar(50) NULL,
        zona_cliente nvarchar(200) NULL,
        zonabase nvarchar(200) NULL,
        ffvv nvarchar(50) NULL,
        nombres_vendedores nvarchar(max) NULL,
        supervisor nvarchar(200) NULL
    );
    CREATE INDEX IX_DIM_CLIENTE_VersionRuc ON ods.DIM_CLIENTE(version, ruc);

    CREATE TABLE ods.DIM_MATERIAL (
        version varchar(20) NOT NULL,
        codigo_presentacion varchar(30) NOT NULL,
        codigo_presentacion_final varchar(40) NULL,
        descripcion_presentacion nvarchar(500) NULL,
        cp_presentacion nvarchar(600) NULL,
        unidad_negocio nvarchar(100) NULL,
        franquicia nvarchar(150) NULL,
        marca_mkt nvarchar(200) NULL,
        mercado nvarchar(250) NULL,
        corporacion nvarchar(250) NULL,
        es_competidor bit NULL
    );
    CREATE INDEX IX_DIM_MATERIAL_VersionCodigo ON ods.DIM_MATERIAL(version, codigo_presentacion);

    /* Resultado de la consulta VENTAS: incluye período actual y comparable.
       valor contiene unidades cuando metrica = UNIDAD e importe cuando = VALOR.
       Conserva distribuidor para ventas propias; NULL cuando no existe ese dato.
       No contiene promedios ya calculados ni columna origen. */
    CREATE TABLE ods.FACT_VENTAS (
        version varchar(20) NOT NULL,
        codigo_presentacion varchar(30) NOT NULL,
        ruc nvarchar(50) NULL,
        fecha date NOT NULL,
        distribuidor nvarchar(200) NULL,
        metrica varchar(10) NOT NULL,
        valor decimal(28,6) NOT NULL
    );
    CREATE INDEX IX_FACT_VENTAS_VersionFecha ON ods.FACT_VENTAS(version, metrica, fecha)
        INCLUDE (ruc, codigo_presentacion, distribuidor, valor);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
SELECT SCHEMA_NAME(schema_id) AS esquema, name AS tabla
FROM sys.tables WHERE schema_id = SCHEMA_ID(N'ods') ORDER BY name;
GO
