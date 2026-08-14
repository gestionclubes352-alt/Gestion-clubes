import React, { useState, useEffect, useMemo } from 'react';
import type { Localidad, InstalacionCampo } from '@shared/services/dataService';
import { localidadesService, instalacionesCamposService } from '@shared/services';
import { useAuth } from '@context/AuthContext';
import EditLocalidadModal from './EditLocalidadModal';
import EditInstalacionModal from './EditInstalacionModal';
import type { LocalidadFormData, InstalacionCampoFormData } from '../types';

type TabType = 'localidades' | 'instalaciones';

const InstalacionesView: React.FC = () => {
  const { perfil } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('localidades');
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [instalaciones, setInstalaciones] = useState<InstalacionCampo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingLocalidad, setEditingLocalidad] = useState<LocalidadFormData | null>(null);
  const [editingInstalacion, setEditingInstalacion] = useState<InstalacionCampoFormData | null>(null);
  const [isCreatingLocalidad, setIsCreatingLocalidad] = useState(false);
  const [isCreatingInstalacion, setIsCreatingInstalacion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [localidadesData, instalacionesData] = await Promise.all([
        localidadesService.list(),
        instalacionesCamposService.list(),
      ]);
      setLocalidades(localidadesData || []);
      setInstalaciones(instalacionesData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredLocalidades = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return localidades;
    return localidades.filter(loc =>
      loc.nombre.toLowerCase().includes(q) ||
      (loc.provincia || '').toLowerCase().includes(q)
    );
  }, [localidades, search]);

  const filteredInstalaciones = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return instalaciones;
    return instalaciones.filter(ic =>
      ic.nombre.toLowerCase().includes(q) ||
      (ic.tipo || '').toLowerCase().includes(q) ||
      (ic.descripcion || '').toLowerCase().includes(q)
    );
  }, [instalaciones, search]);

  const handleSaveLocalidad = async (data: LocalidadFormData) => {
    try {
      if (data.id) {
        await localidadesService.update(data.id, {
          nombre: data.nombre,
          provincia: data.provincia,
          pais: data.pais,
        } as any);
      } else {
        await localidadesService.create({
          club_id: perfil?.club_id,
          nombre: data.nombre,
          provincia: data.provincia,
          pais: data.pais,
        } as any);
      }
      await loadData();
      setEditingLocalidad(null);
      setIsCreatingLocalidad(false);
    } catch (err) {
      console.error('Error saving localidad:', err);
      throw err;
    }
  };

  const handleDeleteLocalidad = async (id: string) => {
    try {
      await localidadesService.remove(id);
      await loadData();
      setEditingLocalidad(null);
    } catch (err) {
      console.error('Error deleting localidad:', err);
      throw err;
    }
  };

  const handleSaveInstalacion = async (data: InstalacionCampoFormData) => {
    try {
      if (data.id) {
        await instalacionesCamposService.update(data.id, {
          nombre: data.nombre,
          localidad_id: data.localidad_id,
          tipo: data.tipo,
          capacidad: data.capacidad,
          descripcion: data.descripcion,
        } as any);
      } else {
        await instalacionesCamposService.create({
          club_id: perfil?.club_id,
          nombre: data.nombre,
          localidad_id: data.localidad_id,
          tipo: data.tipo,
          capacidad: data.capacidad,
          descripcion: data.descripcion,
        } as any);
      }
      await loadData();
      setEditingInstalacion(null);
      setIsCreatingInstalacion(false);
    } catch (err) {
      console.error('Error saving instalacion:', err);
      throw err;
    }
  };

  const handleDeleteInstalacion = async (id: string) => {
    try {
      await instalacionesCamposService.remove(id);
      await loadData();
      setEditingInstalacion(null);
    } catch (err) {
      console.error('Error deleting instalacion:', err);
      throw err;
    }
  };

  const getLocalidadNombre = (id?: string) => {
    return localidades.find(loc => loc.id === id)?.nombre || '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <i className="fa-solid fa-spinner animate-spin text-4xl text-[var(--accent)]"></i>
          <p className="text-slate-600 font-semibold">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* PAGE TITLE */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1" />
        <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
          INSTALACIONES Y CAMPOS
        </h2>
        <div className="flex-1 flex justify-end" />
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('localidades')}
          className={`px-4 py-3 font-black text-[11px] uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'localidades'
              ? 'text-[var(--accent)] border-[var(--accent)]'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          <i className="fa-solid fa-map-pin mr-2"></i>
          Localidades ({filteredLocalidades.length})
        </button>
        <button
          onClick={() => setActiveTab('instalaciones')}
          className={`px-4 py-3 font-black text-[11px] uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'instalaciones'
              ? 'text-[var(--accent)] border-[var(--accent)]'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          <i className="fa-solid fa-fence mr-2"></i>
          Instalaciones ({filteredInstalaciones.length})
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'localidades' ? 'Buscar localidad...' : 'Buscar instalación...'}
            className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
        <button
          onClick={() => activeTab === 'localidades' ? setIsCreatingLocalidad(true) : setIsCreatingInstalacion(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg whitespace-nowrap"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          {activeTab === 'localidades' ? 'Nueva Localidad' : 'Nueva Instalación'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {/* LOCALIDADES TAB */}
      {activeTab === 'localidades' && (
        <div className="space-y-3">
          {filteredLocalidades.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <i className="fa-solid fa-map-pin text-4xl text-slate-300 mb-4 block"></i>
              <p className="font-semibold">No hay localidades registradas</p>
              <p className="text-sm text-slate-400 mt-1">Crea la primera localidad para empezar</p>
            </div>
          ) : (
            filteredLocalidades.map(localidad => (
              <div
                key={localidad.id}
                onClick={() => setEditingLocalidad(localidad as LocalidadFormData)}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-[var(--accent)] hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-black text-[var(--accent)] uppercase tracking-tighter">
                      {localidad.nombre}
                    </h3>
                    {localidad.provincia && (
                      <p className="text-sm text-slate-600 mt-1">
                        <i className="fa-solid fa-location-dot mr-2 text-slate-400"></i>
                        {localidad.provincia}, {localidad.pais}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      {instalaciones.filter(ic => ic.localidad_id === localidad.id).length} instalaciones
                    </p>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-300"></i>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* INSTALACIONES TAB */}
      {activeTab === 'instalaciones' && (
        <div className="space-y-3">
          {filteredInstalaciones.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <i className="fa-solid fa-fence text-4xl text-slate-300 mb-4 block"></i>
              <p className="font-semibold">No hay instalaciones registradas</p>
              <p className="text-sm text-slate-400 mt-1">Crea la primera instalación para empezar</p>
            </div>
          ) : (
            filteredInstalaciones.map(instalacion => (
              <div
                key={instalacion.id}
                onClick={() => setEditingInstalacion(instalacion as InstalacionCampoFormData)}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-[var(--accent)] hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-[var(--accent)] uppercase tracking-tighter">
                        {instalacion.nombre}
                      </h3>
                      {instalacion.tipo && (
                        <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black">
                          {instalacion.tipo}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      <i className="fa-solid fa-map-pin mr-2 text-slate-400"></i>
                      {getLocalidadNombre(instalacion.localidad_id)}
                    </p>
                    {instalacion.capacidad && (
                      <p className="text-sm text-slate-600">
                        <i className="fa-solid fa-users mr-2 text-slate-400"></i>
                        Capacidad: {instalacion.capacidad.toLocaleString('es-ES')}
                      </p>
                    )}
                    {instalacion.descripcion && (
                      <p className="text-xs text-slate-500 mt-2 italic">
                        {instalacion.descripcion}
                      </p>
                    )}
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-300"></i>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODALS */}
      <EditLocalidadModal
        localidad={editingLocalidad}
        isOpen={editingLocalidad !== null || isCreatingLocalidad}
        onClose={() => {
          setEditingLocalidad(null);
          setIsCreatingLocalidad(false);
        }}
        onSave={handleSaveLocalidad}
        onDelete={handleDeleteLocalidad}
      />

      <EditInstalacionModal
        instalacion={editingInstalacion}
        localidades={localidades}
        isOpen={editingInstalacion !== null || isCreatingInstalacion}
        onClose={() => {
          setEditingInstalacion(null);
          setIsCreatingInstalacion(false);
        }}
        onSave={handleSaveInstalacion}
        onDelete={handleDeleteInstalacion}
      />
    </div>
  );
};

export default InstalacionesView;
