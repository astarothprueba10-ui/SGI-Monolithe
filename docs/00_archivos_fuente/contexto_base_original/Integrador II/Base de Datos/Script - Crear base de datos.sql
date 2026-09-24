drop database monolithe;
CREATE DATABASE MONOLITHE
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;

USE MONOLITHE;

CREATE USER 'monolithe_app'@'localhost'
IDENTIFIED BY 'sql123mc!';

GRANT ALL PRIVILEGES
ON MONOLITHE.*
TO 'monolithe_app'@'localhost';

FLUSH PRIVILEGES;

SHOW GRANTS FOR 'monolithe_app'@'localhost';