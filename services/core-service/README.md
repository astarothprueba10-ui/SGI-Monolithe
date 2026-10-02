# CoreService (Gestión Inmobiliaria - SGI Monolithe)

Módulo monorepo encargado de la gestión del núcleo inmobiliario del Sistema de Gestión Inmobiliaria (SGI Monolithe), incluyendo proyectos, etapas, zonas, manzanas, lotes, precios, planos interactivos y control de estados.

## Estructura del Módulo

```text
services/core-service/
├── src/
│   └── main/
│       ├── java/
│       │   └── monolithe/core_service/
│       │       ├── config/          # Configuración JWT y Spring Security
│       │       ├── controller/      # Endpoints REST
│       │       ├── dto/             # Objetos de entrada y salida
│       │       ├── entity/          # Entidades JPA
│       │       ├── exception/       # Manejo global de excepciones
│       │       ├── repository/      # Repositorios Spring Data JPA
│       │       ├── security/        # Handlers 401 y 403
│       │       └── service/         # Lógica de negocio
│       └── resources/
│           └── application.properties
├── Dockerfile                      # Imagen Docker del servicio
├── pom.xml                         # Dependencias Maven
└── README.md                       # Documentación técnica del servicio

## 1. Conexión con Base de Datos (Supabase PostgreSQL)

El backend se conecta directamente a la base de datos Supabase mediante PostgreSQL Session Pooler (puerto 5432) utilizando JDBC.

### Tablas utilizadas en Supabase
Estructura inmobiliaria
- inm_proyectos: Registro de los proyectos inmobiliarios gestionados por Monolithe.
- inm_etapas: Etapas físicas asociadas a cada proyecto.
- inm_zonas: Zonas comerciales o geográficas definidas dentro de un proyecto.
- inm_manzanas: Manzanas pertenecientes a las etapas inmobiliarias.
- inm_lotes: Inventario principal de lotes, incluyendo área, dimensiones, tipo, estado y ubicación dentro del proyecto.
Precios y comercialización
- inm_etapas_comerciales: Etapas comerciales utilizadas para definir condiciones de venta y precios.
- inm_tarifas_zona_etapa: Tarifas vigentes asociadas a proyectos, zonas, etapas comerciales, monedas y tipos de tarifa.
- inm_ajustes_tipo_lote: Ajustes porcentuales o de monto fijo aplicables según el tipo de lote.
- inm_lotes_precios: Historial versionado de precios calculados para los lotes.
Plano interactivo
- inm_planos_interactivos: Versiones de los planos generales o por etapa de cada proyecto.
- inm_lotes_geometrias: Coordenadas y geometrías utilizadas para representar los lotes dentro del plano interactivo.
Estados e historial
- inm_lotes_historial_estado: Registro histórico de los cambios de estado realizados sobre cada lote, incluyendo estado anterior, nuevo estado, motivo, fecha y usuario responsable.
Catálogos relacionados
- cfg_estados_proyecto: Estados disponibles para proyectos inmobiliarios.
- cfg_estados_etapa: Estados disponibles para etapas.
- cfg_estados_manzana: Estados disponibles para manzanas.
- cfg_estados_lote: Estados operativos de los lotes (DISPONIBLE, RESERVADO, VENDIDO, entre otros).
- cfg_tipos_lote: Tipos de lote configurados en el sistema.
- cfg_monedas: Monedas habilitadas para las operaciones comerciales.
- cfg_tipos_tarifa: Tipos de cálculo de tarifa (POR_M2, MONTO_FIJO).
- cfg_tipos_ajuste_precio: Tipos de ajustes aplicables al precio del lote.

Función PostgreSQL utilizada
- sp_cambiar_estado_lote: Centraliza el cambio de estado de los lotes, registra el historial y valida que las operaciones administrativas sean realizadas por usuarios autorizados.
---

## 2. API Backend (`services/cms-service`)

Todos los endpoints de negocio bajo /api/core/** están protegidos mediante JWT emitido por auth-service.
El servicio funciona como un OAuth2 Resource Server y valida los tokens mediante la clave pública RSA compartida por el servicio de autenticación.

Información contenida en el JWT
El token emitido por auth-service contiene los siguientes claims principales:
- sub: identificador del usuario.
- username: nombre de usuario.
- authorities: roles asignados al usuario.
- password_change_required: indica si el usuario debe cambiar su contraseña antes de acceder al sistema.

Seguridad
- Los métodos GET pueden ser utilizados por usuarios autenticados con password_change_required=false.
- Los métodos POST, PUT, PATCH y DELETE están restringidos a:
  - ROLE_ADMINISTRADOR
  - ROLE_GERENCIA
- Los usuarios con password_change_required=true reciben HTTP 403 Forbidden.
- Las solicitudes sin JWT válido reciben HTTP 401 Unauthorized.
- El servicio trabaja de forma stateless.
- No utiliza sesiones HTTP.
- No utiliza Basic Authentication.
- La validación del JWT utiliza firma RSA y verifica el issuer configurado.

3. Endpoints de Catálogos
Estados de proyecto
GET /api/core/catalogos/estados-proyecto

Estados de etapa
GET /api/core/catalogos/estados-etapa

Estados de manzana
GET /api/core/catalogos/estados-manzana

Estados de lote
GET /api/core/catalogos/estados-lote

Tipos de lote
GET /api/core/catalogos/tipos-lote

Monedas
GET /api/core/catalogos/monedas

Tipos de tarifa
GET /api/core/catalogos/tipos-tarifa

Tipos de ajuste de precio
GET /api/core/catalogos/tipos-ajuste-precio

4. Endpoints de Proyectos
GET    /api/core/proyectos
GET    /api/core/proyectos/activos
GET    /api/core/proyectos/{idProyecto}
POST   /api/core/proyectos
PUT    /api/core/proyectos/{idProyecto}
DELETE /api/core/proyectos/{idProyecto}

Permiten consultar, crear, actualizar y desactivar proyectos inmobiliarios.
5. Endpoints de Etapas
GET    /api/core/etapas/proyecto/{idProyecto}
GET    /api/core/etapas/proyecto/{idProyecto}/activas
GET    /api/core/etapas/{idEtapa}
POST   /api/core/etapas
PUT    /api/core/etapas/{idEtapa}
DELETE /api/core/etapas/{idEtapa}

Las etapas representan divisiones físicas de un proyecto inmobiliario.
6. Endpoints de Zonas
GET    /api/core/zonas/proyecto/{idProyecto}
GET    /api/core/zonas/proyecto/{idProyecto}/activas
GET    /api/core/zonas/{idZona}
POST   /api/core/zonas
PUT    /api/core/zonas/{idZona}
DELETE /api/core/zonas/{idZona}

Las zonas permiten organizar comercial o geográficamente los lotes dentro de un proyecto.
7. Endpoints de Manzanas
GET    /api/core/manzanas/etapa/{idEtapa}
GET    /api/core/manzanas/etapa/{idEtapa}/activas
GET    /api/core/manzanas/{idManzana}
POST   /api/core/manzanas
PUT    /api/core/manzanas/{idManzana}
DELETE /api/core/manzanas/{idManzana}

Las manzanas pertenecen a una etapa física y contienen los lotes inmobiliarios.
8. Endpoints de Lotes
GET    /api/core/lotes/manzana/{idManzana}
GET    /api/core/lotes/manzana/{idManzana}/activos
GET    /api/core/lotes/{idLote}
POST   /api/core/lotes
PUT    /api/core/lotes/{idLote}
DELETE /api/core/lotes/{idLote}

9. Búsqueda y Filtros de Lotes
GET /api/core/lotes/buscar

Permite realizar búsquedas dinámicas utilizando uno o varios filtros.
Filtros disponibles
- idProyecto
- idEtapa
- idZona
- idManzana
- idEstadoLote
- idTipoLote
- texto
- areaMin
- areaMax
- activo

10. Estados e Historial de Lotes
Cambiar estado de un lote
PATCH /api/core/lotes/{idLote}/estado
Consultar historial de estados
GET /api/core/lotes/{idLote}/historial-estados

11. Etapas Comerciales
GET    /api/core/etapas-comerciales/proyecto/{idProyecto}
GET    /api/core/etapas-comerciales/proyecto/{idProyecto}/activas
GET    /api/core/etapas-comerciales/{idEtapaComercial}
POST   /api/core/etapas-comerciales
PUT    /api/core/etapas-comerciales/{idEtapaComercial}
DELETE /api/core/etapas-comerciales/{idEtapaComercial}

Las etapas comerciales permiten separar las condiciones comerciales de las etapas físicas del proyecto.
12. Tarifas
GET    /api/core/tarifas/proyecto/{idProyecto}
GET    /api/core/tarifas/proyecto/{idProyecto}/activas
GET    /api/core/tarifas/{idTarifa}
POST   /api/core/tarifas
DELETE /api/core/tarifas/{idTarifa}

Las tarifas pueden estar asociadas a:
- proyecto;
- zona;
- etapa comercial;
- moneda;
- tipo de tarifa.
Los principales tipos de tarifa utilizados actualmente son:
POR_M2
MONTO_FIJO

13. Ajustes por Tipo de Lote
GET    /api/core/ajustes-tipo-lote/proyecto/{idProyecto}
GET    /api/core/ajustes-tipo-lote/proyecto/{idProyecto}/activos
GET    /api/core/ajustes-tipo-lote/{idAjusteTipoLote}
POST   /api/core/ajustes-tipo-lote
DELETE /api/core/ajustes-tipo-lote/{idAjusteTipoLote}

Los ajustes pueden modificar el precio según características comerciales del tipo de lote.
Entre los tipos de ajuste soportados se encuentran:
PORCENTAJE
MONTO_FIJO

14. Motor de Precios
Historial de precios de un lote
GET /api/core/lotes-precios/lote/{idLote}/historial

Precio vigente
GET /api/core/lotes-precios/lote/{idLote}/vigente?moneda={codigoMoneda}

Calcular y registrar precio
POST /api/core/lotes-precios/calcular

15. Plano Interactivo
Registrar una nueva versión de plano
POST /api/core/planos

Listar planos de un proyecto
GET /api/core/planos/proyecto/{idProyecto}

Obtener plano vigente
GET /api/core/planos/proyecto/{idProyecto}/vigente

Obtener detalle completo del plano vigente
GET /api/core/planos/proyecto/{idProyecto}/detalle-vigente

Crear o actualizar geometría de un lote
PUT /api/core/planos/geometrias

Desactivar geometría
DELETE /api/core/planos/geometrias/{idLoteGeometria}
---

16. Manejo de Errores
El servicio utiliza un manejador global de excepciones mediante GlobalExceptionHandler.
Entre las respuestas controladas se encuentran:
- 400 Bad Request: reglas de negocio o solicitudes inválidas.
- 401 Unauthorized: autenticación requerida o JWT inválido.
- 403 Forbidden: usuario autenticado sin permisos suficientes.
- 404 Not Found: recurso inexistente.
- 409 Conflict: conflictos de reglas de negocio.
- errores de validación de campos.

17. Guía de Ejecución
Mediante Docker Compose (Recomendado)
Desde la raíz del repositorio:
docker compose up -d --build auth-service core-service

Verificar servicios
docker compose ps

Verificar logs
docker compose logs -f core-service

Verificar estado de salud
curl http://localhost:8083/actuator/health

Resultado esperado:
{
  "status": "UP"
}

El servicio se ejecuta por defecto en:
http://localhost:8083

18. Autenticación
Para consumir los endpoints protegidos debe obtenerse primero un JWT desde auth-service.
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "usuario@sigi.pe",
    "contrasena": "CONTRASENA"
  }'

La respuesta incluye:
{
  "idUsuario": 5,
  "usuario": "usuario@sigi.pe",
  "autoridades": [
    "ROLE_ADMINISTRADOR"
  ],
  "requiereCambioPassword": false,
  "accessToken": "...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 900
}

El accessToken debe enviarse en las solicitudes a core-service:
Authorization: Bearer ACCESS_TOKEN

19. Tecnologías Utilizadas
- Java 21
- Spring Boot 4.1.1
- Spring Web
- Spring Data JPA
- Hibernate
- Spring Security
- OAuth2 Resource Server
- JWT RSA
- PostgreSQL
- Supabase
- Maven
- Docker
- Docker Compose
- Lombok
- Jackson 3