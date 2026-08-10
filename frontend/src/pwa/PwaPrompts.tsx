/**
 * @fileoverview Avisos de la PWA: instalación (A2HS), actualización disponible
 * y estado sin conexión. Se muestran como tarjetas flotantes que respetan
 * la bottom nav y el safe-area del dispositivo.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setUpdateListener } from './registerServiceWorker';

/** Evento no estándar de Chromium para instalar la app */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALL_DISMISSED_KEY = 'pwa-install-dismissed';
/** Si el usuario descarta el aviso, no se vuelve a mostrar en 30 días */
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS Safari expone navigator.standalone en lugar de display-mode
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
  !/crios|fxios/i.test(window.navigator.userAgent);

const wasRecentlyDismissed = () => {
  try {
    const raw = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_TTL_MS;
  } catch {
    return false;
  }
};

const CARD_CLASSES =
  'fixed left-1/2 -translate-x-1/2 z-[120] w-[calc(100%-1.5rem)] max-w-md ' +
  'rounded-2xl border border-slate-200 dark:border-[var(--border-soft)] ' +
  'bg-white dark:bg-[var(--surface-1)] shadow-2xl p-4 animate-slide-up';

const PwaPrompts: React.FC = () => {
  const { t } = useTranslation();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [activateUpdate, setActivateUpdate] = useState<(() => void) | null>(null);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  // Instalación en navegadores Chromium
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      if (isStandalone() || wasRecentlyDismissed()) return;
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstallEvent(null));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // iOS no soporta beforeinstallprompt: se explican los pasos manuales
  useEffect(() => {
    if (isIos() && !isStandalone() && !wasRecentlyDismissed()) {
      const timer = window.setTimeout(() => setShowIosHint(true), 4000);
      return () => window.clearTimeout(timer);
    }
  }, []);

  // Actualización del service worker
  useEffect(() => {
    setUpdateListener((activate) => setActivateUpdate(() => activate));
    return () => setUpdateListener(null);
  }, []);

  // Conectividad
  useEffect(() => {
    const online = () => setIsOffline(false);
    const offline = () => setIsOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  const dismissInstall = useCallback(() => {
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    } catch {
      /* almacenamiento no disponible: se ignora */
    }
    setInstallEvent(null);
    setShowIosHint(false);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }, [installEvent]);

  return (
    <>
      {/* Sin conexión */}
      {isOffline && (
        <div
          role="status"
          className="fixed top-0 left-0 right-0 z-[130] bg-amber-500 text-white text-center text-[11px] font-black uppercase tracking-widest py-1.5 px-3"
          style={{ paddingTop: 'calc(0.375rem + env(safe-area-inset-top, 0px))' }}
        >
          <i className="fa-solid fa-wifi-slash mr-2" aria-hidden="true"></i>
          {t('pwa.offline', 'Sin conexión — mostrando datos ya cargados')}
        </div>
      )}

      {/* Actualización disponible */}
      {activateUpdate && (
        <div
          className={CARD_CLASSES}
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}
          role="dialog"
          aria-label={t('pwa.updateTitle', 'Actualización disponible')}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
              <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {t('pwa.updateTitle', 'Actualización disponible')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('pwa.updateBody', 'Hay una versión nueva de la aplicación.')}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setActivateUpdate(null)}
              className="flex-1 min-h-11 rounded-xl border border-slate-200 dark:border-[var(--border-soft)] text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300"
            >
              {t('pwa.later', 'Más tarde')}
            </button>
            <button
              onClick={() => activateUpdate()}
              className="flex-1 min-h-11 rounded-xl bg-[var(--accent)] text-white text-xs font-black uppercase tracking-widest"
            >
              {t('pwa.reload', 'Actualizar')}
            </button>
          </div>
        </div>
      )}

      {/* Instalar la app */}
      {(installEvent || showIosHint) && !activateUpdate && (
        <div
          className={CARD_CLASSES}
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}
          role="dialog"
          aria-label={t('pwa.installTitle', 'Instalar aplicación')}
        >
          <div className="flex items-start gap-3">
            <img src="/icons/icon-192.png" alt="" className="w-10 h-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {t('pwa.installTitle', 'Instalar Sport Management')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {showIosHint
                  ? t('pwa.installIos', 'Pulsa Compartir y luego “Añadir a pantalla de inicio”.')
                  : t('pwa.installBody', 'Añádela a tu pantalla de inicio para abrirla como una app.')}
              </p>
            </div>
            <button
              onClick={dismissInstall}
              aria-label={t('pwa.dismiss', 'Cerrar')}
              className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center"
            >
              <i className="fa-solid fa-xmark text-sm" aria-hidden="true"></i>
            </button>
          </div>
          {installEvent && (
            <button
              onClick={handleInstall}
              className="w-full min-h-11 mt-3 rounded-xl bg-[var(--accent)] text-white text-xs font-black uppercase tracking-widest"
            >
              {t('pwa.install', 'Instalar')}
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default PwaPrompts;
