import React, { useState, useMemo } from 'react';

/** Opciones base que siempre aparecen en el desplegable de equipos */
const DEFAULT_EQUIPOS = [
  'Primer equipo',
  'Filial',
  'Juvenil A',
  'Juvenil B',
  'Cadete A',
  'Cadete B',
  'Infantil A',
  'Infantil B',
  'Alevín A',
  'Alevín B',
];

interface EquipoSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Equipos adicionales que existan en los datos (se mezclan con los defaults sin duplicados) */
  extraTeams?: string[];
  /** Clases CSS del select */
  className?: string;
  /** Texto del placeholder / opción vacía */
  placeholder?: string;
}

const EquipoSelect: React.FC<EquipoSelectProps> = ({
  value,
  onChange,
  extraTeams = [],
  className = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer',
  placeholder = 'Seleccionar...',
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const options = useMemo(() => {
    const set = new Set<string>(DEFAULT_EQUIPOS);
    extraTeams.forEach(t => { if (t) set.add(t); });
    // Si el valor actual no está en la lista, añadirlo
    if (value && !set.has(value)) set.add(value);
    return Array.from(set);
  }, [extraTeams, value]);

  if (isAdding) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) {
              onChange(newName.trim());
              setIsAdding(false);
              setNewName('');
            } else if (e.key === 'Escape') {
              setIsAdding(false);
              setNewName('');
            }
          }}
          placeholder="Nombre del equipo..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900"
        />
        <button
          type="button"
          onClick={() => {
            if (newName.trim()) {
              onChange(newName.trim());
              setIsAdding(false);
              setNewName('');
            }
          }}
          className="px-3 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-black"
        >
          <i className="fa-solid fa-check"></i>
        </button>
        <button
          type="button"
          onClick={() => { setIsAdding(false); setNewName(''); }}
          className="px-3 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-black"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
    );
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => {
        if (e.target.value === '__ADD_NEW__') {
          setIsAdding(true);
        } else {
          onChange(e.target.value);
        }
      }}
      className={className}
    >
      <option value="">{placeholder}</option>
      {options.map(team => (
        <option key={team} value={team}>{team}</option>
      ))}
      <option value="__ADD_NEW__">+ Añadir nuevo equipo...</option>
    </select>
  );
};

export default EquipoSelect;
