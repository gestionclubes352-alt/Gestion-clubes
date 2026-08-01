import React, { useState, useEffect } from 'react';
import * as injuryService from '../../../shared/services/injuryService';
import { db } from '../../../shared/services/dataService';
import { useTranslation } from 'react-i18next';
import type { Injury, InjurySeverity, InjuryStatus, BodyPart } from '../types';

const severityColor: Record<InjurySeverity, string> = {
  'LEVE': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  'MODERADA': 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  'GRAVE': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};

const statusColor: Record<InjuryStatus, string> = {
  'ACTIVA': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  'EN_REHABILITACIÓN': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  'RECUPERADO': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
};

const statusLabel: Record<InjuryStatus, string> = {
  'ACTIVA': 'Activa',
  'EN_REHABILITACIÓN': 'Rehabilitación',
  'RECUPERADO': 'Recuperado',
};

const InjuriesView: React.FC = () => {
  const { t } = useTranslation();
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [filter, setFilter] = useState<InjuryStatus | 'TODAS'>('TODAS');
  const [showModal, setShowModal] = useState(false);
  const [editInjury, setEditInjury] = useState<Injury | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await injuryService.getInjuries();
      setInjuries(data);
      setLoading(false);
    })();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que quieres borrar esta lesión?')) return;
    setLoading(true);
    await injuryService.deleteInjury(id);
    setInjuries(await injuryService.getInjuries());
    setLoading(false);
  };

  const handleSave = async (injury: Partial<Injury>) => {
    setLoading(true);
    if (editInjury) {
      await injuryService.updateInjury(editInjury.id, injury);
    } else {
      await injuryService.addInjury({ ...injury, status: 'ACTIVA', dateOccurred: new Date().toISOString() } as Injury);
    }
    setInjuries(await injuryService.getInjuries());
    setShowModal(false);
    setEditInjury(null);
    setLoading(false);
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const filtered = filter === 'TODAS' ? injuries : injuries.filter(i => i.status === filter);
  const activeCount = injuries.filter(i => i.status === 'ACTIVA').length;
  const rehabCount = injuries.filter(i => i.status === 'EN_REHABILITACIÓN').length;

  const getDaysRemaining = (date?: string) => {
    if (!date) return null;
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };


  // Botón global de pantalla completa
  const handleGlobalFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };


  // Modal para añadir/editar lesión (definición única, no exportada)
  interface InjuryModalProps {
    initial: Injury | null;
    onClose: () => void;
    onSave: (injury: Partial<Injury>) => void;
  }

  const InjuryModal: React.FC<InjuryModalProps> = ({ initial, onClose, onSave }) => {
    const { t } = useTranslation();
    const [form, setForm] = useState<Partial<Injury>>(initial || {});
    const [saving, setSaving] = useState(false);
    const [players, setPlayers] = useState<Array<{ id: string; nombre: string; apodo?: string; dorsal?: number; posicion?: string }>>([]);

    useEffect(() => {
      (async () => {
        const { data } = await db.players.get();
        if (data) setPlayers(data as any[]);
      })();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setForm(f => ({ ...f, [name]: value }));
    };

    const handlePlayerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = players.find(p => p.id === e.target.value);
      if (selected) {
        setForm(f => ({
          ...f,
          playerId: selected.id,
          playerName: selected.apodo || selected.nombre,
        }));
      } else {
        setForm(f => ({ ...f, playerId: '', playerName: '' }));
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      await onSave(form);
      setSaving(false);
    };

    return (
      <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto flex justify-center p-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg space-y-4 relative h-fit self-start mt-8">
          <button type="button" onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
          <h3 className="text-xl font-black text-[var(--accent)] mb-2">
            {initial ? t('medical.editInjury', 'Editar Lesión') : t('medical.newInjury', 'Nueva Lesión')}
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <select
              value={form.playerId || ''}
              onChange={handlePlayerSelect}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">{t('common.selectPlayer', 'Seleccionar jugador...')}</option>
              {players
                .slice()
                .sort((a, b) => (a.apodo || a.nombre).localeCompare(b.apodo || b.nombre))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.dorsal ? `${p.dorsal} - ` : ''}{p.apodo || p.nombre}{p.posicion ? ` (${p.posicion})` : ''}
                  </option>
                ))
              }
            </select>
            <select
              name="type"
              value={form.type || ''}
              onChange={handleChange}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">{t('medical.injuryType', 'Tipo de lesión...')}</option>
              <optgroup label="Musculares">
                <option value="Rotura muscular">Rotura muscular</option>
                <option value="Distensión muscular">Distensión muscular</option>
                <option value="Contractura">Contractura</option>
                <option value="Calambres">Calambres</option>
                <option value="Fatiga muscular">Fatiga muscular</option>
              </optgroup>
              <optgroup label="Ligamentosas">
                <option value="Esguince">Esguince</option>
                <option value="Rotura de ligamento">Rotura de ligamento</option>
                <option value="Rotura de LCA">Rotura de LCA</option>
                <option value="Rotura de LCP">Rotura de LCP</option>
              </optgroup>
              <optgroup label="Tendinosas">
                <option value="Tendinitis">Tendinitis</option>
                <option value="Rotura de tendón">Rotura de tendón</option>
                <option value="Rotura de Aquiles">Rotura de Aquiles</option>
                <option value="Tendinopatía">Tendinopatía</option>
              </optgroup>
              <optgroup label="Óseas">
                <option value="Fractura">Fractura</option>
                <option value="Fisura">Fisura</option>
                <option value="Periostitis">Periostitis</option>
              </optgroup>
              <optgroup label="Articulares">
                <option value="Luxación">Luxación</option>
                <option value="Subluxación">Subluxación</option>
                <option value="Lesión de menisco">Lesión de menisco</option>
                <option value="Bursitis">Bursitis</option>
              </optgroup>
              <optgroup label="Otras">
                <option value="Contusión">Contusión</option>
                <option value="Herida">Herida</option>
                <option value="Sobrecarga">Sobrecarga</option>
                <option value="Conmoción cerebral">Conmoción cerebral</option>
                <option value="Otro">Otro</option>
              </optgroup>
            </select>
            <select
              name="bodyPart"
              value={form.bodyPart || ''}
              onChange={handleChange}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">{t('medical.bodyPart', 'Zona del cuerpo...')}</option>
              <optgroup label="Cabeza y cuello">
                <option value="CABEZA">Cabeza</option>
                <option value="CUELLO">Cuello</option>
                <option value="CERVICAL">Cervical</option>
              </optgroup>
              <optgroup label="Tronco">
                <option value="HOMBRO">Hombro</option>
                <option value="CLAVÍCULA">Clavícula</option>
                <option value="COSTILLAS">Costillas</option>
                <option value="ESPALDA">Espalda</option>
                <option value="LUMBAR">Lumbar</option>
                <option value="ABDOMEN">Abdomen</option>
                <option value="PUBIS">Pubis</option>
              </optgroup>
              <optgroup label="Brazo">
                <option value="BRAZO">Brazo</option>
                <option value="CODO">Codo</option>
                <option value="ANTEBRAZO">Antebrazo</option>
                <option value="MUÑECA">Muñeca</option>
                <option value="MANO">Mano</option>
              </optgroup>
              <optgroup label="Cadera y muslo">
                <option value="CADERA">Cadera</option>
                <option value="GLÚTEO">Glúteo</option>
                <option value="INGLE">Ingle</option>
                <option value="ADUCTOR">Aductor</option>
                <option value="MUSLO">Muslo</option>
                <option value="CUÁDRICEPS">Cuádriceps</option>
                <option value="ISQUIOTIBIAL">Isquiotibial</option>
              </optgroup>
              <optgroup label="Rodilla">
                <option value="RODILLA">Rodilla</option>
                <option value="LIGAMENTO_CRUZADO">Ligamento cruzado</option>
                <option value="MENISCO">Menisco</option>
                <option value="RÓTULA">Rótula</option>
              </optgroup>
              <optgroup label="Pierna y pie">
                <option value="GEMELO">Gemelo</option>
                <option value="SÓLEO">Sóleo</option>
                <option value="TENDÓN_AQUILES">Tendón de Aquiles</option>
                <option value="TOBILLO">Tobillo</option>
                <option value="PIE">Pie</option>
                <option value="FASCIA_PLANTAR">Fascia plantar</option>
              </optgroup>
              <option value="OTRO">Otro</option>
            </select>
            <select
              name="severity"
              value={form.severity || ''}
              onChange={handleChange}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">{t('medical.severity', 'Gravedad')}</option>
              <option value="LEVE">Leve</option>
              <option value="MODERADA">Moderada</option>
              <option value="GRAVE">Grave</option>
            </select>
            <select
              name="status"
              value={form.status || ''}
              onChange={handleChange}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">{t('common.status', 'Estado')}</option>
              <option value="ACTIVA">Activa</option>
              <option value="EN_REHABILITACIÓN">En Rehabilitación</option>
              <option value="RECUPERADO">Recuperado</option>
            </select>
            <input
              name="estimatedReturn"
              type="date"
              value={form.estimatedReturn || ''}
              onChange={handleChange}
              className="border rounded-lg px-3 py-2 w-full"
            />
            <textarea
              name="notes"
              value={form.notes || ''}
              onChange={handleChange}
              placeholder={t('medical.notes', 'Notas')}
              className="border rounded-lg px-3 py-2 w-full"
              rows={2}
            />
          </div>
          <button type="submit" className="bg-[var(--accent)] text-white px-6 py-2 rounded-xl font-black w-full mt-4" disabled={saving}>
            {saving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
          </button>
        </form>
      </div>
    );
  };

  return (
    <>
      {/* Botón flotante pantalla completa global */}
      <button
        onClick={handleGlobalFullscreen}
        title="Pantalla completa web"
        style={{ position: 'fixed', top: 18, right: 18, zIndex: 9999, background: '#111', color: '#fff' }}
        className="p-3 rounded-full shadow-lg transition-colors hover:bg-black hover:text-white"
      >
        <i className="fa-solid fa-up-right-and-down-left-from-center"></i>
      </button>
      <div ref={containerRef} className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                {t('medical.injuries', 'Lesiones')}
              </h2>
              <button
                title="Pantalla completa"
                onClick={handleFullscreen}
                className="ml-2 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 dark:text-white transition-colors"
                style={{ lineHeight: 0 }}
              >
                <i className="fa-solid fa-up-right-and-down-left-from-center"></i>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">{t('medical.injuriesDesc', 'Registro y seguimiento de lesiones del equipo')}</p>
          </div>
          <button className="bg-[var(--accent)] text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2.5 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all" onClick={() => { setShowModal(true); setEditInjury(null); }}>
            <i className="fa-solid fa-plus"></i> {t('medical.newInjury', 'Nueva Lesión')}
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t('medical.totalInjuries', 'Total'), value: injuries.length, icon: 'fa-band-aid', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-white/5' },
            { label: t('medical.activeInjuries', 'Activas'), value: activeCount, icon: 'fa-triangle-exclamation', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
            { label: t('medical.inRehab', 'En Rehabilitación'), value: rehabCount, icon: 'fa-heart-pulse', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
            { label: t('medical.recovered', 'Recuperados'), value: injuries.length - activeCount - rehabCount, icon: 'fa-check-circle', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          ].map((kpi, i) => (
            <div key={i} className={`${kpi.bg} rounded-2xl p-4 flex items-center gap-4`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                <i className={`fa-solid ${kpi.icon} ${kpi.color} text-lg`}></i>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{kpi.value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['TODAS', 'ACTIVA', 'EN_REHABILITACIÓN', 'RECUPERADO'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                filter === f
                  ? 'bg-[var(--accent)] text-white shadow-lg'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {f === 'TODAS' ? t('common.all', 'Todas') : statusLabel[f]}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.name', 'Jugador')}</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('medical.injuryType', 'Lesión')}</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('medical.bodyPart', 'Zona')}</th>
                  <th className="text-center px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('medical.severity', 'Gravedad')}</th>
                  <th className="text-center px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.status', 'Estado')}</th>
                  <th className="text-center px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('medical.returnDate', 'Vuelta est.')}</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(injury => {
                  const daysLeft = getDaysRemaining(injury.estimatedReturn);
                  return (
                    <tr key={injury.id} className="border-b border-slate-50 dark:border-white/3 hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-slate-500">
                            {injury.playerName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-white text-[13px]">{injury.playerName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300 text-[13px]">{injury.type}</td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300 text-[13px]">
                        {injury.bodyPart.charAt(0) + injury.bodyPart.slice(1).toLowerCase()} {injury.side ? `(${injury.side.charAt(0) + injury.side.slice(1).toLowerCase()})` : ''}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${severityColor[injury.severity]}`}>
                          {injury.severity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor[injury.status]}`}>
                          {statusLabel[injury.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {injury.status === 'RECUPERADO' ? (
                          <span className="text-emerald-500 text-xs font-bold"><i className="fa-solid fa-check mr-1"></i>Alta</span>
                        ) : daysLeft !== null ? (
                          <span className={`text-xs font-bold ${daysLeft <= 7 ? 'text-emerald-500' : daysLeft <= 14 ? 'text-amber-500' : 'text-red-500'}`}>
                            {daysLeft}d
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button className="text-blue-500 hover:underline mr-2" onClick={e => { e.stopPropagation(); setEditInjury(injury); setShowModal(true); }}>Editar</button>
                        <button className="text-red-500 hover:underline" onClick={e => { e.stopPropagation(); handleDelete(injury.id); }}>Borrar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {showModal && (
          <InjuryModal
            initial={editInjury}
            onClose={() => { setShowModal(false); setEditInjury(null); }}
            onSave={handleSave}
          />
        )}

        {loading && <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"><div className="bg-white p-8 rounded-xl shadow-xl">Cargando...</div></div>}
      </div>
    </>
  );
}

export default InjuriesView;
