import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { equiposRivalesService } from '@shared/services/dataService';
import { uploadRivalTeamLogo } from '@shared/services/photoService';
import type { RivalTeam } from '../types';
import RivalRosterView from './RivalRosterView';

interface EquiposRivalesViewProps {
  clubId: string;
}

const isImageUrl = (value?: string): boolean => !!value && /^(https?:\/\/|data:image\/|\/)/i.test(value);

const emptyTeam = (clubId: string): RivalTeam => ({
  id: '',
  club_id: clubId,
  nombre: '',
  escudo_url: '',
  competicion: '',
  temporada: '',
  notas: '',
});

const EquiposRivalesView: React.FC<EquiposRivalesViewProps> = ({ clubId }) => {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<RivalTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<RivalTeam | null>(null);
  const [editingTeam, setEditingTeam] = useState<RivalTeam | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const rows = clubId ? await equiposRivalesService.list({ club_id: clubId }) : await equiposRivalesService.list();
      setTeams(rows.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
    } catch (err) {
      console.error('No se pudieron cargar los equipos rivales', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const handleSaveTeam = async () => {
    if (!editingTeam || !editingTeam.nombre.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        club_id: clubId || undefined,
        nombre: editingTeam.nombre.trim(),
        competicion: editingTeam.competicion || undefined,
        temporada: editingTeam.temporada || undefined,
        notas: editingTeam.notas || undefined,
      };

      let saved: RivalTeam;
      if (editingTeam.id) {
        saved = await equiposRivalesService.update(editingTeam.id, payload);
      } else {
        saved = await equiposRivalesService.create(payload);
      }

      if (logoFile) {
        const escudoUrl = await uploadRivalTeamLogo(logoFile, saved.id, clubId || saved.id);
        saved = await equiposRivalesService.update(saved.id, { escudo_url: escudoUrl });
      }

      setEditingTeam(null);
      setLogoFile(null);
      await loadTeams();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar el equipo rival');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTeam = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('rivalTeams.confirmDeleteTeam'))) return;
    try {
      await equiposRivalesService.remove(id);
      await loadTeams();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar el equipo rival');
    }
  };

  if (selectedTeam) {
    return (
      <RivalRosterView
        team={selectedTeam}
        clubId={clubId}
        onBack={() => setSelectedTeam(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter">
          {t('sidebar.rivalTeamsLabel')}
        </h2>
        <button
          onClick={() => setEditingTeam(emptyTeam(clubId))}
          className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-[var(--accent)]/30"
        >
          <i className="fa-solid fa-plus text-[10px]"></i>
          {t('rivalTeams.addTeam')}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {teams.map(team => (
          <div
            key={team.id}
            onClick={() => setSelectedTeam(team)}
            className="group relative bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-[var(--surface-3)] transition-all cursor-pointer flex flex-col items-center text-center gap-2"
          >
            <button
              onClick={e => handleDeleteTeam(team.id, e)}
              className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
              title={t('common.delete')}
            >
              <i className="fa-regular fa-trash-can text-xs"></i>
            </button>
            <button
              onClick={e => { e.stopPropagation(); setEditingTeam(team); setLogoFile(null); }}
              className="absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-1)] opacity-0 group-hover:opacity-100 transition-opacity"
              title={t('playerTable.editCard')}
            >
              <i className="fa-regular fa-pen-to-square text-xs"></i>
            </button>
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--surface-1)] border border-[var(--border-soft)] flex items-center justify-center mt-2">
              {isImageUrl(team.escudo_url) ? (
                <img src={team.escudo_url} className="w-full h-full object-contain" />
              ) : (
                <i className="fa-solid fa-shield-halved text-2xl text-[var(--text-muted)]"></i>
              )}
            </div>
            <h3 className="text-sm font-black text-[var(--text-strong)] uppercase tracking-tight truncate w-full">{team.nombre}</h3>
            <p className="text-[10px] text-[var(--text-muted)] truncate w-full">
              {[team.competicion, team.temporada].filter(Boolean).join(' · ') || t('rivalTeams.noDetails')}
            </p>
          </div>
        ))}
        {!loading && teams.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-soft)] flex items-center justify-center mx-auto mb-3">
              <i className="fa-solid fa-user-secret text-xl text-[var(--text-muted)]"></i>
            </div>
            <p className="text-sm text-[var(--text-muted)]">{t('rivalTeams.noTeams')}</p>
          </div>
        )}
      </div>

      {editingTeam && (
        <div className="fixed inset-0 bg-black/50 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-fade-in text-slate-800 w-full max-w-md">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-[var(--accent)] font-black text-lg uppercase tracking-tighter">
                {editingTeam.id ? t('rivalTeams.editTeam') : t('rivalTeams.addTeam')}
              </h3>
              <button onClick={() => { setEditingTeam(null); setLogoFile(null); }} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                  {logoFile ? (
                    <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-contain" />
                  ) : isImageUrl(editingTeam.escudo_url) ? (
                    <img src={editingTeam.escudo_url} className="w-full h-full object-contain" />
                  ) : (
                    <i className="fa-solid fa-shield-halved text-slate-300 text-xl"></i>
                  )}
                </div>
                <label className="flex-1 cursor-pointer">
                  <span className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors">
                    <i className="fa-solid fa-camera text-[10px]"></i>
                    {t('rivalTeams.uploadLogo')}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('playerTable.name', 'Nombre')}</label>
                <input
                  type="text"
                  value={editingTeam.nombre}
                  onChange={e => setEditingTeam(prev => prev && { ...prev, nombre: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('playerTable.competition', 'Competición')}</label>
                  <input
                    type="text"
                    value={editingTeam.competicion || ''}
                    onChange={e => setEditingTeam(prev => prev && { ...prev, competicion: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('rivalTeams.season', 'Temporada')}</label>
                  <input
                    type="text"
                    value={editingTeam.temporada || ''}
                    onChange={e => setEditingTeam(prev => prev && { ...prev, temporada: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    placeholder="25/26"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('rivalTeams.notes', 'Notas')}</label>
                <textarea
                  value={editingTeam.notas || ''}
                  onChange={e => setEditingTeam(prev => prev && { ...prev, notas: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none h-20"
                />
              </div>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => { setEditingTeam(null); setLogoFile(null); }}
                disabled={isSaving}
                className="py-2.5 px-5 border border-slate-200 rounded-xl font-black text-slate-600 bg-white hover:bg-slate-50 uppercase text-xs tracking-widest disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveTeam}
                disabled={isSaving || !editingTeam.nombre.trim()}
                className="py-2.5 px-5 bg-[var(--accent)] text-white rounded-xl font-black hover:bg-[var(--accent-dark)] uppercase text-xs tracking-widest disabled:opacity-50"
              >
                {isSaving ? <i className="fa-solid fa-spinner animate-spin"></i> : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquiposRivalesView;
