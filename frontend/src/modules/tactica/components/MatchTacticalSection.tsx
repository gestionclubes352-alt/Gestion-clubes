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
            Cambios Registrados
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {changes.map((change) => {
              const isSelected = selectedChangeId === change.id;
              const changeLabel =
                change.type === 'entrada'
                  ? `${change.minute}' - ENTRA ${change.playerInName}`
                  : change.type === 'salida'
                  ? `${change.minute}' - SALE ${change.playerOutName}`
                  : `${change.minute}' - FORMACIÓN ${change.newFormation}`;

              return (
                <button
                  key={change.id}
                  onClick={() => setSelectedChangeId(change.id)}
                  className={`text-left rounded-lg border-2 transition-all overflow-hidden ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-[#1a1a1a] dark:hover:border-white/20'
                  }`}
                >
                  <MatchFormationViewer
                    formation={selectedFormation.formation}
                    players={playersOnField}
                    highlightPlayerId={change.playerInId || change.playerOutId}
                    title={changeLabel}
                    compact={true}
                    className="p-0"
                  />
                </button>
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
    </div>
  );
};

export default MatchTacticalSection;
