package monolithe.core_service.service;

import monolithe.core_service.dto.ActualizarPrecioManualRequest;
import monolithe.core_service.dto.LotePrecioRequest;
import monolithe.core_service.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LotePrecioServiceIntegridadTest {
    private final LoteRepository lotes = mock(LoteRepository.class);
    private final LotePrecioRepository precios = mock(LotePrecioRepository.class);
    private final LotePrecioService servicio = new LotePrecioService(
            lotes, mock(EtapaComercialRepository.class), mock(MonedaRepository.class),
            mock(TipoTarifaRepository.class), mock(TipoAjustePrecioRepository.class),
            mock(TarifaZonaEtapaRepository.class), mock(AjusteTipoLoteRepository.class), precios);

    @BeforeEach
    void accesoIncompleto() {
        when(precios.puedeVerificarIntegridadPrecio()).thenReturn(false);
    }

    @Test
    void actualizacionManualSeDetieneAntesDeConsultarOModificarLotes() {
        var error = assertThrows(ResponseStatusException.class,
                () -> servicio.actualizarPrecioManual(1L,
                        new ActualizarPrecioManualRequest(new BigDecimal("25000.00"), null)));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        verificarSinCambios();
    }

    @Test
    void registroManualSeDetieneAntesDeConsultarOModificarLotes() {
        var error = assertThrows(ResponseStatusException.class,
                () -> servicio.registrarManual(1L, new BigDecimal("25000.00")));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        verificarSinCambios();
    }

    @Test
    void calculoSeDetieneAntesDeConsultarOModificarLotes() {
        var error = assertThrows(ResponseStatusException.class,
                () -> servicio.calcularYRegistrar(
                        new LotePrecioRequest(1L, 1L, "PEN", "POR_M2", null, null)));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        verificarSinCambios();
    }

    private void verificarSinCambios() {
        verify(precios).puedeVerificarIntegridadPrecio();
        verifyNoMoreInteractions(precios);
        verifyNoInteractions(lotes);
    }
}
