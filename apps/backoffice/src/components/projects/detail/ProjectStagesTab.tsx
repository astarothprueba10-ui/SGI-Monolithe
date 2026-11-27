import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { projectConfigurationService } from '../../../services/projectConfigurationService';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { CommercialStageEditor } from './CommercialStageEditor';
import { useProjectConfiguration } from '../../../hooks/useProjectConfiguration';
import type { ProyectoResponse } from '../../../types/core';

export function ProjectStagesTab({ project }: { project: ProyectoResponse }) {
  const { can,user }=useAuth();
  const puedeEditar=project.activo && user.roles.includes('Gerencia') && can('projects.view') && can('projects.edit') && can('lots.edit');
  const [revision,setRevision]=useState<number|null>(null);
  const [gestionError,setGestionError]=useState('');
  const model = useProjectConfiguration(project.idProyecto);
  const { datos, respuesta, publicada, error } = model;
  useEffect(()=>{
    let vigente=true;
    setRevision(null);setGestionError('');
    if(publicada && publicada>0)projectConfigurationService.gestion(project.idProyecto).then(g=>{if(vigente)setRevision(g.revision);}).catch(e=>{if(vigente)setGestionError(e instanceof Error?e.message:'No se pudo consultar la gestión comercial.');});
    return ()=>{vigente=false;};
  },[project.idProyecto,publicada,respuesta]);
  if (!datos || !respuesta || publicada === null) return <Card className="p-5">
    <p className="text-sm text-brand-700">{error || 'Cargando etapas comerciales…'}</p>
    {error && <Button onClick={model.recargar}>Reintentar</Button>}
  </Card>;
  return <Card className="p-5 space-y-4">
    {!puedeEditar && <p className="text-xs text-brand-600">Consulta de solo lectura. La administración de etapas corresponde a Gerencia.</p>}
    {publicada === 0 && <p className="text-sm text-brand-600">Borrador comercial. Los cambios se guardan sin publicar precios ni liberar lotes.</p>}
    {gestionError && <p role="alert" className="text-sm text-red-700">{gestionError}</p>}
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <CommercialStageEditor datos={datos} catalogos={respuesta} projectName={project.nombre}
      published={publicada>0} readOnly={!puedeEditar || (publicada>0 && revision===null)} onChange={async next => {
        if(!puedeEditar)return false;
        if(publicada===0)return model.guardar(next,true);
        if(revision===null)return false;
        await projectConfigurationService.guardarEtapas(project.idProyecto,revision,next.etapas);
        model.recargar();return true;
      }}/>
  </Card>;
}
