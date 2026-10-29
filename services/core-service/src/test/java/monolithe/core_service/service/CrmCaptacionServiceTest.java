package monolithe.core_service.service;

import monolithe.core_service.dto.RegistrarProspectoRequest;
import monolithe.core_service.repository.CrmCaptacionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CrmCaptacionServiceTest {
        private final CrmCaptacionRepository repository = mock(CrmCaptacionRepository.class);
        private final CrmCaptacionService service = new CrmCaptacionService(repository, new JsonMapper());

        private RegistrarProspectoRequest solicitud() {
                return new RegistrarProspectoRequest(
                                UUID.fromString("fed36432-0a40-433d-9b23-83ab9869f299"),
                                "Ana", "Perez", "Lopez", "ana@example.com", "+51999999999",
                                2L, "REFERIDO", "Interes en un lote", "Consulta inicial",
                                null, null, "DNI", "72635489", "Av. Los Incas 123, Chiclayo");
        }

        @Test
        void registraUsandoIdActorConfiableYIdempotencia() {
                when(repository.registrar(eq(solicitud().idSolicitud()), eq(5L), anyString()))
                                .thenReturn("{\"estado\":\"REGISTRADO\",\"idPersona\":50,\"idProspecto\":60}");
                var result = service.registrarProspecto(5L, solicitud());
                assertEquals("REGISTRADO", result.path("estado").asString());
                assertEquals(60, result.path("idProspecto").asInt());
                verify(repository).registrar(eq(solicitud().idSolicitud()), eq(5L),
                                argThat(json -> !json.contains("idActor") && json.contains("\"idProyecto\":2")));
        }

        @Test
        void reportaConflictoCuandoLaPersonaNecesitaIdentificacion() {
                when(repository.registrar(any(), eq(5L), anyString()))
                                .thenReturn("{\"estado\":\"REQUIERE_IDENTIFICACION\",\"mensaje\":\"Revise su identidad\"}");
                var ex = assertThrows(ResponseStatusException.class,
                                () -> service.registrarProspecto(5L, solicitud()));
                assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        }

        @Test
        void rechazaUsuarioSinAutorizacionEnLaBase() {
                when(repository.registrar(any(), eq(5L), anyString()))
                                .thenThrow(new DataIntegrityViolationException("DENEGADO|Sin permiso"));
                var ex = assertThrows(ResponseStatusException.class,
                                () -> service.registrarProspecto(5L, solicitud()));
                assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        }
}
