package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.repository.CaptacionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor
public class ProyectoCaptacionService {
    private final CaptacionRepository repository;
    /** Solo identificador y nombre de proyectos activos; no requiere ficha CMS publicada. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar(Long despues) {
        return repository.proyectos(despues);
    }
}
