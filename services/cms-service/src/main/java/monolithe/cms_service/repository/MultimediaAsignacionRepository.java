package monolithe.cms_service.repository;

import monolithe.cms_service.entity.MultimediaAsignacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MultimediaAsignacionRepository
                extends JpaRepository<MultimediaAsignacion, Long> {

        List<MultimediaAsignacion> findByIdPaginaAndActivoTrueOrderByOrdenAsc(Long idPagina);

        List<MultimediaAsignacion> findByIdSeccionAndActivoTrueOrderByOrdenAsc(Long idSeccion);

        List<MultimediaAsignacion> findByIdSeccionItemAndActivoTrueOrderByOrdenAsc(Long idSeccionItem);

        boolean existsByIdPaginaAndIdMultimediaAndIdUsoMultimedia(
                        Long idPagina,
                        Long idMultimedia,
                        Integer idUsoMultimedia);

        boolean existsByIdSeccionAndIdMultimediaAndIdUsoMultimedia(
                        Long idSeccion,
                        Long idMultimedia,
                        Integer idUsoMultimedia);

        boolean existsByIdSeccionItemAndIdMultimediaAndIdUsoMultimedia(
                        Long idSeccionItem,
                        Long idMultimedia,
                        Integer idUsoMultimedia);

        boolean existsByIdPaginaAndIdMultimediaAndIdUsoMultimediaAndIdMultimediaAsignacionNot(
                        Long idPagina,
                        Long idMultimedia,
                        Integer idUsoMultimedia,
                        Long idMultimediaAsignacion);

        boolean existsByIdSeccionAndIdMultimediaAndIdUsoMultimediaAndIdMultimediaAsignacionNot(
                        Long idSeccion,
                        Long idMultimedia,
                        Integer idUsoMultimedia,
                        Long idMultimediaAsignacion);

        boolean existsByIdSeccionItemAndIdMultimediaAndIdUsoMultimediaAndIdMultimediaAsignacionNot(
                        Long idSeccionItem,
                        Long idMultimedia,
                        Integer idUsoMultimedia,
                        Long idMultimediaAsignacion);

        List<MultimediaAsignacion> findByIdPaginaAndVisibleTrueAndActivoTrueOrderByOrdenAsc(
                        Long idPagina);

        List<MultimediaAsignacion> findByIdSeccionAndVisibleTrueAndActivoTrueOrderByOrdenAsc(
                        Long idSeccion);

        List<MultimediaAsignacion> findByIdSeccionItemAndVisibleTrueAndActivoTrueOrderByOrdenAsc(
                        Long idSeccionItem);
}