package monolithe.auth_service.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import monolithe.auth_service.service.FinancingTotpService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/** Sin endpoints de publicación de políticas: MFA es un requisito, no una aprobación automática. */
@RestController
@RequestMapping("/api/auth/financing-mfa")
public class FinancingTotpController {
    private final FinancingTotpService service;
    public FinancingTotpController(FinancingTotpService service) { this.service=service; }

    public record Inicio(@NotBlank String contrasenaActual) {}
    public record CodigoCorreo(@NotBlank @Pattern(regexp="[0-9]{6}") String codigo) {}
    public record CodigoTotp(@NotBlank @Pattern(regexp="[0-9]{6}") String codigo) {}
    public record Revocacion(@NotBlank @Pattern(regexp="[0-9]{6}") String codigoEmail,
                             @NotBlank @Pattern(regexp="[0-9]{6}") String codigoTotp) {}
    public record Recuperacion(@NotBlank @Pattern(regexp="[0-9]{6}") String codigoEmail,
                               @NotBlank @Pattern(regexp="[A-Fa-f0-9]{32}") String codigoRecuperacion) {}
    public record Autorizacion(
        @NotBlank @Pattern(regexp="[0-9]{6}") String codigo,
        @Positive Integer versionEsperada,
        @NotBlank @Pattern(regexp="[a-f0-9]{64}") String hashPropuesta,
        UUID nonce
    ) {}

    @GetMapping("/status")
    @PreAuthorize("hasAuthority('financing.configure')")
    public ResponseEntity<Map<String,Object>> estado(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.estado(jwt));
    }

    @PostMapping("/start")
    @PreAuthorize("hasAuthority('financing.configure')")
    public ResponseEntity<Map<String,String>> iniciar(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody Inicio req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(service.iniciar(jwt,req.contrasenaActual()));
    }

    @PostMapping("/enroll")
    @PreAuthorize("hasAuthority('financing.configure')")
    public ResponseEntity<Map<String,String>> enrolar(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CodigoCorreo req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(service.enrolar(jwt,req.codigo()));
    }

    @PostMapping("/confirm")
    @PreAuthorize("hasAuthority('financing.configure')")
    public ResponseEntity<Map<String,Object>> confirmar(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CodigoTotp req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(service.confirmar(jwt,req.codigo()));
    }

    @PostMapping("/authorize")
    @PreAuthorize("hasAuthority('financing.configure')")
    public ResponseEntity<Map<String,Object>> autorizar(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody Autorizacion req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(service.autorizar(jwt,req.codigo(),req.versionEsperada(),req.hashPropuesta(),req.nonce()));
    }

    @PostMapping("/revoke")
    @PreAuthorize("hasAuthority('financing.configure')")
    public ResponseEntity<Map<String,String>> revocar(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody Revocacion req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(service.revocar(jwt,req.codigoEmail(),req.codigoTotp()));
    }

    @PostMapping("/recover")
    @PreAuthorize("hasAuthority('financing.configure')")
    public ResponseEntity<Map<String,String>> recuperar(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody Recuperacion req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(service.recuperar(jwt,req.codigoEmail(),req.codigoRecuperacion()));
    }
}
