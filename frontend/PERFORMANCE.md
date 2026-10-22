# Medición de la matriz V2

## Entregas trimestrales: validación del 20 de octubre de 2026

Se separaron las cachés de ventas y compras, se incluyó la revisión publicada en
las claves y se extendió la retención a 24 horas con límites LRU. Los históricos
sin metadatos conservan una generación de cinco minutos. El descubrimiento ahora
lee el catálogo de publicaciones, con compatibilidad para V1/V2 e índices usados
por comprobaciones EXISTS; ya no calcula DISTINCT sobre todas las ventas.

La medición directa de SQL de esta sesión mantuvo exactamente los totales de V2
en unidades: venta mensual 2.449.194,2925 y mercado mensual 9.135.103,6675.
También conservó 15.962 filas de ventas, 14.660 de compras y 355 marcas.
El descubrimiento pasó de 2.091 ms a 545 ms. La carga de catálogos varió de
2.018 ms a 3.304 ms; no se atribuye esa variación al cambio. El cálculo quedó en
21 ms. No se vació la caché de SQL ni se modificaron datos o índices.

Prueba HTTP sobre `next start` local, compilación de producción y SQL real:

| Escenario | Peticiones correctas | Mediana | p95 | Máximo |
| --- | ---: | ---: | ---: | ---: |
| Reportes sin caché de aplicación, catálogos precargados | 30/30 | 3.731 ms | 5.056 ms | 5.062 ms |
| Repetición con caché | 50/50 | 138 ms | 271 ms | 299 ms |

Se utilizaron seis combinaciones: unidades, soles, unidad de negocio, categoría,
zona y vendedor. Son ráfagas de solicitudes compartiendo combinaciones, no una
simulación de 50 sesiones de navegador con filtros únicos y tráfico sostenido.
El proceso conservó el límite de cuatro operaciones SQL concurrentes.

Cambiar a dos columnas de clientes tomó 223 ms y conservó los totales. El detalle
tomó 832 ms. Exportaciones de matriz y detalle respondieron correctamente en
178 y 112 ms; se comprobó la firma ZIP del archivo XLSX. La búsqueda devolvió un
conteo de 91 coincidencias y 91 elementos para la zona elegida. Una versión
inválida respondió 400. El caso de más de 100 clientes se cubre en pruebas unitarias.
Estos tiempos corresponden al entorno local, no son un SLA para el servidor final.

Para repetir, iniciar una compilación de producción recién creada y ejecutar:

```powershell
node --import tsx scripts/verify-concurrency.ts
```

El script solo admite localhost, no escribe en SQL, no imprime nombres/RUC y no
guarda las respuestas ni los Excel. Si los reportes ya están calientes, el primer
grupo también usará caché; para medir en frío hay que iniciar un proceso nuevo.
Ver `ENTREGAS_Y_CACHE.md` para publicación y correcciones.

## Medición histórica anterior

Caso medido: V2, UNIDAD, sin filtros de cartera/productos, ocho columnas de clientes por defecto.

| Etapa | Antes | Después |
| --- | ---: | ---: |
| Consultas del snapshot (ventas + compras) | 233,083 ms | 2,894 ms |
| Cálculo del reporte | 22 ms | 17 ms |
| Serialización | 3 ms | 3 ms |

Después del cambio, ventas tardó 2,548 ms y compras 346 ms. La conexión tomó 387 ms, el descubrimiento de versiones 2,117 ms y el catálogo 2,030 ms. Las mediciones directas se ejecutaron en procesos independientes sin caché de aplicación; no se vació la caché de SQL Server.

El endpoint completo `/api/matrix` respondió en 7,929 ms en la primera solicitud medida después del cambio y 40 ms al repetirla con caché. No es una garantía para otros filtros, concurrencia o condiciones del servidor.

## Cambio

`connection.ts` enviaba todos los parámetros como `nvarchar(500)`. Se verificó en sys.columns que `version` es `varchar(20)` y `metrica` es `varchar(10)` y que forman parte de los índices existentes. Ahora se envían con esos tipos; los RUC y etiquetas siguen siendo Unicode. No se cambiaron consultas de negocio, datos ni índices del servidor.

Antes y después coincidieron los totales del reporte, 15,864 filas agregadas de ventas, 14,660 filas de compras, 319 marcas y 787,886 bytes de respuesta. Pasaron las 25 pruebas y TypeScript. Esta comparación no sustituye la conciliación completa con BI.

## Repetir diagnóstico

Desde frontend:

```powershell
node --env-file=.env.local --import tsx scripts/profile-matrix.ts
```

Solo lee SQL. Muestra tipos, índices, tiempos, conteos y totales; no imprime credenciales ni nombres de clientes. Usa V2 por defecto, o acepta la versión como último argumento. Para registrar tiempos por consulta en el servidor, activar `PEDIDOS_PERF=1` en su entorno antes de iniciarlo. No es necesario para aplicar la corrección.

## M4/M5: opciones dependientes — 20/10/2026

Verificación de solo lectura contra la compilación local de producción con scripts/verify-dependent-filters.ts: V2 devolvió 434 combinaciones de materiales y 327 comerciales, 43 635 bytes adicionales de relaciones sin comprimir. La carga inicial del endpoint filters demoró 2051 ms. En 200 cálculos locales de opciones, p95 fue 0,33 ms y el máximo 1,97 ms; no se hicieron solicitudes adicionales para esos cálculos. La matriz filtrada respondió correctamente.

Estos tiempos locales corresponden al cálculo de opciones en Node, no a renderizado en el navegador, ni al tiempo SQL de la matriz, ni a una prueba de usuarios sostenidos. M4 mantiene los límites y la reutilización de caché existentes. Compilación y 45 pruebas aprobadas.
