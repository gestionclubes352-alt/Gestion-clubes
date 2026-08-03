import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { jugadoresRivalesService } from '@shared/services/dataService';
import { uploadRivalPlayerPhoto } from '@shared/services/photoService';
import { RIVAL_POSITIONS, type RivalPlayer, type RivalTeam } from '../types';
import RivalBulkPhotoUpload from './RivalBulkPhotoUpload';

interface RivalRosterViewProps {
  team: RivalTeam;
  clubId: string;
  onBack: () => void;
}

const isImageUrl = (value?: string): boolean => !!value && /^(https?:\/\/|data:image\/|\/)/i.test(value);

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const emptyPlayer = (equipoRivalId: string): RivalPlayer => ({
  id: '',
  equipo_rival_id: equipoRivalId,
  nombre: '',
  dorsal: undefined,
  posicion: 'Defensa',
  foto_url: '',
  anio_nacimiento: undefined,
});

const RivalRosterView: React.FC<RivalRosterViewProps> = ({ team, clubId, onBack }) => {
  const { t } = useTranslation();
  const [players, setPlayers] = useState<RivalPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<RivalPlayer | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const rows = await jugadoresRivalesService.list({ equipo_rival_id: team.id });
      setPlayers(rows.sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999)));
    } catch (err) {
      console.error('No se pudo cargar la plantilla rival', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id]);

  const sortedPlayers = useMemo(() => players, [players]);

  const handleSavePlayer = async () => {
    if (!editingPlayer || !editingPlayer.nombre.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        equipo_rival_id: team.id,
        nombre: editingPlayer.nombre.trim(),
        dorsal: editingPlayer.dorsal || undefined,
        posicion: editingPlayer.posicion || undefined,
        anio_nacimiento: editingPlayer.anio_nacimiento || undefined,
      };

      let saved: RivalPlayer;
      if (editingPlayer.id) {
        saved = await jugadoresRivalesService.update(editingPlayer.id, payload);
      } else {
        saved = await jugadoresRivalesService.create(payload);
      }

      if (photoFile) {
        const fotoUrl = await uploadRivalPlayerPhoto(photoFile, saved.id, clubId);
        saved = await jugadoresRivalesService.update(saved.id, { foto_url: fotoUrl });
      }

      setEditingPlayer(null);
      setPhotoFile(null);
      await loadPlayers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar el jugador rival');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (!window.confirm(t('rivalTeams.confirmDeletePlayer'))) return;
    try {
      await jugadoresRivalesService.remove(id);
      await loadPlayers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar el jugador rival');
    }
  };

  const handleBulkUploaded = async (playerId: string, fotoUrl: string) => {
    await jugadoresRivalesService.update(playerId, { foto_url: fotoUrl });
    setPlayers(prev => prev.map(p => (String(p.id) === String(playerId) ? { ...p, foto_url: fotoUrl } : p)));
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-[var(--surface-1)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-sm"></i>
        </button>
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-[var(--surface-1)] border border-[var(--border-soft)] flex items-center justify-center shrink-0">
          {isImageUrl(team.escudo_url) ? (
            <img src={team.escudo_url} className="w-full h-full object-contain" />
          ) : (
            <i className="fa-solid fa-shield-halved text-[var(--text-muted)]"></i>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-[var(--text-strong)] uppercase tracking-tight truncate">{team.nombre}</h2>
          <p className="text-xs text-[var(--text-muted)]">
            {[team.competicion, team.temporada].filter(Boolean).join(' · ') || t('rivalTeams.noDetails')}
          </p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowBulkUpload(true)}
          className="inline-flex items-center gap-2 bg-[var(--surface-0)] border border-[var(--border-soft)] hover:border-[var(--surface-3)] text-[var(--text)] px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
        >
          <i className="fa-solid fa-images text-[10px]"></i>
          {t('bulkPhotoUpload.button')}
        </button>
        <button
          onClick={() => setEditingPlayer(emptyPlayer(team.id))}
          className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-[var(--accent)]/30"
        >
          <i className="fa-solid fa-plus text-[10px]"></i>
          {t('rivalTeams.addPlayer')}
        </button>
      </div>

      <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-soft)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              <th className="text-left px-4 py-3 w-16">{t('playerTable.dorsal', 'Dorsal')}</th>
              <th className="text-left px-4 py-3 w-16">{t('playerTable.photo', 'Foto')}</th>
              <th className="text-left px-4 py-3">{t('playerTable.name', 'Nombre')}</th>
              <th className="text-left px-4 py-3">{t('common.position')}</th>
              <th className="text-right px-4 py-3 w-24">{t('common.actions', 'Acciones')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map(player => (
              <tr key={player.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--surface-1)] transition-colors">
                <td className="px-4 py-2.5">
                  <span className="bg-slate-900 text-white font-semibold px-2 py-0.5 rounded-md text-[11px] min-w-7 inline-block text-center tabular-nums">
                    {player.dorsal ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-1)] flex items-center justify-center text-[var(--text-muted)] font-semibold text-xs">
                    {isImageUrl(player.foto_url) ? (
                      <img src={player.foto_url} className="w-full h-full object-cover object-top" />
                    ) : (
                      <span>{getInitials(player.nombre)}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 font-semibold text-[var(--text)]">{player.nombre}</td>
                <td className="px-4 py-2.5 text-[var(--text-muted)]">{player.posicion || '—'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setEditingPlayer(player)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-1)] transition-colors"
                      title={t('playerTable.editCard')}
                    >
                      <i className="fa-regular fa-pen-to-square text-xs"></i>
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(player.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                      title={t('common.delete')}
                    >
                      <i className="fa-regular fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && sortedPlayers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[var(--text-muted)] text-sm">
                  {t('rivalTeams.noPlayers')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingPlayer && (
        <div className="fixed inset-0 bg-black/50 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-fade-in text-slate-800 w-full max-w-md">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-[var(--accent)] font-black text-lg uppercase tracking-tighter">
                {editingPlayer.id ? t('rivalTeams.editPlayer') : t('rivalTeams.addPlayer')}
              </h3>
              <button onClick={() => { setEditingPlayer(null); setPhotoFile(null); }} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                  {photoFile ? (
                    <img src={URL.createObjectURL(photoFile)} className="w-full h-full object-cover" />
                  ) : isImageUrl(editingPlayer.foto_url) ? (
                    <img src={editingPlayer.foto_url} className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-user text-slate-300 text-xl"></i>
                  )}
                </div>
                <label className="flex-1 cursor-pointer">
                  <span className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors">
                    <i className="fa-solid fa-camera text-[10px]"></i>
                    {t('rivalTeams.uploadPhoto')}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('playerTable.dorsal', 'Dorsal')}</label>
                  <input
                    type="number"
                    value={editingPlayer.dorsal ?? ''}
                    onChange={e => setEditingPlayer(prev => prev && { ...prev, dorsal: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('playerTable.birthDate', 'Año nacimiento')}</label>
                  <input
                    type="number"
                    value={editingPlayer.anio_nacimiento ?? ''}
                    onChange={e => setEditingPlayer(prev => prev && { ...prev, anio_nacimiento: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('playerTable.name', 'Nombre')}</label>
                <input
                  type="text"
                  value={editingPlayer.nombre}
                  onChange={e => setEditingPlayer(prev => prev && { ...prev, nombre: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('common.position')}</label>
                <select
                  value={editingPlayer.posicion || ''}
                  onChange={e => setEditingPlayer(prev => prev && { ...prev, posicion: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {RIVAL_POSITIONS.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => { setEditingPlayer(null); setPhotoFile(null); }}
                disabled={isSaving}
                className="py-2.5 px-5 border border-slate-200 rounded-xl font-black text-slate-600 bg-white hover:bg-slate-50 uppercase text-xs tracking-widest disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSavePlayer}
                disabled={isSaving || !editingPlayer.nombre.trim()}
                className="py-2.5 px-5 bg-[var(--accent)] text-white rounded-xl font-black hover:bg-[var(--accent-dark)] uppercase text-xs tracking-widest disabled:opacity-50"
              >
                {isSaving ? <i className="fa-solid fa-spinner animate-spin"></i> : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <RivalBulkPhotoUpload
          players={players}
          clubId={clubId}
          onClose={() => setShowBulkUpload(false)}
          onUploaded={handleBulkUploaded}
        />
      )}
    </div>
  );
};

export default RivalRosterView;
