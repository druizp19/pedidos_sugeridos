/* Ejecutar DESPUÉS de completar la carga, clasificar materiales y crear 006.
   V2 confirmada: enero-agosto 2026 contra enero-agosto 2025.
   Revisar la carga de ambos períodos antes de ejecutar este archivo. */
USE [DTM_PEDIDOS_SUGERIDOS];
GO
DECLARE @Version varchar(20) = 'V2';
DECLARE @InicioActual date = '20260101';
DECLARE @FinActual date = '20260831';
DECLARE @InicioAnterior date = '20250101';
DECLARE @FinAnterior date = '20250831';

IF @InicioAnterior IS NULL OR @FinAnterior IS NULL
    THROW 50001, N'Complete las fechas del período anterior antes de generar el resumen.', 1;

EXEC ods.usp_GenerarVentasAgregadas
    @Version = @Version,
    @InicioActual = @InicioActual,
    @FinActual = @FinActual,
    @InicioAnterior = @InicioAnterior,
    @FinAnterior = @FinAnterior;

SELECT version, metrica, SUM(venta_actual) AS actual, SUM(venta_anterior) AS anterior
FROM ods.FACT_VENTAS_AGREGADA WHERE version = @Version
GROUP BY version, metrica;
GO
