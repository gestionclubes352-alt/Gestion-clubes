/**
 * @fileoverview Servicio para importar datos desde Google Sheets públicas
 * @description Convierte URLs de Google Sheets a CSV público y reutiliza
 * la infraestructura de parsing CSV existente.
 *
 * Requisito: la hoja debe ser compartida con "Cualquier persona con el enlace".
 */

import { parseCSV, importPlayers, importStaff, importEvents, importTeams } from './importService';
import type { ImportResult, ImportableTable } from './importService';

// ============================================================================
// TIPOS
// ============================================================================

export interface GoogleSheetConfig {
  /** URL completa de Google Sheets o solo el spreadsheetId */
  url: string;
  /** Nombre o GID de la pestaña (hoja). Si no se indica se usa la primera. */
  sheetName?: string;
  /** GID numérico de la pestaña */
  gid?: number;
}

export interface SheetPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export interface SheetImportResult extends ImportResult {
  sheetUrl: string;
  sheetName?: string;
}

// Mapping de nombre de pestaña a tabla importable
export const SHEET_TAB_MAPPING: Record<string, ImportableTable> = {
  jugadores: 'players',
  players: 'players',
  plantilla: 'players',
  staff: 'staff',
  cuerpo_tecnico: 'staff',
  equipos: 'competition_teams',
  teams: 'competition_teams',
  eventos: 'events',
  events: 'events',
  calendario: 'events',
  partidos: 'matches',
  matches: 'matches',
};

const STORAGE_KEY = 'sport_management_gsheets_url';

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Extrae el spreadsheetId de una URL de Google Sheets.
 * Soporta formatos:
 *  - https://docs.google.com/spreadsheets/d/{id}/edit...
 *  - https://docs.google.com/spreadsheets/d/{id}
 *  - id directo (44 caracteres alfanuméricos)
 */
export function extractSpreadsheetId(input: string): string | null {
  // Si ya es un ID puro
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) {
    return input.trim();
  }

  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

/**
 * Extrae el gid de la URL (parámetro #gid=xxx)
 */
