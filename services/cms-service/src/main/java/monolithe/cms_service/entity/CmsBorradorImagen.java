package monolithe.cms_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import jakarta.persistence.PreUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "cms_borrador_imagenes")
@Getter
@Setter
@NoArgsConstructor
public class CmsBorradorImagen {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_imagen_borrador")
    private Long idImagenBorrador;

    @Column(name = "id_borrador", nullable = false)
    private Long idBorrador;

    @Column(name = "id_seccion", nullable = false)
    private Long idSeccion;

    @Column(name = "bucket_id", nullable = false, columnDefinition = "text")
    private String bucketId = "cms-drafts-private";

    @Column(name = "object_key", nullable = false, columnDefinition = "text")
    private String objectKey;

    @Column(name = "mime_type", nullable = false, length = 30)
    private String mimeType;

    @Column(name = "tamano_bytes", nullable = false)
    private Long tamanoBytes;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "hash_sha256", nullable = false, length = 64, columnDefinition = "char(64)")
    private String hashSha256;

    @Column(name = "id_usuario_registro", nullable = false)
    private Long idUsuarioRegistro;

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", insertable = false)
    private OffsetDateTime fechaActualizacion;

    @PreUpdate
    void actualizarFecha() {
        fechaActualizacion = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
