package monolithe.cms_service.dto;

public record CaptacionResultado(String estado, String mensaje, Long idCaptacion,
        Long idPersona, Long idProspecto) { }
