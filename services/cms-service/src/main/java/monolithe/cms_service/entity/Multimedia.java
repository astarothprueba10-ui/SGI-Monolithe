package monolithe.cms_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "cms_multimedia")
@Getter
@Setter
@NoArgsConstructor
public class Multimedia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_multimedia")
    private Long idMultimedia;

    @Column(name = "id_tipo_multimedia", nullable = false)
    private Integer idTipoMultimedia;

    @Column(name = "codigo", nullable = false, length = 50, unique = true)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 180)
    private String nombre;

    @Column(name = "descripcion", length = 500)
    private String descripcion;

    @Column(name = "nombre_archivo_original", length = 255)
    private String nombreArchivoOriginal;

    @Column(name = "clave_archivo", length = 500)
    private String claveArchivo;

    @Column(name = "url_externa", length = 1000)
    private String urlExterna;

    @Column(name = "tipo_mime", length = 100)
    private String tipoMime;

    @Column(name = "tamanio_bytes")
    private Long tamanioBytes;

    @Column(name = "hash_sha256", length = 64)
    private String hashSha256;

    @Column(name = "texto_alternativo", length = 255)
    private String textoAlternativo;

    @Column(name = "ancho_px")
    private Long anchoPx;

    @Column(name = "alto_px")
    private Long altoPx;

    @Column(name = "duracion_segundos")
    private Long duracionSegundos;

    @Column(name = "id_usuario_registro")
    private Long idUsuarioRegistro;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(
            name = "fecha_creacion",
            insertable = false,
            updatable = false
    )
    private OffsetDateTime fechaCreacion;

    @Column(
            name = "fecha_actualizacion",
            insertable = false,
            updatable = false
    )
    private OffsetDateTime fechaActualizacion;
}