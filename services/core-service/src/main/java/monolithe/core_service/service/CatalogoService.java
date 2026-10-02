package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.CatalogoResponse;
import monolithe.core_service.dto.EstadoLoteResponse;
import monolithe.core_service.dto.MonedaResponse;
import monolithe.core_service.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogoService {

    private final EstadoProyectoRepository estadoProyectoRepository;
    private final EstadoEtapaRepository estadoEtapaRepository;
    private final EstadoManzanaRepository estadoManzanaRepository;
    private final EstadoLoteRepository estadoLoteRepository;
    private final TipoLoteRepository tipoLoteRepository;
    private final MonedaRepository monedaRepository;
    private final TipoTarifaRepository tipoTarifaRepository;
    private final TipoAjustePrecioRepository tipoAjustePrecioRepository;

    public List<CatalogoResponse> listarEstadosProyecto() {
        return estadoProyectoRepository.findByActivoTrueOrderByOrdenAsc()
                .stream()
                .map(e -> new CatalogoResponse(
                        e.getIdEstadoProyecto(),
                        e.getCodigo(),
                        e.getNombre(),
                        e.getDescripcion(),
                        e.getActivo(),
                        e.getOrden()
                ))
                .toList();
    }

    public List<CatalogoResponse> listarEstadosEtapa() {
        return estadoEtapaRepository.findByActivoTrueOrderByOrdenAsc()
                .stream()
                .map(e -> new CatalogoResponse(
                        e.getIdEstadoEtapa(),
                        e.getCodigo(),
                        e.getNombre(),
                        e.getDescripcion(),
                        e.getActivo(),
                        e.getOrden()
                ))
                .toList();
    }

    public List<CatalogoResponse> listarEstadosManzana() {
        return estadoManzanaRepository.findByActivoTrueOrderByOrdenAsc()
                .stream()
                .map(e -> new CatalogoResponse(
                        e.getIdEstadoManzana(),
                        e.getCodigo(),
                        e.getNombre(),
                        e.getDescripcion(),
                        e.getActivo(),
                        e.getOrden()
                ))
                .toList();
    }

    public List<EstadoLoteResponse> listarEstadosLote() {
        return estadoLoteRepository.findByActivoTrueOrderByOrdenAsc()
                .stream()
                .map(e -> new EstadoLoteResponse(
                        e.getIdEstadoLote(),
                        e.getCodigo(),
                        e.getNombre(),
                        e.getDescripcion(),
                        e.getPermiteReserva(),
                        e.getPermiteVenta(),
                        e.getActivo(),
                        e.getOrden()
                ))
                .toList();
    }

    public List<CatalogoResponse> listarTiposLote() {
        return tipoLoteRepository.findByActivoTrueOrderByOrdenAsc()
                .stream()
                .map(e -> new CatalogoResponse(
                        e.getIdTipoLote(),
                        e.getCodigo(),
                        e.getNombre(),
                        e.getDescripcion(),
                        e.getActivo(),
                        e.getOrden()
                ))
                .toList();
    }

    public List<MonedaResponse> listarMonedas() {
        return monedaRepository.findByActivoTrueOrderByNombreAsc()
                .stream()
                .map(e -> new MonedaResponse(
                        e.getIdMoneda(),
                        e.getCodigo(),
                        e.getNombre(),
                        e.getSimbolo(),
                        e.getActivo()
                ))
                .toList();
    }

    public List<CatalogoResponse> listarTiposTarifa() {
        return tipoTarifaRepository.findByActivoTrueOrderByOrdenAsc()
                .stream()
                .map(e -> new CatalogoResponse(
                        e.getIdTipoTarifa(),
                        e.getCodigo(),
                        e.getNombre(),
                        e.getDescripcion(),
                        e.getActivo(),
                        e.getOrden()
                ))
                .toList();
    }

    public List<CatalogoResponse> listarTiposAjustePrecio() {
        return tipoAjustePrecioRepository.findByActivoTrueOrderByOrdenAsc()
                .stream()
                .map(e -> new CatalogoResponse(
                        e.getIdTipoAjustePrecio(),
                        e.getCodigo(),
                        e.getNombre(),
                        e.getDescripcion(),
                        e.getActivo(),
                        e.getOrden()
                ))
                .toList();
    }
}
