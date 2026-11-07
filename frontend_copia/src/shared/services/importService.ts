/**
 * @fileoverview Servicio de importación de datos desde CSV/Excel
 * @description Permite cargar datos masivos a la aplicación de forma sencilla.
 */

import { db, getActiveTeamId, getTeamConfig, eventosCalendarioService } from './dataService';
import type { EventoCalendario } from './dataService';

// ============================================================================
// TIPOS
// ============================================================================

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
}

export interface CSVParseResult<T> {
  data: T[];
  errors: string[];
}

export type ImportableTable = 'players' | 'staff' | 'events' | 'competition_teams' | 'matches';

// ============================================================================
// PLANTILLAS CSV
// ============================================================================

export const CSV_TEMPLATES: Record<ImportableTable, { headers: string[]; example: string[] }> = {
  players: {
    headers: ['dorsal', 'nombre', 'posicion', 'posicion_juego', 'perfil', 'fecha_nacimiento', 'foto_url', 'equipo', 'etapa', 'temporada', 'nombre_pila', 'primer_apellido', 'segundo_apellido', 'dni', 'otra_demarcacion', 'otra_posicion', 'telefono', 'correo', 'enlace', 'nombre_tutor', 'correo_tutor', 'telefono_tutor'],
    example: ['10', 'EJEMPLO JUGADOR', 'Delantero', 'Extremo Derecho', 'D', '2000-01-15', 'https://i.pravatar.cc/150?u=ejemplo', 'Juvenil A', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  },
  staff: {
    headers: ['rol', 'nombre', 'año', 'telefono', 'email'],
    example: ['ENTRENADOR', 'EJEMPLO TÉCNICO', '1990-05-20', '600123456', 'ejemplo@club.com']
  },
  events: {
    headers: ['title', 'type', 'date', 'time', 'location', 'notes'],
    example: ['Entrenamiento Técnico', 'Entrenamiento', '2026-02-10', '18:00', 'Campo Principal', 'Trabajar posesión']
  },
  competition_teams: {
    headers: ['nombre', 'estadio', 'localidad', 'competicion', 'jornada'],
    example: ['EQUIPO EJEMPLO FC', 'Estadio Municipal', 'Ciudad', 'LIGA', '1']
  },
  matches: {
    headers: ['date', 'opponent', 'competition', 'jornada', 'local_team', 'visitor_team', 'time', 'location', 'status'],
    example: ['2026-03-01', 'RIVAL FC', 'Tercera Federación', 'J20', 'MI EQUIPO', 'RIVAL FC', '17:00', 'Campo Local', 'Upcoming']
  }
};

// ============================================================================
// FUNCIONES DE PARSING CSV
// ============================================================================

/**
 * Parsea un string CSV a un array de objetos
 */
export const parseCSV = <T extends Record<string, unknown>>(
  csvContent: string,
  expectedHeaders?: string[]
): CSVParseResult<T> => {
  const errors: string[] = [];
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    return { data: [], errors: ['El archivo debe tener al menos una cabecera y una fila de datos'] };
  }

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));
  
  if (expectedHeaders) {
    const missing = expectedHeaders.filter(h => !headers.includes(h.toLowerCase()));
    if (missing.length > 0) {
      errors.push(`Columnas requeridas no encontradas: ${missing.join(', ')}`);
    }
  }

  const data: T[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line, separator);
    
    if (values.length !== headers.length) {
      errors.push(`Fila ${i + 1}: Número de columnas incorrecto (${values.length} vs ${headers.length})`);
      continue;
    }
    
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });
    
    data.push(row as T);
  }
  
  return { data, errors };
};

/**
 * Parsea una línea CSV manejando comillas
 */
const parseCSVLine = (line: string, separator: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
};

// ============================================================================
// FUNCIONES DE IMPORTACIÓN
// ============================================================================

/**
 * Importa jugadores desde CSV
 */
