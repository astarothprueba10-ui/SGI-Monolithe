package monolithe.auth_service.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import monolithe.auth_service.dto.MfaPortal;
import monolithe.auth_service.repository.LoginDeviceRepository;
import monolithe.auth_service.repository.LoginDeviceRepository.Registration;
import monolithe.auth_service.repository.MfaInvitationRepository;
import monolithe.auth_service.security.MfaCrypto;
import monolithe.auth_service.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mail.MailSendException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.AdditionalMatchers.aryEq;
import static org.mockito.Mockito.*;

class LoginDeviceServiceTest {
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-11-28T03:30:00Z");
    private static final String TOKEN = "A".repeat(43);
    private final LoginDeviceRepository devices = mock(LoginDeviceRepository.class);
    private final MfaInvitationRepository contacts = mock(MfaInvitationRepository.class);
    private final MfaCrypto crypto = mock(MfaCrypto.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final EmailService mail = mock(EmailService.class);
    private final LoginDeviceService service = new LoginDeviceService(devices, contacts, crypto, events, mail);
    private final UserPrincipal user = new UserPrincipal(8L, "prueba", "hash",
            List.of(), true, true, false, 2L);

    @Test
    void recuerdaHastaLaMedianocheLocalYReemplazaUnIdentificadorNoEmitido() {
        when(crypto.challenge()).thenReturn(TOKEN);
        assertEquals(TOKEN, service.register(user, MfaPortal.BACKOFFICE, "B".repeat(43), true, NOW));
        var captured = ArgumentCaptor.forClass(Registration.class);
        verify(devices).record(captured.capture());
        var registration = captured.getValue();
        assertEquals(8L, registration.user());
        assertEquals(2L, registration.version());
        assertEquals(OffsetDateTime.parse("2026-11-28T00:00:00-05:00"), registration.trustedUntil());
        assertArrayEquals(MfaCrypto.digest(TOKEN), registration.device());
        verifyNoInteractions(contacts, events, mail);
    }

    @Test
    void reconoceUnNavegadorSinDarPermisoSiLaCasillaNoEstaMarcada() {
        when(devices.issued(aryEq(MfaCrypto.digest(TOKEN)))).thenReturn(true);
        assertEquals(TOKEN, service.register(user, MfaPortal.CLIENTE, TOKEN, false, NOW));
        var captured = ArgumentCaptor.forClass(Registration.class);
        verify(devices).record(captured.capture());
        assertNull(captured.getValue().trustedUntil());
        verifyNoInteractions(crypto, events, mail);
    }

    @Test
    void preparaLaAlertaDelNuevoEquipoSoloParaElCorreoVerificado() {
        when(crypto.challenge()).thenReturn(TOKEN);
        when(devices.differentDevice(eq(8L), aryEq(MfaCrypto.digest(TOKEN)))).thenReturn(true);
        when(contacts.correoVerificado(8L)).thenReturn(Optional.of("prueba@example.com"));
        service.register(user, MfaPortal.CLIENTE, null, false, NOW);
        var captured = ArgumentCaptor.forClass(LoginDeviceService.NewDevice.class);
        verify(events).publishEvent(captured.capture());
        var notice = captured.getValue();
        assertEquals("prueba@example.com", notice.email());
        assertEquals(NOW.toInstant(), notice.when().toInstant());
        verifyNoInteractions(mail);
        doThrow(new MailSendException("SMTP no disponible")).when(mail)
                .enviarAvisoNuevoDispositivo(notice.email(), notice.portal(), notice.when());
        assertDoesNotThrow(() -> service.sendNewDeviceNotice(notice));
    }
}
