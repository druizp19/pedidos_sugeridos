/* Ejecutar completo en el 181. Solo lectura de tablas permanentes.
   Reproduce los KPI TOTALES de la matriz web, no la suma de estimaciones por marca.
   Configuración inicial: V2, SOLES, sin filtros; igualar los filtros de la pantalla.
   La búsqueda de texto y las columnas de clientes no afectan estos KPI.
   No se normaliza el RUC: se conserva el cruce SQL de la aplicación.
   Los importes se suman por producto antes de cruzar con materiales.
*/
USE [DTM_PEDIDOS_SUGERIDOS];
SET NOCOUNT ON;

DECLARE @Version varchar(20) = 'V2';
DECLARE @Metrica varchar(10) = 'VALOR'; -- VALOR = S/ SOLES; UNIDAD = unidades.
DECLARE @Meses int = CASE @Version WHEN 'V1' THEN 5 WHEN 'V2' THEN 8 END;

-- NULL = todos. Usar los mismos valores seleccionados en la web.
DECLARE @UnidadNegocio nvarchar(100) = NULL;
DECLARE @Franquicia nvarchar(150) = NULL;
DECLARE @Marca nvarchar(200) = NULL;
DECLARE @Categoria nvarchar(50) = NULL; -- DIAMANTE / ORO / PLATA / BRONCE / PLOMO.
DECLARE @Zona nvarchar(200) = NULL;     -- Código o nombre: Ax10 o Ax10 - Lima Sur - Playas.
DECLARE @Supervisor nvarchar(200) = NULL;
DECLARE @Vendedor nvarchar(200) = NULL;

IF OBJECT_ID(N'ods.REPORTE_VERSION', N'U') IS NOT NULL
    EXEC sys.sp_executesql
        N'SELECT @Meses = DATEDIFF(month, inicio_actual, fin_actual) + 1
          FROM ods.REPORTE_VERSION WHERE version = @Version;',
        N'@Version varchar(20), @Meses int OUTPUT', @Version, @Meses OUTPUT;
IF @Meses IS NULL OR @Meses < 1
    THROW 50001, N'Falta el período de esta versión.', 1;
IF @Metrica NOT IN ('VALOR', 'UNIDAD')
    THROW 50002, N'Métrica inválida.', 1;

SET @Zona = LEFT(LTRIM(RTRIM(@Zona)), CHARINDEX(N' - ', LTRIM(RTRIM(@Zona)) + N' - ') - 1);

IF OBJECT_ID('tempdb..#KpiPoblacion') IS NOT NULL DROP TABLE #KpiPoblacion;
IF OBJECT_ID('tempdb..#KpiMateriales') IS NOT NULL DROP TABLE #KpiMateriales;
IF OBJECT_ID('tempdb..#KpiVentas') IS NOT NULL DROP TABLE #KpiVentas;
IF OBJECT_ID('tempdb..#KpiMercados') IS NOT NULL DROP TABLE #KpiMercados;
IF OBJECT_ID('tempdb..#KpiDetalle') IS NOT NULL DROP TABLE #KpiDetalle;

-- 1. Cartera: coincide con Population de mssql-report.repository.ts.
SELECT c.ruc, c.lima_provincias
INTO #KpiPoblacion
FROM ods.DIM_CLIENTE AS c
WHERE c.version = @Version
  AND (@Categoria IS NULL OR c.categorizacion = @Categoria)
  AND (@Zona IS NULL OR LEFT(LTRIM(RTRIM(c.zonabase)), CHARINDEX(N' - ', LTRIM(RTRIM(c.zonabase)) + N' - ') - 1) = @Zona)
  AND (@Supervisor IS NULL OR c.supervisor = @Supervisor)
  AND (@Vendedor IS NULL OR EXISTS (
      SELECT 1 FROM ods.DIM_VENDEDORES AS v
      WHERE v.version = c.version AND v.nombreFFVV = @Vendedor
        AND LEFT(LTRIM(RTRIM(v.zonabase)), CHARINDEX(N' - ', LTRIM(RTRIM(v.zonabase)) + N' - ') - 1)
          = LEFT(LTRIM(RTRIM(c.zonabase)), CHARINDEX(N' - ', LTRIM(RTRIM(c.zonabase)) + N' - ') - 1)
  ));

