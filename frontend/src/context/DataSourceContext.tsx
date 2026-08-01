/**
 * @fileoverview Contexto para gestionar las fuentes de datos de la aplicación
 * @description Permite alternar entre base de datos, Google Sheets y archivos CSV
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Tipos de fuentes de datos disponibles
export type DataSourceType = 'database' | 'google-sheets' | 'csv';

export interface DataSourceOption {
  id: DataSourceType;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
}

interface DataSourceState {
  activeSource: DataSourceType;
  sources: DataSourceOption[];
  isLoading: boolean;
  lastSync: Date | null;
}

interface DataSourceContextType extends DataSourceState {
  setActiveSource: (source: DataSourceType) => void;
  checkConnection: (source: DataSourceType) => Promise<boolean>;
  getSourceStatus: (source: DataSourceType) => DataSourceOption | undefined;
}

const DEFAULT_SOURCES: DataSourceOption[] = [
  {
    id: 'database',
    name: 'Base de Datos',
    description: 'Almacenamiento local o Firestore',
    icon: 'fa-database',
    enabled: true,
    status: 'connected'
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Importar datos desde una hoja de cálculo de Google',
    icon: 'fa-table',
    enabled: true,
    status: 'disconnected'
  },
  {
    id: 'csv',
    name: 'Archivos CSV',
    description: 'Importar datos desde archivos CSV',
    icon: 'fa-file-csv',
    enabled: true,
    status: 'disconnected'
  }
];

const STORAGE_KEY = 'sport_management_datasource';

const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined);

export const DataSourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DataSourceState>({
    activeSource: 'database',
    sources: DEFAULT_SOURCES,
    isLoading: true,
    lastSync: null
  });

  // Cargar preferencias guardadas
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setState(prev => ({
          ...prev,
          activeSource: parsed.activeSource || 'database',
          isLoading: false,
          lastSync: parsed.lastSync ? new Date(parsed.lastSync) : null
        }));
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Guardar preferencias al cambiar
  useEffect(() => {
    if (!state.isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activeSource: state.activeSource,
        lastSync: state.lastSync?.toISOString()
      }));
    }
  }, [state.activeSource, state.lastSync, state.isLoading]);

  const setActiveSource = useCallback((source: DataSourceType) => {
    setState(prev => ({
      ...prev,
      activeSource: source,
      lastSync: new Date(),
      sources: prev.sources.map(s => ({
        ...s,
        status: s.id === source ? 'connected' : 'disconnected'
      }))
    }));
  }, []);

  const checkConnection = useCallback(async (source: DataSourceType): Promise<boolean> => {
    // Por ahora, simular verificación de conexión
    // En el futuro, implementar verificaciones reales
    switch (source) {
      case 'database':
        // Verificar conexión a base de datos local
        return true;
      case 'google-sheets':
        // Google Sheets siempre disponible si hay URL configurada
        return true;
      case 'csv':
        // CSV siempre disponible
        return true;
      default:
        return false;
    }
  }, []);

  const getSourceStatus = useCallback((source: DataSourceType) => {
    return state.sources.find(s => s.id === source);
  }, [state.sources]);

  const value: DataSourceContextType = {
    ...state,
    setActiveSource,
    checkConnection,
    getSourceStatus
  };

  return (
    <DataSourceContext.Provider value={value}>
      {children}
    </DataSourceContext.Provider>
  );
};

export const useDataSource = (): DataSourceContextType => {
  const context = useContext(DataSourceContext);
  if (!context) {
    throw new Error('useDataSource debe usarse dentro de un DataSourceProvider');
  }
  return context;
};

export default DataSourceContext;
