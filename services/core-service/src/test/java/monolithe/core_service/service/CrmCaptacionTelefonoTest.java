package monolithe.core_service.service;

import monolithe.core_service.dto.RegistrarProspectoRequest;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.CrmCaptacionRepository;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.json.JsonMapper;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CrmCaptacionTelefonoTest {
    private final CrmCaptacionRepository repository = mock(CrmCaptacionRepository.class);
    private final CrmCaptacionService service = new CrmCaptacionService(repository, new JsonMapper());

    @ParameterizedTest
    @ValueSource(strings = {"98765432", "812345678", "+34912345678", "+120155501230"})
    void unTelefonoInvalidoNoLlegaAlProcedimientoDeRegistro(String telefono) {
        assertThrows(ReglaNegocioException.class, () -> service.registrarProspecto(1L, solicitud(telefono)));
        verifyNoInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"987654321", "+51987654321", "+573211234567", "+34612345678", "+12015550123"})
    void registraElFormatoValidadoSinCambiarOtrosDatosDelLead(String telefono) {
        when(repository.registrar(any(), eq(1L), anyString())).thenReturn("{\"estado\":\"REGISTRADO\"}");
        service.registrarProspecto(1L, solicitud(telefono));
        verify(repository).registrar(any(), eq(1L), argThat(payload -> payload.contains("\"telefono\":\"" + telefono + "\"")));
    }

    private RegistrarProspectoRequest solicitud(String telefono) {
        return new RegistrarProspectoRequest(UUID.randomUUID(), "Lucía", "Prueba", "Ejemplo", "prueba@example.com", telefono,
                1L, "WEB", "Consulta de un lote", null, null, null, "DNI", "00000001", null);
    }
}