-- 2. Materiales: la web recorta espacios y convierte NULL en cadena vacía.
-- BIN2 mantiene separados mercados/marcas con mayúsculas o acentos distintos,
-- como las claves de los Map/Set de JavaScript.
SELECT
    LTRIM(RTRIM(codigo_presentacion)) COLLATE Latin1_General_100_BIN2 AS codigo,
    LTRIM(RTRIM(COALESCE(mercado, N''))) COLLATE Latin1_General_100_BIN2 AS mercado,
    CASE WHEN es_competidor = 0
          AND LTRIM(RTRIM(COALESCE(marca_mkt, N''))) COLLATE Latin1_General_100_BIN2 <> N'COMPETIDORES'
          AND (@UnidadNegocio IS NULL OR LTRIM(RTRIM(COALESCE(unidad_negocio,N''))) COLLATE Latin1_General_100_BIN2 = @UnidadNegocio COLLATE Latin1_General_100_BIN2)
          AND (@Franquicia IS NULL OR LTRIM(RTRIM(COALESCE(franquicia,N''))) COLLATE Latin1_General_100_BIN2 = @Franquicia COLLATE Latin1_General_100_BIN2)
          AND (@Marca IS NULL OR LTRIM(RTRIM(COALESCE(marca_mkt,N''))) COLLATE Latin1_General_100_BIN2 = @Marca COLLATE Latin1_General_100_BIN2)
         THEN 1 ELSE 0 END AS propio_seleccionado,
    es_competidor
INTO #KpiMateriales
FROM ods.DIM_MATERIAL
WHERE version = @Version;

