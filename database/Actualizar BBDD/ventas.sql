/* Ejecutar completo en SSMS conectado al servidor 181.
   Destino: DTM_PEDIDOS_SUGERIDOS.ods.FACT_VENTAS, versión V2.
   Fuente: Linked Server [172.16.8.221], misma lógica de la carga V1.
   Períodos: enero-agosto 2025 y enero-agosto 2026 (16 meses en total).
   No incluye septiembre-diciembre 2025. No modifica V1.
   Mantiene distribuidor en ventas propias; competidores sin distribuidor.
   No divide entre 8: se almacenan ventas mensuales, no promedios.
   No genera el resumen automáticamente: revisar los resultados primero.
*/
USE [DTM_PEDIDOS_SUGERIDOS];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_WARNINGS ON;

DECLARE @Version varchar(20) = 'V2';
DECLARE @FilasInsertadas bigint;

IF DB_NAME() <> N'DTM_PEDIDOS_SUGERIDOS'
    THROW 50001, N'Base destino incorrecta.', 1;

IF EXISTS (SELECT 1 FROM ods.FACT_VENTAS WHERE version = @Version)
    THROW 50002, N'Ya existen ventas V2. Revisar antes de repetir la carga.', 1;

IF OBJECT_ID('tempdb..#CargaPedidosV2') IS NOT NULL
    DROP TABLE #CargaPedidosV2;

