import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@shared/services/supabaseClient';

interface RespuestaComedor {
  ok: boolean;
  motivo?: 'token_invalido' | 'duplicado' | 'fuera_de_horario';
  nombre?: string;
  turno?: string | null;
  fecha?: string;
  registrado_en?: string | null;
  ya_registrado?: boolean;
  hora?: string;
}

const FRANJAS = [
  { turno: 'Desayuno', horas: '06:00 – 10:29' },
  { turno: 'Comida', horas: '12:30 – 16:29' },
  { turno: 'Merienda', horas: '16:30 – 19:29' },
  { turno: 'Cena', horas: '20:00 – 23:59' },
];

const ComedorFichajeView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [estado, setEstado] = useState<RespuestaComedor | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [errorRed, setErrorRed] = useState(false);

  const consultar = useCallback(async () => {
    if (!token) return;
    const { data, error } = await supabase.rpc('consultar_comedor', { p_token: token });
    if (error) setErrorRed(true);
    else { setErrorRed(false); setEstado(data as RespuestaComedor); }
  }, [token]);

  useEffect(() => {
    (async () => {
      setCargando(true);
      await consultar();
      setCargando(false);
    })();
  }, [consultar]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') consultar();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [consultar]);

  const fichar = useCallback(async () => {
    if (!token || enviando) return;
    setEnviando(true);
    setErrorRed(false);
    const { data, error } = await supabase.rpc('registrar_acceso_comedor', { p_token: token });
    if (error) setErrorRed(true);
    else setEstado(data as RespuestaComedor);
    setEnviando(false);
  }, [token, enviando]);

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <i className="fa-solid fa-spinner animate-spin text-3xl text-[var(--accent)]"></i>
      </div>
    );
  }

  if (errorRed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center space-y-4 max-w-sm">
          <i className="fa-solid fa-wifi text-5xl text-slate-300"></i>
          <p className="text-slate-600 font-semibold">No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.</p>
          <button
            onClick={() => { setCargando(true); consultar().finally(() => setCargando(false)); }}
            className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-black text-xs uppercase tracking-widest"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!estado?.ok) {
    const motivo = estado?.motivo;

    if (motivo === 'duplicado') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-amber-50 p-6">
          <div className="text-center space-y-4 max-w-sm">
            <i className="fa-solid fa-circle-check text-6xl text-amber-500"></i>
            <h1 className="text-xl font-black uppercase tracking-tighter text-amber-800">Ya registraste tu entrada</h1>
            <p className="text-amber-700">{estado?.nombre}, ya fichaste {estado?.turno?.toLowerCase()} a las <b>{estado?.registrado_en}</b>.</p>
          </div>
        </div>
      );
    }

    if (motivo === 'fuera_de_horario') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
          <div className="text-center space-y-4 max-w-sm">
            <i className="fa-solid fa-clock text-5xl text-slate-400"></i>
            <h1 className="text-xl font-black uppercase tracking-tighter text-slate-700">Fuera de horario de comedor</h1>
            <p className="text-slate-500 text-sm">Son las {estado?.hora}. Los horarios de fichaje son:</p>
            <ul className="text-sm text-slate-600 space-y-1">
              {FRANJAS.map(f => (
                <li key={f.turno}><b>{f.turno}</b> · {f.horas}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    // token_invalido u otro
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center space-y-4 max-w-sm">
          <i className="fa-solid fa-circle-exclamation text-5xl text-slate-300"></i>
          <h1 className="text-xl font-black uppercase tracking-tighter text-slate-700">Enlace no válido</h1>
          <p className="text-slate-500 text-sm">Pide al responsable de residencia que te genere un nuevo enlace.</p>
        </div>
      </div>
    );
  }

  if (estado.ya_registrado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 p-6">
        <div className="text-center space-y-4 max-w-sm">
          <i className="fa-solid fa-circle-check text-6xl text-green-500"></i>
          <h1 className="text-xl font-black uppercase tracking-tighter text-green-800">¡Ya fichaste!</h1>
          <p className="text-green-700">{estado.nombre}, registraste tu {estado.turno?.toLowerCase()} a las <b>{estado.registrado_en}</b>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="text-center space-y-6 max-w-sm w-full">
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-widest font-black">{estado.turno}</p>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-strong)]">Hola, {estado.nombre}</h1>
        </div>
        <button
          onClick={fichar}
          disabled={enviando}
          className="w-full py-16 rounded-3xl bg-[var(--accent)] text-white font-black text-2xl uppercase tracking-widest shadow-2xl hover:bg-[var(--accent-dark)] transition-all disabled:opacity-50 flex flex-col items-center gap-3"
        >
          {enviando ? (
            <i className="fa-solid fa-spinner animate-spin text-3xl"></i>
          ) : (
            <>
              <i className="fa-solid fa-utensils text-3xl"></i>
              Registrar mi entrada
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ComedorFichajeView;
