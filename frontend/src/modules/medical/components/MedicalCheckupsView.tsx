import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { MedicalCheckup, CheckupStatus, CheckupType } from '../types';
import { db } from '../../../shared/services/dataService';

const statusConfig: Record<CheckupStatus, { label: string; color: string; icon: string }> = {
  'PENDIENTE': { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400', icon: 'fa-clock' },
  'COMPLETADO': { label: 'Completado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', icon: 'fa-check' },
  'VENCIDO': { label: 'Vencido', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', icon: 'fa-exclamation' },
};

const typeLabel: Record<CheckupType, string> = {
  'PRETEMPORADA': 'Pretemporada',
  'PERIÓDICO': 'Periódico',
  'POST_LESIÓN': 'Post-lesión',
  'RETORNO': 'Retorno',
};

const MedicalCheckupsView: React.FC = () => {
  const { t } = useTranslation();
  const [checkups, setCheckups] = useState<MedicalCheckup[]>([]);
  const [filter, setFilter] = useState<CheckupStatus | 'TODOS'>('TODOS');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await db.medical_checkups.get();
      setCheckups((data || []) as MedicalCheckup[]);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'TODOS' ? checkups : checkups.filter(c => c.status === filter);
  const pendingCount = checkups.filter(c => c.status === 'PENDIENTE').length;
  const overdueCount = checkups.filter(c => c.status === 'VENCIDO').length;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
            {t('medical.checkups', 'Reconocimientos')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t('medical.checkupsDesc', 'Revisiones médicas programadas')}</p>
        </div>
        <button className="bg-[var(--accent)] text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2.5 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all">
          <i className="fa-solid fa-plus"></i> {t('medical.newCheckup', 'Programar')}
        </button>
      </div>

      {/* Alert banner */}
      {overdueCount > 0 && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
          </div>
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-400">
              {overdueCount} {t('medical.overdueCheckups', 'reconocimiento(s) vencido(s)')}
            </p>
            <p className="text-xs text-red-500/80 mt-0.5">{t('medical.overdueWarning', 'Programa las citas lo antes posible')}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(['TODOS', 'PENDIENTE', 'COMPLETADO', 'VENCIDO'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
              filter === f
                ? 'bg-[var(--accent)] text-white shadow-lg'
                : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            {f === 'TODOS' ? t('common.all', 'Todos') : statusConfig[f].label}
            {f === 'PENDIENTE' && pendingCount > 0 && (
              <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(checkup => {
          const cfg = statusConfig[checkup.status];
          return (
            <div key={checkup.id} className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-slate-500">
                    {checkup.playerName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white text-[13px]">{checkup.playerName}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{typeLabel[checkup.type]}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${cfg.color}`}>
                  <i className={`fa-solid ${cfg.icon} text-[8px]`}></i>{cfg.label}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <i className="fa-solid fa-calendar text-[10px] text-slate-300"></i>
                  <span>{formatDate(checkup.scheduledDate)}</span>
                </div>
                {checkup.doctor && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <i className="fa-solid fa-user-doctor text-[10px] text-slate-300"></i>
                    <span>{checkup.doctor}</span>
                  </div>
                )}
                {checkup.result && (
                  <div className="flex items-center gap-2 text-xs text-emerald-500 font-semibold">
                    <i className="fa-solid fa-check-circle text-[10px]"></i>
                    <span>{checkup.result}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MedicalCheckupsView;
