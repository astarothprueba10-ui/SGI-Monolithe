package monolithe.auth_service.service;

import monolithe.auth_service.repository.MfaInvitationRepository;
import monolithe.auth_service.repository.MfaInvitationRepository.ContactoCorreo;
import monolithe.auth_service.security.MfaCrypto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MfaInvitationServiceTest {
    private final MfaLoginService mfa = mock(MfaLoginService.class);
    private final MfaInvitationRepository repository = mock(MfaInvitationRepository.class);
    private final EmailService email = mock(EmailService.class);
    private final MfaInvitationService service = new MfaInvitationService(mfa, repository, email);
    private static final String RETO = "A".repeat(43);

    @BeforeEach
    void permitirTrasContrasena() {
        when(mfa.autorizarInvitacionInicial(RETO)).thenReturn(8L);
    }

    @Test
    void enviaAlCorreoRegistradoNoVerificadoYExigePruebaDePosesion() {
        when(repository.correoPrincipal(8L))
            .thenReturn(Optional.of(new ContactoCorreo(126L, "Cliente@Ejemplo.com", false)));
        when(repository.emitir(eq(8L), any(byte[].class), any(OffsetDateTime.class),
                eq(126L), any(byte[].class))).thenReturn(true);

        var respuesta = service.enviar(RETO);
        var codigo = ArgumentCaptor.forClass(String.class);
        var digest = ArgumentCaptor.forClass(byte[].class);
        var hashCorreo = ArgumentCaptor.forClass(byte[].class);

        verify(email).enviarInvitacionMfa(eq("Cliente@ejemplo.com"), codigo.capture());
        verify(repository).emitir(eq(8L), digest.capture(), any(OffsetDateTime.class),
                eq(126L), hashCorreo.capture());
        assertArrayEquals(MfaCrypto.codeHash(codigo.getValue()), digest.getValue());
        assertArrayEquals(MfaCrypto.digest("cliente@ejemplo.com"), hashCorreo.getValue());
        assertEquals(36, codigo.getValue().length());
        assertFalse(respuesta.mensaje().contains(codigo.getValue()));
        assertTrue(respuesta.mensaje().contains("comprobaremos"));
        assertEquals(60, respuesta.segundosEspera());
    }

    @Test
    void noReverificaUnCorreoYaConfirmado() {
        when(repository.correoPrincipal(8L))
            .thenReturn(Optional.of(new ContactoCorreo(126L, "cliente@ejemplo.com", true)));
        when(repository.emitir(eq(8L), any(byte[].class), any(OffsetDateTime.class),
                isNull(), isNull())).thenReturn(true);

        var resultado = service.enviar(RETO);
        assertNotNull(resultado);
        verify(repository).emitir(eq(8L), any(byte[].class), any(OffsetDateTime.class),
                isNull(), isNull());
        verify(email).enviarInvitacionMfa(eq("cliente@ejemplo.com"), anyString());
    }

    @Test
    void noInvitaSinCorreoPrincipalRegistrado() {
        when(repository.correoPrincipal(8L)).thenReturn(Optional.empty());
        var ex = assertThrows(ResponseStatusException.class, () -> service.enviar(RETO));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(repository, never()).emitir(anyLong(), any(), any(), any(), any());
        verifyNoInteractions(email);
    }

    @Test
    void respetaLimitesDeReenvio() {
        when(repository.correoPrincipal(8L))
            .thenReturn(Optional.of(new ContactoCorreo(126L, "persona@ejemplo.com", false)));
        when(repository.emitir(eq(8L), any(byte[].class), any(OffsetDateTime.class),
                eq(126L), any(byte[].class))).thenReturn(false);
        var ex = assertThrows(ResponseStatusException.class, () -> service.enviar(RETO));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
        verifyNoInteractions(email);
    }

    @Test
    void exigePrimerFactorAntesDeConsultarContactos() {
        when(mfa.autorizarInvitacionInicial(RETO))
            .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Reto expirado"));
        assertEquals(HttpStatus.UNAUTHORIZED,
            assertThrows(ResponseStatusException.class, () -> service.enviar(RETO)).getStatusCode());
        verifyNoInteractions(repository, email);
    }
}
