/* Ejecutar en 181 DESPUÉS de finalizar y conciliar una corrección de maestros.
   Si cambió FACT_VENTAS, primero regenerar el resumen con el procedimiento:
   ese procedimiento ya renueva generado_en y no necesita este script.
   No modifica ventas, períodos ni fórmulas. No ejecutarlo durante una carga.
   El servidor detectará la nueva revisión en la siguiente consulta,
   como máximo 15 segundos después. Una pantalla ya abierta debe recargarse.
*/
USE [DTM_PEDIDOS_SUGERIDOS];
GO
SET XACT_ABORT ON;
DECLARE @Version varchar(20) = 'V2'; -- Elegir la entrega corregida.

IF OBJECT_ID(N'ods.REPORTE_VERSION', N'U') IS NULL
    THROW 50001, N'Instale 006 y genere el resumen con sus períodos antes de publicar una corrección.', 1;

UPDATE ods.REPORTE_VERSION
SET generado_en = CASE WHEN generado_en >= SYSUTCDATETIME()
                      THEN DATEADD(millisecond, 1, generado_en)
                      ELSE SYSUTCDATETIME() END
WHERE version = @Version;
IF @@ROWCOUNT <> 1
    THROW 50002, N'La versión no tiene metadatos. Genere su resumen con los períodos correctos antes de publicar.', 1;

SELECT version, generado_en AS revision_publicada
FROM ods.REPORTE_VERSION WHERE version = @Version;
GO
