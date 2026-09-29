package monolithe.cms_service.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> manejarNoEncontrado(
            ResourceNotFoundException ex) {

        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put(
                "timestamp",
                OffsetDateTime.now(ZoneOffset.UTC));

        respuesta.put(
                "status",
                HttpStatus.NOT_FOUND.value());

        respuesta.put(
                "error",
                HttpStatus.NOT_FOUND.getReasonPhrase());

        respuesta.put(
                "message",
                ex.getMessage());

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(respuesta);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, Object>> manejarConflicto(
            ConflictException ex) {

        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put(
                "timestamp",
                OffsetDateTime.now(ZoneOffset.UTC));

        respuesta.put(
                "status",
                HttpStatus.CONFLICT.value());

        respuesta.put(
                "error",
                HttpStatus.CONFLICT.getReasonPhrase());

        respuesta.put(
                "message",
                ex.getMessage());

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(respuesta);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> manejarIllegalArgumentException(
            IllegalArgumentException ex) {

        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put(
                "timestamp",
                OffsetDateTime.now(ZoneOffset.UTC));

        respuesta.put(
                "status",
                HttpStatus.BAD_REQUEST.value());

        respuesta.put(
                "error",
                HttpStatus.BAD_REQUEST.getReasonPhrase());

        respuesta.put(
                "message",
                ex.getMessage());

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(respuesta);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> manejarIllegalStateException(
            IllegalStateException ex) {

        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put(
                "timestamp",
                OffsetDateTime.now(ZoneOffset.UTC));

        respuesta.put(
                "status",
                HttpStatus.CONFLICT.value());

        respuesta.put(
                "error",
                HttpStatus.CONFLICT.getReasonPhrase());

        respuesta.put(
                "message",
                ex.getMessage());

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(respuesta);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> manejarValidacion(
            MethodArgumentNotValidException ex) {

        Map<String, String> errores = new LinkedHashMap<>();

        ex.getBindingResult()
                .getFieldErrors()
                .forEach(error -> errores.put(
                        error.getField(),
                        error.getDefaultMessage()));

        Map<String, Object> respuesta = new LinkedHashMap<>();

        respuesta.put(
                "timestamp",
                OffsetDateTime.now(ZoneOffset.UTC));

        respuesta.put(
                "status",
                HttpStatus.BAD_REQUEST.value());

        respuesta.put(
                "error",
                HttpStatus.BAD_REQUEST.getReasonPhrase());

        respuesta.put(
                "message",
                "Los datos enviados no son válidos");

        respuesta.put(
                "validationErrors",
                errores);

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(respuesta);
    }
}