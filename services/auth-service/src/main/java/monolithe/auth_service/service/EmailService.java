package monolithe.auth_service.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

  private final JavaMailSender mailSender;

  @Value("${security.mail.from}")
  private String remitente;

  public void enviarRecuperacionContrasena(
      String destinatario,
      String urlRecuperacion,
      long minutosExpiracion) {

    try {
      MimeMessage mensaje = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");

      helper.setFrom(remitente);
      helper.setTo(destinatario);
      helper.setSubject("Restablecimiento de contraseña - MONOLITHE");

      helper.setText(
          construirCuerpoHtml(urlRecuperacion, minutosExpiracion),
          true);

      mailSender.send(mensaje);

    } catch (MessagingException e) {
      log.error("Error al construir el mensaje de recuperación de contraseña");

      throw new MailException(
          "Error al preparar el correo de recuperación",
          e) {
      };
    }
  }

  public void enviarCodigoRecuperacion(
      String destinatario,
      String codigoOtp,
      long minutosExpiracion) {

    try {
      MimeMessage mensaje = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");

      helper.setFrom(remitente);
      helper.setTo(destinatario);
      helper.setSubject("Código de verificación - MONOLITHE");

      helper.setText(
          construirCuerpoOtpHtml(codigoOtp, minutosExpiracion),
          true);

      mailSender.send(mensaje);

    } catch (MessagingException e) {
      log.error(
          "Error al construir el correo con código OTP de recuperación");

      throw new MailException(
          "Error al preparar el correo de verificación",
          e) {
      };
    }
  }

  private String construirCuerpoHtml(
      String urlRecuperacion,
      long minutosExpiracion) {

    return """
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        </head>

        <body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">

          <table width="100%%" cellpadding="0" cellspacing="0"
                 style="background-color:#f4f6f9;padding:40px 0;">

            <tr>
              <td align="center">

                <table width="560" cellpadding="0" cellspacing="0"
                       style="background:#ffffff;
                              border-radius:8px;
                              box-shadow:0 2px 8px rgba(0,0,0,0.08);
                              overflow:hidden;">

                  <tr>
                    <td style="background:#1a2e4a;padding:28px 40px;">
                      <p style="margin:0;
                                font-size:22px;
                                font-weight:700;
                                color:#ffffff;
                                letter-spacing:0.5px;">
                        MONOLITHE
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:36px 40px 20px;">

                      <h1 style="margin:0 0 16px;
                                 font-size:20px;
                                 font-weight:600;
                                 color:#1a2e4a;">
                        Solicitud de restablecimiento de contraseña
                      </h1>

                      <p style="margin:0 0 20px;
                                font-size:15px;
                                color:#4a5568;
                                line-height:1.6;">
                        Recibimos una solicitud para restablecer la contraseña
                        asociada a tu cuenta. Si fuiste tú, usa el botón a
                        para continuar.
                      </p>

                      <table cellpadding="0" cellspacing="0"
                             style="margin:24px 0;">
                        <tr>
                          <td style="border-radius:6px;background:#2563eb;">

                            <a href="%s"
                               style="display:inline-block;
                                      padding:13px 32px;
                                      font-size:15px;
                                      font-weight:600;
                                      color:#ffffff;
                                      text-decoration:none;
                                      border-radius:6px;">
                              Restablecer contraseña
                            </a>

                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 12px;
                                font-size:14px;
                                color:#718096;
                                line-height:1.6;">
                        Este enlace expirará en %d minutos y solo puede
                        utilizarse una vez.
                      </p>

                      <p style="margin:0;
                                font-size:14px;
                                color:#718096;
                                line-height:1.6;">
                        Si no solicitaste este cambio, puedes ignorar este
                        correo de forma segura. Tu contraseña permanecerá
                        sin cambios.
                      </p>

                    </td>
                  </tr>

                  <tr>
                    <td style="background:#f8fafc;
                               padding:20px 40px;
                               border-top:1px solid #e2e8f0;">

                      <p style="margin:0;
                                font-size:12px;
                                color:#a0aec0;
                                text-align:center;">
                        MONOLITHE &mdash; Sistema de Gestión Integrado
                      </p>

                    </td>
                  </tr>

                </table>

              </td>
            </tr>

          </table>

        </body>
        </html>
        """
        .formatted(urlRecuperacion, minutosExpiracion);
  }

  private String construirCuerpoOtpHtml(
      String codigoOtp,
      long minutosExpiracion) {

    return """
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport"
                content="width=device-width, initial-scale=1.0"/>
        </head>

        <body style="margin:0;
                     padding:0;
                     background-color:#f4f6f9;
                     font-family:'Segoe UI',Arial,sans-serif;">

          <table width="100%%"
                 cellpadding="0"
                 cellspacing="0"
                 style="background-color:#f4f6f9;padding:40px 0;">

            <tr>
              <td align="center">

                <table width="560"
                       cellpadding="0"
                       cellspacing="0"
                       style="background:#ffffff;
                              border-radius:8px;
                              box-shadow:0 2px 8px rgba(0,0,0,0.08);
                              overflow:hidden;">

                  <tr>
                    <td style="background:#1a2e4a;padding:28px 40px;">
                      <p style="margin:0;
                                font-size:22px;
                                font-weight:700;
                                color:#ffffff;
                                letter-spacing:0.5px;">
                        MONOLITHE
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:36px 40px 28px;">

                      <h1 style="margin:0 0 16px;
                                 font-size:20px;
                                 font-weight:600;
                                 color:#1a2e4a;">
                        Verifica el cambio de contraseña
                      </h1>

                      <p style="margin:0 0 24px;
                                font-size:15px;
                                color:#4a5568;
                                line-height:1.6;">
                        Ingresa el siguiente código para confirmar
                        el restablecimiento de tu contraseña:
                      </p>

                      <div style="margin:24px 0;
                                  padding:18px;
                                  background:#f8fafc;
                                  border:1px solid #e2e8f0;
                                  border-radius:8px;
                                  text-align:center;">

                        <span style="font-size:32px;
                                     font-weight:700;
                                     letter-spacing:8px;
                                     color:#1a2e4a;">
                          %s
                        </span>

                      </div>

                      <p style="margin:0 0 12px;
                                font-size:14px;
                                color:#718096;
                                line-height:1.6;">
                        Este código expirará en %d minutos.
                      </p>

                      <p style="margin:0;
                                font-size:14px;
                                color:#718096;
                                line-height:1.6;">
                        Si no solicitaste este cambio, no compartas
                        este código con nadie.
                      </p>

                    </td>
                  </tr>

                  <tr>
                    <td style="background:#f8fafc;
                               padding:20px 40px;
                               border-top:1px solid #e2e8f0;">

                      <p style="margin:0;
                                font-size:12px;
                                color:#a0aec0;
                                text-align:center;">
                        MONOLITHE &mdash; Sistema de Gestión Integrado
                      </p>

                    </td>
                  </tr>

                </table>

              </td>
            </tr>

          </table>

        </body>
        </html>
        """
        .formatted(codigoOtp, minutosExpiracion);
  }
}