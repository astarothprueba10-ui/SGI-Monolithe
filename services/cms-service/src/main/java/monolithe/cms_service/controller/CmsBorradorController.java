package monolithe.cms_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.ActualizarBorradorPaginaRequest;
import monolithe.cms_service.dto.ActualizarBorradorVisibilidadRequest;
import monolithe.cms_service.dto.CmsBorradorResponse;
import monolithe.cms_service.dto.CrearBorradorPaginaRequest;
import monolithe.cms_service.dto.CrearBorradorVisibilidadRequest;
import monolithe.cms_service.dto.DescartarBorradorRequest;
import monolithe.cms_service.service.CmsBorradorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Solo manipula borradores; no expone ningún endpoint para publicar contenido. */
@RestController
@RequestMapping("/api/cms/borradores")
@RequiredArgsConstructor
public class CmsBorradorController {

    private final CmsBorradorService borradorService;

    @GetMapping
    public List<CmsBorradorResponse> listar(JwtAuthenticationToken authentication) {
        return borradorService.listarPropios(usuario(authentication))
                .stream().map(CmsBorradorResponse::desde).toList();
    }

    @GetMapping("/{idBorrador}")
    public CmsBorradorResponse obtener(@PathVariable Long idBorrador,
                                       JwtAuthenticationToken authentication) {
        return CmsBorradorResponse.desde(
                borradorService.obtenerPropio(idBorrador, usuario(authentication)));
    }

    @PostMapping("/paginas")
    public ResponseEntity<CmsBorradorResponse> crearPagina(
            @Valid @RequestBody CrearBorradorPaginaRequest request,
            JwtAuthenticationToken authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(CmsBorradorResponse.desde(
                borradorService.crearPagina(request.idPagina(), request.secciones(),
                        request.idGrupoEdicion(), usuario(authentication))));
    }

    @PostMapping("/visibilidades")
    public ResponseEntity<CmsBorradorResponse> crearVisibilidad(
            @Valid @RequestBody CrearBorradorVisibilidadRequest request,
            JwtAuthenticationToken authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(CmsBorradorResponse.desde(
                borradorService.crearVisibilidad(request.idProyecto(), request.visiblePublico(),
                        request.idGrupoEdicion(), usuario(authentication))));
    }

    @PutMapping("/{idBorrador}/paginas")
    public CmsBorradorResponse actualizarPagina(
            @PathVariable Long idBorrador,
            @Valid @RequestBody ActualizarBorradorPaginaRequest request,
            JwtAuthenticationToken authentication) {
        return CmsBorradorResponse.desde(borradorService.actualizarPagina(
                idBorrador, request.secciones(), request.revisionEsperada(), usuario(authentication)));
    }

    @PutMapping("/{idBorrador}/visibilidades")
    public CmsBorradorResponse actualizarVisibilidad(
            @PathVariable Long idBorrador,
            @Valid @RequestBody ActualizarBorradorVisibilidadRequest request,
            JwtAuthenticationToken authentication) {
        return CmsBorradorResponse.desde(borradorService.actualizarVisibilidad(
                idBorrador, request.visiblePublico(), request.revisionEsperada(), usuario(authentication)));
    }

    @PatchMapping("/{idBorrador}/paginas/descartar")
    public CmsBorradorResponse descartarPagina(
            @PathVariable Long idBorrador,
            @Valid @RequestBody DescartarBorradorRequest request,
            JwtAuthenticationToken authentication) {
        return CmsBorradorResponse.desde(borradorService.descartarPagina(
                idBorrador, request.revisionEsperada(), usuario(authentication)));
    }

    @PatchMapping("/{idBorrador}/visibilidades/descartar")
    public CmsBorradorResponse descartarVisibilidad(
            @PathVariable Long idBorrador,
            @Valid @RequestBody DescartarBorradorRequest request,
            JwtAuthenticationToken authentication) {
        return CmsBorradorResponse.desde(borradorService.descartarVisibilidad(
                idBorrador, request.revisionEsperada(), usuario(authentication)));
    }

    private static Long usuario(JwtAuthenticationToken authentication) {
        String subject = authentication.getToken().getSubject();
        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("El JWT no incluye el identificador del usuario");
        }
        try {
            Long id = Long.valueOf(subject);
            if (id <= 0) throw new IllegalArgumentException("Identificador de usuario inválido");
            return id;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Identificador del usuario del JWT inválido");
        }
    }
}
