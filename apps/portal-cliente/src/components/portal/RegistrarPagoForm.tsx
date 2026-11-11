import {ShieldAlertIcon} from 'lucide-react';
import {Card,CardHeader} from '../ui/Card';

/**
 * 5.4.1: eliminar llamada RPC insegura del prototipo.
 * El formulario real se integrará en 5.4.4 con actor JWT y URL privada.
 */
export function RegistrarPagoForm() {
  return <Card as="section">
    <CardHeader title="Registro de comprobantes"
      icon={<ShieldAlertIcon className="h-5 w-5"/>}
      description="Integración segura pendiente del 5.4.4"/>
    <div className="p-5">
      <p className="text-sm leading-relaxed text-slateux-600">
        El registro de vouchers se habilitará cuando este formulario
        se conecte al servicio autenticado del Portal Cliente.
        Por seguridad, no se permiten registros con identificadores
        de usuario, venta o cuota predeterminados.
      </p>
    </div>
  </Card>;
}
