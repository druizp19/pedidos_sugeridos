# Propuesta de acceso por usuario a Pedidos Sugeridos

> Documento histórico. La decisión posterior fue reutilizar PORTAL.USUARIOS y PORTAL.USUARIOS_SISTEMAS sin nuevas tablas. La implementación local y las reglas vigentes están en INTEGRACION.md; las alternativas de esta propuesta no describen el estado actual.

Investigación: 22 de octubre de 2026. Se revisaron ambos proyectos locales y se ejecutaron únicamente consultas SELECT en DTM_PEDIDOS_SUGERIDOS y MET_PROD. No se implementó autenticación, no se actualizaron usuarios y no se desplegó nada. Este documento describe trabajo pendiente.

## 1. Resultado esperado

- El usuario inicia sesión en Ecosistema y abre Pedidos Sugeridos sin volver a ingresar credenciales.
- REPRESENTANTE: únicamente sus zonas comerciales y sus clientes.
- SUPERVISOR: únicamente sus representantes y la unión de sus zonas comerciales.
- Sin asignación, usuario inactivo o sin acceso a SUGERIDO: acceso denegado.
- ADMINISTRADOR: acceso completo solo mediante autorización explícita para este sistema. No convertir automáticamente cualquier rol desconocido en acceso completo.
- Las mismas restricciones cubren filtros, búsquedas, matriz, detalle, indicadores y Excel.

## 2. Hallazgos comprobados

### Datos

`ods.DIM_VENDEDORES` tiene `version`, `zonabase`, `nombreFFVV` y `nombreSSVV`. Tanto V1 como V2 tienen 44 filas, 44 representantes, 34 zonas distintas y 5 supervisores. Diez zonas AX01–AX10 tienen dos representantes cada una.

`MET_PROD.PORTAL.USUARIOS` tiene `id_usuario`, `nombre`, `rol`, `estado`, `supervisor_name` y `representante_name`, además de los campos de autenticación. No se consultaron valores de contraseñas ni hashes.

El conjunto de usuarios activos tiene 6 administradores, 237 representantes, 15 supervisores y 60 usuarios con rol USUARIO. Estos últimos no tienen supervisor ni representante. Por eso no corresponde corregir indiscriminadamente todas las cuentas: buena parte de las otras cuentas ya tiene asignaciones para otros módulos.

SUGERIDO existe en `PORTAL.SISTEMAS` como `id_sistema=2`, activo. Tiene 60 asignaciones activas en `PORTAL.USUARIOS_SISTEMAS`: 4 ADMINISTRADOR, 1 SUPERVISOR y 55 USUARIO. El supervisor actualmente habilitado es el usuario 10; su nombre no coincide con los cinco supervisores de DIM_VENDEDORES. Su alcance debe definirse expresamente.

El cruce por nombre o representante, recortando espacios extremos y usando la collation de la base, encuentra 24 de las 44 filas V2. Las 24 cuentas tienen rol USUARIO y ambas asignaciones vacías. Otras 18 filas tienen candidatos reconocibles entre las cuentas habilitadas, principalmente por distinto orden de nombres y apellidos. No son identidades verificadas automáticamente. Dos filas usan nombres provisionales: RRMM 0027 y RRMM 0028.

Ejemplos de correspondencia pendiente:

- Usuario 267: CESAR GONZALO GAVIÑO LAVALLE; DIM: GAVIÑO LAVALLE CESAR GONZALO; AX01.
- Usuario 279: YOHANA YOJANA GARCIA ALVAREZ; DIM: GARCIA ALVAREZ DE RAMIREZ YOHANA YOJANA; AX07. Requiere validación adicional, no solo reordenamiento.
- Usuario 304: MOTA VALDEZ MANUEL RAMON; coincidencia directa; A038.

Los supervisores tienen estos candidatos; confirmar identidad antes de cargar permisos:

