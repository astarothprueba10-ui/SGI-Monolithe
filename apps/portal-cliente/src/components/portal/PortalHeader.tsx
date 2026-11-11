import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {LogOutIcon,MenuIcon,ShieldCheckIcon} from 'lucide-react';
import {getPortalVisualIdentity} from '../../lib/portalSession';
import {authApi} from '../../lib/apiClient';

type PortalHeaderProps={
  onOpenMenu:()=>void;
  menuOpen:boolean;
};
export function PortalHeader({onOpenMenu,menuOpen}:PortalHeaderProps) {
  const navigate=useNavigate();
  const [saliendo,setSaliendo]=useState(false);
  const {nombreMostrar,iniciales}=getPortalVisualIdentity();
  const salir=async()=>{
    if(saliendo)return;
    setSaliendo(true);
    const refreshToken=localStorage.getItem('monolithe_refresh_token')
      ??sessionStorage.getItem('monolithe_refresh_token');
    try{
      if(refreshToken){
        await authApi.post<void>('/logout',{refreshToken});
      }
    }catch{
      // La limpieza local se ejecuta incluso si falla el endpoint de logout.
    }finally{
      for(const key of ['monolithe_access_token','monolithe_refresh_token','monolithe_user']){
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
      navigate('/login',{replace:true});
      setSaliendo(false);
    }
  };
  return <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slateux-200 bg-white px-4 sm:px-6">
    <button type="button" onClick={onOpenMenu}
      aria-label={menuOpen?'Cerrar menú':'Abrir menú'}
      className="rounded-field p-2 text-ink-700 hover:bg-slateux-100 lg:hidden">
      <MenuIcon className="h-5 w-5"/>
    </button>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-ink-800">
        Mi cuenta MONOLITHE
      </p>
      <p className="flex items-center gap-1 text-[11px] text-slateux-500">
        <ShieldCheckIcon className="h-3 w-3"/>
        Acceso a operaciones propias
      </p>
    </div>
    <div className="hidden min-w-0 items-center gap-2 sm:flex">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-800 text-xs font-semibold text-white">
        {iniciales}
      </span>
      <span className="max-w-40 truncate text-xs font-medium text-ink-800">
        {nombreMostrar}
      </span>
    </div>
    <button type="button" disabled={saliendo} onClick={()=>void salir()}
      className="inline-flex items-center gap-2 rounded-field border border-slateux-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-slateux-50 disabled:opacity-50">
      <LogOutIcon className="h-4 w-4"/>
      {saliendo?'Cerrando…':'Cerrar sesión'}
    </button>
  </header>;
}
