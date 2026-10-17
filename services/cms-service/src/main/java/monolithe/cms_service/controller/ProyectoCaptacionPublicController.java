package monolithe.cms_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.service.ProyectoCaptacionService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/public/captacion/proyectos") @RequiredArgsConstructor
public class ProyectoCaptacionPublicController {
    private final ProyectoCaptacionService service;
    @GetMapping
    public List<Map<String, Object>> listar(@RequestParam(defaultValue = "0") Long despues) {
        return service.listar(Math.max(0, despues));
    }
}
