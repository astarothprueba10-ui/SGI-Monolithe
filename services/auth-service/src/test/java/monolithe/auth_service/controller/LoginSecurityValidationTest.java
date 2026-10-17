package monolithe.auth_service.controller;

import monolithe.auth_service.dto.LoginResponse;
import monolithe.auth_service.exception.GlobalExceptionHandler;
import monolithe.auth_service.service.AuditService;
import monolithe.auth_service.service.AuthenticationService;
import monolithe.auth_service.service.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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
                auditService);

        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private String aJson(String usuario, String contrasena) {
        return aJson(usuario, contrasena, "DNI");
    }

    private String aJson(String usuario, String contrasena, String tipoDocumento) {
        String u = usuario == null ? "null" : "\"" + escapeJson(usuario) + "\"";
        String c = contrasena == null ? "null" : "\"" + escapeJson(contrasena) + "\"";
        String t = tipoDocumento == null ? "null" : "\"" + escapeJson(tipoDocumento) + "\"";
        return "{\"usuario\":" + u + ",\"contrasena\":" + c + ",\"tipoDocumento\":" + t + "}";
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
                "Admin S.",
                "AS",
                List.of("ROLE_ADMINISTRADOR"),
                false,
                "access-token",
                "refresh-token",
                "Bearer",
                900L,
                "Login exitoso");
    }

    private void assertDocumentoInvalidoResponde400(String tipoDocumento, String numeroDocumento) throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(aJson(numeroDocumento, "Password123!", tipoDocumento)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
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
                .andExpect(jsonPath("$.error").value("Bad Request"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @Test
    void usuarioConByteNuloResponde400YNuncaAutentica() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"usuario\":\"1234\\u0000567\",\"contrasena\":\"Password123!\",\"tipoDocumento\":\"DNI\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @Test
    void usuarioExcesivamenteLargoResponde400YNuncaAutentica() throws Exception {
        String usuarioLargo = "1".repeat(21);

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
    void dniCon7DigitosResponde400YNuncaAutentica() throws Exception {
        assertDocumentoInvalidoResponde400("DNI", "1234567");
    }

    @Test
    void dniCon9DigitosResponde400YNuncaAutentica() throws Exception {
        assertDocumentoInvalidoResponde400("DNI", "123456789");
    }

    @Test
    void dniConLetrasResponde400YNuncaAutentica() throws Exception {
        assertDocumentoInvalidoResponde400("DNI", "1234567A");
    }

    @Test
    void rucCon10DigitosResponde400YNuncaAutentica() throws Exception {
        assertDocumentoInvalidoResponde400("RUC", "1023456789");
    }

    @Test
    void rucCon12DigitosResponde400YNuncaAutentica() throws Exception {
        assertDocumentoInvalidoResponde400("RUC", "102345678901");
    }

    @Test
    void ceConMenosDe8CaracteresResponde400YNuncaAutentica() throws Exception {
        assertDocumentoInvalidoResponde400("CE", "1234567");
    }

    @Test
    void ceConMasDe12CaracteresResponde400YNuncaAutentica() throws Exception {
        assertDocumentoInvalidoResponde400("CE", "1234567890123");
    }

    @Test
    void pasaporteConMenosDe6CaracteresResponde400YNuncaAutentica() throws Exception {
        assertDocumentoInvalidoResponde400("PASAPORTE", "12345");
    }

    @Test
    void pasaporteConMasDe20CaracteresResponde400YNuncaAutentica() throws Exception {
        assertDocumentoInvalidoResponde400("PASAPORTE", "123456789012345678901");
    }

    @ParameterizedTest
    @CsvSource({
            "DNI, 12345678",
            "DNI, 87654321",
            "CE, 12345678",
            "CE, ABC123456789",
            "RUC, 20123456789",
            "PASAPORTE, AB1234",
            "PASAPORTE, PASSPORT123456789012"
    })
    void formatosValidosLleganAlServicioDeAutenticacion(String tipo, String documento) throws Exception {
        when(authenticationService.autenticar(any(), any(), any()))
                .thenReturn(crearRespuestaExitosa());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(aJson(documento, "Password123!", tipo)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idUsuario").value(1L));

        verify(authenticationService).autenticar(any(), any(), any());
    }

    @Test
    void contrasenaConCaracteresEspecialesLegitimosEsAceptada() throws Exception {
        when(authenticationService.autenticar(any(), any(), any()))
                .thenReturn(crearRespuestaExitosa());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(aJson("12345678", "Abc!@#$%_+-123")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idUsuario").value(1L));

        verify(authenticationService).autenticar(any(), any(), any());
    }

    @Test
    void contrasenaConCaracteresDeControlResponde400() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(aJson("12345678", "Abc\t123!")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("La contraseña contiene caracteres no permitidos"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @Test
    void contrasenaConByteNuloResponde400YNuncaAutentica() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"usuario\":\"12345678\",\"contrasena\":\"Abc\\u0000123!\",\"tipoDocumento\":\"DNI\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @Test
    void contrasenaExcesivamenteLargaResponde400() throws Exception {
        String claveLarga = "P".repeat(129);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(aJson("12345678", claveLarga)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("La contraseña no debe exceder 128 caracteres"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @Test
    void tipoDocumentoAusenteResponde400YNuncaAutentica() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"usuario\":\"12345678\",\"contrasena\":\"Password123!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("El tipo de documento es obligatorio"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @Test
    void tipoDocumentoVacioResponde400YNuncaAutentica() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(aJson("12345678", "Password123!", "   ")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @Test
    void tipoDocumentoNuloResponde400YNuncaAutentica() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(aJson("12345678", "Password123!", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("El tipo de documento es obligatorio"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }

    @ParameterizedTest
    @ValueSource(strings = { "CEDULA", "INVALIDO", "OTRO", "123" })
    void tipoDocumentoInvalidoResponde400YNuncaAutentica(String tipoInvalido) throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(aJson("12345678", "Password123!", tipoInvalido)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Selecciona un tipo de documento válido"));

        verify(authenticationService, never()).autenticar(any(), anyString(), anyString());
    }
}