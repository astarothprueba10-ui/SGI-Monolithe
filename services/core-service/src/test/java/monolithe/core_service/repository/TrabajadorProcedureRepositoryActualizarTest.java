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

class TrabajadorProcedureRepositoryActualizarTest {

    private JdbcTemplate jdbcTemplate;
    private TrabajadorProcedureRepository repository;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        repository = new TrabajadorProcedureRepository(jdbcTemplate, new JsonMapper());
    }

    @Test
    @SuppressWarnings("unchecked")
    void debeInvocarProcedimientoActualizar() {
        ResultadoProcedimiento esperado = new ResultadoProcedimiento(null, "OK", null);
        when(jdbcTemplate.queryForObject(
                contains("sp_rrhh_actualizar_trabajador"),
                any(RowMapper.class),
                eq(1L), eq(10L), anyString()))
                .thenReturn(esperado);

        ResultadoProcedimiento resultado = repository.actualizarTrabajador(1L, 10L, "{}");

        assertEquals("OK", resultado.estado());
        verify(jdbcTemplate).queryForObject(
                contains("sp_rrhh_actualizar_trabajador"),
                any(RowMapper.class),
                eq(1L), eq(10L), anyString());
    }

    @Test
    @SuppressWarnings("unchecked")
    void debePropagarseSiJdbcLanzaExcepcion() {
        when(jdbcTemplate.queryForObject(
                contains("sp_rrhh_actualizar_trabajador"),
                any(RowMapper.class),
                any(), any(), any()))
                .thenThrow(new RuntimeException("BD no disponible"));

        assertThrows(
                RuntimeException.class,
                () -> repository.actualizarTrabajador(1L, 10L, "{}"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void debeInvocarProcedimientoSolicitarCambioCorreo() {
        ResultadoProcedimiento esperado = new ResultadoProcedimiento(null, "OK", null);
        when(jdbcTemplate.queryForObject(
                contains("sp_rrhh_solicitar_cambio_correo"),
                any(RowMapper.class),
                eq(1L), eq(10L), eq("nuevo@correo.pe"), eq("hash123"), any()))
                .thenReturn(esperado);

        ResultadoProcedimiento resultado = repository.solicitarCambioCorreo(
                1L, 10L, "nuevo@correo.pe", "hash123", java.time.OffsetDateTime.now());

        assertEquals("OK", resultado.estado());
        verify(jdbcTemplate).queryForObject(
                contains("sp_rrhh_solicitar_cambio_correo"),
                any(RowMapper.class),
                eq(1L), eq(10L), eq("nuevo@correo.pe"), eq("hash123"), any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void debeInvocarProcedimientoConfirmarCambioCorreo() {
        ResultadoProcedimiento esperado = new ResultadoProcedimiento(null, "OK", null);
        when(jdbcTemplate.queryForObject(
                contains("sp_rrhh_confirmar_cambio_correo"),
                any(RowMapper.class),
                eq("hash123")))
                .thenReturn(esperado);

        ResultadoProcedimiento resultado = repository.confirmarCambioCorreo("hash123");

        assertEquals("OK", resultado.estado());
        verify(jdbcTemplate).queryForObject(
                contains("sp_rrhh_confirmar_cambio_correo"),
                any(RowMapper.class),
                eq("hash123"));
    }
}
