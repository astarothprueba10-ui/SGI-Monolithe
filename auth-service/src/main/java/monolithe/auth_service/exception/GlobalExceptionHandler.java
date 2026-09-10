package monolithe.auth_service.exception;

import jakarta.servlet.http.HttpServletRequest;
import monolithe.auth_service.dto.ApiErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
            HttpServletRequest request
    ) {

        return construirRespuesta(
                HttpStatus.UNAUTHORIZED,
                "Credenciales inválidas",
                request
        );
    }

    @ExceptionHandler(LockedException.class)
    public ResponseEntity<ApiErrorResponse> handleLocked(
            LockedException exception,
            HttpServletRequest request
    ) {

        return construirRespuesta(
                HttpStatus.UNAUTHORIZED,
                "No fue posible autenticar al usuario",
                request
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(
            IllegalArgumentException exception,
            HttpServletRequest request
    ) {

        return construirRespuesta(
                HttpStatus.UNAUTHORIZED,
                exception.getMessage(),
                request
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {

        String mensaje = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("Solicitud inválida");

        return construirRespuesta(
                HttpStatus.BAD_REQUEST,
                mensaje,
                request
        );
    }

    private ResponseEntity<ApiErrorResponse> construirRespuesta(
            HttpStatus status,
            String mensaje,
            HttpServletRequest request
    ) {

        ApiErrorResponse error = new ApiErrorResponse(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                mensaje,
                request.getRequestURI()
        );

        return ResponseEntity
                .status(status)
                .body(error);
    }
} 