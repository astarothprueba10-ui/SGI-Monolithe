package monolithe.cms_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.CaptacionInternaRequest;
import monolithe.cms_service.service.CaptacionService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import monolithe.cms_service.dto.CaptacionResultado;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/crm") @RequiredArgsConstructor
public class CaptacionController {
    private final CaptacionService service;
    @PostMapping("/captaciones") @PreAuthorize("hasAuthority('crm.create')")
    public CaptacionResultado registrar(@Valid @RequestBody CaptacionInternaRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.registrarInterna(request, Long.valueOf(jwt.getSubject()));
    }
    @GetMapping("/prospectos") @PreAuthorize("hasAuthority('crm.view')")
    public List<Map<String, Object>> listar(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) Long antes) {
        return service.listar(Long.valueOf(jwt.getSubject()), antes);
    }
    @GetMapping("/proyectos") @PreAuthorize("hasAuthority('crm.create')")
    public List<Map<String, Object>> proyectos(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") Long despues) {
        return service.proyectos(Long.valueOf(jwt.getSubject()), Math.max(0, despues));
    }
}
