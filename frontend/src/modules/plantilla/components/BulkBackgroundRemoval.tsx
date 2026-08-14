import React, { useMemo, useState } from 'react';
import { uploadPlayerPhoto } from '../../../shared/services/photoService';
import { removePhotoBackground, urlToFile } from '../../../shared/services/backgroundRemoval';
import { Player } from '../types';

interface BulkBackgroundRemovalProps {
  squad: Player[];
  clubId: string;
  onClose: () => void;
  onUpdated: (playerId: Player['id'], fotoUrl: string) => Promise<void>;
}

type RowStatus = 'pending' | 'processing' | 'done' | 'error';

const isImageUrl = (value?: string | null): value is string =>
  typeof value === 'string' && /^(https?:\/\/|data:image\/|\/)/i.test(value);

const BulkBackgroundRemoval: React.FC<BulkBackgroundRemovalProps> = ({ squad, clubId, onClose, onUpdated }) => {
  const players = useMemo(
    () => squad.filter(p => isImageUrl(p.fotoUrl)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [squad]
  );

  const [statuses, setStatuses] = useState<Record<string, { status: RowStatus; error?: string }>>({});
  const [isRunning, setIsRunning] = useState(false);

  const doneCount = Object.values(statuses).filter(s => s.status === 'done').length;
  const errorCount = Object.values(statuses).filter(s => s.status === 'error').length;
  const finished = isRunning === false && doneCount + errorCount > 0 && doneCount + errorCount === players.length;

  const setStatus = (id: string, status: RowStatus, error?: string) =>
    setStatuses(prev => ({ ...prev, [id]: { status, error } }));

  const handleStart = async () => {
    setIsRunning(true);
    for (const player of players) {
      const id = String(player.id);
      setStatus(id, 'processing');
      try {
        const file = await urlToFile(player.fotoUrl, `${id}.jpg`);
        const processed = await removePhotoBackground(file);
        const fotoUrl = await uploadPlayerPhoto(processed, id, player.clubId || clubId);
        await onUpdated(player.id, fotoUrl);
        setStatus(id, 'done');
      } catch (err) {
        setStatus(id, 'error', err instanceof Error ? err.message : String(err));
      }
    }
    setIsRunning(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-fade-in text-slate-800 flex flex-col w-full max-w-2xl max-h-[95dvh] sm:max-h-[85dvh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-[var(--accent)] font-black text-lg uppercase tracking-tighter">Quitar fondo de las fotos</h3>
            <p className="text-xs text-slate-400 mt-1">
              Se procesa cada foto en el navegador (sin enviarla a ningún servicio externo) y se sustituye por la versión sin fondo.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {players.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No hay fotos que procesar.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {players.map(player => {
                const id = String(player.id);
                const s = statuses[id]?.status || 'pending';
                return (
                  <div key={id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <img loading="lazy" decoding="async" src={player.fotoUrl} className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0" />
                    <p className="flex-1 min-w-0 text-sm font-semibold text-slate-700 truncate">{player.nombre}</p>
                    <div className="shrink-0 w-24 text-right">
                      {s === 'pending' && <span className="text-[10px] font-bold text-slate-400 uppercase">Pendiente</span>}
                      {s === 'processing' && <i className="fa-solid fa-spinner animate-spin text-slate-400"></i>}
                      {s === 'done' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                          <i className="fa-solid fa-circle-check"></i>Listo
                        </span>
                      )}
                      {s === 'error' && (
                        <span className="text-[10px] font-bold text-red-500 uppercase" title={statuses[id]?.error}>Error</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky bottom-0">
          <p className="text-xs text-slate-400 font-medium">
            {players.length > 0 ? `${doneCount + errorCount} / ${players.length} procesadas` : ''}
            {finished && errorCount === 0 && <span className="block text-emerald-600 mt-0.5">Todas las fotos procesadas.</span>}
            {finished && errorCount > 0 && <span className="block text-red-500 mt-0.5">{errorCount} fotos con error.</span>}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isRunning}
              className="flex-1 sm:flex-none py-3 px-5 border border-slate-200 rounded-2xl font-black text-slate-600 bg-white hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest disabled:opacity-50"
            >
              Cerrar
            </button>
            <button
              onClick={handleStart}
              disabled={isRunning || players.length === 0}
              className="flex-1 sm:flex-none py-3 px-5 bg-[var(--accent)] text-white rounded-2xl font-black hover:bg-[var(--accent-dark)] transition-all shadow-xl shadow-[var(--accent)]/20 uppercase text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  Procesando…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                  Quitar fondo a {players.length} fotos
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkBackgroundRemoval;
