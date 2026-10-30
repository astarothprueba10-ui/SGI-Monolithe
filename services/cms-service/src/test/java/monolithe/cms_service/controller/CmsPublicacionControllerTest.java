package monolithe.cms_service.controller;

import monolithe.cms_service.config.SecurityConfig;
import monolithe.cms_service.entity.CmsPublicacionHistorial;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.GlobalExceptionHandler;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.service.CmsPublicacionService;
import monolithe.cms_service.service.CmsVisibilidadPublicacionService;
import monolithe.cms_service.entity.CmsVisibilidadHistorial;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CmsPublicacionController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@TestPropertySource(properties = "security.cors.allowed-origins=http://localhost:5174")
class CmsPublicacionControllerTest {

    private static final String RUTA = "/api/cms/borradores/12/paginas/publicar";
    private static final String REVISIONES = "{\"revisionEditorialEsperada\":5,\"revisionPublicadaEsperada\":0}";

    @Autowired MockMvc mvc;
    @MockitoBean CmsPublicacionService service;
    @MockitoBean CmsVisibilidadPublicacionService visibilidadService;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test
    void endpointContenidoRequierePermisoPublicar() throws Exception {
        String rutaImagenes = "/api/cms/borradores/12/paginas/publicar-contenido";
        mvc.perform(post(rutaImagenes).contentType(MediaType.APPLICATION_JSON).content(REVISIONES))
                .andExpect(status().isUnauthorized());
        mvc.perform(post(rutaImagenes).contentType(MediaType.APPLICATION_JSON).content(REVISIONES)
                .with(jwt().jwt(j -> j.subject("7"))
                        .authorities(new SimpleGrantedAuthority("web_content.edit"))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void exigeAutenticacion() throws Exception {
        mvc.perform(post(RUTA).contentType(MediaType.APPLICATION_JSON).content(REVISIONES))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void permisosViewYEditNoAutorizanPublicar() throws Exception {
        for (String permiso : List.of("web_content.view", "web_content.edit", "ROLE_MARKETING",
                "web_content.projects_visibility")) {
            mvc.perform(post(RUTA).contentType(MediaType.APPLICATION_JSON).content(REVISIONES)
                            .with(jwt().jwt(j -> j.subject("7"))
                                    .authorities(new SimpleGrantedAuthority(permiso))))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(service);
    }

    @Test
    void publicaConPermisoYObtieneIdentidadExclusivamenteDelJwt() throws Exception {
        when(service.publicarTextos(12L, 5L, 0L, 7L)).thenReturn(historial());
        mvc.perform(post(RUTA).contentType(MediaType.APPLICATION_JSON)
                        .content(REVISIONES)
                        .param("idUsuarioPublicacion", "999")
                        .with(jwt().jwt(j -> j.subject("7"))
                                .authorities(new SimpleGrantedAuthority("web_content.publish"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idBorrador").value(12))
                .andExpect(jsonPath("$.idPagina").value(91))
                .andExpect(jsonPath("$.revisionAnterior").value(0))
                .andExpect(jsonPath("$.revisionNueva").value(1))
                .andExpect(jsonPath("$.snapshotAnterior").doesNotExist())
                .andExpect(jsonPath("$.snapshotNuevo").doesNotExist())
                .andExpect(jsonPath("$.idUsuarioPublicacion").doesNotExist());
        verify(service).publicarTextos(12L, 5L, 0L, 7L);
    }

    @Test
    void revisionesObligatorias() throws Exception {
        for (String body : List.of("{}", "{\"revisionEditorialEsperada\":5}",
                "{\"revisionPublicadaEsperada\":0}",
                "{\"revisionEditorialEsperada\":0,\"revisionPublicadaEsperada\":0}",
                "{\"revisionEditorialEsperada\":5,\"revisionPublicadaEsperada\":-1}")) {
            mvc.perform(post(RUTA).contentType(MediaType.APPLICATION_JSON).content(body)
                            .with(publicador("7")))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test
    void invalidoElCuerpoJson() throws Exception {
        mvc.perform(post(RUTA).contentType(MediaType.APPLICATION_JSON).content("{no es json}")
                        .with(publicador("7")))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void jwtNoNumericoRetornaBadRequest() throws Exception {
        mvc.perform(post(RUTA).contentType(MediaType.APPLICATION_JSON).content(REVISIONES)
                        .with(publicador("otro-usuario")))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void jwtNoPositivoRetornaBadRequest() throws Exception {
        mvc.perform(post(RUTA).contentType(MediaType.APPLICATION_JSON).content(REVISIONES)
                        .with(publicador("0")))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void borradorAjenoNoSeRevela() throws Exception {
        when(service.publicarTextos(12L, 5L, 0L, 7L))
                .thenThrow(new ResourceNotFoundException("Borrador no encontrado"));
        mvc.perform(post(RUTA).contentType(MediaType.APPLICATION_JSON).content(REVISIONES)
                        .with(publicador("7")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void revisionObsoletaRetornaConflicto() throws Exception {
        when(service.publicarTextos(12L, 5L, 0L, 7L))
                .thenThrow(new ConflictException("La versión pública cambió"));
        mvc.perform(post(RUTA).contentType(MediaType.APPLICATION_JSON).content(REVISIONES)
                        .with(publicador("7")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void imagenesPendientesRetornanConflicto() throws Exception {
        when(service.publicarTextos(12L, 5L, 0L, 7L))
                .thenThrow(new ConflictException("El borrador contiene imágenes pendientes"));
        mvc.perform(post(RUTA).contentType(MediaType.APPLICATION_JSON).content(REVISIONES)
                        .with(publicador("7")))
                .andExpect(status().isConflict());
    }

    @Test
    void rutasAlternativasDePublicacionPermanecenBloqueadas() throws Exception {
        mvc.perform(post("/api/cms/borradores/12/publicar")
                        .contentType(MediaType.APPLICATION_JSON).content(REVISIONES)
                        .with(publicador("7")))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/cms/paginas/91/publicar").with(publicador("7")))
                .andExpect(status().isForbidden());
        mvc.perform(put(RUTA).contentType(MediaType.APPLICATION_JSON).content(REVISIONES)
                        .with(publicador("7")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void endpointNoPermiteLecturaPorGet() throws Exception {
        mvc.perform(get(RUTA).with(publicador("7")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void visibilidadExigeLosDosPermisos() throws Exception {
        String ruta = "/api/cms/borradores/12/visibilidades/publicar";
        for (String permiso : List.of("web_content.publish", "web_content.projects_visibility")) {
            mvc.perform(post(ruta).contentType(MediaType.APPLICATION_JSON).content(REVISIONES)
                            .with(jwt().jwt(j -> j.subject("7"))
                                    .authorities(new SimpleGrantedAuthority(permiso))))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(visibilidadService);
    }

    @Test
    void visibilidadUsaIdentidadDelJwtYRespuestaMinima() throws Exception {
        when(visibilidadService.publicar(12L, 5L, 0L, 7L)).thenReturn(
                CmsVisibilidadHistorial.nueva(12L, 31L, 7L, 0L, false, true));
        mvc.perform(post("/api/cms/borradores/12/visibilidades/publicar")
                        .contentType(MediaType.APPLICATION_JSON).content(REVISIONES)
                        .with(jwt().jwt(j -> j.subject("7")).authorities(
                                new SimpleGrantedAuthority("web_content.publish"),
                                new SimpleGrantedAuthority("web_content.projects_visibility"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProyecto").value(31))
                .andExpect(jsonPath("$.visiblePublico").value(true))
                .andExpect(jsonPath("$.idUsuarioPublicacion").doesNotExist());
        verify(visibilidadService).publicar(12L, 5L, 0L, 7L);
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor publicador(String subject) {
        return jwt().jwt(j -> j.subject(subject))
                .authorities(new SimpleGrantedAuthority("web_content.publish"));
    }

    private static CmsPublicacionHistorial historial() {
        return CmsPublicacionHistorial.nueva(91L, 12L, 7L, 0L,
                Map.of("pagina", Map.of("codigo", "INICIO"), "secciones", List.of()),
                Map.of("pagina", Map.of("codigo", "INICIO"), "secciones", List.of()));
    }
}
