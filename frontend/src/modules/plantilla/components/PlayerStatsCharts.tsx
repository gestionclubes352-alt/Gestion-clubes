import React from 'react';
import { useTranslation } from 'react-i18next';

interface PlayerStatsChartsProps {
  partidosJugados?: number;
  minutos?: number;
  titular?: number;
  goles?: number;
}

const MINUTES_PER_MATCH = 90;

const PlayerStatsCharts: React.FC<PlayerStatsChartsProps> = ({ partidosJugados = 0, minutos = 0, titular = 0, goles = 0 }) => {
  const { t } = useTranslation();

  const partidos = Math.max(0, partidosJugados || 0);
  const minutosJugados = Math.max(0, minutos || 0);
  const titulares = Math.max(0, Math.min(titular || 0, partidos));
  const suplente = Math.max(0, partidos - titulares);

  const minutosPosibles = partidos * MINUTES_PER_MATCH;
  const minutosPct = minutosPosibles > 0 ? Math.min(100, Math.round((minutosJugados / minutosPosibles) * 100)) : 0;
  const minPorPartido = partidos > 0 ? Math.round(minutosJugados / partidos) : 0;

  const titularPct = partidos > 0 ? (titulares / partidos) * 100 : 0;
  const suplentePct = partidos > 0 ? (suplente / partidos) * 100 : 0;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
        <i className="fa-solid fa-chart-simple mr-1"></i>
        {t('editPlayer.statsTitle', 'Estadísticas de participación')}
      </span>

      {partidos === 0 ? (
        <p className="text-xs font-bold text-slate-400 text-center py-2">{t('editPlayer.noMatchData', 'Sin datos de partidos')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Minutos jugados vs minutos posibles */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('editPlayer.minutes')}</span>
              <span className="text-xs font-black text-[var(--accent)]">
                {minutosJugados} <span className="text-slate-400 font-semibold">/ {minutosPosibles} min</span>
              </span>
            </div>
            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all"
                style={{ width: `${minutosPct}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] font-bold text-slate-400">
              {minutosPct}% {t('editPlayer.ofPossibleMinutes', 'de los minutos posibles')} · {minPorPartido} {t('editPlayer.minPerMatch', 'min/partido')}
            </div>
          </div>

          {/* Titular vs Suplente */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('editPlayer.starterRate', 'Titularidad')}</span>
              <span className="text-xs font-black text-slate-600">{titulares}/{partidos}</span>
            </div>
            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
              {titularPct > 0 && (
                <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${titularPct}%` }} />
              )}
              {suplentePct > 0 && (
                <div className="h-full bg-slate-400 rounded-full" style={{ width: `${suplentePct}%` }} />
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] inline-block"></span>
                {t('editPlayer.starter')} ({titulares})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                {t('editPlayer.substitute', 'Suplente')} ({suplente})
              </span>
            </div>
          </div>
        </div>
      )}

      {goles > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('players.goals')}</span>
          <span className="flex items-center gap-1">
            {Array.from({ length: Math.min(goles, 20) }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] inline-block"></span>
            ))}
            {goles > 20 && <span className="text-[10px] font-black text-slate-400">+{goles - 20}</span>}
          </span>
          <span className="text-xs font-black text-[var(--accent)]">{goles}</span>
        </div>
      )}
    </div>
  );
};

export default PlayerStatsCharts;
