# Frontend de Pedidos Sugeridos

La entrada Next.js `app/page.tsx` monta `composition/report-app.tsx`. Este es el único punto que conoce las implementaciones concretas de los puertos del frontend.

```text
app/page → composition/report-app
                 ├─ ReportProvider → presentation/screens → components + hooks
                 ├─ application/report-queries → application/ports/report-gateway
                 └─ infrastructure/http + infrastructure/browser
                                 ↓
                       API existente de Next.js
```

## Responsabilidades

- `domain/report-contracts.ts`: modelos tipados compartidos; no depende de React.
- `domain/report-filters.ts`: transiciones de filtros, reinicio y cambio de versión.
- `domain/report-view.ts`: búsqueda y ordenamiento sin alterar la respuesta ni sus totales.
- `application/report-queries.ts`: casos de uso del cliente. Recibe `ReportGateway` y `FileDownload`; no utiliza fetch, DOM, React ni SQL.
- `application/ports/report-gateway.ts`: contratos de consultas y descarga, separados porque responden a responsabilidades diferentes.
- `infrastructure/http/report-gateway.ts`: transporte HTTP, parámetros, errores y cancelación.
- `infrastructure/browser/file-download.ts`: descarga de archivos y liberación de URLs temporales.
- `presentation/hooks`: estado de pantalla, selección temporal, carga, cancelación, orden y expansión. Utilizan casos de uso desde el proveedor.
- `presentation/components`: encabezado, indicadores, filtros, matriz, selector y detalle. El detalle tiene una tabla independiente y reutiliza los indicadores.
- `components/ui`: componentes de shadcn/ui basados en Radix, Tailwind y class-variance-authority. `components.json` registra los alias y el tema del proyecto.

Los adaptadores de servidor y fórmulas SQL existentes conservan su ubicación. No se reemplazó el modelo del servidor ni se modificaron tablas. `types/index.ts` se mantiene como reexportación de compatibilidad para consumidores del servidor.

## SOLID aplicado

Cada capa tiene una responsabilidad: renderizar, coordinar estado, ejecutar casos de uso o comunicarse con el exterior. Los casos de uso dependen de interfaces; el proveedor permite sustituir el adaptador HTTP por uno de pruebas sin modificar las pantallas. La descarga tiene su propio puerto. Un nuevo transporte se incorpora en la composición sin cambiar la lógica de filtros ni las vistas.

Se mantienen componentes tabulares específicos de negocio porque necesitan encabezados agrupados, columnas fijas y distribuidores dinámicos. Utilizan los elementos Table de shadcn dentro de un único contenedor de desplazamiento para conservar las columnas fijas.

## Comportamiento conservado

Versiones, unidades/soles, filtros de cartera, columnas de clientes, búsqueda de marcas y SKU, ordenamiento, expansión, detalle por cliente, vendedores, distribuidores y Excel. Cada segmentador de cartera abre una lista con búsqueda local por texto, normalizada para ignorar tildes; seleccionar una opción aplica el filtro y «Quitar filtro» lo restablece. La búsqueda de texto de la matriz sigue siendo local y no cambia los totales; Excel conserva los filtros. Ecosistema sigue fuera de este alcance.

La interfaz muestra skeletons durante las consultas y distingue los valores no disponibles del cero. Las respuestas canceladas no reemplazan una selección nueva. Los errores de búsqueda y exportación son visibles.

## Verificación

`npm test`: pruebas de fórmulas y concurrencia existentes, más pruebas de filtros, inmutabilidad del ordenamiento, puertos, exportación, errores HTTP y restricciones de dependencias.

`npm run lint`: TypeScript. `npm run build`: compilación de producción.

Las pruebas de arquitectura impiden que presentación llame directamente a fetch o importe adaptadores. Al agregar funcionalidades, incorporar el contrato en el puerto, implementar el adaptador y consumirlo desde un hook, no desde JSX.

