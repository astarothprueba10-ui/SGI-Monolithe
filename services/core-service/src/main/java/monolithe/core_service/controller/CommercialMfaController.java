package monolithe.core_service.controller;
import tools.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.service.CommercialMfaClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
@RequestMapping("/api/core/proyectos/{idProyecto}/mfa-comercial")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_GERENCIA') and hasAuthority('projects.view') and hasAuthority('projects.edit') and hasAuthority('lots.edit')")
public class CommercialMfaController {
    private final CommercialMfaClient mfa;
    public record Inicio(@NotBlank String accion,@NotNull JsonNode datos){}
    public record Codigo(@NotNull UUID challengeId,@NotBlank @Pattern(regexp="[0-9]{6}") String codigo){}
    @PostMapping("/iniciar")
    public Map<String,Object> iniciar(@PathVariable Long idProyecto,@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Inicio r){
        return mfa.iniciar(jwt,idProyecto,r.accion(),mfa.normalizar(r.accion(),r.datos()));
    }
    @PostMapping("/verificar")
    public Map<String,Object> verificar(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Codigo r){return mfa.verificar(jwt,r.challengeId(),r.codigo());}
}
