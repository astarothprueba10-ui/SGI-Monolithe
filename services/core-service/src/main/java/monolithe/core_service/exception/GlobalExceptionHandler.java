package monolithe.core_service.exception;

import jakarta.servlet.http.HttpServletRequest;
import monolithe.core_service.dto.ErrorResponse;
import monolithe.core_service.dto.ValidationErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.sql.SQLException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.TransactionException;

@RestControllerAdvice
public class GlobalExceptionHandler {
        private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

        @ExceptionHandler({ImportacionPersistenciaException.class, DataAccessException.class, TransactionException.class})
        public ResponseEntity<ErrorResponse> manejarPersistencia(RuntimeException ex, HttpServletRequest request) {
                String estado = estadoSql(ex);
                String contexto = ex instanceof ImportacionPersistenciaException imp ? imp.getContexto() + ": " : "";
                HttpStatus status;
                String mensaje;
                switch (estado) {
                        case "23505" -> { status = HttpStatus.CONFLICT; mensaje = "Existe un registro con el mismo código o número. Revisa los duplicados y el inventario."; }
                        case "23503" -> { status = HttpStatus.CONFLICT; mensaje = "Una referencia asociada no existe o está en uso. Revisa las relaciones del registro."; }
                        case "23514", "23502", "22001", "22003", "22P02" -> { status = HttpStatus.BAD_REQUEST; mensaje = "Los datos incumplen una restricción de formato, longitud, valor o campo obligatorio."; }
                        case "42501" -> { status = HttpStatus.SERVICE_UNAVAILABLE; mensaje = "La conexión del servicio no tiene los permisos de base de datos necesarios. Contacta al administrador."; }
                        case "40001", "40P01" -> { status = HttpStatus.CONFLICT; mensaje = "Otra operación modificó los datos al mismo tiempo. Recarga y valida nuevamente."; }
                        default -> {
                                if (estado.startsWith("08") || ex instanceof org.springframework.dao.DataAccessResourceFailureException) {
                                        status = HttpStatus.SERVICE_UNAVAILABLE;
                                        mensaje = "No se pudo establecer o mantener la conexión con la base de datos. Intenta nuevamente.";
                                } else {
                                        status = HttpStatus.INTERNAL_SERVER_ERROR;
                                        mensaje = "No se pudo guardar por un fallo de persistencia no identificado. Contacta al soporte.";
                                }
                        }
                }
                String referencia = UUID.randomUUID().toString();
                LOG.warn("Operación de persistencia fallida. Referencia={} SQLSTATE={} tipo={}", referencia, estado, ex.getClass().getSimpleName());
                return ResponseEntity.status(status).body(buildError(status, contexto + mensaje + " Referencia: " + referencia, request));
        }

        private static String estadoSql(Throwable error) {
                for (Throwable causa = error; causa != null; causa = causa.getCause()) {
                        if (causa instanceof SQLException sql && sql.getSQLState() != null)
                                return sql.getSQLState();
                }
                return "";
        }

        @ExceptionHandler(Exception.class)
        public ResponseEntity<ErrorResponse> manejarInesperado(Exception ex, HttpServletRequest request) {
                // No transformar errores HTTP o de seguridad en fallos internos.
                if (ex instanceof org.springframework.security.access.AccessDeniedException)
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(buildError(HttpStatus.FORBIDDEN, "No tienes permisos para realizar esta operación.", request));
                if (ex instanceof org.springframework.security.core.AuthenticationException)
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(buildError(HttpStatus.UNAUTHORIZED, "Tu sesión no es válida. Inicia sesión nuevamente.", request));
                if (ex instanceof org.springframework.web.ErrorResponse webError) {
                        HttpStatus status = HttpStatus.resolve(webError.getStatusCode().value());
                        if (status != null && status.is4xxClientError())
                                return ResponseEntity.status(status).headers(webError.getHeaders()).body(buildError(status, "La solicitud no se pudo procesar (" + status.value() + "). Revisa la operación.", request));
                }
                String referencia = UUID.randomUUID().toString();
                LOG.error("Error inesperado del Core. Referencia={}", referencia, ex);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(buildError(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Ocurrió un fallo inesperado al procesar la operación. Contacta al soporte con la referencia: " + referencia, request));
        }


        @ExceptionHandler(RecursoNoEncontradoException.class)
        public ResponseEntity<ErrorResponse> manejarRecursoNoEncontrado(
                        RecursoNoEncontradoException ex,
                        HttpServletRequest request) {
                ErrorResponse response = buildError(HttpStatus.NOT_FOUND, ex.getMessage(), request);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }

        @ExceptionHandler(ConflictoNegocioException.class)
        public ResponseEntity<ErrorResponse> manejarConflictoNegocio(
                        ConflictoNegocioException ex,
                        HttpServletRequest request) {
                ErrorResponse response = buildError(HttpStatus.CONFLICT, ex.getMessage(), request);
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
        }

        @ExceptionHandler(ReglaNegocioException.class)
        public ResponseEntity<ErrorResponse> manejarReglaNegocio(
                        ReglaNegocioException ex,
                        HttpServletRequest request) {
                ErrorResponse response = buildError(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ValidationErrorResponse> manejarValidaciones(
                        MethodArgumentNotValidException ex,
                        HttpServletRequest request) {
                Map<String, String> errores = new LinkedHashMap<>();
                for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
                        errores.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
                }

                HttpStatus status = HttpStatus.BAD_REQUEST;
                ValidationErrorResponse response = new ValidationErrorResponse(
                                Instant.now(),
                                status.value(),
                                status.getReasonPhrase(),
                                "Existen errores de validación en la solicitud",
                                request.getRequestURI(),
                                errores);

                return ResponseEntity.status(status).body(response);
        }

        @ExceptionHandler(HttpMessageNotReadableException.class)
        public ResponseEntity<ErrorResponse> manejarMensajeNoLectura(
                        HttpMessageNotReadableException ex,
                        HttpServletRequest request) {
                ErrorResponse response = buildError(
                                HttpStatus.BAD_REQUEST,
                                "El cuerpo de la solicitud no es válido",
                                request);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        @ExceptionHandler(ResponseStatusException.class)
        public ResponseEntity<ErrorResponse> manejarEstadoHttp(
                        ResponseStatusException ex,
                        HttpServletRequest request) {
                HttpStatus status = HttpStatus.valueOf(
                                ex.getStatusCode().value());

                String mensaje = ex.getReason();

                if (mensaje == null || mensaje.isBlank()) {
                        mensaje = "No se pudo completar la operación.";
                }

                ErrorResponse response = buildError(
                                status,
                                mensaje,
                                request);

                return ResponseEntity.status(status).body(response);
        }

        private ErrorResponse buildError(
                        HttpStatus status,
                        String message,
                        HttpServletRequest request) {
                return new ErrorResponse(
                                Instant.now(),
                                status.value(),
                                status.getReasonPhrase(),
                                message,
                                request.getRequestURI());
        }
}
