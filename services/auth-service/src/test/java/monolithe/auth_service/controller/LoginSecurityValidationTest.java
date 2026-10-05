package monolithe.auth_service.controller;

import monolithe.auth_service.dto.LoginResponse;
import monolithe.auth_service.exception.GlobalExceptionHandler;
import monolithe.auth_service.service.AuditService;
import monolithe.auth_service.service.AuthenticationService;
import monolithe.auth_service.service.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LoginSecurityValidationTest {

    private MockMvc mockMvc;
    private AuthenticationService authenticationService;

    @BeforeEach
    void setUp() {
        authenticationService = mock(AuthenticationService.class);
        PasswordResetService passwordResetService = mock(PasswordResetService.class);
        AuditService auditService = mock(AuditService.class);

        AuthController authController = new AuthController(
                authenticationService,
                passwordResetService,
                auditService
        );

        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private String aJson(String usuario, String contrasena) {
        String u = usuario == null ? "null" : "\"" + escapeJson(usuario) + "\"";
        String c = contrasena == null ? "null" : "\"" + escapeJson(contrasena) + "\"";
        return "{\"usuario\":" + u + ",\"contrasena\":" + c + "}";
    }

    private String escapeJson(String valor) {
        return valor
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private LoginResponse crearRespuestaExitosa() {
        return new LoginResponse(
                1L,
                "admin@sigi.pe",
                List.of("ROLE_ADMINISTRADOR"),
                false,
                "access-token",
                "refresh-token",
                "Bearer",
                900L,
                "Login exitoso"
        );
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "' OR '1'='1",
            "admin@sigi.pe'--",
            "<script>alert(1)</script>",
            "<img src=x onerror=alert(1)>",
            "admin\t@sigi.pe",
            "admin\n@sigi.pe",
            "admin @sigi.pe"
    })
    void usuarioConPayloadInseguroResponde400YNuncaAutentica(String usuarioMalicioso) throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(aJson(usuarioMalicioso, "Password123!")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Ingresa un usuario válido"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @Test
    void usuarioConByteNuloResponde400YNuncaAutentica() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuario\":\"admin\\u0000@sigi.pe\",\"contrasena\":\"Password123!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @Test
    void usuarioExcesivamenteLargoResponde400YNuncaAutentica() throws Exception {
        String usuarioLargo = "a".repeat(121) + "@sigi.pe";

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(aJson(usuarioLargo, "Password123!")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @Test
    void usuarioVacioResponde400YNuncaAutentica() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(aJson("   ", "Password123!")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @Test
    void contrasenaConCaracteresEspecialesLegitimosEsAceptada() throws Exception {
        when(authenticationService.autenticar(any(), any(), any()))
                .thenReturn(crearRespuestaExitosa());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(aJson("admin@sigi.pe", "Abc!@#$%_+-123")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idUsuario").value(1L));

        verify(authenticationService).autenticar(any(), any(), any());
    }

    @Test
    void contrasenaConCaracteresDeControlResponde400() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(aJson("admin@sigi.pe", "Abc\t123!")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("La contraseña contiene caracteres no permitidos"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @Test
    void contrasenaConByteNuloResponde400YNuncaAutentica() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuario\":\"admin@sigi.pe\",\"contrasena\":\"Abc\\u0000123!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @Test
    void contrasenaExcesivamenteLargaResponde400() throws Exception {
        String claveLarga = "P".repeat(129);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(aJson("admin@sigi.pe", claveLarga)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("La contraseña no debe exceder 128 caracteres"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "admin@sigi.pe",
            "cmendoza@sigi.pe",
            "45872103",
            "usuario1",
            "diego.alvarado"
    })
    void identificadoresLegitimosSonAceptadosPorValidacion(String loginValido) throws Exception {
        when(authenticationService.autenticar(any(), any(), any()))
                .thenReturn(crearRespuestaExitosa());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(aJson(loginValido, "Abc!@#$%_+-123")))
                .andExpect(status().isOk());

        verify(authenticationService).autenticar(any(), any(), any());
    }
}
