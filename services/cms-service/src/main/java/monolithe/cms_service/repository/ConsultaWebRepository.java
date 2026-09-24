package monolithe.cms_service.repository;

import monolithe.cms_service.entity.ConsultaWeb;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConsultaWebRepository extends JpaRepository<ConsultaWeb, Long> {

    Optional<ConsultaWeb> findByCodigo(String codigo);

    List<ConsultaWeb> findByIdEstadoConsultaWebOrderByFechaRecepcionDesc(Integer idEstadoConsultaWeb);

    List<ConsultaWeb> findTop50ByOrderByFechaRecepcionDesc();
}
