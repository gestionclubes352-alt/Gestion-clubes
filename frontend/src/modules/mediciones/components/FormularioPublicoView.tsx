import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@shared/services/supabaseClient';
import { nombreMostrable } from '../types';

interface JugadorPublico {
  id: string;
  nombre: string;
  nombre_pila: string | null;
  primer_apellido: string | null;
  equipo_id: string | null;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

const OPCIONES_SEMAFORO: Array<{ value: 'bien' | 'regular' | 'mal'; emoji: string; label: string }> = [
  { value: 'bien', emoji: '🟢', label: 'Estoy bien' },
  { value: 'regular', emoji: '🟡', label: 'Regular' },
  { value: 'mal', emoji: '🔴', label: 'Mal día' },
];

/** RPE: lista vertical de checkboxes 1-10 (formato exacto del Google Form original). */
const CampoRpeChecklist: React.FC<{
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}> = ({ value, onChange }) => (
  <div>
    <p className="font-black text-sm uppercase tracking-tighter mb-3">RPE</p>
    <div className="space-y-2.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <label key={n} className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value === n}
            onChange={() => onChange(value === n ? undefined : n)}
            className="w-5 h-5 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="text-sm font-semibold text-slate-700">{n}</span>
        </label>
      ))}
    </div>
  </div>
);

/** Ánimo / Motivación: escala horizontal 1-10 con descripciones en los extremos. */
const CampoEscala10: React.FC<{
  titulo: string;
  subtitulo?: string;
  descripcion?: string;
  extremoBajo: string;
  extremoAlto: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}> = ({ titulo, subtitulo, descripcion, extremoBajo, extremoAlto, value, onChange }) => (
  <div>
    <p className="font-black text-sm uppercase tracking-tighter">{titulo}</p>
    {subtitulo && <p className="font-bold text-sm text-slate-700 mt-2">{subtitulo}</p>}
    {descripcion && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{descripcion}</p>}
    <div className="flex items-start gap-3 mt-4">
      <span className="text-xs text-slate-500 leading-tight w-24 shrink-0 text-center">{extremoBajo}</span>
      <div className="flex-1 overflow-x-auto">
        <div className="flex justify-between min-w-[280px]">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
              <span className="text-[10px] text-slate-400">{n}</span>
              <input
                type="radio"
                checked={value === n}
                onChange={() => onChange(n)}
                className="w-4 h-4 text-[var(--accent)] focus:ring-[var(--accent)]"
              />
            </label>
          ))}
        </div>
      </div>
      <span className="text-xs text-slate-500 leading-tight w-24 shrink-0 text-center">{extremoAlto}</span>
    </div>
  </div>
);

const CAMPO_NUMERO_10: React.FC<{
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label} (0-10)</label>
    <input
      type="number"
      min={0}
      max={10}
      step={0.5}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
    />
  </div>
);

