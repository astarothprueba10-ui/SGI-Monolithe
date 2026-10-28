package monolithe.auth_service.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.ArrayDeque;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import monolithe.auth_service.exception.CredentialMailException;
import monolithe.auth_service.validation.EmailAddressPolicy;
import org.eclipse.angus.mail.smtp.SMTPAddressFailedException;
import org.eclipse.angus.mail.smtp.SMTPSendFailedException;
import org.eclipse.angus.mail.smtp.SMTPSenderFailedException;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

/** Envía correo multipart y registra aceptación SMTP o rechazo sin datos privados. */
@Slf4j
@RequiredArgsConstructor
public class CredentialMailDelivery {
    private final JavaMailSender mailSender;

    /** Envía a cualquier dominio válido sin interpretar aceptación SMTP como entrega final. */
    public void send(String from, String to, String text, String html) {
        String recipient = EmailAddressPolicy.normalizeRequired(to);
        String domain = recipient.substring(recipient.lastIndexOf('@') + 1);
        try {
            MimeMessage message = prepare(from, recipient, text, html);
            mailSender.send(message);
            log.info("CREDENCIALES_SMTP_ACEPTADO dominio={}", domain);
        } catch (MailException exception) {
            int code = smtpCode(exception);
            log.warn("CREDENCIALES_SMTP_FALLO dominio={} smtp={} tipo={}",
                    domain, code, exception.getClass().getSimpleName());
            throw new CredentialMailException(safeMessage(exception, code), exception);
        }
    }

    private MimeMessage prepare(String from, String to, String text, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setValidateAddresses(true);
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject("Bienvenido a MONOLITHE - Credenciales de acceso");
            helper.setText(text, html);
            return message;
        } catch (MessagingException exception) {
            throw new MailPreparationException("No se pudo preparar el mensaje de credenciales.", exception);
        }
    }

    private String safeMessage(MailException exception, int code) {
        if (exception instanceof MailAuthenticationException) {
            return "El servidor de correo rechazó la autenticación del remitente. Revisa la configuración SMTP.";
        }
        if (code >= 500) {
            return "El servidor de correo rechazó el envío (SMTP " + code
                    + "). Revisa el destinatario y las políticas del remitente.";
        }
        if (code >= 400) {
            return "El servidor de correo aplazó el envío (SMTP " + code + "). Intenta activar la cuenta nuevamente.";
        }
        return "No se pudo enviar el correo de credenciales. Revisa la conexión y la configuración SMTP.";
    }

    private int smtpCode(Throwable failure) {
        ArrayDeque<Throwable> pending = new ArrayDeque<>();
        Set<Throwable> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        pending.add(failure);
        while (!pending.isEmpty() && visited.size() < 32) {
            Throwable current = pending.removeFirst();
            if (!visited.add(current)) continue;
            int code = returnCode(current);
            if (code > 0) return code;
            addCauses(current, pending);
        }
        return 0;
    }

    private void addCauses(Throwable current, ArrayDeque<Throwable> pending) {
        if (current.getCause() != null) pending.add(current.getCause());
        if (current instanceof MessagingException mail && mail.getNextException() != null) {
            pending.add(mail.getNextException());
        }
        if (current instanceof MailSendException mail) {
            for (Exception nested : mail.getMessageExceptions()) pending.add(nested);
        }
    }

    private int returnCode(Throwable exception) {
        if (exception instanceof SMTPAddressFailedException smtp) return smtp.getReturnCode();
        if (exception instanceof SMTPSendFailedException smtp) return smtp.getReturnCode();
        if (exception instanceof SMTPSenderFailedException smtp) return smtp.getReturnCode();
        return 0;
    }
}
