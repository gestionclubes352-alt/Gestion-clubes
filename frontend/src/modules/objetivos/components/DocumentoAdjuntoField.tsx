import React, { useRef, useState } from 'react';
import {
  uploadObjetivoDocumento,
  openObjetivoDocumento,
  removeObjetivoDocumento,
  type DocumentoAdjunto,
} from '@shared/services/objetivoDocumentoService';

const DocumentoAdjuntoField: React.FC<{
  documento?: DocumentoAdjunto;
  onChange: (doc: DocumentoAdjunto | undefined) => void;
}> = ({ documento, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      setBusy(true);
      const subido = await uploadObjetivoDocumento(file);
      // Si ya había uno, se sustituye: se borra el anterior del almacenamiento.
      if (documento) removeObjetivoDocumento(documento.path).catch(() => {});
      onChange(subido);
    } catch (err) {
      setError((err as { message?: string } | null)?.message || 'No se pudo subir el documento.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async () => {
    if (!documento) return;
    setError(null);
    try {
      await openObjetivoDocumento(documento.path);
    } catch (err) {
      setError((err as { message?: string } | null)?.message || 'No se pudo abrir el documento.');
    }
  };

  const handleRemove = async () => {
    if (!documento) return;
    setError(null);
    try {
      await removeObjetivoDocumento(documento.path);
    } catch {
      // Si el fichero ya no existe, se quita igualmente la referencia.
    }
    onChange(undefined);
  };

  return (
    <div>
      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Documento</label>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        onChange={handleFile}
        className="hidden"
      />
      <div className="flex items-center gap-2 flex-wrap">
        {documento && (
          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-[var(--accent)]/40 max-w-full"
            title="Abrir documento"
          >
            <i className="fa-solid fa-file-lines text-[var(--accent)]"></i>
            <span className="truncate max-w-[14rem]">{documento.nombre}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <i className={`fa-solid ${busy ? 'fa-spinner animate-spin' : 'fa-paperclip'} mr-1`}></i>
          {busy ? 'Subiendo...' : documento ? 'Cambiar' : 'Adjuntar documento'}
        </button>
        {documento && (
          <button
            type="button"
            onClick={handleRemove}
            title="Quitar documento"
            className="w-8 h-8 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
};

export default DocumentoAdjuntoField;
