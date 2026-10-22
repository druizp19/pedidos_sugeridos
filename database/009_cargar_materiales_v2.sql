/* Ejecutar completo en SSMS, conectado al servidor 181.
   Linked Server [172.16.8.221] confirmado por el script anterior de ventas.
   Se asume que VMAE_PROD_DDD y CONF_MCDO_IQVIA están en
   BD_McdoFarmaceutico.dbo, como el maestro IQVIA del script de ventas.
   Esa ubicación no se ha verificado contra el servidor.
   Fuente: consulta del maestro actualizada proporcionada por el usuario.
   Solo inserta V2; si ya existe, se detiene. No modifica V1.
   La lectura remota se realiza antes de la transacción local.
   No genera el resumen ni habilita por sí sola V2 en la aplicación.
*/
USE [DTM_PEDIDOS_SUGERIDOS];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_WARNINGS ON;

DECLARE @Version varchar(20) = 'V2';
DECLARE @Insertados bigint;

IF DB_NAME() <> N'DTM_PEDIDOS_SUGERIDOS'
    THROW 50001, N'Base destino incorrecta.', 1;

IF EXISTS (SELECT 1 FROM ods.DIM_MATERIAL WHERE version = @Version)
    THROW 50002, N'Ya existen materiales V2. Revisar la carga antes de repetirla.', 1;

IF OBJECT_ID('tempdb..#MaterialesV2Origen') IS NOT NULL
    DROP TABLE #MaterialesV2Origen;

/* La consulta entre comillas se ejecuta en el 221.
   Se proyectan solo los campos necesarios para ods.DIM_MATERIAL.
   SourcePriority DESC conserva la preferencia por TAB_PRODUCTOS (2).
*/
SELECT
    remoto.codigo_presentacion,
    remoto.codigo_presentacion_final,
    remoto.descripcion_presentacion,
    remoto.unidad_negocio,
    remoto.franquicia,
    remoto.marca_mkt,
    remoto.mercado,
    remoto.corporacion
INTO #MaterialesV2Origen
FROM OPENQUERY([172.16.8.221], '
    WITH CombinedProducto AS (
        SELECT
            [Código_Presentación],
            [Codigo_Presentacion_Final],
            [Descripción_Presentación],
            [Marca_MKT],
            [MERCADO],
            [Descripción_Corporación],
            1 AS SourcePriority
        FROM [BD_McdoFarmaceutico].[dbo].[VMAE_PROD_DDD]

        UNION ALL

        SELECT
            [Código_Presentación],
            [Codigo_Presentacion_Final],
            [Descripción_Presentación],
            [Marca_MKT],
            [MERCADO],
            [Descripción_Corporación],
            2 AS SourcePriority
        FROM [DTM_MERCADOS].[DM].[TAB_PRODUCTOS]
    ),
    RankedProducto AS (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY [Código_Presentación]
                ORDER BY SourcePriority DESC
            ) AS rn
        FROM CombinedProducto
    ),
    MercadoConfigurado AS (
        SELECT DISTINCT MERCADO, UNIDAD_NEGOCIO, FRANQUICIA
        FROM [BD_McdoFarmaceutico].[dbo].[CONF_MCDO_IQVIA]
        WHERE MERCADO NOT IN (''RESTO'', ''OTROS'')
    )
    SELECT
        CONVERT(varchar(max), i.[Código_Presentación]) AS codigo_presentacion,
        CONVERT(varchar(max), i.[Codigo_Presentacion_Final]) AS codigo_presentacion_final,
        i.[Descripción_Presentación] AS descripcion_presentacion,
        COALESCE(mm.UNIDAD_NEGOCIO, ''RESTO'') AS unidad_negocio,
        COALESCE(mm.FRANQUICIA, ''RESTO'') AS franquicia,
        i.Marca_MKT AS marca_mkt,
        i.MERCADO AS mercado,
        i.[Descripción_Corporación] AS corporacion
    FROM RankedProducto AS i
    LEFT JOIN MercadoConfigurado AS mm ON i.MERCADO = mm.MERCADO
    WHERE i.rn = 1
      AND i.[Código_Presentación] NOT IN (''1247601'', ''1497101'')
') AS remoto;

IF NOT EXISTS (SELECT 1 FROM #MaterialesV2Origen)
    THROW 50003, N'La consulta de origen no devolvió materiales. No se insertó nada.', 1;

IF EXISTS (
    SELECT 1 FROM #MaterialesV2Origen
    WHERE NULLIF(LTRIM(RTRIM(codigo_presentacion)), '') IS NULL
)
    THROW 50004, N'Hay códigos de presentación vacíos. No se insertó nada.', 1;

IF EXISTS (
    SELECT codigo_presentacion COLLATE DATABASE_DEFAULT
    FROM #MaterialesV2Origen
    GROUP BY codigo_presentacion COLLATE DATABASE_DEFAULT
    HAVING COUNT_BIG(*) > 1
)
BEGIN
    SELECT codigo_presentacion COLLATE DATABASE_DEFAULT AS codigo_presentacion,
           COUNT_BIG(*) AS filas
    FROM #MaterialesV2Origen
    GROUP BY codigo_presentacion COLLATE DATABASE_DEFAULT
    HAVING COUNT_BIG(*) > 1;
    THROW 50005, N'Hay materiales duplicados. Revisar las asignaciones de CONF_MCDO_IQVIA.', 1;
END;

BEGIN TRY
    BEGIN TRANSACTION;

    /* Protege también frente a otra carga de V2 iniciada simultáneamente. */
    IF EXISTS (
        SELECT 1 FROM ods.DIM_MATERIAL WITH (UPDLOCK, HOLDLOCK)
        WHERE version = @Version
    )
        THROW 50006, N'V2 ya fue cargada por otra sesión. Se cancela esta inserción.', 1;

    INSERT INTO ods.DIM_MATERIAL (
        version,
        codigo_presentacion,
        codigo_presentacion_final,
        descripcion_presentacion,
        cp_presentacion,
        unidad_negocio,
        franquicia,
        marca_mkt,
        mercado,
        corporacion,
        es_competidor
    )
    SELECT
        @Version,
        codigo_presentacion,
        codigo_presentacion_final,
        descripcion_presentacion,
        CONCAT(codigo_presentacion, N' - ', descripcion_presentacion),
        unidad_negocio,
        franquicia,
        marca_mkt,
        mercado,
        corporacion,
        CASE
            WHEN NULLIF(LTRIM(RTRIM(corporacion)), N'') IS NULL THEN NULL
            WHEN UPPER(LTRIM(RTRIM(corporacion))) = N'HUMANOVA LAB CORP' THEN 0
            ELSE 1
        END
    FROM #MaterialesV2Origen;

    SET @Insertados = @@ROWCOUNT;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT @Version AS version, @Insertados AS materiales_insertados;

SELECT version, es_competidor, COUNT_BIG(*) AS materiales
FROM ods.DIM_MATERIAL
WHERE version = @Version
GROUP BY version, es_competidor;

/* Resolver clasificaciones pendientes antes de generar el resumen. */
SELECT codigo_presentacion, descripcion_presentacion, corporacion
FROM ods.DIM_MATERIAL
WHERE version = @Version AND es_competidor IS NULL;

DROP TABLE #MaterialesV2Origen;

/* Nota sobre la consulta original: si hay varias filas del mismo código
   dentro de la fuente ganadora, ROW_NUMBER elige una sin desempate estable.
   Confirmar que esa fuente tenga un solo registro por código, o definir
   una columna de actualización/prioridad antes de usar datos conflictivos.
*/
