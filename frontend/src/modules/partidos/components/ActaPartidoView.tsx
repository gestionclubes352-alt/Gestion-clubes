import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  rfefActasService,
  parseJornadaUrl,
  loadCompetitionConfig,
  saveCompetitionConfig,
  getDefaultCompetitionConfig,
  type RfefCompetitionConfig,
  type RfefJornadaResult,
  type RfefJornadaMatch,
  type ActaPartido,
} from '@shared/services/rfefActasService';

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

/** Tarjeta de partido en la lista de jornada */
const MatchCard: React.FC<{
  match: RfefJornadaMatch;
  onViewActa: (codActa: string) => void;
}> = ({ match, onViewActa }) => (
  <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl p-4 transition-all group">
    <div className="flex items-center gap-3">
      {/* Local */}
      <div className="flex-1 min-w-0 text-right">
        <span className="block truncate text-[11px] font-bold text-white/80 leading-tight">{match.localTeam}</span>
      </div>
      {match.localLogo && <img src={match.localLogo} alt="" className="w-7 h-7 object-contain shrink-0" />}

      {/* Score */}
      <div className="px-3 min-w-[60px] shrink-0 text-center">
        {match.score ? (
          <span className="text-sm font-black text-white">{match.score}</span>
        ) : (
          <span className="text-[10px] font-bold text-white/30 uppercase">vs</span>
        )}
      </div>

      {/* Visitor */}
      {match.visitorLogo && <img src={match.visitorLogo} alt="" className="w-7 h-7 object-contain shrink-0" />}
      <div className="flex-1 min-w-0 text-left">
        <span className="block truncate text-[11px] font-bold text-white/80 leading-tight">{match.visitorTeam}</span>
      </div>
    </div>

    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
      <div className="flex items-center gap-3 text-[9px] text-white/30">
        <span><i className="fa-regular fa-calendar mr-1"></i>{match.date}</span>
        <span><i className="fa-regular fa-clock mr-1"></i>{match.time}</span>
      </div>
      {match.hasActa && (
        <button
          onClick={() => onViewActa(match.codActa)}
          className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
        >
          <i className="fa-solid fa-clipboard-list"></i> Ver Acta
        </button>
      )}
    </div>
    {match.referee && (
      <div className="text-[9px] text-white/20 mt-1">
        <i className="fa-solid fa-whistle mr-1"></i>{match.referee}
      </div>
    )}
  </div>
);

