package monolithe.auth_service.service;

import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import monolithe.auth_service.repository.LoginDeviceNoticeRepository;
import monolithe.auth_service.repository.LoginDeviceNoticeRepository.Aviso;
import monolithe.auth_service.repository.MfaInvitationRepository;
import monolithe.auth_service.repository.MfaInvitationRepository.ContactoCorreo;
import org.springframework.mail.MailException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Entrega los avisos después de que la transacción de acceso confirmó el nuevo navegador. */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoginDeviceNoticeService {
    private static final ZoneId PERU = ZoneId.of("America/Lima");
    private final LoginDeviceNoticeRepository avisos;
    private final MfaInvitationRepository contactos;
    private final EmailService correo;

    /** Procesa los avisos confirmados fuera de la petición de inicio de sesión. */
    @Scheduled(fixedDelay = 10_000)
    public void enviarPendientes() {
        for (int i = 0; i < 5; i++) {
            var aviso = avisos.reservar();
            if (aviso.isEmpty()) return;
            enviar(aviso.get());
        }
    }

    private void enviar(Aviso aviso) {
        var destino = contactos.correoPrincipal(aviso.usuario()).map(ContactoCorreo::direccion);
        if (destino.isEmpty()) {
            log.warn("AVISO_MFA_DISPOSITIVO_SIN_CORREO idUsuario={}", aviso.usuario());
            avisos.finalizar(aviso);
            return;
        }
        try {
            correo.enviarAvisoNuevoDispositivo(destino.get(), aviso.portal(),
                    aviso.acceso().atZoneSameInstant(PERU).toOffsetDateTime());
            log.info("AVISO_MFA_DISPOSITIVO_ACEPTADO idUsuario={} portal={}", aviso.usuario(), aviso.portal());
        } catch (MailException e) {
            registrarFallo(aviso, e);
            return;
        } catch (IllegalArgumentException e) {
            log.warn("AVISO_MFA_DISPOSITIVO_CORREO_INVALIDO idUsuario={}", aviso.usuario());
        }
        avisos.finalizar(aviso);
    }

    private void registrarFallo(Aviso aviso, MailException error) {
        log.warn("AVISO_MFA_DISPOSITIVO_FALLO idUsuario={} intento={}/{} tipo={}", aviso.usuario(),
                aviso.intento(), LoginDeviceNoticeRepository.MAX_INTENTOS, error.getClass().getSimpleName());
    }
}
