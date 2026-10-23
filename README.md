# Pedidos Sugeridos

Aplicación independiente en Next.js, con arquitectura por dominio, casos de uso y repositorios SQL. El proyecto original LUIS RENGIFO y oportunidad-venta-hexagonal se conservan como referencias.

## Ejecutar

Desde `Pedidos Sugeridos/frontend`:

```powershell
npm ci
npm run dev
```

Abrir http://127.0.0.1:3010/sugerido. No hace falta ejecutar Python. `npm run build` compila producción; `npm start` sirve la compilación local en el mismo puerto. Node.js 20.9 o superior.

La conexión usa `frontend/.env.local` (excluido de Git). Hay un ejemplo en `frontend/.env.example`. El entorno local ya apunta a DTM_PEDIDOS_SUGERIDOS utilizando las credenciales locales existentes, que no se incluyen en este documento.

## Alcance funcional

- Matriz por marca y SKU, ordenación, búsqueda, expandir/colapsar y totales.
- Métricas unidades y soles; filtros de unidad de negocio, franquicia, marca, categoría, zona, supervisor y vendedor.
- Selección de hasta 100 columnas de clientes (8 por defecto), búsqueda de clientes y flags de compra/quintil.
- Detalle recalculado por cliente, vendedores de la zona, benchmark territorial y compras por distribuidor.
- Exportación Excel de matriz y detalle, con métricas numéricas, porcentajes y columnas de clientes/distribuidores.
- El selector muestra únicamente versiones con resumen generado y maestros de materiales/clientes. Al abrir el reporte hace una consulta de descubrimiento a SQL y selecciona la versión de mayor número (V10 es posterior a V9). Ante un error se conserva Reintentar. Para detectar una nueva entrega, volver a abrir o recargar la página. No hay consultas periódicas ni consultas al cambiar de pestaña. La disponibilidad se obtiene de ods.FACT_VENTAS_AGREGADA; ods.REPORTE_VERSION aporta etiquetas y divisores. V1/V2 mantienen sus períodos conocidos como compatibilidad.
- Diseño inspirado en oportunidad-venta-hexagonal: identidad corporativa, encabezado, tarjetas, filtros y tema claro/oscuro.

La búsqueda limita filas visibles sin recalcular los totales. La selección de columnas de clientes no cambia la población de la matriz; categoría, zona, supervisor y vendedor sí lo hacen. El detalle de un cliente conserva filtros de materiales y recalcula su propio contexto.

## Datos y reglas

Se leen las tablas ods.DIM_CLIENTE, ods.DIM_MATERIAL, ods.DIM_VENDEDORES, ods.FACT_VENTAS_AGREGADA y, si existe, ods.REPORTE_VERSION. La aplicación no escribe en SQL ni ejecuta el procedimiento de carga. No consulta Linked Servers ni FACT_VENTAS mensual durante la navegación.

Para publicar nuevas versiones, ejecutar una vez la revisión actual de database/006_procedimiento_resumen.sql en el 181: crea ods.REPORTE_VERSION y actualiza el procedimiento sin cargar ventas. Luego generar el resumen con la versión y los dos períodos completos (database/007_generar_resumen.sql contiene V2 enero-agosto 2026 frente a enero-agosto 2025). Los períodos y la revisión generado_en se guardan en la misma transacción que el resumen; V3 y siguientes no requieren cambios de código. El catálogo de versiones se conserva durante 15 segundos y lee las publicaciones con comprobaciones EXISTS sobre el resumen y los maestros; evita SELECT DISTINCT sobre toda la tabla de ventas. Una carga de tablas base no publica por sí sola una versión. Para corregir maestros ya publicados, ejecutar database/016_publicar_correccion_cache.sql después de finalizar la corrección. La secuencia operativa completa está en GUIA_CARGA_TRIMESTRAL.md y el comportamiento de caché en frontend/ENTREGAS_Y_CACHE.md.

Las consultas usan parámetros y versión en cada tabla. Los vendedores se consultan como catálogo y se filtran con EXISTS para evitar multiplicar ventas. Los importes se agregan antes de viajar al navegador. Los mercados compartidos se cuentan una sola vez en el total; los porcentajes se calculan desde las sumas, no promediando porcentajes. Las compras por distribuidor no se suman nuevamente al mercado.

El benchmark usa lima_provincias de la población seleccionada y clientes de categorías DIAMANTE/ORO/PLATA/BRONCE/PLOMO, como la referencia. Se conserva el RUC exactamente como está almacenado: se encontraron tres pares que difieren por espacios no separables; no se normalizaron ni modificaron datos de SQL.

