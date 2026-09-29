package monolithe.cms_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.entity.TipoMultimedia;
import monolithe.cms_service.entity.UsoMultimedia;
import monolithe.cms_service.service.CatalogoMultimediaService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cms/catalogos")
@RequiredArgsConstructor
public class CatalogoMultimediaController {

    private final CatalogoMultimediaService catalogoMultimediaService;

    @GetMapping("/tipos-multimedia")
    public List<TipoMultimedia> listarTiposMultimedia() {

        return catalogoMultimediaService
                .listarTiposActivos();
    }

    @GetMapping("/usos-multimedia")
    public List<UsoMultimedia> listarUsosMultimedia() {

        return catalogoMultimediaService
                .listarUsosActivos();
    }
}