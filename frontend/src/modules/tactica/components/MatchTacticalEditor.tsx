import React, { useEffect, useState } from 'react';
import { MatchTacticalChange } from '../types/match-changes';
import { FormationName, FORMATIONS } from '../types';
import SearchableSelect from '@shared/components/SearchableSelect';

interface Player {
  id: string | number;
  nombre: string;
  apodo?: string;
  dorsal?: number;
}

interface MatchTacticalEditorProps {
  /** Existing change to edit, or undefined for new change */
  change?: MatchTacticalChange;
  /** Current match ID */
  matchId: string;
  /** Full squad available */
  squad: Player[];
  /** Players currently on field */
  playersOnField: Array<{ id: string | number; name: string; dorsal?: number }>;
  /** Existing changes to validate against */
  existingChanges: MatchTacticalChange[];
  /** Callback when saved */
  onSave: (change: MatchTacticalChange) => void;
  /** Callback when cancelled */
  onCancel: () => void;
}

const formationNames: FormationName[] = ['4-3-3', '4-4-2', '4-2-3-1', '5-3-2'];

const MatchTacticalEditor: React.FC<MatchTacticalEditorProps> = ({
  change,
  matchId,
  squad,
  playersOnField,
  existingChanges,
  onSave,
  onCancel,
}) => {
  const [minute, setMinute] = useState(change?.minute ?? 45);
  const [type, setType] = useState<MatchTacticalChange['type']>(change?.type ?? 'entrada');
  const [playerInId, setPlayerInId] = useState(change?.playerInId ?? '');
  const [playerOutId, setPlayerOutId] = useState(change?.playerOutId ?? '');
  const [newFormation, setNewFormation] = useState(change?.newFormation ?? '4-3-3');
  const [description, setDescription] = useState(change?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (minute < 0 || minute > 120) {
      newErrors.minute = 'El minuto debe estar entre 0 y 120';
    }

    // Check for duplicate minute
    const isDuplicate = existingChanges.some(
      (c) => c.minute === minute && (!change || c.id !== change.id)
    );
    if (isDuplicate) {
      newErrors.minute = 'Ya existe un cambio en ese minuto';
    }

    if (type === 'entrada' && !playerInId) {
      newErrors.playerIn = 'Selecciona jugador que entra';
    }

    if (type === 'salida' && !playerOutId) {
      newErrors.playerOut = 'Selecciona jugador que sale';
    }

    if (type === 'cambio_formacion' && !newFormation) {
      newErrors.formation = 'Selecciona nueva formación';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const newChange: MatchTacticalChange = {
      id: change?.id ?? `change-${Date.now()}`,
      matchId,
      minute,
      type,
      playerInId: type === 'entrada' ? playerInId : change?.playerInId,
      playerInName: type === 'entrada' ? squad.find((p) => p.id === playerInId)?.nombre : undefined,
      playerOutId: type === 'salida' ? playerOutId : change?.playerOutId,
      playerOutName: type === 'salida' ? playersOnField.find((p) => p.id === playerOutId)?.name : undefined,
      newFormation: type === 'cambio_formacion' ? newFormation : change?.newFormation,
      description,
      timestamp: change?.timestamp ?? Date.now(),
      createdAt: change?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newChange);
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#1a1a1a]">
      <div>
        <h3 className="text-sm font-bold uppercase text-slate-700 dark:text-white">
          {change ? 'Editar Cambio' : 'Nuevo Cambio'}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {change ? 'Modifica los detalles del cambio' : 'Registra un cambio táctico durante el partido'}
        </p>
      </div>

      <div className="space-y-3">
        {/* Minute input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Minuto
          </label>
          <input
            type="number"
            min="0"
            max="120"
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-[#0a0a0a] ${
              errors.minute
                ? 'border-red-400 dark:border-red-500'
                : 'border-slate-200 dark:border-white/10'
            }`}
          />
          {errors.minute && <p className="mt-1 text-xs text-red-500">{errors.minute}</p>}
        </div>

        {/* Change type */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Tipo de Cambio
          </label>
          <div className="mt-2 flex gap-2">
            {(['entrada', 'salida', 'cambio_formacion'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setErrors({});
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold uppercase transition-all ${
                  type === t
                    ? 'border-slate-400 bg-slate-700 text-white dark:border-white/30 dark:bg-white/10'
                    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-slate-300'
                }`}
              >
                {t === 'entrada' ? '⬆️ Entra' : t === 'salida' ? '⬇️ Sale' : '🔄 Formación'}
              </button>
            ))}
          </div>
        </div>

        {/* Conditional fields based on type */}
        {type === 'entrada' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Jugador que Entra
            </label>
            <SearchableSelect
              value={playerInId}
              onChange={(e) => {
                setPlayerInId(e.target.value);
                setErrors((prev) => ({ ...prev, playerIn: '' }));
              }}
              className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-[#0a0a0a] ${
                errors.playerIn
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-slate-200 dark:border-white/10'
              }`}
            >
              <option value="">Selecciona jugador...</option>
              {squad.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.dorsal ? `(${p.dorsal})` : ''}
                </option>
              ))}
            </SearchableSelect>
            {errors.playerIn && <p className="mt-1 text-xs text-red-500">{errors.playerIn}</p>}
          </div>
        )}

        {type === 'salida' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Jugador que Sale
            </label>
            <SearchableSelect
              value={playerOutId}
              onChange={(e) => {
                setPlayerOutId(e.target.value);
                setErrors((prev) => ({ ...prev, playerOut: '' }));
              }}
              className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-[#0a0a0a] ${
                errors.playerOut
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-slate-200 dark:border-white/10'
              }`}
            >
              <option value="">Selecciona jugador en campo...</option>
              {playersOnField.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.dorsal ? `(${p.dorsal})` : ''}
                </option>
              ))}
            </SearchableSelect>
            {errors.playerOut && <p className="mt-1 text-xs text-red-500">{errors.playerOut}</p>}
          </div>
        )}

        {type === 'cambio_formacion' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Nueva Formación
            </label>
            <SearchableSelect
              value={newFormation}
              onChange={(e) => {
                setNewFormation(e.target.value);
                setErrors((prev) => ({ ...prev, formation: '' }));
              }}
              className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-[#0a0a0a] ${
                errors.formation
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-slate-200 dark:border-white/10'
              }`}
            >
              {formationNames.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </SearchableSelect>
            {errors.formation && <p className="mt-1 text-xs text-red-500">{errors.formation}</p>}
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Descripción (opcional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas sobre el cambio..."
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#0a0a0a] dark:text-slate-200"
            rows={2}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-bold uppercase text-white shadow-sm transition-all hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
        >
          <i className="fa-solid fa-check mr-2" />
          Guardar
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold uppercase text-slate-700 transition-all hover:bg-slate-100 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-slate-300 dark:hover:bg-white/5"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default MatchTacticalEditor;
