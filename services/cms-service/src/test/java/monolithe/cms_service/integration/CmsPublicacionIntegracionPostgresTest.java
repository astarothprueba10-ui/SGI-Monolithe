package monolithe.cms_service.integration;

import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.service.CmsPublicacionService;
import org.junit.jupiter.api.BeforeEach;
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

import java.sql.Connection;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Prueba opt-in con PostgreSQL 17 REAL de Docker y tablas QA aisladas.
 * El test NO es transaccional: asi las comprobaciones posteriores observan
 * el commit/rollback efectivo de @Transactional en CmsPublicacionService.
 * No utiliza ni las credenciales ni las tablas de Supabase.
 */
@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:postgresql://127.0.0.1:55439/cms_3e2_it",
        "spring.datasource.username=cms_3e2_test",
        "spring.datasource.password=cms_3e2_test_pw",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.show-sql=false",
        "spring.datasource.hikari.maximum-pool-size=4"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({CmsPublicacionService.class, CmsPublicacionIntegracionPostgresTest.PermisosTest.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfEnvironmentVariable(named = "CMS_3E2_IT", matches = "true")
class CmsPublicacionIntegracionPostgresTest {

    private static final long PUBLICADOR = 9001L;
    private static final long PUBLICADOR_FALLO = 9002L;

    @TestConfiguration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class PermisosTest { }

    @Autowired private CmsPublicacionService servicio;
    @Autowired private JdbcTemplate jdbc;

    private long pagina;
    private long principal;
    private long promo;
    private long borrador;

    @BeforeEach
    void prepararDatos() throws Exception {
        // Protección secundaria: solo un contenedor QA con base, usuario y puerto exclusivos.
        try (Connection conn = jdbc.getDataSource().getConnection()) {
            assertEquals("jdbc:postgresql://127.0.0.1:55439/cms_3e2_it", conn.getMetaData().getURL());
            assertEquals("cms_3e2_test", conn.getMetaData().getUserName());
        }
        assertEquals("cms_3e2_it", valorTexto("SELECT current_database()"));
        jdbc.execute("TRUNCATE cms_publicacion_historial, cms_borrador_imagenes, "
                + "cms_publicacion_versiones, cms_borradores, cms_secciones, "
                + "cms_paginas RESTART IDENTITY CASCADE");
        pagina = jdbc.queryForObject("""
                INSERT INTO cms_paginas (id_estado_publicacion, codigo, slug, titulo)
                VALUES (1, 'INICIO', 'inicio', 'Pagina oficial QA') RETURNING id_pagina
                """, Long.class);
        principal = jdbc.queryForObject("""
                INSERT INTO cms_secciones (id_pagina, id_tipo_seccion, codigo, titulo,
                    subtitulo, contenido, configuracion, orden)
                VALUES (?, 1, 'HERO_PRINCIPAL', 'Titulo anterior', 'Subtitulo anterior',
                    'Contenido oficial', '{"precio": "NO_CAMBIAR"}'::jsonb, 1)
                RETURNING id_seccion
                """, Long.class, pagina);
        promo = jdbc.queryForObject("""
                INSERT INTO cms_secciones (id_pagina, id_tipo_seccion, codigo, titulo,
                    subtitulo, contenido, orden, visible)
                VALUES (?, 1, 'HERO_SLIDE_2_PROMO', 'Precio protegido',
                    'Etiqueta anterior', 'Descripcion comercial protegida', 2, false)
                RETURNING id_seccion
                """, Long.class, pagina);
        jdbc.update("""
                INSERT INTO cms_secciones (id_pagina, id_tipo_seccion, codigo, titulo, orden)
                VALUES (?, 1, 'FOOTER', 'Otra seccion intacta', 3)
                """, pagina);
        borrador = jdbc.queryForObject("""
                INSERT INTO cms_borradores (tipo_objetivo, id_pagina, contenido_pendiente,
                    revision_base, revision_edicion, estado, id_usuario_registro)
                VALUES ('PAGINA', ?, CAST(? AS jsonb), 0, 1, 'EN_EDICION', ?)
                RETURNING id_borrador
                """, Long.class, pagina, contenido(), PUBLICADOR);
    }

    @Test
    @WithMockUser(authorities = "web_content.publish")
    void publicacionExitosaPersisteCambiosYHistorial() {
        var resultado = servicio.publicarTextos(borrador, 1L, 0L, PUBLICADOR);
        assertNotNull(resultado.getIdHistorial());
        assertEquals("Titulo renovado", titulo(principal));
        assertEquals("Contenido oficial", valorTexto(
                "SELECT contenido FROM cms_secciones WHERE id_seccion = ?", principal));
        assertEquals("Etiqueta renovada", valorTexto(
                "SELECT subtitulo FROM cms_secciones WHERE id_seccion = ?", promo));
        assertEquals("Precio protegido", titulo(promo));
        assertEquals("Descripcion comercial protegida", valorTexto(
                "SELECT contenido FROM cms_secciones WHERE id_seccion = ?", promo));
        assertEquals(Boolean.FALSE, jdbc.queryForObject(
                "SELECT visible FROM cms_secciones WHERE id_seccion = ?", Boolean.class, promo));
        assertEquals("Pagina oficial QA", valorTexto(
                "SELECT titulo FROM cms_paginas WHERE id_pagina = ?", pagina));
        assertEquals(1L, revision());
        assertEquals("PUBLICADO", estado());
        assertEquals(1L, cantidadHistorial());
        assertEquals("Titulo anterior", textoSnapshot("snapshot_anterior", principal, "titulo"));
        assertEquals("Titulo renovado", textoSnapshot("snapshot_nuevo", principal, "titulo"));
        assertEquals("Precio protegido", textoSnapshot("snapshot_nuevo", promo, "titulo"));
        assertEquals(1L, jdbc.queryForObject(
                "SELECT revision_nueva FROM cms_publicacion_historial WHERE id_borrador = ?",
                Long.class, borrador));
    }

    @Test
    @WithMockUser(authorities = "web_content.publish")
    void siFallaInsertDelHistorialRevierteTodosLosCambios() {
        // El CHECK exclusivo del esquema QA falla AL INSERTAR en el historial.
        jdbc.update("UPDATE cms_borradores SET id_usuario_registro = ? WHERE id_borrador = ?",
                PUBLICADOR_FALLO, borrador);
        assertThrows(RuntimeException.class,
                () -> servicio.publicarTextos(borrador, 1L, 0L, PUBLICADOR_FALLO));
        // Se comprueba desde conexiones independientes, DESPUES del rollback.
        assertEquals("Titulo anterior", titulo(principal));
        assertEquals("Etiqueta anterior", valorTexto(
                "SELECT subtitulo FROM cms_secciones WHERE id_seccion = ?", promo));
        assertEquals("EN_EDICION", estado());
        assertEquals(0L, jdbc.queryForObject(
                "SELECT count(*) FROM cms_publicacion_versiones WHERE id_pagina = ?",
                Long.class, pagina));
        assertEquals(0L, cantidadHistorial());
    }

    @Test
    @WithMockUser(authorities = "web_content.publish")
    void rechazaRevisionObsoletaSinEscrituras() {
        assertThrows(ConflictException.class,
                () -> servicio.publicarTextos(borrador, 1L, 2L, PUBLICADOR));
        assertEquals("Titulo anterior", titulo(principal));
        assertEquals("EN_EDICION", estado());
        assertEquals(0L, cantidadHistorial());
    }

    @Test
    @WithMockUser(authorities = "web_content.edit")
    void permisoDeEdicionNoAutorizaPublicacion() {
        assertThrows(AccessDeniedException.class,
                () -> servicio.publicarTextos(borrador, 1L, 0L, PUBLICADOR));
        assertEquals("Titulo anterior", titulo(principal));
        assertEquals(0L, cantidadHistorial());
    }

    @Test
    @WithMockUser(authorities = "web_content.publish")
    void noCierraBorradorConImagenPrivadaPendiente() {
        jdbc.update("""
                INSERT INTO cms_borrador_imagenes (id_borrador, id_seccion, bucket_id, object_key,
                     mime_type, tamano_bytes, hash_sha256, id_usuario_registro)
                VALUES (?, ?, 'cms-drafts-private', 'qa/foto.png', 'image/png', 123,
                    ?, ?)
                """, borrador, principal, "0".repeat(64), PUBLICADOR);
        assertThrows(ConflictException.class,
                () -> servicio.publicarTextos(borrador, 1L, 0L, PUBLICADOR));
        assertEquals("EN_EDICION", estado());
        assertEquals(0L, cantidadHistorial());
    }

    private String contenido() {
        return """
                {"secciones":[{"id_seccion":%d,"titulo":"Titulo renovado"},
                {"id_seccion":%d,"subtitulo":"Etiqueta renovada"}]}
                """.formatted(principal, promo);
    }

    private String titulo(long idSeccion) {
        return valorTexto("SELECT titulo FROM cms_secciones WHERE id_seccion = ?", idSeccion);
    }

    private String estado() {
        return valorTexto("SELECT estado FROM cms_borradores WHERE id_borrador = ?", borrador);
    }

    private long revision() {
        return jdbc.queryForObject(
                "SELECT revision FROM cms_publicacion_versiones WHERE id_pagina = ?",
                Long.class, pagina);
    }

    private long cantidadHistorial() {
        return jdbc.queryForObject(
                "SELECT count(*) FROM cms_publicacion_historial WHERE id_borrador = ?",
                Long.class, borrador);
    }

    private String textoSnapshot(String nombreColumna, long idSeccion, String campo) {
        // Solo constantes internas controladas por el test, no entradas externas.
        if (!"snapshot_anterior".equals(nombreColumna) && !"snapshot_nuevo".equals(nombreColumna)) {
            throw new IllegalArgumentException("Columna no permitida");
        }
        if (!"titulo".equals(campo) && !"subtitulo".equals(campo)) {
            throw new IllegalArgumentException("Campo no permitido");
        }
        return jdbc.queryForObject("""
                SELECT elemento ->> ?
                FROM cms_publicacion_historial h,
                     jsonb_array_elements(h.%s -> 'secciones') elemento
                WHERE h.id_borrador = ? AND (elemento->>'id_seccion')::bigint = ?
                """.formatted(nombreColumna), String.class, campo, borrador, idSeccion);
    }

    private String valorTexto(String sql, Object... args) {
        return jdbc.queryForObject(sql, String.class, args);
    }
}
