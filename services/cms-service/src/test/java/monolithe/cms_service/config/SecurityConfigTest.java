package monolithe.cms_service.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SecurityConfigTest.EndpointsPrueba.class)
@Import({SecurityConfig.class, SecurityConfigTest.EndpointsPrueba.class})
@TestPropertySource(properties = "security.cors.allowed-origins=http://localhost:5174")
class SecurityConfigTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void lecturaPublicaSinSesion() throws Exception {
        mvc.perform(get("/api/public/paginas"))
                .andExpect(status().isOk());
    }

    @Test
    void consultaPublicaSinSesion() throws Exception {
        mvc.perform(post("/api/public/consultas"))
                .andExpect(status().isOk());
    }

    @Test
    void otroPostPublicoNoSeAbreAutomaticamente() throws Exception {
        mvc.perform(post("/api/public/operacion-no-autorizada")
                        .with(jwt().authorities(autoridad("web_content.publish"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void crearBorradorRequiereEdit() throws Exception {
        mvc.perform(post("/api/cms/borradores/paginas")
                        .with(jwt().authorities(autoridad("web_content.view"))))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/cms/borradores/paginas")
                        .with(jwt().authorities(autoridad("web_content.edit"))))
                .andExpect(status().isOk());
    }

    @Test
    void publicarVisibilidadRequiereAmbosPermisos() throws Exception {
        String ruta = "/api/cms/borradores/7/visibilidades/publicar";
        mvc.perform(post(ruta).with(jwt().authorities(autoridad("web_content.publish"))))
                .andExpect(status().isForbidden());
        mvc.perform(post(ruta).with(jwt().authorities(autoridad("web_content.projects_visibility"))))
                .andExpect(status().isForbidden());
        mvc.perform(post(ruta).with(jwt().authorities(
                        autoridad("web_content.publish"),
                        autoridad("web_content.projects_visibility"))))
                .andExpect(status().isOk());
    }

    @Test
    void publicarContenidoRequierePublish() throws Exception {
        String ruta = "/api/cms/borradores/7/paginas/publicar-contenido";
        mvc.perform(post(ruta).with(jwt().authorities(autoridad("web_content.edit"))))
                .andExpect(status().isForbidden());
        mvc.perform(post(ruta).with(jwt().authorities(autoridad("web_content.publish"))))
                .andExpect(status().isOk());
    }

    @Test
    void consultarVisibilidadRequierePermisoEspecifico() throws Exception {
        String ruta = "/api/cms/borradores/visibilidades/proyectos";
        mvc.perform(get(ruta).with(jwt().authorities(autoridad("web_content.view"))))
                .andExpect(status().isForbidden());
        mvc.perform(get(ruta).with(jwt().authorities(autoridad("web_content.projects_visibility"))))
                .andExpect(status().isOk());
    }

    @Test
    void lecturaCmsSinSesion() throws Exception {
        mvc.perform(get("/api/cms/paginas"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void lecturaCmsSoloConRol() throws Exception {
        mvc.perform(get("/api/cms/paginas")
                        .with(jwt().authorities(autoridad("ROLE_MARKETING"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void lecturaCmsSoloConRolAdministrador() throws Exception {
        mvc.perform(get("/api/cms/paginas")
                        .with(jwt().authorities(autoridad("ROLE_ADMINISTRADOR"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void lecturaCmsSoloConPermisoEdit() throws Exception {
        mvc.perform(get("/api/cms/paginas")
                        .with(jwt().authorities(autoridad("web_content.edit"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void lecturaCmsConPermisoView() throws Exception {
        mvc.perform(get("/api/cms/paginas")
                        .with(jwt().authorities(autoridad("web_content.view"))))
                .andExpect(status().isOk());
    }

    @Test
    void escrituraDirectaInclusoConTodosLosPermisos() throws Exception {
        mvc.perform(post("/api/cms/paginas")
                        .with(jwt().authorities(
                                autoridad("web_content.view"),
                                autoridad("web_content.edit"),
                                autoridad("web_content.publish"),
                                autoridad("web_content.projects_visibility"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void visibilidadDirectaDeProyectoBloqueada() throws Exception {
        mvc.perform(patch("/api/cms/proyectos/1/estado")
                        .with(jwt().authorities(autoridad("web_content.projects_visibility"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void modificacionDirectaBloqueada() throws Exception {
        mvc.perform(put("/api/cms/paginas/1")
                        .with(jwt().authorities(autoridad("web_content.edit"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void publicacionHeredadaBloqueada() throws Exception {
        mvc.perform(patch("/api/cms/paginas/1/publicar")
                        .with(jwt().authorities(autoridad("web_content.publish"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void eliminacionDirectaBloqueada() throws Exception {
        mvc.perform(delete("/api/cms/secciones/1")
                        .with(jwt().authorities(autoridad("web_content.edit"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void cargaDeArchivoDirectaBloqueada() throws Exception {
        mvc.perform(multipart("/api/cms/multimedia/upload")
                        .file("archivo", "imagen".getBytes())
                        .with(jwt().authorities(autoridad("web_content.edit"))))
                .andExpect(status().isForbidden());
    }

    private SimpleGrantedAuthority autoridad(String codigo) {
        return new SimpleGrantedAuthority(codigo);
    }

    @RestController
    static class EndpointsPrueba {

        @GetMapping("/api/public/paginas")
        String listarPaginasPublicas() {
            return "ok";
        }

        @PostMapping("/api/public/consultas")
        String registrarConsultaPublica() {
            return "ok";
        }

        @PostMapping("/api/public/operacion-no-autorizada")
        String operacionPublicaNoAutorizada() {
            return "ok";
        }

        @PostMapping("/api/cms/borradores/paginas")
        String crearBorradorPagina() {
            return "ok";
        }

        @PostMapping("/api/cms/borradores/{idBorrador}/visibilidades/publicar")
        String publicarVisibilidad() {
            return "ok";
        }

        @PostMapping("/api/cms/borradores/{idBorrador}/paginas/publicar-contenido")
        String publicarContenido() {
            return "ok";
        }

        @GetMapping("/api/cms/borradores/visibilidades/proyectos")
        String listarVisibilidades() {
            return "ok";
        }

        @GetMapping("/api/cms/paginas")
        String listarPaginasCms() {
            return "ok";
        }

        @PostMapping("/api/cms/paginas")
        String crearPaginaCms() {
            return "ok";
        }

        @PatchMapping("/api/cms/proyectos/{id}/estado")
        String actualizarEstadoCms() {
            return "ok";
        }

        @PostMapping(value = "/api/cms/multimedia/upload",
                consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        String subirArchivoCms() {
            return "ok";
        }
    }
}
