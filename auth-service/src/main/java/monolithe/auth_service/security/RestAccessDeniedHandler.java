package monolithe.auth_service.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.ApiErrorResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

@Component
@RequiredArgsConstructor
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final JsonMapper jsonMapper;

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException
    ) throws IOException, ServletException {

        ApiErrorResponse error = new ApiErrorResponse(
                Instant.now(),
                HttpServletResponse.SC_FORBIDDEN,
                "Forbidden",
                "No tiene permisos para acceder a este recurso",
                request.getRequestURI()
        );

        response.setStatus(
                HttpServletResponse.SC_FORBIDDEN
        );

        response.setContentType(
                MediaType.APPLICATION_JSON_VALUE
        );

        response.setCharacterEncoding(
                StandardCharsets.UTF_8.name()
        );

        jsonMapper.writeValue(
                response.getOutputStream(),
                error
        );
    }
}