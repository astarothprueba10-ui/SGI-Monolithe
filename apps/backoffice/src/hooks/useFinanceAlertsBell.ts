import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { crmBackend } from '../services/crmBackend';
import { notificationFromFinancialAlert, type Notification } from '../data/notifications';

const REFRESH_MS = 90_000;
const PAGINA_TAMANO = 100;
const seenKey = (userId: string) => `sgi_financial_alerts_seen_v1:${userId}`;

function readSeen(userId: string): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(seenKey(userId)) ?? '[]');
    return Array.isArray(saved)
      ? saved.filter((x): x is string =>
          typeof x === 'string' && /^cuota:\d+:CUOTA_(?:VENCIDA|PROXIMA)$/.test(x)
        ).slice(-10000)
      : [];
  } catch { return []; }
}

/** Solo guarda claves anónimas de eventos, nunca datos personales ni importes. */
function saveSeen(userId: string, seen: string[]) {
  try { localStorage.setItem(seenKey(userId), JSON.stringify(seen.slice(-10000))); }
  catch { /* LocalStorage deshabilitado: el aviso permanece visible mientras dure la sesión. */ }
}

/**
 * Campana de alertas financieras.
 * Consulta Core con el JWT del usuario; los filtros de cartera se validan en SQL.
 * No presenta los 7 avisos históricos de ejemplo, ni anuncia cuotas ya pagadas.
 */
export function useFinanceAlertsBell() {
  const {user,can}=useAuth();
  const autorizado=can('financing.view') && can('sales.view');
  const [notifications,setNotifications]=useState<Notification[]>([]);
  const [seen,setSeen]=useState<string[]>(()=>readSeen(user.id));
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string | null>(null);
  const requestId=useRef(0);

  const refresh=useCallback(async ()=>{
    if(!autorizado){setNotifications([]);return;}
    const current=++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const first=await crmBackend.listarAlertasCuotas({
        tipo:'TODAS',pagina:1,tamano:PAGINA_TAMANO
      });
      const all=[...first.items];
      // Leer todas las páginas para que una cuota nueva no quede oculta en la campana.
      // Limitar a 4 consultas concurrentes para no saturar Core Service.
      for(let start=2;start<=first.paginas;start+=4) {
        const pages=Array.from({length:Math.min(4,first.paginas-start+1)},
          (_,i)=>start+i);
        const results=await Promise.all(pages.map(pagina=>
          crmBackend.listarAlertasCuotas({tipo:'TODAS',pagina,tamano:PAGINA_TAMANO})
        ));
        if(current!==requestId.current)return;
        for(const result of results)all.push(...result.items);
      }
      if(current!==requestId.current)return;
      const unique=new Map<string,Notification>();
      for(const alert of all){
        const notification=notificationFromFinancialAlert(alert);
        unique.set(notification.id,notification);
      }
      const active=[...unique.values()];
      setNotifications(active);
      // Si una cuota fue pagada o dejó de estar en alerta, eliminar el acuse
      // anterior para que un eventual nuevo vencimiento vuelva a ser "nuevo".
      setSeen(previous=>{
        const valid=new Set(active.map(n=>n.id));
        const next=previous.filter(id=>valid.has(id));
        saveSeen(user.id,next);
        return next;
      });
    }catch(cause){
      if(current===requestId.current) {
        setError(cause instanceof Error?cause.message:'No fue posible consultar las alertas.');
      }
    }finally{
      if(current===requestId.current)setLoading(false);
    }
  },[autorizado,user.id]);

  useEffect(()=>{
    if(!autorizado)return;
    void refresh();
    const interval=window.setInterval(()=>{
      if(document.visibilityState==='visible')void refresh();
    },REFRESH_MS);
    const onFocus=()=>void refresh();
    const onVisibility=()=>{if(document.visibilityState==='visible')void refresh();};
    const onInternalRefresh=()=>void refresh();
    window.addEventListener('focus',onFocus);
    window.addEventListener('sgi:financiamiento-alertas-actualizadas',onInternalRefresh);
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{
      requestId.current++;
      window.clearInterval(interval);
      window.removeEventListener('focus',onFocus);
      window.removeEventListener('sgi:financiamiento-alertas-actualizadas',onInternalRefresh);
      document.removeEventListener('visibilitychange',onVisibility);
    };
  },[autorizado,refresh]);

  const markSeen=useCallback((ids:string[])=>{
    setSeen(previous=>{
      const next=[...new Set([...previous,...ids])].slice(-10000);
      saveSeen(user.id,next);
      return next;
    });
  },[user.id]);

  const seenSet=useMemo(()=>new Set(seen),[seen]);
  const unreadCount=notifications.filter(n=>!seenSet.has(n.id)).length;
  const ordered=useMemo(()=>[
    ...notifications.filter(n=>!seenSet.has(n.id)),
    ...notifications.filter(n=>seenSet.has(n.id))
  ],[notifications,seenSet]);

  return {
    autorizado,notifications:ordered,unreadCount,loading,error,
    refresh,markSeen,seenSet
  };
}
