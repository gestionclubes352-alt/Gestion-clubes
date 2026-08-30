import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Jugador } from '@shared/services/dataService';
import { plantillasService, equiposService, rpeRespuestasService, wellnessRespuestasService } from '@shared/services';
import { useAuth } from '@context/AuthContext';
import { nombreMostrable } from '../types';

const hoyISO = () => new Date().toISOString().slice(0, 10);

const CAMPO_NUMERO_10: React.FC<{
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}> = ({ label, value, onChange }) => {
  const clamp = (v: number) => Math.min(10, Math.max(0, v));

  return (
    <div>
      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={10}
        step={0.5}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : clamp(Number(e.target.value)))}
        className="w-full min-w-0 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-center focus:outline-none focus:border-[var(--accent)]"
      />
    </div>
  );
};

const SelectorJugador: React.FC<{
  jugadores: Jugador[];
  jugadorId: string;
  onChange: (id: string) => void;
}> = ({ jugadores, jugadorId, onChange }) => {
  const [abierto, setAbierto] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const jugadorSeleccionado = jugadores.find((j) => j.id === jugadorId) || null;

  useEffect(() => {
    const onClickFuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', onClickFuera);
    return () => document.removeEventListener('mousedown', onClickFuera);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Jugador</label>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className="w-full flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)] bg-white"
      >
        <span className={jugadorSeleccionado ? '' : 'text-slate-400'}>
          {jugadorSeleccionado ? nombreMostrable(jugadorSeleccionado) : 'Selecciona...'}
        </span>
        <i className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}></i>
      </button>
      {abierto && (
        <div className="absolute z-10 mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl p-1.5 space-y-1">
          {jugadores.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => { onChange(j.id); setAbierto(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                j.id === jugadorId ? 'bg-[var(--accent)] text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {nombreMostrable(j)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const RegistroDiarioView: React.FC = () => {
  const navigate = useNavigate();
  const { perfil } = useAuth();
  const esJugador = perfil?.rol === 'Jugador';
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [jugadorId, setJugadorId] = useState<string>('');
  const [fecha, setFecha] = useState(hoyISO());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [rpe, setRpe] = useState<number | undefined>();
  const [animo, setAnimo] = useState<number | undefined>();
  const [motivacion, setMotivacion] = useState<number | undefined>();
  const [molestiaRpe, setMolestiaRpe] = useState('');

  const [sueno, setSueno] = useState<number | undefined>();
  const [musc, setMusc] = useState<number | undefined>();
  const [aerob, setAerob] = useState<number | undefined>();
  const [zonaCargada, setZonaCargada] = useState('');
  const [molestiasWellness, setMolestiasWellness] = useState('');
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const equipos = await equiposService.list(perfil?.club_id ? { club_id: perfil.club_id } : undefined);
        const primerEquipo = (equipos || []).find((e) => e.nombre?.trim().toLowerCase() === 'primer equipo');
        const jugadoresPrimerEquipo = primerEquipo
          ? await plantillasService.list({ equipo_id: primerEquipo.id })
          : [];
        const data = jugadoresPrimerEquipo?.length ? jugadoresPrimerEquipo : await plantillasService.list();
        const listaCompleta = [...(data || [])].sort((a, b) => nombreMostrable(a).localeCompare(nombreMostrable(b), 'es'));
        const lista = esJugador
          ? listaCompleta.filter((j) => j.id === perfil?.jugador_id)
          : listaCompleta;
        setJugadores(lista);
        if (esJugador && perfil?.jugador_id) setJugadorId(perfil.jugador_id);
      } catch (err) {
        console.error('Error cargando plantilla:', err);
        setError('Error al cargar la plantilla');
      } finally {
        setLoading(false);
      }
    })();
  }, [perfil?.club_id, esJugador, perfil?.jugador_id]);

  const jugadorSeleccionado = useMemo(
    () => jugadores.find((j) => j.id === jugadorId) || null,
    [jugadores, jugadorId]
  );

  const resetFormulario = () => {
    setRpe(undefined);
    setAnimo(undefined);
    setMotivacion(undefined);
    setMolestiaRpe('');
    setSueno(undefined);
    setMusc(undefined);
    setAerob(undefined);
    setZonaCargada('');
    setMolestiasWellness('');
    setComentario('');
  };

  const handleGuardar = async () => {
    if (!jugadorId) {
      setError('Selecciona un jugador');
      return;
    }
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const rpeExistente = await rpeRespuestasService.list({ jugador_id: jugadorId, fecha });
      const rpeData = {
        club_id: perfil?.club_id,
        jugador_id: jugadorId,
        fecha,
        rpe,
        animo,
        motivacion,
        molestia: molestiaRpe || null,
      };
      if (rpeExistente?.[0]) {
        await rpeRespuestasService.update(rpeExistente[0].id, rpeData as any);
      } else {
        await rpeRespuestasService.create(rpeData as any);
      }

      const wellnessExistente = await wellnessRespuestasService.list({ jugador_id: jugadorId, fecha });
      const wellnessData = {
        club_id: perfil?.club_id,
        jugador_id: jugadorId,
        fecha,
        sueno,
        musc,
        aerob,
        zona_cargada: zonaCargada || null,
        molestias: molestiasWellness || null,
        comentario: comentario || null,
      };
      if (wellnessExistente?.[0]) {
        await wellnessRespuestasService.update(wellnessExistente[0].id, wellnessData as any);
      } else {
        await wellnessRespuestasService.create(wellnessData as any);
      }

      setOk('Respuesta guardada correctamente');
      resetFormulario();
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      console.error('Error guardando mediciones:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <i className="fa-solid fa-spinner animate-spin text-4xl text-[var(--accent)]"></i>
          <p className="text-slate-600 font-semibold">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
        REGISTRO DIARIO
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {esJugador ? (
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Jugador</label>
            <div className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 text-slate-700">
              {jugadorSeleccionado ? nombreMostrable(jugadorSeleccionado) : '—'}
            </div>
          </div>
        ) : (
          <SelectorJugador jugadores={jugadores} jugadorId={jugadorId} onChange={setJugadorId} />
        )}
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {jugadorSeleccionado && (
        <>
          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
            <h3 className="text-[var(--accent)] font-black text-sm uppercase tracking-tighter">RPE del entrenamiento (0-10)</h3>
            <div className="grid grid-cols-3 gap-3">
              <CAMPO_NUMERO_10 label="RPE" value={rpe} onChange={setRpe} />
              <CAMPO_NUMERO_10 label="Ánimo" value={animo} onChange={setAnimo} />
              <CAMPO_NUMERO_10 label="Motivación" value={motivacion} onChange={setMotivacion} />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Molestia o dolor</label>
              <input
                type="text"
                value={molestiaRpe}
                onChange={(e) => setMolestiaRpe(e.target.value)}
                placeholder="Ej: rodilla izquierda"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
            <h3 className="text-[var(--accent)] font-black text-sm uppercase tracking-tighter">Wellness diario (0-10)</h3>
            <div className="grid grid-cols-3 gap-3">
              <CAMPO_NUMERO_10 label="Calidad de sueño" value={sueno} onChange={setSueno} />
              <CAMPO_NUMERO_10 label="Cansancio muscular" value={musc} onChange={setMusc} />
              <CAMPO_NUMERO_10 label="Cansancio aeróbico" value={aerob} onChange={setAerob} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">¿Cargado de alguna zona?</label>
                <input
                  type="text"
                  value={zonaCargada}
                  onChange={(e) => setZonaCargada(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">¿Molestias en alguna zona?</label>
                <input
                  type="text"
                  value={molestiasWellness}
                  onChange={(e) => setMolestiasWellness(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Comentario</label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>{error}
        </div>
      )}
      {ok && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
          <i className="fa-solid fa-circle-check mr-2"></i>{ok}
        </div>
      )}

      <button
        onClick={handleGuardar}
        disabled={saving || !jugadorId}
        className="w-full px-4 py-3 rounded-xl bg-[var(--accent)] text-white font-black text-xs uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <i className="fa-solid fa-floppy-disk"></i>
        {saving ? 'GUARDANDO...' : 'GUARDAR RESPUESTA'}
      </button>
    </div>
  );
};

export default RegistroDiarioView;
