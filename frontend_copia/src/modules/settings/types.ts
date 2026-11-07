/**
 * @fileoverview Tipos para el módulo de configuración
 */

import { DataSourceType } from '@context/index';

export interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export interface DataSourceConfig {
  type: DataSourceType;
  isActive: boolean;
  connectionUrl?: string;
  apiKey?: string;
  lastConnected?: Date;
}

export interface AppSettings {
  dataSources: DataSourceConfig[];
  theme: 'light' | 'dark' | 'system';
  language: 'es' | 'en';
  notifications: boolean;
}
