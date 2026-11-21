package monolithe.auth_service.security;

import monolithe.auth_service.dto.MfaChallenge;
import monolithe.auth_service.dto.MfaCodeRequest;
import monolithe.auth_service.dto.MfaPortal;
import monolithe.auth_service.exception.MfaException;
import monolithe.auth_service.repository.MfaRepository;
import monolithe.auth_service.service.MfaLoginService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import static monolithe.auth_service.security.MfaCrypto.digest;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.AdditionalMatchers.aryEq;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MfaLoginServiceTest {
    private static final long ID = 3;
    private static final String RETO = "A".repeat(43);
    private static final String ACTIVACION = "01234567-89ab-4def-8123-456789abcdef";
    private static final String RECUPERACION = "01234567-89abcdef-01234567-89abcdef";
    private final MfaRepository repository = mock(MfaRepository.class);
    private final CustomUserDetailsService users = mock(CustomUserDetailsService.class);
    private final MfaRepository.Account account = new MfaRepository.Account(ID, "persona", 2, digest("hash"));
    private final UserPrincipal principal = new UserPrincipal(ID, "persona", "hash",
            List.of(new SimpleGrantedAuthority("ROLE_RRHH")), true, true, false, 2L);
    @TempDir Path temporary;
    private MfaCrypto crypto;
    private MfaLoginService service;

    @BeforeEach
    void prepare() throws Exception {
        Path key = temporary.resolve("test.key");
        Files.writeString(key, Base64.getEncoder().encodeToString(new byte[32]));
        crypto = new MfaCrypto(key.toString());
        service = new MfaLoginService(repository, users, crypto, new MfaQrCode());
        when(repository.findUser(any())).thenReturn(Optional.of(ID));
        when(repository.lockAccount(ID)).thenReturn(Optional.of(account));
        when(users.loadUserByUsername("persona")).thenReturn(principal);
    }

    @Test
    void permitsSecretFromEnvironmentWithoutMountedFile() {
        var encoded = Base64.getEncoder().encodeToString(new byte[32]);
        var cipher = new MfaCrypto("/missing/secret/file", encoded);
        var secret = cipher.seed();
        assertArrayEquals(secret, cipher.decrypt(ID, cipher.encrypt(ID, secret)));
        assertThrows(IllegalStateException.class,
                () -> new MfaCrypto("/missing/secret/file", "clave-invalida"));
    }

    @Test
    void startsOnlyAfterPasswordAndOpensNoSession() {
        when(repository.lockState(ID)).thenReturn(Optional.empty());
        var result = service.start(principal, MfaPortal.BACKOFFICE);
        assertEquals(MfaChallenge.Paso.ACTIVACION, result.paso());
        assertEquals(43, result.reto().length());
        verify(repository).open(eq(account), eq(MfaPortal.BACKOFFICE), aryEq(digest(result.reto())), any());
        assertFalse(result.toString().contains(result.reto()));
    }

    @Test
    void rejectsTheWrongPortalAndChangedPassword() {
        assertEquals("MFA_PORTAL_DENEGADO", assertThrows(MfaException.class,
                () -> service.start(principal, MfaPortal.CLIENTE)).code());
        when(repository.lockAccount(ID)).thenReturn(Optional.of(
                new MfaRepository.Account(ID, "persona", 2, digest("otro hash"))));
        assertEquals("MFA_RETO_EXPIRADO", assertThrows(MfaException.class,
                () -> service.start(principal, MfaPortal.BACKOFFICE)).code());
        verify(repository, never()).open(any(), any(), any(), any());
    }

    @Test
    void preparesQrOnlyAfterTheActivationProof() {
        setState(null, null, 0, null, after(4));
        assertThrows(MfaException.class, () -> service.prepare(new MfaCodeRequest(RETO, "falso")));
        verify(repository, never()).stage(anyLong(), any(), any(), any(), any());
        var setup = service.prepare(new MfaCodeRequest(RETO, ACTIVACION));
        assertNotEquals(RETO, setup.reto());
        assertTrue(setup.qr().startsWith("data:image/png;base64,"));
        assertEquals(32, setup.claveManual().length());
        var encrypted = ArgumentCaptor.forClass(byte[].class);
        verify(repository).stage(eq(ID), aryEq(digest(setup.reto())), any(), encrypted.capture(),
                aryEq(MfaCrypto.codeHash(setup.codigoRecuperacion())));
        assertEquals(setup.claveManual(), Totp.base32(crypto.decrypt(ID, encrypted.getValue())));
        verify(repository, never()).consume(anyLong(), anyLong());
    }

    @Test
    void firstLoginRequiresOwnershipOfThePendingAuthenticator() {
        byte[] seed = crypto.seed();
        setState(null, crypto.encrypt(ID, seed), 0, null, after(4));
        long step = Instant.now().getEpochSecond() / 30;
        var result = service.verify(new MfaCodeRequest(RETO, Totp.codeAt(seed, step)));
        assertTrue(result.factorChanged());
        verify(repository).consume(ID, step);
    }

    @Test
    void acceptsOnlyTheCurrentFactorWhenAlreadyEnrolled() {
        byte[] seed = crypto.seed();
        byte[] encrypted = crypto.encrypt(ID, seed);
        setState(encrypted, null, 0, null, after(4));
        long step = Instant.now().getEpochSecond() / 30;
        assertFalse(service.verify(new MfaCodeRequest(RETO, Totp.codeAt(seed, step))).factorChanged());
        verify(repository).consume(ID, step);
    }

    @Test
    void allowsRecoveryOnlyToPrepareAnotherAuthenticator() {
        setState(crypto.encrypt(ID, crypto.seed()), null, 0, null, after(4));
        var input = new MfaCodeRequest(RETO, RECUPERACION);
        assertThrows(MfaException.class, () -> service.verify(input));
        var setup = service.prepare(input);
        assertNotEquals(RECUPERACION, setup.codigoRecuperacion());
        verify(repository, never()).consume(anyLong(), anyLong());
    }

    @Test
    void refusesExpiredChallengeBeforeChangingAccount() {
        setState(null, null, 0, null, after(-4));
        assertEquals("MFA_RETO_EXPIRADO", assertThrows(MfaException.class,
                () -> service.prepare(new MfaCodeRequest(RETO, ACTIVACION))).code());
        verify(repository, never()).stage(anyLong(), any(), any(), any(), any());
    }

    @Test
    void openingAnotherChallengeDoesNotResetFailedAttempts() {
        setState(crypto.encrypt(ID, crypto.seed()), null, 4, null, after(4));
        assertEquals(MfaChallenge.Paso.CODIGO, service.start(principal, MfaPortal.BACKOFFICE).paso());
        assertEquals("MFA_BLOQUEADO", assertThrows(MfaException.class,
                () -> service.verify(new MfaCodeRequest(RETO, "falso"))).code());
        verify(repository).failed(eq(ID), eq(5), any());
        setState(null, null, 5, after(3), after(4));
        assertEquals("MFA_BLOQUEADO", assertThrows(MfaException.class,
                () -> service.start(principal, MfaPortal.BACKOFFICE)).code());
    }

    @Test
    void encryptedSeedsAreProtectedAgainstSwapsAndTampering() {
        byte[] seed = crypto.seed();
        byte[] encrypted = crypto.encrypt(ID, seed);
        assertArrayEquals(seed, crypto.decrypt(ID, encrypted));
        assertFalse(java.util.Arrays.equals(encrypted, crypto.encrypt(ID, seed)));
        assertThrows(IllegalStateException.class, () -> crypto.decrypt(ID + 1, encrypted));
        encrypted[encrypted.length - 1] ^= 1;
        assertThrows(IllegalStateException.class, () -> crypto.decrypt(ID, encrypted));
    }

    private void setState(byte[] seed, byte[] pending, int attempts, OffsetDateTime locked, OffsetDateTime expires) {
        var state = new MfaRepository.State(seed, seed == null ? null : -1L, MfaCrypto.codeHash(RECUPERACION),
                MfaCrypto.codeHash(ACTIVACION), after(4), digest(RETO), expires, 2L, digest("hash"),
                MfaPortal.BACKOFFICE, pending, attempts, locked);
        when(repository.lockState(ID)).thenReturn(Optional.of(state));
    }

    private OffsetDateTime after(int minutes) {
        return OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(minutes);
    }
}
