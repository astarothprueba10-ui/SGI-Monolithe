package monolithe.core_service.service;

import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.*;
import monolithe.core_service.dto.ImportacionProyectoResponse.Resultado;
import monolithe.core_service.exception.*;
import monolithe.core_service.repository.*;
import monolithe.core_service.repository.ImportacionProyectoRepository.Referencia;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ImportacionProyectoService {
    private static final List<String> ORDEN = List.of("EtapasFisicas", "Zonas", "Manzanas", "Lotes", "EtapasComerciales", "AsignacionManzanas", "AsignacionLotes", "Tarifas");
    private final ImportacionProyectoRepository repo;
    private final ProyectoRepository proyectos;
    private final EtapaService etapas;
    private final ZonaService zonas;
    private final ManzanaService manzanas;
    private final LoteService lotes;
    private final Validator validator;
    private final ConfiguracionProyectoService configuracion;

    @Transactional(readOnly = true)
    public ImportacionProyectoResponse previsualizar(Long id, ImportacionProyectoRequest solicitud) {
        validarProyecto(id, solicitud);
        configuracion.exigirSinPublicacion(id, false);
        var contexto = new ImportacionProyectoContexto(repo, id);
        var filas = ordenar(solicitud);
        var base = baseComercial(id, filas);
        var comercial = base == null ? null : new ImportacionComercialProyecto(base, validator);
        var resultados = new ArrayList<>(filas.stream().map(f -> revisar(id, f, contexto, comercial)).toList());
        if (comercial != null) validarBorradorCompleto(comercial, contexto, resultados);
        return new ImportacionProyectoResponse(huella(id, solicitud, resultados, base == null ? -1 : base.version()), resultados, false);
    }

    @Transactional
    public ImportacionProyectoResponse confirmar(Long id, ImportacionProyectoRequest solicitud, Long actor) {
        configuracion.exigirSinPublicacion(id, true);
        var filas = ordenar(solicitud);
        var base = baseComercial(id, filas);
        var previo = previsualizar(id, solicitud);
        if (!previo.huella().equals(huella(id, solicitud, previo.filas(), base == null ? -1 : base.version())))
            throw new ConflictoNegocioException("El borrador comercial cambió. Valida otra vez.");
        if (!Objects.equals(previo.huella(), solicitud.huella())) throw new ConflictoNegocioException("La vista previa cambió. Valida nuevamente.");
        if (previo.filas().stream().anyMatch(r -> r.estado().equals("ERROR"))) throw new ReglaNegocioException("Corrige todas las filas con errores.");
        var contexto = new ImportacionProyectoContexto(repo, id);
        registrarEstructura(id, filas, previo, contexto);
        if (base != null) guardarComercial(id, actor, filas, base, contexto);
        return new ImportacionProyectoResponse(previo.huella(), previo.filas(), true);
    }

    private void validarBorradorCompleto(ImportacionComercialProyecto comercial, ImportacionProyectoContexto contexto,
            List<Resultado> resultados) {
        if (resultados.stream().anyMatch(r -> r.estado().equals("ERROR"))) return;
        try {
            comercial.validarCompleto(contexto);
        } catch (ReglaNegocioException ex) {
            for (int i = resultados.size() - 1; i >= 0; i--) {
                var fila = resultados.get(i);
                if (fila.estado().equals("BORRADOR")) {
                    resultados.set(i, new Resultado(fila.hoja(), fila.numero(), fila.codigo(), "ERROR", ex.getMessage()));
                    break;
                }
            }
        }
    }

    private ConfiguracionProyectoResponse baseComercial(Long id, List<ImportacionProyectoFila> filas) {
        return filas.stream().anyMatch(f -> ImportacionComercialProyecto.esComercial(f.hoja()))
            ? configuracion.obtener(id) : null;
    }

    private void registrarEstructura(Long id, List<ImportacionProyectoFila> filas,
            ImportacionProyectoResponse previo, ImportacionProyectoContexto contexto) {
        for (int i = 0; i < filas.size(); i++) {
            if (previo.filas().get(i).estado().equals("NUEVO")) registrar(id, filas.get(i), contexto);
        }
    }

    private void guardarComercial(Long id, Long actor, List<ImportacionProyectoFila> filas,
            ConfiguracionProyectoResponse base, ImportacionProyectoContexto contexto) {
        var comercial = new ImportacionComercialProyecto(base, validator);
        for (var fila : filas) {
            if (ImportacionComercialProyecto.esComercial(fila.hoja())) comercial.incorporar(fila, contexto);
        }
        var request = new ConfiguracionProyectoRequest(base.version(), comercial.datos());
        validar(request);
        configuracion.guardar(id, actor, request);
    }

    private void validarProyecto(Long id, ImportacionProyectoRequest solicitud) {
        var p = proyectos.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Proyecto no encontrado."));
        if (!Boolean.TRUE.equals(p.getActivo()) || !p.getCodigo().equals(solicitud.codigoProyecto()))
            throw new ReglaNegocioException("La plantilla no corresponde al proyecto habilitado.");
    }

    private List<ImportacionProyectoFila> ordenar(ImportacionProyectoRequest solicitud) {
        return solicitud.filas().stream().map(ImportacionProyectoFila::new)
            .sorted(Comparator.comparingInt(f -> ORDEN.contains(f.hoja()) ? ORDEN.indexOf(f.hoja()) : ORDEN.size())).toList();
    }

    private Resultado revisar(Long id, ImportacionProyectoFila f, ImportacionProyectoContexto c, ImportacionComercialProyecto comercial) {
        try {
            f.validarColumnas();
            if (ImportacionComercialProyecto.esComercial(f.hoja())) {
                comercial.incorporar(f, c);
                return resultado(f, "BORRADOR", "Se incorporará o actualizará solo en el borrador comercial.");
            }
            boolean nuevo = switch (f.hoja()) {
                case "EtapasFisicas" -> revisarEtapa(id, f, c);
                case "Zonas" -> revisarZona(id, f, c);
                case "Manzanas" -> revisarManzana(f, c);
                case "Lotes" -> revisarLote(id, f, c);
                default -> throw new ReglaNegocioException("Hoja no admitida.");
            };
            return resultado(f, nuevo ? "NUEVO" : "EXISTENTE", nuevo ? "Se registrará al confirmar." : "Se conservará sin modificar ningún campo.");
        } catch (ReglaNegocioException ex) {
            return resultado(f, "ERROR", ex.getMessage());
        } catch (IllegalArgumentException | java.time.DateTimeException ex) {
            return resultado(f, "ERROR", "Formato numérico o fecha incorrectos.");
        }
    }

    private boolean revisarEtapa(Long id, ImportacionProyectoFila f, ImportacionProyectoContexto c) {
        String clave = f.codigo("codigo");
        c.unica(f.hoja(), clave);
        validar(f.etapa(id));
        c.catalogo(c.estadosEtapa, f.codigo("codigo_estado"));
        return revisarReferencia(c, c.etapas, clave);
    }
    private boolean revisarZona(Long id, ImportacionProyectoFila f, ImportacionProyectoContexto c) {
        String clave = f.codigo("codigo");
        c.unica(f.hoja(), clave);
        validar(f.zona(id));
        return revisarReferencia(c, c.zonas, clave);
    }
    private boolean revisarManzana(ImportacionProyectoFila f, ImportacionProyectoContexto c) {
        String clave = f.claveManzana();
        c.unica(f.hoja(), clave);
        c.referencia(c.etapas, f.codigo("codigo_etapa_fisica"));
        validar(f.manzana(1L));
        c.catalogo(c.estadosManzana, f.codigo("codigo_estado"));
        return revisarReferencia(c, c.manzanas, clave);
    }
    private boolean revisarReferencia(ImportacionProyectoContexto c, Map<String, Referencia> mapa, String clave) {
        if (mapa.containsKey(clave)) {
            c.referencia(mapa, clave);
            return false;
        }
        c.nueva(mapa, clave);
        return true;
    }
    private boolean revisarLote(Long id, ImportacionProyectoFila f, ImportacionProyectoContexto c) {
        c.unica(f.hoja(), f.codigo("codigo"));
        if (!c.numerosArchivo.add(f.claveNumero())) ImportacionProyectoFila.error("Número de lote duplicado en la manzana.");
        var manzana = c.referencia(c.manzanas, f.claveManzana());
        c.referencia(c.zonas, f.codigo("codigo_zona"));
        c.catalogo(c.tiposLote, f.codigo("codigo_tipo_lote"));
        validar(f.lote(1L, 1L));
        var existentes = repo.lote(f.codigo("codigo"));
        if (!existentes.isEmpty()) {
            var lote = existentes.getFirst();
            if (lote.proyecto().equals(id) && lote.manzana().equals(manzana.id()) && lote.numero().equals(f.codigo("numero"))) return false;
            ImportacionProyectoFila.error("Código de lote existente con otra ubicación o proyecto.");
        }
        if (manzana.id() > 0 && repo.numeroExiste(manzana.id(), f.codigo("numero"))) ImportacionProyectoFila.error("Número de lote ya registrado con otro código.");
        c.nueva(c.lotes, f.codigo("codigo"));
        return true;
    }
    private void validar(Object dto) {
        var errores = validator.validate(dto);
        if (!errores.isEmpty()) ImportacionProyectoFila.error(errores.stream()
                .map(e -> e.getPropertyPath() + ": " + e.getMessage()).sorted().findFirst().orElse("Datos inválidos."));
    }
    private Resultado resultado(ImportacionProyectoFila f, String estado, String mensaje) {
        String codigo = switch (f.hoja()) {
            case "AsignacionManzanas" -> f.texto("codigo_etapa_fisica") + "/" + f.texto("codigo_manzana");
            case "AsignacionLotes" -> f.texto("codigo_lote");
            case "Tarifas" -> f.texto("codigo_zona") + "/" + f.texto("codigo_etapa_comercial") + "/" + f.texto("moneda");
            default -> f.texto("codigo");
        };
        return new Resultado(f.hoja(), f.numero(), codigo, estado, mensaje);
    }

    private void registrar(Long id, ImportacionProyectoFila f, ImportacionProyectoContexto c) {
        switch (f.hoja()) {
            case "EtapasFisicas" -> agregar(c.etapas, f.codigo("codigo"), etapas.crear(f.etapa(id)).idEtapa());
            case "Zonas" -> agregar(c.zonas, f.codigo("codigo"), zonas.crear(f.zona(id)).idZona());
            case "Manzanas" -> agregar(c.manzanas, f.claveManzana(), manzanas.crear(
                f.manzana(c.referencia(c.etapas, f.codigo("codigo_etapa_fisica")).id())).idManzana());
            case "Lotes" -> agregar(c.lotes, f.codigo("codigo"), lotes.crear(f.lote(
                c.referencia(c.manzanas, f.claveManzana()).id(),
                c.referencia(c.zonas, f.codigo("codigo_zona")).id())).idLote());
            default -> throw new ReglaNegocioException("Hoja no admitida.");
        }
    }
    private void agregar(Map<String, Referencia> mapa, String codigo, Long id) {
        mapa.put(codigo, new Referencia(id, codigo, true));
    }
    private String huella(Long id, ImportacionProyectoRequest solicitud, List<Resultado> resultados, int versionComercial) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            digest.update((id + ":" + solicitud.codigoProyecto() + ":" + solicitud.versionPlantilla() + ":" + versionComercial).getBytes(StandardCharsets.UTF_8));
            for (var f : solicitud.filas()) {
                actualizar(digest, f.hoja()); actualizar(digest, f.numero().toString());
                new TreeMap<>(f.celdas()).forEach((k,v) -> { actualizar(digest,k); actualizar(digest,v); });
            }
            resultados.forEach(r -> { actualizar(digest,r.estado()); actualizar(digest,r.mensaje()); });
            return HexFormat.of().formatHex(digest.digest());
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
    private void actualizar(MessageDigest d, String s) {
        byte[] b = s.getBytes(StandardCharsets.UTF_8);
        d.update(java.nio.ByteBuffer.allocate(4).putInt(b.length).array());
        d.update(b);
    }
}
