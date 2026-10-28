import { useEffect, useState } from 'react';
import { getPeruTodayDateString } from '../components/Workers/workerDateUtils';

/** Actualiza el día de Perú al abrir el formulario y al cruzar medianoche. */
export function usePeruToday(enabled: boolean): string {
  const [today, setToday] = useState(getPeruTodayDateString);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => setToday(getPeruTodayDateString());
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [enabled]);
  return today;
}
