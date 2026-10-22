/* Ejecutar en el servidor 181 después de cargar clientes V2 (010).
   Actualiza únicamente zona_cliente para V2 cuando contiene el código solo.
   Conserva zonabase, V1, distritos y valores que no estén en este catálogo.
   Reejecutar no vuelve a modificar los nombres completos.
*/
USE [DTM_PEDIDOS_SUGERIDOS];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_WARNINGS ON;

DECLARE @Version varchar(20) = 'V2';
DECLARE @Actualizados bigint;
DECLARE @Zonas TABLE (
    codigo nvarchar(4) COLLATE DATABASE_DEFAULT NOT NULL PRIMARY KEY,
    nombre nvarchar(200) COLLATE DATABASE_DEFAULT NOT NULL
);

INSERT INTO @Zonas (codigo, nombre) VALUES
    (N'A021', N'A021 - Piura - Tumbes'),
    (N'A022', N'A022 - Chiclayo 1 (Jaén)'),
    (N'A023', N'A023 - Chiclayo 2 (Costa)'),
    (N'A024', N'A024 - Cajamarca'),
    (N'A025', N'A025 - Trujillo 1 (Costa)'),
    (N'A026', N'A026 - Trujillo 2 (Sierra)'),
    (N'A027', N'A027 - Norte Chico - Huaraz'),
    (N'A028', N'A028 - Sur Chico (Ica - Cañete)'),
    (N'A029', N'A029 - Arequipa 1 (Costa)'),
    (N'A030', N'A030 - Arequipa 2 (Camaná)'),
    (N'A031', N'A031 - Arequipa 3 (Majes)'),
    (N'A032', N'A032 - Arequipa 4 (Aplao)'),
    (N'A033', N'A033 - Tacna - Moquegua'),
    (N'A034', N'A034 - Cusco 1 (Apurímac)'),
    (N'A035', N'A035 - Cusco 2 (Valle / Ciudad)'),
    (N'A036', N'A036 - Cusco 3 (Madre de Dios)'),
    (N'A037', N'A037 - Puno - Juliaca'),
    (N'A038', N'A038 - Ayacucho'),
    (N'A039', N'A039 - Huancayo - Centro'),
    (N'A040', N'A040 - Pasco - Junín'),
    (N'A041', N'A041 - Huánuco - Tingo María'),
    (N'A042', N'A042 - San Martín - Yurimaguas'),
    (N'A043', N'A043 - Iquitos'),
    (N'A044', N'A044 - Pucallpa'),
    (N'Ax01', N'Ax01 - Lima Norte 1'),
    (N'Ax02', N'Ax02 - Lima Norte 2'),
    (N'Ax03', N'Ax03 - Lima Norte 3 (SMP - Rímac)'),
    (N'Ax04', N'Ax04 - Callao - Lima Oeste'),
    (N'Ax05', N'Ax05 - Lima Este (SJL)'),
    (N'Ax06', N'Ax06 - Lima Centro (Capón)'),
    (N'Ax07', N'Ax07 - Lima Este (Ate - Chosica)'),
    (N'Ax08', N'Ax08 - Lima Centro - Este'),
    (N'Ax09', N'Ax09 - Lima Moderna / Top - Sur'),
    (N'Ax10', N'Ax10 - Lima Sur - Playas');

IF DB_NAME() <> N'DTM_PEDIDOS_SUGERIDOS'
    THROW 50001, N'Base destino incorrecta.', 1;

IF NOT EXISTS (SELECT 1 FROM ods.DIM_CLIENTE WHERE version = @Version)
    THROW 50002, N'Primero debe cargar los clientes V2.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE c
    SET zona_cliente = z.nombre
    FROM ods.DIM_CLIENTE AS c
    INNER JOIN @Zonas AS z
        ON UPPER(LTRIM(RTRIM(c.zona_cliente))) = UPPER(z.codigo)
    WHERE c.version = @Version;

    SET @Actualizados = @@ROWCOUNT;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT @Version AS version, @Actualizados AS clientes_actualizados;

SELECT c.zona_cliente, COUNT_BIG(*) AS clientes
FROM ods.DIM_CLIENTE AS c
INNER JOIN @Zonas AS z ON c.zona_cliente = z.nombre
WHERE c.version = @Version
GROUP BY c.zona_cliente
ORDER BY c.zona_cliente;
