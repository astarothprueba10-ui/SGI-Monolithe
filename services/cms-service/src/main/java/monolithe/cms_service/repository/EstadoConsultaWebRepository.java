package monolithe.cms_service.repository;

import monolithe.cms_service.entity.EstadoConsultaWeb;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EstadoConsultaWebRepository
        extends JpaRepository<EstadoConsultaWeb, Integer> {

    Optional<EstadoConsultaWeb> findByCodigoAndActivoTrue(
            String codigo
    );

    List<EstadoConsultaWeb> findByActivoTrueOrderByOrdenAsc();

    Optional<EstadoConsultaWeb>
    findFirstByActivoTrueAndEsFinalFalseOrderByOrdenAsc();

    Optional<EstadoConsultaWeb>
    findByIdEstadoConsultaWebAndActivoTrue(
            Integer idEstadoConsultaWeb
    );
}