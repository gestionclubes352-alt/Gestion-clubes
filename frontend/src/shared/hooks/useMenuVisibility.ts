/**
 * @fileoverview Hook para gestionar la visibilidad de los menús del sidebar.
 * La visibilidad de ítems individuales se persiste en localStorage.
 * La visibilidad de secciones se define en project.ts (configuración de deploy).
 */

import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_VISIBLE_MENU_SET, DEFAULT_VISIBLE_SECTIONS_SET } from '../../config/project';

const STORAGE_KEY = 'menu-visibility';
const VERSION_KEY = 'menu-visibility-version';
/**
 * Versión de la estructura de menú. Incrementar este número
 * cada vez que se añadan o eliminen ítems para forzar el reset
 * del caché de localStorage en los navegadores de los usuarios.
 */
const MENU_VERSION = 17;

/** Definición de cada elemento de menú con su sección padre */
export interface MenuItemDef {
  id: string;
  labelKey: string;
  icon: string;
  section: string;
  /** Si true, no se puede ocultar (ej: Inicio, Configuración) */
  locked?: boolean;
}

/** Todas las entradas de menú disponibles, agrupadas por sección */
export const ALL_MENU_ITEMS: MenuItemDef[] = [
  // General
  { id: 'INICIO', labelKey: 'sidebar.homeLabel', icon: 'fa-house', section: 'general', locked: true },
  // Gestión
  { id: 'CALENDARIO', labelKey: 'sidebar.calendarLabel', icon: 'fa-calendar', section: 'management' },
  { id: 'PLANTILLAS', labelKey: 'sidebar.squadsLabel', icon: 'fa-users', section: 'management' },
  { id: 'CAMPOGRAMA', labelKey: 'sidebar.fieldDiagramLabel', icon: 'fa-diagram-project', section: 'management' },
  { id: 'PERSONAL', labelKey: 'sidebar.technicalStaffLabel', icon: 'fa-user-tie', section: 'management' },
  // Planificación
  { id: 'SESIONES', labelKey: 'sidebar.sessionsLabel', icon: 'fa-calendar-days', section: 'planning' },
  { id: 'PARTIDOS', labelKey: 'sidebar.matchesLabel', icon: 'fa-futbol', section: 'planning' },
  { id: 'COMPETICIÓN', labelKey: 'sidebar.competitionLabel', icon: 'fa-ranking-star', section: 'planning' },
  // Área Médica
  { id: 'LESIONES', labelKey: 'sidebar.injuriesLabel', icon: 'fa-band-aid', section: 'medical' },
  { id: 'HISTORIAL MÉDICO', labelKey: 'sidebar.medicalHistoryLabel', icon: 'fa-file-medical', section: 'medical' },
  { id: 'RECONOCIMIENTOS', labelKey: 'sidebar.checkupsLabel', icon: 'fa-stethoscope', section: 'medical' },
  { id: 'REHABILITACIÓN', labelKey: 'sidebar.rehabilitationLabel', icon: 'fa-heart-pulse', section: 'medical' },
  { id: 'RENDIMIENTO FÍSICO', labelKey: 'sidebar.fitnessLabel', icon: 'fa-dumbbell', section: 'medical' },
  // Herramientas
  { id: 'PIZARRA TÁCTICA', labelKey: 'sidebar.tacticalBoardLabel', icon: 'fa-chalkboard-user', section: 'planning' },
  { id: 'DISEÑADOR', labelKey: 'sidebar.designerLabel', icon: 'fa-person-running', section: 'planning' },
  { id: 'REPOSITORIO DE TAREAS', labelKey: 'sidebar.taskRepositoryLabel', icon: 'fa-book-open', section: 'planning' },
  // Contenido
  { id: 'VIDEOTECA', labelKey: 'sidebar.videoLibraryLabel', icon: 'fa-video', section: 'content' },
  // Admin
  { id: 'CLUBES', labelKey: 'sidebar.clubsLabel', icon: 'fa-shield-halved', section: 'admin' },
  { id: 'EQUIPOS', labelKey: 'sidebar.teamsLabel', icon: 'fa-trophy', section: 'admin' },
  { id: 'EQUIPOS_INTERNOS', labelKey: 'sidebar.internalTeamsLabel', icon: 'fa-users-rectangle', section: 'admin' },
  { id: 'COMPETICIONES', labelKey: 'sidebar.competitionsLabel', icon: 'fa-trophy', section: 'admin' },
  { id: 'LOCALIDADES', labelKey: 'sidebar.locationsLabel', icon: 'fa-map-pin', section: 'admin' },
  { id: 'INSTALACIONES', labelKey: 'sidebar.installationsLabel', icon: 'fa-fence', section: 'admin' },
  { id: 'USUARIOS', labelKey: 'sidebar.usersLabel', icon: 'fa-user-gear', section: 'admin' },
  { id: 'CONFIGURACIÓN', labelKey: 'sidebar.settingsLabel', icon: 'fa-gear', section: 'admin', locked: true },
  { id: 'FUENTE DE DATOS', labelKey: 'header.dataSource', icon: 'fa-database', section: 'admin' },
];

