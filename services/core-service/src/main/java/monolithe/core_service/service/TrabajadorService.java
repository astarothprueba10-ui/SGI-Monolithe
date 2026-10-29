
package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ActualizarTrabajadorRequest;
import monolithe.core_service.dto.TrabajadorResponse;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.repository.TrabajadorProcedureRepository;
import monolithe.core_service.repository.TrabajadorProcedureRepository.ResultadoProcedimiento;
import monolithe.core_service.client.EmailNotificationClient;
import monolithe.core_service.dto.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.core.JacksonException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor(onConstructor_ = @Autowired)
public class TrabajadorService {

        private final TrabajadorProcedureRepository repository;
        private final JsonMapper jsonMapper;
        private final EmailNotificationClient emailNotificationClient;

        @Value("${security.mail.worker-email-confirmation-url:http://localhost:5174/confirmar-correo}")
        private String urlConfirmacionBase = "http://localhost:5174/confirmar-correo";

        @Value("${security.mail.worker-email-confirmation-expiration-minutes:30}")
        private long minutosExpiracionCorreo = 30L;

        private static final int TOKEN_BYTES = 32;
        private final SecureRandom secureRandom = new SecureRandom();

        public TrabajadorService(
                        TrabajadorProcedureRepository repository,
                        JsonMapper jsonMapper) {
                this(repository, jsonMapper, null);
        }

        public List<TrabajadorResponse> listarTodos(Long idActor) {

                ResultadoProcedimiento respuesta = repository.listarTrabajadores(idActor);

                validarEstado(respuesta);

                JsonNode datos = respuesta.resultado();

                if (datos == null || !datos.isArray()) {
                        throw new IllegalStateException(
                                        "Respuesta inválida al listar trabajadores.");
                }

                List<TrabajadorResponse> trabajadores = new ArrayList<>();

                for (JsonNode trabajador : datos) {
                        trabajadores.add(
                                        jsonMapper.convertValue(
                                                        trabajador,
                                                        TrabajadorResponse.class));
                }

                return trabajadores;
        }

        public TrabajadorResponse obtenerPorId(
                        Long idActor,
                        Long idTrabajador) {

                ResultadoProcedimiento respuesta = repository.obtenerTrabajador(
                                idActor,
                                idTrabajador);

                validarEstado(respuesta);

                JsonNode datos = respuesta.resultado();

                if (datos == null || !datos.isObject()) {
                        throw new IllegalStateException(
                                        "Respuesta inválida al obtener trabajador.");
                }

                return jsonMapper.convertValue(
                                datos,
                                TrabajadorResponse.class);
        }

        /** Registra un trabajador después de validar documentos, fecha y correo. */
        public JsonNode registrarTrabajador(Long idActor, JsonNode datos) {
                ValidacionAltaTrabajador.validarEstructura(datos);
                JsonNode normalizados = ValidacionAltaTrabajador.validar(
                                datos, obtenerCatalogos(idActor), LocalDate.now(java.time.ZoneId.of("America/Lima")));
                ResultadoProcedimiento respuesta = repository.registrarTrabajador(
                                idActor, serializarRegistro(normalizados));
                validarEstado(respuesta);
                return respuesta.resultado();
        }

        private String serializarRegistro(JsonNode datos) {
                try {
                        return jsonMapper.writeValueAsString(datos);
                } catch (JacksonException exception) {
                        throw new IllegalStateException("No se pudieron procesar los datos del trabajador.", exception);
                }
        }

        private static final int ID_ESTADO_EN_VERIFICACION = 5;

        public JsonNode actualizarTrabajador(
                        Long idActor,
                        Long idTrabajador,
                        ActualizarTrabajadorRequest solicitud) {

                if (solicitud == null
                                || (solicitud.informacionLaboral() == null
                                                && solicitud.informacionPersonal() == null)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Debe proporcionar informacionPersonal o informacionLaboral.");
                }

                if (solicitud.informacionPersonal() != null) {
                        validarDocumentoNoModificable(solicitud.informacionPersonal());
                }

                if (solicitud.informacionLaboral() != null) {
                        validarEstadoNoEnVerificacion(solicitud.informacionLaboral());
                }

                String datosJson = serializarDatosActualizacion(solicitud);
                return persistirActualizacion(idActor, idTrabajador, datosJson);
        }

