/* La base DTM_PEDIDOS_SUGERIDOS ya fue creada por el usuario.
   Ejecutar en SSMS conectado al servidor 181. */
USE [DTM_PEDIDOS_SUGERIDOS];
GO
IF DB_NAME() <> N'DTM_PEDIDOS_SUGERIDOS'
    THROW 50001, N'Base incorrecta: seleccione DTM_PEDIDOS_SUGERIDOS.', 1;
IF SCHEMA_ID(N'ods') IS NULL
    EXEC(N'CREATE SCHEMA [ods] AUTHORIZATION [dbo];');
GO
