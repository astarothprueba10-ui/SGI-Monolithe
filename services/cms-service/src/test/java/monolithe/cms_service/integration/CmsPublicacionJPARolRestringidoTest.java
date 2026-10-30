package monolithe.cms_service.integration;

import monolithe.cms_service.service.CmsPublicacionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Solo opt-in. Prueba JPA real con rol RLS sin privilegios administrativos,
 * en PostgreSQL QA descartable. La preparacion de fixtures ocurre FUERA
 * del contexto JDBC del CMS, usando el admin local del contenedor de QA.
 * No valida todo el esquema productivo de Supabase (ddl-auto=none).
 */
@DataJpaTest(properties = {
        "spring.datasource.url=${CMS_37_JPA_DB_URL}",
        "spring.datasource.username=${CMS_37_JPA_DB_USER}",
        "spring.datasource.password=${CMS_37_JPA_DB_PASSWORD}",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.show-sql=false",
        "spring.datasource.hikari.maximum-pool-size=3"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({CmsPublicacionService.class, CmsPublicacionJPARolRestringidoTest.PermisosTest.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfEnvironmentVariable(named = "CMS_37_JPA_IT", matches = "true")
class CmsPublicacionJPARolRestringidoTest {

    @TestConfiguration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class PermisosTest { }

    @Autowired private CmsPublicacionService publicacion;
    @Autowired private JdbcTemplate jdbc;

    @Test
    @WithMockUser(authorities = "web_content.publish")
    void publicacionRealJPAConIdentidadRlsRestringida() {
        assertEquals("cms_37_jpa_it", jdbc.queryForObject("SELECT current_database()", String.class));
        assertEquals("sigi_cms_user", jdbc.queryForObject("SELECT current_user", String.class));
        assertEquals(Boolean.FALSE, jdbc.queryForObject("""
                SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user
                """, Boolean.class));
        assertEquals(Boolean.FALSE, jdbc.queryForObject("""
                SELECT rolsuper FROM pg_roles WHERE rolname = current_user
                """, Boolean.class));

        var resultado = publicacion.publicarTextos(30L, 1L, 0L, 9001L);
        assertNotNull(resultado.getIdHistorial());
        assertEquals("Titulo renovado", jdbc.queryForObject(
                "SELECT titulo FROM cms_secciones WHERE id_seccion=20", String.class));
        assertEquals("Etiqueta renovada", jdbc.queryForObject(
                "SELECT subtitulo FROM cms_secciones WHERE id_seccion=21", String.class));
        assertEquals("Precio protegido", jdbc.queryForObject(
                "SELECT titulo FROM cms_secciones WHERE id_seccion=21", String.class));
        assertEquals("Descripcion comercial protegida", jdbc.queryForObject(
                "SELECT contenido FROM cms_secciones WHERE id_seccion=21", String.class));
        assertEquals(Boolean.FALSE, jdbc.queryForObject(
                "SELECT visible FROM cms_secciones WHERE id_seccion=21", Boolean.class));
        assertEquals("PUBLICADO", jdbc.queryForObject(
                "SELECT estado FROM cms_borradores WHERE id_borrador=30", String.class));
        assertEquals(1L, jdbc.queryForObject(
                "SELECT revision FROM cms_publicacion_versiones WHERE id_pagina=10", Long.class));
        assertEquals(1L, jdbc.queryForObject(
                "SELECT count(*) FROM cms_publicacion_historial WHERE id_borrador=30", Long.class));
    }
}
