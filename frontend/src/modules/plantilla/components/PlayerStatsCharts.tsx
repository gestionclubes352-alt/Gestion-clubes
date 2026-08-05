import React from 'react';
import { useTranslation } from 'react-i18next';

interface PlayerStatsChartsProps {
  partidosJugados?: number;
  minutos?: number;
  titular?: number;
  goles?: number;
  sesionesTotal?: number;
  sesionesAsistidas?: number;
  sesionesAusencias?: number;
}

const MINUTES_PER_MATCH = 90;

const PlayerStatsCharts: React.FC<PlayerStatsChartsProps> = ({
  partidosJugados = 0,
  minutos = 0,
  titular = 0,
  goles = 0,
  sesionesTotal = 0,
  sesionesAsistidas = 0,
  sesionesAusencias = 0,
}) => {
  const { t } = useTranslation();

  const asistenciaPct = sesionesTotal > 0 ? Math.round((sesionesAsistidas / sesionesTotal) * 100) : 0;
  const asistenciaBarPct = sesionesTotal > 0 ? (sesionesAsistidas / sesionesTotal) * 100 : 0;
  const ausenciaBarPct = sesionesTotal > 0 ? (sesionesAusencias / sesionesTotal) * 100 : 0;

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

      {sesionesTotal > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {t('editPlayer.sessionsAttendance', 'Asistencia a sesiones')}
            </span>
            <span className="text-xs font-black">
              <span className="text-emerald-600">{sesionesAsistidas}</span>
              <span className="text-slate-300"> / </span>
              <span className="text-red-500">{sesionesAusencias}</span>
              <span className="text-slate-400 font-semibold"> ({sesionesTotal})</span>
            </span>
          </div>
          <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
            {asistenciaBarPct > 0 && (
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${asistenciaBarPct}%` }} />
            )}
            {ausenciaBarPct > 0 && (
              <div className="h-full bg-red-400 rounded-full" style={{ width: `${ausenciaBarPct}%` }} />
            )}
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                {t('editPlayer.attended', 'Asistidas')} ({sesionesAsistidas})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                {t('editPlayer.absent', 'Ausencias')} ({sesionesAusencias})
              </span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                asistenciaPct >= 80
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : asistenciaPct >= 50
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}
            >
              {asistenciaPct}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerStatsCharts;
