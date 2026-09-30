package monolithe.cms_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.MultimediaAsignacionRequest;
import monolithe.cms_service.entity.MultimediaAsignacion;
import monolithe.cms_service.service.MultimediaAsignacionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cms/multimedia-asignaciones")
@RequiredArgsConstructor
public class MultimediaAsignacionController {

    private final MultimediaAsignacionService multimediaAsignacionService;

    @GetMapping("/pagina/{idPagina}")
    public List<MultimediaAsignacion> listarPorPagina(
            @PathVariable Long idPagina) {

        return multimediaAsignacionService
                .listarPorPagina(idPagina);
    }

    @GetMapping("/seccion/{idSeccion}")
    public List<MultimediaAsignacion> listarPorSeccion(
            @PathVariable Long idSeccion) {

        return multimediaAsignacionService
                .listarPorSeccion(idSeccion);
    }

    @GetMapping("/item/{idSeccionItem}")
    public List<MultimediaAsignacion> listarPorItem(
            @PathVariable Long idSeccionItem) {

        return multimediaAsignacionService
                .listarPorItem(idSeccionItem);
    }

    @PostMapping
    public ResponseEntity<MultimediaAsignacion> crear(
            @Valid @RequestBody MultimediaAsignacionRequest request,
            JwtAuthenticationToken authentication) {

        Long idUsuario =
                obtenerIdUsuario(authentication);

        MultimediaAsignacion asignacion =
                multimediaAsignacionService.crear(
                        request,
                        idUsuario
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(asignacion);
    }

    @PutMapping("/{idMultimediaAsignacion}")
    public ResponseEntity<MultimediaAsignacion> actualizar(
            @PathVariable Long idMultimediaAsignacion,
            @Valid @RequestBody MultimediaAsignacionRequest request) {

        MultimediaAsignacion asignacion =
                multimediaAsignacionService.actualizar(
                        idMultimediaAsignacion,
                        request
                );

        return ResponseEntity.ok(asignacion);
    }

    @PatchMapping("/{idMultimediaAsignacion}/visibilidad")
    public ResponseEntity<MultimediaAsignacion> cambiarVisibilidad(
            @PathVariable Long idMultimediaAsignacion,
            @RequestParam boolean visible) {

        MultimediaAsignacion asignacion =
                multimediaAsignacionService.cambiarVisibilidad(
                        idMultimediaAsignacion,
                        visible
                );

        return ResponseEntity.ok(asignacion);
    }

    @DeleteMapping("/{idMultimediaAsignacion}")
    public ResponseEntity<Void> eliminar(
            @PathVariable Long idMultimediaAsignacion) {

        multimediaAsignacionService.eliminar(
                idMultimediaAsignacion
        );

        return ResponseEntity
                .noContent()
                .build();
    }

    private Long obtenerIdUsuario(
            JwtAuthenticationToken authentication) {

        String subject =
                authentication
                        .getToken()
                        .getSubject();

        if (subject == null || subject.isBlank()) {
            throw new IllegalStateException(
                    "El token no contiene el identificador del usuario"
            );
        }

        try {
            return Long.valueOf(subject);
        } catch (NumberFormatException ex) {
            throw new IllegalStateException(
                    "El identificador del usuario del token no es válido"
            );
        }
    }
}