import test from 'node:test';
import assert from 'node:assert/strict';

test('Buscador dinámico filtra prospectos por nombre, código y DNI', () => {
  const mockProspects = [
    {
      id_prospecto: 1,
      id_persona: 10,
      codigo: 'LD-1042',
      nombre_completo: 'Carlos Mendoza',
      telefono: '987654321',
      email: 'carlos@test.com',
      numero_documento: '45678912',
      dni: '45678912',
      estado_nombre: 'Nuevo Lead'
    },
    {
      id_prospecto: 2,
      id_persona: 11,
      codigo: 'LD-1041',
      nombre_completo: 'Mariana Gutierrez',
      telefono: '912345678',
      email: 'mariana@test.com',
      numero_documento: '72345678',
      dni: '72345678',
      estado_nombre: 'Interesado'
    },
    {
      id_prospecto: 3,
      id_persona: 12,
      codigo: 'LD-1040',
      nombre_completo: 'Juan Diaz',
      telefono: '955443322',
      email: 'juan@test.com',
      numero_documento: '10293847',
      dni: '10293847',
      estado_nombre: 'Visita Agendada'
    }
  ];

  const filterPool = (term) => {
    const lower = term.toLowerCase();
    return mockProspects.filter(
      (l) =>
        l.nombre_completo.toLowerCase().includes(lower) ||
        l.codigo.toLowerCase().includes(lower) ||
        (l.numero_documento || l.dni || '').toLowerCase().includes(lower) ||
        (l.telefono || '').includes(lower)
    );
  };

  // Busqueda por nombre
  const porNombre = filterPool('Carlos');
  assert.equal(porNombre.length, 1);
  assert.equal(porNombre[0].codigo, 'LD-1042');

  // Busqueda por codigo
  const porCodigo = filterPool('LD-1041');
  assert.equal(porCodigo.length, 1);
  assert.equal(porCodigo[0].nombre_completo, 'Mariana Gutierrez');

  // Busqueda por DNI
  const porDni = filterPool('10293847');
  assert.equal(porDni.length, 1);
  assert.equal(porDni[0].nombre_completo, 'Juan Diaz');

  // Busqueda por telefono
  const porTel = filterPool('912345678');
  assert.equal(porTel.length, 1);
  assert.equal(porTel[0].codigo, 'LD-1041');
});

test('Validación de construcción de fecha ISO con zona horaria America/Lima (-05:00)', () => {
  const pad2 = (n) => String(n).padStart(2, '0');
  const visitDate = '2026-11-15';
  const shift = '11:00';
  const [hy, hm, hd] = visitDate.split('-').map(Number);
  const [hh, hmin] = shift.split(':').map(Number);
  const fechaIso = `${hy}-${pad2(hm)}-${pad2(hd)}T${pad2(hh)}:${pad2(hmin)}:00-05:00`;

  assert.equal(fechaIso, '2026-11-15T11:00:00-05:00');
  assert.ok(fechaIso.endsWith('-05:00'), 'La fecha debe conservar offset fijo de Lima');
});

test('Validación de estados y transiciones permitidas en Visitas', () => {
  const estadosValidos = ['PROGRAMADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA', 'REPROGRAMADA'];
  const transicionesPermitidas = {
    PROGRAMADA: ['CONFIRMADA', 'CANCELADA', 'REPROGRAMADA'],
    CONFIRMADA: ['REALIZADA', 'CANCELADA', 'REPROGRAMADA'],
    REALIZADA: [],
    CANCELADA: [],
    REPROGRAMADA: ['CONFIRMADA', 'CANCELADA']
  };

  for (const estado of estadosValidos) {
    assert.ok(transicionesPermitidas[estado] !== undefined, `Estado no contemplado: ${estado}`);
  }

  // De PROGRAMADA puede pasar a CONFIRMADA
  assert.ok(transicionesPermitidas.PROGRAMADA.includes('CONFIRMADA'));
  // De CONFIRMADA puede pasar a REALIZADA
  assert.ok(transicionesPermitidas.CONFIRMADA.includes('REALIZADA'));
  // De REALIZADA no se puede reabrir
  assert.equal(transicionesPermitidas.REALIZADA.length, 0);
});
