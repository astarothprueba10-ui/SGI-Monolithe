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
    void exportacionSeparacionesUtilizaProcedimientoAutorizado() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"items\":[],\"total\":0,\"pagina\":1,\"tamano\":100,\"paginas\":0}");
        var resultado = service.listarSeparacionesParaExportacion(5L, 1, 100);
        assertEquals(0, resultado.path("total").asInt());
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(), eq(String.class), any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_exportar_separaciones_v1"));
        assertFalse(sql.getValue().contains("FROM public.ven_reservas"));
    }

    @Test
    void exportacionVentasUtilizaProcedimientoConPermisos() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"items\":[],\"total\":0,\"pagina\":1,\"tamano\":100,\"paginas\":0}");
        var resultado = service.listarVentasParaExportacion(5L, 1, 100);
        assertEquals(0, resultado.path("total").asInt());
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(), eq(String.class), any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_exportar_ventas_v1"));
        assertFalse(sql.getValue().contains("FROM public.ven_ventas"));
    }

    @Test
    void exportacionVentasRechazaPaginacionInvalidaYActorAnonimo() {
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(
                ResponseStatusException.class,
                () -> service.listarVentasParaExportacion(null, 1, 100)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(
                ResponseStatusException.class,
                () -> service.listarVentasParaExportacion(5L, 0, 100)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(
                ResponseStatusException.class,
                () -> service.listarVentasParaExportacion(5L, 1, 101)).getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void exportacionSeparacionesRechazaPaginacionInvalidaAntesDeSQL() {
        var error = assertThrows(ResponseStatusException.class,
                () -> service.listarSeparacionesParaExportacion(5L, 0, 100));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        error = assertThrows(ResponseStatusException.class,
                () -> service.listarSeparacionesParaExportacion(5L, 1, 101));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void crmSinPeriodoRetieneFiltrosYAutorizacionSQL() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
            .thenReturn("{\"items\":[],\"total\":0}");
        var respuesta=service.buscarCarteraSinPeriodo(
          5L,null,null,null,null,false,"POTENCIAL",1,15,1L);
        assertEquals(0,respuesta.path("total").asInt());
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_buscar_v7"));
        assertTrue(sql.getValue().contains("CAST(NULL AS timestamptz)"));
    }

    @Test
    void datosPersonalesCrmUsanFuncionYNoPermitenIdsInvalidos() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
            .thenReturn("{\"idProspecto\":21,\"historial\":[]}");
        var resultado=service.datosPersonalesCrm(5L,21L);
        assertEquals(21,resultado.path("idProspecto").asInt());
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_datos_personales_edicion_v1"));
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
            ()->service.datosPersonalesCrm(5L,0L)).getStatusCode());
    }

    @Test
    void correccionPersonalExigeMotivoYObjetoJson() throws Exception {
        var mapper=new JsonMapper();
        var datos=mapper.readTree("{\"nombres\":\"Ana\"}");
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
            ()->service.corregirDatosPersonalesCrm(5L,21L,datos,"corto")).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
            ()->service.corregirDatosPersonalesCrm(5L,21L,null,"Corrección validada")).getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void correccionNormalizaSoloNombresYConservaIdentidadMotivoYActor() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class))).thenReturn("{\"estado\":\"OK\"}");
        var data = new JsonMapper().createObjectNode().put("nombres", "MARÍA elena").put("apellidoPaterno", "MUÑOZ").put("telefono", "987654321");
        service.corregirDatosPersonalesCrm(5L, 21L, data, "Corrección autorizada");
        var args = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).queryForObject(contains("sp_crm_corregir_datos_personales_v1"), eq(String.class), args.capture());
        assertEquals(5L, args.getValue()[0]); assertEquals(21L, args.getValue()[1]);
        var normalized = new JsonMapper().readTree((String) args.getValue()[2]);
        assertEquals("María Elena", normalized.path("nombres").asString());
        assertEquals("Muñoz", normalized.path("apellidoPaterno").asString());
        assertEquals("987654321", normalized.path("telefono").asString());
        assertEquals("Corrección autorizada", args.getValue()[3]);
        assertFalse(normalized.has("apellidoMaterno")); assertEquals("MARÍA elena", data.path("nombres").asString());
    }

    @Test
    void cronogramaVentaUsaProcedimientoYRechazaVentaInvalida() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
            .thenReturn("{\"tipoCronograma\":\"REGISTRADO\",\"items\":[]}");
        var cronograma=service.cronogramaVenta(5L,28L);
        assertEquals("REGISTRADO",cronograma.path("tipoCronograma").asString());
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_cronograma_venta_v1"));
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
            ()->service.cronogramaVenta(5L,-1L)).getStatusCode());
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
                "comprobante.png", "image/png", 1024L, null);
        var error = assertThrows(ResponseStatusException.class,
                () -> service.registrarSeparacion(5L, req));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void validacionVentaUsaSimuladorFrancesV9() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"elegible\":true,\"planFrances\":{\"sistema\":\"FRANCES\"}}");
        var req = new FormalizarVentaCrmRequest(
                5L, 92L, "FINANCIADA", new BigDecimal("30000.00"),
                new BigDecimal("7000.00"), 12, null, null, null, null);
        var respuesta = service.validar(5L, req);
        assertEquals("FRANCES",
                respuesta.path("planFrances").path("sistema").asString());
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(), eq(String.class), any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_validar_formalizacion_v9"));
    }

    @Test
    void registroVentaUsaProcedimiento() throws Exception {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"success\":true}");
        var comprobador = tools.jackson.databind.json.JsonMapper.builder().build()
                .readTree("{\"idProspecto\":1,\"nombres\":\"Prueba\"}");
        var req = new FormalizarVentaCrmRequest(
                1L, 74L, "CONTADO", new BigDecimal("29900.00"),
                null, null, null, null, comprobador,
                tools.jackson.databind.json.JsonMapper.builder().build().readTree("{\"metodoPago\":\"EFECTIVO\",\"comprobantes\":[]}"));
        var resultado = service.registrarVentaPendiente(5L, req);
        assertTrue(resultado.path("success").asBoolean(false));
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(), eq(String.class), any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_registrar_venta_pendiente_v13"));
    }

    @Test
    void consultaDatosCompradorUsaVersionConUbigeo() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"idProspecto\":5,\"idPais\":1,\"referencia\":\"Cerca del parque\"}");
        var resultado = service.datosCompradorParaVenta(5L, 5L);
        assertEquals(1, resultado.path("idPais").asInt());
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(), eq(String.class), any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_datos_comprador_para_venta_v3"));
    }

    @Test
    void registroSinRevisionDeCompradorRechazado() {
        var req = new FormalizarVentaCrmRequest(
                1L, 74L, "CONTADO", new BigDecimal("29900.00"),
                null, null, null, null, null, null);
        var error = assertThrows(ResponseStatusException.class,
                () -> service.registrarVentaPendiente(5L, req));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void registroVentaSinDatosPagoSeRechaza() throws Exception {
        var comprador = tools.jackson.databind.json.JsonMapper.builder().build()
                .readTree("{\"idProspecto\":1}");
        var req = new FormalizarVentaCrmRequest(
                1L, 74L, "CONTADO", new BigDecimal("29900.00"),
                null, null, null, null, comprador, null);
        var error = assertThrows(ResponseStatusException.class,
                () -> service.registrarVentaPendiente(5L, req));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void detalleVentaConsultaProcedimientoProtegido() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"idVenta\":27,\"modalidad\":\"CONTADO\",\"pago\":{\"comprobantes\":[]}}");
        var respuesta = service.detalleVenta(5L, 27L);
        assertEquals(27, respuesta.path("idVenta").asInt());
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(), eq(String.class), any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_detalle_venta_v1"));
    }

    @Test
    void obtenerRutaVoucherVentaSoloPorProcedimientoAutorizado() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"bucket\":\"vouchers-ventas-private\",\"nombre_archivo\":\"pago.pdf\"}");
        var respuesta = service.rutaComprobanteVenta(5L, 27L, 1L);
        assertEquals("vouchers-ventas-private", respuesta.path("bucket").asString());
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(), eq(String.class), any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_autorizar_lectura_comprobante_venta_v1"));
    }

    @Test
    void detalleYVouchersRechazanIdsInvalidosSinConsultarBase() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(
                ResponseStatusException.class, () -> service.detalleVenta(5L, 0L)
        ).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(
                ResponseStatusException.class, () -> service.rutaComprobanteVenta(5L, 27L, -1L)
        ).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(
                ResponseStatusException.class, () -> service.detalleVenta(null, 27L)
        ).getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void historialRechazaLoteInvalido() {
        var error = assertThrows(ResponseStatusException.class,
                () -> service.historialComercialLote(5L, 0L));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(jdbc);
    }
}
