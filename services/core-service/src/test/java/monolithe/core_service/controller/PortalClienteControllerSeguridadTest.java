package monolithe.core_service.controller;

import java.lang.reflect.Method;
import java.util.List;
import java.util.UUID;

import monolithe.core_service.config.SecurityConfig;
import monolithe.core_service.service.CrmSeparacionStorageService;
import monolithe.core_service.service.PortalClienteService;
import monolithe.core_service.service.PortalDocumentoStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Contrato de transporte 5.4.6.
 * Los filtros Spring validan firma JWT en runtime; esta clase prueba extracción,
 * mapeo de autoridad, anotaciones restrictivas y cabeceras no-store.
 */
class PortalClienteControllerSeguridadTest {
    private static Jwt jwt(String sub, List<String> roles) {
        return Jwt.withTokenValue("jwt-sintetico")
                .header("alg","HS256")
                .subject(sub)
                .claim("authorities",roles)
                .build();
    }

    private static PortalClienteController controller(PortalClienteService service,
            CrmSeparacionStorageService storage,
            PortalDocumentoStorageService documents) {
        return new PortalClienteController(service,storage,documents);
    }

    @Test
    void autoridadesJwtSeMapeanSinCambiarPrefijo() {
        var converter = new SecurityConfig().jwtAuthenticationConverter();
        var convertido = converter.convert(jwt("9",List.of("ROLE_CLIENTE")));
        assertNotNull(convertido);
        assertTrue(convertido.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_CLIENTE")));
        var empleado = converter.convert(jwt("5",List.of("ROLE_ASESOR")));
        assertNotNull(empleado);
        assertFalse(empleado.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_CLIENTE")));
    }

    @Test
    void todaRutaDelPortalExigeRolCliente() {
        int rutas = 0;
        for (Method method : PortalClienteController.class.getDeclaredMethods()) {
            if (method.isAnnotationPresent(GetMapping.class)
                    || method.isAnnotationPresent(PostMapping.class)) {
                rutas++;
                PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);
                assertNotNull(annotation,"Ruta sin @PreAuthorize: "+method.getName());
                assertEquals("hasAuthority('ROLE_CLIENTE')", annotation.value(),
                        "Ruta con permiso distinto: "+method.getName());
            }
        }
        assertEquals(9,rutas,"El contrato de rutas cambió; revisar seguridad.");
    }

    @Test
    void todasLasConsultasUsanElSubJwtYNuncaUnParametroDeUsuario() {
        var service = mock(PortalClienteService.class);
        var storage = mock(CrmSeparacionStorageService.class);
        var documents = mock(PortalDocumentoStorageService.class);
        var c = controller(service,storage,documents);
        var mapper = new JsonMapper();
        var payload = mapper.readTree("{\"items\":[],\"total\":0}");
        when(service.documentosPrivados(9L)).thenReturn(payload);
        when(service.vouchersPrivados(9L)).thenReturn(payload);
        when(service.alertasPrivadas(9L)).thenReturn(payload);
        when(service.cronogramaPrivado(9L)).thenReturn(payload);
        when(service.lotesContratosPrivados(9L)).thenReturn(payload);
        when(service.resumenPrivado(9L)).thenReturn(payload);
        Jwt buyer = jwt("9",List.of("ROLE_CLIENTE"));

        assertEquals("no-store",c.documentos(buyer).getHeaders().getCacheControl());
        assertEquals("no-store",c.vouchers(buyer).getHeaders().getCacheControl());
        assertEquals("no-store",c.alertas(buyer).getHeaders().getCacheControl());
        assertEquals("no-store",c.cronograma(buyer).getHeaders().getCacheControl());
        assertEquals("no-store",c.lotesContratos(buyer).getHeaders().getCacheControl());
        assertEquals("no-store",c.resumen(buyer).getHeaders().getCacheControl());

        verify(service).documentosPrivados(9L);
        verify(service).vouchersPrivados(9L);
        verify(service).alertasPrivadas(9L);
        verify(service).cronogramaPrivado(9L);
        verify(service).lotesContratosPrivados(9L);
        verify(service).resumenPrivado(9L);
        verifyNoInteractions(storage,documents);
    }

    @Test
    void rechazaIdentidadesJwtInexistentesONoNumericasAntesDeConsultar() {
        var service=mock(PortalClienteService.class);
        var storage=mock(CrmSeparacionStorageService.class);
        var docs=mock(PortalDocumentoStorageService.class);
        var c=controller(service,storage,docs);
        assertEquals(HttpStatus.UNAUTHORIZED,
                assertThrows(ResponseStatusException.class,
                        ()->c.vouchers(null)).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,
                assertThrows(ResponseStatusException.class,
                        ()->c.documentos(jwt("no-numerico",List.of("ROLE_CLIENTE"))))
                        .getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,
                assertThrows(ResponseStatusException.class,
                        ()->c.alertas(jwt("-1",List.of("ROLE_CLIENTE"))))
                        .getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,
                assertThrows(ResponseStatusException.class,
                        ()->c.registrarVoucher(jwt("0",List.of("ROLE_CLIENTE")),
                                null,"CUOTA")).getStatusCode());
        verifyNoInteractions(service,storage,docs);
    }

    @Test
    void documentosRevalidanActorYIdEnElServicioServidor() {
        var service=mock(PortalClienteService.class);
        var storage=mock(CrmSeparacionStorageService.class);
        var docs=mock(PortalDocumentoStorageService.class);
        var c=controller(service,storage,docs);
        var jwt=jwt("9",List.of("ROLE_CLIENTE"));
        when(docs.firmarLectura(9L,"CONTRATO",93003L))
            .thenReturn(new PortalDocumentoStorageService.EnlaceLecturaPortal(
                "https://example.invalid/firma?token=synthetic","contrato.pdf",
                "application/pdf",120));
        var response=c.enlaceDocumento(jwt,"CONTRATO",93003L);
        assertEquals(120,response.getBody().expiresInSeconds());
        assertEquals("no-store",response.getHeaders().getCacheControl());
        verify(docs).firmarLectura(9L,"CONTRATO",93003L);
        verifyNoInteractions(service,storage);
    }
}
