
package monolithe.auth_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.ConfirmacionCambioCorreoRequest;
import monolithe.auth_service.service.EmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping("/api/auth/internal/mail")
@RequiredArgsConstructor
public class InternalMailController {

    private final EmailService emailService;

    @Value("${security.internal.mail-key:}")
    private String internalMailKey;

    @PostMapping("/confirmacion-cambio-correo")
    @PreAuthorize("hasAuthority('hr.edit')")
    public ResponseEntity<Void> enviarConfirmacionCambioCorreo(
            @RequestHeader(value = "X-Internal-Service-Key", required = false) String providedKey,
            @RequestBody @Valid ConfirmacionCambioCorreoRequest request) {

        if (internalMailKey == null
                || internalMailKey.isBlank()
                || providedKey == null
                || providedKey.isBlank()
                || !MessageDigest.isEqual(
                        internalMailKey.getBytes(StandardCharsets.UTF_8),
                        providedKey.getBytes(StandardCharsets.UTF_8))) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Servicio interno no autorizado.");
        }

        emailService.enviarConfirmacionCambioCorreo(
                request.destinatario(),
                request.urlConfirmacion(),
                request.minutosExpiracion());

        return ResponseEntity.ok().build();
    }
}
