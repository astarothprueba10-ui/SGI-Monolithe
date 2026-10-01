package monolithe.core_service.repository;

import monolithe.core_service.entity.Zona;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ZonaRepository extends JpaRepository<Zona, Long> {

    boolean existsByProyecto_IdProyectoAndCodigo(
        Long idProyecto,
        String codigo
    );

    List<Zona> findByProyecto_IdProyectoAndActivoTrueOrderByNumeroOrdenAsc(
        Long idProyecto
    );
}
