
package monolithe.core_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "core_personas_contactos", schema = "public")
@Getter
@Setter
@NoArgsConstructor
public class PersonaContacto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_persona_contacto")
    private Long idPersonaContacto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_persona", nullable = false)
    private Persona persona;

    @Column(name = "id_tipo_contacto", nullable = false)
    private Integer idTipoContacto;

    @Column(name = "valor", nullable = false)
    private String valor;

    @Column(name = "principal", nullable = false)
    private Boolean principal = false;

    @Column(name = "verificado", nullable = false)
    private Boolean verificado = false;

    @Column(name = "permite_notificaciones", nullable = false)
    private Boolean permiteNotificaciones = true;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}
