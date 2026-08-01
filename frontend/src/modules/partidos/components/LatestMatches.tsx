import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Match } from '../types';
import { getTeamConfig } from '@shared/services/dataService';

const getMyTeamName = (): string => {
  try { return getTeamConfig()?.teamName || ''; } catch { return ''; }
};

const isMyTeam = (name: string): boolean => {
  const my = getMyTeamName();
  if (!my) return false;
  return name.toLowerCase().includes(my.toLowerCase());
};

interface LatestMatchesProps {
  matches: Match[];
  onSave: (match: Match) => Promise<void>;
  onDelete: (id: number | string) => Promise<void>;
  onEdit?: (match: Match) => void;
  onClickMatch?: (match: Match) => void;
  onCreate?: () => void;
}

const LatestMatches: React.FC<LatestMatchesProps> = ({ matches, onSave, onDelete, onEdit, onClickMatch, onCreate }) => {
  const { t } = useTranslation();
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tighter">{t('matchesList.matchHistory')}</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('matchesList.matchHistoryDesc')}</p>
        </div>
        <button 
          onClick={onCreate}
          className="bg-sport-primary hover:bg-sport-primary-dark text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl"
        >
          <i className="fa-solid fa-plus"></i>
          {t('matchesList.newMatch')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {matches.map((match) => {
          const local = match.localTeam || 'DEMO';
          const visitor = match.visitorTeam || 'Rival';
          
          return (
            <div 
              key={match.id} 
              onClick={() => onClickMatch && onClickMatch(match)}
              className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all border border-slate-100 flex items-center justify-between group relative overflow-hidden cursor-pointer hover:border-red-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {match.jornada || match.competition}
                  </span>
                  <span className="text-slate-300 text-[10px] font-bold">
                    {new Date(match.date).toLocaleDateString()} {match.time ? `• ${match.time}h` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center min-w-[100px]">
                    <p className={`font-black text-lg uppercase leading-none mb-1 truncate max-w-[120px] ${isMyTeam(local) ? 'text-[var(--accent)]' : 'text-slate-600'}`}>
                      {local}
                    </p>
                    <p className="text-[8px] font-black text-black tracking-[0.3em] uppercase">{t('matchesList.home')}</p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    {match.status === 'Finished' ? (
                      <div className="bg-[var(--accent)] text-white font-black text-2xl px-6 py-2 rounded-2xl shadow-lg shadow-[var(--accent)]/20">
                        {match.score}
                      </div>
                    ) : (
                      <div className="bg-slate-50 text-slate-400 font-black px-6 py-2 rounded-2xl border border-slate-100">
                        VS
                      </div>
                    )}
                  </div>

                  <div className="text-center min-w-[100px]">
                    <p className={`font-black text-lg uppercase leading-none mb-1 truncate max-w-[120px] ${isMyTeam(visitor) ? 'text-[var(--accent)]' : 'text-slate-600'}`}>
                      {visitor}
                    </p>
                    <p className="text-[8px] font-black text-black tracking-[0.3em] uppercase">{t('matchesList.away')}</p>
                  </div>
                </div>
              </div>
              
              <div className="ml-8 flex flex-col items-end gap-3 relative z-10">
                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                  match.status === 'Finished' ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-600 animate-pulse'
                }`}>
                  {match.status}
                </span>
                <div className="flex gap-2">
                   <button 
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEdit && onEdit(match);
                    }}
                    className="w-10 h-10 bg-white border border-slate-100 text-slate-300 hover:text-red-500 rounded-xl transition-all flex items-center justify-center shadow-sm"
                    title={t('matchesList.editViaEvents')}
                   >
                     <i className="fa-regular fa-pen-to-square text-sm"></i>
                   </button>
                   <button 
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(String(match.id));
                    }}
                    className="w-10 h-10 bg-white border border-slate-100 text-slate-300 hover:text-red-500 rounded-xl transition-all flex items-center justify-center shadow-sm"
                    title={t('matchesList.deleteEvent')}
                   >
                     <i className="fa-regular fa-trash-can text-sm"></i>
                   </button>
                </div>
              </div>
            </div>
          );
        })}

        {matches.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center opacity-40">
            <i className="fa-solid fa-calendar-xmark text-4xl mb-4 text-slate-300"></i>
            <p className="font-black text-sm uppercase tracking-widest text-slate-400">{t('matchesList.noMatches')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LatestMatches;