const FormularioPublicoView: React.FC = () => {
  const [jugadores, setJugadores] = useState<JugadorPublico[]>([]);
  const [jugadorId, setJugadorId] = useState('');
  const fecha = hoyISO();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const [rpe, setRpe] = useState<number | undefined>();
  const [animo, setAnimo] = useState<number | undefined>();
  const [motivacion, setMotivacion] = useState<number | undefined>();
  const [molestiaRpe, setMolestiaRpe] = useState('');

  const [sueno, setSueno] = useState<number | undefined>();
  const [musc, setMusc] = useState<number | undefined>();
  const [aerob, setAerob] = useState<number | undefined>();
  const [zonaCargada, setZonaCargada] = useState('');
  const [molestiasWellness, setMolestiasWellness] = useState('');
  const [semaforo, setSemaforo] = useState<'bien' | 'regular' | 'mal' | ''>('');
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('plantillas_publico')
          .select('id, nombre, nombre_pila, primer_apellido, equipo_id');
        if (err) throw err;
        const lista = [...(data || [])].sort((a, b) => nombreMostrable(a).localeCompare(nombreMostrable(b), 'es'));
        setJugadores(lista);
      } catch (err) {
        console.error('Error cargando jugadores:', err);
        setError('No se pudo cargar la lista de jugadores');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const jugadorSeleccionado = useMemo(
    () => jugadores.find((j) => j.id === jugadorId) || null,
    [jugadores, jugadorId]
  );

  const resetFormulario = () => {
    setRpe(undefined); setAnimo(undefined); setMotivacion(undefined); setMolestiaRpe('');
    setSueno(undefined); setMusc(undefined); setAerob(undefined);
    setZonaCargada(''); setMolestiasWellness(''); setSemaforo(''); setComentario('');
  };

  const handleEnviar = async () => {
    if (!jugadorId) {
      setError('Selecciona tu nombre');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data: rpeExistente } = await supabase
        .from('rpe_respuestas')
        .select('id')
        .eq('jugador_id', jugadorId)
        .eq('fecha', fecha);

      const rpeData = {
        jugador_id: jugadorId,
        fecha,
        rpe,
        animo,
        motivacion,
        molestia: molestiaRpe || null,
      };
      if (rpeExistente?.[0]) {
        await supabase.from('rpe_respuestas').update(rpeData).eq('id', rpeExistente[0].id);
      } else {
        await supabase.from('rpe_respuestas').insert(rpeData);
      }

      const { data: wellnessExistente } = await supabase
        .from('wellness_respuestas')
        .select('id')
        .eq('jugador_id', jugadorId)
        .eq('fecha', fecha);

      const wellnessData = {
        jugador_id: jugadorId,
        fecha,
        sueno,
        musc,
        aerob,
        zona_cargada: zonaCargada || null,
        molestias: molestiasWellness || null,
        semaforo: semaforo || null,
        comentario: semaforo === 'regular' ? (comentario || null) : null,
      };
      if (wellnessExistente?.[0]) {
        await supabase.from('wellness_respuestas').update(wellnessData).eq('id', wellnessExistente[0].id);
      } else {
        await supabase.from('wellness_respuestas').insert(wellnessData);
      }

      setEnviado(true);
    } catch (err) {
      console.error('Error guardando mediciones:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <i className="fa-solid fa-spinner animate-spin text-3xl text-[var(--accent)]"></i>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center space-y-4 max-w-sm">
          <i className="fa-solid fa-circle-check text-5xl text-[var(--accent)]"></i>
          <h2 className="text-xl font-black uppercase tracking-tight">¡Respuesta guardada!</h2>
          <p className="text-slate-500 text-sm">Gracias, {jugadorSeleccionado ? nombreMostrable(jugadorSeleccionado) : ''}. Tu registro de hoy ({fecha}) se ha enviado correctamente.</p>
          <button
            onClick={() => { setEnviado(false); resetFormulario(); }}
            className="mt-4 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-black text-xs uppercase tracking-widest"
          >
            Enviar otra respuesta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-black uppercase tracking-tighter text-[var(--text-strong)]">Registro Diario</h1>
          <p className="text-sm text-slate-400 mt-1">RPE &amp; Wellness · {fecha}</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre</label>
          <select
            value={jugadorId}
            onChange={(e) => setJugadorId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">Selecciona tu nombre...</option>
            {jugadores.map((j) => (
              <option key={j.id} value={j.id}>{nombreMostrable(j)}</option>
            ))}
          </select>
        </div>

        {jugadorSeleccionado && (
          <>
            <div className="p-5 rounded-2xl border border-slate-200 bg-white">
              <CampoRpeChecklist value={rpe} onChange={setRpe} />
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white">
              <label className="block font-black text-sm uppercase tracking-tighter mb-2">Molestia o dolor</label>
              <input
                type="text"
                value={molestiaRpe}
                onChange={(e) => setMolestiaRpe(e.target.value)}
                placeholder="Tu respuesta"
                className="w-full border-0 border-b border-slate-300 px-0 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white">
              <CampoEscala10
                titulo="Estado de ánimo al finalizar el entrenamiento"
                extremoBajo="Muy bajo. Me siento desanimado, preocupado o con un mal estado de ánimo."
                extremoAlto="Muy alto. Me siento animado, tranquilo y con muy buen estado de ánimo."
                value={animo}
                onChange={setAnimo}
              />
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white">
              <CampoEscala10
                titulo="Motivación percibida"
                subtitulo="¿Con qué motivación has afrontado el entrenamiento de hoy?"
                descripcion="Valora las ganas y la disposición con las que has entrenado hoy. No pienses en cómo has rendido, sino en la energía, ilusión e implicación que has sentido para entrenar."
                extremoBajo="Muy baja. Me ha costado mucho encontrar ganas para entrenar."
                extremoAlto="Muy alta. He entrenado con muchas ganas, energía e implicación."
                value={motivacion}
                onChange={setMotivacion}
              />
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <h3 className="text-[var(--accent)] font-black text-sm uppercase tracking-tighter">Wellness diario</h3>
              <div className="grid grid-cols-3 gap-3">
                <CAMPO_NUMERO_10 label="Calidad de sueño" value={sueno} onChange={setSueno} />
                <CAMPO_NUMERO_10 label="Cansancio muscular" value={musc} onChange={setMusc} />
                <CAMPO_NUMERO_10 label="Cansancio aeróbico" value={aerob} onChange={setAerob} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">¿Cargado de alguna zona/músculo?</label>
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
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Semáforo emocional (Nos sirve para adaptar la exigencia y la comunicación)
                </label>
                <div className="flex gap-2">
                  {OPCIONES_SEMAFORO.map((op) => (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => setSemaforo(op.value)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                        semaforo === op.value ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-slate-200'
                      }`}
                    >
                      <span className="mr-1.5">{op.emoji}</span>{op.label}
                    </button>
                  ))}
                </div>
              </div>

              {semaforo === 'regular' && (
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Si has marcado 🟡 Regular</label>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={2}
                    placeholder="Cuéntanos qué ha pasado"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            <i className="fa-solid fa-circle-exclamation mr-2"></i>{error}
          </div>
        )}

        <button
          onClick={handleEnviar}
          disabled={saving || !jugadorId}
          className="w-full px-4 py-3.5 rounded-xl bg-[var(--accent)] text-white font-black text-xs uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-paper-plane"></i>
          {saving ? 'ENVIANDO...' : 'ENVIAR RESPUESTA'}
        </button>
      </div>
    </div>
  );
};

export default FormularioPublicoView;
