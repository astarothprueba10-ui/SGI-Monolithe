package monolithe.core_service.repository;

import monolithe.core_service.entity.TipoAjustePrecio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TipoAjustePrecioRepository extends JpaRepository<TipoAjustePrecio, Integer> {

    Optional<TipoAjustePrecio> findByCodigo(String codigo);

    List<TipoAjustePrecio> findByActivoTrueOrderByOrdenAsc();
}
