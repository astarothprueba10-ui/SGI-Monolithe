import { Button } from '../../ui/Button';
import type { RespuestaImportacion } from '../../../types/projectImport';

function Filas({ resultado }: { resultado: RespuestaImportacion }) {
  return <div className="max-h-80 overflow-auto rounded-md border border-brand-200">
    <table className="w-full text-left text-xs">
      <thead className="sticky top-0 bg-brand-50 text-brand-800"><tr>
        {['Hoja', 'Fila', 'Código', 'Resultado', 'Detalle'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
      <tbody>{resultado.filas.map((f, i) => <tr key={i} className="border-t border-brand-100">
        <td className="p-2">{f.hoja}</td><td className="p-2">{f.numero}</td><td className="p-2">{f.codigo}</td>
        <td className={`p-2 font-semibold ${f.estado === 'ERROR' ? 'text-red-700' : f.estado === 'NUEVO' ? 'text-emerald-700' : 'text-brand-500'}`}>
          {resultado.confirmado && f.estado === 'NUEVO' ? 'REGISTRADO' : resultado.confirmado && f.estado === 'BORRADOR' ? 'GUARDADO' : f.estado}</td>
        <td className="p-2">{resultado.confirmado && f.estado === 'NUEVO' ? 'Registro creado.' : resultado.confirmado && f.estado === 'BORRADOR' ? 'Guardado en el borrador.' : f.mensaje}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function ProjectImportPreview({ resultado, ocupado, aceptado, setAceptado, confirmar }: {
  resultado: RespuestaImportacion; ocupado: boolean; aceptado: boolean;
  setAceptado: (v: boolean) => void; confirmar: () => void;
}) {
  const nuevos = resultado.filas.filter(f => f.estado === 'NUEVO').length;
  const errores = resultado.filas.filter(f => f.estado === 'ERROR').length;
  const borrador = resultado.filas.filter(f => f.estado === 'BORRADOR').length;
  const existentes = resultado.filas.length - nuevos - errores - borrador;
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-3 text-sm font-medium text-brand-800">
      <span>{resultado.confirmado ? 'Registrados' : 'Nuevos'}: {nuevos}</span><span>Existentes: {existentes}</span><span>Reglas de borrador: {borrador}</span>
      <span className={errores ? 'text-red-700' : ''}>Errores: {errores}</span></div>
    <Filas resultado={resultado}/>
    {resultado.confirmado ? <p className="text-sm text-emerald-700">Importación completada. Las etapas, lotes y tarifas se actualizan automáticamente.</p>
      : <><label className="flex gap-2 items-start text-sm text-brand-700">
        <input type="checkbox" checked={aceptado} disabled={ocupado || errores > 0 || nuevos + borrador === 0} onChange={e => setAceptado(e.target.checked)}/>
        Confirmo registrar la estructura nueva e incorporar o actualizar las reglas y tarifas del borrador. Los lotes nuevos quedarán como No disponible; no se modifican precios vigentes.
      </label>
      <Button variant="primary" disabled={ocupado || !aceptado || errores > 0 || nuevos + borrador === 0} onClick={confirmar}>
        {ocupado ? 'Registrando...' : 'Confirmar importación'}</Button></>}
  </div>;
}