| ID candidato | Nombre portal | Nombre DIM_VENDEDORES | Filas de representantes | Zonas |
|---|---|---|---:|---:|
| 309 | JAZMIN GUTIERREZ | GUTIERREZ REATEGUI BERA JAZMIN | 14 | 9 |
| 310 | LILIBETH PEREZ | PEREZ PIZARRO LILIBETH JESUS | 12 | 7 |
| 311 | DANIEL MUÑOZ | MUÑOZ BALTA ALEJANDRO DANIEL | 6 | 6 |
| 312 | ITALO MEDINA | MEDINA LIZARRAGA JESUS ITALO | 9 | 9 |
| 313 | CLARA VASQUEZ | VASQUEZ PEÑA CLARA DEL CARMEN | 3 | 3 |

Todos estos candidatos están como USUARIO y tienen acceso al sistema, pero no asignaciones. Las tres filas de Clara incluyen los dos nombres provisionales; no equivalen a tres personas confirmadas.

### Zona base frente a zona comercial

El nombre del campo puede inducir a error:

- `DIM_VENDEDORES.zonabase` contiene la zona comercial, por ejemplo `A021 - PIURA - TUMBES`.
- El código actual relaciona vendedores con `DIM_CLIENTE.zona_cliente`.
- El punto de extensión de seguridad `allowedZones` compara con `DIM_CLIENTE.zonabase`.

En V2 hay 91 clientes con zona comercial A021. También hay clientes con zonabase A021 y zona_cliente PIURA, TUMBES, AREQUIPA y otras etiquetas, clasificados en la interfaz como Marketing. Por ello reutilizar allowedZones sin adaptar la regla puede incluir clientes adicionales.

La propuesta es autorizar por zona comercial normalizada de zona_cliente, en coherencia con la asignación de vendedores de la aplicación. Si el negocio pretende incluir todo el territorio base, se debe elegir explícitamente esa otra política antes de implementar.

Las 32 zonas comerciales con clientes coinciden con su zonabase para esos clientes. A043 y A044 no tienen clientes por zona comercial en la consulta V2; esto no demuestra ausencia de ventas o clientes en otras clasificaciones.

### Código actual

- Pedidos Sugeridos: Next.js, basePath `/sugerido`, servidor local puerto 3010. API sin autenticación en `frontend/app/api/[...path]/route.ts`.
- `parseQuery` acepta allowedZones únicamente como segundo argumento interno, pero la ruta actual llama `parseQuery(b)` sin ese argumento.
- El dominio y SQL ya tienen restricciones parciales y el servicio valida los clientes seleccionados contra el alcance. Es una base para ampliar, no una integración terminada.
- Ecosistema autentica con PORTAL.USUARIOS y valida acceso al sistema antes de generar el lanzamiento.
- `backend/src/core/application/use-cases/sistemas/generate-sistema-launch-url.use-case.ts` genera para SUGERIDO un JWT con id_usuario, nombre, email y rol. No envía supervisor ni representante.
- Ese token utiliza la clave configurada para MET y la duración configurada para SSO, con valor predeterminado de 12 horas. No se especifican audiencia ni emisor en esa rama.
- `frontend/components/ecosistema-portal.tsx` guarda el token en localStorage y navega con sso_token y sso_user en el fragmento de URL.
- El nuevo Pedidos Sugeridos no consume ese flujo. Poder abrir la URL actualmente no demuestra autorización.

## 3. Modelo de permisos propuesto

Conservar `id_usuario` como identidad estable. Los nombres sirven para conciliar la carga inicial y presentar etiquetas, no para decidir permisos en cada solicitud.

Propuesta de tablas en MET_PROD.PORTAL, a diseñar como migraciones futuras:

| Tabla propuesta | Campos principales | Propósito |
|---|---|---|
| USUARIO_ROL_SISTEMA | id_usuario, id_sistema, rol, activo | Rol específico de SUGERIDO |
| SUGERIDO_REPRESENTANTE_ZONA | id_usuario_representante, zona_codigo, vigencia_desde, vigencia_hasta, activo | Asignaciones explícitas de zonas |
| SUGERIDO_SUPERVISOR_REPRESENTANTE | id_usuario_supervisor, id_usuario_representante, vigencia_desde, vigencia_hasta, activo | Equipo de cada supervisor |

Agregar claves foráneas, restricciones de rol, unicidad de asignaciones vigentes y auditoría de quién cambió cada asignación. Soportar varias zonas por representante y dos representantes en una misma zona; no imponer unicidad global de zona.

