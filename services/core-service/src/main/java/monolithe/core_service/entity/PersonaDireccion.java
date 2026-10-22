
package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "core_personas_direcciones", schema = "public")
@Getter
@Setter
@NoArgsConstructor
public class PersonaDireccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_persona_direccion")
    private Long idPersonaDireccion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_persona", nullable = false)
    private Persona persona;

    @Column(name = "tipo", nullable = false)
    private String tipo = "DOMICILIO";

    @Column(name = "direccion", nullable = false)
    private String direccion;

    @Column(name = "referencia")
    private String referencia;

    @Column(name = "departamento")
    private String departamento;

    @Column(name = "provincia")
    private String provincia;

    @Column(name = "distrito")
    private String distrito;

    @Column(name = "pais", nullable = false)
    private String pais = "Perú";

    @Column(name = "codigo_postal")
    private String codigoPostal;

    @Column(name = "principal", nullable = false)
    private Boolean principal = false;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}
