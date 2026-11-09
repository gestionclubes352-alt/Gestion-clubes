import {
  plantillasService,
  equiposService,
  residenciaJugadoresService,
  residenciaHabitacionesService,
  objetivosIndividualesService,
} from '@shared/services';
import type { Jugador } from '@shared/services/dataService';

/**
 * Evita inyección de fórmulas (CSV/Excel injection): cualquier texto que empiece
 * por = + - @ o tabulador se prefija con comilla para que Excel lo trate como texto.
 */
const safe = (v: unknown): string | number => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  const s = String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

const edad = (fecha?: string): number | '' => {
  if (!fecha) return '';
  const n = new Date(fecha);
  if (isNaN(n.getTime())) return '';
  const h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  const dif = h.getMonth() - n.getMonth() || h.getDate() - n.getDate();
  if (dif < 0) a--;
  return a;
};

const TIPO_ACCION: Record<string, string> = {
  reunion: 'Reunión',
  video: 'Vídeo',
  sesion_individual: 'Sesión individual',
  sesion_colectiva: 'Sesión colectiva',
  sesion_grupal: 'Sesión grupal',
};
const TIPO_OBJ: Record<string, string> = {
  deportivo: 'Deportivo',
  psicologico: 'Psicológico',
  habitos: 'Hábitos',
  academico: 'Académico',
};

/** Columnas con toda la información de la ficha del jugador (tabla `plantillas`). */
const columnasJugador = (nombreEquipo: (id?: string | null) => string) => [
  { header: 'Nombre', value: (j: Jugador) => j.nombre_completo || j.nombre },
  { header: 'Apodo', value: (j: Jugador) => j.apodo },
  { header: 'Equipo', value: (j: Jugador) => nombreEquipo(j.equipo_id) },
  { header: 'Temporada', value: (j: Jugador) => j.temporada },
  { header: 'Etapa', value: (j: Jugador) => j.etapa },
  { header: 'Dorsal', value: (j: Jugador) => j.dorsal },
  { header: 'Posición', value: (j: Jugador) => j.posicion },
  { header: 'Posición de juego', value: (j: Jugador) => j.posicion_juego },
  { header: 'Otra posición', value: (j: Jugador) => j.otra_posicion },
  { header: 'Otra demarcación', value: (j: Jugador) => j.otra_demarcacion },
  { header: 'Perfil', value: (j: Jugador) => j.perfil },
  { header: 'Estado', value: (j: Jugador) => j.estado },
  { header: 'Fecha nacimiento', value: (j: Jugador) => j.fecha_nacimiento },
  { header: 'Edad', value: (j: Jugador) => edad(j.fecha_nacimiento) },
  { header: 'DNI', value: (j: Jugador) => j.dni },
  { header: 'Teléfono', value: (j: Jugador) => j.telefono },
  { header: 'Correo', value: (j: Jugador) => j.correo },
  { header: 'Tutor', value: (j: Jugador) => j.nombre_tutor },
  { header: 'Teléfono tutor', value: (j: Jugador) => j.telefono_tutor },
  { header: 'Correo tutor', value: (j: Jugador) => j.correo_tutor },
  { header: 'Residencia', value: (j: Jugador) => j.residencia },
  { header: 'Descripción', value: (j: Jugador) => j.descripcion },
  { header: 'Ataque', value: (j: Jugador) => j.ataque },
  { header: 'Defensa', value: (j: Jugador) => j.defensa },
  { header: 'Persona', value: (j: Jugador) => j.persona },
  { header: 'Observaciones', value: (j: Jugador) => j.observaciones },
  { header: 'Rating técnica', value: (j: Jugador) => j.rating_tecnica },
  { header: 'Rating táctica', value: (j: Jugador) => j.rating_tactica },
  { header: 'Rating condicional', value: (j: Jugador) => j.rating_condicional },
  { header: 'Rating psicológico', value: (j: Jugador) => j.rating_psicologico },
  { header: 'Rating humano', value: (j: Jugador) => j.rating_humano },
  { header: 'Partidos jugados', value: (j: Jugador) => j.partidos_jugados },
  { header: 'Minutos', value: (j: Jugador) => j.minutos },
  { header: 'Titular', value: (j: Jugador) => j.titular },
  { header: 'Goles', value: (j: Jugador) => j.goles },
];

