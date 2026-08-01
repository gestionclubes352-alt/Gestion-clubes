import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchJornada,
  fetchActa,
  isAvailable,
  SEASONS,
  getCurrentSeason,
  estimateCurrentJornada,
  type Season,
  type GeminiJornadaResult,
  type GeminiMatchResult,
  type GeminiMatchActa,
} from '@shared/services/geminiActasService';

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

/** Tarjeta de partido */
const MatchCard: React.FC<{
  match: GeminiMatchResult;
  onViewActa: () => void;
}> = ({ match, onViewActa }) => (
  <div
    className={`rounded-2xl p-4 transition-all border ${
      match.played
        ? 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/60 cursor-pointer'
        : 'bg-slate-900/30 border-slate-800/30 opacity-60'
    }`}
    onClick={match.played ? onViewActa : undefined}
  >
    <div className="flex items-center gap-3">
      <div className="flex-1 text-right">
        <span className={`text-[12px] font-semibold ${match.played ? 'text-slate-200' : 'text-slate-400'}`}>
          {match.home}
        </span>
      </div>

      <div className="px-4 min-w-[70px] text-center">
        {match.played && match.homeGoals !== null ? (
          <span className="text-lg font-black text-white tabular-nums">
            {match.homeGoals}
            <span className="text-slate-500 mx-1 text-sm">-</span>
            {match.awayGoals}
          </span>
        ) : (
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {match.time || 'vs'}
          </span>
        )}
      </div>

      <div className="flex-1 text-left">
        <span className={`text-[12px] font-semibold ${match.played ? 'text-slate-200' : 'text-slate-400'}`}>
          {match.away}
        </span>
      </div>
    </div>

    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-700/30">
      <div className="flex items-center gap-3 text-[10px] text-slate-500">
        {match.date && <span><i className="fa-regular fa-calendar mr-1"></i>{match.date}</span>}
        {match.time && <span><i className="fa-regular fa-clock mr-1"></i>{match.time}</span>}
      </div>
      {match.played && (
        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/70 flex items-center gap-1">
          <i className="fa-solid fa-clipboard-check text-[8px]"></i> Ver Acta
        </span>
      )}
    </div>

    {match.referee && (
      <div className="text-[9px] text-slate-600 mt-1">
        <i className="fa-solid fa-whistle mr-1"></i>{match.referee}
      </div>
    )}
  </div>
);

