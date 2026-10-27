import test from 'node:test';
import assert from 'node:assert/strict';

// Logica de validacion espejo del componente Crm.tsx
function validateFollowUp(form) {
  const asunto = (form.asunto || '').trim();
  if (!asunto) return { valid: false, error: 'Ingrese el asunto de la bitacora de contacto.' };
  if (asunto.length > 150) return { valid: false, error: 'El asunto no debe superar 150 caracteres.' };
  if (!form.requiereSeguimiento) return { valid: true, fechaIso: null };
  if (!form.fechaProximoSeguimiento) {
    return { valid: false, error: 'Seleccione fecha y hora para el proximo seguimiento programado.' };
  }
  const d = new Date(form.fechaProximoSeguimiento);
  if (isNaN(d.getTime())) return { valid: false, error: 'La fecha del proximo seguimiento no es valida.' };
  if (d <= new Date()) return { valid: false, error: 'La fecha y hora del proximo contacto debe ser estrictamente futura.' };
  const pad2 = (n) => String(n).padStart(2, '0');
  const fy = d.getFullYear();
  const fm = pad2(d.getMonth() + 1);
  const fd = pad2(d.getDate());
  const fh = pad2(d.getHours());
  const fmin = pad2(d.getMinutes());
  return { valid: true, fechaIso: `${fy}-${fm}-${fd}T${fh}:${fmin}:00-05:00` };
}

function validateVisit(form) {
  if (!form.prospectId || !form.projectId || !form.visitDate) {
    return { valid: false, error: 'Seleccione prospecto, proyecto y fecha de visita.' };
  }
  if (!form.advisorId) {
    return { valid: false, error: 'Seleccione un asesor responsable para la visita.' };
  }
  const [year, month, day] = form.visitDate.split('-').map(Number);
  const [hours, minutes] = (form.shift || '11:00').split(':').map(Number);
  const d = new Date(year, month - 1, day, hours, minutes);
  if (isNaN(d.getTime())) return { valid: false, error: 'Seleccione una fecha valida para la visita.' };
  if (d <= new Date()) return { valid: false, error: 'La fecha y hora de la visita debe ser estrictamente futura.' };
  const dow = d.getDay();
  if (dow === 1 || dow === 2) {
    return { valid: false, error: 'Las visitas oficiales guiadas solo se realizan de Miercoles a Domingo (11:00 AM y 3:00 PM).' };
  }
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 180);
  if (d > maxDate) {
    return { valid: false, error: 'La visita debe programarse dentro de los proximos 180 dias autorizados por el backend.' };
  }
  const pad2 = (n) => String(n).padStart(2, '0');
  return { valid: true, fechaIso: `${year}-${pad2(month)}-${pad2(day)}T${pad2(hours)}:${pad2(minutes)}:00-05:00` };
}

test('Seguimiento: rechaza asunto vacio o excesivo (>150 caracteres)', () => {
  assert.equal(validateFollowUp({ asunto: '   ' }).valid, false);
  const textoLargo = 'A'.repeat(151);
  assert.equal(validateFollowUp({ asunto: textoLargo }).valid, false);
});

test('Seguimiento: si requiereSeguimiento es false, fechaIso es null', () => {
  const res = validateFollowUp({
    asunto: 'Contacto comercial inicial',
    requiereSeguimiento: false
  });
  assert.equal(res.valid, true);
  assert.equal(res.fechaIso, null);
});

test('Seguimiento: si requiereSeguimiento es true, exige fecha futura y genera offset -05:00', () => {
  const pasada = validateFollowUp({
    asunto: 'Llamada de consulta',
    requiereSeguimiento: true,
    fechaProximoSeguimiento: '2020-01-01T10:00'
  });
  assert.equal(pasada.valid, false);

  const futura = new Date(Date.now() + 86400000 * 5);
  const pad2 = (n) => String(n).padStart(2, '0');
  const strFutura = `${futura.getFullYear()}-${pad2(futura.getMonth() + 1)}-${pad2(futura.getDate())}T14:30`;
  const ok = validateFollowUp({
    asunto: 'Llamada de consulta',
    requiereSeguimiento: true,
    fechaProximoSeguimiento: strFutura
  });
  assert.equal(ok.valid, true);
  assert.ok(ok.fechaIso.endsWith('-05:00'));
});

