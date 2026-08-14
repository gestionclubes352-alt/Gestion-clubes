import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadPlayerPhoto } from '../../../shared/services/photoService';
import { removePhotoBackground } from '../../../shared/services/backgroundRemoval';
import { Player } from '../types';
import SearchableSelect from '@shared/components/SearchableSelect';

interface BulkPhotoUploadProps {
  squad: Player[];
  clubId: string;
  onClose: () => void;
  onUploaded: (playerId: Player['id'], fotoUrl: string) => Promise<void>;
}

type RowStatus = 'pending' | 'uploading' | 'done' | 'error';

interface Row {
  key: string;
  file: File;
  previewUrl: string;
  playerId: string;
  status: RowStatus;
  error?: string;
}

const normalize = (value: string): string =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const matchPlayer = (fileName: string, players: Player[]): Player | undefined => {
  const base = fileName.replace(/\.[^.]+$/, '');
  const norm = normalize(base);
  const tokens = norm.split(' ').filter(Boolean);

  const dorsalMatch = players.find(p => tokens.includes(String(p.dorsal)));
  if (dorsalMatch) return dorsalMatch;

  const dniMatch = players.find(p => p.dni && norm.includes(normalize(p.dni)));
  if (dniMatch) return dniMatch;

  let best: { player: Player; score: number } | undefined;
  players.forEach(p => {
    const nameTokens = normalize(p.nombre).split(' ').filter(t => t.length > 2);
    if (nameTokens.length === 0) return;
    const matchCount = nameTokens.filter(t => tokens.includes(t)).length;
    if (matchCount === 0) return;
    const score = matchCount / nameTokens.length;
    if (score >= 0.5 && (!best || score > best.score)) best = { player: p, score };
  });
  return best?.player;
};

const BulkPhotoUpload: React.FC<BulkPhotoUploadProps> = ({ squad, clubId, onClose, onUploaded }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedSquad = useMemo(
    () => [...squad].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [squad]
  );

  const addFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    const newRows: Row[] = files.map(file => {
      const matched = matchPlayer(file.name, squad);
      return {
        key: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        previewUrl: URL.createObjectURL(file),
        playerId: matched ? String(matched.id) : '',
        status: 'pending',
      };
    });
    setRows(prev => [...prev, ...newRows]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeRow = (key: string) => {
    setRows(prev => {
      const row = prev.find(r => r.key === key);
      if (row) URL.revokeObjectURL(row.previewUrl);
      return prev.filter(r => r.key !== key);
    });
  };

  const setRowPlayer = (key: string, playerId: string) => {
    setRows(prev => prev.map(r => (r.key === key ? { ...r, playerId } : r)));
  };

  const matchedCount = rows.filter(r => r.playerId).length;
  const doneCount = rows.filter(r => r.status === 'done').length;
  const hasErrors = rows.some(r => r.status === 'error');

  const handleUploadAll = async () => {
    setIsUploading(true);
    for (const row of rows) {
      if (!row.playerId || row.status === 'done') continue;
      setRows(prev => prev.map(r => (r.key === row.key ? { ...r, status: 'uploading' } : r)));
      try {
        const processedFile = await removePhotoBackground(row.file);
        const fotoUrl = await uploadPlayerPhoto(processedFile, row.playerId, clubId);
        await onUploaded(row.playerId, fotoUrl);
        setRows(prev => prev.map(r => (r.key === row.key ? { ...r, status: 'done' } : r)));
      } catch (err) {
        setRows(prev =>
          prev.map(r =>
            r.key === row.key
              ? { ...r, status: 'error', error: err instanceof Error ? err.message : String(err) }
              : r
          )
        );
      }
    }
    setIsUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-fade-in text-slate-800 flex flex-col w-full max-w-3xl max-h-[95dvh] sm:max-h-[85dvh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-[var(--accent)] font-black text-lg uppercase tracking-tighter">
              {t('bulkPhotoUpload.title')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{t('bulkPhotoUpload.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={handleFileChange}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-images text-2xl text-[var(--accent)] opacity-40 mb-2"></i>
            <p className="text-sm font-bold text-slate-600">{t('bulkPhotoUpload.dropHint')}</p>
            <p className="text-[11px] text-slate-400 mt-1">{t('bulkPhotoUpload.fileTypesHint')}</p>
          </div>

          {rows.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {rows.map(row => {
                const player = squad.find(p => String(p.id) === row.playerId);
                return (
                  <div
                    key={row.key}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 min-w-0">
                      <img loading="lazy" decoding="async" src={row.previewUrl} className="w-11 h-11 rounded-lg object-cover object-top border border-slate-200 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-slate-400 truncate">{row.file.name}</p>
                        <SearchableSelect
                          value={row.playerId}
                          disabled={row.status === 'uploading' || row.status === 'done'}
                          onChange={e => setRowPlayer(row.key, e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none font-semibold text-slate-700 disabled:opacity-60"
                        >
                          <option value="">{t('bulkPhotoUpload.noMatch')}</option>
                          {sortedSquad.map(p => (
                            <option key={String(p.id)} value={String(p.id)}>
                              {p.dorsal ? `#${p.dorsal} ` : ''}
                              {p.nombre}
                            </option>
                          ))}
                        </SearchableSelect>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-auto sm:ml-0">
                      <div className="shrink-0 w-24 text-center">
                        {row.status === 'pending' && player && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                            <i className="fa-solid fa-check"></i>
                            {t('bulkPhotoUpload.matched')}
                          </span>
                        )}
                        {row.status === 'pending' && !player && (
                          <span className="text-[10px] font-bold text-amber-500 uppercase">
                            {t('bulkPhotoUpload.unmatched')}
                          </span>
                        )}
                        {row.status === 'uploading' && (
                          <i className="fa-solid fa-spinner animate-spin text-slate-400"></i>
                        )}
                        {row.status === 'done' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                            <i className="fa-solid fa-circle-check"></i>
                            {t('bulkPhotoUpload.done')}
                          </span>
                        )}
                        {row.status === 'error' && (
                          <span className="text-[10px] font-bold text-red-500 uppercase" title={row.error}>
                            {t('bulkPhotoUpload.error')}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeRow(row.key)}
                        disabled={row.status === 'uploading'}
                        className="shrink-0 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
                        title={t('bulkPhotoUpload.remove')}
                      >
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky bottom-0">
          <p className="text-xs text-slate-400 font-medium">
            {rows.length > 0 ? t('bulkPhotoUpload.summary', { done: doneCount, total: rows.length }) : ''}
            {hasErrors && !isUploading && (
              <span className="block text-red-500 mt-0.5">{t('bulkPhotoUpload.someErrors')}</span>
            )}
            {doneCount === rows.length && rows.length > 0 && !hasErrors && (
              <span className="block text-emerald-600 mt-0.5">{t('bulkPhotoUpload.allDone')}</span>
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 sm:flex-none py-3 px-5 border border-slate-200 rounded-2xl font-black text-slate-600 bg-white hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest disabled:opacity-50"
            >
              {t('bulkPhotoUpload.close')}
            </button>
            <button
              onClick={handleUploadAll}
              disabled={isUploading || matchedCount === 0}
              className="flex-1 sm:flex-none py-3 px-5 bg-[var(--accent)] text-white rounded-2xl font-black hover:bg-[var(--accent-dark)] transition-all shadow-xl shadow-[var(--accent)]/20 uppercase text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  {t('bulkPhotoUpload.uploading')}
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  {t('bulkPhotoUpload.uploadAll', { count: matchedCount })}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkPhotoUpload;
