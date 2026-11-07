import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@shared/services/supabaseClient';
import { useAuth } from '@context/AuthContext';

interface Props {
  jugadorId: string | null;
  jugadorNombre?: string;
  onClose: () => void;
}

const QrComedorModal: React.FC<Props> = ({ jugadorId, jugadorNombre, onClose }) => {
  const { perfil } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!jugadorId) return;
    (async () => {
      setLoading(true);
      setError(null);
      setCopiado(false);
      try {
        const { data, error: err } = await supabase
          .from('residencia_comedor_tokens')
          .select('token')
          .eq('jugador_id', jugadorId)
          .eq('activo', true)
          .maybeSingle();
        if (err) throw err;
        setToken(data?.token ?? null);
      } catch (err) {
        console.error('Error consultando token de comedor:', err);
        setError('No se pudo consultar el enlace');
      } finally {
        setLoading(false);
      }
    })();
  }, [jugadorId]);

  const generar = async (esRegenerar: boolean) => {
    if (!jugadorId) return;
    if (esRegenerar && !window.confirm('Se generará un nuevo enlace y el QR anterior dejará de funcionar. ¿Continuar?')) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc('generar_token_comedor', {
        p_jugador_id: jugadorId,
        p_club_id: perfil?.club_id ?? null,
      });
      if (err) throw err;
      setToken(data as string);
    } catch (err) {
      console.error('Error generando token de comedor:', err);
      setError('No se pudo generar el enlace');
    } finally {
      setLoading(false);
    }
  };

  if (!jugadorId) return null;

  const url = token ? `${window.location.origin}/comedor/${token}` : null;

  const copiar = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError('No se pudo copiar el enlace');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-[var(--accent)] font-black text-lg uppercase tracking-tighter flex items-center gap-2">
            <i className="fa-solid fa-qrcode"></i>
            QR COMEDOR
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="p-6 space-y-4 text-center">
          <p className="font-black text-sm uppercase tracking-tighter text-slate-700">{jugadorNombre}</p>

          {loading && <i className="fa-solid fa-spinner animate-spin text-2xl text-[var(--accent)]"></i>}

          {!loading && url && (
            <>
              <div className="flex justify-center p-4 bg-white border border-slate-200 rounded-xl">
                <QRCodeSVG value={url} size={220} level="M" />
              </div>
              <p className="text-[11px] text-slate-400 break-all">{url}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={copiar}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  <i className={`fa-solid ${copiado ? 'fa-check' : 'fa-copy'} mr-1`}></i>
                  {copiado ? 'Copiado' : 'Copiar enlace'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  <i className="fa-solid fa-print mr-1"></i>
                  Imprimir
                </button>
              </div>
              <button
                onClick={() => generar(true)}
                className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600"
              >
                Regenerar enlace
              </button>
            </>
          )}

          {!loading && !url && (
            <button
              onClick={() => generar(false)}
              className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-xl"
            >
              <i className="fa-solid fa-link mr-1"></i>
              Generar enlace
            </button>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QrComedorModal;
