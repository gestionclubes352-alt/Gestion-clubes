import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { TeamProvider } from './context/TeamContext';
import escuelaHuescaLogo from '/logos/escuela-huesca.png';

/** Harness aislado: reproduce el layout real (aside fixed + main) sin pasar por auth/Supabase. */
const Harness: React.FC = () => {
  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-white">
      <aside
        className="w-[280px] max-w-[85vw] bg-[var(--sidebar-bg)] h-dvh flex flex-col fixed left-0 top-0 overflow-hidden z-80 transition-all duration-300 ease-out border-r border-white/5 translate-x-0"
      >
        <div className="flex items-center border-b border-white/10 px-5 py-5 gap-3 h-20">
          <div className="shrink-0 rounded-xl flex items-center justify-center overflow-hidden w-11 h-11">
            <img src={escuelaHuescaLogo} alt="Huesca escudo" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xl font-black text-white tracking-tight">HUESCA</span>
            <span className="text-xs font-medium text-white/50 tracking-wider uppercase">Gestión deportiva</span>
          </div>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          <div className="mb-1">
            <div className="px-6 py-2 text-xs font-bold text-white/40 uppercase tracking-[0.2em]">Gestión</div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-3 px-4 py-2.5 mx-3 rounded-lg bg-white/15 text-white">CALENDARIO</div>
              <div className="flex items-center gap-3 px-4 py-2.5 mx-3 rounded-lg text-white/90">MIS DATOS</div>
            </div>
          </div>
        </nav>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto bg-white transition-all duration-300 app-header-offset lg:ml-70">
        <header className="app-header-safe fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-2 sm:px-3 md:px-4 lg:px-8 py-2 md:py-3 flex items-center justify-between gap-2 shadow-sm lg:left-70">
          <div className="flex items-center gap-1.5 md:gap-4 min-w-0">
            <button className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-2 rounded-xl border bg-[var(--accent)] text-white">HOME</button>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto w-full px-3 pt-3 pb-24 sm:px-4 md:px-6 md:pt-4 lg:px-12 lg:pt-6 lg:pb-10">
          <h1 style={{ fontSize: 32, fontWeight: 900 }}>VIDEOTECA OFICIAL TEST</h1>
          <p>CONTENIDO DE PRUEBA PARA MEDIR EL SOLAPE</p>
        </div>
      </main>
    </div>
  );
};

const rootElement = document.getElementById('root')!;
ReactDOM.createRoot(rootElement).render(
  <BrowserRouter>
    <TeamProvider>
      <Harness />
    </TeamProvider>
  </BrowserRouter>
);
