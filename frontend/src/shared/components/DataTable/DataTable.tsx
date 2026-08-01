import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type Row,
  type Table,
} from '@tanstack/react-table';

// ============================================================================
// TYPES
// ============================================================================

export interface DataTableAction<T> {
  icon: string;
  label: string;
  onClick: (row: T) => void;
  hidden?: (row: T) => boolean;
  danger?: boolean;
}

export interface DataTableProps<T> {
  /** Data array to render */
  data: T[];
  /** TanStack column definitions */
  columns: ColumnDef<T, any>[];
  /** Enable global search bar */
  searchable?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Enable column sorting */
  sortable?: boolean;
  /** Enable pagination */
  paginated?: boolean;
  /** Default page size */
  pageSize?: number;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Enable CSV export */
  exportable?: boolean;
  /** Export filename (without extension) */
  exportFilename?: string;
  /** Show loading skeleton */
  loading?: boolean;
  /** Number of skeleton rows to show */
  skeletonRows?: number;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Custom empty state icon */
  emptyIcon?: string;
  /** Row actions (edit, delete, etc.) */
  actions?: DataTableAction<T>[];
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Enable row selection with checkboxes */
  selectable?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (selectedRows: T[]) => void;
  /** Custom row className based on row data */
  rowClassName?: (row: T) => string;
  /** Toolbar extra content (rendered before search) */
  toolbarLeft?: React.ReactNode;
  /** Toolbar extra content (rendered after export) */
  toolbarRight?: React.ReactNode;
  /** Hide toolbar entirely */
  hideToolbar?: boolean;
  /** Compact mode with smaller padding */
  compact?: boolean;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Max height for scrollable body (e.g., '500px') */
  maxHeight?: string;
  /** Footer content below table */
  footer?: React.ReactNode;
  /** Allow toggling between basic and advanced mode. Default: true when searchable or exportable */
  allowModeToggle?: boolean;
  /** Default mode: 'basic' shows clean table, 'advanced' shows toolbar + pagination. Default: 'advanced' */
  defaultMode?: 'basic' | 'advanced';
}

// ============================================================================
// CSS KEYFRAMES (injected once)
// ============================================================================

const STYLE_ID = 'datatable-animations';
const injectStyles = () => {
  if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes dt-fadeInUp {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes dt-slideDown {
        from { opacity: 0; max-height: 0; }
        to { opacity: 1; max-height: 200px; }
      }
      @keyframes dt-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes dt-pulse-dot {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }
      .dt-row-enter {
        animation: dt-fadeInUp 0.25s ease-out both;
      }
      .dt-toolbar-enter {
        animation: dt-slideDown 0.2s ease-out both;
      }
      .dt-shimmer {
        background: linear-gradient(90deg, var(--surface-1) 25%, var(--surface-2) 50%, var(--surface-1) 75%);
        background-size: 200% 100%;
        animation: dt-shimmer 1.5s ease-in-out infinite;
      }
      .dt-sort-icon {
        transition: transform 0.2s ease, opacity 0.15s ease;
      }
      .dt-page-btn {
        transition: all 0.15s ease;
      }
      .dt-page-btn:active {
        transform: scale(0.92);
      }
      .dt-action-btn {
        transition: all 0.15s ease;
      }
      .dt-action-btn:hover {
        transform: translateY(-1px);
      }
      .dt-action-btn:active {
        transform: translateY(0) scale(0.95);
      }
      .dt-search-input:focus {
        box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.06);
      }
      .dt-export-btn:active {
        transform: scale(0.96);
      }
      .dt-row-hover {
        transition: background-color 0.15s ease, box-shadow 0.15s ease;
      }
      .dt-row-hover:hover {
        box-shadow: inset 3px 0 0 0 #334155;
      }
    `;
    document.head.appendChild(style);
  }
};

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (!direction) {
    return (
      <svg className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover/th:opacity-100 dt-sort-icon" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 3l4 5H4l4-5zM8 13l-4-5h8l-4 5z" />
      </svg>
    );
  }
  return (
    <svg className={`w-3.5 h-3.5 text-slate-700 dt-sort-icon ${direction === 'desc' ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 3l5 6H3l5-6z" />
    </svg>
  );
}

