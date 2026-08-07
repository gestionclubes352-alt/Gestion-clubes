import React, { useMemo, useState } from 'react';
import { MatchTacticalChange } from '../types/match-changes';
import { TacticalPosition } from '../types';
import MatchTacticalTimeline from './MatchTacticalTimeline';
import MatchFormationViewer from './MatchFormationViewer';
import MatchTacticalEditor from './MatchTacticalEditor';

interface Player {
  id: string | number;
  nombre: string;
  apodo?: string;
  dorsal?: number;
}

interface MatchTacticalSectionProps {
  /** Match ID */
  matchId: string;
  /** Current tactical changes */
  changes: MatchTacticalChange[];
  /** Formation at start of match */
  initialFormation?: string;
  /** Initial lineup positions */
  initialLineup?: TacticalPosition[];
  /** Full squad */
  squad: Player[];
  /** Substitute IDs */
  substituteIds?: Array<string | number>;
  /** Callback to save changes */
  onSaveChanges: (changes: MatchTacticalChange[]) => void;
  /** Score/match info for header */
  matchScore?: string;
  /** Match opponent */
  opponent?: string;
}

const MatchTacticalSection: React.FC<MatchTacticalSectionProps> = ({
  matchId,
  changes,
  initialFormation = '4-3-3',
  initialLineup = [],
  squad,
  substituteIds = [],
  onSaveChanges,
  matchScore = '—',
  opponent = 'Rival',
}) => {
  const [selectedChangeId, setSelectedChangeId] = useState<string | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingChange, setEditingChange] = useState<MatchTacticalChange | undefined>();
  const [modalChangeId, setModalChangeId] = useState<string | undefined>();

  // Build players on field at each point in time
  const computeFormationAtMinute = (minute: number) => {
    // Start with initial lineup
    let currentLineup = [...(initialLineup || [])];
    let currentFormation = initialFormation;

    // Apply changes up to this minute
    const applicableChanges = changes
      .filter((c) => c.minute <= minute)
      .sort((a, b) => a.minute - b.minute);

    for (const change of applicableChanges) {
      if (change.type === 'cambio_formacion' && change.newFormation) {
        currentFormation = change.newFormation;
      }
      // Note: We don't change lineup here for simplicity
      // In a full implementation, we'd track player swaps
    }

    return { formation: currentFormation, lineup: currentLineup };
  };

  // Get formation for selected change
  const selectedChange = changes.find((c) => c.id === selectedChangeId);
  const selectedFormation = useMemo(() => {
    if (!selectedChange) return computeFormationAtMinute(0);
    const lastFormationChange = changes
      .filter((c) => c.type === 'cambio_formacion' && c.minute <= selectedChange.minute)
      .sort((a, b) => b.minute - a.minute)[0];
    return {
      formation: lastFormationChange?.newFormation || initialFormation,
      lineup: initialLineup || [],
    };
  }, [selectedChange, changes, initialFormation, initialLineup]);

  // 11 inicial - INMUTABLE, no cambia nunca
  const initialEleven = useMemo(() => {
    return squad
      .filter((p) => !substituteIds.includes(p.id))
      .slice(0, 11)
      .map((p) => ({
        id: p.id,
        name: p.nombre,
        dorsal: p.dorsal,
      }));
  }, [squad, substituteIds]);

  // Alias para mantener compatibilidad
  const playersOnField = initialEleven;

  // Substitute players
  const substitutePlayers = useMemo(() => {
    return squad
      .filter((p) => substituteIds.includes(p.id))
      .map((p) => ({
        id: p.id,
        name: p.nombre,
        dorsal: p.dorsal,
      }));
  }, [squad, substituteIds]);

  const handleSaveChange = (change: MatchTacticalChange) => {
    const updated = editingChange
      ? changes.map((c) => (c.id === editingChange.id ? change : c))
      : [...changes, change];

    onSaveChanges(updated);
    setEditorOpen(false);
    setEditingChange(undefined);
    setSelectedChangeId(change.id);
  };

  const handleDeleteChange = (changeId: string) => {
    const updated = changes.filter((c) => c.id !== changeId);
    onSaveChanges(updated);
    if (selectedChangeId === changeId) {
      setSelectedChangeId(undefined);
    }
  };

  const handleEditChange = (changeId: string) => {
    const change = changes.find((c) => c.id === changeId);
    if (change) {
      setEditingChange(change);
      setEditorOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with match info */}
      <div className="rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 dark:border-white/10 dark:from-[#1a1a1a] dark:to-[#0a0a0a]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black uppercase text-slate-900 dark:text-white">
              Sistema de Cambios Tácticos
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {opponent} — {matchScore}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingChange(undefined);
              setEditorOpen(!editorOpen);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold uppercase text-white shadow-sm transition-all hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            <i className="fa-solid fa-plus mr-2" />
            Agregar Cambio
          </button>
        </div>
      </div>

      {/* Timeline */}
      <MatchTacticalTimeline
        changes={changes}
        selectedChangeId={selectedChangeId}
        onSelectChange={setSelectedChangeId}
        onEditChange={handleEditChange}
        onDeleteChange={handleDeleteChange}
        compact={true}
      />

      {/* Editor (if open) */}
      {editorOpen && (
        <MatchTacticalEditor
          change={editingChange}
          matchId={matchId}
          squad={squad}
          playersOnField={playersOnField}
          existingChanges={changes}
          onSave={handleSaveChange}
          onCancel={() => {
            setEditorOpen(false);
            setEditingChange(undefined);
          }}
        />
      )}

      {/* Formation viewers - Full layout for selected change */}
      {selectedChange && (
        <div className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1a1a1a] p-4">
          <h3 className="mb-4 text-sm font-bold uppercase text-slate-700 dark:text-slate-300">
            Detalles del Cambio
          </h3>
          <MatchFormationViewer
            formation={selectedFormation.formation}
            players={playersOnField}
            substitutes={substitutePlayers}
            highlightPlayerId={selectedChange.playerInId || selectedChange.playerOutId}
            fullLayout={true}
            showNames={true}
          />
        </div>
      )}

      {/* Formation viewers grid for changes */}
      {changes.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase text-slate-700 dark:text-slate-300">
            <i className="fa-solid fa-diagram-project mr-2" />
            Sistema tras cada cambio
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {changes.map((change) => {
              const isSelected = selectedChangeId === change.id;
              const changeLabel =
                change.type === 'entrada'
                  ? `${change.minute}' - ENTRA ${change.playerInName}`
                  : change.type === 'salida'
                  ? `${change.minute}' - SALE ${change.playerOutName}`
                  : `${change.minute}' - FORMACIÓN ${change.newFormation}`;

              return (
                <div
                  key={change.id}
                  onClick={() => setModalChangeId(change.id)}
                  className="relative rounded-lg border-2 cursor-pointer transition-all group hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500"
                  style={{
                    borderColor: isSelected ? '#3b82f6' : '#e2e8f0',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setModalChangeId(change.id);
                    }
                  }}
                >
                  <div className="rounded-lg overflow-hidden">
                    <MatchFormationViewer
                      formation={selectedFormation.formation}
                      players={playersOnField}
                      highlightPlayerId={change.playerInId || change.playerOutId}
                      title={changeLabel}
                      compact={true}
                      className="p-0"
                    />
                  </div>

                  {/* Expand overlay indicator */}
                  <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fa-solid fa-expand text-white text-lg drop-shadow-lg" />
                      <span className="text-white text-xs font-bold drop-shadow-lg">Ver en grande</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No changes state */}
      {changes.length === 0 && !editorOpen && (
        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center dark:border-white/10 dark:bg-[#0a0a0a]">
          <i className="fa-solid fa-diagram-project mb-3 block text-3xl text-slate-400" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            No hay cambios tácticos registrados
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            Haz clic en "Agregar Cambio" para registrar modificaciones durante el partido
          </p>
        </div>
      )}

      {/* Modal for expanded view */}
      {modalChangeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-lg bg-white dark:bg-[#1a1a1a] shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setModalChangeId(undefined)}
              className="sticky top-0 right-0 z-10 float-right m-4 rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Cerrar"
            >
              <i className="fa-solid fa-xmark text-lg" />
            </button>

            {/* Modal content */}
            <div className="p-6">
              {changes.find((c) => c.id === modalChangeId) && (
                <>
                  {(() => {
                    const change = changes.find((c) => c.id === modalChangeId)!;
                    const changeLabel =
                      change.type === 'entrada'
                        ? `${change.minute}' - ENTRA ${change.playerInName}`
                        : change.type === 'salida'
                        ? `${change.minute}' - SALE ${change.playerOutName}`
                        : `${change.minute}' - FORMACIÓN ${change.newFormation}`;

                    const lastFormationChange = changes
                      .filter((c) => c.type === 'cambio_formacion' && c.minute <= change.minute)
                      .sort((a, b) => b.minute - a.minute)[0];
                    const formation = lastFormationChange?.newFormation || initialFormation;

                    return (
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-lg font-black uppercase text-slate-900 dark:text-white">
                            {changeLabel}
                          </h2>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {opponent} — {matchScore}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-200 dark:border-white/10 p-4 bg-slate-50 dark:bg-[#0a0a0a]">
                          <MatchFormationViewer
                            formation={formation}
                            players={playersOnField}
                            substitutes={substitutePlayers}
                            highlightPlayerId={change.playerInId || change.playerOutId}
                            fullLayout={true}
                            showNames={true}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchTacticalSection;