/** Sección de alineación de un equipo en acta */
const TeamLineup: React.FC<{
  teamName: string;
  lineup: GeminiMatchActa['homeLineup'];
  subs: GeminiMatchActa['subs'];
  cards: GeminiMatchActa['cards'];
}> = ({ teamName, lineup, subs, cards }) => (
  <div className="flex-1">
    <h4 className="text-[11px] font-black text-slate-200 uppercase tracking-widest mb-3 flex items-center gap-2">
      <i className="fa-solid fa-shield-halved text-emerald-500/50"></i>
      {teamName}
    </h4>

    {/* Titulares */}
    <div className="mb-4">
      <div className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest mb-2">
        Titulares ({lineup.length})
      </div>
      <div className="space-y-[2px]">
        {lineup.map((p, i) => (
          <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-slate-700/30 transition-colors">
            {p.dorsal !== null && (
              <span className="w-6 text-right text-[10px] font-mono font-bold text-slate-500">{p.dorsal}</span>
            )}
            <span className="text-[11px] text-slate-300">{p.name}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Sustituciones */}
    {subs.length > 0 && (
      <div className="mb-4">
        <div className="text-[9px] font-bold text-amber-500/60 uppercase tracking-widest mb-2">
          Cambios ({subs.length})
        </div>
        <div className="space-y-1">
          {subs.map((s, i) => (
            <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-slate-800/30 text-[10px]">
              <span className="text-slate-500 font-mono w-8">{s.minute}'</span>
              <span className="text-emerald-400/80"><i className="fa-solid fa-arrow-up text-[8px] mr-1"></i>{s.playerIn}</span>
              <span className="text-rose-400/60"><i className="fa-solid fa-arrow-down text-[8px] mr-1"></i>{s.playerOut}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Tarjetas */}
    {cards.length > 0 && (
      <div>
        <div className="text-[9px] font-bold text-yellow-500/60 uppercase tracking-widest mb-2">
          Tarjetas
        </div>
        <div className="space-y-1">
          {cards.map((c, i) => (
            <div key={i} className="flex items-center gap-2 py-1 px-2 text-[10px]">
              <span className={`w-3 h-4 rounded-sm ${c.type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`}></span>
              <span className="text-slate-400 font-mono w-8">{c.minute}'</span>
              <span className="text-slate-300">{c.player}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ActasPage: React.FC = () => {
  const defaultSeason = getCurrentSeason();
  const defaultJornada = estimateCurrentJornada(defaultSeason);

  const [selectedSeason, setSelectedSeason] = useState<Season>(defaultSeason);
  const [currentJornada, setCurrentJornada] = useState<number>(defaultJornada);
  const [jornadaData, setJornadaData] = useState<GeminiJornadaResult | null>(null);
  const [actaData, setActaData] = useState<GeminiMatchActa | null>(null);
  const [actaMatch, setActaMatch] = useState<GeminiMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingActa, setLoadingActa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'jornada' | 'acta'>('jornada');
  const mounted = useRef(false);

  // --- Fetch jornada ---
  const loadJornada = useCallback(async (season: Season, jornada: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJornada(season, jornada);
      setJornadaData(data);
    } catch (err: any) {
      setError(`Error al cargar jornada: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Fetch acta ---
  const loadActa = useCallback(async (match: GeminiMatchResult) => {
    setLoadingActa(true);
    setError(null);
    setActaMatch(match);
    try {
      const data = await fetchActa(match.home, match.away, currentJornada, selectedSeason);
      setActaData(data);
      setView('acta');
    } catch (err: any) {
      setError(`Error al cargar acta: ${err.message}`);
    } finally {
      setLoadingActa(false);
    }
  }, [currentJornada, selectedSeason]);

  // --- Carga inicial ---
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    if (isAvailable()) {
      loadJornada(defaultSeason, defaultJornada);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Navegación ---
  const navigateJornada = (delta: number) => {
    const next = currentJornada + delta;
    if (next < 1 || next > 38) return;
    setCurrentJornada(next);
    setJornadaData(null);
    loadJornada(selectedSeason, next);
  };

  const goToJornada = (j: number) => {
    setCurrentJornada(j);
    setJornadaData(null);
    loadJornada(selectedSeason, j);
  };

  const changeSeason = (label: string) => {
    const season = SEASONS.find(s => s.label === label);
    if (!season) return;
    setSelectedSeason(season);
    const j = estimateCurrentJornada(season);
    setCurrentJornada(j);
    setJornadaData(null);
    setActaData(null);
    setView('jornada');
    loadJornada(season, j);
  };

  // --- Sin API key ---
  if (!isAvailable()) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <i className="fa-solid fa-key text-4xl text-slate-600"></i>
        <p className="text-sm text-slate-400 font-semibold">API Key de Gemini no configurada</p>
        <p className="text-xs text-slate-500">Añade <code className="text-emerald-400/70 bg-slate-800 px-2 py-0.5 rounded">VITE_GEMINI_API_KEY</code> a tu .env.local</p>
      </div>
    );
  }

  // --- Helpers para filtrar subs/cards por equipo ---
  const filterByTeam = <T extends { team: string }>(items: T[], teamName: string, side: 'home' | 'away'): T[] =>
    items.filter(i => i.team === side || i.team.toLowerCase().includes(teamName.toLowerCase().substring(0, 4)));

  // --- VISTA: Jornada ---
  const renderJornada = () => (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-base font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
            <i className="fa-solid fa-clipboard-list text-emerald-500"></i>
            Actas Oficiales
          </h1>
          <p className="text-[10px] text-slate-500 font-medium tracking-wider mt-1">
            La Liga Primera División — {selectedSeason.label}
          </p>
        </div>

        {/* Selectores */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSeason.label}
            onChange={(e) => changeSeason(e.target.value)}
            className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-[11px] text-slate-300 outline-none cursor-pointer hover:bg-slate-800 transition-all font-semibold"
          >
            {SEASONS.map(s => (
              <option key={s.label} value={s.label} className="bg-slate-900">
                {s.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => navigateJornada(-1)}
            disabled={currentJornada <= 1 || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 disabled:opacity-20 transition-all"
          >
            <i className="fa-solid fa-chevron-left text-[10px]"></i>
          </button>

          <select
            value={currentJornada}
            onChange={(e) => goToJornada(parseInt(e.target.value, 10))}
            className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-[11px] text-slate-300 outline-none cursor-pointer hover:bg-slate-800 transition-all font-semibold min-w-[100px] text-center"
          >
            {Array.from({ length: 38 }, (_, i) => i + 1).map(j => (
              <option key={j} value={j} className="bg-slate-900">Jornada {j}</option>
            ))}
          </select>

          <button
            onClick={() => navigateJornada(1)}
            disabled={currentJornada >= 38 || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 disabled:opacity-20 transition-all"
          >
            <i className="fa-solid fa-chevron-right text-[10px]"></i>
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Buscando resultados...</p>
            <p className="text-[9px] text-slate-600 mt-1">Gemini + Google Search</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-[11px] text-rose-300 mb-4">
          <i className="fa-solid fa-exclamation-triangle mr-2"></i>{error}
          <button onClick={() => loadJornada(selectedSeason, currentJornada)} className="ml-3 underline hover:text-rose-200">
            Reintentar
          </button>
        </div>
      )}

      {/* Partidos */}
      {!loading && jornadaData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {jornadaData.matches.length === 0 ? (
            <div className="col-span-full text-center py-20 text-slate-600 text-xs">
              <i className="fa-solid fa-calendar-xmark text-4xl mb-4 block"></i>
              No se encontraron partidos en esta jornada
            </div>
          ) : (
            jornadaData.matches.map((match) => (
              <MatchCard
                key={`${match.home}-${match.away}`}
                match={match}
                onViewActa={() => loadActa(match)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );

  // --- VISTA: Acta detallada ---
  const renderActa = () => {
    if (!actaData) return null;

    return (
      <div className="animate-fade-in max-w-5xl mx-auto">
        {/* Volver */}
        <button
          onClick={() => { setActaData(null); setActaMatch(null); setView('jornada'); }}
          className="mb-5 flex items-center gap-2 text-[10px] font-semibold text-slate-500 hover:text-slate-200 transition-colors"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span className="uppercase tracking-widest">Volver a Jornada {currentJornada}</span>
        </button>

        {/* Cabecera del partido */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-6 mb-4">
          <div className="text-center mb-1">
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.3em]">
              Jornada {currentJornada} — {selectedSeason.label}
            </span>
          </div>

          <div className="flex items-center justify-center gap-6 py-4">
            <div className="flex-1 text-right">
              <span className="text-sm font-black text-slate-100">{actaData.home}</span>
            </div>
            <div className="px-6">
              <div className="text-3xl font-black text-white tabular-nums tracking-wider">
                {actaData.homeGoals}
                <span className="text-slate-600 mx-2 text-xl">-</span>
                {actaData.awayGoals}
              </div>
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-black text-slate-100">{actaData.away}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-5 text-[10px] text-slate-500">
            {actaData.date && <span><i className="fa-regular fa-calendar mr-1"></i>{actaData.date}</span>}
            {actaData.stadium && <span><i className="fa-solid fa-location-dot mr-1"></i>{actaData.stadium}</span>}
            {actaData.referee && <span><i className="fa-solid fa-whistle mr-1"></i>{actaData.referee}</span>}
          </div>
        </div>

        {/* Goles */}
        {actaData.goals.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5 mb-4">
            <div className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest mb-3">
              <i className="fa-solid fa-futbol mr-2"></i>Goles
            </div>
            <div className="space-y-2">
              {actaData.goals.map((g, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-800/30">
                  <span className="text-[10px] font-mono font-bold text-slate-500 w-10">{g.minute}'</span>
                  <span className="text-[11px] font-semibold text-slate-200">{g.player}</span>
                  <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    g.team === 'home' ? 'bg-sky-500/10 text-sky-400/70' : 'bg-amber-500/10 text-amber-400/70'
                  }`}>
                    {g.team === 'home' ? actaData.home : actaData.away}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alineaciones */}
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5 mb-4">
          <div className="text-[9px] font-bold text-sky-500/70 uppercase tracking-widest mb-4">
            <i className="fa-solid fa-users mr-2"></i>Alineaciones
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TeamLineup
              teamName={actaData.home}
              lineup={actaData.homeLineup}
              subs={filterByTeam(actaData.subs, actaData.home, 'home')}
              cards={filterByTeam(actaData.cards, actaData.home, 'home')}
            />
            <div className="hidden lg:block w-px bg-slate-700/30 self-stretch"></div>
            <TeamLineup
              teamName={actaData.away}
              lineup={actaData.awayLineup}
              subs={filterByTeam(actaData.subs, actaData.away, 'away')}
              cards={filterByTeam(actaData.cards, actaData.away, 'away')}
            />
          </div>
        </div>

        {/* Fuente */}
        <div className="text-center py-3">
          <span className="text-[9px] text-slate-600 italic">
            <i className="fa-solid fa-robot mr-1"></i>Datos obtenidos via Gemini + Google Search
          </span>
        </div>
      </div>
    );
  };

  // --- Layout ---
  return (
    <div className="pb-12">
      {view === 'jornada' && renderJornada()}
      {view === 'acta' && renderActa()}

      {/* Loading overlay para acta */}
      {loadingActa && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-10 h-10 mx-auto border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest">
              {actaMatch ? `${actaMatch.home} vs ${actaMatch.away}` : 'Cargando acta...'}
            </p>
            <p className="text-[9px] text-slate-500 mt-1">Buscando datos del partido...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActasPage;
