/* Consultas de solo lectura, ejecutar después de cargar.
   Las primeras dos revisiones deben quedar sin duplicados antes de usar la matriz.
   No borrar registros automáticamente: revisar la fuente de cada coincidencia. */
USE [DTM_PEDIDOS_SUGERIDOS];
GO
SELECT version, ruc, COUNT_BIG(*) AS filas
FROM ods.DIM_CLIENTE
GROUP BY version, ruc HAVING COUNT_BIG(*) > 1;

SELECT version, codigo_presentacion, COUNT_BIG(*) AS filas
FROM ods.DIM_MATERIAL
GROUP BY version, codigo_presentacion HAVING COUNT_BIG(*) > 1;

SELECT version, metrica, MIN(fecha) AS fecha_minima, MAX(fecha) AS fecha_maxima,
       COUNT_BIG(*) AS filas, SUM(valor) AS total
FROM ods.FACT_VENTAS
GROUP BY version, metrica;

SELECT version, COUNT_BIG(*) AS filas_sin_ruc_utilizable
FROM ods.FACT_VENTAS
WHERE ruc IS NULL OR LTRIM(RTRIM(ruc)) IN (N'', N'(en0blanco)', N'00000000000')
GROUP BY version;

SELECT v.version, COUNT_BIG(*) AS filas_sin_material
FROM ods.FACT_VENTAS v
WHERE NOT EXISTS (
    SELECT 1 FROM ods.DIM_MATERIAL m
    WHERE m.version = v.version AND m.codigo_presentacion = v.codigo_presentacion
)
GROUP BY v.version;

SELECT v.version, COUNT_BIG(*) AS filas_sin_cliente
FROM ods.FACT_VENTAS v
WHERE NOT EXISTS (
    SELECT 1 FROM ods.DIM_CLIENTE c
    WHERE c.version = v.version AND c.ruc = v.ruc
)
GROUP BY v.version;
GO

/* Clasificación pendiente: completar corporacion y ejecutar 005. */
SELECT version, codigo_presentacion, corporacion
FROM ods.DIM_MATERIAL WHERE es_competidor IS NULL;

/* Falta de distribuidor en ventas propias: no se puede mostrar el desglose
   completo hasta corregir la fuente. Ejecutar después de 004. */
SELECT v.version, COUNT_BIG(*) AS filas_propias_sin_distribuidor
FROM ods.FACT_VENTAS v
WHERE NULLIF(LTRIM(RTRIM(v.distribuidor)), N'') IS NULL
  AND EXISTS (
      SELECT 1 FROM ods.DIM_MATERIAL m
      WHERE m.version = v.version AND m.codigo_presentacion = v.codigo_presentacion
        AND m.es_competidor = 0
  )
GROUP BY v.version;
GO
