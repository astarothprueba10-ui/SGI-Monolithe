package monolithe.auth_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.MfaResetRequest;
import monolithe.auth_service.dto.MfaResetResponse;
import monolithe.auth_service.service.MfaAdminResetService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import monolithe.auth_service.exception.MfaFlowException;

/**
 * Solo Administración con sesión MFA completada y permiso users.edit.
 * Las comprobaciones de objetivo gestionable se repiten en el servicio y BD.
 */
@RestController
@RequestMapping("/api/security/users")
@RequiredArgsConstructor
public class MfaAdminController {
    private final MfaAdminResetService service;

    @PostMapping("/{idUsuario}/mfa/reset")
    @PreAuthorize("hasAuthority('ROLE_ADMINISTRADOR') and hasAuthority('users.edit')")
    public ResponseEntity<MfaResetResponse> reset(
            @PathVariable long idUsuario, @Valid @RequestBody MfaResetRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(service.restablecer(Long.parseLong(jwt.getSubject()), idUsuario, request));
        } catch (MailException error) {
            throw new MfaFlowException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El aviso de seguridad no pudo enviarse. No se completó el restablecimiento.");
        }
    }
}
