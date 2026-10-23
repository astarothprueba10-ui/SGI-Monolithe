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

class TrabajadorProcedureRepositoryCorreccionTest {

    private JdbcTemplate jdbcTemplate;
    private TrabajadorProcedureRepository repository;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        repository = new TrabajadorProcedureRepository(jdbcTemplate, new JsonMapper());
    }

    @Test
    @SuppressWarnings("unchecked")
    void debeInvocarProcedimientoListarSolicitudes() {
        ResultadoProcedimiento esperado = new ResultadoProcedimiento(null, "OK", null);
        when(jdbcTemplate.queryForObject(
                contains("sp_core_listar_solicitudes_correccion"),
                any(RowMapper.class),
                eq(1L)))
                .thenReturn(esperado);

        ResultadoProcedimiento resultado = repository.listarSolicitudesCorreccion(1L);

        assertEquals("OK", resultado.estado());
        verify(jdbcTemplate).queryForObject(
                contains("sp_core_listar_solicitudes_correccion"),
                any(RowMapper.class),
                eq(1L));
    }

    @Test
    @SuppressWarnings("unchecked")
    void debeInvocarProcedimientoObtenerDetalle() {
        ResultadoProcedimiento esperado = new ResultadoProcedimiento(null, "OK", null);
        when(jdbcTemplate.queryForObject(
                contains("sp_core_obtener_detalle_correccion"),
                any(RowMapper.class),
                eq(1L), eq(5L)))
                .thenReturn(esperado);

        ResultadoProcedimiento resultado = repository.obtenerDetalleCorreccion(1L, 5L);

        assertEquals("OK", resultado.estado());
        verify(jdbcTemplate).queryForObject(
                contains("sp_core_obtener_detalle_correccion"),
                any(RowMapper.class),
                eq(1L), eq(5L));
    }

    @Test
    @SuppressWarnings("unchecked")
    void debeInvocarProcedimientoResolverCorreccion() {
        ResultadoProcedimiento esperado = new ResultadoProcedimiento(null, "OK", null);
        when(jdbcTemplate.queryForObject(
                contains("sp_core_resolver_correccion_identidad"),
                any(RowMapper.class),
                eq(1L), eq(3L), eq("APROBAR"), isNull()))
                .thenReturn(esperado);

        ResultadoProcedimiento resultado =
                repository.resolverCorreccionIdentidad(1L, 3L, "APROBAR", null);

        assertEquals("OK", resultado.estado());
        verify(jdbcTemplate).queryForObject(
                contains("sp_core_resolver_correccion_identidad"),
                any(RowMapper.class),
                eq(1L), eq(3L), eq("APROBAR"), isNull());
    }

    @Test
    @SuppressWarnings("unchecked")
    void debeInvocarProcedimientoResolverConMotivo() {
        ResultadoProcedimiento esperado = new ResultadoProcedimiento(null, "OK", null);
        String motivo = "Documento no valido segun registros oficiales.";
        when(jdbcTemplate.queryForObject(
                contains("sp_core_resolver_correccion_identidad"),
                any(RowMapper.class),
                eq(1L), eq(3L), eq("RECHAZAR"), eq(motivo)))
                .thenReturn(esperado);

        ResultadoProcedimiento resultado =
                repository.resolverCorreccionIdentidad(1L, 3L, "RECHAZAR", motivo);

        assertEquals("OK", resultado.estado());
        verify(jdbcTemplate).queryForObject(
                contains("sp_core_resolver_correccion_identidad"),
                any(RowMapper.class),
                eq(1L), eq(3L), eq("RECHAZAR"), eq(motivo));
    }
}
