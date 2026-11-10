package monolithe.core_service.service;

import monolithe.core_service.client.ConsultaDniClient;
import monolithe.core_service.dto.ConsultaPersonaCrmRequest;
import monolithe.core_service.dto.DatosPersonaCrm;
import monolithe.core_service.exception.ConsultaIdentidadNoDisponibleException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.CrmPersonaConsultaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CrmPersonaConsultaServiceTest {
    private CrmPersonaConsultaRepository repository;
    private ConsultaDniClient provider;
    private CrmPersonaConsultaService service;
    private final DatosPersonaCrm persona = new DatosPersonaCrm("Lucía", "Prueba", "Ejemplo");

    @BeforeEach
    void preparar() {
        repository = mock(CrmPersonaConsultaRepository.class);
        provider = mock(ConsultaDniClient.class);
        service = new CrmPersonaConsultaService(repository, provider);
    }

    @ParameterizedTest
    @CsvSource({"DNI,00000001", "RUC,10000000001", "CE,000000001", "PASAPORTE,A00001"})
    void priorizaLaPersonaLocalSinConsumirElProveedor(String tipo, String numero) {
        when(repository.buscar(tipo, numero)).thenReturn(Optional.of(persona));
        var response = service.consultar(new ConsultaPersonaCrmRequest(tipo, numero));
        assertEquals("ENCONTRADO", response.estado());
        assertEquals("MONOLITHE", response.fuente());
        assertEquals(persona, response.persona());
        verifyNoInteractions(provider);
    }

    @Test
    void consultaElDniNuevoEnElProveedor() {
        when(repository.buscar("DNI", "00000001")).thenReturn(Optional.empty());
        when(provider.consultar("00000001")).thenReturn(Optional.of(persona));
        var response = service.consultar(new ConsultaPersonaCrmRequest("DNI", "00000001"));
        assertEquals("DNI", response.fuente());
        assertEquals("00000001", response.numeroDocumento());
        assertEquals(persona, response.persona());
    }

    @Test
    void noInventaPersonasNiHaceConsultasExternasParaOtrosDocumentos() {
        when(repository.buscar("CE", "000000001")).thenReturn(Optional.empty());
        var response = service.consultar(new ConsultaPersonaCrmRequest("CE", "000000001"));
        assertEquals("NO_ENCONTRADO", response.estado());
        assertNull(response.persona());
        verifyNoInteractions(provider);
    }

    @Test
    void permiteRegistroManualCuandoElProveedorNoEstaDisponible() {
        when(repository.buscar("DNI", "00000001")).thenReturn(Optional.empty());
        when(provider.consultar("00000001")).thenThrow(new ConsultaIdentidadNoDisponibleException());
        var response = service.consultar(new ConsultaPersonaCrmRequest("DNI", "00000001"));
        assertEquals("NO_DISPONIBLE", response.estado());
        assertNull(response.persona());
    }

    @Test
    void distingueElDniNoEncontradoDeUnaFallaDelProveedor() {
        when(repository.buscar("DNI", "00000001")).thenReturn(Optional.empty());
        when(provider.consultar("00000001")).thenReturn(Optional.empty());
        assertEquals("NO_ENCONTRADO", service.consultar(new ConsultaPersonaCrmRequest("DNI", "00000001")).estado());
    }

    @ParameterizedTest
    @CsvSource({"DNI,123", "DNI,ABCDEFGH", "RUC,12345678", "CE,12345678", "PASAPORTE,A1234", "OTRO,12345678"})
    void rechazaDocumentosInvalidosSinConsultarFuentes(String tipo, String numero) {
        assertThrows(ReglaNegocioException.class, () -> service.consultar(new ConsultaPersonaCrmRequest(tipo, numero)));
        verifyNoInteractions(repository, provider);
    }
}
