// Tipos del módulo Equipos Internos.
// Reutiliza CompetitionTeam (tabla `equipos` en Supabase) — un equipo interno
// es simplemente una fila de `equipos` cuyo club_id es el del propio club.
export type { CompetitionTeam as EquipoInterno } from '../competicion/types';
