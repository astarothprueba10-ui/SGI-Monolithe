package monolithe.core_service.exception;

import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerPersistenciaTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    @Test
    void duplicadoDevuelveConflictoYContextoSinExponerSql() {
        var cause = new DataIntegrityViolationException("SQL interno", new SQLException("credenciales internas", "23505"));
        var response = handler.manejarPersistencia(new ImportacionPersistenciaException("Hoja Lotes, fila 7", cause),
            new MockHttpServletRequest());
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(response.getBody().message().contains("Hoja Lotes, fila 7"));
        assertTrue(response.getBody().message().contains("mismo código o número"));
        assertFalse(response.getBody().message().contains("credenciales internas"));
    }
    @Test
    void errorInesperadoIncluyeReferenciaSinExponerExcepcion() {
        var response = handler.manejarInesperado(new IllegalStateException("detalle interno"),
            new MockHttpServletRequest());
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertTrue(response.getBody().message().contains("referencia"));
        assertFalse(response.getBody().message().contains("detalle interno"));
    }
}
