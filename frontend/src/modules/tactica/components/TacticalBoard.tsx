import React, { useState, useMemo } from 'react';
import type { TacticalPosition, FormationName } from '../types';
import type { Player } from '@modules/plantilla';
import type { Campograma } from '@modules/entrenamientos';
import SearchableSelect from '@shared/components/SearchableSelect';

const NOT_CONVOCADO_REASONS: Array<{ value: string; label: string }> = [
  { value: 'decision_tecnica', label: 'Decisión técnica' },
  { value: 'lesion', label: 'Lesión' },
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'sancion_federativa', label: 'Sanción federativa' },
  { value: 'sancion_interna', label: 'Sanción interna' },
  { value: 'otro', label: 'Otro' },
  { value: 'otro_equipo', label: 'Otro equipo' },
];

interface TacticalBoardProps {
  formacion: string;
  positions: TacticalPosition[];
  squad: Player[];
  notConvocadoIds: Array<string | number>;
  notConvocadoReasons?: Record<string, string>;
  onAssignPlayer: (posId: string, playerId: string | number) => void;
  onRemovePlayer: (posId: string, playerId: string | number) => void;
  onChangeFormation: (newForm: string) => void;
  onToggleConvocado: (playerId: string | number, convocado: boolean, reason?: string) => void;
  onPlayerSelect?: (player: Player) => void;
  showStarterBadge?: boolean;
  showConvocadoControl?: boolean;
  mainTeamName?: string;
  campogramas?: Campograma[];
  selectedCampogramaId?: string | number;
  onSelectCampograma?: (campograma: Campograma) => void;
}

