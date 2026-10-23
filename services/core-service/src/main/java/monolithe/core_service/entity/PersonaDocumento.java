
package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "core_personas_documentos", schema = "public")
@Getter
@Setter
@NoArgsConstructor
public class PersonaDocumento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_persona_documento")
    private Long idPersonaDocumento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_persona", nullable = false)
    private Persona persona;

    @Column(name = "id_tipo_documento", nullable = false)
    private Integer idTipoDocumento;

    @Column(name = "numero_documento", nullable = false)
    private String numeroDocumento;

    @Column(name = "pais_emision")
    private String paisEmision = "Perú";

    @Column(name = "fecha_emision")
    private LocalDate fechaEmision;

    @Column(name = "fecha_vencimiento")
    private LocalDate fechaVencimiento;

    @Column(name = "principal", nullable = false)
    private Boolean principal = false;

    @Column(name = "verificado", nullable = false)
    private Boolean verificado = false;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}
