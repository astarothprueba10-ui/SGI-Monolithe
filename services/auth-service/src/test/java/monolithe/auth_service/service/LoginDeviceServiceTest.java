package monolithe.auth_service.service;

import java.time.OffsetDateTime;
import java.util.List;
import monolithe.auth_service.dto.MfaPortal;
import monolithe.auth_service.repository.LoginDeviceRepository;
import monolithe.auth_service.repository.LoginDeviceRepository.Registration;
import monolithe.auth_service.security.MfaCrypto;
import monolithe.auth_service.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.AdditionalMatchers.aryEq;
import static org.mockito.Mockito.*;

class LoginDeviceServiceTest {
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-11-28T03:30:00Z");
    private static final String TOKEN = "A".repeat(43);
    private final LoginDeviceRepository devices = mock(LoginDeviceRepository.class);
    private final MfaCrypto crypto = mock(MfaCrypto.class);
    private final LoginDeviceService service = new LoginDeviceService(devices, crypto);
    private final UserPrincipal user = new UserPrincipal(8L, "prueba", "hash",
            List.of(), true, true, false, 2L);

    @Test
    void recuerdaHastaLaMedianocheLocalYReemplazaUnIdentificadorNoEmitido() {
        when(crypto.challenge()).thenReturn(TOKEN);
        assertEquals(TOKEN, service.register(user, MfaPortal.BACKOFFICE, "B".repeat(43), true, NOW));
        var captured = ArgumentCaptor.forClass(Registration.class);
        verify(devices).record(captured.capture(), isNull());
        var registration = captured.getValue();
        assertEquals(8L, registration.user());
        assertEquals(2L, registration.version());
        assertEquals(OffsetDateTime.parse("2026-11-28T00:00:00-05:00"), registration.trustedUntil());
        assertArrayEquals(MfaCrypto.digest(TOKEN), registration.device());
    }

    @Test
    void reconoceUnNavegadorSinDarPermisoSiLaCasillaNoEstaMarcada() {
        when(devices.issued(aryEq(MfaCrypto.digest(TOKEN)))).thenReturn(true);
        assertEquals(TOKEN, service.register(user, MfaPortal.CLIENTE, TOKEN, false, NOW));
        var captured = ArgumentCaptor.forClass(Registration.class);
        verify(devices).record(captured.capture(), isNull());
        assertNull(captured.getValue().trustedUntil());
        verifyNoInteractions(crypto);
    }

    @Test
    void dejaElAvisoPendienteAunqueNoSeMarqueRecordarEquipo() {
        when(crypto.challenge()).thenReturn(TOKEN);
        when(devices.differentDevice(eq(8L), aryEq(MfaCrypto.digest(TOKEN)))).thenReturn(true);
        service.register(user, MfaPortal.CLIENTE, null, false, NOW);
        var captured = ArgumentCaptor.forClass(Registration.class);
        verify(devices).record(captured.capture(), eq(NOW));
        assertNull(captured.getValue().trustedUntil());
    }
}
