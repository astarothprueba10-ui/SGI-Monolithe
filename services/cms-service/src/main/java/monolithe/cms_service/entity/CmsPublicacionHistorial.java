package monolithe.cms_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Una publicación histórica de la página CMS (migración 36).
 *
 * Solo admite altas: @Immutable evita UPDATE automáticos en Hibernate y los
 * triggers de PostgreSQL impiden UPDATE, DELETE y TRUNCATE incluso fuera de JPA.
 * Los snapshots son estados PUBLICADOS completos, no contenido_pendiente.
 * Esta entidad no publica contenido ni ejecuta operaciones de Storage.
 */
@Entity
@Immutable
@Table(name = "cms_publicacion_historial")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CmsPublicacionHistorial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_historial", updatable = false)
    private Long idHistorial;

    @Column(name = "id_pagina", nullable = false, updatable = false)
    private Long idPagina;

    @Column(name = "id_borrador", nullable = false, updatable = false)
    private Long idBorrador;

    @Column(name = "id_usuario_publicacion", nullable = false, updatable = false)
    private Long idUsuarioPublicacion;

    @Column(name = "revision_anterior", nullable = false, updatable = false)
    private Long revisionAnterior;

    @Column(name = "revision_nueva", nullable = false, updatable = false)
    private Long revisionNueva;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot_anterior", nullable = false, updatable = false, columnDefinition = "jsonb")
    private Map<String, Object> snapshotAnterior;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot_nuevo", nullable = false, updatable = false, columnDefinition = "jsonb")
    private Map<String, Object> snapshotNuevo;

    @Column(name = "version_formato", nullable = false, updatable = false)
    private Short versionFormato = 1;

    // El valor lo fija DEFAULT now() en PostgreSQL, no el reloj del servicio.
    @Column(name = "fecha_publicacion", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime fechaPublicacion;

    /**
     * Construye exclusivamente una fila NUEVA. La autorización, comparación de
     * revisiones y transacción corresponden al futuro servicio publicador.
     */
    public static CmsPublicacionHistorial nueva(
            Long idPagina,
            Long idBorrador,
            Long idUsuarioPublicacion,
            Long revisionAnterior,
            Map<String, Object> snapshotAnterior,
            Map<String, Object> snapshotNuevo) {
        exigirId(idPagina, "Página");
        exigirId(idBorrador, "Borrador");
        exigirId(idUsuarioPublicacion, "Usuario publicador");
        if (revisionAnterior == null || revisionAnterior < 0 || revisionAnterior == Long.MAX_VALUE) {
            throw new IllegalArgumentException("Revisión anterior inválida");
        }
        validarSnapshot(snapshotAnterior, "anterior");
        validarSnapshot(snapshotNuevo, "nuevo");

        CmsPublicacionHistorial historial = new CmsPublicacionHistorial();
        historial.idPagina = idPagina;
        historial.idBorrador = idBorrador;
        historial.idUsuarioPublicacion = idUsuarioPublicacion;
        historial.revisionAnterior = revisionAnterior;
        historial.revisionNueva = revisionAnterior + 1;
        historial.snapshotAnterior = new LinkedHashMap<>(snapshotAnterior);
        historial.snapshotNuevo = new LinkedHashMap<>(snapshotNuevo);
        return historial;
    }

    private static void exigirId(Long id, String nombre) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException(nombre + " inválido");
        }
    }

    private static void validarSnapshot(Map<String, Object> snapshot, String tipo) {
        if (snapshot == null
                || !(snapshot.get("pagina") instanceof Map<?, ?>)
                || !(snapshot.get("secciones") instanceof List<?>)) {
            throw new IllegalArgumentException("Snapshot " + tipo + " inválido: requiere pagina y secciones");
        }
    }
}