/** Secciones del sidebar con sus claves de traducción */
export const MENU_SECTIONS: { key: string; labelKey: string }[] = [
  { key: 'general', labelKey: 'sidebar.general' },
  { key: 'management', labelKey: 'sidebar.management' },
  { key: 'planning', labelKey: 'sidebar.planning' },
  { key: 'medical', labelKey: 'sidebar.medical' },
  { key: 'tools', labelKey: 'sidebar.tools' },
  { key: 'content', labelKey: 'sidebar.content' },
  { key: 'admin', labelKey: 'sidebar.admin' },
];

type MenuVisibility = Record<string, boolean>;

const isDefaultVisible = (menuId: string): boolean => DEFAULT_VISIBLE_MENU_SET.has(menuId);

/** Visibilidad de sección — solo lectura desde config de deploy */
const isSectionVisibleFromConfig = (sectionKey: string): boolean => DEFAULT_VISIBLE_SECTIONS_SET.has(sectionKey);

function getDefaultVisibility(): MenuVisibility {
  return ALL_MENU_ITEMS.reduce<MenuVisibility>((acc, item) => {
    if (!item.locked && !isDefaultVisible(item.id)) {
      acc[item.id] = false;
    }
    return acc;
  }, {});
}

function loadVisibility(): MenuVisibility {
  try {
    // Si la versión del menú ha cambiado, reseteamos al estado por defecto
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== String(MENU_VERSION)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, String(MENU_VERSION));
      return getDefaultVisibility();
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultVisibility();
    }

    const parsed = JSON.parse(raw) as MenuVisibility;
    return {
      ...getDefaultVisibility(),
      ...parsed,
    };
  } catch {
    return getDefaultVisibility();
  }
}

function saveVisibility(v: MenuVisibility): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
}

/**
 * Hook que expone la visibilidad de cada menú y sección, y funciones para cambiarla.
 * La visibilidad de secciones es de solo lectura (definida en project.ts).
 */
export function useMenuVisibility() {
  const [visibility, setVisibility] = useState<MenuVisibility>(loadVisibility);

  // Sincronizar con otros pestañas/ventanas
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setVisibility(loadVisibility());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  /** Comprobar si una sección es visible (solo lectura, desde config de deploy) */
  const isSectionVisible = useCallback(
    (sectionKey: string): boolean => isSectionVisibleFromConfig(sectionKey),
    []
  );

  /** Comprobar si un menú es visible (por defecto sí) */
  const isVisible = useCallback(
    (menuId: string): boolean => {
      const item = ALL_MENU_ITEMS.find(m => m.id === menuId);
      if (item?.locked) return true;

      // Si la sección del ítem no es visible, el ítem tampoco
      if (item && !isSectionVisibleFromConfig(item.section)) return false;

      if (typeof visibility[menuId] === 'boolean') {
        return visibility[menuId];
      }

      return isDefaultVisible(menuId);
    },
    [visibility]
  );

  /** Cambiar la visibilidad de un menú */
  const setMenuVisible = useCallback((menuId: string, visible: boolean) => {
    setVisibility(prev => {
      const next = { ...prev, [menuId]: visible };
      saveVisibility(next);
      return next;
    });
  }, []);

  /** Cambiar la visibilidad de todos los ítems de una sección */
  const setSectionItemsVisible = useCallback((sectionKey: string, visible: boolean) => {
    setVisibility(prev => {
      const next = { ...prev };
      ALL_MENU_ITEMS
        .filter(m => m.section === sectionKey && !m.locked)
        .forEach(m => { next[m.id] = visible; });
      saveVisibility(next);
      return next;
    });
  }, []);

  /** Restablecer al estado por defecto del proyecto */
  const resetAll = useCallback(() => {
    const defaults = getDefaultVisibility();
    saveVisibility(defaults);
    setVisibility(defaults);
  }, []);

  return {
    isVisible,
    isSectionVisible,
    setMenuVisible,
    setSectionItemsVisible,
    resetAll,
    visibility,
  };
}
