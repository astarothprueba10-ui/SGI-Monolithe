import { coreService } from './coreService';
import type { Lot, LotStatus, Project } from '../types';

function mapLotType(
  codigoTipo?: string | null,
  nombreTipo?: string | null
): Lot['type'] {
  const value = (codigoTipo ?? nombreTipo ?? '')
    .trim()
    .toUpperCase();

  switch (value) {
    case 'COMERCIAL':
      return 'Comercial';

    case 'ESQUINA':
      return 'Esquina';

    case 'PARQUE':
      return 'Parque';

    case 'RESIDENCIAL':
    default:
      return 'Residencial';
  }
}

function mapLotStatus(
  codigoEstado?: string | null
): LotStatus {
  switch (codigoEstado?.trim().toUpperCase()) {
    case 'RESERVADO':
    case 'SEPARADO':
      return 'Separado';

    case 'VENDIDO':
      return 'Vendido';

    case 'DISPONIBLE':
    default:
      return 'Disponible';
  }
}

export const lotsService = {
  async getLots(projectId?: number): Promise<Lot[]> {
    const rawLots = await coreService.searchLots({
      idProyecto: projectId ?? undefined
    });

    return rawLots.map((r): Lot => {
      const area =
        r.areaM2 != null
          ? Number(r.areaM2)
          : 90;

      const colNum =
        Number.parseInt(r.numero ?? '1', 10) || 1;

      const blockLetter =
        (r.nombreManzana ?? 'Manzana A').split(' ')[1] ?? 'A';

      const rowNum =
        blockLetter.charCodeAt(0) - 64;

      return {
        id: String(r.idLote),
        code: r.codigo,

        projectId: String(
          r.idProyecto ?? projectId ?? 1
        ),

        stage:
          r.nombreEtapa ?? 'Etapa 1',

        block:
          r.nombreManzana ?? 'Mz A',

        type: mapLotType(
          r.codigoTipoLote,
          r.nombreTipoLote
        ),

        area,

        pricePerM2: 500,
        price: area * 500,

        status: mapLotStatus(
          r.codigoEstadoLote
        ),

        row:
          rowNum > 0
            ? rowNum
            : 1,

        col: colNum
      };
    });
  },

  async getProjects(): Promise<Project[]> {
    const rawProjects =
      await coreService.getProjects();

    return rawProjects.map(
      (p): Project => ({
        id: String(p.idProyecto),
        name: p.nombre,

        district: p.distrito
          ? `${p.distrito}, ${p.provincia ?? 'Lima'}`
          : 'Lima',

        stages: 1,
        blocks: 1,
        totalLots: 0,
        available: 0,
        reserved: 0,
        sold: 0,
        priceFrom: 0,

        status: p.activo
          ? 'Activo'
          : 'Inactivo'
      })
    );
  }
};