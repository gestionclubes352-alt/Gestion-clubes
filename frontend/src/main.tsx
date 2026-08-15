
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { DataSourceProvider } from './context/DataSourceContext';
import { TeamProvider } from './context/TeamContext';
import { TeamFilterProvider } from './context/TeamFilterContext';
import { ThemeProvider } from './context/ThemeContext';
import { UndoRedoProvider } from './context/UndoRedoContext';
import { YouTubeUploadProvider } from './context/YouTubeUploadContext';
import YouTubeUploadStatusWidget from './shared/components/YouTubeUploadStatusWidget';
import { PwaPrompts, registerServiceWorker } from './pwa';

// Importar configuración de i18n (debe estar antes de renderizar)
import './locales';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <TeamProvider>
            <TeamFilterProvider>
              <DataSourceProvider>
                <UndoRedoProvider>
                  <YouTubeUploadProvider>
                    <App />
                    <PwaPrompts />
                    <YouTubeUploadStatusWidget />
                  </YouTubeUploadProvider>
                </UndoRedoProvider>
              </DataSourceProvider>
            </TeamFilterProvider>
          </TeamProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

// PWA: instalación offline y actualizaciones (solo en producción)
registerServiceWorker();
