import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Competicion, Equipo } from '@/shared/services/dataService';
import { equiposService } from '@shared/services';
import { competicionService } from '../services/competicionService';
import { competicionEquiposService, type EquipoRef } from '../services/competicionEquiposService';
import { CompetitionTeam } from '../types';
import CompetitionCalendarModal from './CompetitionCalendarModal';
import CompetitionTeamsSelector from './CompetitionTeamsSelector';

interface CompetitionConfig {
  id: string;
  nombre: string;
  partes: number;
  minutosPorParte: number;
}

interface CompetitionsConfigViewProps {
  /** Equipos propios del club (con nombreEnFed) para resaltar el equipo correcto en cada calendario de competición. */
  misEquipos?: CompetitionTeam[];
}

const CompetitionsConfigView: React.FC<CompetitionsConfigViewProps> = ({ misEquipos = [] }) => {
  const { t } = useTranslation();
  const [competiciones, setCompeticiones] = useState<Competicion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompetitionConfig>({
    id: '',
    nombre: '',
    partes: 2,
    minutosPorParte: 45,
  });
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarioCompeticion, setCalendarioCompeticion] = useState<Competicion | null>(null);
  const [equiposSelectorOpen, setEquiposSelectorOpen] = useState(false);
  const [competicionSeleccionada, setCompeticionSeleccionada] = useState<Competicion | null>(null);
  const [todosLosEquipos, setTodosLosEquipos] = useState<CompetitionTeam[]>([]);
  const [equiposCompeticionActual, setEquiposCompeticionActual] = useState<EquipoRef[]>([]);
  const [loadingEquiposCompeticion, setLoadingEquiposCompeticion] = useState(false);
  const [equiposSelectorError, setEquiposSelectorError] = useState<string | null>(null);

  // Cargar configuraciones desde Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [competicionesData, equiposData] = await Promise.all([
        competicionService.listCompeticiones(),
        loadAllTeams(),
      ]);
      setCompeticiones(competicionesData);
      setTodosLosEquipos(equiposData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cargar datos';
      setError(errorMsg);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllTeams = async (): Promise<CompetitionTeam[]> => {
    // Cargar TODOS los equipos del sistema (de cualquier club), no solo los propios,
    // para poder añadir a una competición equipos ya registrados por otros clubes.
    try {
      const data = await equiposService.list();
      return (data as Equipo[]).map((e): CompetitionTeam => ({
        id: e.id,
        clubId: e.club_id,
        nombre: e.nombre,
        estadio: e.estadio || '',
        localidad: e.localidad || '',
        logoUrl: e.logo_url || undefined,
        equipo: e.sub_equipo,
        nombreEnFed: e.nombre_en_fed,
        etapa: e.categoria,
        competicion: e.competicion,
        enlace: e.enlace,
      }));
    } catch (err) {
      console.error('Error loading all teams:', err);
      return misEquipos || [];
    }
  };

  const handleOpenEquiposSelector = async (comp: Competicion) => {
    setCompeticionSeleccionada(comp);
    setEquiposSelectorOpen(true);
    setEquiposSelectorError(null);
    setLoadingEquiposCompeticion(true);
    try {
      const teams = await competicionEquiposService.getTeamsByCompeticion(comp.id);
      setEquiposCompeticionActual(teams);
    } catch (err) {
      console.error('Error loading teams for competition:', err);
      setEquiposCompeticionActual([]);
    } finally {
      setLoadingEquiposCompeticion(false);
    }
  };

  const loadCompeticiones = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await competicionService.listCompeticiones();
      setCompeticiones(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cargar competiciones';
      setError(errorMsg);
      console.error('Error loading competiciones:', err);
    } finally {
      setLoading(false);
    }
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

  const handleSave = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!formData.nombre.trim()) {
      alert(t('common.error') + ': ' + 'El nombre de la competición es obligatorio');
      return;
    }
    if (formData.partes < 1 || formData.minutosPorParte < 1) {
      alert(t('common.error') + ': ' + 'Las partes y minutos deben ser mayores a 0');
      return;
    }

    try {
      setLoading(true);
      const competicionData = {
        nombre: formData.nombre,
        tipo: 'Liga' as const,
        temporada: '25/26',
        numero_partes: formData.partes,
        minutos_por_parte: formData.minutosPorParte,
        total_minutos: formData.partes * formData.minutosPorParte,
      };

      if (editingId) {
        await competicionService.updateCompeticion(editingId, competicionData);
      } else {
        await competicionService.createCompeticion(competicionData);
      }

      setEditingId(null);
      setIsAdding(false);
      setFormData({ id: '', nombre: '', partes: 2, minutosPorParte: 45 });

      await loadCompeticiones();
      alert(editingId ? 'Competición actualizada correctamente' : 'Competición guardada correctamente');
    } catch (error) {
      console.error('Error al guardar competición:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMsg);
      alert('Error al guardar la competición: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingId(null);
    setIsAdding(false);
    setFormData({ id: '', nombre: '', partes: 2, minutosPorParte: 45 });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta competición?')) {
      try {
        setLoading(true);
        await competicionService.deleteCompeticion(id);
        await loadCompeticiones();
      } catch (error) {
        console.error('Error al eliminar competición:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMsg);
        alert('Error al eliminar la competición: ' + errorMsg);
      } finally {
        setLoading(false);
      }
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
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-bold text-xs uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {/* TABLA DE COMPETICIONES */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Encabezado */}
            <div
              className="grid text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-200"
              style={{ gridTemplateColumns: '1fr 100px 100px 120px 140px' }}
            >
              <div className="px-6 py-4">Competición</div>
              <div className="px-6 py-4 text-center">Partes</div>
              <div className="px-6 py-4 text-center">Min/Parte</div>
              <div className="px-6 py-4 text-center">Total Minutos</div>
              <div className="px-6 py-4 text-right">Acciones</div>
            </div>

            {/* Filas */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                <i className="fa-solid fa-spinner text-4xl mb-3 animate-spin"></i>
                <span className="text-sm font-bold uppercase tracking-widest">Cargando competiciones...</span>
              </div>
            ) : competiciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                <i className="fa-solid fa-trophy text-4xl mb-3"></i>
                <span className="text-sm font-bold uppercase tracking-widest">Sin competiciones</span>
              </div>
            ) : (
              competiciones.map(comp => (
                <div
                  key={comp.id}
                  className="grid items-center border-b border-slate-100 last:border-b-0 bg-white hover:bg-slate-50/50 transition-colors"
                  style={{ gridTemplateColumns: '1fr 100px 100px 120px 140px' }}
                >
                  <div className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{comp.nombre}</span>
                  </div>
                  <div className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-bold text-sm">
                      {comp.numero_partes}
                    </span>
                  </div>
                  <div className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-slate-700">{comp.minutos_por_parte}'</span>
                  </div>
                  <div className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                      <i className="fa-solid fa-clock text-[10px]"></i>
                      {comp.total_minutos} min
                    </span>
                  </div>
                  <div className="px-6 py-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEquiposSelector(comp)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-500 hover:text-white text-slate-500 flex items-center justify-center transition-all"
                      title="Configurar equipos"
                      disabled={loading}
                    >
                      <i className="fa-solid fa-people-group text-[11px]"></i>
                    </button>
                    <button
                      onClick={() => setCalendarioCompeticion(comp)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-[var(--accent)] hover:text-white text-slate-500 flex items-center justify-center transition-all"
                      title="Calendario"
                      disabled={loading}
                    >
                      <i className="fa-solid fa-calendar-days text-[11px]"></i>
                    </button>
                    <button
                      onClick={() => handleEdit({ id: comp.id, nombre: comp.nombre, partes: comp.numero_partes, minutosPorParte: comp.minutos_por_parte })}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-[var(--accent)] hover:text-white text-slate-500 flex items-center justify-center transition-all"
                      title="Editar"
                      disabled={loading}
                    >
                      <i className="fa-regular fa-pen-to-square text-[11px]"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(comp.id)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 flex items-center justify-center transition-all"
                      title="Eliminar"
                      disabled={loading}
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
      {!loading && competiciones.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
          <i className="fa-solid fa-circle-info mr-2"></i>
          Total de {competiciones.length} competición{competiciones.length !== 1 ? 'es' : ''} configurada{competiciones.length !== 1 ? 's' : ''}
        </div>
      )}

      {calendarioCompeticion && (
        <CompetitionCalendarModal
          competicion={calendarioCompeticion}
          equipoDestacado={misEquipos.find(eq => eq.competicion === calendarioCompeticion.nombre)?.nombreEnFed}
          competitionTeams={misEquipos}
          allCompetitions={competiciones}
          onClose={() => setCalendarioCompeticion(null)}
        />
      )}

      {/* Modal para configurar equipos */}
      {equiposSelectorOpen && competicionSeleccionada && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90dvh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tighter">
                  Configurar Equipos
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  {competicionSeleccionada.nombre}
                </p>
              </div>
              <button
                onClick={() => setEquiposSelectorOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-4">
              {equiposSelectorError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  <i className="fa-solid fa-circle-exclamation mr-2"></i>
                  {equiposSelectorError}
                </div>
              )}
              {loadingEquiposCompeticion ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <i className="fa-solid fa-spinner text-3xl mb-3 animate-spin"></i>
                  <span className="text-sm font-bold uppercase tracking-widest">Cargando equipos...</span>
                </div>
              ) : (
                <CompetitionTeamsSelector
                  competicion={competicionSeleccionada}
                  allTeams={todosLosEquipos}
                  initialTeams={equiposCompeticionActual}
                  onTeamsSelected={(teams) => {
                    setEquiposSelectorError(null);
                    competicionEquiposService.setTeamsForCompeticion(competicionSeleccionada.id, teams).catch(err => {
                      console.error('Error saving teams:', err);
                      const msg = err instanceof Error ? err.message : 'Error al guardar los equipos';
                      setEquiposSelectorError(msg);
                    });
                  }}
                />
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
              <button
                onClick={() => setEquiposSelectorOpen(false)}
                className="px-6 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitionsConfigView;
