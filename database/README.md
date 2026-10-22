# DTM_PEDIDOS_SUGERIDOS: tres tablas de carga y un resumen generado

> **Guía vigente:** seguir `../GUIA_CARGA_TRIMESTRAL.md` para toda carga,
> conciliación, publicación o corrección. El texto histórico de este archivo se
> conserva como referencia de scripts antiguos, pero no describe por completo el
> modelo vigente: hoy también existe `ods.DIM_VENDEDORES` y
> `ods.REPORTE_VERSION`. No usar sus afirmaciones sobre ausencia de esas tablas
> para decidir una carga nueva.

## Versiones automáticas en el reporte

La revisión actual de `006_procedimiento_resumen.sql` crea `ods.REPORTE_VERSION` y guarda los dos períodos al generar cada resumen, dentro de la misma transacción. Ejecutar el 006 completo una vez para instalar esta revisión; no carga ventas ni regenera resúmenes por sí solo. Después, ejecutar `007_generar_resumen.sql` para V2 (enero-agosto 2026 frente a enero-agosto 2025). Para futuras versiones, indicar su identificador V3, V4, etc. y sus períodos completos al invocar el procedimiento.

La web obtiene las etiquetas y divisores de esos períodos y muestra solo las versiones con resumen y maestros de clientes/materiales. Consulta el selector al abrir o recargar el reporte, sin sondeo periódico. Los resúmenes antiguos de V1/V2 conservan sus períodos conocidos si no tienen metadatos. No se ejecutaron estos cambios SQL desde el asistente.

Las siguientes secciones describen el esquema y la carga originales; la tabla de períodos anterior amplía ese diseño.

Todo está en el esquema ods. No hay columna origen, catálogo de versiones, staging ni auditoría de cargas. La clasificación propio/competidor se obtiene de DIM_MATERIAL.es_competidor cruzando version y codigo_presentacion.

## Orden de ejecución

En SSMS conectado al servidor 181:

1. Si aún no creó las tablas, ejecutar 002_crear_tablas_ods.sql. Crea el esquema si falta y las tres tablas DIM_CLIENTE, DIM_MATERIAL y FACT_VENTAS. La base DTM_PEDIDOS_SUGERIDOS debe existir. 001 es opcional y solamente crea el esquema.
2. Ejecutar 004_preparar_resumen.sql. Agrega distribuidor si la tabla de ventas ya estaba creada sin esa columna y crea FACT_VENTAS_AGREGADA. No carga ni borra datos.
3. Cargar los resultados de las tres consultas de origen con su version. Conservar fecha y distribuidor en ventas; incorporar distribuidor al SELECT y GROUP BY del sell in, y NULL para competidores sin ese detalle. No insertar además los totales propios: eso duplicaría ventas.
4. Ejecutar 005_clasificar_materiales.sql después de cargar materiales. Editar @Version (por defecto V2). HUMANOVA LAB CORP -> 0; otras corporaciones no vacías -> 1; NULL/blanco -> NULL para revisión.
5. Ejecutar 003_verificar_carga.sql y resolver duplicados de dimensiones, referencias faltantes y clasificaciones pendientes antes de usar la web.
6. Ejecutar 006_procedimiento_resumen.sql para instalar/actualizar el procedimiento (SQL Server 2016 SP1 o superior).
7. Editar las fechas comparables de 007_generar_resumen.sql y ejecutarlo después de finalizar la carga. El ejemplo trae V2 enero-agosto 2026, pero no presume las fechas anteriores.

Si ya ejecutó el 002 anterior, no lo repita; use 004. Ningún script elimina las tablas del diseño antiguo de 13 tablas. No se han ejecutado estos archivos contra SQL Server.

## Qué se guarda

FACT_VENTAS: version, codigo_presentacion, ruc, fecha, distribuidor, metrica, valor. Conservar ambos períodos en la carga. Las filas por distribuidor deben reemplazar el anterior total de sell in, no añadirse encima. La distribuidora no puede inferirse desde materiales.

FACT_VENTAS_AGREGADA: version, codigo_presentacion, ruc, distribuidor, metrica, venta_actual, venta_anterior. No guarda fechas ni promedios. Una fila por esa combinación; NULL es válido cuando no hay RUC o distribuidor. Los valores vacíos de distribuidor se normalizan a NULL durante la agregación.

El procedimiento filtra por versión y los dos períodos indicados, normaliza las métricas a UNIDAD/VALOR, suma y reemplaza únicamente el resumen de esa versión dentro de una transacción. Reejecutarlo no acumula duplicados en el resumen; repetir accidentalmente la carga base sí duplicaría las ventas. Los intervalos deben ser completos, no superponerse y contener datos en conjunto. Debe conciliarse por separado la cobertura y los totales de cada período: el procedimiento no adivina si un período sin ventas representa cero real o una carga incompleta.

Mantener los períodos y divisores en la configuración de la aplicación: V1 divide entre 5, V2 entre 8. La configuración y los parámetros de generación deben coincidir. No sumar entregas distintas. No usar NOLOCK en lecturas del resumen: el reemplazo es transaccional. Ejecutar la generación después de terminar la carga; los bloqueos estabilizan la lectura, pero no determinan si una carga de varios lotes ya terminó.

## Columnas de las consultas de origen

Indicar columnas explícitas en INSERT; no usar SELECT *. En clientes: Dirección -> direccion; GRUPOCLIENTE2 -> grupo_cliente; zonaCliente -> zona_cliente; zonaBase -> zonabase; limaProvincias -> lima_provincias; codigoBrick -> codigo_brick. La consulta original no entrega quintil ni cp_cliente: derivarlos según las reglas del BI, sin inventar equivalencias.

En materiales: Código_Presentación -> codigo_presentacion; Codigo_Presentacion_Final -> codigo_presentacion_final; Descripción_Presentación -> descripcion_presentacion; Descripción_Corporación -> corporacion. El resto de campos comerciales se mapea por nombre. cp_presentacion se puede formar con código y descripción. El CASE de 005 puede incorporarse directamente al INSERT para cargar es_competidor sin un UPDATE posterior.

RUC y códigos se conservan como texto, incluidos ceros iniciales. Clientes y materiales deben tener una fila por clave y versión antes de cruzarlos con ventas. Los valores de RUC vacíos o marcadores requieren revisión; no se inventan identidades. Los campos opcionales del DDL deben estar completos cuando los cálculos los requieran.

No hay tabla adicional de vendedores. El script 008_completar_vendedores_v1.sql agrega nombres_vendedores a DIM_CLIENTE y lo completa desde VW_FR.dbo.vendedores por código de zona, conservando varios nombres separados por " / ". ffvv conserva el tipo de fuerza comercial (RRVV/RRMM/etc.) y no debe usarse como nombre de persona. El supervisor existente no se modifica. La fuente debe corresponder a las asignaciones de V1; no aplicar asignaciones actuales a un histórico sin decidirlo. Este texto es para mostrar en la interfaz, no para autorizar accesos ni construir filtros por identidad de empleado. El frontend todavía requiere consumir este nuevo campo.

Para V1, recuperar su detalle original con fechas y distribuidor para generar este resumen. Los acumulados antiguos sin distribuidor no permiten reconstruir su desglose. El código de la aplicación antigua aún no se adaptó al nuevo modelo.

## Verificación

Revisión estática de scripts. No se ejecutaron ni compilaron en SQL Server. No se modificaron datos remotos. Índices iniciales sujetos a medición. La API, caché, cálculos de market share y frontend son trabajo posterior.
