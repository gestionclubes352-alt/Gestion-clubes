import React, { useState, useRef } from 'react';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

interface YouTubeUploadFormProps {
  onVideoUploaded?: (videoId: string, embedUrl: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

const YouTubeUploadForm: React.FC<YouTubeUploadFormProps> = ({
  onVideoUploaded,
  onError,
  className = '',
}) => {
  const { token, loading: authLoading, error: authError, getOAuthToken } = useGoogleAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('video/')) {
        setError('Por favor selecciona un archivo de video válido');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024 * 1024) { // 5GB
        setError('El archivo es demasiado grande (máximo 5GB)');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const uploadToYouTube = async () => {
    if (!file || !title.trim()) {
      setError('Por favor selecciona un archivo y un título');
      return;
    }

    if (!token) {
      setError('Debes autenticarte con Google primero');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('description', description.trim() || `Video: ${title}`);
      formData.append('access_token', token);

      const xhr = new XMLHttpRequest();

      // Monitorear progreso de upload
      if (xhr.upload) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(Math.round(percentComplete));
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.videoId) {
              const embedUrl = `https://www.youtube.com/embed/${response.videoId}`;
              setSuccess(true);
              setFile(null);
              setTitle('');
              setDescription('');
              setUploadProgress(0);

              if (onVideoUploaded) {
                onVideoUploaded(response.videoId, embedUrl);
              }

              // Limpiar mensaje de éxito después de 3 segundos
              setTimeout(() => setSuccess(false), 3000);
            }
          } catch (err) {
            throw new Error('Respuesta inválida del servidor');
          }
        } else {
          throw new Error(`Error en upload: ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Error de conexión durante el upload');
      });

      xhr.open('POST', '/api/youtube/upload');
      xhr.send(formData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      if (onError) {
        onError(message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAuthClick = () => {
    if (!token) {
      getOAuthToken();
    }
  };

  return (
    <div className={`space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100 ${className}`}>
      <div>
        <h4 className="text-slate-900 font-black text-sm uppercase tracking-widest mb-3">
          <i className="fa-solid fa-cloud-arrow-up mr-2"></i>Subir Video a YouTube
        </h4>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
          El video se subirá a tu canal de YouTube y se embebará en la aplicación
        </p>
      </div>

      {/* Autenticación */}
      {!token && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-blue-700 text-[11px] font-black uppercase tracking-widest mb-3">
            <i className="fa-solid fa-lock mr-2"></i>Autenticación requerida
          </p>
          <button
            onClick={handleAuthClick}
            disabled={authLoading}
            className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {authLoading ? 'Cargando...' : 'Conectar con Google'}
          </button>
          {authError && (
            <p className="text-red-600 text-[10px] mt-2">{authError}</p>
          )}
        </div>
      )}

      {/* Formulario de upload */}
      {token && (
        <>
          {/* Selector de archivo */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              <i className="fa-solid fa-film mr-1"></i>Archivo de video
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm cursor-pointer disabled:opacity-50"
            />
            {file && (
              <p className="text-[10px] text-slate-500 mt-2">
                📁 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Título */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              <i className="fa-solid fa-heading mr-1"></i>Título del video *
            </label>
            <input
              type="text"
              placeholder="Ej: Partido vs Real Madrid - Jornada 10"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              maxLength={100}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50"
            />
            <p className="text-[9px] text-slate-400 mt-1">{title.length}/100</p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              <i className="fa-solid fa-align-left mr-1"></i>Descripción (opcional)
            </label>
            <textarea
              placeholder="Agrega detalles sobre el video..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              maxLength={5000}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50 resize-none"
            />
            <p className="text-[9px] text-slate-400 mt-1">{description.length}/5000</p>
          </div>

          {/* Barra de progreso */}
          {uploading && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  Subiendo...
                </p>
                <span className="text-[10px] font-black text-slate-400">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Errores */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-red-700 text-[10px] font-black uppercase tracking-widest">
                <i className="fa-solid fa-circle-exclamation mr-2"></i>{error}
              </p>
            </div>
          )}

          {/* Éxito */}
          {success && (
            <div className="p-3 rounded-xl bg-green-50 border border-green-200">
              <p className="text-green-700 text-[10px] font-black uppercase tracking-widest">
                <i className="fa-solid fa-check-circle mr-2"></i>¡Video subido exitosamente!
              </p>
            </div>
          )}

          {/* Botón de upload */}
          <button
            onClick={uploadToYouTube}
            disabled={!file || !title.trim() || uploading}
            className="w-full bg-red-600 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-upload"></i>
            {uploading ? `Subiendo... ${uploadProgress}%` : 'Subir a YouTube'}
          </button>
        </>
      )}
    </div>
  );
};

export default YouTubeUploadForm;
