package monolithe.core_service.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cfg_monedas")
@Getter
@Setter
@NoArgsConstructor
public class Moneda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_moneda")
    private Integer idMoneda;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "codigo", nullable = false, length = 3, unique = true)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 80)
    private String nombre;

    @Column(name = "simbolo", length = 5)
    private String simbolo;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}
