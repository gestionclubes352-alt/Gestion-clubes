import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

export interface AppState {
  squadList: any[];
  usersList: any[];
  personalList: any[];
  competitionTeams: any[];
  clubesList: any[];
  campogramasList: any[];
  eventsList: any[];
  editingPlayer: any | null;
  editingUser: any | null;
  editingStaff: any | null;
  editingEvent: any | null;
  activeCampograma: any | null;
  timestamp: number;
  frames?: any[];
  arrowFrames?: any[];
  ballFrames?: any[];
}

interface UndoRedoContextType {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => AppState | null;
  redo: () => AppState | null;
  pushState: (newState: Partial<AppState>) => void;
  getCurrentState: () => AppState | null;
  historyLength: number;
  historyIndex: number;
  clearHistory: () => void;
  setOnStateRestore: (callback: (state: AppState) => void) => void;
}

const UndoRedoContext = createContext<UndoRedoContextType | undefined>(undefined);

const HISTORY_MAX_SIZE = 50;

export const UndoRedoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<AppState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const onStateRestoreRef = useRef<((state: AppState) => void) | null>(null);

  const pushState = useCallback((newState: Partial<AppState>) => {
    setHistory(prev => {
      // Eliminar estados adelante del índice actual (si hemos deshecho y ahora hacemos algo nuevo)
      const newHistory = prev.slice(0, historyIndex + 1);

      // Crear el nuevo estado completo
      const lastState = historyIndex >= 0 ? prev[historyIndex] : {};
      const completeState: AppState = {
        squadList: [],
        usersList: [],
        personalList: [],
        competitionTeams: [],
        clubesList: [],
        campogramasList: [],
        eventsList: [],
        editingPlayer: null,
        editingUser: null,
        editingStaff: null,
        editingEvent: null,
        activeCampograma: null,
        timestamp: Date.now(),
        ...lastState,
        ...newState,
      };

      newHistory.push(completeState);

      // Limitar el tamaño del historial
      if (newHistory.length > HISTORY_MAX_SIZE) {
        newHistory.shift();
        setHistoryIndex(prev => Math.max(0, prev - 1));
      } else {
        setHistoryIndex(newHistory.length - 1);
      }

      return newHistory;
    });
  }, [historyIndex]);

  const undo = useCallback((): AppState | null => {
    setHistory(prev => {
      setHistoryIndex(current => {
        const newIndex = Math.max(0, current - 1);
        if (newIndex >= 0 && newIndex < prev.length) {
          onStateRestoreRef.current?.(prev[newIndex]);
          return newIndex;
        }
        return current;
      });
      return prev;
    });
    return null;
  }, []);

  const redo = useCallback((): AppState | null => {
    setHistory(prev => {
      setHistoryIndex(current => {
        const newIndex = Math.min(prev.length - 1, current + 1);
        if (newIndex >= 0 && newIndex < prev.length) {
          onStateRestoreRef.current?.(prev[newIndex]);
          return newIndex;
        }
        return current;
      });
      return prev;
    });
    return null;
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  const getCurrentState = useCallback((): AppState | null => {
    return historyIndex >= 0 && historyIndex < history.length ? history[historyIndex] : null;
  }, [history, historyIndex]);

  const setOnStateRestore = useCallback((callback: (state: AppState) => void) => {
    onStateRestoreRef.current = callback;
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <UndoRedoContext.Provider
      value={{
        canUndo,
        canRedo,
        undo,
        redo,
        pushState,
        getCurrentState,
        historyLength: history.length,
        historyIndex,
        clearHistory,
        setOnStateRestore,
      }}
    >
      {children}
    </UndoRedoContext.Provider>
  );
};

export const useUndoRedo = (): UndoRedoContextType => {
  const context = useContext(UndoRedoContext);
  if (!context) {
    throw new Error('useUndoRedo debe usarse dentro de UndoRedoProvider');
  }
  return context;
};