export const importPlayers = async (csvContent: string): Promise<ImportResult> => {
  const { data, errors } = parseCSV(csvContent, ['dorsal']);
  
  if (errors.length > 0 && data.length === 0) {
    return { success: false, imported: 0, errors, warnings: [] };
  }

  const warningsList: string[] = [...errors];
  let imported = 0;

  // Helper: buscar un valor en el row normalizando tildes y espacios
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const slugify = (s: string) => normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
  const getField = (row: any, ...keys: string[]): string => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== '') return String(row[k]).trim();
    }
    for (const k of keys) {
      const nk = normalize(k);
      for (const rowKey of Object.keys(row)) {
        if (normalize(rowKey) === nk && row[rowKey] !== undefined && row[rowKey] !== '') {
          return String(row[rowKey]).trim();
        }
      }
    }
    return '';
  };

  const validPlayers = data.map((row: any, idx) => {
    const dorsalRaw = getField(row, 'dorsal');
    const dorsal = parseInt(dorsalRaw, 10);
    if (isNaN(dorsal)) {
      warningsList.push(`Fila ${idx + 2}: Dorsal inválido "${dorsalRaw}"`);
      return null;
    }

    // Mapeo de posición específica (demarcación) → categoría general
    const demarcacionToCategoria: Record<string, string> = {
      'portero': 'Portero',
      'central': 'Defensa', 'lateral': 'Defensa',
      'pivote': 'Medio', 'interior': 'Medio', 'media punta': 'Medio', 'mediapunta': 'Medio',
      'extremo': 'Delantero', 'delantero': 'Delantero', 'delantero centro': 'Delantero',
    };

    // Detectar formato: Google Sheets (tiene "demarcacion") vs CSV estándar
    const rawDemarcacion = getField(row, 'demarcacion');
    const rawPosicionField = getField(row, 'posicion', 'posición');
    const rawPosicionJuegoField = getField(row, 'posicion_juego', 'posicion juego');

    let posicion: string;
    let posicionJuego: string;

    if (rawDemarcacion) {
      // Formato Google Sheets Huesca: "Demarcacion" = posición específica
      const demLower = rawDemarcacion.toLowerCase();
      posicion = demarcacionToCategoria[demLower] || 'Medio';
      posicionJuego = rawDemarcacion; // Guardar el valor original como rol táctico
    } else if (rawPosicionField) {
      const posLower = rawPosicionField.toLowerCase();
      const categoriaDirecta = ['portero', 'defensa', 'medio', 'delantero'].find(c => c === posLower);
      if (categoriaDirecta) {
        posicion = categoriaDirecta.charAt(0).toUpperCase() + categoriaDirecta.slice(1);
        posicionJuego = rawPosicionJuegoField || '';
      } else {
        // Es una posición específica, mapear a categoría
        posicion = demarcacionToCategoria[posLower] || 'Medio';
        posicionJuego = rawPosicionField;
      }
    } else {
      posicion = 'Medio';
      posicionJuego = '';
    }

    // Nombre completo: priorizar "nombre y apellido"; si no, combinar partes
    const fullNameField = getField(row, 'nombre y apellido');
    const firstNameField = getField(row, 'nombre');
    const primerApellido = getField(row, 'primer apellido');
    const segundoApellido = getField(row, 'sgundo apellido', 'segundo apellido');

    let nombreCompleto: string;
    let nombrePila: string | undefined;

    if (fullNameField) {
      nombreCompleto = fullNameField;
      nombrePila = firstNameField || undefined;
    } else if (firstNameField && primerApellido) {
      nombreCompleto = [firstNameField, primerApellido, segundoApellido].filter(Boolean).join(' ');
      nombrePila = firstNameField;
    } else {
      nombreCompleto = firstNameField || `JUGADOR ${dorsal}`;
    }

    const lateralidad = getField(row, 'lateralidad', 'perfil');

    // Normalizar fecha: dd-mm-yyyy o dd/mm/yyyy → yyyy-mm-dd
    const rawFecha = getField(row, 'fecha de nacimiento', 'fecha_nacimiento');
    let fechaNorm: string | null = null;
    if (rawFecha) {
      const match = rawFecha.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (match) {
        fechaNorm = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      } else {
        fechaNorm = rawFecha; // ya es yyyy-mm-dd u otro formato
      }
    }

    // Obtener club y clubId del equipo activo
    const teamId = getActiveTeamId();
    const teamConfig = getTeamConfig();
    const clubName = getField(row, 'club') || teamConfig?.teamName || 'ESCUELA HUESCA';

    const dni = getField(row, 'dni');
    const normalizedDni = dni.trim().toUpperCase().replace(/\s+/g, '');

    const competicion = getField(row, 'competicion') || 'Fútbol Base';
    const equipo = getField(row, 'equipo') || '';
    const anioNacimiento = fechaNorm
      ? parseInt(fechaNorm.slice(0, 4), 10)
      : (parseInt(getField(row, 'año', 'ano'), 10) || undefined);

    return {
      dorsal,
      nombre: nombreCompleto.toUpperCase(),
      apodo: getField(row, 'apodo') || undefined,
      posicion,
      posicionJuego,
      perfil: lateralidad === 'I' || lateralidad?.toLowerCase() === 'zurdo' ? 'I'
            : lateralidad === 'A' || lateralidad?.toLowerCase() === 'ambidiestro' ? 'A' : 'D',
      fechaNacimiento: fechaNorm,
      anioNacimiento,
      fotoUrl: getField(row, 'foto', 'foto_url') || 'N',
      competicion,
      competicionId: getField(row, 'id competicion', 'id competición') || slugify(competicion) || undefined,
      club: clubName,
      clubId: getField(row, 'id club') || teamId || '',
      equipo,
      equipoId: getField(row, 'id equipo huesca', 'id equipo') || slugify(equipo) || undefined,
      // Campos extendidos (Huesca / AppSheet)
      temporada: getField(row, 'temporada') || undefined,
      etapa: getField(row, 'etapa') || undefined,
      enlace: getField(row, 'enlace') || undefined,
      nombrePila: nombrePila || undefined,
      primerApellido: primerApellido || undefined,
      segundoApellido: segundoApellido || undefined,
      nombreCompleto: nombreCompleto || undefined,
      dni: normalizedDni || undefined,
      otraDemarcacion: getField(row, 'otra demarcacion') || undefined,
      otraPosicion: getField(row, 'otra posicion') || undefined,
      telefono: getField(row, 'telefono') || undefined,
      correo: getField(row, 'correo') || undefined,
      nombreTutor: getField(row, 'nombre tutor/a', 'nombre tutor') || undefined,
      correoTutor: getField(row, 'correo tutor') || undefined,
      telefonoTutor: getField(row, 'telefono tutor', 'telléfono tutor') || undefined,
    };
  }).filter(Boolean);

  // Usar db.* para respetar el aislamiento por equipo
  try {
    const { data: existing } = await db.players.get();
    const maxId = Math.max(0, ...(existing || []).map((p: any) => Number(p.id) || 0));
    let fallbackCounter = maxId;
    const newPlayers = validPlayers.map((p, idx) => ({
      ...p,
      id: p.dni || String(++fallbackCounter),
    }));
    for (const player of newPlayers) {
      await db.players.upsert(player);
    }
    imported = newPlayers.length;
  } catch (err: any) {
    return { success: false, imported: 0, errors: [err.message], warnings: warningsList };
  }

  return { success: true, imported, errors: [], warnings: warningsList };
};