export function extractGid(url: string): number | null {
  const match = url.match(/[#&?]gid=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Construye la URL de exportación CSV pública de Google Sheets.
 */
export function buildCsvExportUrl(spreadsheetId: string, gid?: number): string {
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  return gid != null ? `${base}&gid=${gid}` : base;
}

/**
 * Construye la URL para listar las hojas de un spreadsheet (JSON público).
 */
export function buildSheetListUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&tq=SELECT%20*%20LIMIT%200`;
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

class GoogleSheetsService {
  private savedUrl: string | null = null;

  constructor() {
    try {
      this.savedUrl = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Sin acceso a localStorage
    }
  }

  /** Guarda la URL del spreadsheet para uso futuro */
  saveUrl(url: string): void {
    this.savedUrl = url;
    try {
      localStorage.setItem(STORAGE_KEY, url);
    } catch {
      // noop
    }
  }

  /** Recupera la URL guardada */
  getSavedUrl(): string | null {
    return this.savedUrl;
  }

  /** Limpia la URL guardada */
  clearUrl(): void {
    this.savedUrl = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }
  }

  /**
   * Descarga el contenido CSV de una hoja de Google Sheets.
   * La hoja debe estar compartida públicamente ("Cualquier persona con el enlace").
   */
  async fetchSheetAsCSV(config: GoogleSheetConfig): Promise<string> {
    const spreadsheetId = extractSpreadsheetId(config.url);
    if (!spreadsheetId) {
      throw new Error('URL de Google Sheets no válida. Asegúrate de copiar la URL completa.');
    }

    const gid = config.gid ?? extractGid(config.url) ?? undefined;
    const exportUrl = buildCsvExportUrl(spreadsheetId, gid);

    const response = await fetch(exportUrl);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Hoja de cálculo no encontrada. Verifica el enlace.');
      }
      if (response.status === 403 || response.status === 401) {
        throw new Error(
          'Sin acceso a la hoja. Asegúrate de que esté compartida con "Cualquier persona con el enlace".'
        );
      }
      throw new Error(`Error al descargar la hoja (HTTP ${response.status}).`);
    }

    const text = await response.text();
    if (!text.trim()) {
      throw new Error('La hoja de cálculo está vacía.');
    }

    return text;
  }

  /**
   * Previsualiza las primeras filas de una hoja.
   */
  async previewSheet(config: GoogleSheetConfig, maxRows = 5): Promise<SheetPreview> {
    const csvContent = await this.fetchSheetAsCSV(config);
    const lines = csvContent.trim().split('\n');

    if (lines.length < 1) {
      throw new Error('La hoja no contiene datos.');
    }

    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));

    const rows: string[][] = [];
    for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
      const vals = lines[i].split(separator).map(v => v.trim().replace(/"/g, ''));
      rows.push(vals);
    }

    return {
      headers,
      rows,
      totalRows: lines.length - 1 // sin contar cabecera
    };
  }

  /**
   * Detecta automáticamente qué tipo de tabla es basándose en las cabeceras.
   */
  detectTableType(headers: string[]): ImportableTable | null {
    const lower = headers.map(h => h.toLowerCase().trim());

    if (lower.includes('dorsal') && (lower.includes('nombre') || lower.includes('nombre y apellido'))) {
      return 'players';
    }
    if (lower.includes('rol') && lower.includes('nombre')) {
      return 'staff';
    }
    if (lower.includes('title') && lower.includes('type') && lower.includes('date')) {
      return 'events';
    }
    if (lower.includes('titulo') && lower.includes('tipo') && lower.includes('fecha')) {
      return 'events';
    }
    if (lower.includes('estadio') || lower.includes('localidad')) {
      return 'competition_teams';
    }
    if (lower.includes('opponent') || lower.includes('jornada')) {
      return 'matches';
    }

    return null;
  }

  /**
   * Importa datos desde Google Sheets detectando automáticamente el tipo.
   */
  async importFromSheet(
    config: GoogleSheetConfig,
    tableOverride?: ImportableTable
  ): Promise<SheetImportResult> {
    const csvContent = await this.fetchSheetAsCSV(config);
    const { data } = parseCSV(csvContent);

    // Detectar tipo si no se indica explícitamente
    const lines = csvContent.trim().split('\n');
    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));

    const table = tableOverride ?? this.detectTableType(headers);
    if (!table) {
      return {
        success: false,
        imported: 0,
        errors: [
          'No se pudo detectar el tipo de datos. Asegúrate de que las cabeceras coincidan con las plantillas (dorsal, nombre, posicion para jugadores; rol, nombre para staff; etc.).'
        ],
        warnings: [],
        sheetUrl: config.url,
        sheetName: config.sheetName
      };
    }

    let result: ImportResult;
    switch (table) {
      case 'players':
        result = await importPlayers(csvContent);
        break;
      case 'staff':
        result = await importStaff(csvContent);
        break;
      case 'events':
        result = await importEvents(csvContent);
        break;
      case 'competition_teams':
        result = await importTeams(csvContent);
        break;
      default:
        result = { success: false, imported: 0, errors: ['Tipo no soportado'], warnings: [] };
    }

    return {
      ...result,
      sheetUrl: config.url,
      sheetName: config.sheetName
    };
  }

  /**
   * Importa múltiples pestañas de un mismo spreadsheet.
   * Recibe un mapping pestaña → tipo de tabla.
   */
  async importMultipleTabs(
    spreadsheetUrl: string,
    tabs: Array<{ gid: number; name: string; table: ImportableTable }>
  ): Promise<SheetImportResult[]> {
    const results: SheetImportResult[] = [];

    for (const tab of tabs) {
      const result = await this.importFromSheet(
        { url: spreadsheetUrl, gid: tab.gid, sheetName: tab.name },
        tab.table
      );
      results.push(result);
    }

    return results;
  }
}

// Singleton
export const googleSheetsService = new GoogleSheetsService();