La dimensión versionada seguirá siendo fuente comercial para proponer y conciliar asignaciones. Los permisos vigentes serán explícitos: publicar una nueva entrega de ventas no debe conceder acceso automáticamente. Mantener un catálogo canónico de códigos y bloquear asignaciones con códigos inexistentes o ambiguos.

La alternativa mínima sería completar rol, representante_name y supervisor_name en USUARIOS. Es más corta, pero esos campos son globales y MET ya los consume. Recomiendo roles por sistema y relaciones por ID. Si se decide completar también los campos globales, preparar un listado por id_usuario con valores anteriores/nuevos y comprobar el efecto en MET antes de ejecutarlo.

No establecer asignaciones basadas en búsqueda aproximada durante el login. Las 18 coincidencias alternativas y los cinco supervisores deben conciliarse previamente con una lista revisable. Los dos RRMM quedan sin acceso personal hasta conocer sus titulares.

## 4. Login único y sesión

Flujo recomendado:

1. El usuario inicia sesión en Ecosistema como ahora.
2. Al abrir SUGERIDO, Ecosistema verifica usuario activo y permiso activo en USUARIOS_SISTEMAS.
3. Ecosistema emite un código aleatorio de lanzamiento, de un solo uso, con vencimiento corto —por ejemplo 60 segundos—, ligado a usuario, sistema y destino autorizado. Se almacena su hash en el servidor.
4. El navegador llega al callback de Pedidos Sugeridos. Su backend canjea el código con Ecosistema mediante un canal autenticado entre servidores. El canje consume el código atómicamente y valida su destinatario, caducidad y usuario.
5. Pedidos crea una sesión propia con cookie HttpOnly, Secure en HTTPS y SameSite adecuado al dominio final; limpia la URL y abre el reporte. La identidad y los permisos nunca se toman de sso_user o localStorage.
6. En cada API se comprueba sesión, usuario activo, permiso SUGERIDO y alcance vigente antes de consultar o recuperar resultados de caché.

El cambio de lanzamiento debe afectar solo a SUGERIDO, preservando las integraciones existentes de MET y FarmaGo. Si se opta por mantener JWT como transición, usar audiencia SUGERIDO, emisor esperado, algoritmo permitido, clave dedicada o firma asimétrica, expiración corta y canje único; no aceptar simplemente el token actual de 12 horas como sesión territorial.

Un endpoint interno de contexto en Ecosistema puede devolver identidad, rol específico, representantes y zonas autorizadas. Debe autenticarse como servicio y no admitir que el navegador elija arbitrariamente un id_usuario. Como alternativa, Pedidos puede consultar las tablas de permisos con una conexión de solo lectura. El cruce entre bases funcionó con la conexión de investigación, pero faltan verificar los permisos de la cuenta real de la aplicación y la conectividad del despliegue.

Para la primera implementación, resolver vigencia en cada petición. Si después se cachean permisos, definir invalidación y un plazo máximo de revocación; no reutilizar el TTL de datos de 24 horas. Implementar cierre de sesión y revocación compartida. El heartbeat existente sirve para actividad, no para demostrar autorización.

## 5. Aplicación del alcance

Crear un AccessContext de servidor con userId, rolSistema, representanteIds, zonasComerciales y revisionPermisos. Distinguir explícitamente acceso completo de alcance vacío. Un rol no reconocido o cero asignaciones nunca debe producir allowedZones undefined, que hoy significa sin restricción.

Actualizar dominio y SQL para aplicar el mismo código comercial a todas las consultas. La normalización debe soportar A021 y AX01; la expresión actual de clientZoneKey solo reconoce una letra seguida de números y no normaliza AX01 como código. No normalizar indiscriminadamente zonas geográficas ni claves RUC.

El alcance es obligatorio; los filtros de pantalla solo pueden reducirlo. No usar supervisor/vendedor del cuerpo HTTP como autorización. La rama de detalle elimina filtros de navegación intencionalmente: debe conservar siempre la restricción de seguridad.

También restringir nombres de vendedores y supervisores en catálogos y detalles. Filtrar solo clientes por zona podría mostrar otros representantes en zonas compartidas. Para representante, mostrar su identidad autorizada; para supervisor, únicamente su equipo autorizado. Los datos de una zona compartida serán visibles por ambos representantes si la regla comercial es por zona. Si se requiere separar clientes dentro de esa misma zona, hace falta una asignación adicional representante-cliente que DIM_VENDEDORES no contiene.