const TacticalBoard: React.FC<TacticalBoardProps> = ({
  formacion,
  positions = [],
  squad,
  notConvocadoIds,
  notConvocadoReasons = {},
  onAssignPlayer,
  onRemovePlayer,
  onChangeFormation,
  onToggleConvocado,
  onPlayerSelect,
  showStarterBadge = true,
  showConvocadoControl = true,
  mainTeamName = '',
  campogramas = [],
  selectedCampogramaId,
  onSelectCampograma
}) => {
  const [activePosId, setActivePosId] = useState<string | null>(positions.length > 0 ? positions[0].id : null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const isConvocado = (playerId: string | number) => !notConvocadoIds.some(id => String(id) === String(playerId));
  const isOtherTeam = (player: Player) => mainTeamName && player.equipo && player.equipo !== mainTeamName;

  const convocadoSquad = useMemo(() => squad.filter(p => isConvocado(p.id) && !isOtherTeam(p)), [squad, notConvocadoIds, mainTeamName]);
  const otherTeamsSquad = useMemo(() => squad.filter(p => isConvocado(p.id) && isOtherTeam(p)), [squad, notConvocadoIds, mainTeamName]);
  const noConvocadoSquad = useMemo(() => squad.filter(p => !isConvocado(p.id)), [squad, notConvocadoIds]);

  const groupedPlayers = useMemo(() => {
    // Detectar si la plantilla usa demarcaciones específicas (modo Escuela/Huesca)
    const hasSpecificDemarcations = convocadoSquad.some(p =>
      ['Lateral', 'Central', 'Pivote', 'Media punta', 'Interior', 'Extremo'].includes(p.posicion)
    );

    if (hasSpecificDemarcations) {
      // Orden de demarcaciones específicas
      const order = ['Portero', 'Lateral', 'Central', 'Pivote', 'Interior', 'Media punta', 'Extremo', 'Delantero'];
      const groups: Record<string, typeof convocadoSquad> = {};
      for (const dem of order) {
        const players = convocadoSquad.filter(p => p.posicion === dem);
        if (players.length > 0) groups[dem.toUpperCase()] = players;
      }
      // Agrupar posiciones no reconocidas en "OTROS"
      const known = new Set(order);
      const otros = convocadoSquad.filter(p => !known.has(p.posicion));
      if (otros.length > 0) groups['OTROS'] = otros;
      return groups;
    }

    // Modo genérico (4 grupos clásicos)
    const genericGroups: Record<string, typeof convocadoSquad> = {
      PORTERO: convocadoSquad.filter(p => p.posicion === 'Portero'),
      DEFENSA: convocadoSquad.filter(p => p.posicion === 'Defensa' || ['Lateral', 'Central'].includes(p.posicion)),
      MEDIO: convocadoSquad.filter(p => p.posicion === 'Medio' || ['Pivote', 'Media punta', 'Interior'].includes(p.posicion)),
      DELANTERO: convocadoSquad.filter(p => p.posicion === 'Delantero' || p.posicion === 'Extremo'),
    };
    const groups: Record<string, typeof convocadoSquad> = {};
    for (const [category, players] of Object.entries(genericGroups)) {
      if (players.length > 0) groups[category] = players;
    }
    // Nadie debe quedar oculto: cualquier jugador sin una posición reconocida cae en "OTROS"
    const known = new Set(['Portero', 'Defensa', 'Lateral', 'Central', 'Medio', 'Pivote', 'Media punta', 'Interior', 'Delantero', 'Extremo']);
    const otros = convocadoSquad.filter(p => !known.has(p.posicion));
    if (otros.length > 0) groups['OTROS'] = otros;
    return groups;
  }, [convocadoSquad]);

  const uniqueTeams = useMemo(() => {
    const teams = Array.from(new Set(otherTeamsSquad.map(p => p.equipo).filter(Boolean)));
    return teams.sort();
  }, [otherTeamsSquad]);

  const filteredOtherTeamsSquad = useMemo(() => {
    return otherTeamsSquad.filter(player => {
      const matchesTeam = !selectedTeam || player.equipo === selectedTeam;
      const matchesSearch = !searchTerm ||
        player.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.apodo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.dorsal?.toString().includes(searchTerm);
      return matchesTeam && matchesSearch;
    });
  }, [otherTeamsSquad, selectedTeam, searchTerm]);

  const handlePickPlayer = (playerId: string | number) => {
    if (activePosId) {
      onAssignPlayer(activePosId, playerId);
    }
  };

  const selectedPos = positions.find(p => p.id === activePosId);
  const spacingFactor = 1.3;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const fieldBackground = {
    backgroundColor: '#1e8449',
    backgroundImage: [
      'radial-gradient(circle at 50% 48%, rgba(255, 255, 255, 0.10) 0%, rgba(0, 0, 0, 0.05) 42%, rgba(0, 0, 0, 0.18) 100%)',
      'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 0 56px, rgba(0, 0, 0, 0.06) 56px 112px)',
      'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 0 2px, transparent 2px 128px)',
    ].join(', '),
    backgroundBlendMode: 'soft-light, multiply, normal',
  } as const;

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-stretch w-full max-w-375 mx-auto min-h-150 lg:h-[calc(100vh-180px)] pb-20 lg:pb-0 px-4">

      {/* Columna Centro: El Campo */}
      <div className="w-full flex-1 min-h-125 flex flex-col">
        <div className="relative flex-1 rounded-3xl md:rounded-4xl shadow-2xl flex items-center justify-center p-4 md:p-8 border-[6px] md:border-12 border-white/5 overflow-hidden" style={fieldBackground}>

          {/* Líneas del campo */}
          <div className="absolute inset-0 pointer-events-none p-4 md:p-6 opacity-62">
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              shapeRendering="geometricPrecision"
              aria-hidden="true"
            >
              <g
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.84"
                strokeWidth="0.32"
                vectorEffect="non-scaling-stroke"
              >
                <rect x="2.6" y="2.6" width="94.8" height="94.8" />
                <line x1="2.6" y1="50" x2="97.4" y2="50" />

                <circle cx="50" cy="50" r="11.5" />
                <circle cx="50" cy="50" r="0.38" fill="#ffffff" stroke="none" />

                <circle cx="50" cy="12" r="0.38" fill="#ffffff" stroke="none" />
                <circle cx="50" cy="88" r="0.38" fill="#ffffff" stroke="none" />

                <rect x="37" y="2.6" width="26" height="11.5" />
                <rect x="27" y="2.6" width="46" height="20.5" />

                <rect x="37" y="85.9" width="26" height="11.5" />
                <rect x="27" y="76.9" width="46" height="20.5" />
              </g>
            </svg>
          </div>

          {/* Posiciones e Interacción */}
          <div className="absolute inset-4 md:inset-6 z-10">
            {positions.map((pos) => {
              const assignedPlayers = (pos.playerIds || []).map(id => squad.find(p => String(p.id) === String(id))).filter(Boolean) as Player[];
              const displayPlayers = assignedPlayers.slice(-3);
              const isActive = activePosId === pos.id;
              const adjustedX = clamp(50 + (pos.x - 50) * spacingFactor, 3, 97);
              const adjustedY = clamp(50 + (pos.y - 50) * spacingFactor, 3, 97);

              return (
                <div key={pos.id} className="absolute transition-all duration-300" style={{ left: `${adjustedX}%`, top: `${adjustedY}%`, transform: 'translate(-50%, -50%)' }}>
                  <button
                    onClick={() => setActivePosId(isActive ? null : pos.id)}
                    className="flex flex-col items-center group p-4 md:p-6 -m-4 md:-m-6 transition-all cursor-pointer"
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div className="flex items-center justify-center transition-all relative">
                      <i className={`fa-solid fa-plus text-[18px] md:text-[22px] transition-all ${isActive ? 'text-white drop-shadow-lg scale-125' : 'text-white/60 group-hover:text-white group-hover:scale-110'}`}></i>
                    </div>
                    {displayPlayers.length > 0 && (
                      <div className="mt-1 md:mt-2 bg-black/90 text-white font-black px-2 md:px-3 py-1.5 rounded-md uppercase tracking-widest text-left leading-tight shadow-xl cursor-pointer max-w-45" style={{ minWidth: '90px' }}>
                        {displayPlayers.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 py-1 border-b border-white/10 last:border-b-0"
                          >
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex items-center justify-center border border-white/20 cursor-pointer" onClick={(e) => { e.stopPropagation(); if (onPlayerSelect) onPlayerSelect(p); }} title="Abrir ficha del jugador">
                              {p.fotoUrl && p.fotoUrl.length > 1 ? (
                                <img src={p.fotoUrl} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[8px] font-black text-white">{p.nombre.slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <span className="bg-white/15 text-white text-[9px] md:text-[10px] font-black px-1.5 py-0.5 rounded cursor-pointer" onClick={(e) => { e.stopPropagation(); if (onPlayerSelect) onPlayerSelect(p); }} title="Abrir ficha del jugador">
                              {p.dorsal}
                            </span>
                            <div className="min-w-0 flex-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); if (onPlayerSelect) onPlayerSelect(p); }} title="Abrir ficha del jugador">
                              <div className="whitespace-nowrap truncate text-[8px] md:text-[9px]">
                                {p.apodo || p.nombre}
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); onRemovePlayer(pos.id, p.id); }}
                              className="ml-1 w-4 h-4 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center shrink-0 transition-all"
                              title="Quitar jugador del campo"
                            >
                              <i className="fa-solid fa-xmark text-white text-[7px]"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Columna Derecha/Inferior: Selector */}
      <div className="w-full lg:w-80 bg-white rounded-3xl md:rounded-3xl border border-slate-100 shadow-xl flex flex-col max-h-125 lg:max-h-none overflow-hidden shrink-0">
        <div className="p-2 md:p-3 border-b border-slate-50 bg-slate-50/50">
          <p className="text-[7px] md:text-[7.5px] font-bold text-slate-300 uppercase italic leading-tight">
            {activePosId ? 'Toca un jugador para añadir (máx 3)' : 'Toca una posición arriba'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2 md:space-y-3 scrollbar-hide">
          {convocadoSquad.length === 0 && (
            <p className="text-[10px] font-bold text-slate-400 p-2 leading-relaxed">
              No se han encontrado jugadores de la plantilla para este equipo. Comprueba que el equipo del partido tenga jugadores dados de alta en el módulo Plantillas.
            </p>
          )}
          {(Object.keys(groupedPlayers) as Array<keyof typeof groupedPlayers>).map((category) => (
            <div key={category} className="space-y-1.5">
              <h4 className="text-[7px] md:text-[7.5px] font-black text-slate-400 px-2 py-0.5 bg-slate-50 rounded-lg tracking-widest uppercase">
                {category}
              </h4>
              <div className="space-y-2">
                {groupedPlayers[category].map((player) => {
                  const inThisPos = selectedPos?.playerIds?.some(id => String(id) === String(player.id));
                  const isOnField = positions.some(p => p.playerIds?.some(id => String(id) === String(player.id)));
                  const isDisabled = isOnField && !inThisPos;
                  const subtitle = [player.club, player.equipo].filter(Boolean).join(' · ') || player.posicion;

                  return (
                    <div
                      key={player.id}
                      className={`
                        w-full flex items-center justify-between gap-2 p-2 rounded-xl transition-all border
                        ${inThisPos ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg' : isOnField ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : 'bg-white border-slate-100 hover:bg-slate-50'}
                        ${isDisabled && !isOnField ? 'opacity-40 grayscale' : ''}
                        ${!activePosId && !inThisPos && !isDisabled && !isOnField ? 'opacity-50 grayscale' : ''}
                      `}
                    >
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                            if (inThisPos) onRemovePlayer(selectedPos!.id, player.id);
                            else if (activePosId && !isDisabled) handlePickPlayer(player.id);
                        }}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                      >
                        <div className={`w-9 h-9 rounded-lg overflow-hidden border-2 ${inThisPos ? 'border-white/70' : 'border-slate-200'} bg-slate-100 flex items-center justify-center flex-shrink-0`}>
                          {player.fotoUrl && player.fotoUrl.length > 1 ? (
                            <img src={player.fotoUrl} className="w-full h-full object-cover" />
                          ) : (
                            <span className={`text-[10px] font-black ${inThisPos ? 'text-white' : 'text-slate-500'}`}>{(player.apodo || player.nombre).slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${inThisPos ? 'bg-white/15 text-white' : 'bg-[var(--accent)] text-white'}`}>
                                {player.dorsal}
                              </span>
                              {isOnField && showStarterBadge && (
                                <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${inThisPos ? 'bg-white/15 text-white' : 'bg-green-500 text-white'}`}>
                                  T
                                </span>
                              )}
                              {mainTeamName && player.equipo && player.equipo !== mainTeamName && (
                                <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-black ${inThisPos ? 'bg-orange-400/50 text-white' : 'bg-orange-300 text-white'}`}>
                                  ♦
                                </span>
                              )}
                            </div>
                            <span className={`text-[11px] font-black uppercase truncate ${inThisPos ? 'text-white' : isOnField ? 'text-blue-600' : 'text-slate-600'}`}>
                              {player.apodo || player.nombre}
                            </span>
                          </div>
                          {subtitle && (
                            <div className={`text-[8px] font-bold uppercase tracking-widest truncate ${inThisPos ? 'text-white/70' : 'text-slate-400'}`}>
                              {subtitle}
                            </div>
                          )}
                        </div>
                        <i className={`fa-solid ${inThisPos ? 'fa-check text-white' : 'fa-plus text-slate-300'} text-[10px] flex-shrink-0`}></i>
                      </button>
                      {showConvocadoControl && (
                        <SearchableSelect
                          value="convocado"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'convocado') onToggleConvocado(player.id, true);
                            else onToggleConvocado(player.id, false, value);
                          }}
                          title="Convocatoria"
                          className={`w-24 text-[7px] font-black uppercase tracking-wide rounded-lg border px-1.5 py-1.5 flex-shrink-0 outline-none ${inThisPos ? 'bg-white/20 border-white/30 text-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                        >
                          <option value="convocado">Convocado</option>
                          {NOT_CONVOCADO_REASONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </SearchableSelect>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {otherTeamsSquad.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <h4 className="text-[7px] md:text-[7.5px] font-black text-orange-500 px-2 py-0.5 bg-orange-50 rounded-lg tracking-widest uppercase">
                <i className="fa-solid fa-arrow-down-short-wide mr-1"></i>Otros Equipos
              </h4>

              <div className="space-y-2 px-2">
                <input
                  type="text"
                  placeholder="Buscar jugador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-[10px] font-bold uppercase placeholder-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                {uniqueTeams.length > 0 && (
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-[10px] font-bold uppercase text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    <option value="">Todos los equipos</option>
                    {uniqueTeams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                {filteredOtherTeamsSquad.length === 0 ? (
                  <p className="text-[9px] text-orange-500 font-bold p-2 text-center">
                    No hay jugadores que coincidan con la búsqueda
                  </p>
                ) : (
                  filteredOtherTeamsSquad.map((player) => {
                  const inThisPos = selectedPos?.playerIds?.some(id => String(id) === String(player.id));
                  const isOnField = positions.some(p => p.playerIds?.some(id => String(id) === String(player.id)));
                  const isDisabled = isOnField && !inThisPos;
                  const subtitle = [player.club, player.equipo].filter(Boolean).join(' · ') || player.posicion;

                  return (
                    <div
                      key={player.id}
                      className={`
                        w-full flex items-center justify-between gap-2 p-2 rounded-xl transition-all border
                        ${inThisPos ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg' : isOnField ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' : 'bg-white border-slate-100 hover:bg-slate-50'}
                        ${isDisabled && !isOnField ? 'opacity-40 grayscale' : ''}
                        ${!activePosId && !inThisPos && !isDisabled && !isOnField ? 'opacity-50 grayscale' : ''}
                      `}
                    >
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                            if (inThisPos) onRemovePlayer(selectedPos!.id, player.id);
                            else if (activePosId && !isDisabled) handlePickPlayer(player.id);
                        }}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                      >
                        <div className={`w-9 h-9 rounded-lg overflow-hidden border-2 ${inThisPos ? 'border-white/70' : 'border-orange-200'} bg-slate-100 flex items-center justify-center flex-shrink-0`}>
                          {player.fotoUrl && player.fotoUrl.length > 1 ? (
                            <img src={player.fotoUrl} className="w-full h-full object-cover" />
                          ) : (
                            <span className={`text-[10px] font-black ${inThisPos ? 'text-white' : 'text-slate-500'}`}>{(player.apodo || player.nombre).slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${inThisPos ? 'bg-white/15 text-white' : 'bg-orange-400 text-white'}`}>
                                {player.dorsal}
                              </span>
                              {isOnField && showStarterBadge && (
                                <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${inThisPos ? 'bg-white/15 text-white' : 'bg-green-500 text-white'}`}>
                                  T
                                </span>
                              )}
                            </div>
                            <span className={`text-[11px] font-black uppercase truncate ${inThisPos ? 'text-white' : isOnField ? 'text-orange-600' : 'text-slate-600'}`}>
                              {player.apodo || player.nombre}
                            </span>
                          </div>
                          {subtitle && (
                            <div className={`text-[8px] font-bold uppercase tracking-widest truncate ${inThisPos ? 'text-white/70' : 'text-slate-400'}`}>
                              {subtitle}
                            </div>
                          )}
                        </div>
                        <i className={`fa-solid ${inThisPos ? 'fa-check text-white' : 'fa-plus text-orange-300'} text-[10px] flex-shrink-0`}></i>
                      </button>
                      {showConvocadoControl && (
                        <SearchableSelect
                          value="convocado"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'convocado') onToggleConvocado(player.id, true);
                            else onToggleConvocado(player.id, false, value);
                          }}
                          title="Convocatoria"
                          className={`w-24 text-[7px] font-black uppercase tracking-wide rounded-lg border px-1.5 py-1.5 flex-shrink-0 outline-none ${inThisPos ? 'bg-white/20 border-white/30 text-white' : 'bg-orange-50 border-orange-200 text-orange-600'}`}
                        >
                          <option value="convocado">Convocado</option>
                          {NOT_CONVOCADO_REASONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </SearchableSelect>
                      )}
                    </div>
                  );
                })
                )}
              </div>
            </div>
          )}

          {noConvocadoSquad.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <h4 className="text-[7px] md:text-[7.5px] font-black text-red-400 px-2 py-0.5 bg-red-50 rounded-lg tracking-widest uppercase">
                No convocados
              </h4>
              <div className="space-y-2">
                {noConvocadoSquad.map((player) => {
                  const subtitle = [player.club, player.equipo].filter(Boolean).join(' · ') || player.posicion;
                  return (
                    <div
                      key={player.id}
                      className="w-full flex items-center justify-between gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50 opacity-70"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0 grayscale">
                          {player.fotoUrl && player.fotoUrl.length > 1 ? (
                            <img src={player.fotoUrl} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-black text-slate-500">{(player.apodo || player.nombre).slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black bg-slate-300 text-white">
                                {player.dorsal}
                              </span>
                              {mainTeamName && player.equipo && player.equipo !== mainTeamName && (
                                <span className="px-1.5 py-0.5 rounded-md text-[7px] font-black bg-orange-300 text-white">
                                  ♦
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-black uppercase truncate text-slate-500">
                              {player.apodo || player.nombre}
                            </span>
                          </div>
                          {subtitle && (
                            <div className="text-[8px] font-bold uppercase tracking-widest truncate text-slate-400">
                              {subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                      <SearchableSelect
                        value={notConvocadoReasons[String(player.id)] || 'decision_tecnica'}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'convocado') onToggleConvocado(player.id, true);
                          else onToggleConvocado(player.id, false, value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title="Convocatoria"
                        className="w-24 text-[7px] font-black uppercase tracking-wide rounded-lg border px-1.5 py-1.5 flex-shrink-0 outline-none bg-white border-slate-200 text-slate-500"
                      >
                        <option value="convocado">Convocado</option>
                        {NOT_CONVOCADO_REASONS.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </SearchableSelect>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TacticalBoard;
