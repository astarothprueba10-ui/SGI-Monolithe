package monolithe.auth_service.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import monolithe.auth_service.service.CommercialMfaService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@RestController
@RequestMapping("/api/auth/internal/commercial-mfa")
@PreAuthorize("hasAuthority('ROLE_GERENCIA') and hasAuthority('projects.view') and hasAuthority('projects.edit') and hasAuthority('lots.edit')")
public class CommercialMfaInternalController {
    private final CommercialMfaService service;
    private final String key;
    public CommercialMfaInternalController(CommercialMfaService service,@Value("${security.internal.mail-key:}") String key){this.service=service;this.key=key;}
    private void autorizar(String provided){
        if(key.isBlank()||provided==null||!MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),provided.getBytes(StandardCharsets.UTF_8)))
            throw new monolithe.auth_service.exception.MfaFlowException(HttpStatus.FORBIDDEN,"Servicio interno no autorizado.");
    }
    public record Inicio(@Positive long proyecto,@NotBlank String accion,@Pattern(regexp="[a-f0-9]{64}") @NotNull String huella){}
    public record Verificar(@NotNull UUID challengeId,@NotBlank @Size(max=6) String codigo){}
    public record Consumo(@Positive long proyecto,@NotBlank String accion,@NotBlank String huella,@NotBlank @Size(max=100) String approvalToken){}
    @PostMapping("/start")
    public Map<String,Object> iniciar(@RequestHeader(value="X-Internal-Service-Key",required=false) String key,@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Inicio r){
        autorizar(key);return service.iniciar(jwt,r.proyecto(),r.accion(),r.huella());
    }
    @PostMapping("/verify")
    public Map<String,String> verificar(@RequestHeader(value="X-Internal-Service-Key",required=false) String key,@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Verificar r){
        autorizar(key);return service.verificar(jwt,r.challengeId(),r.codigo());
    }
    @PostMapping("/consume")
    public void consumir(@RequestHeader(value="X-Internal-Service-Key",required=false) String key,@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Consumo r){
        autorizar(key);service.consumir(jwt,r.proyecto(),r.accion(),r.huella(),r.approvalToken());
    }
}
