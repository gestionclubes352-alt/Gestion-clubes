import React, { useState } from 'react';

interface AddCampoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nombre: string, superficie: string) => Promise<void>;
}

const AddCampoModal: React.FC<AddCampoModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [nombre, setNombre] = useState('');
  const [superficie, setSuperficie] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const superficieOptions = ['Artificial', 'Natural', 'Pabellón'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError('Debes ingresar un nombre para el campo');
      return;
    }

    if (!superficie || !superficie.trim()) {
      setError('Debes seleccionar el tipo de superficie');
      return;
    }

    try {
      setLoading(true);
      await onSave(nombre, superficie);
      setNombre('');
      setSuperficie('');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al agregar el campo';
      setError(msg);
      console.error('Error adding campo:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNombre('');
    setSuperficie('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-[var(--accent)] font-black text-lg uppercase tracking-tighter flex items-center gap-2">
            <i className="fa-solid fa-plus"></i>
            Agregar Campo
          </h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Nombre del campo *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Campo A, Campo B..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Tipo de Superficie *
            </label>
            <select
              value={superficie}
              onChange={(e) => setSuperficie(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)] bg-white"
            >
              <option value="">Selecciona un tipo...</option>
              {superficieOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            CANCELAR
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            {loading ? 'AGREGANDO...' : 'AGREGAR'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCampoModal;
