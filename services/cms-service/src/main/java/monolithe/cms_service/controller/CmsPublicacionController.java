package monolithe.cms_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.CmsPublicacionResponse;
import monolithe.cms_service.dto.CmsVisibilidadPublicacionResponse;
import monolithe.cms_service.dto.ProyectoVisibilidadCmsResponse;
import monolithe.cms_service.dto.PublicarVisibilidadBorradorRequest;
import monolithe.cms_service.dto.PublicarTextosBorradorRequest;
import monolithe.cms_service.service.CmsPublicacionService;
import monolithe.cms_service.service.CmsVisibilidadPublicacionService;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

/** 3E.3: única ruta autorizada para publicar textos de borradores de página. */
@RestController
@RequestMapping("/api/cms/borradores")
@RequiredArgsConstructor
public class CmsPublicacionController {

    private final CmsPublicacionService publicacionService;
    private final CmsVisibilidadPublicacionService visibilidadService;

    @GetMapping("/visibilidades/proyectos")
    public List<ProyectoVisibilidadCmsResponse> listarVisibilidad() {
        return visibilidadService.listarAdministrables();
    }

    @PostMapping("/{idBorrador}/visibilidades/publicar")
    public CmsVisibilidadPublicacionResponse publicarVisibilidad(
            @PathVariable Long idBorrador,
            @Valid @RequestBody PublicarVisibilidadBorradorRequest request,
            JwtAuthenticationToken authentication) {
        return CmsVisibilidadPublicacionResponse.desde(visibilidadService.publicar(
                idBorrador, request.revisionEditorialEsperada(),
                request.revisionPublicadaEsperada(), usuario(authentication)));
    }

    /** Publicación atómica de textos autorizados y fondos de borrador, con flag de servidor. */
    @PostMapping("/{idBorrador}/paginas/publicar-contenido")
    public CmsPublicacionResponse publicarContenido(
            @PathVariable Long idBorrador,
            @Valid @RequestBody PublicarTextosBorradorRequest request,
            JwtAuthenticationToken authentication) {
        return CmsPublicacionResponse.desde(publicacionService.publicarContenido(
                idBorrador, request.revisionEditorialEsperada(),
                request.revisionPublicadaEsperada(), usuario(authentication)));
    }

    @PostMapping("/{idBorrador}/paginas/publicar")
    public CmsPublicacionResponse publicarTextos(
            @PathVariable Long idBorrador,
            @Valid @RequestBody PublicarTextosBorradorRequest request,
            JwtAuthenticationToken authentication) {
        return CmsPublicacionResponse.desde(publicacionService.publicarTextos(
                idBorrador, request.revisionEditorialEsperada(),
                request.revisionPublicadaEsperada(), usuario(authentication)));
    }

    private static Long usuario(JwtAuthenticationToken authentication) {
        String subject = authentication.getToken().getSubject();
        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("El JWT no incluye el identificador del usuario");
        }
        try {
            Long id = Long.valueOf(subject);
            if (id <= 0) {
                throw new IllegalArgumentException("Identificador de usuario inválido");
            }
            return id;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Identificador del usuario del JWT inválido");
        }
    }
}
