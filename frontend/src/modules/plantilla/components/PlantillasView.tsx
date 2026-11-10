import React, { useEffect, useRef, useState } from 'react';
import type { Player } from '../types';
import SquadAnalytics from './SquadAnalytics';

export type CompetitionTab = 'actas' | 'clasificacion' | 'resultados' | 'horarios' | 'calendario';
type PlantillaSection = 'lista' | 'campogramas' | 'objetivos' | 'graficas' | 'dashboard' | CompetitionTab;

const TABS: Array<{ id: PlantillaSection; label: string; icon: string }> = [
  { id: 'lista', label: 'Listado', icon: 'fa-list' },
  { id: 'campogramas', label: 'Campogramas', icon: 'fa-futbol' },
  { id: 'objetivos', label: 'Objetivos', icon: 'fa-bullseye' },
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-column' },
  { id: 'graficas', label: 'Gráficas', icon: 'fa-chart-line' },
  { id: 'clasificacion', label: 'Clasificaciones', icon: 'fa-trophy' },
  { id: 'resultados', label: 'Resultados y Actas', icon: 'fa-list-check' },
  { id: 'horarios', label: 'Horarios', icon: 'fa-clock' },
  { id: 'calendario', label: 'Calendario', icon: 'fa-calendar-days' },
];
const COMPETITION_TABS: PlantillaSection[] = ['clasificacion', 'resultados', 'horarios', 'calendario'];

interface PlantillasViewProps {
  /** Plantilla ya filtrada por los equipos seleccionados en la cabecera. */
  squad: Player[];
  /** Vista de listado (PlayerTable). */
  children: React.ReactNode;
  /** Vista de campogramas. */
  campogramas?: React.ReactNode;
  /** Vista de objetivos individuales. */
  objetivos?: React.ReactNode;
  /** Renderiza la sección de competición (actas, clasificación, resultados, horarios, calendario). */
  renderCompetition?: (section: CompetitionTab, opts?: { onEquipoChange?: (equipo: string) => void }) => React.ReactNode;
}

/** Contenedor de Plantillas con botones internos: Listado · Gráficas · Dashboard · Actas · Clasificaciones · Resultados · Horarios · Calendario. */
const PlantillasView: React.FC<PlantillasViewProps> = ({ squad, children, campogramas, objetivos, renderCompetition }) => {
  const [section, setSection] = useState<PlantillaSection>('lista');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-3 ${isFullscreen ? 'bg-slate-50 dark:bg-slate-900 overflow-auto p-4' : ''}`}
    >
      <div className="sticky top-0 z-30 flex flex-wrap gap-2 px-1 py-2 bg-white dark:bg-slate-900" role="tablist" aria-label="Secciones de plantilla">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={section === tab.id}
            onClick={() => setSection(tab.id)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full border-2 px-3 text-xs font-semibold whitespace-nowrap transition-all ${
              section === tab.id
                ? 'border-blue-600 bg-blue-600 text-white shadow'
                : 'border-blue-400 bg-white text-slate-700 hover:bg-blue-50'
            }`}
          >
            <i className={`fa-solid ${tab.icon} text-[10px]`}></i>
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border-2 border-slate-300 bg-white px-3 text-xs font-semibold whitespace-nowrap text-slate-700 transition-all hover:bg-slate-100"
        >
          <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-[10px]`}></i>
          {isFullscreen ? 'Salir' : 'Pantalla completa'}
        </button>
      </div>

      {section === 'lista' && children}
      {section === 'campogramas' && campogramas}
      {section === 'objetivos' && objetivos}
      {(section === 'graficas' || section === 'dashboard') && <SquadAnalytics squad={squad} mode={section} classification={section === 'dashboard' && renderCompetition ? (onEquipoChange => renderCompetition('clasificacion', { onEquipoChange })) : undefined} />}
      {COMPETITION_TABS.includes(section) && renderCompetition?.(section as CompetitionTab)}
    </div>
  );
};

export default PlantillasView;
