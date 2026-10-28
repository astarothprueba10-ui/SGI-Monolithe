package monolithe.auth_service.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import monolithe.auth_service.dto.CredentialMailContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class EmailServiceCredentialMailTest {

    private static final String PORTAL_ADMIN = "https://portal-administrativo-delta.vercel.app/";
    private static final String PORTAL_CLIENTE = "https://portal-cliente-kohl.vercel.app/";
    private static final Pattern HREF = Pattern.compile("href=\"([^\"]+)\"");
    private EmailService service;

    @BeforeEach
    void configurarPlantilla() {
        service = new EmailService(null);
        ReflectionTestUtils.setField(service, "portalAdministrativoUrl", PORTAL_ADMIN);
        ReflectionTestUtils.setField(service, "portalClienteUrl", PORTAL_CLIENTE);
    }

    @Test
    void renderizaDniCePasaporteYRucDesdeElContextoOficial() {
        List<String> tipos = List.of("DNI", "CE", "PASAPORTE", "RUC");
        for (String tipo : tipos) {
            String html = renderizar(new CredentialMailContext(tipo, "16748595", true, false));
            assertTrue(normalizar(html).contains(tipo + ": 16748595"));
        }
    }

    @Test
    void seleccionaPortalesPorRolesEfectivosSinFiltrarElPortalCliente() {
        assertEquals(List.of(PORTAL_ADMIN), enlaces(new CredentialMailContext("DNI", "1", true, false)));
        assertEquals(List.of(PORTAL_CLIENTE), enlaces(new CredentialMailContext("CE", "2", false, true)));
        assertEquals(List.of(PORTAL_ADMIN, PORTAL_CLIENTE),
                enlaces(new CredentialMailContext("RUC", "3", true, true)));
    }

    @Test
    void escapaValoresDinamicosYNoAgregaCredencialesAEnlaces() {
        CredentialMailContext contexto = new CredentialMailContext("DNI", "<img src=x>", true, false);
        String html = service.construirCuerpoCredencialesTemporalesHtml(
                "<script>login</script>", "<script>clave</script>", contexto, 24);
        String normalizado = normalizar(html);

        assertFalse(html.contains("<script>"));
        assertFalse(html.contains("<img src=x>"));
        assertTrue(normalizado.contains("&lt;script&gt;login&lt;/script&gt;"));
        assertTrue(normalizado.contains("DNI: &lt;img src=x&gt;"));
        assertTrue(normalizado.contains("&lt;script&gt;clave&lt;/script&gt;"));
        assertTrue(normalizado.contains("vigencia máxima de 24 horas"));
        assertTrue(normalizado.contains("nueva contraseña personal"));
        assertEquals(List.of(PORTAL_ADMIN), extraerEnlaces(html));
        assertFalse(html.contains("href=\"" + PORTAL_ADMIN + "?"));
    }

    private String renderizar(CredentialMailContext contexto) {
        return service.construirCuerpoCredencialesTemporalesHtml("usuario-demo", "clave-demo", contexto, 24);
    }

    private List<String> enlaces(CredentialMailContext contexto) {
        return extraerEnlaces(renderizar(contexto));
    }

    private List<String> extraerEnlaces(String html) {
        Matcher matcher = HREF.matcher(html);
        List<String> enlaces = new ArrayList<>();
        while (matcher.find()) enlaces.add(matcher.group(1));
        return enlaces;
    }

    private String normalizar(String texto) {
        return texto.replaceAll("<[^>]+>", "").replaceAll("\\s+", " ");
    }
}
