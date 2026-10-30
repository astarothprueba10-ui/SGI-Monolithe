package monolithe.cms_service.dto;

import monolithe.cms_service.entity.CmsBorradorImagen;

public record CmsBorradorImagenResponse(Long idBorrador, Long idSeccion,
        String mimeType, Long tamanoBytes, String hashSha256, Long revisionEdicion) {
    public static CmsBorradorImagenResponse desde(CmsBorradorImagen imagen, Long revision) {
        return new CmsBorradorImagenResponse(imagen.getIdBorrador(), imagen.getIdSeccion(),
                imagen.getMimeType(), imagen.getTamanoBytes(), imagen.getHashSha256(), revision);
    }
}
