package monolithe.cms_service.integration;

import monolithe.cms_service.service.CmsPublicacionService;
import monolithe.cms_service.service.StorageBorradoresPrivado;
import monolithe.cms_service.service.SupabaseStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Opt-in y SOLO contra PostgreSQL local aislado: JDBC real con sigi_cms_user y RLS.
 * Simula almacenamiento en memoria. No accede a Supabase ni verifica HTTP Storage.
 * El fallo del historial se obtiene de la constraint intencional del esquema 3e2-it.
 */
@DataJpaTest(properties = {
    "spring.datasource.url=${CMS_IMG_PG_DB_URL}",
    "spring.datasource.username=${CMS_IMG_PG_DB_USER}",
    "spring.datasource.password=${CMS_IMG_PG_DB_PASSWORD}",
    "spring.jpa.hibernate.ddl-auto=none",
    "spring.jpa.show-sql=false",
    "spring.datasource.hikari.maximum-pool-size=3",
    "cms.publicacion.imagenes.enabled=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({CmsPublicacionService.class, CmsPublicacionImagenesPostgresRollbackTest.Permisos.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfEnvironmentVariable(named = "CMS_IMG_PG_IT", matches = "true")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class CmsPublicacionImagenesPostgresRollbackTest {

    @TestConfiguration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class Permisos { }

    private static final byte[] IMAGEN = "imagen-qa-inmutable".getBytes(StandardCharsets.UTF_8);
    private static final String CLAVE_FALLIDA = "contenido-web/inicio/22/imagen-fallo-qa.png";
    private static final String CLAVE_EXITOSA = "contenido-web/inicio/21/imagen-ok-qa.png";

    @Autowired private CmsPublicacionService publicacion;
    @Autowired private JdbcTemplate jdbc;
    @MockitoBean private StorageBorradoresPrivado privado;
    @MockitoBean private SupabaseStorageService publico;

    private final Set<String> objetosPublicos = ConcurrentHashMap.newKeySet();

    @BeforeEach
    void simularStorage() {
        objetosPublicos.clear();
        when(privado.descargar(anyString())).thenReturn(IMAGEN.clone());
        when(publico.nuevaClaveImagenCms(eq(21L), eq("image/png"))).thenReturn(CLAVE_EXITOSA);
        when(publico.nuevaClaveImagenCms(eq(22L), eq("image/png"))).thenReturn(CLAVE_FALLIDA);
        doAnswer(inv -> {
            objetosPublicos.add(inv.getArgument(0));
            return null;
        }).when(publico).subirImagenCms(anyString(), any(byte[].class), eq("image/png"));
        doAnswer(inv -> {
            objetosPublicos.remove(inv.getArgument(0));
            return null;
        }).when(publico).eliminarImagenCms(anyString());
        assertEquals("sigi_cms_user", jdbc.queryForObject("select current_user", String.class));
        assertEquals(Boolean.FALSE, jdbc.queryForObject(
                "select rolbypassrls from pg_roles where rolname=current_user", Boolean.class));
    }

    /** Primero fallo, luego éxito: los dos borradores pertenecen a INICIO con revision_base=0. */
    @Test @Order(1) @WithMockUser(authorities = "web_content.publish")
    void errorRealDeHistorialRevierteSqlYCompensaArchivo() {
        // En init.sql, qa_forzar_fallo_historial rechaza al id_usuario_publicacion=9002.
        assertThrows(RuntimeException.class, () -> publicacion.publicarContenido(31L, 1L, 0L, 9002L));
        assertFalse(objetosPublicos.contains(CLAVE_FALLIDA), "El Storage simulado debe compensar el archivo");
        verify(publico).subirImagenCms(eq(CLAVE_FALLIDA), any(byte[].class), eq("image/png"));
        verify(publico).eliminarImagenCms(CLAVE_FALLIDA);

        assertEquals("EN_EDICION", jdbc.queryForObject(
                "select estado from cms_borradores where id_borrador=31", String.class));
        assertEquals(Boolean.FALSE, jdbc.queryForObject(
                "select visible from cms_secciones where id_seccion=22", Boolean.class));
        assertEquals(0L, jdbc.queryForObject(
                "select count(*) from cms_multimedia where clave_archivo=?", Long.class, CLAVE_FALLIDA));
        assertEquals(0L, jdbc.queryForObject(
                "select count(*) from cms_publicacion_versiones where id_pagina=10", Long.class));
        assertEquals(0L, jdbc.queryForObject(
                "select count(*) from cms_publicacion_historial where id_borrador=31", Long.class));
        assertEquals(Boolean.TRUE, jdbc.queryForObject(
                "select activo from cms_multimedia_asignaciones where id_multimedia_asignacion=202", Boolean.class));
    }

    @Test @Order(2) @WithMockUser(authorities = "web_content.publish")
    void commitRealDejaImagenAsociadaYConservaArchivo() {
        var historial = publicacion.publicarContenido(30L, 1L, 0L, 9001L);
        assertNotNull(historial.getIdHistorial());
        assertTrue(objetosPublicos.contains(CLAVE_EXITOSA), "Un commit no elimina la imagen pública");
        verify(publico).subirImagenCms(eq(CLAVE_EXITOSA), any(byte[].class), eq("image/png"));
        verify(publico, never()).eliminarImagenCms(CLAVE_EXITOSA);

        assertEquals("PUBLICADO", jdbc.queryForObject(
                "select estado from cms_borradores where id_borrador=30", String.class));
        assertEquals(Boolean.TRUE, jdbc.queryForObject(
                "select visible from cms_secciones where id_seccion=21", Boolean.class));
        assertEquals("Titulo comercial protegido", jdbc.queryForObject(
                "select titulo from cms_secciones where id_seccion=21", String.class));
        assertEquals(1L, jdbc.queryForObject(
                "select revision from cms_publicacion_versiones where id_pagina=10", Long.class));
        assertEquals(1L, jdbc.queryForObject(
                "select count(*) from cms_multimedia where clave_archivo=?", Long.class, CLAVE_EXITOSA));
        assertEquals(1L, jdbc.queryForObject("""
                select count(*) from cms_multimedia_asignaciones a
                join cms_multimedia m on m.id_multimedia=a.id_multimedia
                where a.id_seccion=21 and a.visible and a.activo
                  and a.id_uso_multimedia=7 and m.clave_archivo=?
                """, Long.class, CLAVE_EXITOSA));
        assertEquals(Boolean.FALSE, jdbc.queryForObject(
                "select activo from cms_multimedia_asignaciones where id_multimedia_asignacion=201", Boolean.class));
        assertEquals(1L, jdbc.queryForObject(
                "select count(*) from cms_publicacion_historial where id_borrador=30", Long.class));
    }
}
