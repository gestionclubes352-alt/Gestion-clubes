import { useState, useEffect } from 'react';

interface GoogleAuthToken {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export const useGoogleAuth = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cargar script de Google
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const initiateLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        throw new Error('Google Client ID no configurado');
      }

      // Usar Google Accounts Library para obtener token
      if (!window.google) {
        throw new Error('Google API no cargada');
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button') as HTMLElement,
        { theme: 'outline', size: 'large' }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
      console.error('Error initiating Google login:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialResponse = (response: any) => {
    try {
      const token = response.credential;
      setToken(token);
      localStorage.setItem('google_access_token', token);
    } catch (err) {
      setError('Error al procesar respuesta de Google');
      console.error('Error handling credential response:', err);
    }
  };

  const getOAuthToken = async () => {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = `${window.location.origin}/oauth2callback`;

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'token');
      authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly');
      authUrl.searchParams.append('access_type', 'offline');
      authUrl.searchParams.append('prompt', 'consent');

      window.location.href = authUrl.toString();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error obteniendo token OAuth';
      setError(message);
      console.error('Error getting OAuth token:', err);
    }
  };

  return {
    token,
    loading,
    error,
    initiateLogin,
    getOAuthToken,
  };
};

// Declaración global para TypeScript
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: (onSuccess: (response: any) => void, onError?: () => void) => void;
        };
      };
    };
  }
}
