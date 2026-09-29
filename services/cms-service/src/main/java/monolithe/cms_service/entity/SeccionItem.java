package monolithe.cms_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;

@Entity
@Table(name = "cms_seccion_items")
@Getter
@Setter
@NoArgsConstructor
public class SeccionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_seccion_item")
    private Long idSeccionItem;

    @Column(name = "id_seccion", nullable = false)
    private Long idSeccion;

    @Column(name = "codigo", nullable = false, length = 60)
    private String codigo;

    @Column(name = "titulo", length = 180)
    private String titulo;

    @Column(name = "subtitulo", length = 255)
    private String subtitulo;

    @Column(name = "contenido", columnDefinition = "TEXT")
    private String contenido;

    @Column(name = "texto_enlace", length = 120)
    private String textoEnlace;

    @Column(name = "url_enlace", length = 500)
    private String urlEnlace;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "configuracion", columnDefinition = "jsonb")
    private Map<String, Object> configuracion;

    @Column(name = "orden", nullable = false)
    private Integer orden = 0;

    @Column(name = "visible", nullable = false)
    private Boolean visible = true;

    @Column(name = "fecha_desde")
    private OffsetDateTime fechaDesde;

    @Column(name = "fecha_hasta")
    private OffsetDateTime fechaHasta;

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