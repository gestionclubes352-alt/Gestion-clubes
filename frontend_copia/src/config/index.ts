/**
 * @fileoverview Punto de entrada principal de configuración
 * @description Exporta toda la configuración de la aplicación
 */

// Tipos
export * from './types';

// Valores por defecto
export * from './defaults';

// Presets
export * from './presets';
export * from './project';

// Configuración activa de la aplicación
// Importar el preset deseado y configurar aquí
import { createCompanyConfig } from './presets/company';
import { createFootballClubConfig } from './presets/football-club';
import { createGenericConfig } from './presets/generic';
import { PROJECT_CONFIG } from './project';
import type { AppConfig, ModulesConfig } from './types';

/**
 * =====================================================================
 * CONFIGURACIÓN DE LA ORGANIZACIÓN
 * =====================================================================
 * 
 * Para cambiar de organización, modifica los valores a continuación.
 * Puedes usar un preset predefinido y personalizarlo:
 * 
 * - createFootballClubConfig(): Club de fútbol
 * - createCompanyConfig(): Empresa
 * - createGenericConfig(): Organización genérica
 * 
 * Ejemplo de uso:
 * 
 * export const APP_CONFIG = createFootballClubConfig({
 *   name: 'Athletic Club',
 *   shortName: 'ATH',
 *   season: '2025-26',
 *   location: 'Bilbao',
 * });
 */

const PRESET_FACTORIES = {
  generic: createGenericConfig,
  'football-club': createFootballClubConfig,
  company: createCompanyConfig,
} as const;

const mergeModules = (
  baseModules: ModulesConfig,
  moduleOverrides?: Partial<ModulesConfig>
): ModulesConfig => {
  if (!moduleOverrides) return baseModules;

  const merged = { ...baseModules };

  (Object.keys(moduleOverrides) as (keyof ModulesConfig)[]).forEach((moduleKey) => {
    const override = moduleOverrides[moduleKey];
    if (!override) return;

    merged[moduleKey] = {
      ...baseModules[moduleKey],
      ...override,
    };
  });

  return merged;
};

const baseConfig = PRESET_FACTORIES[PROJECT_CONFIG.preset](PROJECT_CONFIG.organizationOverrides);

export const APP_CONFIG: AppConfig = {
  ...baseConfig,
  modules: mergeModules(baseConfig.modules, PROJECT_CONFIG.moduleOverrides),
};

// Helper para obtener la configuración actual
export const getConfig = (): AppConfig => APP_CONFIG;

// Helper para obtener módulos habilitados
export const getEnabledModules = () => {
  return Object.entries(APP_CONFIG.modules)
    .filter(([, config]) => config.enabled)
    .map(([key, config]) => ({ key, ...config }));
};

// Helper para obtener un tipo de evento por ID
export const getEventType = (typeId: string) => {
  return APP_CONFIG.eventTypes.find(et => et.id === typeId);
};

// Helper para obtener un rol de miembro por ID
export const getMemberRole = (roleId: string) => {
  return APP_CONFIG.memberRoles.find(r => r.id === roleId);
};

// Helper para obtener formaciones disponibles
export const getFormations = () => {
  return APP_CONFIG.formations || [];
};

// Helper para verificar si un módulo está habilitado
export const isModuleEnabled = (moduleKey: keyof AppConfig['modules']): boolean => {
  return APP_CONFIG.modules[moduleKey]?.enabled ?? false;
};
