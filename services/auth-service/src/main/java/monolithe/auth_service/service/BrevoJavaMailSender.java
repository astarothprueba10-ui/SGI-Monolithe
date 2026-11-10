package monolithe.auth_service.service;

import jakarta.mail.Address;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Sustituye SMTP por la API HTTPS de Brevo sin cambiar las plantillas ni los
 * flujos existentes de credenciales, OTP, recuperación o confirmación.
 *
 * No registra destinatarios, contraseñas, códigos OTP ni cuerpos de correo.
 */
public final class BrevoJavaMailSender implements JavaMailSender {
    private static final Logger log = LoggerFactory.getLogger(BrevoJavaMailSender.class);
    private final JavaMailSenderImpl mimeFactory = new JavaMailSenderImpl();
    private final RestClient client;

    public BrevoJavaMailSender(String apiKey) {
        this(RestClient.builder()
                .baseUrl("https://api.brevo.com")
                .defaultHeader("api-key", apiKey)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build());
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalArgumentException("BREVO_API_KEY debe estar configurada.");
        }
    }

    // Inyección del cliente HTTP para pruebas sin llamar a servicios externos.
    BrevoJavaMailSender(RestClient client) {
        this.client = client;
    }

    @Override
    public MimeMessage createMimeMessage() {
        return mimeFactory.createMimeMessage();
    }

    @Override
    public MimeMessage createMimeMessage(InputStream contentStream) throws MailException {
        return mimeFactory.createMimeMessage(contentStream);
    }

    @Override
    public void send(MimeMessage mimeMessage) throws MailException {
        send(new MimeMessage[] {mimeMessage});
    }

    @Override
    public void send(MimeMessage... mimeMessages) throws MailException {
        for (MimeMessage message : mimeMessages) {
            enviarHttps(message);
        }
    }

    @Override
    public void send(MimeMessagePreparator preparator) throws MailException {
        send(new MimeMessagePreparator[] {preparator});
    }

    @Override
    public void send(MimeMessagePreparator... preparators) throws MailException {
        for (MimeMessagePreparator preparator : preparators) {
            MimeMessage message = createMimeMessage();
            try {
                preparator.prepare(message);
            } catch (Exception exception) {
                throw new MailPreparationException("No se pudo preparar el correo.", exception);
            }
            send(message);
        }
    }

    @Override
    public void send(SimpleMailMessage simpleMessage) throws MailException {
        send(new SimpleMailMessage[] {simpleMessage});
    }

    @Override
    public void send(SimpleMailMessage... simpleMessages) throws MailException {
        for (SimpleMailMessage simple : simpleMessages) {
            MimeMessage message = createMimeMessage();
            try {
                MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
                if (simple.getFrom() != null) helper.setFrom(simple.getFrom());
                if (simple.getTo() != null) helper.setTo(simple.getTo());
                if (simple.getCc() != null) helper.setCc(simple.getCc());
                if (simple.getBcc() != null) helper.setBcc(simple.getBcc());
                helper.setSubject(simple.getSubject() == null ? "" : simple.getSubject());
                helper.setText(simple.getText() == null ? "" : simple.getText());
            } catch (MessagingException exception) {
                throw new MailPreparationException("No se pudo preparar el correo.", exception);
            }
            send(message);
        }
    }

    private void enviarHttps(MimeMessage message) {
        final Map<String, Object> payload;
        try {
            // MimeMessageHelper construye multipart en memoria: guardar los cambios
            // antes de inspeccionar las partes evita leer un cuerpo MIME incompleto.
            message.saveChanges();
            Address[] senders = message.getFrom();
            Address[] recipients = message.getRecipients(Message.RecipientType.TO);
            if (senders == null || senders.length != 1 || recipients == null || recipients.length == 0) {
                throw new MessagingException("El correo debe tener un remitente y destinatario.");
            }
            InternetAddress from = internetAddress(senders[0]);
            List<Map<String, String>> to = new ArrayList<>();
            for (Address address : recipients) {
                to.add(Map.of("email", internetAddress(address).getAddress()));
            }
            // Nunca entregar parcialmente una copia o destinatario oculto.
            if (message.getRecipients(Message.RecipientType.CC) != null
                    || message.getRecipients(Message.RecipientType.BCC) != null) {
                throw new MessagingException("CC/BCC no está soportado por el adaptador.");
            }

            Body contenido = new Body();
            recogerPartes(message, contenido);
            String asunto = message.getSubject();
            if (asunto == null || asunto.isBlank()
                    || (contenido.html == null && contenido.text == null)) {
                throw new MessagingException("El correo no tiene asunto o contenido.");
            }
            Map<String, String> sender = Map.of(
                    "email", from.getAddress(), "name", "MONOLITHE");
            if (contenido.html != null) {
                payload = Map.of("sender", sender, "to", to, "subject", asunto,
                        "htmlContent", contenido.html);
            } else {
                payload = Map.of("sender", sender, "to", to, "subject", asunto,
                        "textContent", contenido.text);
            }
        } catch (MessagingException | IOException exception) {
            throw new MailPreparationException("El mensaje no es compatible con el envío HTTPS.", exception);
        }

        try {
            ResponseEntity<Void> response = client.post()
                    .uri("/v3/smtp/email")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            if (response.getStatusCode().value() != 201) {
                throw new MailSendException("Brevo no confirmó la aceptación del correo.");
            }
            log.info("CORREO_HTTPS_ACEPTADO proveedor=brevo");
        } catch (RestClientResponseException exception) {
            log.warn("CORREO_HTTPS_RECHAZADO proveedor=brevo status={}", exception.getStatusCode().value());
            throw new MailSendException(
                    "El proveedor de correo rechazó el envío (HTTP " + exception.getStatusCode().value() + ").",
                    exception);
        } catch (RestClientException exception) {
            log.warn("CORREO_HTTPS_ERROR proveedor=brevo tipo={}", exception.getClass().getSimpleName());
            throw new MailSendException("No se pudo conectar con el proveedor de correo HTTPS.", exception);
        }
    }

    private static InternetAddress internetAddress(Address address) throws MessagingException {
        if (!(address instanceof InternetAddress result)) {
            throw new MessagingException("La dirección del correo no es válida.");
        }
        result.validate();
        return result;
    }

    private static void recogerPartes(Part part, Body body) throws MessagingException, IOException {
        if (part.getFileName() != null || Part.ATTACHMENT.equalsIgnoreCase(part.getDisposition())) {
            throw new MessagingException("Los adjuntos no están habilitados para correos de seguridad.");
        }
        if (part.isMimeType("text/html")) {
            Object content = part.getContent();
            if (content instanceof String html) body.html = html;
            return;
        }
        if (part.isMimeType("text/plain")) {
            Object content = part.getContent();
            if (content instanceof String text) body.text = text;
            return;
        }
        if (part.isMimeType("multipart/*")) {
            Object content = part.getContent();
            if (content instanceof Multipart multi) {
                for (int i = 0; i < multi.getCount(); i++) {
                    recogerPartes(multi.getBodyPart(i), body);
                }
            }
        }
    }

    private static final class Body {
        private String html;
        private String text;
    }
}
