
package monolithe.core_service.repository;

import monolithe.core_service.entity.Persona;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonaRepository
        extends JpaRepository<Persona, Long> {
}
