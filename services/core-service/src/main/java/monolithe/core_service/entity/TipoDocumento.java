
package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cfg_tipos_documento", schema = "public")
@Getter
@Setter
@NoArgsConstructor
public class TipoDocumento {

    @Id
    @Column(name = "id_tipo_documento")
    private Integer idTipoDocumento;

    @Column(name = "codigo", nullable = false)
    private String codigo;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    @Column(name = "descripcion")
    private String descripcion;

    @Column(name = "solo_numerico", nullable = false)
    private Boolean soloNumerico;

    @Column(name = "longitud_minima")
    private Integer longitudMinima;

    @Column(name = "longitud_maxima")
    private Integer longitudMaxima;

    @Column(name = "activo", nullable = false)
    private Boolean activo;
}
