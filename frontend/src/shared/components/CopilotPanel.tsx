import React, { useState, useRef, useEffect } from 'react';
import { GeminiService, ChatMessage } from '../services/geminiService';

interface CopilotPanelProps {
  context?: {
    players?: any[];
    staff?: any[];
    events?: any[];
    teams?: any[];
  };
}

const PANEL_WIDTH = 380;

export const CopilotPanel: React.FC<CopilotPanelProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Atajo de teclado: Ctrl+/ para mostrar/ocultar el asistente
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+/ o Cmd+/ para toggle
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Escape para cerrar
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus en el input cuando se abre el panel
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await GeminiService.askAssistant(userMessage.content, context);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu pregunta. Inténtalo de nuevo.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Botón flotante para abrir el asistente */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-sport-primary text-white rounded-full shadow-lg hover:bg-red-700 hover:scale-105 transition-all duration-200 flex items-center justify-center group"
          title="Abrir asistente (Ctrl+/)"
        >
          <i className="fa-solid fa-robot text-lg group-hover:scale-110 transition-transform"></i>
          <span className="absolute -top-10 right-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Ctrl + /
          </span>
        </button>
      )}

      {/* Panel del asistente */}
      <div
        className={`fixed top-0 right-0 h-full z-[60] bg-white shadow-2xl transition-transform duration-300 ease-in-out w-full sm:w-[380px] ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-sport-primary rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-robot text-white text-sm"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Asistente</h3>
                <p className="text-[10px] text-slate-400 font-medium">Ctrl+/ para ocultar</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
                  title="Limpiar chat"
                >
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
                title="Cerrar asistente"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
          </div>

          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <i className="fa-solid fa-comments text-2xl text-slate-300"></i>
                </div>
                <p className="text-sm text-slate-400 font-medium mb-2">¡Hola! Soy tu asistente</p>
                <p className="text-xs text-slate-300">
                  Pregunta sobre jugadores, partidos, tácticas o cualquier aspecto del equipo
                </p>
                <div className="mt-6 space-y-2 w-full">
                  <button 
                    onClick={() => setInput('¿Cuántos jugadores hay en plantilla?')}
                    className="w-full text-left px-3 py-2 text-xs text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    💡 ¿Cuántos jugadores hay?
                  </button>
                  <button 
                    onClick={() => setInput('Próximo partido')}
                    className="w-full text-left px-3 py-2 text-xs text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    💡 ¿Cuál es el próximo partido?
                  </button>
                  <button 
                    onClick={() => setInput('Lista de jugadores')}
                    className="w-full text-left px-3 py-2 text-xs text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    💡 Ver toda la plantilla
                  </button>
                  <button 
                    onClick={() => setInput('Personal')}
                    className="w-full text-left px-3 py-2 text-xs text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    💡 ¿Quién forma el staff?
                  </button>
                  <button 
                    onClick={() => setInput('ayuda')}
                    className="w-full text-left px-3 py-2 text-xs text-sport-primary bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium"
                  >
                    ❓ Ver todas las opciones
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-sport-primary text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-700 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className={`text-[10px] mt-2 ${
                      msg.role === 'user' ? 'text-red-200' : 'text-slate-400'
                    }`}>
                      {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-spinner fa-spin text-slate-400 text-sm"></i>
                    <span className="text-xs text-slate-400">Pensando...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input área */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu pregunta..."
                rows={1}
                className="flex-1 resize-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sport-primary/20 focus:border-sport-primary transition-all"
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-11 h-11 bg-sport-primary text-white rounded-xl flex items-center justify-center hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
              >
                <i className="fa-solid fa-paper-plane text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CopilotPanel;
