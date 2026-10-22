/* Ejecutar después de cargar DIM_MATERIAL.
   La consulta de productos debe mapear Descripción_Corporación -> corporacion.
   Se puede usar el mismo CASE directamente en el INSERT de materiales.
   Seleccionar la versión que se acaba de cargar. */
USE [DTM_PEDIDOS_SUGERIDOS];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @Version varchar(20) = 'V2'; -- Cambiar a V1 para esa entrega.

IF DB_NAME() <> N'DTM_PEDIDOS_SUGERIDOS'
    THROW 50001, N'Base incorrecta.', 1;
IF NOT EXISTS (SELECT 1 FROM ods.DIM_MATERIAL WHERE version = @Version)
    THROW 50002, N'No hay materiales cargados para la versión seleccionada.', 1;

UPDATE ods.DIM_MATERIAL
SET es_competidor = CASE
    WHEN NULLIF(LTRIM(RTRIM(corporacion)), N'') IS NULL THEN NULL
    WHEN UPPER(LTRIM(RTRIM(corporacion))) = N'HUMANOVA LAB CORP' THEN 0
    ELSE 1
END
WHERE version = @Version;

SELECT version, es_competidor, COUNT_BIG(*) AS materiales
FROM ods.DIM_MATERIAL WHERE version = @Version
GROUP BY version, es_competidor;

SELECT codigo_presentacion, descripcion_presentacion, corporacion
FROM ods.DIM_MATERIAL WHERE version = @Version AND es_competidor IS NULL;
GO
