package monolithe.core_service.service;

import monolithe.core_service.dto.FormalizarVentaCrmRequest;
import monolithe.core_service.dto.RegistrarSeparacionCrmRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CrmVentaServiceSeguridadTest {
    private JdbcTemplate jdbc;
    private CrmVentaService service;

    @BeforeEach
    void iniciar() {
        jdbc = mock(JdbcTemplate.class);
        service = new CrmVentaService(jdbc, new JsonMapper());
    }

    @Test
    void rechazaActorNoAutenticadoAntesDeConsultar() {
        var error = assertThrows(ResponseStatusException.class,
                () -> service.listarOperaciones(null, "", "", 1, 20));
        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void rechazaPaginacionYFiltrosInvalidos() {
        var error = assertThrows(ResponseStatusException.class,
                () -> service.listarOperaciones(5L, "", "", 0, 20));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        error = assertThrows(ResponseStatusException.class,
                () -> service.listarOperaciones(5L, "", "", 1, 101));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        error = assertThrows(ResponseStatusException.class,
                () -> service.listarOperaciones(5L, "OTRO", "", 1, 20));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void listadoConsultaSoloFuncionAlmacenada() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"items\":[],\"total\":0,\"pagina\":1,\"tamano\":20,\"paginas\":0}");
        var resultado = service.listarOperaciones(5L, null, null, 1, 20);
        assertTrue(resultado.path("items").isArray());
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(), eq(String.class), any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_listar_operaciones_v1"));
        assertFalse(sql.getValue().contains("FROM public.ven_ventas"));
    }

    @Test
    void historialComercialAceptaArregloJson() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("[{\"tipo\":\"VENTA\",\"id\":22}]");
        var resultado = service.historialComercialLote(5L, 74L);
        assertTrue(resultado.isArray());
        assertEquals(1, resultado.size());
    }

    @Test
    void separacionRechazaMontoDiferenteDeQuinientos() {
        var req = new RegistrarSeparacionCrmRequest(
                1L, 74L, "TRANSFERENCIA", "OP-01",
                new BigDecimal("499.99"), null, "comprobante.png",
                "comprobante.png", "image/png", 1024L, null,
                "CONTADO");
        var error = assertThrows(ResponseStatusException.class,
                () -> service.registrarSeparacion(5L, req));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void registroVentaUsaProcedimiento() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"success\":true}");
        var req = new FormalizarVentaCrmRequest(
                1L, 74L, "CONTADO", new BigDecimal("29900.00"),
                null, null, null);
        var resultado = service.registrarVentaPendiente(5L, req);
        assertTrue(resultado.path("success").asBoolean(false));
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(), eq(String.class), any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_registrar_venta_pendiente_v6"));
    }

    @Test
    void historialRechazaLoteInvalido() {
        var error = assertThrows(ResponseStatusException.class,
                () -> service.historialComercialLote(5L, 0L));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(jdbc);
    }
}
