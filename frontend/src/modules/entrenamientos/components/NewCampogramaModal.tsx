import React, { useState } from 'react';
import EquipoSelect from '../../../shared/components/EquipoSelect';

interface NewCampogramaModalProps {
  onClose: () => void;
  onCreate: (data: { nombre: string; club: string; equipo: string; formacion: string }) => void;
  /** Nombre del club actual (se auto-rellena) */
  clubName?: string;
  /** Lista de equipos (sub-equipos) disponibles en el club actual */
  equipos?: string[];
}

const NewCampogramaModal: React.FC<NewCampogramaModalProps> = ({ onClose, onCreate, clubName, equipos }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    club: clubName || '',
    equipo: equipos?.[0] || 'Primer Equipo',
    formacion: '4-3-3'
  });

  const handleSubmit = () => {
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] shadow-2xl overflow-hidden animate-fade-in border border-slate-200 flex flex-col">
        <div className="p-6 flex justify-between items-center border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tighter">Nuevo Campograma</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuración Táctica Inicial</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="p-5 sm:p-8 space-y-6 overflow-y-auto flex-1">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Nombre del Análisis *</label>
            <input 
              type="text" 
              placeholder="Ej: Análisis vs Portugalete..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10 uppercase"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Club</label>
              <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900">
                {formData.club || 'Sin club'}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Equipo</label>
              <EquipoSelect
                value={formData.equipo}
                onChange={(val) => setFormData({...formData, equipo: val})}
                extraTeams={equipos}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Sistema Táctico (Formación)</label>
            <div className="grid grid-cols-3 gap-2">
              {['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '4-5-1'].map(sys => (
                <button
                  key={sys}
                  type="button"
                  onClick={() => setFormData({...formData, formacion: sys})}
                  className={`py-3 rounded-xl text-[11px] font-black transition-all border ${formData.formacion === sys ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                >
                  {sys}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 bg-slate-50 border-t border-slate-100 flex gap-3 sm:gap-4">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-slate-500 bg-white hover:bg-slate-50 transition-colors uppercase text-[10px] tracking-widest"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            className="flex-[2] py-4 bg-[var(--accent)] text-white rounded-2xl font-black hover:bg-[var(--accent-dark)] transition-all shadow-xl shadow-[var(--accent)]/20 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-diagram-project"></i>
            CREAR TABLERO
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewCampogramaModal;
