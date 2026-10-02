package monolithe.core_service.repository;

import monolithe.core_service.entity.Moneda;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MonedaRepository extends JpaRepository<Moneda, Integer> {

    Optional<Moneda> findByCodigo(String codigo);

    List<Moneda> findByActivoTrueOrderByNombreAsc();
}
