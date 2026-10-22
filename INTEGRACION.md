# Contrato de integración

La aplicación funciona de manera independiente. No contiene autenticación ni llamadas al portal. Integrar la identidad y autorización en app/api/[...path]/route.ts; pasar las zonas autorizadas obtenidas de la sesión verificada como segundo argumento de parseQuery. Nunca aceptar allowedZones desde el cuerpo HTTP. Si el rol autoriza toda la organización, omitir esa restricción.

El frontend no necesita recibir tokens por URL. El integrador puede usar su cookie de sesión de servidor o proxy autenticado. Revisar basePath en next.config.mjs y NEXT_PUBLIC_BASE_PATH en el build. Los orígenes de solicitudes POST deben coincidir con el origen de la aplicación (configurar el proxy de forma coherente).

El esquema y columnas de DIM_VENDEDORES se verificaron en SQL: version, zonabase, nombreFFVV, nombreSSVV. No es la tabla ods.VENDEDORES de una propuesta previa.
