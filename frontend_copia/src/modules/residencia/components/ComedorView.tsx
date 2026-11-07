import React, { useState } from 'react';
import ComidasView from './ComidasView';
import ComedorAccesosView from './ComedorAccesosView';

type Tab = 'comidas' | 'accesos';

const ComedorView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('comidas');

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2 pt-4 sm:pt-6">
        <button
          onClick={() => setTab('comidas')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            tab === 'comidas'
              ? 'bg-[var(--accent)] text-white shadow-lg'
              : 'bg-white text-[var(--text-strong)] border border-slate-200 hover:border-[var(--accent)]'
          }`}
        >
          <i className="fa-solid fa-utensils mr-2 text-xs"></i>
          Comidas
        </button>
        <button
          onClick={() => setTab('accesos')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            tab === 'accesos'
              ? 'bg-[var(--accent)] text-white shadow-lg'
              : 'bg-white text-[var(--text-strong)] border border-slate-200 hover:border-[var(--accent)]'
          }`}
        >
          <i className="fa-solid fa-qrcode mr-2 text-xs"></i>
          Comedor QR
        </button>
      </div>

      {tab === 'comidas' ? <ComidasView /> : <ComedorAccesosView />}
    </div>
  );
};

export default ComedorView;
