package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.MfaChallenge;
import monolithe.auth_service.dto.MfaCodeRequest;
import monolithe.auth_service.dto.MfaEnrollment;
import monolithe.auth_service.dto.MfaPortal;
import monolithe.auth_service.exception.MfaException;
import monolithe.auth_service.repository.MfaRepository;
import monolithe.auth_service.security.CustomUserDetailsService;
import monolithe.auth_service.security.MfaCrypto;
import monolithe.auth_service.security.MfaQrCode;
import monolithe.auth_service.security.Totp;
import monolithe.auth_service.security.UserPrincipal;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import monolithe.auth_service.exception.MfaFlowException;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;

import static monolithe.auth_service.security.MfaCrypto.digest;

/** Completa un inicio de sesión solamente después de comprobar el segundo factor. */
@Service
@RequiredArgsConstructor
public class MfaLoginService {
    private static final int CHALLENGE_SECONDS = 300;
    private static final int MAX_ATTEMPTS = 5;

    private final MfaRepository repository;
    private final CustomUserDetailsService users;
    private final MfaCrypto crypto;
    private final MfaQrCode qrCode;

    private record Pending(MfaRepository.Account account, MfaRepository.State state,
                           UserPrincipal principal, OffsetDateTime now) {}

    /** Identidad actual y tipo de verificación que se completó. */
    public record Verified(UserPrincipal principal, boolean factorChanged) {}

    /** Abre un reto ligado a la contraseña verificada y el portal solicitado. */
    @Transactional
    public MfaChallenge start(UserPrincipal principal, MfaPortal portal) {
        checkPortal(principal, portal);
        var account = repository.lockAccount(principal.getIdUsuario()).orElseThrow(MfaException::expired);
        if (account.version() != principal.getVersionSesiones()
                || !same(account.passwordDigest(), digest(principal.getPassword()))) throw MfaException.expired();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        var stored = repository.lockState(account.id());
        stored.ifPresent(state -> checkLock(state, now));
        String challenge = crypto.challenge();
        repository.open(account, portal, digest(challenge), now.plusSeconds(CHALLENGE_SECONDS));
        var step = stored.filter(state -> state.encryptedSeed() != null).isPresent()
                ? MfaChallenge.Paso.CODIGO : MfaChallenge.Paso.ACTIVACION;
        return new MfaChallenge(challenge, step, CHALLENGE_SECONDS);
    }

    /** Solo un reto posterior a la contraseña puede solicitar la invitación inicial. */
    public long autorizarInvitacionInicial(String reto) {
        Pending pending = resolve(reto);
        if (pending.state().encryptedSeed() != null || pending.state().pendingSeed() != null) {
            throw new MfaFlowException(HttpStatus.CONFLICT,
                    "El autenticador ya está configurado o hay una vinculación en curso.");
        }
        return pending.account().id();
    }

    /** Valida una invitación o un código de recuperación antes de mostrar el QR. */
    @Transactional(noRollbackFor = MfaException.class)
    public MfaEnrollment prepare(MfaCodeRequest request) {
        var pending = resolve(request.reto());
        if (pending.state().pendingSeed() != null) throw MfaException.expired();
        if (!validSetupCode(pending, request.codigo())) throw recordFailure(pending);
        if (pending.state().encryptedSeed() == null) {
            repository.confirmarCorreoPorCodigo(pending.account().id());
        }
        return createEnrollment(pending);
    }

    /** Comprueba y consume un código dentro de la misma transacción que emite la sesión. */
    @Transactional(propagation = Propagation.MANDATORY, noRollbackFor = MfaException.class)
    public Verified verify(MfaCodeRequest request) {
        var pending = resolve(request.reto());
        var state = pending.state();
        boolean enrolling = state.pendingSeed() != null;
        byte[] encrypted = enrolling ? state.pendingSeed() : state.encryptedSeed();
        if (encrypted == null) throw recordFailure(pending);
        long lastStep = enrolling ? -1 : state.lastStep();
        long step = matchStep(pending, encrypted, request.codigo(), lastStep);
        repository.consume(pending.account().id(), step);
        return new Verified(pending.principal(), enrolling);
    }

