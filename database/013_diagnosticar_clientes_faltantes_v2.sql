/* Ejecutar completo en el 181. Solo diagnóstico: no modifica datos.
   Cinco identificadores con mayor importe sin cliente en el resultado recibido.
   No vuelve a consultar FACT_VENTAS: revisa maestros y DIM_CLIENTE.
*/
USE [DTM_PEDIDOS_SUGERIDOS];
GO
SET NOCOUNT ON;

-- 1. Existencia exacta en los tres maestros del 221, incluidos conteos cero.
SELECT *
FROM OPENQUERY([172.16.8.221], '
    WITH Objetivos AS (
        SELECT ruc
        FROM (VALUES
            (N''20331066703''),
            (N''20384891943''),
            (N''20399497257''),
            (N''20131257750''),
            (N''20501781291'')
        ) AS t(ruc)
    )
    SELECT o.ruc,
        (SELECT COUNT_BIG(*) FROM BD_360.dbo.mae_ruc_fr AS a
         WHERE a.ruc = o.ruc) AS filas_maestro_actual,
        (SELECT COUNT_BIG(*) FROM BD_360.dbo.mae_ruc_fr_his AS h
         WHERE h.ruc = o.ruc) AS filas_maestro_historico,
        (SELECT COUNT_BIG(*) FROM BD_BussinessI.dbo.MAESTROCLIENTES AS c
         WHERE c.DOCIDENTIDAD = o.ruc) AS filas_maestro_comercial
    FROM Objetivos AS o
    ORDER BY o.ruc
');

-- 2. Presencia local en V1/V2 y posibles diferencias de espacios en el RUC.
-- La limpieza es SOLO para buscar candidatos; no se actualiza ninguna clave.
;WITH Objetivos AS (
    SELECT ruc
    FROM (VALUES
        (N'20331066703'),
        (N'20384891943'),
        (N'20399497257'),
        (N'20131257750'),
        (N'20501781291')
    ) AS t(ruc)
)
SELECT
    o.ruc AS ruc_buscado,
    c.version,
    c.ruc AS ruc_guardado,
    DATALENGTH(c.ruc) AS bytes_ruc_guardado,
    c.farmacia,
    c.categorizacion,
    c.zonabase,
    CASE WHEN c.ruc IS NULL THEN N'SIN COINCIDENCIA'
         WHEN c.ruc = o.ruc THEN N'COINCIDE SEGUN SQL'
         ELSE N'POSIBLE DIFERENCIA DE ESPACIOS: REVISAR' END AS resultado
FROM Objetivos AS o
LEFT JOIN ods.DIM_CLIENTE AS c
    ON LTRIM(RTRIM(REPLACE(REPLACE(c.ruc, NCHAR(160), N' '), NCHAR(9), N' '))) = o.ruc
   AND c.version IN ('V1', 'V2')
ORDER BY o.ruc, c.version;

/* Interpretación:
   - Actual=0 e histórico=0: la consulta de carga de clientes no incluye ese
     identificador. MAESTROCLIENTES solo enriquece los registros del CTE mediante
     LEFT JOIN; no añade clientes ausentes de los dos maestros de BD_360.
   - Existe en BD_360, pero no en DIM_CLIENTE V2: revisar ejecución de la carga,
     diferencias de clave o cambios del maestro desde que se realizó la carga.
   - Aparece con otra forma de la clave: confirmar la identidad antes de corregir.
   No copiar clientes V1 ni crear categorías/zonas sin confirmar datos V2.
*/
