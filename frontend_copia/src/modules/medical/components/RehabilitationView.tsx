import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { RehabProgram, RehabPhase } from '../types';
import { db } from '../../../shared/services/dataService';

const phaseConfig: Record<RehabPhase, { label: string; color: string }> = {
  'FASE_1': { label: 'Fase 1 — Inicial', color: 'text-red-500' },
  'FASE_2': { label: 'Fase 2 — Intermedia', color: 'text-amber-500' },
  'FASE_3': { label: 'Fase 3 — Avanzada', color: 'text-blue-500' },
  'ALTA': { label: 'Alta Deportiva', color: 'text-emerald-500' },
};

const RehabilitationView: React.FC = () => {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<RehabProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await db.rehab_programs.get();
      setPrograms((data || []) as RehabProgram[]);
      setLoading(false);
    })();
  }, []);

  const getDaysRemaining = (date?: string) => {
    if (!date) return null;
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
            {t('medical.rehabilitation', 'Rehabilitación')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t('medical.rehabDesc', 'Programas de recuperación activos')}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-4">
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-heart-pulse text-blue-500 text-lg"></i>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{programs.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('medical.activePrograms', 'Programas activos')}</p>
          </div>
        </div>
      </div>

      {/* Program cards */}
      <div className="space-y-5">
        {programs.map(program => {
          const phase = phaseConfig[program.phase];
          const daysLeft = getDaysRemaining(program.estimatedEndDate);
          return (
            <div key={program.id} className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden hover:shadow-md transition-all">
              {/* Header */}
              <div className="px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-sm font-bold text-slate-500">
                    {program.playerName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 dark:text-white text-base">{program.playerName}</p>
                    <p className={`text-xs font-bold ${phase.color}`}>{phase.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {daysLeft !== null && (
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-800 dark:text-white">{daysLeft}d</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('medical.remaining', 'restantes')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-6 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('medical.progress', 'Progreso')}</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white">{program.progressPercent}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] transition-all duration-500"
                    style={{ width: `${program.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Exercises */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t('medical.exercises', 'Ejercicios')}</p>
                <div className="flex flex-wrap gap-2">
                  {program.exercises.map((ex, i) => (
                    <span key={i} className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[11px] font-medium px-3 py-1.5 rounded-lg">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {program.physiotherapistNotes && (
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/[0.01] border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-start gap-3">
                    <i className="fa-solid fa-comment-medical text-slate-300 text-sm mt-0.5"></i>
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">{program.physiotherapistNotes}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RehabilitationView;