Referencia de configuración de shadcn/ui: https://ui.shadcn.com/docs/components-json

## Asignación comercial unificada (M3)

assignClientSellers en domain/report.ts es la única regla de asignación: prefijo CD asigna CADENAS, zonas con vendedores conservan sus nombres y el supervisor del cliente, y las zonas sin vendedor usan Marketing / SUPERVISOR MKT. El catálogo versionado sirve a filtros, búsqueda y detalle.

assignedClientRucs obtiene la población de los filtros de vendedor y supervisor desde ese catálogo. ReportService la pasa internamente al repositorio; no se acepta una lista de RUC desde HTTP para este propósito. SQL recibe un parámetro nvarchar(max) y usa OPENJSON con EXISTS, evitando duplicar ventas y el límite de 2100 parámetros. Se comprobó compatibilidad 160 en la base actual (OPENJSON necesita 130 o superior).

Los filtros de zona, categoría, versión y alcance autorizado continúan aplicándose en SQL. El detalle de cliente conserva su contexto independiente. Una lista vacía devuelve cero clientes; ausencia de restricción no equivale a lista vacía. Los RUC se conservan sin normalizar. Los diagnósticos que llaman al repositorio directamente resuelven la misma regla desde el catálogo si no reciben la población.

La caché de ventas sigue aislada por filtros, versión y revisión. No se crearon tablas, vistas ni procedimientos nuevos. Las pruebas cubren CADENAS, Marketing, varios vendedores, combinación vendedor/supervisor incompatible, lista vacía y claves con espacios no separables. Las verificaciones SQL V2 conservaron los totales y conteos anteriores para CADENAS y SUPERVISOR MKT.

## Caché por puerto (M4)

ReportService recibe ReportCaches desde application/ports/report-cache.ts. No importa adaptadores. composition/report-service.ts selecciona ResultCache y configura los mismos TTL y límites: reportes 32 MiB, ventas 48 MiB, compras 16 MiB, catálogos 128 MiB, entregas 24 horas y metadatos 15 segundos. La deduplicación de peticiones simultáneas, invalidación por revisión y caducidad de versiones históricas conservan su comportamiento. Las pruebas de arquitectura ahora cubren todo domain y application.

## Filtros relacionados (M5)

El endpoint filters incluye combinaciones únicas de dimensiones, tomadas del catálogo completo autorizado, sin RUC ni nombres de clientes en las relaciones. No depende del límite de 1000 clientes del catálogo visible. Se excluyen materiales sin marca o con marca COMPETIDORES, y SIN CATEGORIZACION no aparece como opción.

El navegador calcula las opciones con domain/dependent-filters.ts. Unidad, franquicia y marca se relacionan entre sí; categoría, zona cliente, supervisor y vendedor forman otro grupo relacionado. Cada selector ignora su propia selección al calcular sus alternativas. Una selección nueva prevalece y se limpian las otras selecciones incompatibles del mismo grupo antes de consultar la matriz. El cambio de versión limpia el contexto; la búsqueda textual continúa siendo local.

No se cruzan ambos grupos por compras realizadas: una marca sin ventas en un cliente sigue siendo una oportunidad. Esta decisión evita ocultar productos potenciales y no añade lecturas de la tabla de ventas para resolver opciones. Las opciones se recalculan localmente sin solicitudes HTTP; la matriz conserva su debounce de 250 ms y la caché existente. La comprobación del acceso sigue en el servidor.

Validación M4/M5: 45 pruebas, incluyendo catálogos de más de 1000 clientes, restricción por zona autorizada, varios vendedores, CADENAS, Marketing, combinaciones vacías, cambios incompatibles y reutilización de caché.

## Operación de entregas (M7)

La guía ejecutable de carga, conciliación, publicación y corrección está en `../GUIA_CARGA_TRIMESTRAL.md`. Es documentación operativa; la aplicación no ejecuta cargas ni publica versiones por HTTP.
