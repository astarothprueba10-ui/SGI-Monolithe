package monolithe.auth_service.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class BrevoJavaMailSenderTest {
    private BrevoJavaMailSender sender;
    private MockRestServiceServer server;

    @BeforeEach
    void setup() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl("https://api.brevo.com")
                .defaultHeader("api-key", "testing-key");
        server = MockRestServiceServer.bindTo(builder).build();
        sender = new BrevoJavaMailSender(builder.build());
    }

    @Test
    void enviaCredencialesPorHttpsSinSmtp() throws Exception {
        server.expect(requestTo("https://api.brevo.com/v3/smtp/email"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.sender.email").value("seguridad@ejemplo.com"))
                .andExpect(jsonPath("$.to[0].email").value("usuario@ejemplo.com"))
                .andExpect(jsonPath("$.subject").value("Credenciales MONOLITHE"))
                .andExpect(jsonPath("$.htmlContent").value("<p>Acceso</p>"))
                .andRespond(withStatus(HttpStatus.CREATED));

        MimeMessage mail = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mail, true, "UTF-8");
        helper.setFrom("seguridad@ejemplo.com");
        helper.setTo("usuario@ejemplo.com");
        helper.setSubject("Credenciales MONOLITHE");
        helper.setText("Acceso", "<p>Acceso</p>");

        sender.send(mail);
        server.verify();
    }

    @Test
    void unRechazoDelProveedorNoSeReportaComoEnvioExitoso() throws Exception {
        server.expect(requestTo("https://api.brevo.com/v3/smtp/email"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        MimeMessage mail = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mail, false, "UTF-8");
        helper.setFrom("seguridad@ejemplo.com");
        helper.setTo("usuario@ejemplo.com");
        helper.setSubject("Credenciales MONOLITHE");
        helper.setText("Texto de prueba");

        assertThrows(MailSendException.class, () -> sender.send(mail));
        server.verify();
    }
}
