import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface MultiSelectFilterOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  options: MultiSelectFilterOption[];
  /** Vacío = "Todos" (sin filtrar). */
  value: string[];
  onChange: (values: string[]) => void;
  allLabel?: string;
  className?: string;
  disabled?: boolean;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Select de filtro con selección múltiple mediante checkboxes, con buscador.
 * Un array vacío representa "Todos" (sin filtrar).
 */
const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  options,
  value,
  onChange,
  allLabel = 'Todos',
  className = '',
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filteredOptions = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return options;
    return options.filter((option) => normalize(option.label).includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current || rootRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
      setQuery('');
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (selectedSet.has(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setIsOpen(false);
    setQuery('');
  };

  const summaryLabel = useMemo(() => {
    if (value.length === 0) return allLabel;
    if (value.length === 1) {
      return options.find((o) => o.value === value[0])?.label ?? value[0];
    }
    return `${value.length} seleccionados`;
  }, [value, options, allLabel]);

  const getDropdownPosition = () => {
    if (!rootRef.current) return { top: 0, left: 0 };
    const rect = rootRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY,
      left: Math.max(0, rect.right - 300 + window.scrollX),
    };
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (disabled) return;
          setIsOpen((open) => !open);
        }}
        className={`${className} flex items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <i className="fa-solid fa-magnifying-glass text-[11px] text-slate-400 shrink-0" aria-hidden="true"></i>
        <span className={`min-w-0 flex-1 truncate ${value.length === 0 ? 'text-slate-400' : ''}`}>{summaryLabel}</span>
        <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true"></i>
      </button>

      {isOpen && (() => {
        const pos = getDropdownPosition();
        return (
          <div
            className="fixed z-[2000] mt-1 w-max overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
            style={{
              top: `${pos.top}px`,
              left: `${pos.left}px`,
              minWidth: '10rem',
              maxWidth: 'min(18rem, calc(100vw - 2rem))',
            }}
          >
            <div className="relative border-b border-slate-100">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400" aria-hidden="true"></i>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setIsOpen(false);
                    setQuery('');
                  }
                }}
                placeholder="Buscar..."
                className="w-full border-0 bg-white py-2.5 pl-8 pr-3 text-sm font-semibold text-slate-900 outline-none"
              />
            </div>

            <div role="listbox" aria-multiselectable="true" className="max-h-56 overflow-y-auto py-1">
              <button
                type="button"
                role="option"
                aria-selected={value.length === 0}
                onClick={clearAll}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-bold transition-colors ${
                  value.length === 0 ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">{allLabel}</span>
                {value.length === 0 && <i className="fa-solid fa-check text-[10px] text-blue-600" aria-hidden="true"></i>}
              </button>

              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm font-semibold text-slate-400">Sin resultados</div>
              ) : (
                filteredOptions.map((option) => {
                  const checked = selectedSet.has(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onClick={() => toggleOption(option.value)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-bold transition-colors ${
                        checked ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                          checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {checked && <i className="fa-solid fa-check text-[8px] text-white" aria-hidden="true"></i>}
                      </span>
                      <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default MultiSelectFilter;
