import React from 'react';
import { Campograma } from '../types';

interface CampogramaGridProps {
  campogramas: Campograma[];
  onSelect: (camp: Campograma) => void;
  onDelete: (id: number | string) => void;
}

const CampogramaGrid: React.FC<CampogramaGridProps> = ({ campogramas, onSelect, onDelete }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {campogramas.map((camp) => (
        <div 
          key={camp.id} 
          onClick={() => onSelect(camp)}
          className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative cursor-pointer overflow-hidden"
        >
          <div className="absolute top-6 left-6 bg-[var(--accent)] text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm">
            {camp.formacion}
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(camp.id);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100 z-20"
            title="Eliminar Campograma"
          >
            <i className="fa-regular fa-trash-can text-sm"></i>
          </button>

          <div className="mt-10">
            <h3 className="text-lg font-black text-slate-800 uppercase mb-2 tracking-tighter leading-tight group-hover:text-[var(--accent)] transition-colors">
              {camp.nombre}
            </h3>
            
            <div className="space-y-1 mb-6">
              <p className="text-[var(--accent)] text-[10px] font-black uppercase tracking-widest opacity-80">{camp.club}</p>
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-tight">{camp.equipo}</p>
            </div>
            
            <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-400">
                    <i className="fa-solid fa-user"></i>
                  </div>
                ))}
              </div>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                {camp.jugadoresCount} JUGADORES
              </span>
            </div>
          </div>

          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
        </div>
      ))}

      {campogramas.length === 0 && (
        <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
            <i className="fa-solid fa-folder-open text-2xl"></i>
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay campogramas guardados</p>
        </div>
      )}
    </div>
  );
};

export default CampogramaGrid;
