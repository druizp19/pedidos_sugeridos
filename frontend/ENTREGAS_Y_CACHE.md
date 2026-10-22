# Entregas trimestrales y caché

La página elige la versión disponible de mayor número al abrirse. Seleccionar una
versión anterior sigue siendo posible. Una pestaña ya abierta no cambia de
entrega automáticamente.

## Publicar una entrega nueva

1. Completar y conciliar clientes, materiales, vendedores y ventas de esa versión.
2. Generar el resumen con `ods.usp_GenerarVentasAgregadas` y sus períodos correctos
   (`database/006_procedimiento_resumen.sql` y `007_generar_resumen.sql`).
3. El procedimiento guarda el resumen y `ods.REPORTE_VERSION.generado_en` en la
   misma transacción. Esa fecha identifica la revisión publicada.
4. La siguiente petición descubre la entrega cuando vence la caché de metadatos,
   como máximo a los 15 segundos. Al volver a abrir/recargar la página se elige
   la última versión disponible.

La aplicación consulta el catálogo pequeño de publicaciones y comprueba mediante
`EXISTS` que haya resumen y maestros. No obtiene las versiones recorriendo todos
los valores distintos de la tabla de ventas. V1 y V2 mantienen una compatibilidad
limitada cuando faltan sus metadatos; para versiones posteriores son obligatorios.

## Corregir una entrega existente

- Si cambian las ventas: regenerar el resumen con el procedimiento después de
  completar la corrección. Esto ya cambia la revisión.
- Si cambian solo maestros: completar y conciliar las modificaciones y después
  ejecutar `database/016_publicar_correccion_cache.sql` para la versión elegida.
- No publicar una revisión mientras aún se están cargando sus tablas. La carga
  y su publicación deben coordinarse en una ventana de mantenimiento; las claves
  de caché no sustituyen una transacción o un mecanismo de publicación de datos.

No se expone un endpoint público que modifique SQL o invalide la caché. El script
016 es una operación administrativa manual. No se ejecutó contra el servidor
durante este cambio. Si la versión no tiene metadatos, primero registrar sus
períodos mediante el procedimiento; el script falla sin modificar otras versiones.

## Duración y límites

- Reportes: 24 horas, hasta 32 MiB de JSON estimado.
- Ventas por población: 24 horas, hasta 48 MiB.
- Compras por columnas de clientes y distribuidoras: 24 horas, hasta 16 MiB.
- Catálogos: 24 horas, hasta 128 MiB.
- Versiones/revisiones: 15 segundos, consultadas bajo demanda; no hay sondeo SQL.

Una revisión distinta cambia las claves de **todas** las cachés de esa entrega.
Un trabajo anterior que termine después de la corrección no reemplaza el resultado
de la nueva revisión. Las entradas anteriores se expulsan por los límites LRU/TTL.
Las solicitudes idénticas simultáneas comparten trabajo.

Los límites son estimaciones del JSON, no límites exactos del heap de Node.
La memoria, reinicios y expulsiones pueden hacer que se consulte SQL antes de
24 horas. No es una caché persistente ni una promesa de conservar cada combinación
durante todo el trimestre.

Las versiones históricas sin `generado_en` mantienen una generación de caché
de cinco minutos: no pueden comunicar correcciones. En la verificación de esta
entrega V2 tenía metadatos y V1 todavía no.

## Reutilización y aislamiento

Cambiar solo las columnas de clientes consulta sus compras sin repetir las ventas
de la población. Los filtros de productos reutilizan ventas agregadas. Cambiar
cartera, métrica, versión, revisión o alcance autorizado mantiene resultados
separados. El detalle de cliente tiene su propio contexto.

Las cachés y la cola pertenecen a cada proceso. Para múltiples réplicas hay que
distribuir el presupuesto de conexiones; cuatro conexiones por proceso no son
cuatro conexiones globales. La caché de metadatos permite a cada proceso detectar
las publicaciones sin que el usuario tenga que vaciarla manualmente.

## Selector de clientes

La búsqueda usa el catálogo del servidor y la regla `zona_cliente`. Su respuesta
es `{ items, total, limit }`, con un máximo de 100 filas visibles y el conteo real
de coincidencias. El selector no usa como alternativa una lista inicial truncada
filtrada por `zonabase`. Las respuestas de búsquedas anteriores no reemplazan la
selección actual.
