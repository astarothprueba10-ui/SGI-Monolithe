package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.MfaResetRequest;
import monolithe.auth_service.dto.MfaResetResponse;
import monolithe.auth_service.repository.MfaInvitationRepository;
import monolithe.auth_service.repository.UserEmailRepository;
import monolithe.auth_service.validation.EmailAddressPolicy;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Recuperación excepcional, autorizada y auditada: nunca permite resetearse a sí mismo. */
@Service
@RequiredArgsConstructor
public class MfaAdminResetService {
    private final JdbcClient jdbc;
    private final UserEmailRepository permissions;
    private final MfaInvitationRepository contacts;
    private final EmailService email;

    @Transactional
    public MfaResetResponse restablecer(long actor, long usuario, MfaResetRequest request) {
        if (actor <= 0 || usuario <= 0 || actor == usuario
                || request == null || !Boolean.TRUE.equals(request.identidadVerificada())
                || request.motivo() == null || request.motivo().trim().length() < 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Verifica la identidad, indica un motivo suficiente y selecciona otra cuenta.");
        }
        if (!permissions.puedeEditar(actor, usuario)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La cuenta no es gestionable por este operador.");
        }
        String login = jdbc.sql("SELECT usuario_login FROM public.seg_usuarios WHERE id_usuario = :id FOR NO KEY UPDATE")
                .param("id", usuario).query(String.class).optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuenta no encontrada."));
        if (!login.equals(request.confirmacionLogin().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El documento de confirmación no coincide.");
        }
        String correo = contacts.correoVerificado(usuario)
                .map(EmailAddressPolicy::normalizeRequired)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "La cuenta no tiene correo verificado. Valídalo antes de restablecer MFA."));

        int cambios = jdbc.sql("""
            UPDATE auth_mfa.estado
            SET secreto_cifrado = NULL, ultimo_paso = NULL, recuperacion_hash = NULL,
                activacion_hash = NULL, activacion_expira = NULL,
                reto_hash = NULL, reto_expira = NULL, version_reto = NULL,
                password_reto_hash = NULL, portal = NULL,
                pendiente_cifrado = NULL, pendiente_recuperacion_hash = NULL,
                intentos = 0, bloqueo_expira = NULL,
                activacion_ultimo_envio = NULL, activacion_ventana_inicio = NULL,
                activacion_envios_ventana = 0
            WHERE id_usuario = :id AND secreto_cifrado IS NOT NULL
            """).param("id", usuario).update();
        if (cambios != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Esta cuenta no tiene un autenticador activo que restablecer.");
        }
        jdbc.sql("UPDATE public.seg_usuarios SET version_sesiones = version_sesiones + 1 WHERE id_usuario = :id")
                .param("id", usuario).update();
        jdbc.sql("""
            UPDATE public.seg_sesiones
            SET fecha_revocacion = CURRENT_TIMESTAMP, motivo_revocacion = 'RESTABLECIMIENTO_MFA'
            WHERE id_usuario = :id AND fecha_revocacion IS NULL
            """).param("id", usuario).update();

        jdbc.sql("""
            SELECT public.sp_registrar_auditoria(
                :actor, 'SEGURIDAD', 'RESTABLECER_MFA_LOGIN', 'USUARIO',
                CAST(:usuario AS varchar), 'EXITOSO', CAST(:motivo AS varchar),
                jsonb_build_object('identidad_verificada', TRUE, 'id_usuario_objetivo', :usuario)
            )
            """)
            .param("actor", actor).param("usuario", Long.toString(usuario))
            .param("motivo", request.motivo().trim())
            .query(Long.class).single();

        // Si el correo falla, revierte el restablecimiento para no dejar la cuenta sin aviso.
        email.enviarAvisoRestablecimientoMfa(correo);
        return new MfaResetResponse("Autenticador restablecido y sesiones revocadas. "
                + "El usuario recibirá un aviso y podrá solicitar una nueva invitación al iniciar sesión.");
    }
}
