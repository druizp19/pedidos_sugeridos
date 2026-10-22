/* Ejecutar en 172.17.2.181. Fuente: VW_FR.dbo.vendedores, la del modelo original.
   Completa nombres para mostrar en la interfaz, no define permisos de acceso.
   No crea otra tabla permanente ni modifica ventas o supervisores.
   Para conservar V1, la fuente debe representar las asignaciones de esa entrega. */
USE [DTM_PEDIDOS_SUGERIDOS];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() <> N'DTM_PEDIDOS_SUGERIDOS'
    THROW 50001, N'Base incorrecta.', 1;
IF OBJECT_ID(N'ods.DIM_CLIENTE', N'U') IS NULL
    THROW 50002, N'No existe ods.DIM_CLIENTE.', 1;
IF COL_LENGTH(N'ods.DIM_CLIENTE', N'nombres_vendedores') IS NULL
    ALTER TABLE ods.DIM_CLIENTE ADD nombres_vendedores nvarchar(max) NULL;
GO
-- GO separa la creación de la columna de las sentencias que la utilizan.
DECLARE @Version varchar(20) = 'V1';

IF NOT EXISTS (SELECT 1 FROM ods.DIM_CLIENTE WHERE version = @Version)
    THROW 50003, N'No hay clientes para la versión seleccionada.', 1;

IF OBJECT_ID('tempdb..#VendedoresZonaV1') IS NOT NULL
    DROP TABLE #VendedoresZonaV1;

/* Se acepta A025 o A025 - Trujillo 1 (Costa), como en el código original.
   Mantener los códigos como texto. DISTINCT evita repetir el mismo nombre. */
SELECT DISTINCT
    LEFT(z.zona, CHARINDEX(N' - ', z.zona + N' - ') - 1) AS zona_codigo,
    LTRIM(RTRIM(CONVERT(nvarchar(300), v.nombreFFVV))) AS vendedor
INTO #VendedoresZonaV1
FROM VW_FR.dbo.vendedores v
CROSS APPLY (
    SELECT LTRIM(RTRIM(CONVERT(nvarchar(200), v.zonaBase))) AS zona
) z
WHERE NULLIF(z.zona, N'') IS NOT NULL
  AND NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(300), v.nombreFFVV))), N'') IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM #VendedoresZonaV1)
    THROW 50004, N'La fuente no tiene vendedores con zona. No se actualizaron clientes.', 1;

;WITH NombresPorZona AS (
    SELECT z.zona_codigo,
        STUFF((
            SELECT N' / ' + v.vendedor
            FROM #VendedoresZonaV1 v
            WHERE v.zona_codigo = z.zona_codigo
            ORDER BY v.vendedor
            FOR XML PATH(''), TYPE
        ).value('.', 'nvarchar(max)'), 1, 3, N'') AS nombres
    FROM (SELECT DISTINCT zona_codigo FROM #VendedoresZonaV1) z
)
UPDATE c
SET nombres_vendedores = v.nombres
FROM ods.DIM_CLIENTE c
CROSS APPLY (
    SELECT LTRIM(RTRIM(c.zonabase)) AS zona
) z
INNER JOIN NombresPorZona v
    ON v.zona_codigo = LEFT(z.zona, CHARINDEX(N' - ', z.zona + N' - ') - 1)
WHERE c.version = @Version;

SELECT @@ROWCOUNT AS clientes_actualizados;

SELECT zonabase, nombres_vendedores, COUNT_BIG(*) AS clientes
FROM ods.DIM_CLIENTE
WHERE version = @Version
GROUP BY zonabase, nombres_vendedores
ORDER BY zonabase;

-- Zonas sin correspondencia: revisar, no asignar un nombre arbitrariamente.
SELECT c.zonabase, COUNT_BIG(*) AS clientes_sin_coincidencia
FROM ods.DIM_CLIENTE c
CROSS APPLY (SELECT LTRIM(RTRIM(c.zonabase)) AS zona) z
WHERE c.version = @Version
  AND NOT EXISTS (
      SELECT 1 FROM #VendedoresZonaV1 v
      WHERE v.zona_codigo = LEFT(z.zona, CHARINDEX(N' - ', z.zona + N' - ') - 1)
  )
GROUP BY c.zonabase;

DROP TABLE #VendedoresZonaV1;
GO
