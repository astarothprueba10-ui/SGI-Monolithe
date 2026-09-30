package monolithe.cms_service.repository;

import monolithe.cms_service.entity.SeccionItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeccionItemRepository
                extends JpaRepository<SeccionItem, Long> {

        List<SeccionItem> findByIdSeccionAndActivoTrueOrderByOrdenAsc(
                        Long idSeccion);

        List<SeccionItem> findByIdSeccionAndVisibleTrueAndActivoTrueOrderByOrdenAsc(
                        Long idSeccion);

        List<SeccionItem> findByIdSeccionOrderByOrdenAsc(
                        Long idSeccion);

        boolean existsByIdSeccionAndCodigo(
                        Long idSeccion,
                        String codigo);

        boolean existsByIdSeccionAndCodigoAndIdSeccionItemNot(
                        Long idSeccion,
                        String codigo,
                        Long idSeccionItem);
}