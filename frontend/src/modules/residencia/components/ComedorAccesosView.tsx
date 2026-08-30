import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ResidenciaComedorAcceso } from '@shared/services/dataService';
import { plantillasService, residenciaComedorAccesosService } from '@shared/services';
import { useAuth } from '@context/AuthContext';
import { TURNOS, turnoPorHora, type Turno } from '../turnos';

const hoyISO = () => new Date().toISOString().slice(0, 10);

interface Residente {
  id: string;
  nombre: string;
}

const ComedorAccesosView: React.FC = () => {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const [residentes, setResidentes] = useState<Residente[]>([]);
  const [accesos, setAccesos] = useState<ResidenciaComedorAcceso[]>([]);
  const [fecha, setFecha] = useState(hoyISO());
  const [turno, setTurno] = useState<Turno>(turnoPorHora() ?? 'Comida');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registrandoId, setRegistrandoId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const jugadoresData = await plantillasService.list();
        setResidentes(
          (jugadoresData || [])
            .filter(j => j.residencia === true)
            .map(j => ({ id: String(j.id), nombre: j.nombre }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        );
      } catch (err) {
        console.error('Error cargando residentes:', err);
        setError('Error al cargar los residentes');
      }
    })();
  }, []);

  const cargarAccesos = async () => {
    try {
      setLoading(true);
      const data = await residenciaComedorAccesosService.list({ fecha, turno });
      setAccesos(data || []);
    } catch (err) {
      console.error('Error cargando accesos:', err);
      setError('Error al cargar los accesos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAccesos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, turno]);

  const getAcceso = (jugadorId: string) => accesos.find(a => a.jugador_id === jugadorId) || null;

  const registrados = useMemo(() => residentes.filter(r => getAcceso(r.id)).length, [residentes, accesos]);

  const registrarManual = async (jugadorId: string) => {
    setRegistrandoId(jugadorId);
    setError(null);
    try {
      await residenciaComedorAccesosService.create({
        club_id: perfil?.club_id,
        jugador_id: jugadorId,
        fecha,
        turno,
        registrado_en: new Date().toISOString(),
        origen: 'manual',
      } as any);
      await cargarAccesos();
    } catch (err: any) {
      if (err?.code === '23505') {
        setError('Ese jugador ya estaba registrado en este turno');
      } else {
        console.error('Error registrando acceso manual:', err);
        setError('Error al registrar el acceso');
      }
    } finally {
      setRegistrandoId(null);
    }
  };

  const borrarAcceso = async (id: string) => {
    if (!window.confirm('¿Quitar este registro de acceso?')) return;
    try {
      await residenciaComedorAccesosService.remove(id);
      await cargarAccesos();
    } catch (err) {
      console.error('Error borrando acceso:', err);
      setError('Error al borrar el acceso');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1" />
        <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
          COMEDOR — ACCESOS
        </h2>
        <div className="flex-1 flex justify-end">
          <button
            onClick={() => navigate('/residencia/comedor/qr')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg whitespace-nowrap"
          >
            <i className="fa-solid fa-qrcode text-xs"></i>
            Imprimir QR
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
        />
        <select
          value={turno}
          onChange={e => setTurno(e.target.value as Turno)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
        >
          {TURNOS.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <span className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-black text-slate-600">
          {registrados} / {residentes.length} registrados
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <i className="fa-solid fa-spinner animate-spin text-3xl text-[var(--accent)]"></i>
        </div>
      ) : residentes.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <i className="fa-solid fa-user text-4xl text-slate-300 mb-4 block"></i>
          <p className="font-semibold">No hay jugadores marcados como residentes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {residentes.map(r => {
            const acceso = getAcceso(r.id);
            const hora = acceso ? new Date(acceso.registrado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null;
            return (
              <div
                key={r.id}
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  acceso ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <i className={`fa-solid ${acceso ? 'fa-circle-check text-green-500' : 'fa-circle text-slate-300'}`}></i>
                  <span className="font-black uppercase tracking-tighter text-slate-700">{r.nombre}</span>
                </div>
                {acceso ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-green-700">
                      {hora} {acceso.origen === 'manual' && <span className="text-[9px] uppercase text-green-500">(manual)</span>}
                    </span>
                    <button
                      onClick={() => borrarAcceso(acceso.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Quitar registro"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => registrarManual(r.id)}
                    disabled={registrandoId === r.id}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all disabled:opacity-50"
                  >
                    {registrandoId === r.id ? '...' : 'Registrar'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ComedorAccesosView;