/**
 * Importa staff desde CSV
 */
export const importStaff = async (csvContent: string): Promise<ImportResult> => {
  const { data, errors } = parseCSV(csvContent, ['rol', 'nombre']);
  
  if (errors.length > 0 && data.length === 0) {
    return { success: false, imported: 0, errors, warnings: [] };
  }

  const warnings: string[] = [...errors];
  
  const validStaff = data.map((row: any) => ({
    rol: row.rol?.toUpperCase() || 'STAFF',
    nombre: row.nombre?.toUpperCase() || 'SIN NOMBRE',
    año: row.año || row.ano || '',
    telefono: row.telefono || '-',
    email: row.email || '-',
    foto_inicial: (row.nombre?.[0] || 'S').toUpperCase()
  }));

  let imported = 0;

  // Usar db.* para respetar el aislamiento por equipo
  try {
    const { data: existing } = await db.staff.get();
    const maxId = Math.max(0, ...(existing || []).map((s: any) => s.id || 0));
    const newStaff = validStaff.map((s, idx) => ({ ...s, id: maxId + idx + 1 }));
    for (const member of newStaff) {
      await db.staff.upsert(member);
    }
    imported = newStaff.length;
  } catch (err: any) {
    return { success: false, imported: 0, errors: [err.message], warnings };
  }

  return { success: true, imported, errors: [], warnings };
};

