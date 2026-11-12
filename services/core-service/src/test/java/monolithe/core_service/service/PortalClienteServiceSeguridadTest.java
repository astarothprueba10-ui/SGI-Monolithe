package monolithe.core_service.service;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PortalClienteServiceSeguridadTest {

    @Test
    void soloIdentidadJwtPuedeConsultarResumen() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        PortalClienteService service=new PortalClienteService(jdbc,new JsonMapper());
        assertEquals(HttpStatus.UNAUTHORIZED,
                assertThrows(ResponseStatusException.class,
                        ()->service.resumenPrivado(null)).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,
                assertThrows(ResponseStatusException.class,
                        ()->service.resumenPrivado(0L)).getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void laConsultaNoRecibeIdentificadorDeCompradorNiDeVenta() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        PortalClienteService service=new PortalClienteService(jdbc,new JsonMapper());
        when(jdbc.queryForObject(anyString(),eq(String.class),any(Object[].class)))
                .thenReturn("{\"cliente\":{\"nombreMostrar\":\"Comprador\"},\"operaciones\":[]}");
        var respuesta=service.resumenPrivado(9L);
        assertEquals(0,respuesta.path("operaciones").size());
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_portal_cliente_resumen_v1"));
        assertFalse(sql.getValue().contains("FROM public.ven_ventas"));
        verifyNoMoreInteractions(jdbc);
    }

    @Test
    void lotesYContratosSoloSeConsultanConActorJwt() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        PortalClienteService service=new PortalClienteService(jdbc,new JsonMapper());
        assertEquals(HttpStatus.UNAUTHORIZED,
            assertThrows(ResponseStatusException.class,
                ()->service.lotesContratosPrivados(null)).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,
            assertThrows(ResponseStatusException.class,
                ()->service.lotesContratosPrivados(-1L)).getStatusCode());
        verifyNoInteractions(jdbc);
        when(jdbc.queryForObject(anyString(),eq(String.class),any(Object[].class)))
            .thenReturn("{\"total\":0,\"items\":[],\"fechaConsulta\":\"2026-11-11\"}");
        var resultado=service.lotesContratosPrivados(9L);
        assertEquals(0,resultado.path("total").asInt());
        assertTrue(resultado.path("items").isArray());
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_portal_cliente_lotes_contratos_v1"));
        assertFalse(sql.getValue().contains("FROM public.ven_ventas"));
        verifyNoMoreInteractions(jdbc);
    }

    @Test
    void cronogramaSoloConsultaPagosDeLaIdentidadJwt() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        PortalClienteService service=new PortalClienteService(jdbc,new JsonMapper());
        assertEquals(HttpStatus.UNAUTHORIZED,
            assertThrows(ResponseStatusException.class,
                ()->service.cronogramaPrivado(null)).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,
            assertThrows(ResponseStatusException.class,
                ()->service.cronogramaPrivado(-1L)).getStatusCode());
        verifyNoInteractions(jdbc);
        when(jdbc.queryForObject(anyString(),eq(String.class),any(Object[].class)))
            .thenReturn("{\"total\":0,\"items\":[],\"fuente\":\"APLICACIONES_CONFIRMADAS\"}");
        var resultado=service.cronogramaPrivado(9L);
        assertEquals(0,resultado.path("total").asInt());
        assertTrue(resultado.path("items").isArray());
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_portal_cliente_cronograma_v1"));
        assertFalse(sql.getValue().contains("FROM public.pag_cuotas"));
        verifyNoMoreInteractions(jdbc);
    }

    @Test
    void cronogramaRechazaUsuarioSinRolCliente() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        PortalClienteService service=new PortalClienteService(jdbc,new JsonMapper());
        when(jdbc.queryForObject(anyString(),eq(String.class),any(Object[].class)))
            .thenThrow(new DataAccessResourceFailureException(
                "PORTAL_ACCESO_DENEGADO|Identidad cliente no autorizada."));
        assertEquals(HttpStatus.FORBIDDEN,
            assertThrows(ResponseStatusException.class,
                ()->service.cronogramaPrivado(5L)).getStatusCode());
    }

    @Test
    void sinRolClienteNoPuedeObtenerMetadatosContractuales() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        PortalClienteService service=new PortalClienteService(jdbc,new JsonMapper());
        when(jdbc.queryForObject(anyString(),eq(String.class),any(Object[].class)))
            .thenThrow(new DataAccessResourceFailureException(
                "PORTAL_ACCESO_DENEGADO|Identidad cliente no autorizada."));
        var ex=assertThrows(ResponseStatusException.class,
            ()->service.lotesContratosPrivados(5L));
        assertEquals(HttpStatus.FORBIDDEN,ex.getStatusCode());
    }

    @Test
    void cuentaSinRolVigenteNoRevelaResumen() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        PortalClienteService service=new PortalClienteService(jdbc,new JsonMapper());
        when(jdbc.queryForObject(anyString(),eq(String.class),any(Object[].class)))
            .thenThrow(new DataAccessResourceFailureException(
                "PORTAL_ACCESO_DENEGADO|Identidad cliente no autorizada."));
        var error=assertThrows(ResponseStatusException.class,
            ()->service.resumenPrivado(5L));
        assertEquals(HttpStatus.FORBIDDEN,error.getStatusCode());
    }
}
