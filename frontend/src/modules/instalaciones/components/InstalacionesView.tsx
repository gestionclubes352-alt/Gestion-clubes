import React, { useState, useEffect, useMemo } from 'react';
import type { Localidad, InstalacionCampo, Club } from '@shared/services/dataService';
import { localidadesService, instalacionesCamposService, clubesService } from '@shared/services';
import { useAuth } from '@context/AuthContext';
import EditLocalidadModal from './EditLocalidadModal';
import EditInstalacionModal from './EditInstalacionModal';
import AddCampoModal from './AddCampoModal';
import { instalacionesClubesService } from '../services/instalacionesClubesService';
import type { LocalidadFormData, InstalacionCampoFormData } from '../types';

type TabType = 'localidades' | 'instalaciones';

const InstalacionesView: React.FC = () => {
  const { perfil, perfilLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('instalaciones');
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [instalaciones, setInstalaciones] = useState<InstalacionCampo[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [clubesPorInstalacion, setClubesPorInstalacion] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingLocalidad, setEditingLocalidad] = useState<LocalidadFormData | null>(null);
  const [editingInstalacion, setEditingInstalacion] = useState<InstalacionCampoFormData | null>(null);
  const [isCreatingLocalidad, setIsCreatingLocalidad] = useState(false);
  const [isCreatingInstalacion, setIsCreatingInstalacion] = useState(false);
  const [isCreatingLocalidadFromInstalacion, setIsCreatingLocalidadFromInstalacion] = useState(false);
  const [isAddingCampo, setIsAddingCampo] = useState(false);
  const [addingCampoToInstalacion, setAddingCampoToInstalacion] = useState<InstalacionCampo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedInstalaciones, setExpandedInstalaciones] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [localidadesData, instalacionesData, clubesData, instalacionesClubesData] = await Promise.all([
        localidadesService.list(),
        instalacionesCamposService.list(),
        clubesService.list(),
        instalacionesClubesService.listAll(),
      ]);
      setLocalidades(localidadesData || []);
      setInstalaciones(instalacionesData || []);
      setClubes(clubesData || []);
      const map: Record<string, string[]> = {};
      for (const rel of instalacionesClubesData || []) {
        if (!map[rel.instalacion_campo_id]) map[rel.instalacion_campo_id] = [];
        map[rel.instalacion_campo_id].push(rel.club_id);
      }
      setClubesPorInstalacion(map);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredLocalidades = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = !q ? localidades : localidades.filter(loc =>
      loc.nombre.toLowerCase().includes(q) ||
      (loc.provincia || '').toLowerCase().includes(q)
    );
    return filtered.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [localidades, search]);

  const filteredInstalaciones = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = !q ? instalaciones : instalaciones.filter(ic =>
      ic.nombre.toLowerCase().includes(q) ||
      (ic.tipo || '').toLowerCase().includes(q) ||
      (ic.descripcion || '').toLowerCase().includes(q)
    );
    return filtered.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [instalaciones, search]);

  const groupedInstalaciones = useMemo(() => {
    const principales = instalaciones.filter(ic => !ic.parent_instalacion_id);
    return principales
      .map(principal => ({
        instalacion: principal,
        campos: instalaciones.filter(ic => ic.parent_instalacion_id === principal.id)
      }))
      .filter(group => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const principalMatches = group.instalacion.nombre.toLowerCase().includes(q) ||
          (group.instalacion.tipo || '').toLowerCase().includes(q) ||
          (group.instalacion.descripcion || '').toLowerCase().includes(q);
        const camposMatch = group.campos.some(c =>
          c.nombre.toLowerCase().includes(q) ||
          (c.tipo || '').toLowerCase().includes(q) ||
          (c.descripcion || '').toLowerCase().includes(q)
        );
        return principalMatches || camposMatch;
      });
  }, [instalaciones, search]);

  const handleSaveLocalidad = async (data: LocalidadFormData) => {
    try {
      if (!perfil?.club_id) {
        throw new Error('No tienes un club asignado. Contacta con el administrador.');
      }

      let nuevaLocalidadId: string | null = null;
      if (data.id) {
        await localidadesService.update(data.id, {
          nombre: data.nombre,
          provincia: data.provincia,
          pais: data.pais,
        } as any);
      } else {
        const creada = await localidadesService.create({
          club_id: perfil.club_id,
          nombre: data.nombre,
          provincia: data.provincia,
          pais: data.pais,
        } as any);
        nuevaLocalidadId = (creada as Localidad).id;
      }
      await loadData();
      if (nuevaLocalidadId && isCreatingLocalidadFromInstalacion) {
        setEditingInstalacion(prev => (prev ? { ...prev, localidad_id: nuevaLocalidadId! } : prev));
      }
      setEditingLocalidad(null);
      setIsCreatingLocalidad(false);
      setIsCreatingLocalidadFromInstalacion(false);
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
      let instalacionId: string;

      if (data.id) {
        await instalacionesCamposService.update(data.id, {
          nombre: data.nombre,
          localidad_id: data.localidad_id,
          tipo: data.tipo,
          capacidad: data.capacidad,
          descripcion: data.descripcion,
        } as any);
        instalacionId = data.id;
      } else {
        const nuevaInstalacion = await instalacionesCamposService.create({
          club_id: perfil?.club_id,
          nombre: data.nombre,
          localidad_id: data.localidad_id,
          tipo: data.tipo,
          capacidad: data.capacidad,
          descripcion: data.descripcion,
          parent_instalacion_id: (data as any).parent_instalacion_id || undefined,
        } as any);
        instalacionId = nuevaInstalacion.id;
      }

      // Guardar relación con clubes
      if (data.clubes_ids && data.clubes_ids.length > 0) {
        await instalacionesClubesService.setClubsForInstalacion(instalacionId, data.clubes_ids);
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

  const handleCreateLocalidad = async (nombre: string): Promise<Localidad> => {
    if (!perfil?.club_id) {
      throw new Error('No tienes un club asignado.');
    }
    const creada = await localidadesService.create({
      club_id: perfil.club_id,
      nombre: nombre,
      provincia: '',
      pais: '',
    } as any);
    await loadData();
    return creada as Localidad;
  };

  const handleAddCampo = async (nombre: string, superficie: string) => {
    if (!addingCampoToInstalacion) return;
    try {
      await instalacionesCamposService.create({
        club_id: perfil?.club_id,
        nombre: nombre,
        tipo: superficie,
        localidad_id: addingCampoToInstalacion.localidad_id,
        parent_instalacion_id: addingCampoToInstalacion.id,
      } as any);
      await loadData();
      setIsAddingCampo(false);
      setAddingCampoToInstalacion(null);
    } catch (err) {
      console.error('Error adding campo:', err);
      throw err;
    }
  };

  const getLocalidadNombre = (id?: string) => {
    return localidades.find(loc => loc.id === id)?.nombre || '-';
  };

  const getClubesNombres = (instalacionId: string) => {
    const ids = clubesPorInstalacion[instalacionId] || [];
    return ids
      .map(id => clubes.find(c => c.id === id)?.nombre)
      .filter((n): n is string => Boolean(n));
  };

  const toggleInstalacionExpanded = (instalacionId: string) => {
    const newExpanded = new Set(expandedInstalaciones);
    if (newExpanded.has(instalacionId)) {
      newExpanded.delete(instalacionId);
    } else {
      newExpanded.add(instalacionId);
    }
    setExpandedInstalaciones(newExpanded);
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
          Instalaciones ({instalaciones.filter(ic => !ic.parent_instalacion_id).length})
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
          disabled={perfilLoading || !perfil?.club_id}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
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
                      {instalaciones.filter(ic => ic.localidad_id === localidad.id && !ic.parent_instalacion_id).length} instalaciones
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
        <div className="space-y-4">
          {groupedInstalaciones.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <i className="fa-solid fa-fence text-4xl text-slate-300 mb-4 block"></i>
              <p className="font-semibold">No hay instalaciones registradas</p>
              <p className="text-sm text-slate-400 mt-1">Crea la primera instalación para empezar</p>
            </div>
          ) : (
            groupedInstalaciones.map(({ instalacion, campos }) => {
              const isExpanded = expandedInstalaciones.has(instalacion.id);
              return (
                <div key={instalacion.id} className="space-y-2">
                  {/* INSTALACION PRINCIPAL */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 hover:border-[var(--accent)] hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-black text-[var(--accent)] uppercase tracking-tighter">
                            {instalacion.nombre}
                          </h3>
                          {instalacion.tipo && (
                            <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[9px] font-black">
                              {instalacion.tipo}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          <i className="fa-solid fa-map-pin mr-2 text-slate-400"></i>
                          {getLocalidadNombre(instalacion.localidad_id)}
                        </p>
                        {instalacion.descripcion && (
                          <p className="text-[11px] text-slate-500 mt-2 italic">
                            {instalacion.descripcion}
                          </p>
                        )}
                        {getClubesNombres(instalacion.id).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {getClubesNombres(instalacion.id).map(nombre => (
                              <span
                                key={nombre}
                                className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[8px] font-black uppercase tracking-widest"
                              >
                                <i className="fa-solid fa-shield-halved mr-1 text-slate-400"></i>
                                {nombre}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {campos.length > 0 && (
                        <button
                          onClick={() => toggleInstalacionExpanded(instalacion.id)}
                          className={`px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${
                            isExpanded
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} mr-1`}></i>
                          Campos ({campos.length})
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          const clubsData = await instalacionesClubesService.getByInstalacion(instalacion.id);
                          const clubIds = clubsData.map(c => c.club_id);
                          setEditingInstalacion({
                            ...(instalacion as InstalacionCampoFormData),
                            clubes_ids: clubIds,
                          });
                        }}
                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-blue-200 transition-all"
                      >
                        <i className="fa-solid fa-pencil mr-1"></i>
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setAddingCampoToInstalacion(instalacion);
                          setIsAddingCampo(true);
                        }}
                        className="px-3 py-2 bg-green-100 text-green-700 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-green-200 transition-all"
                      >
                        <i className="fa-solid fa-plus mr-1"></i>
                        Campo
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Estás seguro de que deseas eliminar esta instalación?')) {
                            handleDeleteInstalacion(instalacion.id);
                          }
                        }}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-red-200 transition-all"
                      >
                        <i className="fa-solid fa-trash mr-1"></i>
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {/* CAMPOS (sub-items) - Hidden by default */}
                  {campos.length > 0 && isExpanded && (
                    <div className="ml-4 space-y-2 pl-4 border-l-2 border-slate-200">
                      {campos.map(campo => (
                        <div
                          key={campo.id}
                          className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-[var(--accent)] hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-semibold text-slate-700">
                                  {campo.nombre}
                                </p>
                                {campo.tipo && (
                                  <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 text-[8px] font-black">
                                    {campo.tipo}
                                  </span>
                                )}
                                <div className="flex gap-1 ml-1">
                                  <button
                                    onClick={async () => {
                                      const clubsData = await instalacionesClubesService.getByInstalacion(campo.id);
                                      const clubIds = clubsData.map(c => c.club_id);
                                      setEditingInstalacion({
                                        ...(campo as InstalacionCampoFormData),
                                        clubes_ids: clubIds,
                                      });
                                    }}
                                    className="px-2 py-1 text-xs bg-[var(--accent)] text-white rounded font-black hover:bg-[var(--accent-dark)] transition-all"
                                  >
                                    <i className="fa-solid fa-pencil"></i>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteInstalacion(campo.id)}
                                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded font-black hover:bg-red-200 transition-all"
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                              {getClubesNombres(campo.id).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {getClubesNombres(campo.id).map(nombre => (
                                    <span
                                      key={nombre}
                                      className="px-1.5 py-0.5 rounded bg-white text-slate-500 text-[8px] font-black uppercase tracking-widest border border-slate-200"
                                    >
                                      <i className="fa-solid fa-shield-halved mr-1 text-slate-400"></i>
                                      {nombre}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODALS */}
      <EditLocalidadModal
        localidad={editingLocalidad}
        isOpen={editingLocalidad !== null || isCreatingLocalidad || isCreatingLocalidadFromInstalacion}
        onClose={() => {
          setEditingLocalidad(null);
          setIsCreatingLocalidad(false);
          setIsCreatingLocalidadFromInstalacion(false);
        }}
        onSave={handleSaveLocalidad}
        onDelete={handleDeleteLocalidad}
      />

      <EditInstalacionModal
        instalacion={editingInstalacion}
        localidades={localidades}
        clubes={clubes}
        camposExistentes={
          editingInstalacion && (editingInstalacion as any).parent_instalacion_id
            ? instalaciones
                .filter(ic => ic.parent_instalacion_id === (editingInstalacion as any).parent_instalacion_id)
                .map(campo => ({ id: campo.id, nombre: campo.nombre, tipo: campo.tipo }))
            : []
        }
        isOpen={editingInstalacion !== null || isCreatingInstalacion}
        onClose={() => {
          setEditingInstalacion(null);
          setIsCreatingInstalacion(false);
        }}
        onSave={handleSaveInstalacion}
        onDelete={handleDeleteInstalacion}
        onCreateLocalidad={handleCreateLocalidad}
      />

      <AddCampoModal
        isOpen={isAddingCampo}
        onClose={() => {
          setIsAddingCampo(false);
          setAddingCampoToInstalacion(null);
        }}
        onSave={handleAddCampo}
      />
    </div>
  );
};

export default InstalacionesView;
