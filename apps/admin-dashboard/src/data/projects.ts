import type { Lot, LotStatus, Project } from '../types';

export const PROJECTS: Project[] = [
{
  id: 'PRJ-01',
  name: 'Vista Alegre',
  district: 'Lurín, Lima',
  stages: 3,
  blocks: 6,
  totalLots: 180,
  available: 74,
  reserved: 26,
  sold: 80,
  priceFrom: 48000,
  status: 'Activo'
},
{
  id: 'PRJ-02',
  name: 'Las Palmeras',
  district: 'Pachacámac, Lima',
  stages: 2,
  blocks: 5,
  totalLots: 120,
  available: 38,
  reserved: 19,
  sold: 63,
  priceFrom: 62000,
  status: 'Activo'
},
{
  id: 'PRJ-03',
  name: 'Mirador del Norte',
  district: 'Huaral, Lima',
  stages: 2,
  blocks: 4,
  totalLots: 96,
  available: 61,
  reserved: 12,
  sold: 23,
  priceFrom: 39000,
  status: 'Activo'
},
{
  id: 'PRJ-04',
  name: 'Alto Vista Sur',
  district: 'Cañete, Lima',
  stages: 1,
  blocks: 3,
  totalLots: 60,
  available: 60,
  reserved: 0,
  sold: 0,
  priceFrom: 35000,
  status: 'Inactivo'
}];


const BUYERS = [
'María Cárdenas',
'Jorge Ruiz Palma',
'Familia Osorio',
'Elena Villar',
'Constructora Andes SAC',
'Luis Bejarano',
'Rosa Ttito',
'Iván Mendoza'];


const ADVISORS = [
'Camila Ordoñez',
'Marco Ledesma',
'Silvana Rojas',
'Teo Aguilar',
'Paula Cruz'];


const TYPES: Lot['type'][] = ['Residencial', 'Comercial', 'Esquina', 'Parque'];

/** Hash determinista para que el plano se vea igual en cada render. */
function seed(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function statusFor(key: string): LotStatus {
  const n = seed(key) % 100;
  if (n < 44) return 'Disponible';
  if (n < 62) return 'Separado';
  return 'Vendido';
}

const BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F'];

function buildLots(): Lot[] {
  const lots: Lot[] = [];
  PROJECTS.forEach((project) => {
    const blocks = BLOCKS.slice(0, project.blocks);
    blocks.forEach((block, row) => {
      const perBlock = 12;
      for (let col = 0; col < perBlock; col += 1) {
        const key = `${project.id}-${block}-${col}`;
        const status = project.status === 'Inactivo' ? 'Disponible' : statusFor(key);
        const area = 120 + seed(key) % 9 * 20;
        const pricePerM2 = 380 + seed(`${key}-p`) % 12 * 25;
        const type = TYPES[seed(`${key}-t`) % (col === 0 || col === perBlock - 1 ? 4 : 2)];
        lots.push({
          id: key,
          code: `${block}-${String(col + 1).padStart(2, '0')}`,
          projectId: project.id,
          stage: `Etapa ${row % project.stages + 1}`,
          block: `Mz. ${block}`,
          type,
          area,
          pricePerM2,
          price: Math.round(area * pricePerM2 / 100) * 100,
          status,
          client: status === 'Disponible' ? undefined : BUYERS[seed(`${key}-b`) % BUYERS.length],
          advisor:
          status === 'Disponible' ? undefined : ADVISORS[seed(`${key}-a`) % ADVISORS.length],
          row,
          col
        });
      }
    });
  });
  return lots;
}

export const LOTS: Lot[] = buildLots();

export const LOT_BLOCKS = BLOCKS;