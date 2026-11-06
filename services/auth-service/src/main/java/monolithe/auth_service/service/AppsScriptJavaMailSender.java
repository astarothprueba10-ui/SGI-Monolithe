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
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.javamail.MimeMessagePreparator;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Gmail por Google Apps Script HTTPS: reemplaza solo el transporte SMTP.
 * El endpoint y el secreto viven exclusivamente en las variables del servidor.
 * No registrar destinatarios, mensajes, claves ni tokens de recuperación.
 */
@Slf4j
public final class AppsScriptJavaMailSender implements JavaMailSender {
    private static final Duration TIMEOUT = Duration.ofSeconds(20);
    private final JavaMailSenderImpl messageFactory = new JavaMailSenderImpl();
    private final HttpClient client;
    private final JsonMapper jsonMapper;
    private final URI endpoint;
    private final String secret;

    public AppsScriptJavaMailSender(JsonMapper jsonMapper, String endpointUrl, String secret) {
        this(jsonMapper,
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(8))
                        .followRedirects(HttpClient.Redirect.NEVER)
                        .build(),
                URI.create(endpointUrl), secret);
        if (!"https".equalsIgnoreCase(endpoint.getScheme())
                || !"script.google.com".equalsIgnoreCase(endpoint.getHost())
                || !endpoint.getPath().matches("/macros/s/[^/]+/exec")
                || endpoint.getRawQuery() != null || endpoint.getRawFragment() != null
                || endpoint.getUserInfo() != null || endpoint.getPort() != -1) {
            throw new IllegalArgumentException("APPS_SCRIPT_MAIL_URL debe ser una URL /exec HTTPS de Apps Script.");
        }
    }

    // Constructor para pruebas con cliente HTTP inyectado (sin credenciales reales).
    AppsScriptJavaMailSender(JsonMapper jsonMapper, HttpClient client, URI endpoint, String secret) {
        if (secret == null || secret.length() < 40) {
            throw new IllegalArgumentException("APPS_SCRIPT_MAIL_SECRET no está configurado correctamente.");
        }
        this.jsonMapper = jsonMapper;
        this.client = client;
        this.endpoint = endpoint;
        this.secret = secret;
    }

    @Override
    public MimeMessage createMimeMessage() {
        return messageFactory.createMimeMessage();
    }

    @Override
    public MimeMessage createMimeMessage(InputStream contentStream) throws MailException {
        return messageFactory.createMimeMessage(contentStream);
    }

    @Override
    public void send(MimeMessage mimeMessage) throws MailException {
        send(new MimeMessage[] {mimeMessage});
    }

    @Override
    public void send(MimeMessage... mimeMessages) throws MailException {
        for (MimeMessage message : mimeMessages) {
            sendThroughHttps(message);
        }
    }

    @Override
    public void send(MimeMessagePreparator mimeMessagePreparator) throws MailException {
        send(new MimeMessagePreparator[] {mimeMessagePreparator});
    }

    @Override
    public void send(MimeMessagePreparator... mimeMessagePreparators) throws MailException {
        for (MimeMessagePreparator preparator : mimeMessagePreparators) {
            MimeMessage message = createMimeMessage();
            try {
                preparator.prepare(message);
            } catch (Exception ex) {
                throw new MailPreparationException("No se pudo preparar el correo.", ex);
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
            } catch (MessagingException ex) {
                throw new MailPreparationException("No se pudo preparar el correo.", ex);
            }
            send(message);
        }
    }

    private void sendThroughHttps(MimeMessage message) {
        final String requestBody;
        try {
            requestBody = jsonMapper.writeValueAsString(payloadFor(message));
        } catch (MessagingException | IOException | JacksonException ex) {
            throw new MailPreparationException("No se pudo preparar el correo HTTPS.", ex);
        }

        try {
            HttpRequest request = HttpRequest.newBuilder(endpoint)
                    .timeout(TIMEOUT)
                    .header("Content-Type", "application/json; charset=utf-8")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 302 || response.statusCode() == 303) {
                String location = response.headers().firstValue("Location").orElse("");
                URI redirect = endpoint.resolve(location);
                if (!"https".equalsIgnoreCase(redirect.getScheme())
                        || !"script.googleusercontent.com".equalsIgnoreCase(redirect.getHost())
                        || redirect.getUserInfo() != null) {
                    throw new MailSendException("Redirección no autorizada del proveedor de correo.");
                }
                response = client.send(HttpRequest.newBuilder(redirect).timeout(TIMEOUT).GET().build(),
                        HttpResponse.BodyHandlers.ofString());
            }
            if (response.statusCode() != 200) {
                log.warn("CORREO_HTTPS_RECHAZADO status={}", response.statusCode());
                throw new MailSendException("El proveedor de correo devolvió HTTP " + response.statusCode() + ".");
            }
            JsonNode result = jsonMapper.readTree(response.body());
            if (result == null || !result.path("ok").asBoolean(false)) {
                String codigo = result == null ? "SIN_RESPUESTA" : result.path("codigo").asString("ERROR_ENVIO");
                log.warn("CORREO_HTTPS_RECHAZADO codigo={}", codigo);
                throw new MailSendException("Google Apps Script rechazó el envío: " + codigo + ".");
            }
            log.info("CORREO_HTTPS_ACEPTADO proveedor=google-apps-script");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new MailSendException("Envío interrumpido antes de confirmar la entrega.", ex);
        } catch (IOException | JacksonException ex) {
            throw new MailSendException("No fue posible confirmar el envío HTTPS.", ex);
        }
    }

    Map<String, Object> payloadFor(MimeMessage message) throws MessagingException, IOException {
        Address[] from = message.getFrom();
        Address[] recipients = message.getRecipients(Message.RecipientType.TO);
        if (from == null || from.length != 1 || recipients == null || recipients.length != 1
                || message.getRecipients(Message.RecipientType.CC) != null
                || message.getRecipients(Message.RecipientType.BCC) != null) {
            throw new MessagingException("Se requiere un único destinatario sin CC/BCC.");
        }
        if (!(from[0] instanceof InternetAddress sender) || !(recipients[0] instanceof InternetAddress recipient)) {
            throw new MessagingException("Direcciones de correo no válidas.");
        }
        sender.validate();
        recipient.validate();
        String subject = message.getSubject();
        Body body = new Body();
        collectBody(message, body);
        if (subject == null || subject.isBlank() || subject.length() > 200
                || body.text == null || body.text.isBlank()
                || body.text.length() > 80000
                || (body.html != null && body.html.length() > 80000)) {
            throw new MessagingException("Contenido del mensaje fuera de los límites permitidos.");
        }
        return Map.of(
                "secret", secret,
                "timestamp", System.currentTimeMillis(),
                "requestId", UUID.randomUUID().toString(),
                "to", recipient.getAddress(),
                "subject", subject,
                "textBody", body.text,
                "htmlBody", body.html == null ? "" : body.html);
    }

    private static void collectBody(Part part, Body body) throws MessagingException, IOException {
        if (part.getFileName() != null || Part.ATTACHMENT.equalsIgnoreCase(part.getDisposition())) {
            throw new MessagingException("No se admiten adjuntos en correos de autenticación.");
        }
        if (part.isMimeType("text/plain")) {
            Object content = part.getContent();
            if (content instanceof String text) body.text = text;
        } else if (part.isMimeType("text/html")) {
            Object content = part.getContent();
            if (content instanceof String html) body.html = html;
        } else if (part.isMimeType("multipart/*")) {
            Object content = part.getContent();
            if (content instanceof Multipart multi) {
                for (int i = 0; i < multi.getCount(); i++) {
                    collectBody(multi.getBodyPart(i), body);
                }
            }
        }
    }

    private static final class Body {
        private String text;
        private String html;
    }
}
