package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.MfaManualInvitationResponse;
import monolithe.auth_service.dto.MfaResetRequest;
import monolithe.auth_service.exception.MfaFlowException;
import monolithe.auth_service.repository.MfaInvitationRepository;
import monolithe.auth_service.repository.UserEmailRepository;
import monolithe.auth_service.security.MfaCrypto;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Alternativa asistida para cuentas sin correo verificado.
 * Solo Administración autenticada con MFA; nunca devuelve el código a un navegador anónimo.
 */
@Service
@RequiredArgsConstructor
public class MfaManualInvitationService {
    private final JdbcClient jdbc;
    private final UserEmailRepository permissions;
    private final MfaInvitationRepository invitations;

    @Transactional
    public MfaManualInvitationResponse emitir(long actor, long usuario, MfaResetRequest request) {
        if (actor <= 0 || usuario <= 0 || actor == usuario
                || request == null || !Boolean.TRUE.equals(request.identidadVerificada())
                || request.motivo() == null || request.motivo().trim().length() < 12) {
            throw new MfaFlowException(HttpStatus.BAD_REQUEST,
                    "Verifica la identidad, documenta el motivo y selecciona otra cuenta.");
        }
        if (!permissions.puedeEditar(actor, usuario)) {
            throw new MfaFlowException(HttpStatus.FORBIDDEN,
                    "La cuenta no es gestionable por este operador.");
        }
        String login = jdbc.sql("SELECT usuario_login FROM public.seg_usuarios WHERE id_usuario = :id FOR NO KEY UPDATE")
                .param("id", usuario).query(String.class).optional()
                .orElseThrow(() -> new MfaFlowException(HttpStatus.NOT_FOUND, "Cuenta no encontrada."));
        if (!login.equals(request.confirmacionLogin().trim())) {
            throw new MfaFlowException(HttpStatus.BAD_REQUEST,
                    "El documento de confirmación no coincide.");
        }
        invitations.asegurarEstado(usuario);
        String codigo = UUID.randomUUID().toString();
        if (!invitations.emitir(usuario, MfaCrypto.codeHash(codigo),
                OffsetDateTime.now(ZoneOffset.UTC).plusHours(24), null, null)) {
            throw new MfaFlowException(HttpStatus.TOO_MANY_REQUESTS,
                    "El autenticador ya está vinculado, hay una vinculación pendiente o se alcanzó el límite de invitaciones.");
        }
        // No se audita el código ni su hash. La operación completa es atómica.
        jdbc.sql("""
            SELECT public.sp_registrar_auditoria(
                :actor, 'SEGURIDAD', 'EMITIR_MFA_LOGIN_ASISTIDO', 'USUARIO',
                CAST(:usuario AS varchar), 'EXITOSO', CAST(:motivo AS varchar),
                jsonb_build_object('identidad_verificada', TRUE, 'id_usuario_objetivo', :usuario)
            )
            """).param("actor", actor).param("usuario", Long.toString(usuario))
                .param("motivo", request.motivo().trim()).query(Long.class).single();

        return new MfaManualInvitationResponse(codigo, 24,
                "Código mostrado una sola vez. Entrégalo solo al titular cuya identidad verificaste, "
              + "por un canal autorizado. El titular deberá ingresar su contraseña y vincular su propio autenticador.");
    }
}
