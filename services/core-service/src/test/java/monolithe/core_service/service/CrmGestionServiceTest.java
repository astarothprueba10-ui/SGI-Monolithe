package monolithe.core_service.service;

import monolithe.core_service.dto.AsignarAsesorCrmRequest;
import monolithe.core_service.dto.CambiarEtapaCrmRequest;
import monolithe.core_service.dto.RegistrarSeguimientoCrmRequest;
import monolithe.core_service.repository.CrmGestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CrmGestionServiceTest {
    private CrmGestionRepository repository;
    private CrmGestionService service;

    @BeforeEach
    void preparar() {
        repository = mock(CrmGestionRepository.class);
        service = new CrmGestionService(repository, new JsonMapper());
    }

    @Test
    void cambiaEtapaYNormalizaCodigo() {
        when(repository.cambiarEtapa(5L,4L,"INTERESADO","Tiene interes"))
                .thenReturn("{\"id_prospecto\":4,\"estado_codigo\":\"INTERESADO\"}");
        var resultado = service.cambiarEtapa(5L,4L,new CambiarEtapaCrmRequest(" interesado ","Tiene interes"));
        assertEquals("INTERESADO",resultado.path("estado_codigo").asString());
        verify(repository).cambiarEtapa(5L,4L,"INTERESADO","Tiene interes");
    }

    @Test
    void asignaAsesorConActorDelJwt() {
        when(repository.asignarAsesor(5L,4L,2L,"Captacion"))
                .thenReturn("{\"id_asesor\":2,\"sin_cambios\":false}");
        var resultado = service.asignarAsesor(5L,4L,new AsignarAsesorCrmRequest(2L,"Captacion"));
        assertEquals(2,resultado.path("id_asesor").asInt());
    }

    @Test
    void registraSeguimientoNormalizandoTipo() {
        var request = new RegistrarSeguimientoCrmRequest(" llamada "," Llamada inicial ","Conversamos",
                "Contactado",false,null);
        when(repository.registrarSeguimiento(5L,4L,"LLAMADA","Llamada inicial",
                "Conversamos","Contactado",false,null)).thenReturn("{\"id_seguimiento\":100}");
        var resultado=service.registrarSeguimiento(5L,4L,request);
        assertEquals(100L,resultado.path("id_seguimiento").asLong());
    }

    @Test
    void listaHistorialConLimite() {
        when(repository.listarSeguimientos(5L,4L,100))
                .thenReturn("[{\"id_seguimiento\":101},{\"id_seguimiento\":100}]");
        var resultado=service.listarSeguimientos(5L,4L,100);
        assertTrue(resultado.isArray());
        assertEquals(2,resultado.size());
    }

    @Test
    void rechazaSesionSinIdentidad() {
        var ex=assertThrows(ResponseStatusException.class,
                () -> service.listarSeguimientos(0L,4L,100));
        assertEquals(HttpStatus.UNAUTHORIZED,ex.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void rechazaFechaFuturaInnecesaria() {
        var request = new RegistrarSeguimientoCrmRequest("LLAMADA","Asunto",null,null,false,
                OffsetDateTime.now(ZoneOffset.UTC).plusDays(1));
        var ex=assertThrows(ResponseStatusException.class,
                () -> service.registrarSeguimiento(5L,4L,request));
        assertEquals(HttpStatus.BAD_REQUEST,ex.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void rechazaProximoSeguimientoVencido() {
        var request = new RegistrarSeguimientoCrmRequest("LLAMADA","Asunto",null,null,true,
                OffsetDateTime.now(ZoneOffset.UTC).minusDays(1));
        var ex=assertThrows(ResponseStatusException.class,
                () -> service.registrarSeguimiento(5L,4L,request));
        assertEquals(HttpStatus.BAD_REQUEST,ex.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void traduceDenegacionDeBaseDeDatosEn403() {
        when(repository.cambiarEtapa(anyLong(),anyLong(),anyString(),any()))
                .thenThrow(new DataIntegrityViolationException("ERROR: DENEGADO|El usuario no tiene acceso"));
        var ex=assertThrows(ResponseStatusException.class,
                () -> service.cambiarEtapa(5L,4L,new CambiarEtapaCrmRequest("INTERESADO",null)));
        assertEquals(HttpStatus.FORBIDDEN,ex.getStatusCode());
    }

    @Test
    void bloqueaModificacionDeCompradorVendido() {
        when(repository.cambiarEtapa(anyLong(),anyLong(),anyString(),any()))
                .thenThrow(new DataIntegrityViolationException("ERROR: VENTA_EXISTENTE|No se permite"));
        var ex=assertThrows(ResponseStatusException.class,
                () -> service.cambiarEtapa(5L,15L,new CambiarEtapaCrmRequest("INTERESADO",null)));
        assertEquals(HttpStatus.CONFLICT,ex.getStatusCode());
    }

    @Test
    void traduceFallaDeConexionSinExponerDatosInternos() {
        when(repository.listarSeguimientos(5L,4L,100))
                .thenThrow(new DataAccessResourceFailureException("postgres connection failed"));
        var ex=assertThrows(ResponseStatusException.class,
                () -> service.listarSeguimientos(5L,4L,100));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE,ex.getStatusCode());
        assertFalse(ex.getReason().contains("postgres"));
    }

    @Test
    void rechazaLimiteFueraDeRango() {
        var ex=assertThrows(ResponseStatusException.class,
                () -> service.listarSeguimientos(5L,4L,1000));
        assertEquals(HttpStatus.BAD_REQUEST,ex.getStatusCode());
        verifyNoInteractions(repository);
    }
}