IF EXISTS (SELECT codigo FROM #KpiMateriales GROUP BY codigo HAVING COUNT_BIG(*) > 1)
    THROW 50003, N'Hay códigos de material duplicados; la web también rechaza ese catálogo.', 1;
IF EXISTS (SELECT 1 FROM #KpiMateriales WHERE es_competidor IS NULL)
    THROW 50004, N'Hay materiales sin clasificación de competidor.', 1;

-- Cada mercado de los productos propios seleccionados se cuenta UNA vez.
SELECT DISTINCT mercado INTO #KpiMercados
FROM #KpiMateriales WHERE propio_seleccionado = 1;

-- 3. Acumulados por producto: mismos cruces EXISTS que usa la web.
SELECT 'cartera' AS ambito, f.codigo_presentacion AS codigo,
       SUM(f.venta_actual) AS actual, SUM(f.venta_anterior) AS anterior
INTO #KpiVentas
FROM ods.FACT_VENTAS_AGREGADA AS f
WHERE f.version = @Version AND f.metrica = @Metrica
  AND EXISTS (SELECT 1 FROM #KpiPoblacion AS c WHERE c.ruc = f.ruc)
GROUP BY f.codigo_presentacion
UNION ALL
SELECT 'territorio', f.codigo_presentacion, SUM(f.venta_actual), SUM(f.venta_anterior)
FROM ods.FACT_VENTAS_AGREGADA AS f
WHERE f.version = @Version AND f.metrica = @Metrica
  AND EXISTS (
      SELECT 1 FROM ods.DIM_CLIENTE AS c
      WHERE c.version = @Version AND c.ruc = f.ruc
        AND c.categorizacion IN (N'DIAMANTE',N'ORO',N'PLATA',N'BRONCE',N'PLOMO')
        AND EXISTS (SELECT 1 FROM #KpiPoblacion AS p WHERE p.lima_provincias = c.lima_provincias)
  )
GROUP BY f.codigo_presentacion;

-- 4. Desglose por mercado para explicar la composición de cada total.
SELECT v.ambito, m.mercado,
       SUM(CASE WHEN m.propio_seleccionado = 1 THEN v.actual ELSE 0 END) AS propia_actual,
       SUM(CASE WHEN m.propio_seleccionado = 1 THEN v.anterior ELSE 0 END) AS propia_anterior,
       SUM(v.actual) AS mercado_actual,
       SUM(v.anterior) AS mercado_anterior
INTO #KpiDetalle
FROM #KpiVentas AS v
INNER JOIN #KpiMateriales AS m ON m.codigo = v.codigo COLLATE Latin1_General_100_BIN2
WHERE EXISTS (SELECT 1 FROM #KpiMercados AS k WHERE k.mercado = m.mercado)
GROUP BY v.ambito, m.mercado;

-- 5. Sumar primero. Después calcular porcentajes y elegir el mayor a nivel TOTAL.
;WITH Totales AS (
    SELECT
      COALESCE(SUM(CASE WHEN ambito = 'cartera' THEN propia_actual ELSE 0 END),0) AS propia_actual,
      COALESCE(SUM(CASE WHEN ambito = 'cartera' THEN propia_anterior ELSE 0 END),0) AS propia_anterior,
      COALESCE(SUM(CASE WHEN ambito = 'cartera' THEN mercado_actual ELSE 0 END),0) AS mercado_actual,
      COALESCE(SUM(CASE WHEN ambito = 'cartera' THEN mercado_anterior ELSE 0 END),0) AS mercado_anterior,
      COALESCE(SUM(CASE WHEN ambito = 'territorio' THEN propia_actual ELSE 0 END),0) AS territorial_propia,
      COALESCE(SUM(CASE WHEN ambito = 'territorio' THEN mercado_actual ELSE 0 END),0) AS territorial_mercado
    FROM #KpiDetalle
), Participaciones AS (
    SELECT *,
      CASE WHEN mercado_actual > 0 THEN CONVERT(float, propia_actual) / CONVERT(float, mercado_actual) ELSE 0 END AS ms_actual,
      CASE WHEN mercado_anterior > 0 THEN CONVERT(float, propia_anterior) / CONVERT(float, mercado_anterior) ELSE 0 END AS ms_anterior,
      CASE WHEN territorial_mercado > 0 THEN CONVERT(float, territorial_propia) / CONVERT(float, territorial_mercado) ELSE 0 END AS ms_territorial
    FROM Totales
)
SELECT
    @Version AS version, @Metrica AS metrica, @Meses AS meses,
    CONVERT(float, p.propia_actual) / @Meses AS venta_actual_mensual,
    CONVERT(float, p.mercado_actual) / @Meses AS mercado_mensual,
    p.ms_actual * 100 AS market_share_actual_pct,
    ideal.ms_ideal * 100 AS market_share_ideal_pct,
    CONVERT(float, p.mercado_actual) / @Meses * ideal.ms_ideal AS estimacion_mensual,
    -- Valores intermedios para conciliar con BI:
    p.propia_actual AS acumulado_propio_actual,
    p.propia_anterior AS acumulado_propio_anterior,
    p.mercado_actual AS acumulado_mercado_actual,
    p.mercado_anterior AS acumulado_mercado_anterior,
    p.territorial_propia AS acumulado_propio_territorial,
    p.territorial_mercado AS acumulado_mercado_territorial,
    p.ms_anterior * 100 AS market_share_anterior_pct,
    p.ms_territorial * 100 AS market_share_territorial_pct
FROM Participaciones AS p
CROSS APPLY (SELECT MAX(v.ms) AS ms_ideal FROM (VALUES (p.ms_actual),(p.ms_anterior),(p.ms_territorial)) AS v(ms)) AS ideal;

-- Segundo resultado: contribución por mercado, sin multiplicar mercados compartidos.
SELECT ambito, mercado, propia_actual, propia_anterior, mercado_actual, mercado_anterior,
       CONVERT(float, propia_actual) / @Meses AS propia_mensual,
       CONVERT(float, mercado_actual) / @Meses AS mercado_mensual
FROM #KpiDetalle
ORDER BY ambito, mercado_actual DESC;

DROP TABLE #KpiDetalle;
DROP TABLE #KpiMercados;
DROP TABLE #KpiVentas;
DROP TABLE #KpiMateriales;
DROP TABLE #KpiPoblacion;

/* Redondeo visual: importes a entero y porcentajes a un decimal.
   No redondear los porcentajes antes de calcular la estimación.
   Puede existir una diferencia minúscula de coma flotante respecto a JavaScript.
   Este script reproduce la matriz general sin restricciones de autorización
   externas ni el detalle de un cliente individual.
*/
