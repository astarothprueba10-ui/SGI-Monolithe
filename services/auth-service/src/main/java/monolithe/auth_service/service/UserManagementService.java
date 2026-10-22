package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.repository.UserManagementProcedureRepository;
import monolithe.auth_service.repository.projection.CreatedUserResult;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import monolithe.auth_service.repository.projection.ActivatedUserResult;
import tools.jackson.databind.JsonNode;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

import java.security.SecureRandom;
import java.util.Base64;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
@RequiredArgsConstructor
public class UserManagementService {

        private static final int INITIAL_SECRET_BYTES = 32;

        private final UserManagementProcedureRepository repository;
        private final PasswordEncoder passwordEncoder;
        private final EmailService emailService;
        private final SecurityQueryService securityQueryService;

        private final SecureRandom secureRandom = new SecureRandom();

        @Transactional
        public SecurityOperationResult actualizarUsuario(
                        Long idActor,
                        Long idUsuario,
                        String nuevoLogin) {

                if (idActor != null && idActor.equals(idUsuario)) {
                        return new SecurityOperationResult(
                                        "USUARIO_PROTEGIDO",
                                        "No puede editar su propia cuenta.");
                }

                return repository.actualizarLoginUsuario(
                                idActor,
                                idUsuario,
                                nuevoLogin);
        }

        @Transactional
        public CreatedUserResult crearUsuario(
                        Long idActor,
                        Long idPersona,
                        String usuarioLogin,
                        List<String> codigosRol) {

                if (!puedeGestionarCuentas("users.create", "users.assign_role")) {
                        return new CreatedUserResult(null, "DENEGADO",
                                        "Solo Administrador o Gerencia con los permisos correspondientes puede crear cuentas.");
                }

                List<String> roles = normalizarRoles(codigosRol);
                if (roles.isEmpty() || new HashSet<>(roles).size() != roles.size()) {
                        return new CreatedUserResult(null, "ROL_NO_PERMITIDO",
                                        "La lista de roles está vacía o contiene roles duplicados.");
                }

                JsonNode personas = securityQueryService.listarPersonasSinUsuario(idActor);
                JsonNode persona = buscarPorId(personas, "idPersona", idPersona);
                if (persona == null || !persona.path("elegible").asBoolean(false)) {
                        return new CreatedUserResult(null, "NO_ELEGIBLE",
                                        "La persona no está disponible o Supabase no la declara elegible.");
                }

                JsonNode relaciones = persona.path("relaciones");
                if (!relaciones.isArray()) {
                        return new CreatedUserResult(null, "CONFIGURACION_INVALIDA",
                                        "Supabase aún no devuelve las relaciones de la persona en el contrato de elegibilidad.");
                }

                boolean esTrabajador = contieneRelacion(relaciones, "TRABAJADOR");
                boolean esCliente = contieneRelacion(relaciones, "CLIENTE");
                if (!esTrabajador && !esCliente) {
                        return new CreatedUserResult(null, "RELACION_INVALIDA",
                                        "La persona no tiene una relación vigente de trabajador o cliente.");
                }

                boolean incluyeCliente = roles.contains("CLIENTE");
                long cantidadRolesInternos = roles.stream().filter(rol -> !"CLIENTE".equals(rol)).count();
                if (esCliente && !incluyeCliente) {
                        return new CreatedUserResult(null, "ROL_CLIENTE_OBLIGATORIO",
                                        "El rol CLIENTE es obligatorio para personas vinculadas como clientes.");
                }
                if (!esCliente && incluyeCliente) {
                        return new CreatedUserResult(null, "ROL_NO_PERMITIDO",
                                        "El rol CLIENTE solo puede asignarse a una persona con relación de cliente.");
                }
                if (esTrabajador && !esCliente && cantidadRolesInternos == 0) {
                        return new CreatedUserResult(null, "ROL_INTERNO_OBLIGATORIO",
                                        "Debe asignarse al menos un rol interno a un trabajador.");
                }
                if (esCliente && !esTrabajador && cantidadRolesInternos > 0) {
                        return new CreatedUserResult(null, "ROL_NO_PERMITIDO",
                                        "A una persona vinculada únicamente como cliente solo se le asigna el rol CLIENTE.");
                }

                String correo = persona.path("correo").asString("").trim();
                if (correo.isBlank() || !correo.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                        return new CreatedUserResult(null, "CORREO_NO_DISPONIBLE",
                                        "Se requiere un correo principal activo y válido antes de activar la cuenta.");
                }

                JsonNode rolesAutorizados = securityQueryService.listarRoles(idActor);
                boolean puedeAsignarRolesProtegidos = puedeAsignarRolesInternosProtegidos();
                for (String codigo : roles) {
                        JsonNode rol = buscarPorCodigo(rolesAutorizados, codigo);
                        if (rol == null || !rol.path("activo").asBoolean(false)
                                        || (!puedeAsignarRolesProtegidos
                                                        && !rol.path("asignableRrhh").asBoolean(false))) {
                                return new CreatedUserResult(null, "ROL_NO_AUTORIZADO",
                                                "No está autorizado para asignar el rol " + codigo + ".");
                        }
                }

                String secretoInicial = generarSecretoInicial();

                String passwordHash = passwordEncoder.encode(
                                secretoInicial);

                CreatedUserResult creado = repository.crearUsuario(
                                idActor,
                                idPersona,
                                usuarioLogin,
                                passwordHash);

                if (!"CREADO".equals(creado.estado())) {
                        return creado;
                }
                if (creado.idUsuario() == null) {
                        throw new UserCreationException("CONFIGURACION_INVALIDA",
                                        "Supabase confirmó el alta sin devolver el identificador de usuario.");
                }

                for (String codigoRol : roles) {
                        SecurityOperationResult asignacion = repository.asignarRol(
                                        idActor,
                                        creado.idUsuario(),
                                        codigoRol);
                        if (!"ASIGNADO".equals(asignacion.estado())) {
                                throw new UserCreationException(asignacion.estado(), asignacion.mensaje());
                        }
                }

                return creado;
        }

