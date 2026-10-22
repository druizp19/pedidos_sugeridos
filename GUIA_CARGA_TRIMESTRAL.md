# Carga trimestral y publicación de Pedidos Sugeridos

Esta guía publica una nueva versión sin cambiar una entrega ya visible. Ejecutar
todo en SQL Server **172.17.2.181**, base **DTM_PEDIDOS_SUGERIDOS**, y registrar
en el ticket quién concilió la carga y cuándo.

## Antes de cargar

1. Elegir un identificador nuevo: `V3`, `V4`, etc. No reutilizar ni sobrescribir
   una versión que los usuarios ya ven.
2. Definir los dos períodos completos comparables. Ejemplo para `V3`: enero a
   noviembre de 2026 versus enero a noviembre de 2025. Ambos inician el día 1 y
   terminan el último día del mes.
3. Tener listos clientes, materiales, vendedores y ventas de ambos períodos.
   La carga sigue siendo trimestral y manual; no existe una actualización nocturna.
4. Informar una ventana de carga. Mientras se cargan datos de una versión no se
   debe generar ni publicar su resumen.

## Orden de carga

1. Cargar `ods.DIM_CLIENTE` con `version = 'V3'`. Completar `zona_cliente`,
   categorización y los demás atributos comerciales.
2. Cargar `ods.DIM_MATERIAL` con `version = 'V3'`. Cada producto de ventas debe
   existir una única vez y tener `es_competidor` informado. Ejecutar
   `database/005_clasificar_materiales.sql` si corresponde.
3. Cargar `ods.DIM_VENDEDORES` con `version = 'V3'`. La zona debe usar el mismo
   criterio que `zona_cliente`; para zonas que empiezan con `CD`, la web muestra
   automáticamente CADENAS. Sin vendedor encontrado muestra Marketing / SUPERVISOR MKT.
4. Cargar `ods.FACT_VENTAS` con `version = 'V3'`, fecha mensual, RUC,
   código de presentación, métrica `UNIDAD` o `VALOR` y valor. El distribuidor
   puede ser nulo para ventas de mercado; no cargar otra fila totalizadora para
   una venta que ya está desglosada por distribuidor.
5. Ejecutar `database/003_verificar_carga.sql`, ajustando su variable de versión
   si fuera necesario. Corregir duplicados, materiales sin clasificar y RUC o
   productos sin maestro antes de continuar.

## Conciliar antes de publicar

- Comparar totales de unidades y soles con la fuente aprobada.
- Revisar al menos una marca propia, una competidora, una zona comercial, una zona
  CD y un cliente sin vendedor asignado.
- Confirmar que los períodos actual y anterior tienen la misma cantidad de meses.
- Revisar que no hay filas duplicadas para la clave usada en el resumen.

La entrega todavía no aparece en la web mientras no se ejecute el resumen.

## Publicar

1. Si es la primera publicación en el servidor, ejecutar una sola vez
   `database/006_procedimiento_resumen.sql`.
2. Copiar `database/007_generar_resumen.sql`, cambiar solamente las cinco
   variables iniciales (`@Version`, cuatro fechas) y ejecutarlo. El procedimiento
   reemplaza únicamente `ods.FACT_VENTAS_AGREGADA` de esa versión y registra sus
   períodos y hora de publicación en `ods.REPORTE_VERSION` dentro de la misma
   transacción.
3. Guardar el resultado de `filas_generadas` y de los totales que devuelve el
   script como evidencia de publicación.
4. Esperar hasta 15 segundos y abrir o recargar la web. Seleccionará la versión
   disponible de mayor número por defecto. Una pestaña abierta no cambia sola de
   entrega para evitar que el análisis de un usuario se mueva durante su trabajo.

## Correcciones posteriores

- Si se corrigen ventas o períodos: volver a ejecutar el procedimiento de resumen
  para esa misma versión, después de terminar la corrección.
- Si solo se corrigen maestros: terminar y conciliar el cambio; luego ajustar
  `@Version` y ejecutar `database/016_publicar_correccion_cache.sql`.
- No ejecutar `016` durante una carga ni antes de terminar la conciliación. El
  script no cambia ventas: solo marca una revisión nueva para que la web renueve
  sus resultados.

Las versiones son inmutables desde la perspectiva de los usuarios. Si el cambio
altera el alcance comercial de manera importante, crear una nueva versión en vez
de reemplazar una entrega ya comunicada.

## Validación final en web

1. Recargar `/sugerido` y confirmar período, versión y fecha de publicación.
2. Validar unidades y soles para los filtros generales y una marca.
3. Probar filtros relacionados, una vista de cliente y las columnas de compra.
4. Exportar una muestra de Excel y confirmar que coincide con la matriz.
5. Registrar el resultado de la validación antes de comunicar la entrega.

Las instrucciones detalladas sobre caché, revisiones y comportamiento del
selector están en `frontend/ENTREGAS_Y_CACHE.md`.