export async function exportResidentesYObjetivosExcel(): Promise<void> {
  const [jugadores, equipos, registros, habitaciones, objetivos] = await Promise.all([
    plantillasService.list(),
    equiposService.list(),
    residenciaJugadoresService.list().catch(() => []),
    residenciaHabitacionesService.list().catch(() => []),
    objetivosIndividualesService.list(),
  ]);

  const nombreEquipo = (id?: string | null) => equipos.find(e => String(e.id) === String(id))?.nombre || '';
  const cols = columnasJugador(nombreEquipo);
  const porId = new Map(jugadores.map(j => [String(j.id), j]));

  const residentes = jugadores
    .filter(j => j.residencia === true)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  // Import dinámico: exceljs es pesado y solo se necesita al exportar.
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Gestión de Clubes';
  wb.created = new Date();

  const estilarCabecera = (ws: import('exceljs').Worksheet) => {
    const fila = ws.getRow(1);
    fila.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };
    fila.alignment = { vertical: 'middle', wrapText: true };
    ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
    ws.columns.forEach(c => {
      let max = String(c.header ?? '').length;
      c.eachCell?.({ includeEmpty: false }, cell => {
        max = Math.max(max, String(cell.value ?? '').length);
      });
      c.width = Math.min(Math.max(max + 2, 10), 50);
    });
  };

  // ---- Hoja 1: Residentes ----
  const ws1 = wb.addWorksheet('Residentes');
  const extraResi = ['Apartamento', 'Planta', 'Nº habitación', 'Fecha entrada', 'Fecha salida', 'Estado residencia', 'Condición', 'Notas residencia'];
  ws1.columns = [...cols.map(c => ({ header: c.header })), ...extraResi.map(h => ({ header: h }))];
  residentes.forEach(j => {
    const r = registros.find(x => String(x.jugador_id) === String(j.id));
    const h = habitaciones.find(x => x.id === r?.habitacion_id);
    ws1.addRow([
      ...cols.map(c => safe(c.value(j))),
      safe(h?.nombre), safe(h?.planta), safe(r?.numero_habitacion), safe(r?.fecha_entrada),
      safe(r?.fecha_salida), safe(r?.estado), safe(r?.condicion), safe(r?.notas),
    ]);
  });
  estilarCabecera(ws1);

  // ---- Hoja 2: Objetivos individuales (una fila por objetivo, con ficha del jugador) ----
  const ws2 = wb.addWorksheet('Objetivos individuales');
  const extraObj = ['Fecha objetivo', 'Tipo', 'Nombre del objetivo', 'Estado actual', 'Estado inicial', 'Detalle', 'Nº acciones/evaluaciones', 'Historial'];
  ws2.columns = [...cols.map(c => ({ header: c.header })), ...extraObj.map(h => ({ header: h }))];
  [...objetivos]
    .filter(o => porId.has(String(o.jugador_id)))
    .sort((a, b) =>
      (porId.get(String(a.jugador_id))!.nombre).localeCompare(porId.get(String(b.jugador_id))!.nombre, 'es') ||
      String(a.fecha).localeCompare(String(b.fecha)))
    .forEach(o => {
      const j = porId.get(String(o.jugador_id))!;
      const historial = [...(o.acciones || [])]
        .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
        .map(a => {
          const etiqueta = a.categoria === 'evaluacion' ? `Evaluación (${a.estado ?? '-'})` : (TIPO_ACCION[a.tipo || ''] || 'Acción');
          return `${a.fecha} · ${etiqueta}${a.detalle ? `: ${a.detalle}` : ''}${a.video_url ? ` [${a.video_url}]` : ''}`;
        })
        .join('\n');
      const row = ws2.addRow([
        ...cols.map(c => safe(c.value(j))),
        safe(o.fecha), safe(TIPO_OBJ[o.tipo] || o.tipo), safe(o.nombre_objetivo), safe(o.estado),
        safe(o.estado_inicial), safe(o.detalle), (o.acciones || []).length, safe(historial),
      ]);
      row.getCell(ws2.columnCount).alignment = { wrapText: true, vertical: 'top' };
    });
  estilarCabecera(ws2);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `residentes_y_objetivos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