    private Pending resolve(String challenge) {
        byte[] hash = digest(challenge);
        long user = repository.findUser(hash).orElseThrow(MfaException::expired);
        var account = repository.lockAccount(user).orElseThrow(MfaException::expired);
        var state = repository.lockState(user).orElseThrow(MfaException::expired);
        var now = OffsetDateTime.now(ZoneOffset.UTC);
        if (!validChallenge(account, state, hash, now)) throw MfaException.expired();
        checkLock(state, now);
        return new Pending(account, state, currentPrincipal(account, state.portal()), now);
    }

    private boolean validChallenge(MfaRepository.Account account, MfaRepository.State state,
                                   byte[] hash, OffsetDateTime now) {
        return same(state.challengeHash(), hash) && state.challengeExpires() != null
                && state.challengeExpires().isAfter(now) && state.challengeVersion() != null
                && state.challengeVersion() == account.version()
                && same(state.challengePassword(), account.passwordDigest());
    }

    private UserPrincipal currentPrincipal(MfaRepository.Account account, MfaPortal portal) {
        try {
            var principal = (UserPrincipal) users.loadUserByUsername(account.login());
            if (!principal.getIdUsuario().equals(account.id()) || !principal.isEnabled()
                    || !principal.isAccountNonLocked()) throw MfaException.expired();
            checkPortal(principal, portal);
            return principal;
        } catch (UsernameNotFoundException e) {
            throw MfaException.expired();
        }
    }

    private void checkPortal(UserPrincipal principal, MfaPortal portal) {
        if (portal == null) return;
        boolean allowed = principal.getAuthorities().stream().anyMatch(authority -> {
            String code = authority.getAuthority();
            return portal == MfaPortal.CLIENTE ? "ROLE_CLIENTE".equals(code)
                    : code.matches("ROLE_[A-Z][A-Z0-9_]*") && !"ROLE_CLIENTE".equals(code);
        });
        if (!allowed) throw MfaException.wrongPortal();
    }

    private void checkLock(MfaRepository.State state, OffsetDateTime now) {
        if (state.lockedUntil() != null && state.lockedUntil().isAfter(now)) throw MfaException.locked();
    }

    private boolean validSetupCode(Pending pending, String code) {
        var state = pending.state();
        byte[] hash = MfaCrypto.codeHash(code);
        if (state.encryptedSeed() != null) return same(state.recoveryHash(), hash);
        return state.activationExpires() != null && state.activationExpires().isAfter(pending.now())
                && same(state.activationHash(), hash);
    }

    private MfaEnrollment createEnrollment(Pending pending) {
        byte[] seed = crypto.seed();
        try {
            String secret = Totp.base32(seed);
            String challenge = crypto.challenge();
            String recovery = crypto.recoveryCode();
            String qr = qrCode.image(pending.account().login(), secret);
            long id = pending.account().id();
            repository.stage(id, digest(challenge), pending.now().plusSeconds(CHALLENGE_SECONDS),
                    crypto.encrypt(id, seed), MfaCrypto.codeHash(recovery));
            return new MfaEnrollment(challenge, CHALLENGE_SECONDS, qr, secret, recovery);
        } finally {
            Arrays.fill(seed, (byte) 0);
        }
    }

    private long matchStep(Pending pending, byte[] encrypted, String code, long lastStep) {
        byte[] seed = crypto.decrypt(pending.account().id(), encrypted);
        try {
            return Totp.verify(seed, code, pending.now().toInstant(), lastStep)
                    .orElseThrow(() -> recordFailure(pending));
        } finally {
            Arrays.fill(seed, (byte) 0);
        }
    }

    private MfaException recordFailure(Pending pending) {
        var state = pending.state();
        int attempts = state.lockedUntil() == null ? state.attempts() + 1 : 1;
        boolean blocked = attempts >= MAX_ATTEMPTS;
        repository.failed(pending.account().id(), attempts, blocked ? pending.now().plusMinutes(5) : null);
        return blocked ? MfaException.locked() : MfaException.invalidCode();
    }

    private static boolean same(byte[] stored, byte[] candidate) {
        return stored != null && MessageDigest.isEqual(stored, candidate);
    }
}
