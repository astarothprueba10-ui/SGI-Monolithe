import { cmsApi } from '../lib/apiClient';
import { validarImagenLocal } from './cmsImagePreview';
import { rutaImagenBorrador } from './cmsImageDraftContract';

export interface ImagenBorradorRespuesta {
  idBorrador: number;
  idSeccion: number;
  mimeType: string | null;
  tamanoBytes: number | null;
  hashSha256: string | null;
  revisionEdicion: number;
}

export const webContentDraftImageService = {
  listar: (borrador: number): Promise<ImagenBorradorRespuesta[]> =>
    cmsApi.get<ImagenBorradorRespuesta[]>(`/cms/borradores/${borrador}/imagenes`),

  recuperar: (borrador: number, seccion: number): Promise<Blob> =>
    cmsApi.getBlob(rutaImagenBorrador(borrador, seccion)),

  guardar: (borrador: number, seccion: number, revision: number, archivo: File) => {
    const error = validarImagenLocal(archivo);
    if (error) return Promise.reject(new Error(error));
    const formulario = new FormData();
    formulario.append('archivo', archivo, archivo.name);
    return cmsApi.put<ImagenBorradorRespuesta>(
      rutaImagenBorrador(borrador, seccion, revision), formulario
    );
  },

  quitar: (borrador: number, seccion: number, revision: number) =>
    cmsApi.delete<ImagenBorradorRespuesta>(rutaImagenBorrador(borrador, seccion, revision))
};
