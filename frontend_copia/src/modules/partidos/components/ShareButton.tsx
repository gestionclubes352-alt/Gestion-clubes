import React, { useState } from 'react';
import { createShareLink, copyShareUrlToClipboard } from '@shared/services/shareService';

interface ShareButtonProps {
  matchReportId: string;
  eventId?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({
  matchReportId,
  eventId,
  startTimestamp,
  endTimestamp,
  size = 'md',
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleShare = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create the share link
      const shareToken = await createShareLink(
        matchReportId,
        eventId || null,
        startTimestamp || null,
        endTimestamp || null
      );

      // Copy to clipboard
      await copyShareUrlToClipboard(shareToken.token);

      // Show success toast
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Error sharing video:', err);
      setError(err instanceof Error ? err.message : 'Error al compartir');
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-[9px]',
    md: 'px-4 py-2 text-[10px]',
    lg: 'px-6 py-3 text-xs',
  };

  return (
    <>
      <button
        onClick={handleShare}
        disabled={loading}
        className={`
          ${sizeClasses[size]}
          rounded-lg border border-slate-300 bg-white text-slate-700
          font-bold uppercase tracking-widest
          hover:border-sport-primary hover:text-sport-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all flex items-center gap-2
          ${className}
        `}
        title="Compartir este vídeo"
      >
        <i className={`fa-solid fa-${loading ? 'spinner fa-spin' : 'share-nodes'}`}></i>
        {size !== 'sm' && 'Compartir'}
      </button>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg font-bold text-sm uppercase tracking-widest animate-fade-in z-50">
          <i className="fa-solid fa-check mr-2"></i>
          Enlace copiado al portapapeles
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-red-600 text-xs font-bold mt-1">
          <i className="fa-solid fa-circle-exclamation mr-1"></i>
          {error}
        </div>
      )}
    </>
  );
};

export default ShareButton;
