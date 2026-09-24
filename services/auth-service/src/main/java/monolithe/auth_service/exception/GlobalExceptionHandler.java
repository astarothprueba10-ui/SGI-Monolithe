package monolithe.auth_service.exception;

import jakarta.servlet.http.HttpServletRequest;
import monolithe.auth_service.dto.ApiErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mail.MailException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

        @ExceptionHandler(BadCredentialsException.class)
        public ResponseEntity<ApiErrorResponse> handleBadCredentials(
                        BadCredentialsException exception,
                        HttpServletRequest request) {

                return construirRespuesta(
                                HttpStatus.UNAUTHORIZED,
                                "No fue posible autenticar al usuario",
                                request);
        }

        @ExceptionHandler(LockedException.class)
        public ResponseEntity<ApiErrorResponse> handleLocked(
                        LockedException exception,
                        HttpServletRequest request) {

                return construirRespuesta(
                                HttpStatus.UNAUTHORIZED,
                                "No fue posible autenticar al usuario",
                                request);
        }

        @ExceptionHandler(InvalidTokenException.class)
        public ResponseEntity<ApiErrorResponse> handleInvalidToken(
                        InvalidTokenException exception,
                        HttpServletRequest request) {

                return construirRespuesta(
                                HttpStatus.UNAUTHORIZED,
                                exception.getMessage(),
                                request);
        }

        @ExceptionHandler(IllegalArgumentException.class)
        public ResponseEntity<ApiErrorResponse> handleIllegalArgument(
                        IllegalArgumentException exception,
                        HttpServletRequest request) {

                return construirRespuesta(
                                HttpStatus.BAD_REQUEST,
                                exception.getMessage(),
                                request);
        }

        @ExceptionHandler(MailException.class)
        public ResponseEntity<ApiErrorResponse> handleMailException(
                        MailException exception,
                        HttpServletRequest request) {

                return construirRespuesta(
                                HttpStatus.SERVICE_UNAVAILABLE,
                                "El servicio de correo no está disponible temporalmente",
                                request);
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ApiErrorResponse> handleValidation(
                        MethodArgumentNotValidException exception,
                        HttpServletRequest request) {

                String mensaje = exception.getBindingResult()
                                .getFieldErrors()
                                .stream()
                                .findFirst()
                                .map(error -> error.getDefaultMessage())
                                .orElse("Solicitud inválida");

                return construirRespuesta(
                                HttpStatus.BAD_REQUEST,
                                mensaje,
                                request);
        }

        @ExceptionHandler(HttpMessageNotReadableException.class)
        public ResponseEntity<ApiErrorResponse> handleMalformedJson(
                        HttpMessageNotReadableException exception,
                        HttpServletRequest request) {

                return construirRespuesta(
                                HttpStatus.BAD_REQUEST,
                                "El cuerpo de la solicitud contiene un JSON inválido",
                                request);
        }

        private ResponseEntity<ApiErrorResponse> construirRespuesta(
                        HttpStatus status,
                        String mensaje,
                        HttpServletRequest request) {

                ApiErrorResponse error = new ApiErrorResponse(
                                Instant.now(),
                                status.value(),
                                status.getReasonPhrase(),
                                mensaje,
                                request.getRequestURI());

                return ResponseEntity
                                .status(status)
                                .body(error);
        }
}