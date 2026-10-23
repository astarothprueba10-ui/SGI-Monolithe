package monolithe.core_service.service;

import monolithe.core_service.client.SupabaseStorageClient;
import monolithe.core_service.repository.TrabajadorProcedureRepository;
import monolithe.core_service.repository.TrabajadorProcedureRepository.ResultadoProcedimiento;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class EvidenciaCorreccionServiceTest {

    private TrabajadorProcedureRepository repository;
    private SupabaseStorageClient storageClient;
    private EvidenciaCorreccionService service;
    private JsonMapper jsonMapper;

    // Firma de bytes para JPEG valido (FF D8 ...)
    private static final byte[] JPEG_BYTES = new byte[]{
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0,
            0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01};

    // Firma de bytes para PNG valido (89 50 4E 47 ...)
    private static final byte[] PNG_BYTES = new byte[]{
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D};

    // Firma de bytes para WebP (52 49 46 46 ... 57 45 42 50)
    private static final byte[] WEBP_BYTES = new byte[]{
            0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00,
            0x57, 0x45, 0x42, 0x50};

    @BeforeEach
    void setUp() {
        repository = mock(TrabajadorProcedureRepository.class);
        storageClient = mock(SupabaseStorageClient.class);
        jsonMapper = new JsonMapper();
        service = new EvidenciaCorreccionService(repository, storageClient);
    }

    // --- Validaciones de archivo ---

    @Test
    void debeRechazarArchivoVacio() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "test.jpg", "image/jpeg", new byte[0]);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.adjuntarEvidencia(1L, 5L, archivo));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(storageClient, repository);
    }

    @Test
    void debeRechazarArchivoNulo() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.adjuntarEvidencia(1L, 5L, null));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void debeRechazarMimeInvalido() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "test.pdf", "application/pdf", JPEG_BYTES);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.adjuntarEvidencia(1L, 5L, archivo));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(storageClient, repository);
    }

    @Test
    void debeRechazarArchivoExcedeTamano() {
        byte[] grande = new byte[(int) EvidenciaCorreccionService.TAMANO_MAXIMO + 1];
        // Poner firma JPEG valida
        grande[0] = (byte) 0xFF;
        grande[1] = (byte) 0xD8;
        grande[2] = (byte) 0xFF;
        grande[3] = (byte) 0xE0;

        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "foto.jpg", "image/jpeg", grande);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.adjuntarEvidencia(1L, 5L, archivo));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(storageClient, repository);
    }

    @Test
    void debeRechazarFirmaRealInvalidaParaJpeg() {
        // MIME dice JPEG pero bytes son PNG
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "foto.jpg", "image/jpeg", PNG_BYTES);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.adjuntarEvidencia(1L, 5L, archivo));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(storageClient, repository);
    }

    @Test
    void debeRechazarFirmaRealInvalidaParaPng() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "foto.png", "image/png", JPEG_BYTES);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.adjuntarEvidencia(1L, 5L, archivo));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    // --- Flujo exitoso ---

    @Test
    void debeAdjuntarJpegExitosamente() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "foto.jpg", "image/jpeg", JPEG_BYTES);

        ObjectNode storageMock = jsonMapper.createObjectNode();
        when(storageClient.subirArchivo(
                eq(EvidenciaCorreccionService.BUCKET), anyString(), eq(archivo)))
                .thenReturn(storageMock);

        ObjectNode dbResult = jsonMapper.createObjectNode();
        dbResult.put("idSolicitud", 5L);
        dbResult.put("evidenciaAdjuntada", true);
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(dbResult, "OK", null);
        when(repository.adjuntarEvidenciaCorreccion(
                eq(1L), eq(5L), anyString(), anyString(), eq("image/jpeg")))
                .thenReturn(respuesta);

        var resultado = service.adjuntarEvidencia(1L, 5L, archivo);

        assertNotNull(resultado);
        assertTrue(resultado.get("evidenciaAdjuntada").booleanValue());
        verify(storageClient).subirArchivo(
                eq(EvidenciaCorreccionService.BUCKET), anyString(), eq(archivo));
    }

    @Test
    void debeAdjuntarPngExitosamente() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "foto.png", "image/png", PNG_BYTES);

        when(storageClient.subirArchivo(anyString(), anyString(), any()))
                .thenReturn(jsonMapper.createObjectNode());

        ObjectNode dbResult = jsonMapper.createObjectNode();
        dbResult.put("evidenciaAdjuntada", true);
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(dbResult, "OK", null);
        when(repository.adjuntarEvidenciaCorreccion(
                anyLong(), anyLong(), anyString(), anyString(), eq("image/png")))
                .thenReturn(respuesta);

        var resultado = service.adjuntarEvidencia(1L, 5L, archivo);
        assertTrue(resultado.get("evidenciaAdjuntada").booleanValue());
    }

    @Test
    void debeAdjuntarWebpExitosamente() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "foto.webp", "image/webp", WEBP_BYTES);

        when(storageClient.subirArchivo(anyString(), anyString(), any()))
                .thenReturn(jsonMapper.createObjectNode());

        ObjectNode dbResult = jsonMapper.createObjectNode();
        dbResult.put("evidenciaAdjuntada", true);
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(dbResult, "OK", null);
        when(repository.adjuntarEvidenciaCorreccion(
                anyLong(), anyLong(), anyString(), anyString(), eq("image/webp")))
                .thenReturn(respuesta);

        var resultado = service.adjuntarEvidencia(1L, 5L, archivo);
        assertTrue(resultado.get("evidenciaAdjuntada").booleanValue());
    }

    @Test
    void debeLimpiarStorageSiFallaBD() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "foto.jpg", "image/jpeg", JPEG_BYTES);

        when(storageClient.subirArchivo(anyString(), anyString(), any()))
                .thenReturn(jsonMapper.createObjectNode());

        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "SOLICITUD_NO_ENCONTRADA", "No existe");
        when(repository.adjuntarEvidenciaCorreccion(
                anyLong(), anyLong(), anyString(), anyString(), anyString()))
                .thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.adjuntarEvidencia(1L, 5L, archivo));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        // El archivo huerfano debe eliminarse
        verify(storageClient).eliminarArchivo(
                eq(EvidenciaCorreccionService.BUCKET), anyString());
    }

    @Test
    void debeLimpiarStorageSiFallaPorDenegado() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "foto.jpg", "image/jpeg", JPEG_BYTES);

        when(storageClient.subirArchivo(anyString(), anyString(), any()))
                .thenReturn(jsonMapper.createObjectNode());

        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "DENEGADO", "Sin permisos");
        when(repository.adjuntarEvidenciaCorreccion(
                anyLong(), anyLong(), anyString(), anyString(), anyString()))
                .thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.adjuntarEvidencia(1L, 5L, archivo));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(storageClient).eliminarArchivo(
                eq(EvidenciaCorreccionService.BUCKET), anyString());
    }

    @Test
    void debeLimpiarStorageSiFallaPorEvidenciaExistente() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "foto.jpg", "image/jpeg", JPEG_BYTES);

        when(storageClient.subirArchivo(anyString(), anyString(), any()))
                .thenReturn(jsonMapper.createObjectNode());

        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "EVIDENCIA_EXISTENTE", "Ya tiene evidencia");
        when(repository.adjuntarEvidenciaCorreccion(
                anyLong(), anyLong(), anyString(), anyString(), anyString()))
                .thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.adjuntarEvidencia(1L, 5L, archivo));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(storageClient).eliminarArchivo(anyString(), anyString());
    }

    @Test
    void debeLimpiarStorageSiFallaUploadException() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "foto.jpg", "image/jpeg", JPEG_BYTES);

        when(storageClient.subirArchivo(anyString(), anyString(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Storage error"));

        assertThrows(ResponseStatusException.class,
                () -> service.adjuntarEvidencia(1L, 5L, archivo));

        // Storage fallo antes de llegar a BD, no hay nada que limpiar
        verify(storageClient, never()).eliminarArchivo(anyString(), anyString());
        verifyNoInteractions(repository);
    }

    // --- Ruta generada correctamente ---

    @Test
    void debeGenerarRutaConPrefijoCorrecto() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "foto.jpg", "image/jpeg", JPEG_BYTES);

        when(storageClient.subirArchivo(anyString(), anyString(), any()))
                .thenReturn(jsonMapper.createObjectNode());

        ObjectNode dbResult = jsonMapper.createObjectNode();
        dbResult.put("evidenciaAdjuntada", true);
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(dbResult, "OK", null);

        when(repository.adjuntarEvidenciaCorreccion(
                eq(1L), eq(7L), anyString(), anyString(), anyString()))
                .thenAnswer(invocation -> {
                    String path = invocation.getArgument(2);
                    // La ruta debe comenzar con el prefijo correcto
                    assertTrue(path.startsWith("solicitudes/7/"),
                            "La ruta debe comenzar con 'solicitudes/7/'");
                    assertTrue(path.matches("solicitudes/7/[0-9a-f\\-]{36}\\.(jpg|jpeg|png|webp)"),
                            "La ruta debe contener un UUID valido y extension correcta");
                    return respuesta;
                });

        service.adjuntarEvidencia(1L, 7L, archivo);

        verify(repository).adjuntarEvidenciaCorreccion(
                eq(1L), eq(7L), anyString(), anyString(), eq("image/jpeg"));
    }
}