        private boolean puedeAsignarRolesInternosProtegidos() {
                return puedeGestionarCuentas("users.create", "users.assign_role", "roles.assign_permissions");
        }

        private boolean puedeGestionarCuentas(String... permisosRequeridos) {
                Authentication autenticacion = SecurityContextHolder.getContext().getAuthentication();
                if (autenticacion == null || !autenticacion.isAuthenticated()) {
                        return false;
                }

                Set<String> autoridades = autenticacion.getAuthorities().stream()
                                .map(authority -> authority.getAuthority())
                                .collect(Collectors.toSet());
                boolean tieneRolPrivilegiado = autoridades.contains("ROLE_ADMINISTRADOR")
                                || autoridades.contains("ROLE_GERENCIA");
                return tieneRolPrivilegiado && autoridades.containsAll(Set.of(permisosRequeridos));
        }

        private List<String> normalizarRoles(List<String> codigosRol) {
                if (codigosRol == null) return List.of();
                List<String> normalizados = new ArrayList<>();
                for (String codigo : codigosRol) {
                        if (codigo == null || codigo.isBlank()) return List.of();
                        normalizados.add(codigo.trim().toUpperCase(Locale.ROOT));
                }
                return List.copyOf(normalizados);
        }

        private JsonNode buscarPorId(JsonNode lista, String campoId, Long id) {
                if (lista == null || !lista.isArray() || id == null) return null;
                for (JsonNode item : lista) {
                        if (item.path(campoId).asLong(Long.MIN_VALUE) == id) return item;
                }
                return null;
        }

        private JsonNode buscarPorCodigo(JsonNode lista, String codigo) {
                if (lista == null || !lista.isArray()) return null;
                for (JsonNode item : lista) {
                        if (codigo.equals(item.path("codigo").asString())) return item;
                }
                return null;
        }

