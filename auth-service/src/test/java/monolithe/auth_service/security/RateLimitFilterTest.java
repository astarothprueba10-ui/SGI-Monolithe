package monolithe.auth_service.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class RateLimitFilterTest {

    private RateLimitFilter rateLimitFilter;

    @BeforeEach
    void setUp() {
        rateLimitFilter = new RateLimitFilter();
    }

    @Test
    void debePermitirDiezIntentosDeLoginYBloquearElOnceavo()
            throws Exception {

        for (int i = 1; i <= 10; i++) {

            MockHttpServletResponse response =
                    ejecutarPeticion(
                            "/api/auth/login",
                            "127.0.0.1"
                    );

            assertEquals(
                    200,
                    response.getStatus()
            );
        }

        MockHttpServletResponse response =
                ejecutarPeticion(
                        "/api/auth/login",
                        "127.0.0.1"
                );

        assertEquals(
                429,
                response.getStatus()
        );

        assertTrue(
                response.getContentAsString()
                        .contains("Too Many Requests")
        );
    }

    @Test
    void debePermitirCincoSolicitudesDeRecuperacionYBloquearLaSexta()
            throws Exception {

        for (int i = 1; i <= 5; i++) {

            MockHttpServletResponse response =
                    ejecutarPeticion(
                            "/api/auth/forgot-password",
                            "127.0.0.2"
                    );

            assertEquals(
                    200,
                    response.getStatus()
            );
        }

        MockHttpServletResponse response =
                ejecutarPeticion(
                        "/api/auth/forgot-password",
                        "127.0.0.2"
                );

        assertEquals(
                429,
                response.getStatus()
        );

        assertTrue(
                response.getContentAsString()
                        .contains("Too Many Requests")
        );
    }

    @Test
    void debePermitirCincoCambiosDePasswordYBloquearElSexto()
            throws Exception {

        for (int i = 1; i <= 5; i++) {

            MockHttpServletResponse response =
                    ejecutarPeticion(
                            "/api/auth/change-password",
                            "127.0.0.3"
                    );

            assertEquals(
                    200,
                    response.getStatus()
            );
        }

        MockHttpServletResponse response =
                ejecutarPeticion(
                        "/api/auth/change-password",
                        "127.0.0.3"
                );

        assertEquals(
                429,
                response.getStatus()
        );

        assertTrue(
                response.getContentAsString()
                        .contains("Too Many Requests")
        );
    }

    @Test
    void debeMantenerBucketsSeparadosPorIp()
            throws Exception {

        for (int i = 1; i <= 10; i++) {
            ejecutarPeticion(
                    "/api/auth/login",
                    "127.0.0.4"
            );
        }

        MockHttpServletResponse bloqueado =
                ejecutarPeticion(
                        "/api/auth/login",
                        "127.0.0.4"
                );

        assertEquals(
                429,
                bloqueado.getStatus()
        );

        MockHttpServletResponse otraIp =
                ejecutarPeticion(
                        "/api/auth/login",
                        "127.0.0.5"
                );

        assertEquals(
                200,
                otraIp.getStatus()
        );
    }

    private MockHttpServletResponse ejecutarPeticion(
            String ruta,
            String ip
    ) throws Exception {

        MockHttpServletRequest request =
                new MockHttpServletRequest();

        request.setMethod("POST");
        request.setRequestURI(ruta);
        request.setRemoteAddr(ip);

        MockHttpServletResponse response =
                new MockHttpServletResponse();

        FilterChain filterChain =
                mock(FilterChain.class);

        rateLimitFilter.doFilter(
                request,
                response,
                filterChain
        );

        return response;
    }
}