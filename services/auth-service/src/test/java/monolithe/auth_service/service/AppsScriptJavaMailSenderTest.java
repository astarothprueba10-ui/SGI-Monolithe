package monolithe.auth_service.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.mail.internet.MimeMessage;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.MimeMessageHelper;
import tools.jackson.databind.json.JsonMapper;

class AppsScriptJavaMailSenderTest {
    private static final String SECRET =
            "abcdefghijklmnopABCDEFGHIJKLMNOP0123456789abcdefghijkl";

    @Test
    void preparaCorreoHtmlSinExponerSecretosEnElNavegador() throws Exception {
        AppsScriptJavaMailSender sender = new AppsScriptJavaMailSender(
                JsonMapper.builder().build(),
                "https://script.google.com/macros/s/test/exec",
                SECRET);
        MimeMessage message = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom("gestion@gmail.com");
        helper.setTo("usuario@example.com");
        helper.setSubject("Acceso MONOLITHE");
        helper.setText("Su acceso", "<p>Su acceso</p>");

        Map<String, Object> payload = sender.payloadFor(message);
        assertEquals("usuario@example.com", payload.get("to"));
        assertEquals("Acceso MONOLITHE", payload.get("subject"));
        assertEquals("Su acceso", payload.get("textBody"));
        assertEquals("<p>Su acceso</p>", payload.get("htmlBody"));
        assertEquals(SECRET, payload.get("secret"));
        assertTrue(Math.abs(System.currentTimeMillis() - (long) payload.get("timestamp")) < 10000);
        assertEquals(36, ((String) payload.get("requestId")).length());
    }

    @Test
    void rechazaConfiguracionesInsegurasAntesDeEnviar() {
        assertThrows(IllegalArgumentException.class, () ->
                new AppsScriptJavaMailSender(
                        JsonMapper.builder().build(),
                        "http://example.com/exec",
                        SECRET));
        assertThrows(IllegalArgumentException.class, () ->
                new AppsScriptJavaMailSender(
                        JsonMapper.builder().build(),
                        "https://script.google.com/macros/s/test/exec",
                        "muy-corta"));
    }
}
