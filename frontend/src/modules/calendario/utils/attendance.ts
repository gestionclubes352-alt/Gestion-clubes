import type { AttendanceStatus, CalendarEvent } from '../types';

const normalizeSessionTitle = (title?: string) =>
  (title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const isSelectiveAttendanceSession = (event?: Pick<CalendarEvent, 'title'> | null) => {
  const title = normalizeSessionTitle(event?.title);
  return title === 'sesion individual' || title === 'sesion grupal';
};

export const getAttendanceSessionScope = (event?: Pick<CalendarEvent, 'title'> | null): 'team' | 'group' | 'individual' => {
  const title = normalizeSessionTitle(event?.title);
  if (title === 'sesion individual') return 'individual';
  if (title === 'sesion grupal') return 'group';
  return 'team';
};

export const normalizeAttendanceForEvent = (
  event: Pick<CalendarEvent, 'title'>,
  attendance: Record<string, AttendanceStatus>
) => {
  if (!isSelectiveAttendanceSession(event)) return attendance;

  return Object.fromEntries(
    Object.entries(attendance).filter(([, status]) => status === 'Si')
  ) as Record<string, AttendanceStatus>;
};

export const hasRecordedAttendance = (event: Pick<CalendarEvent, 'title' | 'attendance'>) => {
  const attendance = event.attendance || {};
  const values = Object.values(attendance);
  if (isSelectiveAttendanceSession(event)) {
    return values.some(status => status === 'Si');
  }
  return values.length > 0;
};

export const getPlayerSessionAttendance = (
  event: Pick<CalendarEvent, 'title' | 'attendance'>,
  playerId: string | number
) => {
  const status = event.attendance?.[String(playerId)];

  if (isSelectiveAttendanceSession(event)) {
    return {
      counted: status === 'Si',
      attended: status === 'Si',
      status,
    };
  }

  const resolvedStatus = status || 'Si';
  return {
    counted: true,
    attended: resolvedStatus === 'Si',
    status: resolvedStatus,
  };
};