El benchmark territorial debe respetar el alcance para cumplir la petición de ver únicamente lo asignado. Esto puede cambiar porcentajes y oportunidades frente al reporte global; conciliar resultados con negocio.

La caché actual de reportes incluye q y allowedZones; las compras incluyen allowedZones y las columnas. Con el nuevo contexto, añadir una clave estable del alcance y su revisión en resultados, compras y catálogos filtrados. Dos usuarios con iguales zonas pero distintos representantes visibles no necesariamente pueden compartir toda la respuesta. La autorización siempre precede a la caché.

Proteger versions, filters, search-clients, matrix, client-matrix y export-excel, así como página y nuevas rutas de sesión. Responder 401 sin sesión y 403 sin permiso. No revelar si un cliente ajeno existe. Restringir métodos HTTP; el adaptador actual también exporta DELETE. Añadir comprobación de origen y protección CSRF para canje/cierre de sesión y demás operaciones que corresponda; SameSite por sí solo no sustituye todo el control.

## 6. Archivos que cambiarían

Pedidos Sugeridos:

- `frontend/app/api/[...path]/route.ts`: validar sesión y resolver alcance antes de ejecutar casos de uso.
- Nuevos módulos de sesión, contexto de autorización y callback SSO, separados del dominio de reportes.
- `frontend/application/report-service.ts`: propagar alcance obligatorio y evitar filtraciones por detalle, columnas y caché.
- `frontend/domain/report.ts`: clave comercial consistente y visibilidad de representantes/supervisores.
- `frontend/infrastructure/database/mssql-report.repository.ts`: mismos límites en ventas, benchmark y compras.
- Capa de presentación: identidad, alcance, errores de sesión y filtros permitidos.
- Pruebas de autorización e integración, y actualización de INTEGRACION.md.

Ecosistema:

- Caso de uso de lanzamiento: código de un solo uso para SUGERIDO.
- Nuevos endpoints de canje/contexto y repositorios de permisos.
- `frontend/components/ecosistema-portal.tsx`: consumir el nuevo lanzamiento.
- Migraciones de roles por sistema, relaciones, auditoría y códigos/sesiones; configuración de destinos permitidos y autenticación entre servicios.

## 7. Secuencia y pruebas de aceptación

1. Revisar la correspondencia de 42 personas candidatas y cinco supervisores, los dos RRMM, las cuentas adicionales habilitadas y los administradores.
2. Resolver la política de zona comercial, zonas compartidas e histórico. Propuesta inicial: asignación vigente aplicada a versiones autorizadas; no recuperar permisos antiguos solo por seleccionar V1. Reasignaciones históricas requieren política explícita.
3. Preparar migraciones idempotentes, vista previa de cambios y reversión; cargar primero en un entorno de prueba.
4. Implementar SSO y contexto; después cubrir todas las consultas, catálogos, benchmark, cachés y Excel.
5. Probar representante A038 y supervisor candidato 309; el segundo debería tener únicamente su equipo de 14 filas y 9 zonas, tras confirmar identidades.
6. Probar manipulación de zona, vendedor, supervisor, RUC, selectedClients, client y version; API directa sin login; token/código inválido, vencido o reutilizado; sesión revocada; cuenta desactivada y permiso retirado.
7. Probar caché entre usuarios, cambios de asignación, cambio de versión, dos representantes en una zona, cero asignaciones y fallo del servicio de permisos. Ante fallo, no ampliar acceso.
8. Conciliar totales y exportación con consultas SQL limitadas al mismo alcance. Ejecutar pruebas del proyecto, TypeScript, build y pruebas reales del flujo entre ambos proyectos.
9. Preparar por separado la publicación: dominio/HTTPS, proxy de /sugerido y /sugerido/api, cookies, configuración, usuarios piloto y reversión. La revisión actual no verificó el proxy ni servidores en producción.

## 8. Referencias

La propuesta aplica denegación predeterminada y comprobación de permisos en cada petición, según [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), y sesiones de servidor con cookies protegidas según [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
