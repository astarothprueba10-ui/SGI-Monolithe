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
    void preautorizacionYRegistroCuotaSoloLlamanAlSqlProtegido() {
        var req=new monolithe.core_service.dto.PrepararCargaVoucherCuotaRequest(
          2016L,120161L,new BigDecimal("40.00"),1,
          java.time.LocalDate.of(2026,11,11),"OP-CI-1","voucher.pdf",
          "application/pdf",1200L);
        when(jdbc.queryForObject(anyString(),eq(String.class),any(Object[].class)))
          .thenReturn("{\"idCarga\":\"11111111-2222-3333-4444-555555555555\"}");
        var r=service.prepararCargaVoucherCuota(5L,req);
        assertEquals("11111111-2222-3333-4444-555555555555",
          r.path("idCarga").asString());
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_fin_preparar_carga_voucher_cuota_v1"));
        assertFalse(sql.getValue().toUpperCase().contains("UPDATE PUBLIC.PAG_CUOTAS"));
        clearInvocations(jdbc);
        when(jdbc.queryForObject(anyString(),eq(String.class),any(Object[].class)))
          .thenReturn("{\"idPago\":123,\"idVoucher\":124,\"saldoAplicado\":0,\"reutilizado\":false}");
        var pagado=service.registrarVoucherCuotaPendiente(5L,
          java.util.UUID.fromString("11111111-2222-3333-4444-555555555555"));
        assertEquals(0,pagado.path("saldoAplicado").asInt());
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_fin_registrar_voucher_cuota_pendiente_v1"));
    }

    @Test
    void registroCuotaValidaActorImportesYReferenciasAntesDeSql() {
        var req=new monolithe.core_service.dto.PrepararCargaVoucherCuotaRequest(
          2L,37L,new BigDecimal("150.00"),6,
          java.time.LocalDate.of(2026,11,11),null,"abono.pdf",
          "application/pdf",800L);
        assertEquals(HttpStatus.UNAUTHORIZED,assertThrows(ResponseStatusException.class,
          ()->service.prepararCargaVoucherCuota(null,req)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
          ()->service.prepararCargaVoucherCuota(5L,
            new monolithe.core_service.dto.PrepararCargaVoucherCuotaRequest(
              2L,37L,new BigDecimal("150.00"),6,req.fechaOperacion(),
              null,"abono.pdf","application/pdf",5242881L))).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
          ()->service.prepararCargaVoucherCuota(5L,
            new monolithe.core_service.dto.PrepararCargaVoucherCuotaRequest(
              2L,37L,new BigDecimal("0.001"),6,req.fechaOperacion(),
              null,"abono.pdf","application/pdf",800L))).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
          ()->service.registrarVoucherCuotaPendiente(5L,null)).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,assertThrows(ResponseStatusException.class,
          ()->service.registrarVoucherCuotaPendiente(null,
              java.util.UUID.randomUUID())).getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void bandejaVouchersCuotasRequierePermisosFinancierosEnSql() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"items\":[],\"total\":0,\"pagina\":1,\"tamano\":20,\"paginas\":1}");
        var resultado=service.listarVouchersCuotas(5L,"TODOS",null,1,20);
        assertEquals(0,resultado.path("total").asInt());
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_finanzas_listar_vouchers_cuotas_v1"));
        clearInvocations(jdbc);
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"bucket\":\"vouchers-ventas-private\",\"clave_archivo\":\"ventas/p-3/l-1/11111111-2222-3333-4444-555555555555.pdf\"}");
        var ruta=service.obtenerRutaVoucherCuota(5L,103L);
        assertEquals("vouchers-ventas-private",ruta.path("bucket").asText());
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_finanzas_obtener_ruta_voucher_cuota_v1"));
    }

    @Test
    void vouchersCuotasRechazanFiltrosInvalidosSinAccederALaBase() {
        assertEquals(HttpStatus.UNAUTHORIZED,assertThrows(ResponseStatusException.class,
                ()->service.listarVouchersCuotas(null,"TODOS",null,1,20)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
                ()->service.listarVouchersCuotas(5L,"OTRO",null,1,20)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
                ()->service.listarVouchersCuotas(5L,"TODOS",null,1,101)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
                ()->service.listarVouchersCuotas(5L,"TODOS",null,0,20)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
                ()->service.obtenerRutaVoucherCuota(5L,-1L)).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,assertThrows(ResponseStatusException.class,
                ()->service.obtenerRutaVoucherCuota(null,1L)).getStatusCode());
        verifyNoInteractions(jdbc);
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
    void revisionTresCuotasConsecutivasConsultaSinModificarContratos() {
        when(jdbc.queryForObject(anyString(),eq(String.class),any(Object[].class)))
            .thenReturn("{\"total\":1,\"montoEnRevision\":260,"
              + "\"resolucionAutomatica\":false,\"items\":[{\"cuotasConsecutivas\":3}]}");
        var resultado=service.revisarTresCuotasConsecutivas(5L,1,20);
        assertEquals(1,resultado.path("total").asInt());
        assertFalse(resultado.path("resolucionAutomatica").asBoolean());
        assertEquals(3,resultado.path("items").get(0).path("cuotasConsecutivas").asInt());
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_fin_alertas_resolutoria_v1"));
        assertFalse(sql.getValue().toUpperCase().contains("UPDATE "));
        assertFalse(sql.getValue().toUpperCase().contains("DELETE "));
        clearInvocations(jdbc);
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
          ()->service.revisarTresCuotasConsecutivas(5L,0,20)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
          ()->service.revisarTresCuotasConsecutivas(5L,1,101)).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,assertThrows(ResponseStatusException.class,
          ()->service.revisarTresCuotasConsecutivas(null,1,20)).getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void alertasCuotasRestringeParametrosYConsultaProcedimientoSeguro() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"total\":2,\"vencidas\":1,\"proximas\":1,\"items\":[]}");
        var resultado=service.alertasCuotas(5L,"CUOTA_VENCIDA",1,20);
        assertEquals(2,resultado.path("total").asInt());
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_fin_alertas_cuotas_v1"));
        clearInvocations(jdbc);
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
            ()->service.alertasCuotas(5L,"MORA_FICTICIA",1,20)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
            ()->service.alertasCuotas(5L,"TODAS",0,20)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
            ()->service.alertasCuotas(5L,"TODAS",1,500)).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,assertThrows(ResponseStatusException.class,
            ()->service.alertasCuotas(null,"TODAS",1,20)).getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void prepararAvisosSoloInvocaProcedimientoDePortalYSinEnviarCorreo() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"creados\":1,\"deduplicados\":0,\"enviosExternos\":false}");
        var respuesta=service.prepararAvisosCuotasPortal(5L,100);
        assertEquals(1,respuesta.path("creados").asInt());
        assertFalse(respuesta.path("enviosExternos").asBoolean());
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_fin_preparar_avisos_portal_v1"));
        clearInvocations(jdbc);
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
            ()->service.prepararAvisosCuotasPortal(5L,0)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
            ()->service.prepararAvisosCuotasPortal(5L,501)).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,assertThrows(ResponseStatusException.class,
            ()->service.prepararAvisosCuotasPortal(null,100)).getStatusCode());
        verifyNoInteractions(jdbc);
    }

    @Test
    void cronogramaVentaUsaProcedimientoYRechazaVentaInvalida() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
            .thenReturn("{\"tipoCronograma\":\"REGISTRADO\",\"items\":[]}");
        var cronograma=service.cronogramaVenta(5L,28L);
        assertEquals("REGISTRADO",cronograma.path("tipoCronograma").asString());
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_cronograma_venta_v4"));
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
    void validacionVentaUsaSimuladorFrancesV10() {
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
        assertTrue(sql.getValue().contains("sp_crm_validar_formalizacion_v10"));
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
        assertTrue(sql.getValue().contains("sp_crm_registrar_venta_pendiente_v14"));
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
    void saldoVentaYClienteConsultanProcedimientosProtegidos() {
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"idVenta\":2,\"tipoSaldo\":\"FINANCIADA\",\"saldoFinanciamiento\":84000}");
        var venta = service.saldoVenta(5L,2L);
        assertEquals(84000,venta.path("saldoFinanciamiento").asInt());
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_saldo_venta_v1"));
        clearInvocations(jdbc);
        when(jdbc.queryForObject(anyString(), eq(String.class), any(Object[].class)))
                .thenReturn("{\"idCliente\":2,\"numeroVentas\":1,\"saldoFinanciamientoActivo\":84000}");
        var cliente = service.saldoCliente(5L,2L);
        assertEquals(1,cliente.path("numeroVentas").asInt());
        verify(jdbc).queryForObject(sql.capture(),eq(String.class),any(Object[].class));
        assertTrue(sql.getValue().contains("sp_crm_saldo_cliente_v1"));
    }

    @Test
    void saldosRechazanActorOIdsInvalidosSinAccederALaBase() {
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
                () -> service.saldoVenta(5L,0L)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
                () -> service.saldoCliente(5L,-1L)).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,assertThrows(ResponseStatusException.class,
                () -> service.saldoVenta(null,2L)).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,assertThrows(ResponseStatusException.class,
                () -> service.saldoCliente(null,2L)).getStatusCode());
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
