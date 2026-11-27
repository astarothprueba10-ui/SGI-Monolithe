package monolithe.auth_service.service;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.MfaPortal;
import monolithe.auth_service.repository.LoginDeviceRepository;
import monolithe.auth_service.repository.LoginDeviceRepository.Registration;
import monolithe.auth_service.repository.MfaRepository.Account;
import monolithe.auth_service.security.MfaCrypto;
import monolithe.auth_service.security.UserPrincipal;
import org.springframework.stereotype.Service;

/** Autoriza un equipo solo durante el día en que completó el segundo factor. */
@Service
@RequiredArgsConstructor
public class LoginDeviceService {
    private static final ZoneId PERU = ZoneId.of("America/Lima");

    private final LoginDeviceRepository repository;
    private final MfaCrypto crypto;

    /** Consulta el permiso para la cuenta, portal y contraseña ya verificados. */
    public boolean trusted(Account account, MfaPortal portal, String token, OffsetDateTime now) {
        var device = new Registration(account.id(), portal, MfaCrypto.digest(token),
                account.version(), account.passwordDigest(), null);
        return repository.trusted(device, now);
    }

    /** Asocia el navegador y deja pendiente el aviso en la transacción del login. */
    public String register(UserPrincipal user, MfaPortal portal, String presented,
                           boolean remember, OffsetDateTime now) {
        if (portal == null) return null;
        String token = issuedToken(presented);
        byte[] hash = MfaCrypto.digest(token);
        boolean notify = repository.differentDevice(user.getIdUsuario(), hash);
        OffsetDateTime until = remember && !user.isRequiereCambioPassword() ? endOfDay(now) : null;
        repository.record(new Registration(user.getIdUsuario(), portal, hash, user.getVersionSesiones(),
                MfaCrypto.digest(user.getPassword()), until), notify ? now : null);
        return token;
    }

    private String issuedToken(String presented) {
        return presented != null && repository.issued(MfaCrypto.digest(presented))
                ? presented : crypto.challenge();
    }

    static OffsetDateTime endOfDay(OffsetDateTime now) {
        return now.atZoneSameInstant(PERU).toLocalDate().plusDays(1).atStartOfDay(PERU).toOffsetDateTime();
    }

}
