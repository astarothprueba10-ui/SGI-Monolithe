package monolithe.cms_service.integration;

import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.service.CmsVisibilidadPublicacionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Opt-in, PostgreSQL aislado, migraciones candidatas 37 + visibilidad.
 * Recorre el servicio JPA real con RLS; los datos y la función JWT son fixtures QA.
 * No equivale a probar autenticación JWT HTTP ni el esquema completo de Supabase.
 */
@DataJpaTest(properties = {
        "spring.datasource.url=${CMS_VIS_JPA_DB_URL}",
        "spring.datasource.username=${CMS_VIS_JPA_DB_USER}",
        "spring.datasource.password=${CMS_VIS_JPA_DB_PASSWORD}",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.show-sql=false",
        "spring.datasource.hikari.maximum-pool-size=3",
        "CMS_PUBLICACION_VISIBILIDAD_ENABLED=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({CmsVisibilidadPublicacionService.class, CmsVisibilidadPublicacionJPARolRestringidoTest.PermisosTest.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfEnvironmentVariable(named = "CMS_VIS_JPA_IT", matches = "true")
class CmsVisibilidadPublicacionJPARolRestringidoTest {

    @TestConfiguration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class PermisosTest { }

    @Autowired private CmsVisibilidadPublicacionService publicacion;
    @Autowired private JdbcTemplate jdbc;

    private void asegurarIdentidad() {
        assertEquals("cms_visibilidad_it", jdbc.queryForObject("SELECT current_database()", String.class));
        assertEquals("sigi_cms_user", jdbc.queryForObject("SELECT current_user", String.class));
        assertEquals(Boolean.FALSE, jdbc.queryForObject(
                "SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user", Boolean.class));
        assertEquals(Boolean.FALSE, jdbc.queryForObject(
                "SELECT rolsuper FROM pg_roles WHERE rolname = current_user", Boolean.class));
    }

    @Test
    @WithMockUser(authorities = {"web_content.projects_visibility", "web_content.publish"})
    void publicaProyectoInicialmenteOcultoSinCambiarDatosOficiales() {
        asegurarIdentidad();
        var resultado = publicacion.publicar(40L, 1L, 0L, 9001L);
        assertNotNull(resultado.getIdHistorial());
        assertEquals(Boolean.TRUE, jdbc.queryForObject(
                "SELECT visible_publico FROM cms_proyectos_visibilidad WHERE id_proyecto=2", Boolean.class));
        assertEquals(1L, jdbc.queryForObject(
                "SELECT revision FROM cms_publicacion_versiones WHERE id_proyecto=2", Long.class));
        assertEquals("PUBLICADO", jdbc.queryForObject(
                "SELECT estado FROM cms_borradores WHERE id_borrador=40", String.class));
        assertEquals(1L, jdbc.queryForObject(
                "SELECT count(*) FROM cms_visibilidad_historial WHERE id_borrador=40 AND visible_anterior=false AND visible_nuevo=true", Long.class));
        assertEquals("Proyecto para mostrar", jdbc.queryForObject(
                "SELECT nombre FROM inm_proyectos WHERE id_proyecto=2", String.class));
    }

    @Test
    @WithMockUser(authorities = {"web_content.projects_visibility", "web_content.publish"})
    void ocultaProyectoVisibleSinAlterarProyectoOficial() {
        asegurarIdentidad();
        var resultado = publicacion.publicar(41L, 1L, 2L, 9001L);
        assertNotNull(resultado.getIdHistorial());
        assertEquals(Boolean.FALSE, jdbc.queryForObject(
                "SELECT visible_publico FROM cms_proyectos_visibilidad WHERE id_proyecto=4", Boolean.class));
        assertEquals(3L, jdbc.queryForObject(
                "SELECT revision FROM cms_publicacion_versiones WHERE id_proyecto=4", Long.class));
        assertEquals(1L, jdbc.queryForObject(
                "SELECT count(*) FROM cms_visibilidad_historial WHERE id_borrador=41 AND visible_anterior=true AND visible_nuevo=false", Long.class));
        assertEquals("Proyecto para ocultar", jdbc.queryForObject(
                "SELECT nombre FROM inm_proyectos WHERE id_proyecto=4", String.class));
    }

    @Test
    @WithMockUser(authorities = {"web_content.projects_visibility", "web_content.publish"})
    void revisionPublicaObsoletaNoModificaDatos() {
        asegurarIdentidad();
        assertThrows(ConflictException.class, () -> publicacion.publicar(42L, 1L, 3L, 9001L));
        assertEquals(Boolean.FALSE, jdbc.queryForObject(
                "SELECT visible_publico FROM cms_proyectos_visibilidad WHERE id_proyecto=6", Boolean.class));
        assertEquals(4L, jdbc.queryForObject(
                "SELECT revision FROM cms_publicacion_versiones WHERE id_proyecto=6", Long.class));
        assertEquals(0L, jdbc.queryForObject(
                "SELECT count(*) FROM cms_visibilidad_historial WHERE id_borrador=42", Long.class));
    }

    @Test
    @WithMockUser(authorities = {"web_content.projects_visibility", "web_content.publish"})
    void proyectoInactivoNoPuedePublicarse() {
        asegurarIdentidad();
        assertThrows(ResourceNotFoundException.class, () -> publicacion.publicar(43L, 1L, 0L, 9001L));
        assertEquals(0L, jdbc.queryForObject(
                "SELECT count(*) FROM cms_visibilidad_historial WHERE id_borrador=43", Long.class));
    }

    @Test
    @WithMockUser(authorities = "web_content.projects_visibility")
    void noSePublicaSinPermisoPublish() {
        asegurarIdentidad();
        assertThrows(AccessDeniedException.class,
                () -> publicacion.publicar(40L, 1L, 0L, 9001L));
    }
}