        public JsonNode actualizarTrabajador(
                        Long idActor,
                        Long idTrabajador,
                        JsonNode solicitud) {
                if (solicitud == null || !solicitud.isObject()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Los datos de actualización deben ser un objeto JSON.");
                }

                JsonNode personal = solicitud.get("informacionPersonal");
                JsonNode laboral = solicitud.get("informacionLaboral");
                if ((personal == null || !personal.isObject())
                                && (laboral == null || !laboral.isObject())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Debe proporcionar informacionPersonal o informacionLaboral.");
                }
                if ((personal != null && !personal.isObject())
                                || (laboral != null && !laboral.isObject())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Cada sección de actualización debe ser un objeto JSON.");
                }
                validarDocumentoNoModificable(personal);
                validarCorreoNoModificable(personal);
                validarEstadoNoEnVerificacion(laboral);

                try {
                        return persistirActualizacion(
                                        idActor,
                                        idTrabajador,
                                        jsonMapper.writeValueAsString(solicitud));
                } catch (JacksonException ex) {
                        throw new IllegalStateException(
                                        "No se pudieron procesar los datos de actualización.",
                                        ex);
                }
        }

        private JsonNode persistirActualizacion(
                        Long idActor,
                        Long idTrabajador,
                        String datosJson) {
                ResultadoProcedimiento respuesta = repository.actualizarTrabajador(
                                idActor, idTrabajador, datosJson);
                validarEstado(respuesta);
                return respuesta.resultado();
        }

