package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ActualizarFichaCrmRequest;
import monolithe.core_service.service.CrmCierreService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/core/crm")
@RequiredArgsConstructor
public class CrmCierreController {
    private final CrmCierreService service;

    @GetMapping("/prospectos/buscar")
    @PreAuthorize("hasAuthority('crm.view')")
    public JsonNode buscar(@AuthenticationPrincipal Jwt jwt,
        @RequestParam(required = false) String consulta,
        @RequestParam(required = false) String etapa,
        @RequestParam(required = false) String origen,
        @RequestParam(required = false) Long idAsesor,
        @RequestParam(defaultValue = "false") boolean sinAsignar,
        @RequestParam(defaultValue = "TODOS") String categoria,
        @RequestParam(defaultValue = "1") Integer pagina,
        @RequestParam(defaultValue = "20") Integer tamano) {
        return service.buscar(actor(jwt), consulta, etapa, origen, idAsesor,
                sinAsignar, categoria, pagina, tamano);
    }

    @GetMapping("/resumen")
    @PreAuthorize("hasAuthority('crm.view')")
    public JsonNode resumen(@AuthenticationPrincipal Jwt jwt) {
        return service.indicadores(actor(jwt));
    }

    @GetMapping("/compradores")
    @PreAuthorize("hasAuthority('crm.view')")
    public JsonNode compradores(@AuthenticationPrincipal Jwt jwt,
        @RequestParam(required = false) String consulta,
        @RequestParam(defaultValue = "1") Integer pagina,
        @RequestParam(defaultValue = "20") Integer tamano) {
        return service.compradores(actor(jwt), consulta, pagina, tamano);
    }

    @PatchMapping("/prospectos/{idProspecto}/ficha")
    @PreAuthorize("hasAuthority('crm.edit')")
    public JsonNode actualizarFicha(@AuthenticationPrincipal Jwt jwt,
        @PathVariable Long idProspecto, @Valid @RequestBody ActualizarFichaCrmRequest request) {
        return service.actualizarFicha(actor(jwt), idProspecto, request);
    }

    @DeleteMapping("/prospectos/{idProspecto}")
    @PreAuthorize("hasAuthority('crm.delete')")
    public JsonNode desactivar(@AuthenticationPrincipal Jwt jwt,
        @PathVariable Long idProspecto, @RequestParam String motivo) {
        return service.desactivar(actor(jwt), idProspecto, motivo);
    }

    @GetMapping(value="/exportaciones/prospectos.csv", produces="text/csv")
    @PreAuthorize("hasAuthority('crm.export')")
    public ResponseEntity<byte[]> exportar(@AuthenticationPrincipal Jwt jwt,
        @RequestParam(required=false) String consulta,
        @RequestParam(required=false) String etapa,
        @RequestParam(defaultValue="TODOS") String categoria,
        @RequestParam(defaultValue="5000") Integer limite) {
        byte[] archivo = service.exportarCsv(actor(jwt), consulta, etapa, categoria, limite);
        return ResponseEntity.ok()
          .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=prospectos-crm.csv")
          .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
          .body(archivo);
    }

    private static Long actor(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion JWT requerida.");
        }
        try {
            long id = Long.parseLong(jwt.getSubject());
            if (id <= 0) throw new NumberFormatException("Actor invalido");
            return id;
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identidad JWT invalida.");
        }
    }
}
