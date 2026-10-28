package monolithe.auth_service.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Optional;
import monolithe.auth_service.dto.UpdateUserRequest;
import monolithe.auth_service.exception.UserUpdateException;
import monolithe.auth_service.repository.UserEmailRepository;
import monolithe.auth_service.repository.UserEmailRepository.TargetUser;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;

class UserAccountUpdateServiceTest {
    private UserManagementService users;
    private UserEmailRepository emails;
    private UserAccountUpdateService service;

    @BeforeEach
    void configurar() {
        users = mock(UserManagementService.class);
        emails = mock(UserEmailRepository.class);
        service = new UserAccountUpdateService(users, emails);
        lenient().when(emails.puedeEditar(1L, 2L)).thenReturn(true);
        lenient().when(emails.bloquearUsuario(2L)).thenReturn(Optional.of(new TargetUser(77L, "usuario")));
        lenient().when(emails.obtenerTipoEmail()).thenReturn(Optional.of(42));
    }

    @Test
    void cambiaSoloElCorreoDeLaPersonaVinculadaSinCambiarLoginNiRoles() {
        var resultado = service.actualizar(1L, 2L, request("usuario", " Ana@OUTLOOK.COM "));
        assertEquals("ACTUALIZADO", resultado.estado());
        verify(emails).guardarCorreo(77L, 42, "Ana@outlook.com");
        verify(emails).registrarAuditoria(1L, 2L, 77L);
        verifyNoInteractions(users);
    }

    @Test
    void admiteElContratoAnteriorQueSoloActualizaElLogin() {
        when(users.actualizarUsuario(1L, 2L, "nuevo"))
                .thenReturn(new SecurityOperationResult("ACTUALIZADO", "OK"));
        assertEquals("ACTUALIZADO", service.actualizar(1L, 2L, request("nuevo", null)).estado());
        verifyNoInteractions(emails);
    }

    @Test
    void requierePermisoDeEdicionYRespetaLaProteccionDelUsuario() {
        when(emails.puedeEditar(1L, 2L)).thenReturn(false);
        var error = assertThrows(UserUpdateException.class,
                () -> service.actualizar(1L, 2L, request("usuario", "a@example.pe")));
        assertEquals("DENEGADO", error.getEstado());
        verify(emails, never()).guardarCorreo(anyLong(), anyInt(), anyString());
        verifyNoInteractions(users);
    }

    @Test
    void impideModificarLaCuentaPropiaPorEstaOperacion() {
        var error = assertThrows(UserUpdateException.class,
                () -> service.actualizar(1L, 1L, request("usuario", "a@example.pe")));
        assertEquals("USUARIO_PROTEGIDO", error.getEstado());
        verifyNoInteractions(users, emails);
    }

    @Test
    void rechazaCorreoAsignadoAOtraPersonaAntesDeCambiarElLogin() {
        when(emails.perteneceAOtraPersona(77L, 42, "a@example.pe")).thenReturn(true);
        var error = assertThrows(UserUpdateException.class,
                () -> service.actualizar(1L, 2L, request("nuevo", "a@example.pe")));
        assertEquals("CORREO_EXISTENTE", error.getEstado());
        verifyNoInteractions(users);
        verify(emails, never()).guardarCorreo(anyLong(), anyInt(), anyString());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "a@@empresa.pe", "a@empresa", "a@empresa.pe\r\nBcc:b@empresa.pe"})
    void rechazaCorreoInvalidoSinEscribir(String correo) {
        var error = assertThrows(UserUpdateException.class,
                () -> service.actualizar(1L, 2L, request("nuevo", correo)));
        assertEquals("EMAIL_INVALIDO", error.getEstado());
        verify(emails, never()).guardarCorreo(anyLong(), anyInt(), anyString());
        verifyNoInteractions(users);
    }

    @Test
    void noGuardaElCorreoSiFallaElCambioSimultaneoDelLogin() {
        when(users.actualizarUsuario(1L, 2L, "nuevo"))
                .thenReturn(new SecurityOperationResult("LOGIN_EXISTENTE", "El login ya está registrado."));
        var error = assertThrows(UserUpdateException.class,
                () -> service.actualizar(1L, 2L, request("nuevo", "a@example.pe")));
        assertEquals("LOGIN_EXISTENTE", error.getEstado());
        verify(emails, never()).guardarCorreo(anyLong(), anyInt(), anyString());
    }

    @Test
    void permiteActualizarCorreoYLoginEnUnaOperacion() {
        when(users.actualizarUsuario(1L, 2L, "nuevo"))
                .thenReturn(new SecurityOperationResult("ACTUALIZADO", "OK"));
        service.actualizar(1L, 2L, request("nuevo", "a@example.pe"));
        verify(users).actualizarUsuario(1L, 2L, "nuevo");
        verify(emails).guardarCorreo(77L, 42, "a@example.pe");
    }

    @Test
    void exigeTransaccionYPermisosDeAdministracionDeCuentas() throws Exception {
        var method = UserAccountUpdateService.class.getMethod("actualizar", Long.class, Long.class, UpdateUserRequest.class);
        assertNotNull(method.getAnnotation(Transactional.class));
        String permission = method.getAnnotation(PreAuthorize.class).value();
        assertTrue(permission.contains("users.edit"));
        assertTrue(permission.contains("ROLE_ADMINISTRADOR"));
        assertTrue(permission.contains("ROLE_GERENCIA"));
    }

    private UpdateUserRequest request(String login, String email) {
        var request = new UpdateUserRequest();
        request.setUsuarioLogin(login);
        request.setCorreoElectronico(email);
        return request;
    }
}
