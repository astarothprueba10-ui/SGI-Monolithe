package monolithe.cms_service.exception;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import java.sql.SQLException;
import java.util.Map;

@RestControllerAdvice @Order(Ordered.HIGHEST_PRECEDENCE)
public class CaptacionExceptionHandler {
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> baseDeDatos(DataAccessException ex) {
        Throwable causa = ex.getMostSpecificCause();
        if (causa instanceof SQLException sql && "P0001".equals(sql.getSQLState())) {
            String mensaje = sql.getMessage().split("\n", 2)[0].replaceFirst("^ERROR: ", "");
            String codigo = mensaje.split("\\|", 2)[0];
            if (codigo.matches("[A-Z_]+") && mensaje.contains("|"))
                return ResponseEntity.status(codigo.equals("DENEGADO") ? 403 : 409)
                        .body(Map.of("message", mensaje.split("\\|", 2)[1], "codigo", codigo));
        }
        return ResponseEntity.internalServerError().body(Map.of("message", "No se confirmó el registro. Reintenta el mismo envío."));
    }
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> denegado(AccessDeniedException ex) {
        return ResponseEntity.status(403).body(Map.of("message", "No tienes permiso para esta operación."));
    }
}
