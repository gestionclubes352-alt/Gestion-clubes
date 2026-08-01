import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../../shared/services/dataService';
import type { FitnessProfile } from '../data';

const FitnessView: React.FC = () => {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<FitnessProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await db.fitness_profiles.get();
      setProfiles((data || []) as FitnessProfile[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
            {t('medical.fitness', 'Rendimiento Físico')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t('medical.fitnessDesc', 'Tests físicos y datos de condición deportiva')}</p>
        </div>
        <button className="bg-[var(--accent)] text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2.5 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all">
          <i className="fa-solid fa-plus"></i> {t('medical.newTest', 'Nuevo Test')}
        </button>
      </div>

      {/* Player grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {profiles.map(profile => (
          <div
            key={profile.playerId}
            onClick={() => setSelectedProfile(selectedProfile === profile.playerId ? null : profile.playerId)}
            className={`bg-white dark:bg-white/[0.02] border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md ${
              selectedProfile === profile.playerId
                ? 'border-[var(--accent)] shadow-lg shadow-[var(--accent)]/10'
                : 'border-slate-200 dark:border-white/5'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-slate-500">
                {profile.playerName.split(' ').map(n => n[0]).join('')}
              </div>
              <p className="font-bold text-slate-800 dark:text-white text-[13px]">{profile.playerName}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-slate-800 dark:text-white">{profile.weight}<span className="text-xs font-normal text-slate-400 ml-0.5">kg</span></p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('medical.weight', 'Peso')}</p>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-slate-800 dark:text-white">{profile.bodyFat}<span className="text-xs font-normal text-slate-400 ml-0.5">%</span></p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('medical.bodyFat', 'Grasa')}</p>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-slate-800 dark:text-white">{profile.height}<span className="text-xs font-normal text-slate-400 ml-0.5">cm</span></p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('medical.height', 'Altura')}</p>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-slate-800 dark:text-white">{profile.vo2max}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">VO₂max</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected player detail */}
      {selectedProfile && (() => {
        const profile = profiles.find(p => p.playerId === selectedProfile);
        if (!profile) return null;
        return (
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5">
              <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">
                {t('medical.testResults', 'Resultados de Tests')} — {profile.playerName}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('medical.testType', 'Test')}</th>
                    <th className="text-center px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('medical.result', 'Resultado')}</th>
                    <th className="text-center px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.date', 'Fecha')}</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.notes', 'Notas')}</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.tests.map(test => (
                    <tr key={test.id} className="border-b border-slate-50 dark:border-white/[0.03]">
                      <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-200 text-[13px]">{test.type}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-black text-slate-800 dark:text-white">{test.value}</span>
                        <span className="text-xs text-slate-400 ml-1">{test.unit}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs text-slate-500">{new Date(test.date).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">{test.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default FitnessView;
