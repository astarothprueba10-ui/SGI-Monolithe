package monolithe.auth_service.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.util.Map;
import java.util.Properties;
import monolithe.auth_service.exception.CredentialMailException;
import org.eclipse.angus.mail.smtp.SMTPAddressFailedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

class CredentialMailDeliveryTest {
    private JavaMailSender sender;
    private MimeMessage message;
    private CredentialMailDelivery delivery;

    @BeforeEach
    void configurar() {
        sender = mock(JavaMailSender.class);
        message = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(message);
        delivery = new CredentialMailDelivery(sender);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ana@gmail.com", "ana@outlook.com", "ana@hotmail.com", "ana@yahoo.es",
            "ana@icloud.com", "ana@utp.edu.pe", "ana+ventas@empresa.com.pe", "ana@area.mi-empresa.technology"})
    void preparaUnDestinatarioDeCualquierProveedor(String correo) throws Exception {
        enviar(correo);
        verify(sender).send(message);
        assertEquals(correo, ((InternetAddress) message.getAllRecipients()[0]).getAddress());
        assertEquals(1, message.getAllRecipients().length);
    }

    @Test
    void incluyeAlternativasTextoYHtmlConUtf8() throws Exception {
        enviar(" Ana@EMPRESA.PE ");
        message.saveChanges();
        Multipart mixed = (Multipart) message.getContent();
        Multipart related = (Multipart) mixed.getBodyPart(0).getContent();
        Multipart alternative = (Multipart) related.getBodyPart(0).getContent();
        assertTrue(alternative.getBodyPart(0).isMimeType("text/plain"));
        assertTrue(alternative.getBodyPart(1).isMimeType("text/html"));
        assertEquals("Contraseña temporal de prueba", alternative.getBodyPart(0).getContent());
        assertEquals("Ana@empresa.pe", ((InternetAddress) message.getAllRecipients()[0]).getAddress());
    }

    @ParameterizedTest
    @ValueSource(ints = {450, 550, 554})
    void devuelveDiagnosticoSeguroAlRechazarSmtp(int code) throws Exception {
        SMTPAddressFailedException rechazo = new SMTPAddressFailedException(
                new InternetAddress("ana@empresa.pe"), "RCPT TO", code, "clave-secreta-no-publicar");
        doThrow(new MailSendException(Map.of(message, rechazo))).when(sender).send(message);
        CredentialMailException error = assertThrows(CredentialMailException.class, () -> enviar("ana@empresa.pe"));
        assertTrue(error.getMessage().contains("SMTP " + code));
        assertFalse(error.getMessage().contains("clave-secreta"));
        assertFalse(error.getMessage().contains("ana@"));
    }

    @Test
    void distingueFalloDeAutenticacionSinExponerLaCausa() {
        doThrow(new MailAuthenticationException("password-secreto")).when(sender).send(any(MimeMessage.class));
        CredentialMailException error = assertThrows(CredentialMailException.class, () -> enviar("ana@empresa.pe"));
        assertTrue(error.getMessage().contains("autenticación"));
        assertFalse(error.getMessage().contains("password-secreto"));
    }

    @Test
    void rechazaInyeccionDeCabecerasAntesDeEnviar() {
        assertThrows(IllegalArgumentException.class, () -> enviar("a@empresa.pe\r\nBcc:b@empresa.pe"));
        verify(sender, never()).send(any(MimeMessage.class));
    }

    private void enviar(String correo) {
        delivery.send("no-reply@monolithe.pe", correo, "Contraseña temporal de prueba", "<p>Contraseña temporal de prueba</p>");
    }
}
