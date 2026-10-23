package monolithe.core_service.service;

import monolithe.core_service.dto.UbigeoResponse;
import monolithe.core_service.exception.ReglaNegocioException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/** Consulta y valida el catálogo local INEI sin dependencias de red o de base de datos. */
@Service
public class UbigeoService {
    private final List<UbigeoResponse> catalogo;
    private final Map<String, UbigeoResponse> porUbicacion;

    /** Carga una sola vez el recurso versionado y construye su índice de jerarquías. */
    public UbigeoService() {
        catalogo = cargarCatalogo();
        porUbicacion = catalogo.stream().collect(Collectors.toUnmodifiableMap(
                fila -> clave(fila.departamento(), fila.provincia(), fila.distrito()), fila -> fila));
    }

    /** Devuelve todas las filas oficiales conservando los ceros iniciales del código. */
    public List<UbigeoResponse> listar() {
        return catalogo;
    }

    /** Acepta ubicación vacía o una jerarquía completa y devuelve su escritura oficial. */
    public UbigeoResponse resolver(String departamento, String provincia, String distrito) {
        String clave = clave(departamento, provincia, distrito);
        if (clave.equals("||")) return new UbigeoResponse(null, null, null, null);
        UbigeoResponse ubicacion = porUbicacion.get(clave);
        if (ubicacion == null) {
            throw new ReglaNegocioException(
                    "Selecciona departamento, provincia y distrito válidos de la misma ubicación peruana");
        }
        return ubicacion;
    }

    static String normalizar(String valor) {
        if (valor == null) return "";
        return Normalizer.normalize(valor, Normalizer.Form.NFD).replaceAll("\\p{M}+", "")
                .trim().replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
    }

    private String clave(String departamento, String provincia, String distrito) {
        return normalizar(departamento) + "|" + normalizar(provincia) + "|" + normalizar(distrito);
    }

    private List<UbigeoResponse> cargarCatalogo() {
        var recurso = new ClassPathResource("catalogos/ubigeo-peru.tsv");
        try (var lector = new BufferedReader(new InputStreamReader(recurso.getInputStream(), StandardCharsets.UTF_8))) {
            List<UbigeoResponse> filas = lector.lines().skip(1).map(this::leerFila).toList();
            if (filas.isEmpty()) throw new IllegalStateException("El catálogo UBIGEO está vacío");
            return filas;
        } catch (IOException exception) {
            throw new IllegalStateException("No se pudo cargar el catálogo UBIGEO peruano", exception);
        }
    }

    private UbigeoResponse leerFila(String linea) {
        String[] valores = linea.split("\t", -1);
        if (valores.length != 4 || !valores[0].matches("\\d{6}") ||
                valores[1].isBlank() || valores[2].isBlank() || valores[3].isBlank()) {
            throw new IllegalStateException("Fila inválida en el catálogo UBIGEO");
        }
        return new UbigeoResponse(valores[0], valores[1], valores[2], valores[3]);
    }
}