        private boolean contieneRelacion(JsonNode relaciones, String relacionBuscada) {
                for (JsonNode relacion : relaciones) {
                        if (relacionBuscada.equalsIgnoreCase(relacion.asString())) return true;
                }
                return false;
        }

        @Transactional
        public SecurityOperationResult activarUsuario(Long idActor, Long idUsuario) {
                String passwordTemporal = generarSecretoInicial();
                String passwordHash = passwordEncoder.encode(passwordTemporal);
                OffsetDateTime expiraEn = OffsetDateTime.now(ZoneOffset.UTC).plusHours(24);

                ActivatedUserResult resultado = repository.activarUsuario(idActor, idUsuario, passwordHash, expiraEn);

                if ("ACTIVADO".equals(resultado.estado())) {
                        emailService.enviarCredencialesTemporales(resultado.correo(), resultado.usuarioLogin(),
                                        passwordTemporal, 24);
                }

                return new SecurityOperationResult(resultado.estado(), resultado.mensaje());
        }

        @Transactional
        public SecurityOperationResult desactivarUsuario(
                        Long idActor,
                        Long idUsuario) {

                return repository.desactivarUsuario(
                                idActor,
                                idUsuario);
        }

        @Transactional
        public SecurityOperationResult asignarRol(
                        Long idActor,
                        Long idUsuario,
                        String codigoRol) {

                return repository.asignarRol(
                                idActor,
                                idUsuario,
                                codigoRol);
        }

        @Transactional
        public SecurityOperationResult revocarRol(
                        Long idActor,
                        Long idUsuario,
                        String codigoRol) {

                return repository.revocarRol(
                                idActor,
                                idUsuario,
                                codigoRol);
        }

        @Transactional
        public SecurityOperationResult reemplazarRol(
                        Long idActor,
                        Long idUsuario,
                        String codigoRolActual,
                        String codigoRolNuevo) {

                if (idActor != null && idActor.equals(idUsuario)) {
                        return new SecurityOperationResult(
                                        "USUARIO_PROTEGIDO",
                                        "No puede editar los roles de su propia cuenta desde esta operación.");
                }

                String rolActual = codigoRolActual == null
                                ? ""
                                : codigoRolActual.trim().toUpperCase();

                String rolNuevo = codigoRolNuevo == null
                                ? ""
                                : codigoRolNuevo.trim().toUpperCase();

                if (rolActual.isBlank() || rolNuevo.isBlank()) {
                        return new SecurityOperationResult(
                                        "INVALIDO",
                                        "Debe indicar el rol actual y el nuevo rol.");
                }

                if (rolActual.equals(rolNuevo)) {
                        return new SecurityOperationResult(
                                        "ACTUALIZADO",
                                        "El usuario ya posee el rol indicado.");
                }

                // Primero se agrega el nuevo rol.
                // Así la cuenta nunca queda temporalmente sin roles.
                SecurityOperationResult asignacion = repository.asignarRol(
                                idActor,
                                idUsuario,
                                rolNuevo);

                if (!"ASIGNADO".equals(asignacion.estado())) {
                        return asignacion;
                }

                // Luego se retira el anterior.
                SecurityOperationResult revocacion = repository.revocarRol(
                                idActor,
                                idUsuario,
                                rolActual);

                if (!"REVOCADO".equals(revocacion.estado())) {

                        // IMPORTANTE:
                        // La asignación anterior también debe deshacerse.
                        TransactionAspectSupport
                                        .currentTransactionStatus()
                                        .setRollbackOnly();

                        return revocacion;
                }

                return new SecurityOperationResult(
                                "ACTUALIZADO",
                                "Rol del usuario actualizado correctamente.");
        }

        private String generarSecretoInicial() {

                byte[] bytes = new byte[INITIAL_SECRET_BYTES];

                secureRandom.nextBytes(bytes);

                return Base64
                                .getUrlEncoder()
                                .withoutPadding()
                                .encodeToString(bytes);
        }
}