function Skeleton({ rows = 5, columns = 4 }: { rows: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-50">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j} className="px-5 py-3.5">
              <div
                className="dt-shimmer rounded-lg"
                style={{
                  height: j === 0 ? '32px' : '14px',
                  width: j === 0 ? '32px' : `${45 + Math.random() * 40}%`,
                  animationDelay: `${(i * columns + j) * 60}ms`,
                  borderRadius: j === 0 ? '10px' : '8px',
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyState({ message, icon }: { message: string; icon: string }) {
  return (
    <tr>
      <td colSpan={999} className="px-6 py-24 text-center">
        <div className="flex flex-col items-center gap-4 dt-row-enter">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 flex items-center justify-center shadow-sm">
            <i className={`${icon} text-2xl text-slate-300`}></i>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-500 font-medium max-w-[300px]">{message}</p>
            <p className="text-xs text-slate-400">Intenta cambiar los criterios de búsqueda</p>
          </div>
        </div>
      </td>
    </tr>
  );
}

function Pagination<T>({ table, pageSizeOptions }: { table: Table<T>; pageSizeOptions: number[] }) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageSize = table.getState().pagination.pageSize;
  const start = pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalRows);

  if (totalRows === 0) return null;

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (pageCount <= 7) {
      for (let i = 0; i < pageCount; i++) pages.push(i);
    } else {
      pages.push(0);
      if (pageIndex > 2) pages.push('ellipsis');
      for (let i = Math.max(1, pageIndex - 1); i <= Math.min(pageCount - 2, pageIndex + 1); i++) {
        pages.push(i);
      }
      if (pageIndex < pageCount - 3) pages.push('ellipsis');
      pages.push(pageCount - 1);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-[var(--border-soft)] bg-[var(--surface-1)]">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="font-medium">Mostrar</span>
        <select
          value={pageSize}
          onChange={e => table.setPageSize(Number(e.target.value))}
          className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer hover:border-[var(--surface-3)] transition-colors"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <span className="text-slate-400">
          · <span className="font-semibold text-slate-600">{start}–{end}</span> de <span className="font-semibold text-slate-600">{totalRows}</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed dt-page-btn"
          aria-label="Página anterior"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        {getPageNumbers().map((page, i) =>
          page === 'ellipsis' ? (
            <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-slate-300 text-xs select-none">···</span>
          ) : (
            <button
              key={page}
              onClick={() => table.setPageIndex(page as number)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold dt-page-btn ${
                pageIndex === page
                  ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {(page as number) + 1}
            </button>
          )
        )}

        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed dt-page-btn"
          aria-label="Página siguiente"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// CSV EXPORT
// ============================================================================

function exportToCsv<T>(table: Table<T>, filename: string) {
  const headers = table.getHeaderGroups()[0].headers
    .filter(h => h.id !== 'select' && h.id !== 'actions')
    .map(h => {
      const col = h.column.columnDef;
      return typeof col.header === 'string' ? col.header : h.id;
    });

  const rows = table.getFilteredRowModel().rows.map(row =>
    row.getVisibleCells()
      .filter(cell => cell.column.id !== 'select' && cell.column.id !== 'actions')
      .map(cell => {
        const value = cell.getValue();
        const stringVal = value == null ? '' : String(value);
        return stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')
          ? `"${stringVal.replace(/"/g, '""')}"`
          : stringVal;
      })
  );

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function DataTable<T extends Record<string, any>>({
  data,
  columns: userColumns,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  sortable = true,
  paginated = false,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  exportable = false,
  exportFilename = 'export',
  loading = false,
  skeletonRows = 5,
  emptyMessage = 'No se encontraron resultados',
  emptyIcon = 'fa-solid fa-inbox',
  actions,
  onRowClick,
  selectable = false,
  onSelectionChange,
  rowClassName,
  toolbarLeft,
  toolbarRight,
  hideToolbar = false,
  compact = false,
  stickyHeader = false,
  maxHeight,
  footer,
  allowModeToggle,
  defaultMode = 'advanced',
}: DataTableProps<T>) {
  // Inject animations on mount
  useEffect(() => { injectStyles(); }, []);

  const hasAdvancedFeatures = searchable || exportable || paginated;
  const showModeToggle = allowModeToggle ?? hasAdvancedFeatures;
  const [mode, setMode] = useState<'basic' | 'advanced'>(defaultMode);
  const isAdvanced = mode === 'advanced';

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setGlobalFilter(value), 200);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Build columns with optional select/actions
  const columns = useMemo(() => {
    const cols: ColumnDef<T, any>[] = [];

    if (selectable) {
      cols.push({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 rounded-md border-slate-300 text-slate-900 focus:ring-slate-900/20 cursor-pointer accent-slate-900"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 rounded-md border-slate-300 text-slate-900 focus:ring-slate-900/20 cursor-pointer accent-slate-900"
            onClick={e => e.stopPropagation()}
          />
        ),
        size: 40,
        enableSorting: false,
      });
    }

    cols.push(...userColumns);

    if (actions && actions.length > 0) {
      cols.push({
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          const visibleActions = actions.filter(a => !a.hidden || !a.hidden(row.original));
          if (visibleActions.length === 0) return null;
          return (
            <div className="flex items-center justify-end gap-1">
              {visibleActions.map((action, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); action.onClick(row.original); }}
                  className={`dt-action-btn w-8 h-8 flex items-center justify-center rounded-lg border ${
                    action.danger
                      ? 'border-transparent text-slate-300 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                      : 'border-transparent text-slate-300 hover:bg-slate-100 hover:text-slate-600 hover:border-slate-200'
                  }`}
                  title={action.label}
                >
                  <i className={`${action.icon} text-xs`}></i>
                </button>
              ))}
            </div>
          );
        },
        size: actions.length * 36 + 8,
        enableSorting: false,
      });
    }

    return cols;
  }, [userColumns, actions, selectable]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter: isAdvanced ? globalFilter : '',
      columnFilters,
      rowSelection,
      ...(paginated && !isAdvanced ? { pagination: { pageIndex: 0, pageSize: data.length || 100 } } : {}),
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    ...(sortable ? { getSortedRowModel: getSortedRowModel() } : {}),
    ...(searchable ? { getFilteredRowModel: getFilteredRowModel() } : {}),
    ...(paginated ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    enableSorting: sortable,
    enableGlobalFilter: searchable,
    initialState: {
      pagination: { pageSize },
    },
  });

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getSelectedRowModel().rows.map(r => r.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection]);

  const showToolbar = !hideToolbar && (searchable || exportable || toolbarLeft || toolbarRight || showModeToggle);
  const py = compact ? 'py-2' : 'py-2.5 sm:py-3';
  const px = compact ? 'px-3 sm:px-4' : 'px-3 sm:px-5';

  // Results count badge
  const filteredCount = searchable ? table.getFilteredRowModel().rows.length : data.length;
  const isFiltered = isAdvanced && searchInput.length > 0;

  // Mode toggle button component
  const ModeToggle = showModeToggle ? (
    <button
      onClick={() => {
        const next = isAdvanced ? 'basic' : 'advanced';
        setMode(next);
        if (next === 'basic') {
          handleSearchChange('');
        }
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg border dt-page-btn ${
        isAdvanced
          ? 'bg-slate-900 text-white border-slate-800 shadow-sm shadow-slate-900/20'
          : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--border-soft)] hover:text-[var(--text)] hover:border-[var(--surface-3)]'
      }`}
      title={isAdvanced ? 'Simplificar vista' : 'Mostrar búsqueda, paginación y exportación'}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        {isAdvanced ? (
          <path d="M2 4h12M2 8h12M2 12h12" />
        ) : (
          <>
            <path d="M2 3h5M2 7h8M2 11h4" />
            <circle cx="12" cy="7" r="2.5" fill="none" />
          </>
        )}
      </svg>
      {isAdvanced ? 'Básico' : 'Avanzado'}
    </button>
  ) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
      {/* TOOLBAR */}
      {showToolbar && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 border-b border-[var(--border-soft)] bg-[var(--surface-1)] dt-toolbar-enter">
          {toolbarLeft}

          {isAdvanced && searchable && (
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5L14 14" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="dt-search-input w-full pl-9 pr-4 py-2 bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--surface-3)] transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 transition-colors"
                >
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
                </button>
              )}
            </div>
          )}

          {/* Filter feedback + counts */}
          {isAdvanced && isFiltered && (
            <span className="text-[11px] font-medium text-slate-400 tabular-nums">
              {filteredCount} resultado{filteredCount !== 1 ? 's' : ''}
            </span>
          )}

          <div className="flex items-center gap-2 sm:ml-auto">
            {isAdvanced && exportable && (
              <button
                onClick={() => exportToCsv(table, exportFilename)}
                className="dt-export-btn inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-lg hover:bg-[var(--surface-2)] hover:text-[var(--text)] hover:border-[var(--surface-3)] transition-all"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2v8M5 7l3 3 3-3M3 12h10" />
                </svg>
                Exportar
              </button>
            )}
            {toolbarRight}
            {ModeToggle}
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className={`overflow-x-auto -webkit-overflow-scrolling-touch ${maxHeight ? 'overflow-y-auto' : ''}`} style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full" role="table">
          <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-[var(--border-soft)] bg-[var(--surface-1)]">
                {headerGroup.headers.map(header => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={`${px} ${py} text-[10.5px] font-semibold text-slate-400 uppercase tracking-widest text-left group/th select-none ${
                        canSort ? 'cursor-pointer hover:text-slate-600 transition-colors' : ''
                      } ${sorted ? 'text-slate-600' : ''}`}
                      style={header.getSize() !== 150 ? { width: header.getSize() } : undefined}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      <div className="flex items-center gap-1.5">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIcon direction={sorted} />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100/60">
            {loading ? (
              <Skeleton rows={skeletonRows} columns={columns.length} />
            ) : table.getRowModel().rows.length === 0 ? (
              <EmptyState message={emptyMessage} icon={emptyIcon} />
            ) : (
              table.getRowModel().rows.map((row, i) => {
                const customClass = rowClassName ? rowClassName(row.original) : '';
                return (
                  <tr
                    key={row.id}
                    className={`dt-row-enter dt-row-hover ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${
                      row.getIsSelected()
                        ? 'bg-slate-50/80'
                        : 'bg-white'
                    } ${customClass}`}
                    style={{ animationDelay: `${Math.min(i, 15) * 25}ms` }}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className={`${px} ${py} text-sm text-slate-700`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {paginated && isAdvanced && !loading && <Pagination table={table} pageSizeOptions={pageSizeOptions} />}

      {/* FOOTER */}
      {footer}
    </div>
  );
}

export default DataTable;
