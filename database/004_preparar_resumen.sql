/* Ejecutar después de 002. También sirve si ya creó las tres tablas anteriores.
   Agrega distribuidor si falta y crea la cuarta tabla (generada, no de carga).
   No borra datos. Si ya se cargaron ventas sin distribuidor, esta columna queda
   NULL: hace falta recargar su desglose desde la fuente, no se puede inferir. */
USE [DTM_PEDIDOS_SUGERIDOS];
GO
SET XACT_ABORT ON;
IF DB_NAME() <> N'DTM_PEDIDOS_SUGERIDOS'
    THROW 50001, N'Base incorrecta.', 1;
IF OBJECT_ID(N'ods.FACT_VENTAS', N'U') IS NULL
    THROW 50002, N'Ejecute primero el script 002.', 1;
BEGIN TRY
    BEGIN TRANSACTION;
    IF COL_LENGTH(N'ods.FACT_VENTAS', N'distribuidor') IS NULL
        ALTER TABLE ods.FACT_VENTAS ADD distribuidor nvarchar(200) NULL;

    IF OBJECT_ID(N'ods.FACT_VENTAS_AGREGADA', N'U') IS NULL
    BEGIN
        CREATE TABLE ods.FACT_VENTAS_AGREGADA (
            version varchar(20) NOT NULL,
            codigo_presentacion varchar(30) NOT NULL,
            ruc nvarchar(50) NULL,
            distribuidor nvarchar(200) NULL,
            metrica varchar(10) NOT NULL,
            venta_actual decimal(28,6) NOT NULL,
            venta_anterior decimal(28,6) NOT NULL
        );
        CREATE UNIQUE INDEX UX_FACT_VENTAS_AGREGADA_Grano
            ON ods.FACT_VENTAS_AGREGADA(version, codigo_presentacion, ruc, distribuidor, metrica);
        CREATE INDEX IX_FACT_VENTAS_AGREGADA_Cliente
            ON ods.FACT_VENTAS_AGREGADA(version, ruc, metrica)
            INCLUDE (codigo_presentacion, distribuidor, venta_actual, venta_anterior);
    END;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
