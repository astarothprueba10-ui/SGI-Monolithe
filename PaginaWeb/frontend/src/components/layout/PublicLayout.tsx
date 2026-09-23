import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MessageCircleIcon } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { contactInfo } from '../../data/site';

export function PublicLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />

      <a
        href={contactInfo.whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lift transition-[background-color,transform] duration-150 ease-out hover:bg-brand-700 active:translate-y-px">
        
        <MessageCircleIcon className="h-5 w-5" />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>
    </div>);

}