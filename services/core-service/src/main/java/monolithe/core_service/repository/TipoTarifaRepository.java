package monolithe.core_service.repository;

import monolithe.core_service.entity.TipoTarifa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TipoTarifaRepository extends JpaRepository<TipoTarifa, Integer> {

    Optional<TipoTarifa> findByCodigo(String codigo);

    List<TipoTarifa> findByActivoTrueOrderByOrdenAsc();
}
