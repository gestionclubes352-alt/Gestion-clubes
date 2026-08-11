import React, { useEffect, useMemo, useRef, useState } from 'react';

type NativeSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size'>;

interface ParsedOption {
  value: string;
  label: React.ReactNode;
  searchText: string;
  disabled?: boolean;
  group?: string;
}

const textFromNode = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join(' ');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textFromNode(node.props.children);
  return '';
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const parseOption = (child: React.ReactElement<any>, group?: string): ParsedOption | null => {
  if (child.type !== 'option') return null;
  const value = child.props.value === undefined ? textFromNode(child.props.children) : String(child.props.value);
  const label = child.props.children ?? child.props.label ?? value;
  const searchText = `${child.props.label ?? ''} ${textFromNode(label)} ${value}`;

  return {
    value,
    label,
    searchText,
    disabled: child.props.disabled,
    group,
  };
};

const parseOptions = (children: React.ReactNode): ParsedOption[] => {
  const parsed: ParsedOption[] = [];

  React.Children.forEach(children, child => {
    if (!React.isValidElement<any>(child)) return;

    if (child.type === 'optgroup') {
      const group = String(child.props.label ?? '');
      React.Children.forEach(child.props.children, optionChild => {
        if (!React.isValidElement<any>(optionChild)) return;
        const option = parseOption(optionChild, group);
        if (option) parsed.push(option);
      });
      return;
    }

    const option = parseOption(child);
    if (option) parsed.push(option);
  });

  return parsed;
};

const getLayoutClassName = (className?: string) => {
  if (!className) return '';
  return className
    .split(/\s+/)
    .filter(token =>
      /^(?:w-|min-w-|max-w-|flex-|basis-|grow|shrink|self-|justify-self-|col-span-)/.test(token) ||
      /^(?:sm|md|lg|xl|2xl):(?:w-|min-w-|max-w-|flex-|basis-|grow|shrink|self-|justify-self-|col-span-)/.test(token)
    )
    .join(' ');
};

const SearchableSelect: React.FC<NativeSelectProps> = ({
  children,
  className = '',
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  disabled,
  placeholder,
  id,
  name,
  required,
  ...selectProps
}) => {
  const options = useMemo(() => parseOptions(children), [children]);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() =>
    defaultValue === undefined || Array.isArray(defaultValue) ? '' : String(defaultValue)
  );
  const selectedValue = isControlled ? String(value ?? '') : internalValue;
  const selectedOption = options.find(option => option.value === selectedValue);
  const selectedLabel = selectedOption?.label ?? placeholder ?? options.find(option => option.value === '')?.label ?? 'Seleccionar...';

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const hiddenSelectRef = useRef<HTMLSelectElement>(null);

  const filteredOptions = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return options;
    return options.filter(option => normalize(option.searchText).includes(needle));
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

  const emitChange = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue);
    if (!hiddenSelectRef.current) return;

    const selectEl = hiddenSelectRef.current;
    selectEl.value = nextValue;
    onChange?.({
      target: selectEl,
      currentTarget: selectEl,
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  const handleSelect = (option: ParsedOption) => {
    if (option.disabled || disabled) return;
    emitChange(option.value);
    setIsOpen(false);
    setQuery('');
  };

  const optionGroups = useMemo(() => {
    const groups: Array<{ label?: string; options: ParsedOption[] }> = [];
    filteredOptions.forEach(option => {
      const last = groups[groups.length - 1];
      if (last && last.label === option.group) {
        last.options.push(option);
      } else {
        groups.push({ label: option.group, options: [option] });
      }
    });
    return groups;
  }, [filteredOptions]);

  return (
    <div ref={rootRef} className={`relative min-w-0 ${getLayoutClassName(className)}`}>
      <select
        {...selectProps}
        ref={hiddenSelectRef}
        name={name}
        required={required}
        disabled={disabled}
        value={selectedValue}
        onChange={onChange}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      >
        {children}
      </select>

      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onFocus={onFocus as React.FocusEventHandler<HTMLButtonElement>}
        onBlur={onBlur as React.FocusEventHandler<HTMLButtonElement>}
        onClick={() => {
          if (disabled) return;
          setIsOpen(open => !open);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
            setQuery('');
          } else if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className={`${className} flex items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <i className="fa-solid fa-magnifying-glass text-[11px] text-slate-400 shrink-0" aria-hidden="true"></i>
        <span className={`min-w-0 flex-1 truncate ${selectedValue ? '' : 'text-slate-400'}`}>{selectedLabel}</span>
        <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true"></i>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-[1000] mt-1 w-max overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
          style={{
            minWidth: 'max(12rem, 100%)',
            maxWidth: 'min(22rem, calc(100vw - 2rem))',
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

          <div role="listbox" className="max-h-64 overflow-y-auto py-1">
            {optionGroups.length === 0 ? (
              <div className="px-3 py-3 text-sm font-semibold text-slate-400">Sin resultados</div>
            ) : (
              optionGroups.map((group, groupIndex) => (
                <div key={`${group.label ?? 'root'}-${groupIndex}`}>
                  {group.label && (
                    <div className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {group.label}
                    </div>
                  )}
                  {group.options.map(option => (
                    <button
                      key={`${group.label ?? ''}-${option.value}`}
                      type="button"
                      role="option"
                      aria-selected={option.value === selectedValue}
                      disabled={option.disabled}
                      onClick={() => handleSelect(option)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold transition-colors ${
                        option.value === selectedValue
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      } disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">{option.label}</span>
                      {option.value === selectedValue && (
                        <i className="fa-solid fa-check text-[10px] text-blue-600" aria-hidden="true"></i>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