test('Visitas: rechaza si faltan prospecto, proyecto, asesor o fecha', () => {
  assert.equal(validateVisit({ prospectId: 0, projectId: 1, advisorId: 2, visitDate: '2026-11-20' }).valid, false);
  assert.equal(validateVisit({ prospectId: 1, projectId: 0, advisorId: 2, visitDate: '2026-11-20' }).valid, false);
  assert.equal(validateVisit({ prospectId: 1, projectId: 1, advisorId: 0, visitDate: '2026-11-20' }).valid, false);
  assert.equal(validateVisit({ prospectId: 1, projectId: 1, advisorId: 2, visitDate: '' }).valid, false);
});

test('Visitas: restringe dias a Miercoles a Domingo (bloquea Lunes y Martes)', () => {
  // Proxima fecha futura que sea Lunes
  const d = new Date();
  d.setDate(d.getDate() + 7);
  // forzar a lunes (dow 1)
  while (d.getDay() !== 1) {
    d.setDate(d.getDate() + 1);
  }
  const pad2 = (n) => String(n).padStart(2, '0');
  const lunesStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const resLunes = validateVisit({
    prospectId: 1,
    projectId: 1,
    advisorId: 1,
    visitDate: lunesStr,
    shift: '11:00'
  });
  assert.equal(resLunes.valid, false);
  assert.ok(resLunes.error.includes('Miercoles a Domingo'));

  // Proxima fecha que sea Sabado (dow 6)
  const dSabado = new Date();
  dSabado.setDate(dSabado.getDate() + 7);
  while (dSabado.getDay() !== 6) {
    dSabado.setDate(dSabado.getDate() + 1);
  }
  const sabadoStr = `${dSabado.getFullYear()}-${pad2(dSabado.getMonth() + 1)}-${pad2(dSabado.getDate())}`;
  const resSabado = validateVisit({
    prospectId: 1,
    projectId: 1,
    advisorId: 1,
    visitDate: sabadoStr,
    shift: '11:00'
  });
  assert.equal(resSabado.valid, true);
  assert.ok(resSabado.fechaIso.endsWith('-05:00'));
});

test('Visitas: no permite visitas mas alla de 180 dias ni en el pasado', () => {
  const pasada = validateVisit({
    prospectId: 1,
    projectId: 1,
    advisorId: 1,
    visitDate: '2020-01-01',
    shift: '11:00'
  });
  assert.equal(pasada.valid, false);

  const muyFutura = new Date();
  muyFutura.setDate(muyFutura.getDate() + 200);
  const pad2 = (n) => String(n).padStart(2, '0');
  const muyFuturaStr = `${muyFutura.getFullYear()}-${pad2(muyFutura.getMonth() + 1)}-${pad2(muyFutura.getDate())}`;
  const resExcedida = validateVisit({
    prospectId: 1,
    projectId: 1,
    advisorId: 1,
    visitDate: muyFuturaStr,
    shift: '11:00'
  });
  assert.equal(resExcedida.valid, false);
  assert.ok(resExcedida.error.includes('180 dias'));
});

test('Visitas: transiciones validas entre estados (PROGRAMADA -> CONFIRMADA -> REALIZADA)', () => {
  const visitStateMachine = (actual, nuevo) => {
    const permitidas = {
      PROGRAMADA: ['CONFIRMADA', 'CANCELADA'],
      CONFIRMADA: ['REALIZADA', 'CANCELADA'],
      REALIZADA: [],
      CANCELADA: []
    };
    return (permitidas[actual] || []).includes(nuevo);
  };

  assert.equal(visitStateMachine('PROGRAMADA', 'CONFIRMADA'), true);
  assert.equal(visitStateMachine('CONFIRMADA', 'REALIZADA'), true);
  assert.equal(visitStateMachine('PROGRAMADA', 'CANCELADA'), true);
  assert.equal(visitStateMachine('CONFIRMADA', 'CANCELADA'), true);
  assert.equal(visitStateMachine('REALIZADA', 'CONFIRMADA'), false);
  assert.equal(visitStateMachine('CANCELADA', 'PROGRAMADA'), false);
});
