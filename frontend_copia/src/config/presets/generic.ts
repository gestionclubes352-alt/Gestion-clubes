/**
 * @fileoverview Preset de configuración genérico
 * @description Configuración base minimalista para cualquier tipo de organización
 */

import type { AppConfig } from '../types';
import {
  DEFAULT_THEME,
  DEFAULT_MODULES,
  DEFAULT_LABELS,
  DEFAULT_MEMBER_ROLES,
  DEFAULT_EVENT_TYPES,
} from '../defaults';

// ============================================================================
// CONFIGURACIÓN GENÉRICA
// ============================================================================

export const createGenericConfig = (
  organizationOverrides?: Partial<AppConfig['organization']>
): AppConfig => ({
  organization: {
    id: 'generic',
    name: 'Mi Organización',
    shortName: 'ORG',
    type: 'generic',
    ...organizationOverrides,
  },
  theme: DEFAULT_THEME,
  modules: DEFAULT_MODULES,
  labels: DEFAULT_LABELS,
  memberRoles: DEFAULT_MEMBER_ROLES,
  memberSubRoles: [],
  eventTypes: DEFAULT_EVENT_TYPES,
  formations: [],
});

export default createGenericConfig;
