package monolithe.auth_service.service;

import jakarta.mail.internet.MimeMessage;
import java.time.OffsetDateTime;
import java.util.Optional;
import monolithe.auth_service.dto.MfaPortal;
import monolithe.auth_service.repository.LoginDeviceNoticeRepository;
import monolithe.auth_service.repository.LoginDeviceNoticeRepository.Aviso;
import monolithe.auth_service.repository.MfaInvitationRepository;
import monolithe.auth_service.repository.MfaInvitationRepository.ContactoCorreo;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

class LoginDeviceNoticeServiceTest {
    private static final OffsetDateTime UTC = OffsetDateTime.parse("2026-11-27T17:30:00Z");
    private static final OffsetDateTime LIMA = OffsetDateTime.parse("2026-11-27T12:30:00-05:00");
    private static final String DESTINATARIO = "prueba@example.com";
    private final LoginDeviceNoticeRepository avisos = mock(LoginDeviceNoticeRepository.class);
    private final MfaInvitationRepository contactos = mock(MfaInvitationRepository.class);
    private final EmailService correo = mock(EmailService.class);
    private final LoginDeviceNoticeService service = new LoginDeviceNoticeService(avisos, contactos, correo);

    @Test
    void entregaAlCorreoPrincipalActivoDeUnaCuentaConCorreoHistorico() {
        var aviso = aviso(1);
        when(avisos.reservar()).thenReturn(Optional.of(aviso), Optional.empty());
        when(contactos.correoPrincipal(aviso.usuario())).thenReturn(Optional.of(
                new ContactoCorreo(12L, DESTINATARIO, false)));
        service.enviarPendientes();
        var orden = inOrder(correo, avisos);
        orden.verify(correo).enviarAvisoNuevoDispositivo(DESTINATARIO, aviso.portal(), LIMA);
        orden.verify(avisos).finalizar(aviso);
    }

    @Test
    void conservaElAvisoSiElProveedorFallaYLoCierraAlAceptarElReintento() {
        var primero = aviso(1);
        var reintento = aviso(2);
        when(avisos.reservar()).thenReturn(Optional.of(primero), Optional.empty(),
                Optional.of(reintento), Optional.empty());
        when(contactos.correoPrincipal(8L)).thenReturn(Optional.of(new ContactoCorreo(12L, DESTINATARIO, true)));
        doThrow(new MailSendException("Fallo temporal")).doNothing().when(correo)
                .enviarAvisoNuevoDispositivo(DESTINATARIO, primero.portal(), LIMA);
        service.enviarPendientes();
        verify(avisos, never()).finalizar(any());
        service.enviarPendientes();
        verify(avisos).finalizar(reintento);
        verify(correo, times(2)).enviarAvisoNuevoDispositivo(DESTINATARIO, primero.portal(), LIMA);
    }

    @Test
    void finalizaElAvisoSiYaNoHayUnCorreoPrincipalActivo() {
        var aviso = aviso(1);
        when(avisos.reservar()).thenReturn(Optional.of(aviso), Optional.empty());
        when(contactos.correoPrincipal(aviso.usuario())).thenReturn(Optional.empty());
        service.enviarPendientes();
        verifyNoInteractions(correo);
        verify(avisos).finalizar(aviso);
    }

    @Test
    void elAvisoDeDispositivoPuedeViajarPorElTransporteHttps() throws Exception {
        var transport = new AppsScriptJavaMailSender(JsonMapper.builder().build(),
                "https://script.google.com/macros/s/test/exec",
                "abcdefghijklmnopABCDEFGHIJKLMNOP0123456789abcdefghijkl");
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenAnswer(inv -> transport.createMimeMessage());
        EmailService service = new EmailService(sender);
        ReflectionTestUtils.setField(service, "remitente", "gestion@example.test");
        service.enviarAvisoNuevoDispositivo("usuario@example.test", MfaPortal.BACKOFFICE,
                OffsetDateTime.parse("2026-11-27T12:30:00-05:00"));
        var captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(captor.capture());
        var payload = transport.payloadFor(captor.getValue());
        assertEquals("usuario@example.test", payload.get("to"));
        assertTrue(payload.get("subject").toString().contains("dispositivo nuevo"));
        assertTrue(payload.get("textBody").toString().contains("27/11/2026 12:30"));
    }

    private Aviso aviso(int intento) {
        return new Aviso(8L, MfaPortal.CLIENTE, new byte[32], UTC, intento);
    }
}
