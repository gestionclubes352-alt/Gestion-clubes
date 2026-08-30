import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@shared/services/supabaseClient';
import { plantillasService } from '@shared/services';
import { useAuth } from '@context/AuthContext';
import type { Jugador } from '@shared/services/dataService';

interface TarjetaQr {
  jugador: Jugador;
  token: string | null;
}

const ComedorQrImprimirView: React.FC = () => {
  const { perfil } = useAuth();
  const [tarjetas, setTarjetas] = useState<TarjetaQr[]>([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const jugadoresData = await plantillasService.list();
      const residentes = (jugadoresData || []).filter(j => j.residencia === true);

      const { data: tokens, error: err } = await supabase
        .from('residencia_comedor_tokens')
        .select('jugador_id, token')
        .eq('activo', true);
      if (err) throw err;

      const tokenPorJugador = new Map((tokens || []).map((t: any) => [t.jugador_id, t.token as string]));
      setTarjetas(
        residentes
          .map(j => ({ jugador: j, token: tokenPorJugador.get(j.id) ?? null }))
          .sort((a, b) => a.jugador.nombre.localeCompare(b.jugador.nombre, 'es'))
      );
    } catch (err) {
      console.error('Error cargando QR de comedor:', err);
      setError('Error al cargar los residentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const generarFaltantes = async () => {
    setGenerando(true);
    setError(null);
    try {
      const sinToken = tarjetas.filter(t => !t.token);
      for (const t of sinToken) {
        await supabase.rpc('generar_token_comedor', {
          p_jugador_id: t.jugador.id,
          p_club_id: perfil?.club_id ?? null,
        });
      }
      await cargar();
    } catch (err) {
      console.error('Error generando tokens faltantes:', err);
      setError('Error al generar algún enlace');
    } finally {
      setGenerando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <i className="fa-solid fa-spinner animate-spin text-4xl text-[var(--accent)]"></i>
      </div>
    );
  }

  const faltantes = tarjetas.filter(t => !t.token).length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body * { visibility: hidden; }
          #qr-print, #qr-print * { visibility: visible; }
          #qr-print { position: absolute; inset: 0; }
          .qr-card { break-inside: avoid; page-break-inside: avoid; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print space-y-4">
        <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
          IMPRIMIR QR COMEDOR
        </h2>

        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold flex items-start gap-2">
          <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
          <span>Cada QR es una credencial personal: no cuelgues la hoja completa en un tablón. Recorta y entrega cada tarjeta directamente a su jugador.</span>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            <i className="fa-solid fa-circle-exclamation mr-2"></i>
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 justify-center">
          {faltantes > 0 && (
            <button
              onClick={generarFaltantes}
              disabled={generando}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg disabled:opacity-50"
            >
              <i className="fa-solid fa-link mr-1"></i>
              {generando ? 'Generando...' : `Generar ${faltantes} enlace(s) faltante(s)`}
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            <i className="fa-solid fa-print mr-1"></i>
            Imprimir
          </button>
        </div>
      </div>

      {tarjetas.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <i className="fa-solid fa-qrcode text-4xl text-slate-300 mb-4 block"></i>
          <p className="font-semibold">No hay jugadores marcados como residentes</p>
        </div>
      ) : (
        <div id="qr-print" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tarjetas.map(({ jugador, token }) => (
            <div key={jugador.id} className="qr-card p-4 border border-slate-200 rounded-xl bg-white text-center space-y-2">
              <p className="font-black text-sm uppercase tracking-tighter text-[var(--accent)]">{jugador.nombre}</p>
              {token ? (
                <>
                  <div className="flex justify-center py-2">
                    <QRCodeSVG value={`${window.location.origin}/comedor/${token}`} size={160} level="M" />
                  </div>
                  <p className="text-[9px] text-slate-400 break-all">{`${window.location.origin}/comedor/${token}`}</p>
                </>
              ) : (
                <p className="text-xs text-slate-400 py-8">Sin enlace generado</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComedorQrImprimirView;