/**
 * Importa eventos desde CSV
 */
export const importEvents = async (csvContent: string): Promise<ImportResult> => {
  const { data, errors } = parseCSV(csvContent, ['title', 'type', 'date']);
  
  if (errors.length > 0 && data.length === 0) {
    return { success: false, imported: 0, errors, warnings: [] };
  }

  const warnings: string[] = [...errors];
  const validTypes: EventoCalendario['type'][] = ['Entrenamiento', 'Partido', 'Otro', 'Actividad'];

  const validEvents = data.map((row: any) => {
    const type = validTypes.find(t => t.toLowerCase() === row.type?.toLowerCase()) || 'Otro';

    return {
      id: crypto.randomUUID(),
      title: row.title || 'Sin título',
      type,
      date: row.date || new Date().toISOString().split('T')[0],
      time: row.time || '18:00',
      location: row.location || '',
      notes: row.notes || '',
      team: 'DEMO'
    };
  });

  let imported = 0;

  try {
    for (const event of validEvents) {
      await eventosCalendarioService.upsert(event);
    }
    imported = validEvents.length;
  } catch (err: any) {
    return { success: false, imported: 0, errors: [err.message], warnings };
  }

  return { success: true, imported, errors: [], warnings };
};

/**
 * Importa equipos de competición desde CSV
 */
export const importTeams = async (csvContent: string): Promise<ImportResult> => {
  const { data, errors } = parseCSV(csvContent, ['nombre']);
  
  if (errors.length > 0 && data.length === 0) {
    return { success: false, imported: 0, errors, warnings: [] };
  }

  const warnings: string[] = [...errors];

  const validTeams = data.map((row: any) => ({
    nombre: row.nombre?.toUpperCase() || 'EQUIPO',
    estadio: row.estadio || '',
    localidad: row.localidad || '',
    competicion: ['LIGA', 'COPA', 'AMISTOSO'].includes((row.competicion || '').toUpperCase()) ? (row.competicion || '').toUpperCase() : 'LIGA',
    jornada: Math.max(1, Math.min(38, Number(row.jornada) || 1))
  }));

  let imported = 0;

  // Usar db.* para respetar el aislamiento por equipo
  try {
    const { data: existing } = await db.competition_teams.get();
    const maxId = Math.max(100, ...(existing || []).map((t: any) => t.id || 0));
    const newTeams = validTeams.map((t, idx) => ({ ...t, id: maxId + idx + 1 }));
    for (const team of newTeams) {
      await db.competition_teams.upsert(team);
    }
    imported = newTeams.length;
  } catch (err: any) {
    return { success: false, imported: 0, errors: [err.message], warnings };
  }

  return { success: true, imported, errors: [], warnings };
};

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Genera el contenido CSV de una plantilla descargable
 */
export const generateTemplateCSV = (table: ImportableTable): string => {
  const template = CSV_TEMPLATES[table];
  const headerLine = template.headers.join(',');
  const exampleLine = template.example.join(',');
  return `${headerLine}\n${exampleLine}`;
};

/**
 * Descarga un archivo CSV
 */
export const downloadCSV = (content: string, filename: string): void => {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Importa datos según el tipo de tabla
 */
export const importData = async (
  table: ImportableTable, 
  csvContent: string
): Promise<ImportResult> => {
  switch (table) {
    case 'players':
      return importPlayers(csvContent);
    case 'staff':
      return importStaff(csvContent);
    case 'events':
      return importEvents(csvContent);
    case 'competition_teams':
      return importTeams(csvContent);
    default:
      return { success: false, imported: 0, errors: ['Tipo de tabla no soportado'], warnings: [] };
  }
};
