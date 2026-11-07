import { useEffect, useRef } from 'react';
import { useUndoRedo, AppState } from '@context/UndoRedoContext';

interface AppStateSnapshot {
  squadList: any[];
  usersList: any[];
  personalList: any[];
  competitionTeams: any[];
  clubesList: any[];
  campogramasList: any[];
  eventsList: any[];
}

const DEBOUNCE_TIME = 1000; // 1 segundo de debounce para evitar guardar demasiado seguido

export const useAppStateHistory = (state: AppStateSnapshot) => {
  const { pushState, getCurrentState } = useUndoRedo();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<AppStateSnapshot | null>(null);

  useEffect(() => {
    // Solo guardar si el estado ha cambiado significativamente
    if (lastStateRef.current === state) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // Verificar que algo realmente cambió
      if (JSON.stringify(lastStateRef.current) !== JSON.stringify(state)) {
        pushState(state as Partial<AppState>);
        lastStateRef.current = state;
      }
    }, DEBOUNCE_TIME);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [state, pushState]);
};

export default useAppStateHistory;
