/**
 * Sport Management - Sports Management Platform
 * 
 * Arquitectura Modular Configurable:
 * 
 * src/
 * ├── config/            # Sistema de configuración genérico
 * │   ├── types.ts       # Tipos de configuración
 * │   ├── defaults.ts    # Valores por defecto
 * │   ├── presets/       # Presets (football, company, etc.)
 * │   └── index.ts       # Configuración activa
 * │
 * ├── context/           # Contextos de React
 * │   └── OrganizationContext.tsx
 * │
 * ├── data/              # Datos de ejemplo/seed
 * │   └── seed-data.ts
 * │
 * ├── modules/           # Módulos de dominio
 * │   ├── plantilla/     # Gestión de miembros
 * │   ├── staff/         # Staff/directivos
 * │   ├── partidos/      # Eventos competitivos
 * │   ├── entrenamientos/# Campogramas y ejercicios
 * │   ├── tactica/       # Pizarras tácticas
 * │   ├── calendario/    # Eventos y sesiones
 * │   ├── competicion/   # Grupos y clasificación
 * │   ├── videoteca/     # Análisis de video
 * │   ├── usuarios/      # Control de acceso
 * │   └── dashboard/     # Vista principal
 * │
 * └── shared/            # Código compartido
 *     ├── components/    # Componentes genéricos configurables
 *     ├── hooks/         # Hooks reutilizables
 *     ├── services/      # DataService, Gemini, etc.
 *     └── types/         # Tipos compartidos
 * 
 * Para cambiar de organización, edita src/config/index.ts
 */

// Configuración
export * from './config';

// Contextos
export * from './context';

// Datos de ejemplo
export * from './data';

// Re-export todo desde módulos
export * from './modules';

// Re-export todo desde shared
export * from './shared';

// Nombres ambiguos entre módulos y shared: se re-exportan explícitamente
// para que el componente (módulo) gane sobre el tipo de fila de BD homónimo.
export type { PizarraTactica } from './modules';
export type { UserRole } from './modules';

