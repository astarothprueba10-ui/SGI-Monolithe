package monolithe.core_service.repository;

import monolithe.core_service.repository.TrabajadorProcedureRepository.ResultadoProcedimiento;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TrabajadorProcedureRepositoryEvidenciaTest {

    private JdbcTemplate jdbcTemplate;
    private TrabajadorProcedureRepository repository;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        repository = new TrabajadorProcedureRepository(jdbcTemplate, new JsonMapper());
    }

    @Test
    @SuppressWarnings("unchecked")
    void debeInvocarProcedimientoAdjuntarEvidencia() {
        ResultadoProcedimiento esperado = new ResultadoProcedimiento(null, "OK", null);
        when(jdbcTemplate.queryForObject(
                contains("sp_core_adjuntar_evidencia_correccion"),
                any(RowMapper.class),
                eq(1L), eq(5L),
                eq("solicitudes/5/uuid.jpg"),
                eq("foto.jpg"),
                eq("image/jpeg")))
                .thenReturn(esperado);

        ResultadoProcedimiento resultado = repository.adjuntarEvidenciaCorreccion(
                1L, 5L, "solicitudes/5/uuid.jpg", "foto.jpg", "image/jpeg");

        assertEquals("OK", resultado.estado());
        verify(jdbcTemplate).queryForObject(
                contains("sp_core_adjuntar_evidencia_correccion"),
                any(RowMapper.class),
                eq(1L), eq(5L),
                eq("solicitudes/5/uuid.jpg"),
                eq("foto.jpg"),
                eq("image/jpeg"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void debePropagarseSiJdbcLanzaExcepcion() {
        when(jdbcTemplate.queryForObject(
                contains("sp_core_adjuntar_evidencia_correccion"),
                any(RowMapper.class),
                any(), any(), any(), any(), any()))
                .thenThrow(new RuntimeException("BD no disponible"));

        assertThrows(RuntimeException.class, () ->
                repository.adjuntarEvidenciaCorreccion(
                        1L, 5L, "solicitudes/5/uuid.jpg", "foto.jpg", "image/jpeg"));
    }
}
