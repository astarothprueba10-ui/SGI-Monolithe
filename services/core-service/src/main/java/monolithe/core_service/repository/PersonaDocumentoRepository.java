
package monolithe.core_service.repository;

import monolithe.core_service.entity.PersonaDocumento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PersonaDocumentoRepository
        extends JpaRepository<PersonaDocumento, Long> {

    List<PersonaDocumento>
    findByIdTipoDocumentoAndNumeroDocumentoAndActivoTrue(
            Integer idTipoDocumento,
            String numeroDocumento
    );

    List<PersonaDocumento>
    findByPersona_IdPersonaAndActivoTrue(
            Long idPersona
    );

    @Query("""
        SELECT d
        FROM PersonaDocumento d
        WHERE d.idTipoDocumento = :idTipoDocumento
          AND UPPER(TRIM(d.numeroDocumento)) = :numeroNormalizado
        """)
    Optional<PersonaDocumento> buscarPorTipoYNumeroNormalizado(
            @Param("idTipoDocumento") Integer idTipoDocumento,
            @Param("numeroNormalizado") String numeroNormalizado
    );
}
