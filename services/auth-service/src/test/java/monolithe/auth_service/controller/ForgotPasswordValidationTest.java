package monolithe.auth_service.controller;

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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ForgotPasswordValidationTest {

    private MockMvc mockMvc;
    private PasswordResetService passwordResetService;

    @BeforeEach
    void setUp() {
        AuthenticationService authenticationService = mock(AuthenticationService.class);
        passwordResetService = mock(PasswordResetService.class);
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

    @Test
    void debeAceptarOrigenBACKOFFICE() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuario\":\"admin\",\"origen\":\"BACKOFFICE\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void debeAceptarOrigenPORTAL_CLIENTE() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuario\":\"cliente\",\"origen\":\"PORTAL_CLIENTE\"}"))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "portal_cliente", "backoffice", "WEB", "", "  "})
    void debeRechazarOrigenInvalido(String origen) throws Exception {
        String body = "{\"usuario\":\"admin\",\"origen\":\"" + origen + "\"}";
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verify(passwordResetService, never())
                .solicitarRecuperacion(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void debeRechazarOrigenAusente() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuario\":\"admin\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void debeRechazarUsuarioAusente() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"origen\":\"BACKOFFICE\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void debeRechazarUsuarioConCaracteresInvalidos() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuario\":\"<script>alert(1)</script>\",\"origen\":\"BACKOFFICE\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void debeRechazarUsuarioConMasDe120Caracteres() throws Exception {
        String usuarioLargo = "a".repeat(121);
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuario\":\"" + usuarioLargo + "\",\"origen\":\"BACKOFFICE\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void debeResponderMensajeGenerico200CuandoSmtpFalla() throws Exception {
        org.springframework.mail.MailSendException smtpError =
                new org.springframework.mail.MailSendException("SMTP caido");

        org.mockito.Mockito.doThrow(smtpError)
                .when(passwordResetService)
                .solicitarRecuperacion(anyString(), anyString(), any(), any());

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuario\":\"admin\",\"origen\":\"BACKOFFICE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensaje").exists());
    }
}
