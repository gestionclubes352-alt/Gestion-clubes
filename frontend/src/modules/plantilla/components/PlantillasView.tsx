import React, { useState } from 'react';
import type { Player } from '../types';
import SquadAnalytics from './SquadAnalytics';

export type CompetitionTab = 'actas' | 'clasificacion' | 'resultados' | 'horarios' | 'calendario';
type PlantillaSection = 'lista' | 'graficas' | 'dashboard' | CompetitionTab;

const TABS: Array<{ id: PlantillaSection; label: string; icon: string }> = [
  { id: 'lista', label: 'Listado', icon: 'fa-list' },
  { id: 'graficas', label: 'Gráficas', icon: 'fa-chart-line' },
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-column' },
  { id: 'actas', label: 'Actas', icon: 'fa-clipboard-list' },
  { id: 'clasificacion', label: 'Clasificaciones', icon: 'fa-trophy' },
  { id: 'resultados', label: 'Resultados', icon: 'fa-list-check' },
  { id: 'horarios', label: 'Horarios', icon: 'fa-clock' },
  { id: 'calendario', label: 'Calendario', icon: 'fa-calendar-days' },
];
const COMPETITION_TABS: PlantillaSection[] = ['actas', 'clasificacion', 'resultados', 'horarios', 'calendario'];

interface PlantillasViewProps {
  /** Plantilla ya filtrada por los equipos seleccionados en la cabecera. */
  squad: Player[];
  /** Vista de listado (PlayerTable). */
  children: React.ReactNode;
  /** Renderiza la sección de competición (actas, clasificación, resultados, horarios, calendario). */
  renderCompetition?: (section: CompetitionTab) => React.ReactNode;
}

/** Contenedor de Plantillas con botones internos: Listado · Gráficas · Dashboard · Actas · Clasificaciones · Resultados · Horarios · Calendario. */
const PlantillasView: React.FC<PlantillasViewProps> = ({ squad, children, renderCompetition }) => {
  const [section, setSection] = useState<PlantillaSection>('lista');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 px-1" role="tablist" aria-label="Secciones de plantilla">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={section === tab.id}
            onClick={() => setSection(tab.id)}
            className={`inline-flex h-10 items-center gap-2 rounded-full border-2 px-5 text-sm font-semibold transition-all ${
              section === tab.id
                ? 'border-blue-600 bg-blue-600 text-white shadow'
                : 'border-blue-400 bg-white text-slate-700 hover:bg-blue-50'
            }`}
          >
            <i className={`fa-solid ${tab.icon} text-xs`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {section === 'lista' && children}
      {(section === 'graficas' || section === 'dashboard') && <SquadAnalytics squad={squad} mode={section} classification={section === 'dashboard' ? renderCompetition?.('clasificacion') : undefined} />}
      {COMPETITION_TABS.includes(section) && renderCompetition?.(section as CompetitionTab)}
    </div>
  );
};

export default PlantillasView;
