# Actualización aplicada — 22 de octubre de 2026

Se ejecutó actualizar.sql en MET_PROD con transacción y comprobaciones del estado anterior. SQL confirmó 47 filas actualizadas. Una lectura posterior independiente comprobó los 47 valores esperados y que las demás cuentas conservan los campos inspeccionados.

- 42 cuentas: REPRESENTANTE, representante_name y supervisor_name exactos de DIM_VENDEDORES.
- 5 cuentas: SUPERVISOR, supervisor_name exacto y representante_name NULL.
- V1 y V2 tenían las mismas asignaciones durante la conciliación.
- 41 representantes coinciden por las mismas palabras, admitiendo orden, espacios y acentos; el usuario 279 tiene nombre abreviado, sin DE RAMIREZ. Los supervisores 309–313 tienen nombres abreviados. En los seis casos se encontró una sola cuenta candidata en el conjunto leído y correspondencia única con la dimensión. Esta conciliación nominal no es validación externa de identidad.
- Las 47 cuentas ya tenían acceso activo exclusivamente a SUGERIDO. No se modificó USUARIOS_SISTEMAS.
- Pendientes: RRMM 0027 y RRMM 0028, sin cuenta identificable; no se crearon usuarios.

respaldo.json conserva únicamente identidad y campos de asignación anteriores/nuevos; no contiene credenciales. revertir.sql restaura los tres campos anteriores solo si siguen coincidiendo con lo aplicado. No ejecutar como parte de una carga ordinaria.

Esta modificación prepara PORTAL.USUARIOS como fuente de roles y asignaciones. La validación SSO y las restricciones de datos en las API de Pedidos Sugeridos aún están pendientes; modificar la tabla no activa por sí solo esos controles.

La propuesta anterior de tablas adicionales en PROPUESTA_ACCESO_ECOSISTEMA.md queda reemplazada por la decisión del usuario de reutilizar PORTAL.USUARIOS y PORTAL.USUARIOS_SISTEMAS.
