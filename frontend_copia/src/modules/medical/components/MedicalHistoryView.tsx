import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { MedicalRecord } from '../types';
import { db } from '../../../shared/services/dataService';

const MedicalHistoryView: React.FC = () => {
  const { t } = useTranslation();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await db.medical_records.get();
      setRecords((data || []) as MedicalRecord[]);
      setLoading(false);
    })();
  }, []);

  const filtered = records.filter(r => r.playerName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
            {t('medical.medicalHistory', 'Historial Médico')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t('medical.medicalHistoryDesc', 'Fichas médicas de cada jugador')}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
        <input
          type="text"
          placeholder={t('common.search', 'Buscar jugador...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-white/10 rounded-2xl text-sm bg-white dark:bg-white/5 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all"
        />
      </div>

      {/* Cards */}
      <div className="grid gap-4">
        {filtered.map(record => (
          <div
            key={record.id}
            className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden transition-all hover:shadow-md"
          >
            <div
              onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
              className="flex items-center justify-between px-5 py-4 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-sm font-bold text-slate-500">
                  {record.playerName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-[14px]">{record.playerName}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {record.bloodType && (
                      <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">
                        <i className="fa-solid fa-droplet mr-1"></i>{record.bloodType}
                      </span>
                    )}
                    {record.allergies.length > 0 && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <i className="fa-solid fa-exclamation-triangle mr-1"></i>{record.allergies.length} {t('medical.allergies', 'alergia(s)')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <i className={`fa-solid fa-chevron-down text-xs text-slate-300 transition-transform duration-200 ${expandedId === record.id ? 'rotate-180' : ''}`}></i>
            </div>
            
            {expandedId === record.id && (
              <div className="px-5 pb-5 pt-0 border-t border-slate-100 dark:border-white/5 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('medical.bloodType', 'Grupo Sanguíneo')}</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{record.bloodType || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('medical.allergies', 'Alergias')}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{record.allergies.length > 0 ? record.allergies.join(', ') : t('medical.none', 'Ninguna')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('medical.medications', 'Medicación')}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{record.medications.length > 0 ? record.medications.join(', ') : t('medical.none', 'Ninguna')}</p>
                  </div>
                </div>
                {record.notes && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('common.notes', 'Notas')}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{record.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MedicalHistoryView;
