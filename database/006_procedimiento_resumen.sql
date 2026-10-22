/* SQL Server 2016 SP1 o superior. Ejecutar después de 004.
   Crea el procedimiento; no procesa ventas hasta ejecutar EXEC.
   Ejecutar una vez finalizada y conciliada la carga de la versión. */
USE [DTM_PEDIDOS_SUGERIDOS];
GO
-- Los períodos se publican junto al resumen para descubrir nuevas versiones
-- en la web sin cambiar etiquetas ni divisores en el código.
IF OBJECT_ID(N'ods.REPORTE_VERSION', N'U') IS NULL
BEGIN
    CREATE TABLE ods.REPORTE_VERSION (
        version varchar(20) NOT NULL PRIMARY KEY,
        inicio_actual date NOT NULL,
        fin_actual date NOT NULL,
        inicio_anterior date NOT NULL,
        fin_anterior date NOT NULL,
        generado_en datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO
CREATE OR ALTER PROCEDURE ods.usp_GenerarVentasAgregadas
    @Version varchar(20),
    @InicioActual date,
    @FinActual date,
    @InicioAnterior date,
    @FinAnterior date
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF DB_NAME() <> N'DTM_PEDIDOS_SUGERIDOS'
        THROW 50001, N'Base incorrecta.', 1;
    IF @@TRANCOUNT <> 0
        THROW 50002, N'Ejecute este procedimiento sin una transacción externa.', 1;
    IF NULLIF(LTRIM(RTRIM(@Version)), '') IS NULL
        THROW 50003, N'Indique una versión.', 1;
    IF @InicioActual IS NULL OR @FinActual IS NULL OR @InicioAnterior IS NULL OR @FinAnterior IS NULL
       OR @InicioActual > @FinActual OR @InicioAnterior > @FinAnterior
        THROW 50004, N'Indique los dos intervalos completos y válidos.', 1;
    IF @InicioActual <= @FinAnterior AND @InicioAnterior <= @FinActual
        THROW 50005, N'El período actual y el comparable no deben superponerse.', 1;
    IF DAY(@InicioActual) <> 1 OR @FinActual <> EOMONTH(@FinActual)
       OR DAY(@InicioAnterior) <> 1 OR @FinAnterior <> EOMONTH(@FinAnterior)
        THROW 50011, N'Los períodos deben abarcar meses completos para calcular los promedios.', 1;

    DECLARE @LockResult int;
    DECLARE @Recurso nvarchar(255) = N'ods.ResumenVentas:' + @Version;
    DECLARE @Filas bigint;

    BEGIN TRY
        BEGIN TRANSACTION;
        EXEC @LockResult = sys.sp_getapplock
            @Resource = @Recurso,
            @LockMode = 'Exclusive',
            @LockOwner = 'Transaction',
            @LockTimeout = 10000;
        IF @LockResult < 0
            THROW 50006, N'Ya se está procesando esta versión. Intente nuevamente al finalizar.', 1;

        /* HOLDLOCK conserva una lectura estable hasta terminar. No cargar esta
           versión mientras se genera el resumen; la carga debe estar completa. */
        SELECT codigo_presentacion, ruc,
               NULLIF(LTRIM(RTRIM(distribuidor)), N'') AS distribuidor,
               UPPER(LTRIM(RTRIM(metrica))) AS metrica, fecha, valor
        INTO #Ventas
        FROM ods.FACT_VENTAS WITH (HOLDLOCK)
        WHERE version = @Version
          AND ((fecha >= @InicioActual AND fecha <= @FinActual)
            OR (fecha >= @InicioAnterior AND fecha <= @FinAnterior));

        IF NOT EXISTS (SELECT 1 FROM #Ventas)
            THROW 50007, N'No hay ventas en los períodos indicados. No se reemplazó el resumen.', 1;
        IF EXISTS (SELECT 1 FROM #Ventas WHERE metrica NOT IN ('UNIDAD', 'VALOR'))
            THROW 50008, N'Existen métricas diferentes de UNIDAD o VALOR.', 1;

        SELECT codigo_presentacion, es_competidor
        INTO #Materiales
        FROM ods.DIM_MATERIAL WITH (HOLDLOCK)
        WHERE version = @Version;
        IF EXISTS (SELECT codigo_presentacion FROM #Materiales GROUP BY codigo_presentacion HAVING COUNT_BIG(*) > 1)
            THROW 50009, N'Hay productos duplicados en DIM_MATERIAL para esta versión.', 1;
        IF EXISTS (
            SELECT 1 FROM #Ventas v LEFT JOIN #Materiales m ON m.codigo_presentacion = v.codigo_presentacion
            WHERE m.codigo_presentacion IS NULL OR m.es_competidor IS NULL
        )
            THROW 50010, N'Hay ventas sin material o sin es_competidor. Revise la carga y ejecute 005.', 1;

        /* Cada fila corresponde a un solo producto/cliente/distribuidor/métrica.
           No se suma un total de ventas propias adicional a su desglose.
           No se divide aquí: la web usa los meses registrados para la versión.
           Se incluyen claves presentes solamente en el período anterior. */
        SELECT codigo_presentacion, ruc, distribuidor, metrica,
               CAST(SUM(CASE WHEN fecha >= @InicioActual AND fecha <= @FinActual
                             THEN valor ELSE 0 END) AS decimal(28,6)) AS venta_actual,
               CAST(SUM(CASE WHEN fecha >= @InicioAnterior AND fecha <= @FinAnterior
                             THEN valor ELSE 0 END) AS decimal(28,6)) AS venta_anterior
        INTO #Resumen
        FROM #Ventas
        GROUP BY codigo_presentacion, ruc, distribuidor, metrica;

        DELETE FROM ods.FACT_VENTAS_AGREGADA WHERE version = @Version;
        INSERT INTO ods.FACT_VENTAS_AGREGADA
            (version, codigo_presentacion, ruc, distribuidor, metrica, venta_actual, venta_anterior)
        SELECT @Version, codigo_presentacion, ruc, distribuidor, metrica, venta_actual, venta_anterior
        FROM #Resumen;
        SET @Filas = @@ROWCOUNT;

        UPDATE ods.REPORTE_VERSION
        SET inicio_actual = @InicioActual, fin_actual = @FinActual,
            inicio_anterior = @InicioAnterior, fin_anterior = @FinAnterior,
            generado_en = SYSUTCDATETIME()
        WHERE version = @Version;
        IF @@ROWCOUNT = 0
            INSERT INTO ods.REPORTE_VERSION
                (version, inicio_actual, fin_actual, inicio_anterior, fin_anterior)
            VALUES (@Version, @InicioActual, @FinActual, @InicioAnterior, @FinAnterior);

        COMMIT TRANSACTION;
        SELECT @Version AS version, @Filas AS filas_generadas;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO
