/**
 * @fileoverview Wizard para importar datos de equipos desde URL de la RFEF
 * @description Flujo: Pegar URL → Preview Jugadores → Importar
 *              Soporta URLs de rfef.es/es/competiciones/.../equipo/{compId}/{teamId}
 */

import React, { useState, useCallback } from 'react';
import { rfefService, parseRfefUrl } from '@shared/services/rfefService';
import type { RfefParseResult, RfefPosition } from '@shared/services/rfefService';
import { db, setTeamConfig } from '@shared/services/dataService';
import type { StaffMember, CompetitionTeam } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

type WizardStep = 'url' | 'loading' | 'preview' | 'importing' | 'done';

interface ImportProgress {
  players: number;
  total: number;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const FederationUrlWizard: React.FC = () => {
  // Estado del wizard
  const [step, setStep] = useState<WizardStep>('url');
  const [error, setError] = useState<string | null>(null);

  // Input del usuario
  const [urlInput, setUrlInput] = useState('https://rfef.es/es/competiciones/tercera-federacion/equipo/2470/9460');
  const [urlValid, setUrlValid] = useState<boolean | null>(true);

  // Datos parseados
  const [data, setData] = useState<RfefParseResult | null>(null);

  // Progreso de importación
  const [importProgress, setImportProgress] = useState<ImportProgress>({ players: 0, total: 0 });

  // --------------------------------------------------------------------------
  // VALIDACIÓN DE URL EN TIEMPO REAL
  // --------------------------------------------------------------------------
  const handleUrlChange = (value: string) => {
    setUrlInput(value);
    setError(null);
    if (value.trim().length === 0) {
      setUrlValid(null);
    } else {
      setUrlValid(parseRfefUrl(value) !== null);
    }
  };

  // --------------------------------------------------------------------------
  // PASO 1: Obtener datos del equipo
  // --------------------------------------------------------------------------
  const handleFetchTeam = useCallback(async () => {
    if (!urlInput.trim()) return;

    setStep('loading');
    setError(null);

    try {
      const result = await rfefService.fetchTeamData(urlInput.trim());
      setData(result);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener datos del equipo');
      setStep('url');
    }
  }, [urlInput]);

  // --------------------------------------------------------------------------
  // PASO 2: Importar datos
  // --------------------------------------------------------------------------
  const handleImport = useCallback(async () => {
    if (!data) return;

    setStep('importing');
    setError(null);

    const totalItems = data.players.length;
    setImportProgress({ players: 0, total: totalItems });

    const positionMap: Record<string, string> = {
      'Porteros': 'Portero',
      'Defensas': 'Defensa',
      'Medios': 'Medio',
      'Delanteros': 'Delantero',
    };

    try {
      // 0. Limpiar jugadores y staff anteriores (pero NO competition_teams,
      //    ya que la RFEF solo devuelve datos de 1 equipo y borraría los rivales)
      await db.players.clearAll();
      await db.staff.clearAll();

      // 1. Importar jugadores
      for (let i = 0; i < data.players.length; i++) {
        const p = data.players[i];

        const playerForDb = {
          id: p.id,
          nombre: p.name,
          dorsal: p.dorsal,
          posicion: positionMap[p.position] || 'Medio',
          posicionJuego: p.positionLabel,
          perfil: 'D' as const,
          competicion: data.team.competitionName,
          club: data.team.name,
          equipo: data.team.name,
          fotoUrl: p.photoUrl,
        };

        await db.players.upsert(playerForDb);
        setImportProgress(prev => ({ ...prev, players: i + 1 }));
      }

      // 2. Importar equipo como CompetitionTeam
      const compTeam: CompetitionTeam = {
        id: data.team.id,
        nombre: data.team.name,
        estadio: 'Por definir',
        localidad: 'ESP',
        logoUrl: data.team.logoUrl,
      };
      await db.competition_teams.upsert(compTeam);

      // 3. Guardar configuración (per-team)
      setTeamConfig({
        leagueId: data.team.competitionId,
        leagueName: data.team.competitionName,
        teamId: data.team.id,
        teamName: data.team.name,
        teamShortName: data.team.name,
        teamLogo: data.team.logoUrl,
        setupComplete: true,
        importSource: 'federation',
        importedAt: new Date().toISOString(),
      });

      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error durante la importación');
      setStep('preview');
    }
  }, [data]);

  // --------------------------------------------------------------------------
  // NAVEGACIÓN
  // --------------------------------------------------------------------------
  const handleBack = () => {
    setStep('url');
    setData(null);
    setError(null);
  };

  const handleRestart = () => {
    setStep('url');
    setUrlInput('');
    setUrlValid(null);
    setData(null);
    setError(null);
    setImportProgress({ players: 0, total: 0 });
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <i className="fa-solid fa-link text-3xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-black">Importar desde URL de Federación</h3>
            <p className="text-white/80 text-sm">
              Pega la URL del equipo en rfef.es para importar la plantilla
            </p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="mt-6 flex items-center gap-2">
          <StepIndicator
            number={1}
            label="URL"
            active={step === 'url' || step === 'loading'}
            completed={step === 'preview' || step === 'importing' || step === 'done'}
          />
          <div className="flex-1 h-0.5 bg-white/20"></div>
          <StepIndicator
            number={2}
            label="Preview"
            active={step === 'preview'}
            completed={step === 'importing' || step === 'done'}
          />
          <div className="flex-1 h-0.5 bg-white/20"></div>
          <StepIndicator
            number={3}
            label="Importar"
            active={step === 'importing' || step === 'done'}
            completed={step === 'done'}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {/* PASO 1: Introducir URL */}
      {step === 'url' && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <h4 className="font-bold text-slate-700 mb-2">
            <i className="fa-solid fa-globe mr-2 text-blue-500"></i>
            Pega la URL del equipo en la RFEF
          </h4>
          <p className="text-xs text-slate-500 mb-4">
            <i className="fa-solid fa-circle-info mr-1"></i>
            Ve a <a href="https://rfef.es" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">rfef.es</a>,
            busca tu competición → equipo, y copia la URL del navegador
          </p>

          {/* Input de URL */}
          <div className="relative">
            <input
              type="url"
              value={urlInput}
              onChange={e => handleUrlChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && urlValid && handleFetchTeam()}
              placeholder="https://rfef.es/es/competiciones/tercera-federacion/equipo/2470/9460"
              className={`
                w-full px-4 py-3 pr-12 rounded-xl border-2 outline-none transition-all text-sm
                ${urlValid === true ? 'border-green-400 bg-green-50/50 focus:ring-2 focus:ring-green-200' :
                  urlValid === false ? 'border-red-300 bg-red-50/50 focus:ring-2 focus:ring-red-200' :
                  'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}
              `}
            />
            {/* Indicador de validación */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {urlValid === true && (
                <i className="fa-solid fa-check-circle text-green-500"></i>
              )}
              {urlValid === false && urlInput.length > 0 && (
                <i className="fa-solid fa-times-circle text-red-400"></i>
              )}
            </div>
          </div>

          {/* Ejemplo visual */}
          {urlValid === false && urlInput.length > 5 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                La URL debe seguir el patrón:<br/>
                <code className="bg-amber-100 px-1 rounded text-[11px]">
                  https://rfef.es/es/competiciones/[competición]/equipo/[compId]/[teamId]
                </code>
              </p>
            </div>
          )}

          {/* Info de la URL parseada */}
          {urlValid && (() => {
            const parts = parseRfefUrl(urlInput);
            return parts ? (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 font-semibold mb-1">
                  <i className="fa-solid fa-circle-check mr-1"></i>
                  URL válida detectada
                </p>
                <div className="flex gap-4 text-xs text-blue-600">
                  <span>
                    <i className="fa-solid fa-trophy mr-1"></i>
                    Competición: <strong>{parts.competitionSlug}</strong> (ID: {parts.competitionId})
                  </span>
                  <span>
                    <i className="fa-solid fa-shield mr-1"></i>
                    Equipo ID: <strong>{parts.teamId}</strong>
                  </span>
                </div>
              </div>
            ) : null;
          })()}

          {/* Botón de acción */}
          <button
            onClick={handleFetchTeam}
            disabled={!urlValid}
            className={`
              mt-4 w-full p-4 font-bold rounded-2xl transition-all flex items-center justify-center gap-2
              ${urlValid
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg text-white cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
            `}
          >
            <i className="fa-solid fa-download"></i>
            Obtener datos del equipo
          </button>

          {/* Atajo rápido */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
              Ejemplo rápido
            </p>
            <button
              onClick={() => handleUrlChange('https://rfef.es/es/competiciones/tercera-federacion/equipo/2470/9460')}
              className="text-xs px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-all"
            >
              <i className="fa-solid fa-futbol mr-1 text-blue-500"></i>
              CD Derio – Tercera Federación
            </button>
          </div>
        </div>
      )}

      {/* LOADING */}
      {step === 'loading' && (
        <div className="p-8 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
          <span className="text-slate-600 font-semibold">Obteniendo datos del equipo...</span>
          <span className="text-xs text-slate-400 mt-1">Conectando con BeSoccer / RFEF</span>
        </div>
      )}

      {/* PASO 2: Preview de datos */}
      {step === 'preview' && data && (
        <div className="space-y-4">
          {/* Info del equipo */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <img
                  src={data.team.logoUrl}
                  alt=""
                  className="w-16 h-16 object-contain"
                  onError={e => { e.currentTarget.src = 'https://i.pravatar.cc/64?u=' + data.team.id; }}
                />
                <div>
                  <h4 className="font-bold text-xl text-slate-700">{data.team.name}</h4>
                  <p className="text-sm text-slate-500">{data.team.competitionName}</p>
                </div>
              </div>
              <button
                onClick={handleBack}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                <i className="fa-solid fa-arrow-left mr-1"></i>
                Cambiar URL
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-blue-600">{data.totalPlayers}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Jugadores</div>
              </div>
              {data.groups.map(g => (
                <div key={g.position} className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className={`text-2xl font-black ${getPositionColor(g.position)}`}>{g.players.length}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{g.position}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Jugadores por posición */}
          {data.groups.map(group => (
            <div key={group.position} className="p-4 bg-white rounded-2xl border border-slate-200">
              <h5 className="font-bold text-slate-700 mb-3">
                <i className={`fa-solid ${getPositionIcon(group.position)} mr-2 ${getPositionColor(group.position)}`}></i>
                {group.position}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({group.players.length})
                </span>
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {group.players.map(player => (
                  <div key={player.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <img
                      src={player.photoUrl}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover bg-slate-200"
                      onError={e => { e.currentTarget.src = 'https://i.pravatar.cc/32?u=' + player.id; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs text-slate-700 truncate">{player.name}</div>
                      <div className="text-[10px] text-slate-400">
                        #{player.dorsal || '?'} · {player.nationality}
                        {player.age > 0 && ` · ${player.age} años`}
                        {player.goals > 0 && (
                          <span className="text-amber-500 ml-1">⚽{player.goals}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Botón de importar */}
          <button
            onClick={handleImport}
            className="w-full p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg text-white font-bold rounded-2xl transition-all"
          >
            <i className="fa-solid fa-download mr-2"></i>
            Importar {data.totalPlayers} jugadores a la aplicación
          </button>
        </div>
      )}

      {/* IMPORTANDO */}
      {step === 'importing' && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <h4 className="font-bold text-slate-700 mb-4 text-center">
            <i className="fa-solid fa-spinner fa-spin mr-2 text-blue-600"></i>
            Importando datos...
          </h4>
          <ProgressBar
            label="Jugadores"
            current={importProgress.players}
            total={importProgress.total}
          />
        </div>
      )}

      {/* COMPLETADO */}
      {step === 'done' && data && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-check text-4xl text-green-500"></i>
          </div>
          <h4 className="font-bold text-xl text-slate-700 mb-2">¡Importación completa!</h4>
          <p className="text-slate-500 mb-2">
            Se han importado <strong>{data.totalPlayers}</strong> jugadores de <strong>{data.team.name}</strong>
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Fuente: {data.team.competitionName} · RFEF / BeSoccer
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="px-6 py-2 border-2 border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
            >
              <i className="fa-solid fa-rotate mr-2"></i>
              Importar otro equipo
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
            >
              <i className="fa-solid fa-home mr-2"></i>
              Ir al Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const StepIndicator: React.FC<{
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}> = ({ number, label, active, completed }) => (
  <div className="flex flex-col items-center">
    <div
      className={`
        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
        ${completed ? 'bg-green-400 text-white' : active ? 'bg-white text-blue-600' : 'bg-white/20 text-white/60'}
      `}
    >
      {completed ? <i className="fa-solid fa-check text-xs"></i> : number}
    </div>
    <span className={`text-[10px] mt-1 ${active ? 'text-white' : 'text-white/60'}`}>{label}</span>
  </div>
);

const ProgressBar: React.FC<{ label: string; current: number; total: number }> = ({
  label, current, total,
}) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-400">{current}/{total}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const getPositionIcon = (position: RfefPosition): string => {
  const icons: Record<RfefPosition, string> = {
    'Porteros': 'fa-user-shield',
    'Defensas': 'fa-shield-halved',
    'Medios': 'fa-route',
    'Delanteros': 'fa-futbol',
  };
  return icons[position] || 'fa-user';
};

const getPositionColor = (position: RfefPosition): string => {
  const colors: Record<RfefPosition, string> = {
    'Porteros': 'text-cyan-500',
    'Defensas': 'text-red-500',
    'Medios': 'text-emerald-500',
    'Delanteros': 'text-amber-500',
  };
  return colors[position] || 'text-slate-500';
};

export default FederationUrlWizard;