/* Recuperar los datos fuera de la transacción local.
   EXISTS conserva el filtro de competidores sin multiplicar ventas cuando
   el maestro tiene varias filas para el mismo código de presentación.
*/
SELECT codigo_presentacion, ruc, fecha, distribuidor, metrica, valor
INTO #CargaPedidosV2
FROM OPENQUERY([172.16.8.221], '
    WITH VENTAS_HUMANOVA AS
    (
        SELECT
            i.Código_Presentación AS codigo_presentacion,
            si.DOCIDENTIDAD AS ruc,
            DATEFROMPARTS(si.ANHO, si.MESNUMERO, 1) AS fecha,
            si.DISTRIBUIDOR AS distribuidor,
            SUM(si.UNIDADES) AS unidades,
            SUM(si.SOLES_CONISC) AS valor
        FROM BD_BussinessI.dbo.VENTAS_SI AS si
        INNER JOIN
        (
            SELECT DISTINCT Código_Presentación, Codigo_Presentacion_Final
            FROM BD_McdoFarmaceutico.dbo.VMAE_PROD_IQVIA
            WHERE Descripción_Corporación = ''HUMANOVA LAB CORP''
              AND Código_Presentación <> ''1247601''
        ) AS i ON si.CODIGO_SAP = i.Codigo_Presentacion_Final
        WHERE si.UNIDADES > 0
          AND si.SOLES_CONISC >= 0
          AND si.ANHO IN (2025, 2026)
          AND si.MESNUMERO BETWEEN 1 AND 8
        GROUP BY
            i.Código_Presentación,
            si.DOCIDENTIDAD,
            DATEFROMPARTS(si.ANHO, si.MESNUMERO, 1),
            si.DISTRIBUIDOR
    )
    SELECT
        v.codigo_presentacion,
        v.ruc,
        v.fecha,
        CAST(NULL AS nvarchar(200)) AS distribuidor,
        UPPER(LTRIM(RTRIM(v.metrica))) AS metrica,
        v.valor
    FROM BD_360.dbo.bd_fr AS v
    WHERE (
            (v.fecha >= ''20250101'' AND v.fecha < ''20250901'')
         OR (v.fecha >= ''20260101'' AND v.fecha < ''20260901'')
    )
      AND EXISTS (
          SELECT 1
          FROM BD_McdoFarmaceutico.dbo.VMAE_PROD_IQVIA AS p
          WHERE p.Código_Presentación = v.codigo_presentacion
            AND p.Descripción_Corporación <> ''HUMANOVA LAB CORP''
      )

    UNION ALL

    SELECT codigo_presentacion, ruc, fecha, distribuidor,
           ''UNIDAD'' AS metrica, unidades AS valor
    FROM VENTAS_HUMANOVA

    UNION ALL

    SELECT codigo_presentacion, ruc, fecha, distribuidor,
           ''VALOR'' AS metrica, valor
    FROM VENTAS_HUMANOVA
');

IF NOT EXISTS (SELECT 1 FROM #CargaPedidosV2)
    THROW 50003, N'La consulta de origen no devolvió ventas.', 1;

IF EXISTS (
    SELECT 1 FROM #CargaPedidosV2
    WHERE metrica IS NULL OR metrica NOT IN ('UNIDAD', 'VALOR')
)
    THROW 50004, N'Existen métricas distintas de UNIDAD o VALOR. Revisar la fuente.', 1;

IF EXISTS (
    SELECT 1 FROM #CargaPedidosV2
    WHERE fecha IS NULL
       OR NOT (
            (fecha >= '20250101' AND fecha < '20250901')
         OR (fecha >= '20260101' AND fecha < '20260901')
       )
)
    THROW 50005, N'Hay fechas fuera de enero-agosto de 2025 y 2026.', 1;

-- A partir de aquí, la inserción es local en el 181.
BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1 FROM ods.FACT_VENTAS WITH (UPDLOCK, HOLDLOCK)
        WHERE version = @Version
    )
        THROW 50006, N'Otra carga ya insertó ventas V2.', 1;

    INSERT INTO ods.FACT_VENTAS (
        version, codigo_presentacion, ruc, fecha, distribuidor, metrica, valor
    )
    SELECT @Version, codigo_presentacion, ruc, fecha, distribuidor, metrica, valor
    FROM #CargaPedidosV2;

    SET @FilasInsertadas = @@ROWCOUNT;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

DROP TABLE #CargaPedidosV2;

SELECT @Version AS version, @FilasInsertadas AS filas_insertadas;

-- Conciliar estos totales mensuales con la fuente.
SELECT
    version, YEAR(fecha) AS anio, MONTH(fecha) AS mes,
    metrica, COUNT_BIG(*) AS filas, SUM(valor) AS total
FROM ods.FACT_VENTAS
WHERE version = @Version
GROUP BY version, YEAR(fecha), MONTH(fecha), metrica
ORDER BY anio, mes, metrica;

-- Señalar meses/métricas sin datos: revisar cobertura antes del resumen.
;WITH Esperado AS (
    SELECT a.anio, m.mes, t.metrica
    FROM (VALUES (2025), (2026)) AS a(anio)
    CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6), (7), (8)) AS m(mes)
    CROSS JOIN (VALUES ('UNIDAD'), ('VALOR')) AS t(metrica)
)
SELECT e.anio, e.mes, e.metrica AS metrica_sin_datos
FROM Esperado AS e
WHERE NOT EXISTS (
    SELECT 1 FROM ods.FACT_VENTAS AS v
    WHERE v.version = @Version AND v.metrica = e.metrica
      AND v.fecha >= DATEFROMPARTS(e.anio, e.mes, 1)
      AND v.fecha < DATEADD(month, 1, DATEFROMPARTS(e.anio, e.mes, 1))
)
ORDER BY e.anio, e.mes, e.metrica;

/* Verificación de referencias V2; los conteos son filas de ventas.
   Si hay faltantes, conciliarlos antes de generar el resumen.
   No se filtran ni descartan ventas automáticamente por falta de maestro.
*/
SELECT COUNT_BIG(*) AS filas_ventas_sin_material_v2
FROM ods.FACT_VENTAS AS v
WHERE v.version = @Version
  AND NOT EXISTS (
      SELECT 1 FROM ods.DIM_MATERIAL AS m
      WHERE m.version = v.version AND m.codigo_presentacion = v.codigo_presentacion
  );

SELECT COUNT_BIG(*) AS filas_ventas_sin_cliente_v2
FROM ods.FACT_VENTAS AS v
WHERE v.version = @Version
  AND NOT EXISTS (
      SELECT 1 FROM ods.DIM_CLIENTE AS c
      WHERE c.version = v.version AND c.ruc = v.ruc
  );