La nueva carga puede diferir del legado; no se afirma equivalencia de importes entre VW_FR y DTM_PEDIDOS_SUGERIDOS sin conciliación funcional. En particular se añadieron productos y se reconstruyeron ventas desde la fuente.

## Frontend refactorizado

El frontend usa puertos y adaptadores propios: `application/report-queries.ts`, `application/ports/report-gateway.ts`, `infrastructure/http`, `infrastructure/browser` y `composition/report-app.tsx`. Las pantallas, componentes y hooks están en `presentation`; los componentes compartidos de shadcn/ui permanecen en `components/ui`.

La guía `frontend/ARQUITECTURA.md` explica las responsabilidades, las dependencias y cómo extender el módulo. Se conservan las consultas y fórmulas del backend. La interfaz incluye indicadores con estados de carga, filtros unificados, errores visibles y tablas separadas del acceso a datos.

## Arquitectura y concurrencia

- `domain/report.ts`: fórmulas y composición del reporte, sin acceso SQL.
- `application/ports/report-repository.ts`: contrato del repositorio.
- `application/report-service.ts`: validación, selección de versión y casos de uso.
- `infrastructure/database`: implementación SQL Server y pool reutilizable.
- `infrastructure/runtime`: cola FIFO acotada y caché TTL/LRU con deduplicación de solicitudes idénticas.
- `infrastructure/export`: Excel.
- `app/api/[...path]/route.ts`: adaptador HTTP.
- `presentation`: pantallas, componentes y controladores React.
- `components/ui`: componentes compartidos de shadcn/ui.

Pool y cola SQL limitados a 4 operaciones concurrentes; 60 en espera, máximo 20 segundos de espera. Las consultas tienen timeout de 60 segundos. Cola llena/espera vencida responde 503 con Retry-After. Exportaciones: una en ejecución y ocho en espera. Las peticiones idénticas comparten cálculo. Cachés de entregas publicadas: 24 horas, con límites de JSON estimado de 32 MiB para reportes, 48 MiB para ventas, 16 MiB para compras y 128 MiB para catálogos. Cambiar generado_en renueva todas las claves de la entrega. Los históricos sin metadatos conservan una generación de cinco minutos. Cambiar las columnas de clientes reutiliza las ventas y consulta solamente sus compras.

Son colas y cachés en memoria por proceso, no trabajos persistentes. Un reinicio pierde la caché y peticiones en curso. Para varias réplicas se debe compartir la cola/caché o repartir explícitamente el presupuesto de conexiones; no lanzar múltiples procesos suponiendo que el límite 4 es global. Esto prepara un uso concurrente acotado, pero no certifica rendimiento de 50 usuarios sobre SQL real sin prueba de carga en el entorno final.

## Acceso desde Ecosistema

La integración local usa el login de Ecosistema y las asignaciones de PORTAL.USUARIOS. Los representantes consultan únicamente sus zonas comerciales; los supervisores, las zonas de su equipo. Todas las API comprueban sesión, cuenta activa, permiso SUGERIDO y alcance vigente antes de devolver datos o usar caché. El navegador no puede establecer roles ni permisos.

Iniciar Ecosistema y Pedidos con su configuración local y abrir la plataforma desde el portal. El acceso directo sin sesión muestra la entrada a Ecosistema. INTEGRACION.md documenta las variables, el código de un solo uso, las cookies, las reglas territoriales y las pruebas realizadas. Los cambios no están desplegados en producción. El almacén de sesiones actual requiere un solo proceso del backend de Ecosistema.

Las rutas mantienen el basePath /sugerido. El parámetro zonaBase sigue siendo el filtro comercial de DIM_CLIENTE.zona_cliente; allowedZones es exclusivamente interno y ahora aplica esa misma zona comercial. El benchmark y las exportaciones respetan el alcance del usuario.

El sistema anterior y los componentes reemplazados se conservan en archivo/legacy-2026-10-20.zip, fuera de las rutas activas. Ver archivo/README.md.

La respuesta de búsqueda de clientes es `{ items, total, limit }`: devuelve hasta 100 filas y el total real de coincidencias. `zonaBase` se conserva como nombre de parámetro por compatibilidad, pero aplica la columna `DIM_CLIENTE.zona_cliente`.

## Validación

`npm test` cubre fórmulas, mercados compartidos, divisores, distribuidores, validación y 50 solicitudes simuladas de cola/caché. `npm run lint` comprueba TypeScript. `npm run build` valida compilación de producción. Las pruebas simuladas no son una prueba de carga de SQL Server.

La pantalla principal y el detalle muestran la versión y la fecha de publicación o última corrección, en hora de Lima. La fecha proviene de generado_en; las entregas históricas sin ese dato se indican sin inventar una fecha.
