import React from 'react';
import { MatchTacticalChange } from '../types/match-changes';

interface MatchTacticalTimelineProps {
  changes: MatchTacticalChange[];
  selectedChangeId?: string;
  onSelectChange?: (changeId: string) => void;
  onEditChange?: (changeId: string) => void;
  onDeleteChange?: (changeId: string) => void;
  compact?: boolean;
}

const MatchTacticalTimeline: React.FC<MatchTacticalTimelineProps> = ({
  changes,
  selectedChangeId,
  onSelectChange,
  onEditChange,
  onDeleteChange,
  compact = false,
}) => {
  const getChangeColor = (type: MatchTacticalChange['type']): string => {
    switch (type) {
      case 'entrada':
        return 'bg-green-500 dark:bg-green-600';
      case 'salida':
        return 'bg-red-500 dark:bg-red-600';
      case 'cambio_formacion':
        return 'bg-yellow-500 dark:bg-yellow-600';
      default:
        return 'bg-slate-500 dark:bg-slate-600';
    }
  };

  const getChangeLabel = (change: MatchTacticalChange): string => {
    switch (change.type) {
      case 'entrada':
        return `ENTRA ${change.playerInName || 'J'}`;
      case 'salida':
        return `SALE ${change.playerOutName || 'J'}`;
      case 'cambio_formacion':
        return `FORMACIÓN ${change.newFormation || '—'}`;
      default:
        return 'CAMBIO';
    }
  };

  const sortedChanges = [...changes].sort((a, b) => a.minute - b.minute);

  if (compact) {
    // Horizontal badge layout for compact view
    return (
      <div className="flex flex-wrap gap-2">
        {sortedChanges.map((change) => (
          <button
            key={change.id}
            onClick={() => onSelectChange?.(change.id)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide transition-all ${
              selectedChangeId === change.id
                ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900'
                : 'hover:shadow-md'
            } ${getChangeColor(change.type)} text-white shadow-sm`}
          >
            <span className="font-black">{change.minute}'</span>
            <span className="text-[10px]">{getChangeLabel(change).split(' ')[0]}</span>
          </button>
        ))}
      </div>
    );
  }

  // Vertical timeline for full view
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1a1a1a]">
      <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        Cambios Tácticos ({sortedChanges.length})
      </h3>

      {sortedChanges.length === 0 ? (
        <p className="py-3 text-center text-sm text-slate-500 dark:text-slate-400">
          No hay cambios registrados
        </p>
      ) : (
        <div className="space-y-2">
          {sortedChanges.map((change, idx) => {
            const isSelected = selectedChangeId === change.id;
            const isLast = idx === sortedChanges.length - 1;

            return (
              <div key={change.id} className="flex items-stretch gap-2">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  {/* Dot */}
                  <div
                    className={`h-3 w-3 rounded-full ${getChangeColor(change.type)} shadow-sm`}
                  />
                  {/* Line to next */}
                  {!isLast && <div className="h-6 w-0.5 bg-slate-300 dark:bg-white/10" />}
                </div>

                {/* Change card */}
                <button
                  onClick={() => onSelectChange?.(change.id)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                    isSelected
                      ? 'border-slate-400 bg-slate-100 dark:border-white/20 dark:bg-white/10'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-current opacity-70" />
                      <span className="font-bold text-slate-700 dark:text-white">{change.minute}'</span>
                      <span className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                        {getChangeLabel(change)}
                      </span>
                    </div>

                    {change.description && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {change.description}
                      </span>
                    )}
                  </div>

                  {/* Edit/Delete buttons (shown on hover) */}
                  <div className="mt-2 flex items-center justify-between gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditChange?.(change.id);
                      }}
                      className="flex h-6 items-center gap-1 rounded px-2 text-xs font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10"
                      title="Editar"
                    >
                      <i className="fa-solid fa-pencil text-[10px]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('¿Eliminar cambio?')) {
                          onDeleteChange?.(change.id);
                        }
                      }}
                      className="flex h-6 items-center gap-1 rounded px-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      title="Eliminar"
                    >
                      <i className="fa-solid fa-trash text-[10px]" />
                    </button>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MatchTacticalTimeline;
