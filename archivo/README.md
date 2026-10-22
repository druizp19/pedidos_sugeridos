# Respaldo de la limpieza del 20/10/2026

legacy-2026-10-20.zip conserva 29 archivos retirados del proyecto activo: el sistema Python anterior y su public, requirements.txt, seis componentes React reemplazados, dos logos antiguos, capturas y documentos históricos. El manifiesto JSON contiene las rutas originales y los SHA-256. Se verificaron todos los archivos comprimidos antes de retirar sus originales. No se incluyeron archivos de entorno.

Para recuperar una referencia, extraer el ZIP a una carpeta aparte y copiar solo el archivo necesario. No extraer encima del proyecto activo. Los scripts SQL, diagnósticos actuales, componentes UI y logos vigentes se conservaron.

Se comprobó el grafo de imports, exports e imports dinámicos y las referencias textuales. El CSS antes y después de retirar los seis componentes mantuvo las propiedades de todos los selectores restantes: 717 selectores antes y 572 después.

También se retiraron las dependencias directas Radix dropdown-menu, tabs y tooltip sin importaciones activas, junto con el método sin consumidores salesWithDistributor. El archivo package-lock.json fue actualizado por npm.
