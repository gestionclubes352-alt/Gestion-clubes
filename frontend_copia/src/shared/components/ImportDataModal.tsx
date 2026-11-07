/**
 * @fileoverview Modal para importar datos desde CSV/Excel
 * @description Permite cargar datos masivos de forma sencilla con plantillas descargables.
 */

import React, { useState, useRef } from 'react';
import { 
  importData, 
  generateTemplateCSV, 
  downloadCSV,
  CSV_TEMPLATES,
  ImportResult,
  ImportableTable 
} from '@shared/services/importService';

interface ImportDataModalProps {
  onClose: () => void;
  onImportComplete?: (result: ImportResult) => void;
}

const TABLE_LABELS: Record<ImportableTable, string> = {
  players: 'Jugadores',
  staff: 'Personal',
  events: 'Eventos/Calendario',
  competition_teams: 'Equipos Competición',
  matches: 'Partidos'
};

const TABLE_ICONS: Record<ImportableTable, string> = {
  players: '👥',
  staff: '🧑‍💼',
  events: '📅',
  competition_teams: '🏆',
  matches: '⚽'
};

const ImportDataModal: React.FC<ImportDataModalProps> = ({ onClose, onImportComplete }) => {
  const [selectedTable, setSelectedTable] = useState<ImportableTable>('players');
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDownloadTemplate = () => {
    const content = generateTemplateCSV(selectedTable);
    downloadCSV(content, `plantilla_${selectedTable}.csv`);
  };

  const handleImport = async () => {
    if (!csvContent) return;

    setIsLoading(true);
    setResult(null);

    try {
      const importResult = await importData(selectedTable, csvContent);
      setResult(importResult);
      if (onImportComplete) {
        onImportComplete(importResult);
      }
    } catch (err: any) {
      setResult({
        success: false,
        imported: 0,
        errors: [err.message || 'Error desconocido'],
        warnings: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setCsvContent('');
    setFileName('');
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const template = CSV_TEMPLATES[selectedTable];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90dvh] overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📥</span>
              <div>
                <h2 className="text-xl font-bold">Importar Datos</h2>
                <p className="text-sm text-red-100">Carga datos desde archivos CSV</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          
          {/* Selector de tipo de datos */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              ¿Qué quieres importar?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(TABLE_LABELS) as ImportableTable[])
                .filter(t => t !== 'matches')
                .map((table) => (
                <button
                  key={table}
                  onClick={() => {
                    setSelectedTable(table);
                    handleClear();
                  }}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedTable === table
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                      : 'border-slate-200 dark:border-slate-600 hover:border-red-300'
                  }`}
                >
                  <span className="text-xl mr-2">{TABLE_ICONS[table]}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {TABLE_LABELS[table]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Plantilla */}
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Columnas requeridas:
              </span>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar plantilla
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {template.headers.map((header, idx) => (
                <span 
                  key={idx}
                  className={`px-2 py-1 text-xs rounded font-mono ${
                    idx < 3 
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' 
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
                  }`}
                >
                  {header}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Las columnas en rojo son obligatorias
            </p>
          </div>

          {/* Zona de carga de archivo */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Archivo CSV
            </label>
            
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                fileName 
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/20' 
                  : 'border-slate-300 dark:border-slate-600 hover:border-red-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-input"
              />
              
              {fileName ? (
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-left">
                    <p className="font-medium text-slate-700 dark:text-slate-200">{fileName}</p>
                    <button 
                      onClick={handleClear}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      Cambiar archivo
                    </button>
                  </div>
                </div>
              ) : (
                <label htmlFor="csv-input" className="cursor-pointer">
                  <svg className="w-12 h-12 mx-auto text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-slate-600 dark:text-slate-300 mb-1">
                    Arrastra un archivo CSV aquí o <span className="text-red-600 font-medium">haz clic para seleccionar</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Formatos: .csv (separado por comas o punto y coma)
                  </p>
                </label>
              )}
            </div>
          </div>

          {/* Resultado */}
          {result && (
            <div className={`mb-6 p-4 rounded-lg ${
              result.success 
                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200' 
                : 'bg-red-50 dark:bg-red-900/30 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.success 
                      ? `✓ Importados ${result.imported} registros correctamente`
                      : 'Error en la importación'
                    }
                  </p>
                  
                  {result.errors.length > 0 && (
                    <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                      {result.errors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>...y {result.errors.length - 5} errores más</li>
                      )}
                    </ul>
                  )}
                  
                  {result.warnings.length > 0 && (
                    <ul className="mt-2 text-sm text-amber-600 list-disc list-inside">
                      {result.warnings.slice(0, 3).map((warn, idx) => (
                        <li key={idx}>{warn}</li>
                      ))}
                      {result.warnings.length > 3 && (
                        <li>...y {result.warnings.length - 3} avisos más</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleImport}
              disabled={!csvContent || isLoading}
              className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                csvContent && !isLoading
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Importando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Importar Datos
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportDataModal;
