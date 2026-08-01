/**
 * @fileoverview Componente de configuración de fuentes de datos
 */

import React, { useState, useEffect } from 'react';
import { useDataSource, DataSourceType, DataSourceOption } from '@context/index';
import { googleSheetsService, extractSpreadsheetId, db } from '@shared/services';
import type { SheetPreview, ImportableTable, SheetImportResult } from '@shared/services';
import { migrateLocalStorageToFirestore, countFirestoreDocs, type MigrationResult } from '@shared/services/migrateToFirestore';

type ImportMode = 'add' | 'replace' | 'sync';

interface DataSourceCardProps {
  source: DataSourceOption;
  isActive: boolean;
  onSelect: () => void;
}

const DataSourceCard: React.FC<DataSourceCardProps> = ({ source, isActive, onSelect }) => {
  const statusColors = {
    connected: 'bg-green-500',
    disconnected: 'bg-slate-300',
    error: 'bg-red-500'
  };

  const statusLabels = {
    connected: 'Conectado',
    disconnected: 'Desconectado',
    error: 'Error'
  };

  return (
    <div
      onClick={onSelect}
      className={`
        relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300
        ${isActive 
          ? 'border-[var(--accent)] bg-red-50 shadow-lg shadow-[var(--accent)]/20' 
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
        }
      `}
    >
      {/* Indicador activo */}
      {isActive && (
        <div className="absolute top-4 right-4">
          <div className="w-6 h-6 bg-[var(--accent)] rounded-full flex items-center justify-center">
            <i className="fa-solid fa-check text-white text-xs"></i>
          </div>
        </div>
      )}

      {/* Icono */}
      <div className={`
        w-14 h-14 rounded-2xl flex items-center justify-center mb-4
        ${isActive ? 'bg-[var(--accent)] text-white' : 'bg-slate-100 text-slate-500'}
      `}>
        <i className={`fa-solid ${source.icon} text-2xl`}></i>
      </div>

      {/* Info */}
      <h4 className={`text-lg font-black mb-1 ${isActive ? 'text-[var(--accent)]' : 'text-slate-700'}`}>
        {source.name}
      </h4>
      <p className="text-sm text-slate-500 mb-4">
        {source.description}
      </p>

      {/* Estado */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusColors[source.status]}`}></div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {statusLabels[source.status]}
        </span>
      </div>
    </div>
  );
};

const DataSourceSettings: React.FC = () => {
  const { activeSource, sources, setActiveSource, checkConnection } = useDataSource();
  const [isChecking, setIsChecking] = useState<DataSourceType | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  // --- Google Sheets state ---
  const [sheetUrl, setSheetUrl] = useState(googleSheetsService.getSavedUrl() || '');
  const [sheetPreview, setSheetPreview] = useState<SheetPreview | null>(null);
  const [sheetDetectedType, setSheetDetectedType] = useState<ImportableTable | null>(null);
  const [sheetTableOverride, setSheetTableOverride] = useState<ImportableTable | ''>('');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetImportResult, setSheetImportResult] = useState<SheetImportResult | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('add');

  const handleSheetPreview = async () => {
    if (!sheetUrl.trim()) return;
    setSheetLoading(true);
    setSheetError(null);
    setSheetPreview(null);
    setSheetImportResult(null);
    try {
      const preview = await googleSheetsService.previewSheet({ url: sheetUrl });
      setSheetPreview(preview);
      const detected = googleSheetsService.detectTableType(preview.headers);
      setSheetDetectedType(detected);
      setSheetTableOverride(detected || '');
      googleSheetsService.saveUrl(sheetUrl);
    } catch (err: any) {
      setSheetError(err.message || 'Error al acceder a la hoja de cálculo');
    } finally {
      setSheetLoading(false);
    }
  };

  const handleSheetImport = async () => {
    if (!sheetUrl.trim()) return;
    setSheetLoading(true);
    setSheetError(null);
    setSheetImportResult(null);
    try {
      const table = (sheetTableOverride || sheetDetectedType) as ImportableTable;

      // En modo "replace" o "sync", primero borrar los datos existentes de esa tabla
      if (importMode === 'replace' || importMode === 'sync') {
        try {
          const store = db[table as keyof typeof db] as any;
          if (store?.clear) {
            await store.clear();
          } else {
            // Fallback: obtener todos y eliminar uno a uno
            const { data: existing } = await store.get();
            if (existing?.length) {
              for (const item of existing) {
                if (store.delete) await store.delete(item.id);
              }
            }
          }
        } catch {
          // Si no se puede borrar, continuar con la importación normal
        }
      }

      const result = await googleSheetsService.importFromSheet({ url: sheetUrl }, table || undefined);

      // Ajustar el mensaje según el modo
      if (result.success && importMode === 'replace') {
        result.warnings.unshift('Se eliminaron los datos anteriores antes de importar.');
      } else if (result.success && importMode === 'sync') {
        result.warnings.unshift('Sincronización completa: datos reemplazados con la versión de Google Sheets.');
      }

      setSheetImportResult(result);

      // Si la importación fue exitosa, cambiar la fuente activa a database
      // para que el usuario vea los datos importados
      if (result.success) {
        setActiveSource('database');
      }
    } catch (err: any) {
      setSheetError(err.message || 'Error al importar');
    } finally {
      setSheetLoading(false);
    }
  };

  const handleSourceSelect = async (sourceId: DataSourceType) => {
    setIsChecking(sourceId);
    const isConnected = await checkConnection(sourceId);
    // Permitir seleccionar Google Sheets y CSV aunque no estén conectados
    if (isConnected || sourceId === 'csv' || sourceId === 'google-sheets') {
      setActiveSource(sourceId);
    }
    setIsChecking(null);
  };

  return (
    <div className="space-y-8">
      {/* Header de la sección */}
      <div className="border-b border-slate-200 pb-6">
        <h3 className="text-2xl font-black text-slate-800 mb-2">Fuentes de Datos</h3>
        <p className="text-slate-500">
          Selecciona de dónde obtener los datos de la aplicación. 
          Por defecto se utilizan los datos de la base de datos.
        </p>
      </div>

      {/* Grid de fuentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sources.map(source => (
          <DataSourceCard
            key={source.id}
            source={source}
            isActive={activeSource === source.id}
            onSelect={() => handleSourceSelect(source.id)}
          />
        ))}
      </div>

      {/* Detalles de la fuente activa */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-circle-info text-[var(--accent)]"></i>
          Configuración de la fuente activa
        </h4>

        {activeSource === 'database' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
              <i className="fa-solid fa-cloud text-[var(--accent)]"></i>
              <div>
                <p className="font-semibold text-slate-700">Almacenamiento Local</p>
                <p className="text-sm text-slate-500">
                  Los datos se guardan localmente en el navegador.
                  En el futuro se sincronizarán con Firestore.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSource === 'google-sheets' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-3">
                <i className="fa-solid fa-table text-blue-500 mt-0.5"></i>
                <div>
                  <p className="font-semibold text-blue-700">Importar desde Google Sheets</p>
                  <p className="text-sm text-blue-600">
                    Pega la URL de tu hoja de Google Sheets. Debe estar compartida con
                    &quot;Cualquier persona con el enlace&quot;. Los datos se guardarán en la base de datos local
                    y podrás actualizarlos, añadir o reemplazar cuando quieras.
                  </p>
                </div>
              </div>
            </div>

            {/* URL input */}
            <div className="flex gap-3">
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => { setSheetUrl(e.target.value); setSheetError(null); }}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              <button
                onClick={handleSheetPreview}
                disabled={sheetLoading || !sheetUrl.trim()}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sheetLoading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-eye"></i>
                )}
                Previsualizar
              </button>
            </div>

            {/* Errores */}
            {sheetError && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-start gap-3">
                <i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5"></i>
                <p className="text-sm text-red-600">{sheetError}</p>
              </div>
            )}

            {/* Preview */}
            {sheetPreview && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-600">
                    <i className="fa-solid fa-table-cells mr-2"></i>
                    {sheetPreview.totalRows} filas encontradas
                  </p>
                  {sheetDetectedType && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">
                      Detectado: {sheetDetectedType}
                    </span>
                  )}
                </div>

                {/* Tabla de preview */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        {sheetPreview.headers.map((h, i) => (
                          <th key={i} className="px-4 py-2 text-left font-bold text-slate-600 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheetPreview.rows.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-4 py-2 text-slate-700 whitespace-nowrap">
                              {cell || <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Selector de tipo */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-semibold text-slate-600">Importar como:</label>
                  <select
                    value={sheetTableOverride}
                    onChange={(e) => setSheetTableOverride(e.target.value as ImportableTable)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">— Auto-detectar —</option>
                    <option value="players">Jugadores</option>
                    <option value="staff">Staff / Personal</option>
                    <option value="competition_teams">Equipos</option>
                    <option value="events">Eventos / Calendario</option>
                    <option value="matches">Partidos</option>
                  </select>
                </div>

                {/* Selector de modo de importación */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-600">Modo de importación:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => setImportMode('add')}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        importMode === 'add'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <i className={`fa-solid fa-plus text-xs ${importMode === 'add' ? 'text-blue-500' : 'text-slate-400'}`}></i>
                        <span className={`text-sm font-bold ${importMode === 'add' ? 'text-blue-700' : 'text-slate-700'}`}>Añadir</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Agrega datos nuevos sin tocar los existentes</p>
                    </button>
                    <button
                      onClick={() => setImportMode('replace')}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        importMode === 'replace'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <i className={`fa-solid fa-arrows-rotate text-xs ${importMode === 'replace' ? 'text-amber-500' : 'text-slate-400'}`}></i>
                        <span className={`text-sm font-bold ${importMode === 'replace' ? 'text-amber-700' : 'text-slate-700'}`}>Reemplazar</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Borra los datos actuales y carga los de la hoja</p>
                    </button>
                    <button
                      onClick={() => setImportMode('sync')}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        importMode === 'sync'
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <i className={`fa-solid fa-cloud-arrow-down text-xs ${importMode === 'sync' ? 'text-green-500' : 'text-slate-400'}`}></i>
                        <span className={`text-sm font-bold ${importMode === 'sync' ? 'text-green-700' : 'text-slate-700'}`}>Sincronizar</span>
                      </div>
                      <p className="text-[11px] text-slate-500">La hoja de Google es la fuente de verdad</p>
                    </button>
                  </div>
                </div>

                {/* Botón importar */}
                <button
                  onClick={handleSheetImport}
                  disabled={sheetLoading}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 text-white rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 ${
                    importMode === 'replace'
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                      : importMode === 'sync'
                      ? 'bg-green-600 hover:bg-green-700 shadow-green-600/30'
                      : 'bg-[var(--accent)] hover:bg-[var(--accent-dark)] shadow-[var(--accent)]/30'
                  }`}
                >
                  {sheetLoading ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className={`fa-solid ${
                      importMode === 'add' ? 'fa-plus' : importMode === 'replace' ? 'fa-arrows-rotate' : 'fa-cloud-arrow-down'
                    }`}></i>
                  )}
                  {importMode === 'add' && 'Añadir datos desde Google Sheets'}
                  {importMode === 'replace' && 'Reemplazar datos con Google Sheets'}
                  {importMode === 'sync' && 'Sincronizar desde Google Sheets'}
                </button>

                {importMode !== 'add' && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5 text-xs"></i>
                    <p className="text-xs text-amber-700">
                      {importMode === 'replace'
                        ? 'Se eliminarán todos los datos actuales de esta tabla antes de importar los nuevos.'
                        : 'La hoja de Google será la fuente de verdad. Los datos actuales se reemplazarán completamente.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Resultado de importación */}
            {sheetImportResult && (
              <div className={`p-4 rounded-xl border ${
                sheetImportResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  <i className={`fa-solid ${
                    sheetImportResult.success ? 'fa-circle-check text-green-500' : 'fa-circle-xmark text-red-500'
                  } mt-0.5`}></i>
                  <div>
                    <p className={`font-semibold ${
                      sheetImportResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {sheetImportResult.success
                        ? `¡${sheetImportResult.imported} registros guardados en la base de datos!`
                        : 'Error en la importación'
                      }
                    </p>
                    {sheetImportResult.success && (
                      <p className="text-sm text-green-600 mt-1">
                        Los datos ya están disponibles en la aplicación. Se ha cambiado la fuente activa a Base de Datos.
                      </p>
                    )}
                    {sheetImportResult.errors.length > 0 && (
                      <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                        {sheetImportResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    )}
                    {sheetImportResult.warnings.length > 0 && (
                      <ul className="mt-2 text-sm text-yellow-600 list-disc list-inside">
                        {sheetImportResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSource === 'csv' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-start gap-3">
                <i className="fa-solid fa-file-csv text-green-500 mt-0.5"></i>
                <div>
                  <p className="font-semibold text-green-700">Importar desde CSV</p>
                  <p className="text-sm text-green-600">
                    Puedes importar jugadores, staff, equipos y eventos desde archivos CSV.
                    Descarga las plantillas de ejemplo para ver el formato correcto.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/templates/ejemplo_jugadores.csv"
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <i className="fa-solid fa-download text-xs"></i>
                Plantilla Jugadores
              </a>
              <a
                href="/templates/ejemplo_staff.csv"
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <i className="fa-solid fa-download text-xs"></i>
                Plantilla Staff
              </a>
              <a
                href="/templates/ejemplo_equipos.csv"
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <i className="fa-solid fa-download text-xs"></i>
                Plantilla Equipos
              </a>
              <a
                href="/templates/ejemplo_eventos.csv"
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <i className="fa-solid fa-download text-xs"></i>
                Plantilla Eventos
              </a>
            </div>

            <button
              onClick={() => setShowCsvImport(true)}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[var(--accent)] text-white rounded-xl font-bold hover:bg-[var(--accent-dark)] transition-all shadow-lg shadow-[var(--accent)]/30"
            >
              <i className="fa-solid fa-upload"></i>
              Importar archivo CSV
            </button>
          </div>
        )}

      </div>\n\n      {/* ── Migración a Firestore ────────────────── */}
      <MigrateToFirestoreSection />

      {/* Loading overlay */}
      {isChecking && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex items-center gap-4">
            <i className="fa-solid fa-spinner fa-spin text-[var(--accent)] text-xl"></i>
            <span className="font-semibold text-slate-700">Verificando conexión...</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sección de migración localStorage → Firestore ──────────
const MigrateToFirestoreSection: React.FC = () => {
  const [migrating, setMigrating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<MigrationResult[] | null>(null);
  const [firestoreCounts, setFirestoreCounts] = useState<Record<string, number> | null>(null);

  const handleMigrate = async () => {
    if (!window.confirm('¿Migrar todos los datos locales a Firestore? Los datos existentes en Firestore se sobrescribirán.')) return;
    setMigrating(true);
    setLogs([]);
    setResults(null);
    try {
      const res = await migrateLocalStorageToFirestore((msg) => {
        setLogs(prev => [...prev, msg]);
      });
      setResults(res);
      // Verificar en Firestore
      const counts = await countFirestoreDocs();
      setFirestoreCounts(counts);
    } catch (err: any) {
      setLogs(prev => [...prev, `❌ Error general: ${err.message}`]);
    } finally {
      setMigrating(false);
    }
  };

  const handleCheckCounts = async () => {
    setFirestoreCounts(null);
    const counts = await countFirestoreDocs();
    setFirestoreCounts(counts);
  };

  return (
    <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center">
          <i className="fa-solid fa-cloud-arrow-up text-lg"></i>
        </div>
        <div>
          <h4 className="text-lg font-black text-slate-800">Migrar a Firestore</h4>
          <p className="text-sm text-slate-500">Sube los datos locales (localStorage) a la base de datos en la nube</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={handleMigrate}
          disabled={migrating}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg"
        >
          {migrating ? (
            <><i className="fa-solid fa-spinner fa-spin"></i> Migrando...</>
          ) : (
            <><i className="fa-solid fa-upload"></i> Migrar datos a Firestore</>
          )}
        </button>
        <button
          onClick={handleCheckCounts}
          className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all"
        >
          <i className="fa-solid fa-magnifying-glass"></i> Ver datos en Firestore
        </button>
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-slate-900 text-green-400 rounded-xl p-4 font-mono text-xs max-h-48 overflow-y-auto mb-4">
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {/* Resultados */}
      {results && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {results.map(r => (
            <div key={r.collection} className={`p-3 rounded-xl border ${r.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="font-bold text-sm text-slate-700">{r.collection}</div>
              <div className={`text-lg font-black ${r.success ? 'text-green-600' : 'text-red-600'}`}>
                {r.success ? `${r.count} docs` : 'Error'}
              </div>
              {r.error && <div className="text-xs text-red-500 mt-1">{r.error}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Conteo de Firestore */}
      {firestoreCounts && (
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <h5 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Documentos en Firestore</h5>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {Object.entries(firestoreCounts).map(([col, count]) => (
              <div key={col} className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-xs font-semibold text-slate-500">{col}</div>
                <div className="text-lg font-black text-slate-800">{count >= 0 ? count : '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSourceSettings;
