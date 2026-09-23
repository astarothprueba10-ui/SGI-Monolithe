package monolithe.cms_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cfg_estados_consulta_web")
@Getter
@Setter
@NoArgsConstructor
public class EstadoConsultaWeb {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_estado_consulta_web")
    private Integer idEstadoConsultaWeb;

    @Column(name = "codigo", nullable = false, length = 30, unique = true)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 80)
    private String nombre;

    @Column(name = "descripcion", length = 255)
    private String descripcion;

    @Column(name = "es_final", nullable = false)
    private Boolean esFinal = false;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "orden", nullable = false)
    private Integer orden = 1;
}
