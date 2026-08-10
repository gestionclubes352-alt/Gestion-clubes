/**
 * @fileoverview Panel de configuración e importación de datos de RapidAPI Football
 * @description Wrapper que muestra el wizard de configuración de equipo
 */

import React, { useState, useEffect } from 'react';
import { TeamSetupWizard } from './TeamSetupWizard';
import { rapidApiFootballService } from '@shared/services';
import { getTeamConfig } from '@shared/services/dataService';
import type { LegacyTeamConfig } from '@shared/services/dataService';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const RapidApiSettings: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [savedConfig, setSavedConfig] = useState<LegacyTeamConfig | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Verificar conexión y cargar configuración guardada
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const leagues = await rapidApiFootballService.getLeagues();
        setIsConnected(leagues.length > 0);
      } catch {
        setIsConnected(false);
      }
    };
    
    // Cargar configuración guardada (per-team)
    const saved = getTeamConfig();
    if (saved) {
      setSavedConfig(saved);
    }
    
    checkConnection();
  }, []);

  // Loading state
  if (isConnected === null) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full"></div>
          <span className="text-slate-600">Verificando conexión con RapidAPI...</span>
        </div>
      </div>
    );
  }

  // No connection
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <i className="fa-solid fa-futbol text-3xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-black">Importar desde RapidAPI</h3>
              <p className="text-white/80 text-sm">
                Configura tu equipo con datos reales de fútbol
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-300"></div>
            <span className="text-sm">Sin conexión</span>
          </div>
        </div>
        
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl">
          <h4 className="font-bold text-amber-800 mb-2">
            <i className="fa-solid fa-triangle-exclamation mr-2"></i>
            Configuración requerida
          </h4>
          <p className="text-amber-700 text-sm mb-4">
            Para usar esta integración, añade las siguientes variables de entorno:
          </p>
          <pre className="bg-amber-900/10 p-4 rounded-lg text-xs text-amber-800 overflow-x-auto">
{`# .env.local
VITE_RAPIDAPI_KEY=tu_api_key_aqui
VITE_RAPIDAPI_HOST=free-api-live-football-data.p.rapidapi.com`}
          </pre>
          <p className="text-amber-700 text-sm mt-4">
            Después de configurar las variables, reinicia el servidor de desarrollo.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-all"
          >
            <i className="fa-solid fa-rotate mr-2"></i>
            Reintentar conexión
          </button>
        </div>
      </div>
    );
  }

  // Show wizard if requested or no config saved
  if (showWizard || !savedConfig) {
    return <TeamSetupWizard />;
  }

  // Show current config with option to reconfigure
  return (
    <div className="space-y-6">
      {/* Header with current config */}
      <div className="p-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl text-white">
        <div className="flex flex-wrap items-center gap-4">
          {savedConfig.teamLogo && (
            <img loading="lazy" decoding="async" src={savedConfig.teamLogo} alt="" className="w-14 h-14 object-contain bg-white/20 rounded-2xl p-2" />
          )}
          <div className="flex-1 min-w-[140px]">
            <h3 className="text-xl font-black">{savedConfig.teamName}</h3>
            <p className="text-white/80 text-sm">{savedConfig.leagueName}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-300"></div>
            <span className="text-sm">Conectado</span>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-white/60">
          <i className="fa-solid fa-clock mr-1"></i>
          Importado: {new Date(savedConfig.importedAt).toLocaleString('es-ES')}
        </div>
      </div>

      {/* Current team info */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200">
        <h4 className="font-bold text-slate-700 mb-4">
          <i className="fa-solid fa-shield mr-2 text-blue-500"></i>
          Equipo configurado
        </h4>
        
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
          {savedConfig.teamLogo && (
            <img loading="lazy" decoding="async" src={savedConfig.teamLogo} alt="" className="w-16 h-16 object-contain" />
          )}
          <div>
            <div className="font-bold text-lg text-slate-700">{savedConfig.teamName}</div>
            <div className="text-sm text-slate-500">{savedConfig.leagueName}</div>
            <div className="text-xs text-slate-400 mt-1">ID: {savedConfig.teamId}</div>
          </div>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="mt-4 w-full p-3 border-2 border-dashed border-slate-300 hover:border-[var(--accent)] rounded-xl text-slate-500 hover:text-[var(--accent)] transition-all"
        >
          <i className="fa-solid fa-rotate mr-2"></i>
          Cambiar equipo o reimportar datos
        </button>
      </div>
    </div>
  );
};

export default RapidApiSettings;
