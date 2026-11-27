package monolithe.auth_service.service;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import monolithe.auth_service.dto.MfaPortal;
import monolithe.auth_service.repository.LoginDeviceRepository;
import monolithe.auth_service.repository.LoginDeviceRepository.Registration;
import monolithe.auth_service.repository.MfaInvitationRepository;
import monolithe.auth_service.repository.MfaRepository.Account;
import monolithe.auth_service.security.MfaCrypto;
import monolithe.auth_service.security.UserPrincipal;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;

/** Autoriza un equipo solo durante el día en que completó el segundo factor. */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoginDeviceService {
    private static final ZoneId PERU = ZoneId.of("America/Lima");

    private final LoginDeviceRepository repository;
    private final MfaInvitationRepository contacts;
    private final MfaCrypto crypto;
    private final ApplicationEventPublisher events;
    private final EmailService mail;

    /** Consulta el permiso para la cuenta, portal y contraseña ya verificados. */
    public boolean trusted(Account account, MfaPortal portal, String token, OffsetDateTime now) {
        var device = new Registration(account.id(), portal, MfaCrypto.digest(token),
                account.version(), account.passwordDigest(), null);
        return repository.trusted(device, now);
    }

    /** Asocia el navegador una vez completado MFA y genera la alerta de un dispositivo nuevo. */
    public String register(UserPrincipal user, MfaPortal portal, String presented,
                           boolean remember, OffsetDateTime now) {
        if (portal == null) return null;
        String token = issuedToken(presented);
        byte[] hash = MfaCrypto.digest(token);
        boolean notify = repository.differentDevice(user.getIdUsuario(), hash);
        OffsetDateTime until = remember && !user.isRequiereCambioPassword() ? endOfDay(now) : null;
        repository.record(new Registration(user.getIdUsuario(), portal, hash, user.getVersionSesiones(),
                MfaCrypto.digest(user.getPassword()), until));
        if (notify) notifyAfterCommit(user.getIdUsuario(), portal, now);
        return token;
    }

    private String issuedToken(String presented) {
        return presented != null && repository.issued(MfaCrypto.digest(presented))
                ? presented : crypto.challenge();
    }

    static OffsetDateTime endOfDay(OffsetDateTime now) {
        return now.atZoneSameInstant(PERU).toLocalDate().plusDays(1).atStartOfDay(PERU).toOffsetDateTime();
    }

    private void notifyAfterCommit(long user, MfaPortal portal, OffsetDateTime now) {
        contacts.correoVerificado(user).ifPresent(email ->
                events.publishEvent(new NewDevice(email, portal, now.atZoneSameInstant(PERU).toOffsetDateTime())));
    }

    /** El SMTP se ejecuta una vez confirmada la creación de la sesión. */
    @TransactionalEventListener
    public void sendNewDeviceNotice(NewDevice notice) {
        try {
            mail.enviarAvisoNuevoDispositivo(notice.email(), notice.portal(), notice.when());
        } catch (MailException | IllegalArgumentException e) {
            log.warn("No se pudo enviar la alerta de inicio de sesión en un dispositivo nuevo.");
        }
    }

    public record NewDevice(String email, MfaPortal portal, OffsetDateTime when) {
        @Override public String toString() { return "NewDevice[datos omitidos]"; }
    }
}
