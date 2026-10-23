# Integración con Ecosistema y permisos comerciales

Implementada localmente el 22 de octubre de 2026. No desplegada en producción.

## Fuente de identidad

Se reutilizan MET_PROD.PORTAL.USUARIOS y PORTAL.USUARIOS_SISTEMAS. No se crearon tablas. La actualización previa concilió 42 representantes y 5 supervisores; respaldo en database/auditoria-accesos-2026-10-22.

- REPRESENTANTE: representante_name coincide con DIM_VENDEDORES.nombreFFVV y supervisor_name con nombreSSVV.
- SUPERVISOR: supervisor_name coincide con nombreSSVV; accede a la unión de zonas y representantes del equipo.
- ADMINISTRADOR: acceso global solo con cuenta activa y permiso activo SUGERIDO.
- USUARIO, roles desconocidos, asignación vacía, cuenta inactiva o permiso retirado: se deniega la consulta.

RRMM 0027 y RRMM 0028 siguen sin cuenta identificable. No se emparejan nombres aproximadamente durante el acceso.

## Flujo de sesión

1. Ecosistema valida su login y el acceso a SUGERIDO.
2. Genera un código aleatorio de un solo uso y 60 segundos, dirigido exclusivamente a la URL configurada.
3. Pedidos lee sso_code del fragmento, limpia la URL y canjea el código desde su servidor.
4. Ecosistema vuelve a leer usuario y permisos y emite una sesión opaca de 8 horas. Pedidos guarda su identificador en cookie HttpOnly, SameSite=Lax, Secure en HTTPS y limitada al basePath.
5. Antes de cada API, Pedidos valida la sesión en Ecosistema y obtiene las asignaciones comerciales actuales de SQL. El navegador no elige identidad, rol o alcance.
6. Cerrar sesión en Pedidos revoca esa sesión. El botón Cerrar sesión del portal revoca todos los códigos y sesiones de Pedidos del usuario antes de borrar su sesión local. La pantalla revalida al recuperar el foco y desmonta el reporte al recibir 401/403.

MET y FarmaGo conservan su lanzamiento anterior. SUGERIDO ya no usa tokens de localStorage ni sso_user.

## Reglas territoriales

Se usa el código comercial de DIM_CLIENTE.zona_cliente, incluidos A021 y AX01. No se autoriza por zonabase: esa columna también puede agrupar clientes de Marketing ajenos a la asignación.

Las asignaciones provienen de la versión numérica más reciente en ods.REPORTE_VERSION que tenga DIM_VENDEDORES. Las zonas vigentes se aplican también al consultar entregas históricas. Antes de publicar una nueva entrega, conciliar vendedores y nombres canónicos del portal.

Dos representantes de la misma zona comparten sus clientes. Cada representante ve solo su nombre en los metadatos; el supervisor ve solo su equipo. Separar carteras dentro de la misma zona requeriría una relación comercial adicional.

Filtros, búsquedas, matriz, detalle, indicadores, benchmark y Excel respetan el alcance. Los filtros del navegador solo pueden reducirlo. Pedir detalle de un cliente ajeno no revela si existe; clientes ajenos en selectedClients se excluyen de las columnas.

La caché de reportes incluye zonas y asignaciones. Los catálogos compartidos permanecen en el servidor y se filtran en copias antes de responder. Se valida el acceso antes de usar la caché: los permisos no heredan el TTL de datos de 24 horas. Las correcciones de maestros siguen requiriendo publicar su revisión según GUIA_CARGA_TRIMESTRAL.md.

## Configuración local

Pedidos/frontend/.env.local:

```
PEDIDOS_PUBLIC_URL=http://127.0.0.1:3010/sugerido
ECOSISTEMA_PUBLIC_URL=http://localhost:3000
ECOSISTEMA_INTERNAL_URL=http://127.0.0.1:4000/api
SUGERIDO_SERVICE_SECRET=<secreto aleatorio compartido>
```

ECOSISTEMA/backend/.env:

```
SUGERIDO_PUBLIC_URL=http://127.0.0.1:3010/sugerido
SUGERIDO_LOCAL_URL=http://127.0.0.1:3010/sugerido
SUGERIDO_SERVICE_SECRET=<el mismo secreto>
```

Se configuraron ambos archivos locales excluidos de Git con un secreto aleatorio. No copiarlo a código, documentación, URL ni variables NEXT_PUBLIC. Reiniciar los procesos para cargar la configuración; abrir Pedidos desde el portal. No se reiniciaron los servicios existentes.

Usar exactamente el host configurado: localhost y 127.0.0.1 son distintos orígenes. En producción reemplazar URLs por HTTPS y retirar overrides locales. ECOSISTEMA_INTERNAL_URL permite HTTP solo en loopback; entre equipos exige HTTPS. El proxy debe publicar /sugerido y sus API, conservar cookies y no cachear respuestas autenticadas. Los POST requieren Origin público exacto.

Rutas de sesión: POST /sugerido/api/auth/exchange, GET /sugerido/api/auth/session, POST /sugerido/api/auth/logout. Datos: GET versions, filters y search-clients; POST matrix, client-matrix y export-excel. Otros métodos se rechazan.

## Restricción operativa

Los códigos y sesiones se guardan en memoria del backend de Ecosistema, por hash, con límite de 2000 entradas de cada tipo. Reiniciar cierra las sesiones. Esta versión requiere UN proceso de Ecosistema. Antes de habilitar varias réplicas o PM2 cluster, sustituir los mapas por un almacén compartido con canje atómico, expiración y revocación.

Si Ecosistema o SQL fallan, no se amplía el acceso. No existe bypass de desarrollo. Una consulta en curso antes de revocar puede finalizar; las siguientes vuelven a validar. Las sesiones del portal y otros módulos conservan sus políticas existentes.

## Validación

- Pedidos: 48 pruebas, incluyendo aislamiento entre usuarios, manipulación de rol/zonas, clientes ajenos, métodos, cookies y origen.
- Backend Ecosistema: 7 pruebas; código de un solo uso, caducidad, revocación, cuenta inactiva y cambios de asignación.
- Compilación de Pedidos y de ambos componentes de Ecosistema; dependencias del módulo Nest verificadas.
- verify-access-sql.ts: lectura real de las 47 asignaciones; conciliación independiente de totales y clientes. Usuario 304/A038: 68; usuario 267/AX01: 141; supervisor 309: 1380 clientes en 9 zonas.
- verify-sso-integration.ts: caso de uso real de lanzamiento, servicio SSO, repositorios SQL y handlers Next. Verifica canje, repetición rechazada, detalle y Excel ajenos, lectura del Excel generado y revocación. Usa transporte en proceso y omite registrar actividad para no escribir en producción.

La prueba en proceso no sustituye la validación del navegador y proxy de publicación. La revisión automática bloqueó el comando para iniciar un servidor adicional de pruebas; se usó el transporte en proceso. No se desplegaron cambios.

Desde frontend de Pedidos:

```
npm test
npm run lint
npm run build
node --import tsx scripts/verify-access-sql.ts
node --import tsx scripts/verify-sso-integration.ts "<ruta absoluta a ECOSISTEMA/backend>"
```

El último comando requiere compilar previamente el backend. Los dos scripts de integración consultan SQL real; no ejecutarlos como pruebas unitarias sin acceso al entorno.
