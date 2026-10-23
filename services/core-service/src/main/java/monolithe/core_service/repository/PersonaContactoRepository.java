
package monolithe.core_service.repository;

import monolithe.core_service.entity.PersonaContacto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PersonaContactoRepository
        extends JpaRepository<PersonaContacto, Long> {

    List<PersonaContacto> findByPersona_IdPersonaAndActivoTrue(
            Long idPersona
    );

    List<PersonaContacto> findByPersona_IdPersonaAndIdTipoContactoAndActivoTrue(
            Long idPersona,
            Integer idTipoContacto
    );
}
