import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CompetitionConfig {
  id: string;
  nombre: string;
  partes: number;
  minutosPorParte: number;
}

const CompetitionsConfigView: React.FC = () => {
  const { t } = useTranslation();
  const [competiciones, setCompeticiones] = useState<CompetitionConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompetitionConfig>({
    id: '',
    nombre: '',
    partes: 2,
    minutosPorParte: 45,
  });
  const [isAdding, setIsAdding] = useState(false);

  // Cargar configuraciones desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('competiciones-config');
    if (saved) {
      try {
        setCompeticiones(JSON.parse(saved));
      } catch {
        setCompeticiones([]);
      }
    }
  }, []);

  // Guardar en localStorage
  const saveCompeticiones = (data: CompetitionConfig[]) => {
    localStorage.setItem('competiciones-config', JSON.stringify(data));
    setCompeticiones(data);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      id: Date.now().toString(),
      nombre: '',
      partes: 2,
      minutosPorParte: 45,
    });
    setIsAdding(true);
  };

  const handleEdit = (competicion: CompetitionConfig) => {
    setFormData(competicion);
    setEditingId(competicion.id);
    setIsAdding(false);
  };

  const handleSave = () => {
    if (!formData.nombre.trim()) {
      alert(t('common.error') + ': ' + 'El nombre de la competición es obligatorio');
      return;
    }
    if (formData.partes < 1 || formData.minutosPorParte < 1) {
      alert(t('common.error') + ': ' + 'Las partes y minutos deben ser mayores a 0');
      return;
    }

    if (editingId) {
      // Actualizar
      const updated = competiciones.map(c => c.id === editingId ? formData : c);
      saveCompeticiones(updated);
    } else {
      // Agregar nuevo
      saveCompeticiones([...competiciones, formData]);
    }

    setEditingId(null);
    setIsAdding(false);
    setFormData({ id: '', nombre: '', partes: 2, minutosPorParte: 45 });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ id: '', nombre: '', partes: 2, minutosPorParte: 45 });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta competición?')) {
      saveCompeticiones(competiciones.filter(c => c.id !== id));
    }
  };

  const calculateTotalMinutes = (partes: number, minutosPorParte: number) => partes * minutosPorParte;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* PAGE TITLE */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter">
          {t('sidebar.competitionsLabel') || 'Competiciones'}
        </h2>
        {!isAdding && editingId === null && (
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            Nueva Competición
          </button>
        )}
      </div>

      {/* FORM - ADD/EDIT */}
      {(isAdding || editingId) && (
        <div className="mb-8 p-6 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-tight">
            {editingId ? 'Editar Competición' : 'Nueva Competición'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campo: Nombre */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Nombre de la Competición *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Liga Regular, Copa del Rey..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
              />
            </div>

            {/* Campo: Partes */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Número de Partes *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.partes}
                onChange={e => setFormData({ ...formData, partes: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
              />
            </div>

            {/* Campo: Minutos por Parte */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Minutos por Parte *
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={formData.minutosPorParte}
                onChange={e => setFormData({ ...formData, minutosPorParte: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
              />
            </div>

            {/* Resumen: Total de minutos */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Total de Minutos
              </label>
              <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-[var(--accent)] flex items-center gap-2">
                <i className="fa-solid fa-clock text-sm"></i>
                {calculateTotalMinutes(formData.partes, formData.minutosPorParte)} min
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 mt-6 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-bold text-xs uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* TABLA DE COMPETICIONES */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Encabezado */}
            <div
              className="grid text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-200"
              style={{ gridTemplateColumns: '1fr 100px 100px 120px 100px' }}
            >
              <div className="px-6 py-4">Competición</div>
              <div className="px-6 py-4 text-center">Partes</div>
              <div className="px-6 py-4 text-center">Min/Parte</div>
              <div className="px-6 py-4 text-center">Total Minutos</div>
              <div className="px-6 py-4 text-right">Acciones</div>
            </div>

            {/* Filas */}
            {competiciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                <i className="fa-solid fa-trophy text-4xl mb-3"></i>
                <span className="text-sm font-bold uppercase tracking-widest">Sin competiciones</span>
              </div>
            ) : (
              competiciones.map(comp => (
                <div
                  key={comp.id}
                  className="grid items-center border-b border-slate-100 last:border-b-0 bg-white hover:bg-slate-50/50 transition-colors"
                  style={{ gridTemplateColumns: '1fr 100px 100px 120px 100px' }}
                >
                  <div className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{comp.nombre}</span>
                  </div>
                  <div className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-bold text-sm">
                      {comp.partes}
                    </span>
                  </div>
                  <div className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-slate-700">{comp.minutosPorParte}'</span>
                  </div>
                  <div className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                      <i className="fa-solid fa-clock text-[10px]"></i>
                      {calculateTotalMinutes(comp.partes, comp.minutosPorParte)} min
                    </span>
                  </div>
                  <div className="px-6 py-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(comp)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-[var(--accent)] hover:text-white text-slate-500 flex items-center justify-center transition-all"
                      title="Editar"
                    >
                      <i className="fa-regular fa-pen-to-square text-[11px]"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(comp.id)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 flex items-center justify-center transition-all"
                      title="Eliminar"
                    >
                      <i className="fa-regular fa-trash-can text-[11px]"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* INFO BOX */}
      {competiciones.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
          <i className="fa-solid fa-circle-info mr-2"></i>
          Total de {competiciones.length} competición{competiciones.length !== 1 ? 'es' : ''} configurada{competiciones.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default CompetitionsConfigView;
