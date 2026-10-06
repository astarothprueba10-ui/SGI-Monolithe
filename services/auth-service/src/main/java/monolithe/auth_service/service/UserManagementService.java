package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.repository.UserManagementProcedureRepository;
import monolithe.auth_service.repository.projection.CreatedUserResult;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import monolithe.auth_service.repository.projection.ActivatedUserResult;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

import java.security.SecureRandom;
import java.util.Base64;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
public class UserManagementService {

        private static final int INITIAL_SECRET_BYTES = 32;

        private final UserManagementProcedureRepository repository;
        private final PasswordEncoder passwordEncoder;
        private final EmailService emailService;

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
        public SecurityOperationResult asociarCorreoPersona(
                        Long idActor,
                        Long idPersona,
                        String correo) {

                return repository.asociarCorreoPersona(idActor, idPersona, correo);
        }

        @Transactional
        public CreatedUserResult crearUsuario(
                        Long idActor,
                        Long idPersona,
                        String usuarioLogin) {

                String secretoInicial = generarSecretoInicial();

                String passwordHash = passwordEncoder.encode(
                                secretoInicial);

                return repository.crearUsuario(
                                idActor,
                                idPersona,
                                usuarioLogin,
                                passwordHash);
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