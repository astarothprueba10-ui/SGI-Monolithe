CREATE DATABASE monolithe_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;

USE monolithe_db;

CREATE USER 'monolithe_app'@'localhost'
IDENTIFIED BY 'sql123mc!';

GRANT ALL PRIVILEGES
ON monolithe_db.*
TO 'monolithe_app'@'localhost';

FLUSH PRIVILEGES;

SHOW GRANTS FOR 'monolithe_app'@'localhost';