        private void validarDocumentoNoModificable(
                        ActualizarTrabajadorRequest.InformacionPersonal personal) {
                if (personal.idTipoDocumento() != null || personal.numeroDocumento() != null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "No se permite modificar el documento de identidad en la edicion ordinaria. Solicite una correccion documental.");
                }
        }

        private void validarDocumentoNoModificable(JsonNode personal) {
                if (personal == null || !personal.isObject()) {
                        return;
                }
                if (personal.has("idTipoDocumento") || personal.has("numeroDocumento")) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "No se permite modificar el documento de identidad en la edicion ordinaria. Solicite una correccion documental.");
                }
        }

        private void validarCorreoNoModificable(JsonNode personal) {
                if (personal != null && personal.isObject() && personal.has("correoElectronico")) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "El cambio de correo debe realizarse mediante la solicitud con confirmación por enlace.");
                }
        }

        private void validarEstadoNoEnVerificacion(
                        ActualizarTrabajadorRequest.InformacionLaboral laboral) {
                if (laboral.idEstadoTrabajador() != null
                                && laboral.idEstadoTrabajador() == ID_ESTADO_EN_VERIFICACION) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "No se permite asignar manualmente el estado EN_VERIFICACION.");
                }
        }

        private void validarEstadoNoEnVerificacion(JsonNode laboral) {
                if (laboral == null || !laboral.isObject()) {
                        return;
                }
                JsonNode idEstado = laboral.get("idEstadoTrabajador");
                if (idEstado != null && !idEstado.isNull()
                                && Integer.toString(ID_ESTADO_EN_VERIFICACION).equals(idEstado.asString())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "No se permite asignar manualmente el estado EN_VERIFICACION.");
                }
        }

        private String serializarDatosActualizacion(
                        ActualizarTrabajadorRequest solicitud) {
                try {
                        return jsonMapper.writeValueAsString(solicitud);
                } catch (JacksonException ex) {
                        throw new IllegalStateException(
                                        "No se pudieron procesar los datos de actualización.",
                                        ex);
                }
        }

        public SolicitudCambioCorreoResponse solicitarCambioCorreo(
                        Long idActor,
                        Long idTrabajador,
                        String correoNuevo,
                        String motivo) {
                if (motivo == null || motivo.trim().length() < 10 || motivo.trim().length() > 1000) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        "El motivo debe tener entre 10 y 1000 caracteres.");
                }

                ResultadoProcedimiento respuesta = repository.solicitarCambioCorreo(
                                idActor, idTrabajador, correoNuevo, motivo.trim());
                validarEstado(respuesta);
                return new SolicitudCambioCorreoResponse(
                                "Solicitud pendiente de aprobacion por Gerencia o Administracion.", 0);
        }

        private void enviarCorreoConfirmacion(
                        String correoNuevo,
                        String tokenReal,
                        String jwtToken) {
                if (emailNotificationClient == null) {
                        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                                        "No esta configurado el servicio de correo de confirmacion.");
                }
                String urlConfirmacion = UriComponentsBuilder
                                .fromUriString(urlConfirmacionBase)
                                .queryParam("token", tokenReal)
                                .build()
                                .toUriString();
                try {
                        emailNotificationClient.enviarConfirmacionCambioCorreo(
                                        correoNuevo, urlConfirmacion, minutosExpiracionCorreo, jwtToken);
                } catch (Exception ex) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_GATEWAY,
                                        "No se pudo enviar el correo de verificación. Inténtelo nuevamente.");
                }
        }

        public ConfirmacionCambioCorreoResponse confirmarCambioCorreo(String token) {
                if (token == null || token.isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "El token de confirmación es obligatorio.");
                }

                String tokenHash = calcularSha256(token.trim());
                ResultadoProcedimiento respuesta = repository.confirmarCambioCorreo(tokenHash);

                validarEstado(respuesta);

                String correoConfirmado = extraerCorreoConfirmado(respuesta.resultado());

                return new ConfirmacionCambioCorreoResponse(
                                "Correo electrónico confirmado y actualizado exitosamente.",
                                correoConfirmado);
        }

        private String extraerCorreoConfirmado(JsonNode resultado) {
                if (resultado != null && resultado.has("correo")) {
                        return resultado.get("correo").asString();
                }
                return null;
        }

        public String generarTokenSeguro() {
                byte[] bytes = new byte[TOKEN_BYTES];
                secureRandom.nextBytes(bytes);
                return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        }

        public String calcularSha256(String token) {
                try {
                        MessageDigest digest = MessageDigest.getInstance("SHA-256");
                        byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
                        return HexFormat.of().formatHex(hash);
                } catch (NoSuchAlgorithmException e) {
                        throw new IllegalStateException("Error al calcular hash SHA-256", e);
                }
        }

        public JsonNode obtenerCatalogos(Long idActor) {

                ResultadoProcedimiento respuesta = repository.obtenerCatalogos(idActor);

                validarEstado(respuesta);

                JsonNode datos = respuesta.resultado();

                if (datos == null || !datos.isObject()) {
                        throw new IllegalStateException(
                                        "Respuesta invalida al obtener los catalogos de RRHH.");
                }

                return datos;
        }

        public JsonNode identificarPersona(
                        Long idActor,
                        JsonNode datos) {

                if (datos == null || !datos.isObject()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Debe proporcionar los datos de identificación.");
                }

                JsonNode tipoDocumento = datos.get("idTipoDocumento");
                JsonNode numeroDocumento = datos.get("numeroDocumento");

                if (tipoDocumento == null
                                || !tipoDocumento.isInt()
                                || tipoDocumento.asInt() <= 0
                                || numeroDocumento == null
                                || !numeroDocumento.isString()
                                || numeroDocumento.asString().isBlank()) {

                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Indique un tipo y número de documento válidos.");
                }

                ResultadoProcedimiento respuesta = repository.identificarPersona(
                                idActor,
                                tipoDocumento.asInt(),
                                numeroDocumento.asString().trim());

                validarEstado(respuesta);

                JsonNode persona = respuesta.resultado();

                if (persona == null || !persona.isObject()) {
                        throw new IllegalStateException(
                                        "Respuesta inválida al identificar la persona.");
                }

                return persona;
        }

        public JsonNode solicitarCorreccionDocumento(
                        Long idActor,
                        Long idTrabajador,
                        JsonNode datos) {

                if (idTrabajador == null || idTrabajador <= 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "El identificador del trabajador es inválido.");
                }

                if (datos == null || !datos.isObject()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Debe proporcionar los datos de la corrección.");
                }

                JsonNode tipo = datos.get("idTipoDocumento");
                JsonNode numero = datos.get("numeroDocumento");
                JsonNode motivo = datos.get("motivo");

                if (tipo == null || !tipo.isInt() || tipo.asInt() <= 0
                                || numero == null || !numero.isString()
                                || numero.asString().isBlank()
                                || motivo == null || !motivo.isString()) {

                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Indique el tipo, número de documento y motivo.");
                }

                String motivoLimpio = motivo.asString().trim();

                if (motivoLimpio.length() < 10
                                || motivoLimpio.length() > 1000) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "El motivo debe contener entre 10 y 1000 caracteres.");
                }

                ResultadoProcedimiento respuesta = repository.solicitarCorreccionDocumento(
                                idActor,
                                idTrabajador,
                                tipo.asInt(),
                                numero.asString().trim(),
                                motivoLimpio);

                if (respuesta != null) {
                        String estado = respuesta.estado();
                        String mensaje = respuesta.mensaje() != null
                                        ? respuesta.mensaje()
                                        : "No se pudo solicitar la corrección.";

                        if ("USUARIO_PROTEGIDO".equals(estado)) {
                                throw new ResponseStatusException(
                                                HttpStatus.FORBIDDEN, mensaje);
                        }

                        if ("MOTIVO_INVALIDO".equals(estado)) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST, mensaje);
                        }

                        if ("ESTADO_INVALIDO".equals(estado)
                                        || "SIN_CAMBIOS".equals(estado)
                                        || "SOLICITUD_PENDIENTE".equals(estado)) {
                                throw new ResponseStatusException(
                                                HttpStatus.CONFLICT, mensaje);
                        }
                }

                validarEstado(respuesta);

                JsonNode resultado = Objects.requireNonNull(respuesta, "respuesta")
                                .resultado();

                if (resultado == null || !resultado.isObject()
                                || !resultado.has("idSolicitud")) {
                        throw new IllegalStateException(
                                        "Respuesta invalida al solicitar correccion documental.");
                }

                return resultado;
        }

        public JsonNode listarSolicitudesCorreccion(Long idActor) {
                ResultadoProcedimiento respuesta =
                        repository.listarSolicitudesCorreccion(idActor);

                validarEstadoCorreccion(respuesta);

                JsonNode resultado = respuesta.resultado();
                if (resultado == null) {
                        return jsonMapper.createArrayNode();
                }
                return resultado;
        }

        public JsonNode obtenerDetalleCorreccion(
                        Long idActor,
                        Long idSolicitud) {

                if (idSolicitud == null || idSolicitud <= 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "El identificador de la solicitud es invalido.");
                }

                ResultadoProcedimiento respuesta =
                        repository.obtenerDetalleCorreccion(idActor, idSolicitud);

                validarEstadoCorreccion(respuesta);

                JsonNode resultado = respuesta.resultado();
                if (resultado == null || !resultado.isObject()) {
                        throw new IllegalStateException(
                                        "El procedimiento no devolvio el detalle de la correccion.");
                }
                return resultado;
        }

        public JsonNode resolverCorreccion(
                        Long idActor,
                        Long idSolicitud,
                        ResolverCorreccionRequest request) {
                return resolverCorreccion(idActor, idSolicitud, request, obtenerJwtContexto());
        }

        @Transactional
        public JsonNode resolverCorreccion(
                        Long idActor,
                        Long idSolicitud,
                        ResolverCorreccionRequest request,
                        String jwtToken) {
                validarParametrosResolucion(idSolicitud, request);

                // El token real se mantiene en el servidor; SQL recibe solo el hash.
                String tokenReal = "APROBAR".equalsIgnoreCase(request.decision())
                                ? generarTokenSeguro() : null;
                String tokenHash = tokenReal == null ? null : calcularSha256(tokenReal);
                OffsetDateTime expira = tokenReal == null ? null : OffsetDateTime.now(ZoneOffset.UTC)
                                .plusMinutes(minutosExpiracionCorreo);

                ResultadoProcedimiento respuesta = repository.resolverCorreccionIdentidad(
                                idActor, idSolicitud, request.decision(), request.motivo(), tokenHash, expira);
                validarEstadoCorreccion(respuesta);
                JsonNode resultado = respuesta.resultado();
                if (resultado == null || !resultado.isObject()) {
                        throw new IllegalStateException("No se recibio la resolucion de la correccion.");
                }
                if (resultado.path("tokenReal").isString()
                                && !resultado.path("tokenReal").asString("").isEmpty()) {
                        throw new IllegalStateException("La base de datos intento exponer un token sensible.");
                }
                notificarConfirmacionCorreoSiAprobado(request, resultado, tokenReal, jwtToken);
                return resultado;
        }

        private String obtenerJwtContexto() {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
                        return jwt.getTokenValue();
                }
                return null;
        }

        private void notificarConfirmacionCorreoSiAprobado(
                        ResolverCorreccionRequest request,
                        JsonNode resultado,
                        String tokenReal,
                        String jwtToken) {
                if (!"APROBAR".equals(request.decision())) {
                        return;
                }
                String tipoDato = resultado.path("tipoDato").asString("");
                if (!"CONTACTO".equalsIgnoreCase(tipoDato)) {
                        return;
                }
                String correoNuevo = resultado.has("correoPropuesto")
                                ? resultado.path("correoPropuesto").asString("")
                                : resultado.path("valorPropuesto").asString("");
                if (correoNuevo.isBlank() || tokenReal == null || jwtToken == null) {
                        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                                        "No fue posible notificar el cambio de correo aprobado.");
                }
                enviarCorreoConfirmacion(correoNuevo, tokenReal, jwtToken);
        }

        public JsonNode programarSuspension(
                        Long idActor,
                        Long idTrabajador,
                        ProgramarSuspensionRequest request) {

                if (request.fechaFin().isBefore(request.fechaInicio())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "La fecha de fin no puede ser anterior a la fecha de inicio.");
                }

                ResultadoProcedimiento respuesta = repository.programarSuspension(
                                idActor,
                                idTrabajador,
                                request.fechaInicio(),
                                request.fechaFin(),
                                request.motivo().trim());

                validarEstadoFase2A(respuesta);
                return respuesta.resultado();
        }

        public JsonNode cesarTrabajador(
                        Long idActor,
                        Long idTrabajador,
                        CesarTrabajadorRequest request) {

                ResultadoProcedimiento respuesta = repository.cesarTrabajador(
                                idActor,
                                idTrabajador,
                                request.fechaCese(),
                                request.motivo().trim());

                validarEstadoFase2A(respuesta);
                return respuesta.resultado();
        }

        public JsonNode solicitarReincorporacion(
                        Long idActor,
                        Long idTrabajador,
                        SolicitarReincorporacionRequest request) {

                ResultadoProcedimiento respuesta = repository.solicitarReincorporacion(
                                idActor,
                                idTrabajador,
                                request.nuevaFechaIngreso(),
                                request.motivo().trim());

                validarEstadoFase2A(respuesta);
                return respuesta.resultado();
        }

        public JsonNode resolverReincorporacion(
                        Long idActor,
                        Long idSolicitud,
                        ResolverReincorporacionRequest request) {

                validarResolucionReincorporacion(idSolicitud, request);

                String motivo = request.obtenerMotivoEfectivo() != null
                                ? request.obtenerMotivoEfectivo().trim()
                                : null;

                ResultadoProcedimiento respuesta = repository.resolverReincorporacion(
                                idActor,
                                idSolicitud,
                                request.decision().trim().toUpperCase(),
                                motivo);

                validarEstadoFase2A(respuesta);
                return respuesta.resultado();
        }

        public JsonNode listarReincorporaciones(
                        Long idActor,
                        String estado,
                        Long idTrabajador) {
                String estadoNormalizado = normalizarEstadoReincorporacion(estado);
                validarIdTrabajadorFiltro(idTrabajador);

                ResultadoProcedimiento respuesta = repository.listarReincorporaciones(
                                idActor,
                                estadoNormalizado,
                                idTrabajador);

                validarEstadoFase2A(respuesta);
                return respuesta.resultado();
        }

        public JsonNode listarHistorialLaboral(
                        Long idActor,
                        Long idTrabajador,
                        String tipoEvento,
                        LocalDate fechaDesde,
                        LocalDate fechaHasta) {
                validarIdTrabajadorFiltro(idTrabajador);
                validarRangoFechasHistorial(fechaDesde, fechaHasta);
                String tipoEventoNormalizado = normalizarTextoFiltro(tipoEvento);

                ResultadoProcedimiento respuesta = repository.listarHistorialLaboral(
                                idActor,
                                idTrabajador,
                                tipoEventoNormalizado,
                                fechaDesde,
                                fechaHasta);

                validarEstadoFase2A(respuesta);
                return respuesta.resultado();
        }

        public JsonNode obtenerMetricasTrabajadores(Long idActor) {
                ResultadoProcedimiento respuesta = repository.obtenerMetricasTrabajadores(idActor);
                validarEstadoFase2A(respuesta);
                return respuesta.resultado();
        }

        private void validarRangoFechasHistorial(LocalDate fechaDesde, LocalDate fechaHasta) {
                if (fechaDesde != null && fechaHasta != null && fechaDesde.isAfter(fechaHasta)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "La fecha desde no puede ser posterior a la fecha hasta.");
                }
        }

        private String normalizarTextoFiltro(String valor) {
                if (valor == null || valor.isBlank()) {
                        return null;
                }
                return valor.trim().toUpperCase();
        }

        private String normalizarEstadoReincorporacion(String estado) {
                if (estado == null || estado.isBlank()) {
                        return null;
                }
                String normalizado = estado.trim().toUpperCase();
                if (!ESTADOS_REINCORPORACION_VALIDOS.contains(normalizado)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Estado invalido. Estados permitidos: PENDIENTE, APROBADA, RECHAZADA, CANCELADA.");
                }
                return normalizado;
        }

        private void validarIdTrabajadorFiltro(Long idTrabajador) {
                if (idTrabajador != null && idTrabajador <= 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "El identificador del trabajador debe ser mayor a cero.");
                }
        }

        public static final Set<String> ESTADOS_REINCORPORACION_VALIDOS = Set.of(
                        "PENDIENTE", "APROBADA", "RECHAZADA", "CANCELADA");

        private void validarResolucionReincorporacion(
                        Long idSolicitud,
                        ResolverReincorporacionRequest request) {

                if (idSolicitud == null || idSolicitud <= 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID de solicitud invalido.");
                }
                String decision = request.decision() != null ? request.decision().trim().toUpperCase() : "";
                String motivo = request.obtenerMotivoEfectivo();
                if ("RECHAZAR".equals(decision)) {
                        if (motivo == null || motivo.trim().length() < 10 || motivo.trim().length() > 1000) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "El rechazo requiere un motivo de 10 a 1000 caracteres.");
                        }
                } else if (motivo != null && !motivo.trim().isBlank() && motivo.trim().length() > 1000) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "El motivo no puede superar los 1000 caracteres.");
                }
        }

        private void validarParametrosResolucion(
                        Long idSolicitud,
                        ResolverCorreccionRequest request) {

                if (idSolicitud == null || idSolicitud <= 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "El identificador de la solicitud es invalido.");
                }

                if (request == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Debe proporcionar la decision de resolucion.");
                }

                String motivo = request.motivo();
                if ("RECHAZAR".equals(request.decision())) {
                        if (motivo == null || motivo.isBlank()
                                        || motivo.trim().length() < 10
                                        || motivo.trim().length() > 1000) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "El rechazo requiere un motivo de 10 a 1000 caracteres.");
                        }
                } else if (motivo != null && motivo.trim().length() > 1000) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "El motivo no puede superar los 1000 caracteres.");
                }
        }

        private void validarEstadoCorreccion(ResultadoProcedimiento respuesta) {
                if (respuesta == null) {
                        throw new IllegalStateException(
                                        "El procedimiento no devolvio una respuesta.");
                }
                String estado = respuesta.estado();
                if ("OK".equals(estado)) {
                        return;
                }
                String mensaje = respuesta.mensaje() != null
                                ? respuesta.mensaje()
                                : "No se pudo completar la operacion de correccion.";

                mapearEstadoCorreccion(estado, mensaje);

                throw new IllegalStateException(
                                "Error del procedimiento de correccion: " + estado);
        }

        private void mapearEstadoCorreccion(String estado, String mensaje) {
                if ("DENEGADO".equals(estado)) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, mensaje);
                }
                if ("SOLICITUD_NO_DISPONIBLE".equals(estado)
                                || "SOLICITUD_NO_ENCONTRADA".equals(estado)
                                || "REGISTRO_NO_ENCONTRADO".equals(estado)) {
                        throw new ResponseStatusException(HttpStatus.NOT_FOUND, mensaje);
                }
                if ("AUTORESOLUCION_DENEGADA".equals(estado)
                                || "SOLICITUD_RESUELTA".equals(estado)
                                || "CONFLICTO_UNICIDAD".equals(estado)
                                || "DATOS_DESACTUALIZADOS".equals(estado)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, mensaje);
                }
                if ("ESTADO_INVALIDO".equals(estado)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, mensaje);
                }
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
        }

        private void validarEstadoFase2A(ResultadoProcedimiento respuesta) {
                if (respuesta == null) {
                        throw new IllegalStateException("El procedimiento no devolvió una respuesta.");
                }
                String estado = respuesta.estado();
                if ("OK".equals(estado)) {
                        return;
                }
                String mensaje = respuesta.mensaje() != null ? respuesta.mensaje() : "Operación no completada.";

                if ("SIN_ADMINISTRADOR".equals(estado) || "CONFIGURACION_INVALIDA".equals(estado)) {
                        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, mensaje);
                }
                if (List.of("DENEGADO", "USUARIO_PROTEGIDO", "AUTOAPROBACION_DENEGADA").contains(estado)) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, mensaje);
                }
                if (List.of("NO_ENCONTRADO", "NO_ENCONTRADA").contains(estado)) {
                        throw new RecursoNoEncontradoException(mensaje);
                }
                if (List.of("SUSPENSION_PENDIENTE", "SOLICITUD_PENDIENTE", "SOLICITUD_RESUELTA", "ESTADO_INVALIDO").contains(estado)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, mensaje);
                }
                if (List.of("DATOS_INVALIDOS", "FECHAS_INVALIDAS", "MOTIVO_INVALIDO").contains(estado)) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
                }
                validarEstado(respuesta);
        }

        private void validarEstado(ResultadoProcedimiento respuesta) {
                if (respuesta == null) {
                        throw new IllegalStateException(
                                        "El procedimiento no devolvió una respuesta.");
                }

                String estado = respuesta.estado();
                if ("OK".equals(estado)) {
                        return;
                }

                String mensaje = respuesta.mensaje() != null
                                ? respuesta.mensaje()
                                : "No se pudo completar la operación.";

                validarConfiguracionYPlataforma(estado, mensaje);
                validarSeguridadYExistencia(estado, mensaje);
                validarConflictos(estado, mensaje);
                validarSolicitud(estado, mensaje);

                throw new IllegalStateException(
                                "Error del procedimiento de RRHH: " + estado);
        }

        private void validarConfiguracionYPlataforma(String estado, String mensaje) {
                if ("CONFIGURACION_INVALIDA".equals(estado) || "SIN_ADMINISTRADOR".equals(estado)) {
                        throw new ResponseStatusException(
                                        HttpStatus.INTERNAL_SERVER_ERROR,
                                        mensaje != null ? mensaje : "Error de configuracion o administracion de RRHH.");
                }
        }

        private void validarSeguridadYExistencia(String estado, String mensaje) {
                if (List.of("DENEGADO", "USUARIO_PROTEGIDO", "AUTOAPROBACION_DENEGADA",
                                "AUTORESOLUCION_DENEGADA", "AUTOAPROBACION_NO_PERMITIDA", "ROL_NO_AUTORIZADO").contains(estado)) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, mensaje);
                }
                if (List.of("NO_ENCONTRADO", "NO_ENCONTRADA", "SOLICITUD_NO_ENCONTRADA",
                                "TRABAJADOR_NO_ENCONTRADO", "REGISTRO_NO_ENCONTRADO").contains(estado)) {
                        throw new RecursoNoEncontradoException(mensaje);
                }
        }

        private void validarConflictos(String estado, String mensaje) {
                if (List.of(
                                "SUSPENSION_PENDIENTE", "SOLICITUD_PENDIENTE", "SOLICITUD_RESUELTA",
                                "SOLICITUD_YA_RESUELTA", "ESTADO_NO_PERMITE_SUSPENSION",
                                "ESTADO_NO_PERMITE_CESE", "ESTADO_NO_PERMITE_REINCORPORACION",
                                "SUSPENSION_VIGENTE", "TRABAJADOR_YA_CESADO", "TRABAJADOR_NO_CESADO",
                                "CONFLICTO_UNICIDAD", "CORREO_DUPLICADO", "DOCUMENTO_EN_USO",
                                "EMAIL_EN_USO", "TRABAJADOR_EXISTENTE", "PERSONA_NO_COINCIDE",
                                "DOCUMENTO_NO_COINCIDE", "CONTACTO_NO_COINCIDE", "DOMICILIO_NO_COINCIDE").contains(estado)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, mensaje);
                }
        }

        private void validarSolicitud(String estado, String mensaje) {
                if (List.of(
                                "ESTADO_INVALIDO", "DATOS_INVALIDOS", "FECHAS_INVALIDAS", "MOTIVO_INVALIDO",
                                "CAMPOS_OBLIGATORIOS", "CARGO_INVALIDO", "CORRECCION_DOCUMENTAL_REQUERIDA",
                                "DOCUMENTO_INACTIVO", "DOCUMENTO_INVALIDO", "DOMICILIO_INVALIDO",
                                "EMAIL_INVALIDO", "EMAIL_VERIFICACION_REQUERIDA", "HORARIO_INVALIDO",
                                "ID_INVALIDO", "PERSONA_INVALIDA", "REQUIERE_IDENTIFICACION",
                                "TELEFONO_INVALIDO", "TIPO_DOCUMENTO_INVALIDO", "TOKEN_EXPIRADO",
                                "TOKEN_INVALIDO", "TOKEN_NO_ENCONTRADO", "TOKEN_UTILIZADO",
                                "TOKEN_YA_USADO", "VERIFICACION_DOCUMENTAL_PENDIENTE", "VINCULO_INVALIDO",
                                "DECISION_INVALIDA", "MOTIVO_REQUERIDO", "MOTIVO_OBLIGATORIO",
                                "FECHA_CESE_INVALIDA", "FECHA_INGRESO_INVALIDA").contains(estado)) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
                }
        }
}
