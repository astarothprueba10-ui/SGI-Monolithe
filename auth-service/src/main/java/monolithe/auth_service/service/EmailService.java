package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${security.mail.from}")
    private String remitente;

    public void enviarRecuperacionContrasena(
            String destinatario,
            String token
    ) {

        SimpleMailMessage mensaje = new SimpleMailMessage();

        mensaje.setFrom(remitente);
        mensaje.setTo(destinatario);
        mensaje.setSubject(
                "Recuperación de contraseña - MONOLITHE"
        );

        mensaje.setText(
                """
                Hola,

                Se solicitó la recuperación de contraseña de tu cuenta MONOLITHE.

                Tu token de recuperación es:

                %s

                Este token tiene una vigencia de 15 minutos y solo puede utilizarse una vez.

                Si no solicitaste este cambio, ignora este mensaje.

                MONOLITHE
                """.formatted(token)
        );

        mailSender.send(mensaje);
    }
}