/** Sección de alineación de un equipo */
const TeamLineup: React.FC<{
  team: ActaPartido['homeTeam'];
  isHome: boolean;
}> = ({ team, isHome }) => (
  <div className="flex-1">
    <div className={`flex items-center gap-3 mb-4 ${isHome ? '' : 'flex-row-reverse'}`}>
      {team.logoUrl && <img src={team.logoUrl} alt="" className="w-8 h-8 object-contain" />}
      <div>
        <h4 className="text-xs font-black text-white uppercase tracking-wider">{team.name}</h4>
        {team.coach && <p className="text-[9px] text-white/30"><i className="fa-solid fa-user-tie mr-1"></i>{team.coach}</p>}
      </div>
    </div>

    {/* Titulares */}
    <div className="mb-3">
      <div className="text-[8px] font-black text-green-400/60 uppercase tracking-[0.2em] mb-2">
        <i className="fa-solid fa-shirt mr-1"></i>Titulares ({team.starters.length})
      </div>
      <div className="space-y-[2px]">
        {team.starters.map((p, i) => (
          <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-white/5 transition-colors">
            <span className="w-5 text-right text-[10px] font-mono font-bold text-white/40">{p.dorsal}</span>
            <span className="text-[11px] text-white/80">{p.name}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Suplentes */}
    <div className="mb-3">
      <div className="text-[8px] font-black text-blue-400/60 uppercase tracking-[0.2em] mb-2">
        <i className="fa-solid fa-bench-tree mr-1"></i>Suplentes ({team.substitutes.length})
      </div>
      <div className="space-y-[2px]">
        {team.substitutes.map((p, i) => (
          <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-white/5 transition-colors">
            <span className="w-5 text-right text-[10px] font-mono font-bold text-white/20">{p.dorsal}</span>
            <span className="text-[11px] text-white/50">{p.name}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Sustituciones */}
    {team.substitutions.length > 0 && (
      <div className="mb-3">
        <div className="text-[8px] font-black text-orange-400/60 uppercase tracking-[0.2em] mb-2">
          <i className="fa-solid fa-arrows-rotate mr-1"></i>Cambios ({team.substitutions.length})
        </div>
        <div className="space-y-1">
          {team.substitutions.map((s, i) => (
            <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-white/[0.02] text-[10px]">
              <span className="text-white/30 font-mono">{s.minute}</span>
              <span className="text-green-400/70"><i className="fa-solid fa-arrow-up text-[8px] mr-1"></i>{s.playerIn}</span>
              <span className="text-red-400/50"><i className="fa-solid fa-arrow-down text-[8px] mr-1"></i>{s.playerOut}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Tarjetas */}
    {team.cards.length > 0 && (
      <div>
        <div className="text-[8px] font-black text-yellow-400/60 uppercase tracking-[0.2em] mb-2">
          <i className="fa-solid fa-square mr-1"></i>Tarjetas
        </div>
        <div className="space-y-1">
          {team.cards.map((c, i) => (
            <div key={i} className="flex items-center gap-2 py-1 px-2 text-[10px]">
              <span className={`w-3 h-4 rounded-sm ${c.type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`}></span>
              <span className="text-white/60">{c.player}</span>
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

const ActaPartidoView: React.FC = () => {
  // --- Estado ---
  const [config] = useState<RfefCompetitionConfig>(() => loadCompetitionConfig());
  const [currentJornada, setCurrentJornada] = useState<number>(1);
  const [totalJornadas, setTotalJornadas] = useState<number>(38);
  const [jornadaData, setJornadaData] = useState<RfefJornadaResult | null>(null);
  const [actaData, setActaData] = useState<ActaPartido | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'jornada' | 'acta'>('jornada');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsUrl, setSettingsUrl] = useState('');
  const initialLoad = useRef(false);

  // --- Handlers ---

  const fetchJornada = useCallback(async (jornada: number, cfg?: RfefCompetitionConfig) => {
    const c = cfg || config;
    setLoading(true);
    setError(null);
    try {
      const data = await rfefActasService.fetchJornada(c, jornada);
      setJornadaData(data);
      if (data.totalJornadas > 0) setTotalJornadas(data.totalJornadas);
      setView('jornada');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(`Error al cargar jornada: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [config]);

  const fetchActa = useCallback(async (codActa: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await rfefActasService.fetchActa(config.codPrimaria, codActa);
      setActaData(data);
      setView('acta');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(`Error al cargar acta: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [config]);

  // Auto-cargar la última jornada jugada al montar
  useEffect(() => {
    if (!initialLoad.current) {
      initialLoad.current = true;
      // Intentar cargar la jornada más reciente (comenzar por la 1 para detectar el total)
      fetchJornada(currentJornada);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateJornada = (delta: number) => {
    const next = currentJornada + delta;
    if (next < 1 || next > totalJornadas) return;
    setCurrentJornada(next);
    setJornadaData(null);
    fetchJornada(next);
  };

  const goToJornada = (j: number) => {
    setCurrentJornada(j);
    setJornadaData(null);
    fetchJornada(j);
  };

  const handleSaveSettings = () => {
    if (settingsUrl.trim()) {
      const parsed = parseJornadaUrl(settingsUrl);
      if (parsed) {
        saveCompetitionConfig(parsed.config);
        setShowSettings(false);
        setSettingsUrl('');
        setCurrentJornada(parsed.jornada);
        setJornadaData(null);
        fetchJornada(parsed.jornada, parsed.config);
        // Reload with new config
        window.location.reload();
        return;
      }
    }
    setShowSettings(false);
  };

  // --- Renders ---

  /** Lista de partidos de la jornada */
  const renderJornada = () => (
    <div className="animate-fade-in max-w-3xl mx-auto">
      {/* Header con navegación */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Botón de ajustes de competición */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/20 hover:text-white/60 bg-white/5 hover:bg-white/10 transition-all shrink-0"
          title="Cambiar competición"
        >
          <i className="fa-solid fa-gear text-[10px]"></i>
        </button>

        <div className="flex items-center gap-3 order-last w-full justify-center sm:order-none sm:w-auto">
          <button
            onClick={() => navigateJornada(-1)}
            disabled={currentJornada <= 1 || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all shrink-0"
          >
            <i className="fa-solid fa-chevron-left text-[10px]"></i>
          </button>

          <div className="text-center min-w-[120px] sm:min-w-[180px]">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">
              Jornada {currentJornada}
            </h3>
            {jornadaData?.competitionName && (
              <p className="text-[8px] text-white/20 font-medium tracking-wider mt-0.5 truncate">
                {jornadaData.competitionName}
              </p>
            )}
          </div>

          <button
            onClick={() => navigateJornada(1)}
            disabled={currentJornada >= totalJornadas || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all shrink-0"
          >
            <i className="fa-solid fa-chevron-right text-[10px]"></i>
          </button>
        </div>

        {/* Selector rápido de jornada */}
        <select
          value={currentJornada}
          onChange={(e) => goToJornada(parseInt(e.target.value, 10))}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white/60 outline-none cursor-pointer hover:bg-white/10 transition-all shrink-0"
        >
          {Array.from({ length: totalJornadas }, (_, i) => i + 1).map(j => (
            <option key={j} value={j} className="bg-[#1a1a1a]">J{j}</option>
          ))}
        </select>
      </div>

      {/* Panel de ajustes (colapsable) */}
      {showSettings && (
        <div className="mb-4 bg-white/[0.03] border border-white/10 rounded-2xl p-4 animate-fade-in">
          <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3">
            <i className="fa-solid fa-link mr-2"></i>Cambiar Competición
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={settingsUrl}
              onChange={(e) => setSettingsUrl(e.target.value)}
              placeholder="Pegar URL de jornada de resultados.rfef.es"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white placeholder-white/20 outline-none focus:border-red-500/30 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSettings()}
            />
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
            >
              Guardar
            </button>
          </div>
          <p className="text-[8px] text-white/15 mt-2">
            La competición actual se cargará automáticamente en adelante. Solo necesitas cambiarla si quieres ver otra liga.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-[11px] text-red-300 mb-4">
          <i className="fa-solid fa-exclamation-triangle mr-2"></i>{error}
          <button onClick={() => fetchJornada(currentJornada)} className="ml-3 underline hover:text-red-200">
            Reintentar
          </button>
        </div>
      )}

      {/* Partidos */}
      {!loading && jornadaData && (
        <div className="space-y-2">
          {jornadaData.matches.length === 0 ? (
            <div className="text-center py-12 text-white/20 text-xs">
              <i className="fa-solid fa-calendar-xmark text-3xl mb-3 block"></i>
              No se encontraron partidos en esta jornada
            </div>
          ) : (
            jornadaData.matches.map((match, i) => (
              <MatchCard key={match.codActa || i} match={match} onViewActa={fetchActa} />
            ))
          )}
        </div>
      )}
    </div>
  );

  /** Detalle de acta de partido */
  const renderActa = () => {
    if (!actaData) return null;

    return (
      <div className="animate-fade-in max-w-5xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => { setActaData(null); setView('jornada'); }}
          className="mb-4 flex items-center gap-2 text-[10px] font-bold text-white/30 hover:text-white transition-colors"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span className="uppercase tracking-widest">Volver a Jornada {currentJornada}</span>
        </button>

        {/* Header del partido */}
        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 mb-4">
          <div className="text-center mb-1">
            <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.3em]">
              {actaData.competition} — {actaData.jornada}
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-6 py-4">
            {/* Home */}
            <div className="flex-1 min-w-0 text-right flex items-center justify-end gap-3">
              <span className="truncate text-sm font-black text-white">{actaData.homeTeam.name}</span>
              {actaData.homeTeam.logoUrl && <img src={actaData.homeTeam.logoUrl} alt="" className="w-12 h-12 object-contain shrink-0" />}
            </div>

            {/* Score */}
            <div className="px-3 sm:px-6 shrink-0">
              <div className="text-3xl font-black text-white tracking-wider">
                {actaData.homeScore} <span className="text-white/20 mx-1">-</span> {actaData.awayScore}
              </div>
            </div>

            {/* Away */}
            <div className="flex-1 min-w-0 text-left flex items-center gap-3">
              {actaData.awayTeam.logoUrl && <img src={actaData.awayTeam.logoUrl} alt="" className="w-12 h-12 object-contain shrink-0" />}
              <span className="truncate text-sm font-black text-white">{actaData.awayTeam.name}</span>
            </div>
          </div>

          {/* Match info */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[9px] text-white/30">
            <span><i className="fa-regular fa-calendar mr-1"></i>{actaData.date} {actaData.time}</span>
            {actaData.stadium && <span><i className="fa-solid fa-location-dot mr-1"></i>{actaData.stadium}</span>}
            {actaData.city && <span>{actaData.city}</span>}
          </div>
        </div>

        {/* Goles */}
        {actaData.goals.length > 0 && (
          <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 mb-4">
            <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">
              <i className="fa-solid fa-futbol mr-2 text-green-400/50"></i>Goles
            </div>
            <div className="space-y-2">
              {actaData.goals.map((g, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/[0.02]">
                  <span className="text-[10px] font-mono font-bold text-white/40 w-10">{g.minute}</span>
                  <span className="text-[11px] font-bold text-white/70">{g.player}</span>
                  <span className="ml-auto text-[10px] font-black text-white/30">{g.homeScore} - {g.awayScore}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alineaciones */}
        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 mb-4">
          <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">
            <i className="fa-solid fa-users mr-2 text-blue-400/50"></i>Alineaciones
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TeamLineup team={actaData.homeTeam} isHome={true} />
            <div className="hidden lg:block w-px bg-white/5 self-stretch"></div>
            <TeamLineup team={actaData.awayTeam} isHome={false} />
          </div>
        </div>

        {/* Árbitros */}
        {actaData.referees.length > 0 && (
          <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 mb-4">
            <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">
              <i className="fa-solid fa-gavel mr-2 text-purple-400/50"></i>Árbitros
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {actaData.referees.map((ref, i) => (
                <div key={i} className="text-[10px] text-white/50 py-1 px-3 rounded-lg bg-white/[0.02]">
                  {i === 0 && <span className="text-[8px] text-purple-400/40 font-bold mr-1">Principal</span>}
                  {ref}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enlace RFEF */}
        <div className="text-center py-4">
          <a
            href={`https://resultados.rfef.es/pnfg/NPcd/NFG_CmpPartido?cod_primaria=${config.codPrimaria}&CodActa=${actaData.codActa}&cod_acta=${actaData.codActa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-white/20 hover:text-white/40 transition-colors"
          >
            <i className="fa-solid fa-external-link mr-1"></i>Ver acta original en RFEF
          </a>
        </div>
      </div>
    );
  };

  // --- Layout principal ---
  return (
    <div className="pb-32">
      {view === 'jornada' && renderJornada()}
      {view === 'acta' && renderActa()}

      {/* Loading overlay para acta */}
      {loading && view === 'acta' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-10 h-10 mx-auto border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mb-4"></div>
            <p className="text-[11px] text-white/50 font-bold uppercase tracking-widest">Cargando acta...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActaPartidoView;
