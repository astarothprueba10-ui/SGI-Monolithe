package monolithe.core_service.client;

import monolithe.core_service.dto.DatosPersonaCrm;
import java.util.Optional;

/** Consulta externa de nombres asociados a un DNI, sin crear ni modificar personas. */
public interface ConsultaDniClient {
    /** Obtiene una identidad cuyo documento coincide con el solicitado. */
    Optional<DatosPersonaCrm> consultar(String numero);
}
