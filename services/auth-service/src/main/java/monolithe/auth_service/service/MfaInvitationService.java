package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.MfaInvitationResponse;
import monolithe.auth_service.repository.MfaInvitationRepository;
import monolithe.auth_service.security.MfaCrypto;
import monolithe.auth_service.validation.EmailAddressPolicy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import monolithe.auth_service.exception.MfaFlowException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.Locale;

/**
 * Autogestión de invitación MFA: exige un reto posterior a la contraseña,
 * correo principal verificado y límites por cuenta. No emite JWT.
 */
@Service
@RequiredArgsConstructor
public class MfaInvitationService {
    private final MfaLoginService mfa;
    private final MfaInvitationRepository repository;
    private final EmailService email;

    @Transactional
    public MfaInvitationResponse enviar(String reto) {
        long usuario = mfa.autorizarInvitacionInicial(reto);
        var contacto = repository.correoPrincipal(usuario)
            .orElseThrow(() -> new MfaFlowException(HttpStatus.CONFLICT,
                "No tienes un correo principal registrado y activo. Contacta a administración."));
        String destinatario = EmailAddressPolicy.normalizeRequired(contacto.direccion());
        // Solo un correo inicialmente no verificado requiere registrar prueba de posesión.
        Long contactoPrueba = contacto.verificado() ? null : contacto.id();
        byte[] correoPruebaHash = contacto.verificado() ? null
            : MfaCrypto.digest(destinatario.toLowerCase(Locale.ROOT));

        String codigo = UUID.randomUUID().toString();
        byte[] hash = MfaCrypto.codeHash(codigo);
        if (!repository.emitir(usuario, hash, OffsetDateTime.now(ZoneOffset.UTC).plusHours(24),
                contactoPrueba, correoPruebaHash)) {
            throw new MfaFlowException(HttpStatus.TOO_MANY_REQUESTS,
                "Ya se envió una invitación recientemente o alcanzaste el límite de reenvíos. "
                + "Revisa tu correo y, si no recibes el mensaje, contacta a soporte.");
        }
        // Si falla el envío, se revierte la nueva invitación; el código no se registra ni expone.
        email.enviarInvitacionMfa(destinatario, codigo);
        return new MfaInvitationResponse(
            "Enviamos un código de activación al correo principal registrado de tu cuenta. "
            + "Cuando lo introduzcas comprobaremos que tienes acceso a esa dirección. "
            + "Revisa también spam. El código es válido durante 24 horas.", 60);
    }
}
