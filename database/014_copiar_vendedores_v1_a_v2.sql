/* Ejecutar completo en SSMS conectado al 181.
   Por indicación del usuario, V2 conserva toda la fuerza de ventas de V1.
   Copia todas las filas y solo cambia version. No modifica V1.
   Se detiene si V2 ya contiene vendedores para evitar repetir la carga.
*/
USE [DTM_PEDIDOS_SUGERIDOS];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_WARNINGS ON;

DECLARE @FilasInsertadas bigint;

IF DB_NAME() <> N'DTM_PEDIDOS_SUGERIDOS'
    THROW 50001, N'Base destino incorrecta.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1 FROM ods.DIM_VENDEDORES WITH (UPDLOCK, HOLDLOCK)
        WHERE version = 'V2'
    )
        THROW 50002, N'Ya existen vendedores V2. Revisar antes de repetir la copia.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM ods.DIM_VENDEDORES WITH (HOLDLOCK)
        WHERE version = 'V1'
    )
        THROW 50003, N'No hay vendedores V1 para copiar.', 1;

    INSERT INTO ods.DIM_VENDEDORES (
        version, zonabase, nombreFFVV, nombreSSVV
    )
    SELECT 'V2', zonabase, nombreFFVV, nombreSSVV
    FROM ods.DIM_VENDEDORES WITH (HOLDLOCK)
    WHERE version = 'V1';

    SET @FilasInsertadas = @@ROWCOUNT;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT 'V2' AS version, @FilasInsertadas AS vendedores_insertados;

SELECT version, COUNT_BIG(*) AS filas
FROM ods.DIM_VENDEDORES
WHERE version IN ('V1', 'V2')
GROUP BY version
ORDER BY version;

SELECT version, zonabase, nombreFFVV, nombreSSVV
FROM ods.DIM_VENDEDORES
WHERE version = 'V2'
ORDER BY zonabase, nombreFFVV, nombreSSVV;
