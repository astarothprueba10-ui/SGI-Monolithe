package monolithe.auth_service.service;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;
import jakarta.mail.internet.MimeMessage;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.json.JsonMapper;

class EmailServiceRecoveryMailTest {
    @Test
    void correoComercialContieneNombreRealYEscapaHtml() throws Exception {
        var transport = new AppsScriptJavaMailSender(JsonMapper.builder().build(),
            "https://script.google.com/macros/s/test/exec",
            "abcdefghijklmnopABCDEFGHIJKLMNOP0123456789abcdefghijkl");
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenAnswer(inv -> transport.createMimeMessage());
        EmailService service = new EmailService(sender);
        ReflectionTestUtils.setField(service, "remitente", "gestion@example.test");
        service.enviarCodigoMfaComercial("usuario@example.test","012345","MATRIZ","Los Cocos & Jardines");
        var captor=ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(captor.capture());
        var payload=transport.payloadFor(captor.getValue());
        assertTrue(((String)payload.get("textBody")).contains("Proyecto: Los Cocos & Jardines"));
        assertTrue(((String)payload.get("htmlBody")).contains("Los Cocos &amp; Jardines"));
        assertTrue(((String)payload.get("htmlBody")).contains("012345"));
    }
    @Test
    void recuperacionYConfirmacionSonCompatiblesConTransporteHttps() throws Exception {
        var transport = new AppsScriptJavaMailSender(JsonMapper.builder().build(),
            "https://script.google.com/macros/s/test/exec",
            "abcdefghijklmnopABCDEFGHIJKLMNOP0123456789abcdefghijkl");
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenAnswer(inv -> transport.createMimeMessage());
        EmailService service = new EmailService(sender);
        ReflectionTestUtils.setField(service, "remitente", "gestion@example.test");
        String enlace = "https://example.test/reset?token=demo&origin=test";
        service.enviarRecuperacionContrasena("usuario@example.test", enlace, 15);
        service.enviarCodigoRecuperacion("usuario@example.test", "012345", 5);
        service.enviarConfirmacionCambioCorreo("usuario@example.test", enlace, 15);
        var captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender, times(3)).send(captor.capture());
        for (int i = 0; i < 3; i++) {
            Map<String,Object> payload = transport.payloadFor(captor.getAllValues().get(i));
            String esperado = i == 1 ? "012345" : enlace;
            assertTrue(((String)payload.get("textBody")).contains(esperado));
            assertTrue(((String)payload.get("htmlBody")).contains(esperado.replace("&", "&amp;")));
        }
    }
}
