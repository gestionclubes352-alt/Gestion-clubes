/**
 * @fileoverview Registro del service worker de la PWA.
 * Solo se registra en producción y sobre origen seguro (https o localhost),
 * para no interferir con el HMR de Vite en desarrollo.
 */

type UpdateListener = (activate: () => void) => void;

let onUpdateReady: UpdateListener | null = null;
const SW_VERSION = '2026-08-19-v2';

/** Permite a la UI enterarse de que hay una versión nueva esperando */
export function setUpdateListener(listener: UpdateListener | null) {
  onUpdateReady = listener;
}

const notifyUpdate = (registration: ServiceWorkerRegistration) => {
  onUpdateReady?.(() => {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
  });
};

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // En desarrollo un SW cachearía módulos servidos por Vite y rompería el HMR.
  if (import.meta.env.DEV) return;

  const isSecure = window.isSecureContext || location.hostname === 'localhost';
  if (!isSecure) return;

  window.addEventListener('load', () => {
    // Añadimos un cache-buster al script del SW para romper shells antiguos
    // que pudieran seguir sirviendo bundles viejos con rutas obsoletas.
    navigator.serviceWorker.register(`/sw.js?v=${SW_VERSION}`, { scope: '/' })
      .then((registration) => {
        // Ya hay una versión nueva esperando (pestaña abierta de una sesión previa)
        if (registration.waiting && navigator.serviceWorker.controller) {
          notifyUpdate(registration);
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            // "installed" + controller existente = actualización lista, no primera instalación
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdate(registration);
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[PWA] No se pudo registrar el service worker:', error);
      });

    // Al activarse el SW nuevo se recarga una única vez para servir los assets nuevos
    let hasReloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hasReloaded) return;
      hasReloaded = true;
      window.location.reload();
    });
  });
}
