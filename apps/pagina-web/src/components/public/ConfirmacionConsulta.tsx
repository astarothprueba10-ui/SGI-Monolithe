import { CheckCircle2Icon, MessageCircleIcon } from 'lucide-react';
import { AnchorButton, Button } from '../ui/Button';
import { contactInfo } from '../../data/site';
import { enlaceConsultaWhatsapp } from '../../lib/consultaWhatsapp';

export function ConfirmacionConsulta({ nombre, referencia, reset }: { nombre: string; referencia: string; reset: () => void }) {
  return <div className="py-10 text-center">
    <CheckCircle2Icon className="mx-auto h-12 w-12 text-brand" />
    <h2 className="mt-5 font-display text-3xl text-night">¡Gracias, {nombre}! Recibimos tu solicitud.</h2>
    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">Un asesor se comunicará contigo para brindarte información sobre el proyecto seleccionado.</p>
    <p className="mt-4 text-sm text-muted">Referencia de tu solicitud: <strong className="whitespace-nowrap text-night">{referencia}</strong></p>
    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
      <AnchorButton href={enlaceConsultaWhatsapp(contactInfo.whatsapp, referencia)} target="_blank">
        <MessageCircleIcon className="h-4 w-4" />Continuar por WhatsApp
      </AnchorButton>
      <Button variant="secondary" onClick={reset}>Enviar otra solicitud</Button>
    </div>
  </div>;
}
