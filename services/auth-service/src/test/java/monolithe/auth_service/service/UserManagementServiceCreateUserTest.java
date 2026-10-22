package monolithe.auth_service.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

import java.util.List;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import monolithe.auth_service.repository.UserManagementProcedureRepository;
import monolithe.auth_service.repository.projection.CreatedUserResult;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class UserManagementServiceCreateUserTest {

    private static final Long ACTOR_ID = 12L;
    private static final Long PERSONA_ID = 45L;
    private static final Long USER_ID = 87L;

    @Mock
    private UserManagementProcedureRepository repository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmailService emailService;
    @Mock
    private SecurityQueryService securityQueryService;

    @InjectMocks
    private UserManagementService service;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void prepararRespuestas() throws Exception {
        lenient().when(passwordEncoder.encode(any())).thenReturn("password-hash");
        lenient().when(repository.crearUsuario(eq(ACTOR_ID), eq(PERSONA_ID), eq("123456"), eq("password-hash")))
                .thenReturn(new CreatedUserResult(USER_ID, "CREADO", "Cuenta creada"));
    }

    @AfterEach
    void limpiarContextoSeguridad() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void permiteTrabajadorActivoConDocumentoNoVerificadoSiSupabaseLoDeclaraElegible() throws Exception {
        autenticar("ROLE_ADMINISTRADOR");
        contextoPersona("[\"TRABAJADOR\"]", true, false);
        contextoRoles("[{\"codigo\":\"RRHH\",\"activo\":true,\"asignableRrhh\":true}]");
        when(repository.asignarRol(ACTOR_ID, USER_ID, "RRHH"))
                .thenReturn(new SecurityOperationResult("ASIGNADO", "Asignado"));

        CreatedUserResult resultado = service.crearUsuario(ACTOR_ID, PERSONA_ID, "123456", List.of("RRHH"));

        assertEquals("CREADO", resultado.estado());
        verify(repository).asignarRol(ACTOR_ID, USER_ID, "RRHH");
    }

    @Test
    void exigeRolClienteParaPersonaConAmbasRelaciones() throws Exception {
        autenticar("ROLE_ADMINISTRADOR");
        contextoPersona("[\"TRABAJADOR\",\"CLIENTE\"]", true, true);

        CreatedUserResult resultado = service.crearUsuario(ACTOR_ID, PERSONA_ID, "123456", List.of("RRHH"));

        assertEquals("ROL_CLIENTE_OBLIGATORIO", resultado.estado());
        verify(repository, never()).crearUsuario(any(), any(), any(), any());
    }

    @Test
    void permiteClienteObligatorioConRolInternoOpcionalParaRelacionDoble() throws Exception {
        autenticar("ROLE_ADMINISTRADOR");
        contextoPersona("[\"TRABAJADOR\",\"CLIENTE\"]", true, true);
        contextoRoles("[{\"codigo\":\"CLIENTE\",\"activo\":true,\"asignableRrhh\":true},"
                + "{\"codigo\":\"RRHH\",\"activo\":true,\"asignableRrhh\":true}]");
        when(repository.asignarRol(ACTOR_ID, USER_ID, "CLIENTE"))
                .thenReturn(new SecurityOperationResult("ASIGNADO", "Asignado"));
        when(repository.asignarRol(ACTOR_ID, USER_ID, "RRHH"))
                .thenReturn(new SecurityOperationResult("ASIGNADO", "Asignado"));

        CreatedUserResult resultado = service.crearUsuario(
                ACTOR_ID, PERSONA_ID, "123456", List.of("CLIENTE", "RRHH"));

        assertEquals("CREADO", resultado.estado());
        verify(repository).asignarRol(ACTOR_ID, USER_ID, "CLIENTE");
        verify(repository).asignarRol(ACTOR_ID, USER_ID, "RRHH");
    }

    @Test
    void asignaClienteAutomaticamenteParaClienteExclusivo() throws Exception {
        autenticar("ROLE_ADMINISTRADOR");
        contextoPersona("[\"CLIENTE\"]", true, true);
        contextoRoles("[{\"codigo\":\"CLIENTE\",\"activo\":true,\"asignableRrhh\":true}]");
        when(repository.asignarRol(ACTOR_ID, USER_ID, "CLIENTE"))
                .thenReturn(new SecurityOperationResult("ASIGNADO", "Asignado"));

        CreatedUserResult resultado = service.crearUsuario(ACTOR_ID, PERSONA_ID, "123456", List.of("CLIENTE"));

        assertEquals("CREADO", resultado.estado());
        verify(repository).asignarRol(ACTOR_ID, USER_ID, "CLIENTE");
    }

    @Test
    void permiteCorreoPrincipalNoVerificadoCuandoSupabaseLoIncluyeEnElegibilidad() throws Exception {
        autenticar("ROLE_ADMINISTRADOR");
        when(securityQueryService.listarPersonasSinUsuario(ACTOR_ID)).thenReturn(objectMapper.readTree(
                "[{\"idPersona\":45,\"elegible\":true,\"relaciones\":[\"TRABAJADOR\"],"
                        + "\"correo\":\"persona@example.test\",\"correoVerificado\":false}]"));
        contextoRoles("[{\"codigo\":\"RRHH\",\"activo\":true,\"asignableRrhh\":true}]");
        when(repository.asignarRol(ACTOR_ID, USER_ID, "RRHH"))
                .thenReturn(new SecurityOperationResult("ASIGNADO", "Asignado"));

        CreatedUserResult resultado = service.crearUsuario(ACTOR_ID, PERSONA_ID, "123456", List.of("RRHH"));

        assertEquals("CREADO", resultado.estado());
        verify(repository).crearUsuario(any(), any(), any(), any());
        verify(repository).asignarRol(ACTOR_ID, USER_ID, "RRHH");
    }

    @Test
    void rechazaRolProtegidoAntesDeCrearCuenta() throws Exception {
        autenticar("ROLE_ADMINISTRADOR", "users.create", "users.assign_role");
        contextoPersona("[\"CLIENTE\"]", true, true);
        contextoRoles("[{\"codigo\":\"CLIENTE\",\"activo\":true,\"asignableRrhh\":false}]");

        CreatedUserResult resultado = service.crearUsuario(ACTOR_ID, PERSONA_ID, "123456", List.of("CLIENTE"));

        assertEquals("ROL_NO_AUTORIZADO", resultado.estado());
        verify(repository, never()).crearUsuario(any(), any(), any(), any());
    }

    @Test
    void administradorConPermisosEfectivosPuedeAsignarRolesInternosProtegidos() throws Exception {
        autenticar("ROLE_ADMINISTRADOR");
        contextoPersona("[\"TRABAJADOR\"]", true, true);
        contextoRoles("[{\"codigo\":\"ADMINISTRADOR\",\"activo\":true,\"asignableRrhh\":false},"
                + "{\"codigo\":\"LOGISTICA\",\"activo\":true,\"asignableRrhh\":false},"
                + "{\"codigo\":\"OPERACIONES\",\"activo\":true,\"asignableRrhh\":false}]");
        when(repository.asignarRol(ACTOR_ID, USER_ID, "ADMINISTRADOR"))
                .thenReturn(new SecurityOperationResult("ASIGNADO", "Asignado"));
        when(repository.asignarRol(ACTOR_ID, USER_ID, "LOGISTICA"))
                .thenReturn(new SecurityOperationResult("ASIGNADO", "Asignado"));
        when(repository.asignarRol(ACTOR_ID, USER_ID, "OPERACIONES"))
                .thenReturn(new SecurityOperationResult("ASIGNADO", "Asignado"));

        CreatedUserResult resultado = service.crearUsuario(ACTOR_ID, PERSONA_ID, "123456",
                List.of("ADMINISTRADOR", "LOGISTICA", "OPERACIONES"));

        assertEquals("CREADO", resultado.estado());
        verify(repository).asignarRol(ACTOR_ID, USER_ID, "ADMINISTRADOR");
        verify(repository).asignarRol(ACTOR_ID, USER_ID, "LOGISTICA");
        verify(repository).asignarRol(ACTOR_ID, USER_ID, "OPERACIONES");
    }

    @Test
    void gerenciaConPermisosEfectivosPuedeAsignarRolesInternosProtegidos() throws Exception {
        autenticar("ROLE_GERENCIA");
        contextoPersona("[\"TRABAJADOR\"]", true, true);
        contextoRoles("[{\"codigo\":\"GERENCIA\",\"activo\":true,\"asignableRrhh\":false}]");
        when(repository.asignarRol(ACTOR_ID, USER_ID, "GERENCIA"))
                .thenReturn(new SecurityOperationResult("ASIGNADO", "Asignado"));

        CreatedUserResult resultado = service.crearUsuario(ACTOR_ID, PERSONA_ID, "123456", List.of("GERENCIA"));

        assertEquals("CREADO", resultado.estado());
        verify(repository).asignarRol(ACTOR_ID, USER_ID, "GERENCIA");
    }

    @Test
    void rolPrivilegiadoSinTodosLosPermisosNoPuedeOmitirRestriccionRrhh() throws Exception {
        autenticar("ROLE_ADMINISTRADOR", "users.create", "users.assign_role");
        contextoPersona("[\"TRABAJADOR\"]", true, true);
        contextoRoles("[{\"codigo\":\"LOGISTICA\",\"activo\":true,\"asignableRrhh\":false}]");

        CreatedUserResult resultado = service.crearUsuario(ACTOR_ID, PERSONA_ID, "123456", List.of("LOGISTICA"));

        assertEquals("ROL_NO_AUTORIZADO", resultado.estado());
        verify(repository, never()).crearUsuario(any(), any(), any(), any());
    }

    @Test
    void rrhhNoPuedeCrearCuentasAunqueTengaPermisosYElRolSeaAsignableParaRrhh() throws Exception {
        autenticar("ROLE_RRHH");

        CreatedUserResult resultado = service.crearUsuario(ACTOR_ID, PERSONA_ID, "123456", List.of("RRHH"));

        assertEquals("DENEGADO", resultado.estado());
        verify(repository, never()).crearUsuario(any(), any(), any(), any());
        verify(securityQueryService, never()).listarPersonasSinUsuario(ACTOR_ID);
    }

    @Test
    void administradorSinPermisoCrearNoPuedeCrearCuentas() {
        autenticar("ROLE_ADMINISTRADOR", "users.assign_role", "roles.assign_permissions");

        CreatedUserResult resultado = service.crearUsuario(ACTOR_ID, PERSONA_ID, "123456", List.of("RRHH"));

        assertEquals("DENEGADO", resultado.estado());
        verify(repository, never()).crearUsuario(any(), any(), any(), any());
        verify(securityQueryService, never()).listarPersonasSinUsuario(ACTOR_ID);
    }

    @Test
    void sinRolPrivilegiadoNoPuedeCrearCuentasAunqueTengaPermisos() {
        SecurityContextHolder.clearContext();

        CreatedUserResult resultado = service.crearUsuario(ACTOR_ID, PERSONA_ID, "123456", List.of("RRHH"));

        assertEquals("DENEGADO", resultado.estado());
        verify(repository, never()).crearUsuario(any(), any(), any(), any());
        verify(securityQueryService, never()).listarPersonasSinUsuario(ACTOR_ID);
    }

    @Test
    void fallaLaOperacionParaQueLaTransaccionRevierteElAltaSiFallaUnaAsignacion() throws Exception {
        autenticar("ROLE_ADMINISTRADOR");
        contextoPersona("[\"TRABAJADOR\"]", true, true);
        contextoRoles("[{\"codigo\":\"RRHH\",\"activo\":true,\"asignableRrhh\":true},"
                + "{\"codigo\":\"AUDITOR\",\"activo\":true,\"asignableRrhh\":true}]");
        when(repository.asignarRol(ACTOR_ID, USER_ID, "RRHH"))
                .thenReturn(new SecurityOperationResult("ASIGNADO", "Asignado"));
        when(repository.asignarRol(ACTOR_ID, USER_ID, "AUDITOR"))
                .thenReturn(new SecurityOperationResult("ROL_PROTEGIDO", "No autorizado"));
        UserCreationException resultado = assertThrows(UserCreationException.class, () ->
                service.crearUsuario(ACTOR_ID, PERSONA_ID, "123456", List.of("RRHH", "AUDITOR")));

        assertEquals("ROL_PROTEGIDO", resultado.getEstado());
        verify(repository).crearUsuario(ACTOR_ID, PERSONA_ID, "123456", "password-hash");
        verify(repository).asignarRol(ACTOR_ID, USER_ID, "RRHH");
        verify(repository).asignarRol(ACTOR_ID, USER_ID, "AUDITOR");
    }

    private void contextoPersona(String relaciones, boolean elegible, boolean verificado) throws Exception {
        String json = "[{\"idPersona\":45,\"elegible\":" + elegible
                + ",\"relaciones\":" + relaciones
                + ",\"correo\":\"persona@example.test\",\"correoVerificado\":true"
                + ",\"documentoVerificado\":" + verificado + "}]";
        when(securityQueryService.listarPersonasSinUsuario(ACTOR_ID))
                .thenReturn(objectMapper.readTree(json));
    }

    private void contextoRoles(String json) throws Exception {
        when(securityQueryService.listarRoles(ACTOR_ID)).thenReturn(objectMapper.readTree(json));
    }

    private void autenticar(String rol, String... permisos) {
        List<SimpleGrantedAuthority> autoridades = Stream.concat(
                Stream.of(rol),
                (permisos.length == 0
                        ? Stream.of("users.create", "users.assign_role", "roles.assign_permissions")
                        : Stream.of(permisos)))
                .map(SimpleGrantedAuthority::new)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("actor", "token", autoridades));
    }
}
