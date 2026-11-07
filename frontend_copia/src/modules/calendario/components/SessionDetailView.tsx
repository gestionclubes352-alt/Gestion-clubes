import React, { useState, useEffect } from 'react';
import type { CalendarEvent } from '../types';
import type { Player } from '@modules/plantilla';

interface SessionDetailViewProps {
  event: CalendarEvent;
  squad?: Player[];
  onSaveEvent: (event: CalendarEvent) => void;
}

const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
const dayNamesLong = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const SessionDetailView: React.FC<SessionDetailViewProps> = ({ event, squad = [], onSaveEvent }) => {
  const [rolesText, setRolesText] = useState(event.staffRoles || '');
  const [notesText, setNotesText] = useState(event.notes || '');
  const [videoUrl, setVideoUrl] = useState(event.videoUrl || '');
  const [docUrl, setDocUrl] = useState(event.docUrl || '');
  const [attendance, setAttendance] = useState<Record<number, 'Si' | 'No' | 'Duda'>>({});

  useEffect(() => {
    setRolesText(event.staffRoles || '');
    setNotesText(event.notes || '');
    setVideoUrl(event.videoUrl || '');
    setDocUrl(event.docUrl || '');
    setAttendance({});
  }, [event]);

  const handleSaveSession = () => {
    onSaveEvent({
      ...event,
      notes: notesText,
      videoUrl,
      docUrl,
      staffRoles: rolesText
    });
  };

  const sessionDate = event.date instanceof Date ? event.date : new Date(event.date);
  const formatLongDate = (date: Date) => {
    return `${dayNamesLong[date.getDay()]}, ${date.getDate()} de ${monthNames[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
  };

  return (
    <div className="animate-fade-in space-y-6 h-full flex flex-col relative pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-[var(--accent)] font-black text-2xl uppercase tracking-tight">SESIÓN</h3>
            <p className="text-slate-400 text-sm font-bold">{formatLongDate(sessionDate)} • {event.time}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSaveSession} className="bg-[#1a4f9c] hover:bg-[#143e7b] text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg">
            <i className="fa-solid fa-floppy-disk"></i> Guardar
          </button>
        </div>
      </div>
      {/* Aquí puedes copiar el layout de detalle de sesión del CalendarView actual */}
    </div>
  );
};

export default SessionDetailView;
