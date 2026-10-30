package monolithe.cms_service.controller;

import monolithe.cms_service.config.SecurityConfig;
import monolithe.cms_service.entity.CmsBorrador;
import monolithe.cms_service.entity.TipoObjetivoBorrador;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.GlobalExceptionHandler;
import monolithe.cms_service.service.CmsBorradorService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CmsBorradorController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@TestPropertySource(properties = "security.cors.allowed-origins=http://localhost:5174")
class CmsBorradorControllerTest {

    @Autowired MockMvc mvc;
    @MockitoBean CmsBorradorService service;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test
    void requiereSesionParaListar() throws Exception {
        mvc.perform(get("/api/cms/borradores"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void noPermiteListarSinView() throws Exception {
        mvc.perform(get("/api/cms/borradores")
                        .with(jwt().jwt(j -> j.subject("42"))
                                .authorities(new SimpleGrantedAuthority("web_content.edit"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void listarSoloUsaElIdDelJwt() throws Exception {
        when(service.listarPropios(42L)).thenReturn(List.of(pagina()));
        mvc.perform(get("/api/cms/borradores")
                        .with(jwt().jwt(j -> j.subject("42"))
                                .authorities(new SimpleGrantedAuthority("web_content.view"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idBorrador").value(7))
                .andExpect(jsonPath("$[0].idUsuarioRegistro").doesNotExist());
        verify(service).listarPropios(42L);
    }

    @Test
    void bloqueaCreacionPaginaSoloConView() throws Exception {
        mvc.perform(post("/api/cms/borradores/paginas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idPagina\":1,\"secciones\":[{\"idSeccion\":1,\"titulo\":\"Ejemplo\"}]}")
                        .with(jwt().jwt(j -> j.subject("42"))
                                .authorities(new SimpleGrantedAuthority("web_content.view"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void permiteCrearBorradorPaginaConEdit() throws Exception {
        when(service.crearPagina(eq(1L), any(), isNull(), eq(42L))).thenReturn(pagina());
        mvc.perform(post("/api/cms/borradores/paginas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idPagina\":1,\"secciones\":[{\"idSeccion\":1,\"titulo\":\"Título\"}]}")
                        .with(jwt().jwt(j -> j.subject("42"))
                                .authorities(new SimpleGrantedAuthority("web_content.edit"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idBorrador").value(7));
        verify(service).crearPagina(eq(1L), any(), isNull(), eq(42L));
    }

    @Test
    void bloqueaVisibilidadSinPermisoEspecifico() throws Exception {
        mvc.perform(post("/api/cms/borradores/visibilidades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProyecto\":2,\"visiblePublico\":false}")
                        .with(jwt().jwt(j -> j.subject("42"))
                                .authorities(new SimpleGrantedAuthority("web_content.edit"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void permiteCrearBorradorVisibilidadConPermiso() throws Exception {
        when(service.crearVisibilidad(2L, false, null, 42L)).thenReturn(visibilidad());
        mvc.perform(post("/api/cms/borradores/visibilidades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProyecto\":2,\"visiblePublico\":false}")
                        .with(jwt().jwt(j -> j.subject("42"))
                                .authorities(new SimpleGrantedAuthority("web_content.projects_visibility"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipoObjetivo").value("VISIBILIDAD_PROYECTO"));
    }

    @Test
    void noPuedeDescartarVisibilidadConPermisoDeTexto() throws Exception {
        mvc.perform(patch("/api/cms/borradores/7/visibilidades/descartar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"revisionEsperada\":1}")
                        .with(jwt().jwt(j -> j.subject("42"))
                                .authorities(new SimpleGrantedAuthority("web_content.edit"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void revisionIncorrectaRetornaConflicto() throws Exception {
        when(service.actualizarPagina(eq(7L), any(), eq(1L), eq(42L)))
                .thenThrow(new ConflictException("El borrador fue modificado por otra sesión"));
        mvc.perform(put("/api/cms/borradores/7/paginas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"revisionEsperada\":1,\"secciones\":[{\"idSeccion\":1,\"titulo\":\"Nuevo\"}]}")
                        .with(jwt().jwt(j -> j.subject("42"))
                                .authorities(new SimpleGrantedAuthority("web_content.edit"))))
                .andExpect(status().isConflict());
    }

    @Test
    void nuncaHabilitaPublicacionDirecta() throws Exception {
        mvc.perform(post("/api/cms/borradores/7/publicar")
                        .with(jwt().jwt(j -> j.subject("42"))
                                .authorities(new SimpleGrantedAuthority("web_content.publish"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void rechazaJwtSinIdNumerico() throws Exception {
        mvc.perform(get("/api/cms/borradores")
                        .with(jwt().jwt(j -> j.subject("desconocido"))
                                .authorities(new SimpleGrantedAuthority("web_content.view"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void validaCuerpoDeEntrada() throws Exception {
        mvc.perform(post("/api/cms/borradores/visibilidades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProyecto\":2}")
                        .with(jwt().jwt(j -> j.subject("42"))
                                .authorities(new SimpleGrantedAuthority("web_content.projects_visibility"))))
                .andExpect(status().isBadRequest());
    }

    private static CmsBorrador pagina() {
        CmsBorrador borrador = new CmsBorrador();
        borrador.setIdBorrador(7L);
        borrador.setIdPagina(1L);
        borrador.setTipoObjetivo(TipoObjetivoBorrador.PAGINA);
        borrador.setIdUsuarioRegistro(42L);
        borrador.setContenidoPendiente(Map.of("secciones", List.of()));
        return borrador;
    }

    private static CmsBorrador visibilidad() {
        CmsBorrador borrador = new CmsBorrador();
        borrador.setIdBorrador(8L);
        borrador.setIdProyecto(2L);
        borrador.setTipoObjetivo(TipoObjetivoBorrador.VISIBILIDAD_PROYECTO);
        borrador.setIdUsuarioRegistro(42L);
        borrador.setContenidoPendiente(Map.of("visible_publico", false));
        return borrador;
    }
}
