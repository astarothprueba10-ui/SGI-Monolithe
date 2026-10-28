package monolithe.auth_service.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import monolithe.auth_service.dto.UpdateUserRequest;
import monolithe.auth_service.exception.UserUpdateException;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import monolithe.auth_service.service.AuditService;
import monolithe.auth_service.service.UserAccountUpdateService;
import monolithe.auth_service.service.UserManagementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;

class UserEmailUpdateControllerTest {
    private UserAccountUpdateService service;
    private UserManagementController controller;
    private final UpdateUserRequest request = new UpdateUserRequest();

    @BeforeEach
    void configurar() {
        service = mock(UserAccountUpdateService.class);
        controller = new UserManagementController(mock(UserManagementService.class), mock(AuditService.class), service);
        request.setUsuarioLogin("usuario");
        request.setCorreoElectronico("a@outlook.com");
    }

    @Test
    void guardaConElActorDelJwtYElUsuarioDeLaRuta() {
        when(service.actualizar(7L, 9L, request)).thenReturn(new SecurityOperationResult("ACTUALIZADO", "OK"));
        var result = controller.actualizarUsuario(9L, request, jwt());
        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(service).actualizar(7L, 9L, request);
    }

    @Test
    void devuelveConflictoParaUnCorreoDeOtraPersona() {
        when(service.actualizar(7L, 9L, request)).thenThrow(new UserUpdateException("CORREO_EXISTENTE", "Duplicado"));
        assertEquals(HttpStatus.CONFLICT, controller.actualizarUsuario(9L, request, jwt()).getStatusCode());
    }

    @Test
    void devuelveBadRequestParaUnCorreoInvalido() {
        when(service.actualizar(7L, 9L, request)).thenThrow(new UserUpdateException("EMAIL_INVALIDO", "Inválido"));
        assertEquals(HttpStatus.BAD_REQUEST, controller.actualizarUsuario(9L, request, jwt()).getStatusCode());
    }

    @Test
    void conservaLaProteccionDeCuentas() {
        when(service.actualizar(7L, 9L, request)).thenThrow(new UserUpdateException("USUARIO_PROTEGIDO", "Protegido"));
        assertEquals(HttpStatus.FORBIDDEN, controller.actualizarUsuario(9L, request, jwt()).getStatusCode());
    }

    private Jwt jwt() {
        return Jwt.withTokenValue("test").header("alg", "RS256").subject("7").build();
    }
}
