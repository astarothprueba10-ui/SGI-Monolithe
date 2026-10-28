package monolithe.auth_service.service;

import java.util.Objects;
import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.UpdateUserRequest;
import monolithe.auth_service.exception.UserUpdateException;
import monolithe.auth_service.repository.UserEmailRepository;
import monolithe.auth_service.repository.UserEmailRepository.TargetUser;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import monolithe.auth_service.validation.EmailAddressPolicy;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Edición administrativa del login y correo en una sola transacción. */
@Service
@RequiredArgsConstructor
public class UserAccountUpdateService {
    private final UserManagementService users;
    private final UserEmailRepository emails;

    /** Guarda el correo principal de la persona vinculada con las protecciones de cuenta. */
    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('users.edit')")
    public SecurityOperationResult actualizar(Long actor, Long usuario, UpdateUserRequest request) {
        if (request.getCorreoElectronico() == null) {
            return users.actualizarUsuario(actor, usuario, request.getUsuarioLogin());
        }
        validarPermisos(actor, usuario);
        String correo = normalizarCorreo(request.getCorreoElectronico());
        TargetUser target = emails.bloquearUsuario(usuario).orElseThrow(() ->
                new UserUpdateException("USUARIO_NO_ENCONTRADO", "La cuenta o su persona vinculada no están disponibles."));
        Integer tipo = emails.obtenerTipoEmail().orElseThrow(() ->
                new UserUpdateException("CONFIGURACION_INVALIDA", "No existe el tipo de contacto EMAIL activo."));
        validarDisponibilidad(target.idPersona(), tipo, correo);
        actualizarLogin(actor, usuario, target.usuarioLogin(), request.getUsuarioLogin());
        emails.guardarCorreo(target.idPersona(), tipo, correo);
        emails.registrarAuditoria(actor, usuario, target.idPersona());
        return new SecurityOperationResult("ACTUALIZADO", "Los datos de la cuenta y su correo se guardaron correctamente.");
    }

    private void validarPermisos(Long actor, Long usuario) {
        if (actor == null || Objects.equals(actor, usuario)) {
            throw new UserUpdateException("USUARIO_PROTEGIDO", "No puede editar su propia cuenta desde esta operación.");
        }
        if (!emails.puedeEditar(actor, usuario)) {
            throw new UserUpdateException("DENEGADO", "No posee autorización para modificar esta cuenta.");
        }
    }

    private String normalizarCorreo(String value) {
        try {
            String correo = EmailAddressPolicy.normalizeRequired(value);
            if (correo.length() > 180) throw new IllegalArgumentException("El correo no puede superar los 180 caracteres.");
            return correo;
        } catch (IllegalArgumentException exception) {
            throw new UserUpdateException("EMAIL_INVALIDO", exception.getMessage());
        }
    }

    private void validarDisponibilidad(Long persona, Integer tipo, String correo) {
        emails.bloquearDireccion(correo);
        if (emails.perteneceAOtraPersona(persona, tipo, correo)) {
            throw new UserUpdateException("CORREO_EXISTENTE", "El correo ya está registrado para otra persona.");
        }
    }

    private void actualizarLogin(Long actor, Long usuario, String actual, String nuevo) {
        if (actual.equalsIgnoreCase(nuevo)) return;
        SecurityOperationResult result = users.actualizarUsuario(actor, usuario, nuevo);
        if (!"ACTUALIZADO".equals(result.estado())) {
            throw new UserUpdateException(result.estado(), result.mensaje());
        }
    }
}
