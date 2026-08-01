
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { DataSourceProvider } from './context/DataSourceContext';
import { TeamProvider } from './context/TeamContext';
import { TeamFilterProvider } from './context/TeamFilterContext';

// Importar configuración de i18n (debe estar antes de renderizar)
import './locales';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TeamProvider>
          <TeamFilterProvider>
            <DataSourceProvider>
              <App />
            </DataSourceProvider>
          </TeamFilterProvider>
        </TeamProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
