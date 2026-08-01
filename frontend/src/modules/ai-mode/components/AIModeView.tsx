/**
 * @fileoverview AI Mode v3 – Chat con IA enriquecida
 * - Markdown rendering con react-markdown + remark-gfm
 * - Layout full-width con panel lateral informativo colapsable
 * - Historial conversacional persistente
 * - Quick prompts categorizados
 * - Indicadores de fuente de datos visuales
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EnrichedAIService, aiConversationService } from '@shared/services';
import type { DataSourceOrigin, ConversationMeta, StoredMessage } from '@shared/services';
import { useDataSource, useAuth, useTeam } from '@context/index';
import type { AIChatMessage } from '../types';

// ============================================================================
// TIPOS LOCALES
// ============================================================================

interface AIModeViewProps {
  context?: {
    players?: any[];
    staff?: any[];
    events?: any[];
    teams?: any[];
    injuries?: any[];
    medicalRecords?: any[];
    medicalCheckups?: any[];
    rehabPrograms?: any[];
    fitnessProfiles?: any[];
    matchReports?: any[];
    campogramas?: any[];
  };
}

interface AttachedFile {
  id: string;
  name: string;
  type: 'image' | 'file';
  preview?: string;
  file: File;
}

interface QuickPromptItem {
  icon: string;
  text: string;
  prompt: string;
  category: 'local' | 'external' | 'analysis';
  color: string;
}

// ============================================================================
// QUICK PROMPTS CATEGORIZADOS
// ============================================================================

const QUICK_PROMPTS_LOCAL: QuickPromptItem[] = [
  { icon: 'fa-users', text: 'Mi Plantilla', prompt: 'Hazme un resumen completo de mi plantilla: cuántos jugadores hay, distribución por posiciones, edad media y perfil predominante', category: 'local', color: 'blue' },
  { icon: 'fa-calendar-days', text: 'Próximos eventos', prompt: '¿Cuáles son los próximos partidos y entrenamientos programados?', category: 'local', color: 'green' },
  { icon: 'fa-user-tie', text: 'Personal', prompt: '¿Quiénes forman el personal y cuáles son sus roles?', category: 'local', color: 'purple' },
  { icon: 'fa-chart-pie', text: 'Análisis plantilla', prompt: 'Analiza la plantilla: edad media, jugadores más jóvenes y veteranos, distribución de posiciones, ¿tenemos algún gap?', category: 'analysis', color: 'amber' },
  { icon: 'fa-band-aid', text: 'Lesiones activas', prompt: '¿Cuáles son las lesiones activas del equipo? ¿Qué jugadores están de baja y cuándo se estima su vuelta?', category: 'local', color: 'red' },
  { icon: 'fa-heart-pulse', text: 'Estado médico', prompt: 'Dame un informe completo del área médica: lesiones activas, jugadores en rehabilitación, reconocimientos pendientes y estado físico general del equipo', category: 'analysis', color: 'pink' },
];

const QUICK_PROMPTS_EXTERNAL: QuickPromptItem[] = [
  { icon: 'fa-globe', text: 'Noticias fútbol', prompt: '¿Cuáles son las últimas noticias y novedades del fútbol español?', category: 'external', color: 'red' },
  { icon: 'fa-trophy', text: 'Clasificación Liga', prompt: '¿Cómo está la clasificación actual de La Liga?', category: 'external', color: 'yellow' },
  { icon: 'fa-right-left', text: 'Fichajes recientes', prompt: '¿Cuáles son los últimos fichajes y rumores del mercado de fichajes?', category: 'external', color: 'orange' },
  { icon: 'fa-star', text: 'Mejores jugadores', prompt: '¿Quiénes son los mejores jugadores jóvenes del fútbol europeo actualmente?', category: 'external', color: 'pink' },
];

// ============================================================================
// MARKDOWN COMPONENTS for react-markdown
// ============================================================================

const MarkdownUl: React.FC<any> = ({ children }) => (
  <ul className="space-y-1.5 my-2.5 pl-1">{children}</ul>
);
const MarkdownOl: React.FC<any> = ({ children }) => (
  <ol className="space-y-1.5 my-2.5 list-decimal pl-5">{children}</ol>
);
const MarkdownLiUnordered: React.FC<any> = ({ children }) => (
  <li className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
    <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-sport-primary flex-shrink-0"></span>
    <span className="flex-1">{children}</span>
  </li>
);
const MarkdownLiOrdered: React.FC<any> = ({ children }) => (
  <li className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-1">{children}</li>
);

/* We need a stateful wrapper to detect parent list type (ul vs ol) */
const MarkdownLi: React.FC<any> = ({ node, ordered, children, ...props }: any) => {
  if (ordered) return <MarkdownLiOrdered>{children}</MarkdownLiOrdered>;
  return <MarkdownLiUnordered>{children}</MarkdownLiUnordered>;
};

const markdownComponents: Record<string, React.FC<any>> = {
  h1: ({ children }: any) => (
    <h1 className="text-xl font-bold text-slate-800 dark:text-white mt-5 mb-2.5 pb-1.5 border-b border-slate-200 dark:border-slate-700">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-lg font-bold text-slate-800 dark:text-white mt-4 mb-2 flex items-center gap-2">
      <span className="w-1 h-5 rounded-full bg-sport-primary inline-block"></span>
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mt-3 mb-1.5">{children}</h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-2.5 mb-1">{children}</h4>
  ),
  p: ({ children }: any) => (
    <p className="text-sm leading-[1.75] text-slate-700 dark:text-slate-300 mb-2.5 last:mb-0">{children}</p>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-slate-600 dark:text-slate-400">{children}</em>
  ),
  ul: MarkdownUl,
  ol: MarkdownOl,
  li: MarkdownLi,
  code: ({ className, children, ...props }: any) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-slate-100 dark:bg-slate-700/60 text-sport-primary dark:text-red-300 px-1.5 py-0.5 rounded-md text-[13px] font-mono border border-slate-200/60 dark:border-slate-600/40">
          {children}
        </code>
      );
    }
    return (
      <pre className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 my-3 overflow-x-auto shadow-sm border border-slate-800">
        <code className="text-[13px] font-mono text-slate-200 leading-relaxed">{children}</code>
      </pre>
    );
  },
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-sport-primary/70 bg-sport-primary/5 dark:bg-sport-primary/10 px-4 py-2.5 my-3 rounded-r-lg text-slate-600 dark:text-slate-400">
      {children}
    </blockquote>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-slate-50 dark:bg-slate-800/80">{children}</thead>
  ),
  th: ({ children }: any) => (
    <th className="px-3.5 py-2.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700/50">
      {children}
    </td>
  ),
  hr: () => <hr className="my-5 border-slate-200 dark:border-slate-700" />,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-sport-primary hover:underline font-medium inline-flex items-center gap-0.5">
      {children}
      <i className="fa-solid fa-arrow-up-right-from-square text-[8px] ml-0.5 opacity-60"></i>
    </a>
  ),
};

// ============================================================================
// HELPERS: convert between AIChatMessage <-> StoredMessage
// ============================================================================

function toStoredMessages(messages: AIChatMessage[]): StoredMessage[] {
  return messages.map((m) => {
    const msg: StoredMessage = {
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.getTime(),
    };
    if (m.sources) msg.sources = m.sources;
    if (m.confidence) msg.confidence = m.confidence;
    return msg;
  });
}

function fromStoredMessages(stored: StoredMessage[]): AIChatMessage[] {
  return stored.map((m, i) => ({
    id: `msg-${m.timestamp}-${i}`,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.timestamp),
    sources: m.sources as DataSourceOrigin[] | undefined,
    confidence: m.confidence,
  }));
}

// ============================================================================
// SOURCE BADGE COMPONENT
// ============================================================================

const SourceBadge: React.FC<{ source: DataSourceOrigin }> = ({ source }) => {
  const config: Record<DataSourceOrigin, { icon: string; label: string; colors: string }> = {
    database: { icon: 'fa-database', label: 'Base de Datos', colors: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    api: { icon: 'fa-plug', label: 'API', colors: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
    csv: { icon: 'fa-file-csv', label: 'CSV', colors: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
    web: { icon: 'fa-globe', label: 'Búsqueda Web', colors: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    'football-api': { icon: 'fa-bolt', label: 'Datos en Vivo', colors: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
    mixed: { icon: 'fa-layer-group', label: 'Múltiples', colors: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  };

  const { icon, label, colors } = config[source] ?? config.mixed;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${colors}`}>
      <i className={`fa-solid ${icon} text-[8px]`}></i>
      {label}
    </span>
  );
};

// ============================================================================
// CONTEXT PANEL COMPONENT
// ============================================================================

interface ContextPanelProps {
  context?: AIModeViewProps['context'];
  messages: AIChatMessage[];
  capabilities: { ai: boolean; webSearch: boolean; footballApi: boolean };
  activeSource: string;
  contextSummary: string;
}

const ContextPanel: React.FC<ContextPanelProps> = ({ context, messages, capabilities, activeSource, contextSummary }) => {
  const conversationInsights = useMemo(() => {
    if (messages.length === 0) return null;

    const allSources = new Set<DataSourceOrigin>();
    let totalConfidenceHigh = 0;
    let totalConfidenceMedium = 0;
    let totalConfidenceLow = 0;
    const topics: string[] = [];

    messages.forEach((msg) => {
      if (msg.role === 'assistant') {
        msg.sources?.forEach((s) => allSources.add(s));
        if (msg.confidence === 'high') totalConfidenceHigh++;
        if (msg.confidence === 'medium') totalConfidenceMedium++;
        if (msg.confidence === 'low') totalConfidenceLow++;
      }
      if (msg.role === 'user') {
        const content = msg.content.toLowerCase();
        if (content.includes('plantilla') || content.includes('jugador')) topics.push('Plantilla');
        if (content.includes('lesion') || content.includes('médic') || content.includes('baja')) topics.push('Área Médica');
        if (content.includes('entrena')) topics.push('Entrenamientos');
        if (content.includes('partido') || content.includes('resultado')) topics.push('Partidos');
        if (content.includes('staff') || content.includes('técnico')) topics.push('Staff');
        if (content.includes('tácti') || content.includes('formaci')) topics.push('Táctica');
        if (content.includes('clasif') || content.includes('liga') || content.includes('tabla')) topics.push('Competición');
        if (content.includes('fichaj') || content.includes('mercado') || content.includes('transfer')) topics.push('Fichajes');
        if (content.includes('noticia')) topics.push('Noticias');
      }
    });

    return {
      sources: Array.from(allSources),
      confidence: { high: totalConfidenceHigh, medium: totalConfidenceMedium, low: totalConfidenceLow },
      topics: [...new Set(topics)],
      totalMessages: messages.length,
      userMessages: messages.filter((m) => m.role === 'user').length,
      assistantMessages: messages.filter((m) => m.role === 'assistant').length,
    };
  }, [messages]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[var(--surface-0)] overflow-y-auto scrollbar-hide">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Contexto
        </h3>
      </div>

      <div className="flex-1 p-4 space-y-5">
        {/* System Status */}
        <section>
          <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
            Estado del Sistema
          </h4>
          <div className="space-y-2">
            {[
              { label: 'IA Generativa', active: capabilities.ai, icon: 'fa-brain' },
              { label: 'Búsqueda Web', active: capabilities.webSearch, icon: 'fa-globe' },
              { label: 'Datos en Vivo', active: capabilities.footballApi, icon: 'fa-bolt' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className={`fa-solid ${item.icon} text-[10px] ${item.active ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'}`}></i>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">{item.label}</span>
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-medium ${item.active ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${item.active ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                  {item.active ? 'ON' : 'OFF'}
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* Data Source */}
        <section>
          <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
            Fuente de Datos
          </h4>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-medium ${
            activeSource === 'database'
              ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
              : activeSource === 'google-sheets'
              ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
          }`}>
            <i className={`fa-solid fa-${activeSource === 'database' ? 'database' : activeSource === 'google-sheets' ? 'table' : 'file-csv'} text-[10px]`}></i>
            {activeSource === 'database' ? 'Base de Datos' : activeSource === 'google-sheets' ? 'Google Sheets' : 'CSV Local'}
          </div>
        </section>

        {/* Loaded Data */}
        {contextSummary && (
          <>
            <hr className="border-slate-100 dark:border-slate-800" />
            <section>
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
                Datos Cargados
              </h4>
              <div className="space-y-1.5">
                {context?.players?.length ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400"><i className="fa-solid fa-users text-[9px] mr-1.5 text-blue-400"></i>Jugadores</span>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{context.players.length}</span>
                  </div>
                ) : null}
                {context?.staff?.length ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400"><i className="fa-solid fa-user-tie text-[9px] mr-1.5 text-purple-400"></i>Staff</span>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{context.staff.length}</span>
                  </div>
                ) : null}
                {context?.events?.length ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400"><i className="fa-solid fa-calendar text-[9px] mr-1.5 text-green-400"></i>Eventos</span>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{context.events.length}</span>
                  </div>
                ) : null}
                {context?.teams?.length ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400"><i className="fa-solid fa-shield text-[9px] mr-1.5 text-amber-400"></i>Equipos</span>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{context.teams.length}</span>
                  </div>
                ) : null}
                {context?.injuries?.length ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400"><i className="fa-solid fa-band-aid text-[9px] mr-1.5 text-red-400"></i>Lesiones</span>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{context.injuries.length}</span>
                  </div>
                ) : null}
                {context?.matchReports?.length ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400"><i className="fa-solid fa-file-lines text-[9px] mr-1.5 text-orange-400"></i>Informes</span>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{context.matchReports.length}</span>
                  </div>
                ) : null}
                {context?.campogramas?.length ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400"><i className="fa-solid fa-chess-board text-[9px] mr-1.5 text-teal-400"></i>Campogramas</span>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{context.campogramas.length}</span>
                  </div>
                ) : null}
              </div>
            </section>
          </>
        )}

        {/* Conversation Insights */}
        {conversationInsights && (
          <>
            <hr className="border-slate-100 dark:border-slate-800" />
            <section>
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
                Conversación
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 text-center">
                  <div className="text-base font-bold text-slate-700 dark:text-slate-200">{conversationInsights.userMessages}</div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">Preguntas</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 text-center">
                  <div className="text-base font-bold text-slate-700 dark:text-slate-200">{conversationInsights.assistantMessages}</div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">Respuestas</div>
                </div>
              </div>
            </section>

            {/* Topics discussed */}
            {conversationInsights.topics.length > 0 && (
              <section>
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Temas Tratados
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {conversationInsights.topics.map((topic) => (
                    <span
                      key={topic}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[10px] font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Sources Used */}
            {conversationInsights.sources.length > 0 && (
              <section>
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Fuentes Usadas
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {conversationInsights.sources.map((source) => (
                    <SourceBadge key={source} source={source} />
                  ))}
                </div>
              </section>
            )}

            {/* Confidence Overview */}
            {(conversationInsights.confidence.high + conversationInsights.confidence.medium + conversationInsights.confidence.low) > 0 && (
              <section>
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Fiabilidad
                </h4>
                <div className="space-y-1.5">
                  {conversationInsights.confidence.high > 0 && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span className="text-slate-500 dark:text-slate-400">Alta</span>
                      <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(conversationInsights.confidence.high / conversationInsights.assistantMessages) * 100}%` }}></div>
                      </div>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{conversationInsights.confidence.high}</span>
                    </div>
                  )}
                  {conversationInsights.confidence.medium > 0 && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                      <span className="text-slate-500 dark:text-slate-400">Media</span>
                      <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(conversationInsights.confidence.medium / conversationInsights.assistantMessages) * 100}%` }}></div>
                      </div>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{conversationInsights.confidence.medium}</span>
                    </div>
                  )}
                  {conversationInsights.confidence.low > 0 && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      <span className="text-slate-500 dark:text-slate-400">Baja</span>
                      <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${(conversationInsights.confidence.low / conversationInsights.assistantMessages) * 100}%` }}></div>
                      </div>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{conversationInsights.confidence.low}</span>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AIModeView: React.FC<AIModeViewProps> = ({ context }) => {
  const { t } = useTranslation();
  const { activeSource } = useDataSource();
  const { user } = useAuth();
  const { selectedTeam } = useTeam();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [loadingPhase, setLoadingPhase] = useState<'thinking' | 'searching' | 'analyzing'>('thinking');
  const [showExternalPrompts, setShowExternalPrompts] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  // Conversation history state
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const uid = user?.id ?? null;
  const teamId = selectedTeam?.id ?? null;

  const capabilities = useMemo(() => EnrichedAIService.getCapabilities(), []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Load conversation list on mount and when team changes
  useEffect(() => {
    if (!uid) return;
    setHistoryLoading(true);
    // Clear current chat when team changes
    setMessages([]);
    setActiveConversationId(null);
    EnrichedAIService.clearConversation();
    aiConversationService.list(uid, 50, teamId ?? undefined).then((list) => {
      setConversations(list);
      setHistoryLoading(false);
    });
  }, [uid, teamId]);

  // Auto-save messages to Firestore after every assistant response finalises
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!uid || messages.length === 0 || isLoading) return;
    // Debounce save to avoid saving during streaming
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const stored = toStoredMessages(messages);
      if (activeConversationId) {
        await aiConversationService.update(uid, activeConversationId, stored);
      } else {
        const newId = await aiConversationService.create(uid, stored, teamId ?? undefined);
        if (newId) setActiveConversationId(newId);
      }
      // Refresh list
      const list = await aiConversationService.list(uid, 50, teamId ?? undefined);
      setConversations(list);
    }, 1000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [uid, messages, isLoading, activeConversationId]);

  // Context summary
  const contextSummary = useMemo(() => {
    const parts: string[] = [];
    if (context?.players?.length) parts.push(`${context.players.length} jugadores`);
    if (context?.staff?.length) parts.push(`${context.staff.length} staff`);
    if (context?.events?.length) parts.push(`${context.events.length} eventos`);
    if (context?.teams?.length) parts.push(`${context.teams.length} equipos`);
    if (context?.injuries?.length) parts.push(`${context.injuries.length} lesiones`);
    if (context?.medicalRecords?.length) parts.push(`${context.medicalRecords.length} fichas médicas`);
    if (context?.fitnessProfiles?.length) parts.push(`${context.fitnessProfiles.length} perfiles físicos`);
    if (context?.rehabPrograms?.length) parts.push(`${context.rehabPrograms.length} rehabilitaciones`);
    if (context?.matchReports?.length) parts.push(`${context.matchReports.length} informes`);
    if (context?.campogramas?.length) parts.push(`${context.campogramas.length} campogramas`);
    return parts.join(' · ');
  }, [context]);

  // File handling
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const isImage = file.type.startsWith('image/');
      const newFile: AttachedFile = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: isImage ? 'image' : 'file',
        file,
      };

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          newFile.preview = ev.target?.result as string;
          setAttachedFiles(prev => [...prev, newFile]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachedFiles(prev => [...prev, newFile]);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeFile = useCallback((id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Send message
  const handleSend = useCallback(async (text?: string) => {
    const message = text || input.trim();
    if ((!message && attachedFiles.length === 0) || isLoading) return;

    let fullMessage = message;
    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map(f => f.name).join(', ');
      fullMessage = message
        ? `${message}\n\n[Archivos adjuntos: ${fileNames}]`
        : `[Archivos adjuntos: ${fileNames}]`;
    }

    const userMsg: AIChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: fullMessage,
      timestamp: new Date(),
      attachments: attachedFiles.map(f => ({ name: f.name, type: f.type, preview: f.preview })),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);
    setLoadingPhase('thinking');

    // Create a placeholder streaming message
    const streamMsgId = `msg-${Date.now()}-assistant`;

    try {
      const phaseTimer = setTimeout(() => setLoadingPhase('searching'), 1500);
      const phaseTimer2 = setTimeout(() => setLoadingPhase('analyzing'), 3500);

      // Add an empty assistant message immediately for streaming
      const streamPlaceholder: AIChatMessage = {
        id: streamMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, streamPlaceholder]);

      const response = await EnrichedAIService.query(
        message || 'Analiza los archivos adjuntos',
        {
          ...context,
          activeDataSource: activeSource
        },
        // Streaming callback: update the placeholder message content in real-time
        (partialText: string) => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === streamMsgId
                ? { ...msg, content: partialText }
                : msg
            )
          );
        }
      );

      clearTimeout(phaseTimer);
      clearTimeout(phaseTimer2);

      // Finalize the streaming message with full metadata
      setMessages(prev =>
        prev.map(msg =>
          msg.id === streamMsgId
            ? {
                ...msg,
                content: response.content,
                sources: response.sources,
                confidence: response.confidence,
              }
            : msg
        )
      );
    } catch {
      // If streaming placeholder was added, update it with error; otherwise add new error msg
      setMessages(prev => {
        const hasPlaceholder = prev.some(m => m.id === streamMsgId);
        if (hasPlaceholder) {
          return prev.map(msg =>
            msg.id === streamMsgId
              ? { ...msg, content: '❌ Ha ocurrido un error al procesar tu consulta. Inténtalo de nuevo.' }
              : msg
          );
        }
        return [
          ...prev,
          {
            id: `msg-${Date.now()}-error`,
            role: 'assistant' as const,
            content: '❌ Ha ocurrido un error al procesar tu consulta. Inténtalo de nuevo.',
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, attachedFiles, isLoading, context, activeSource]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setAttachedFiles([]);
    setActiveConversationId(null);
    EnrichedAIService.clearConversation();
  }, []);

  // Load a conversation from history
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!uid) return;
    setHistoryLoading(true);
    const stored = await aiConversationService.load(uid, conversationId);
    const loaded = fromStoredMessages(stored);
    setMessages(loaded);
    setActiveConversationId(conversationId);
    EnrichedAIService.clearConversation();
    setHistoryLoading(false);
    setShowHistory(false);
  }, [uid]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!uid) return;
    await aiConversationService.delete(uid, conversationId);
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (activeConversationId === conversationId) {
      clearChat();
    }
  }, [uid, activeConversationId, clearChat]);

  // Rename a conversation
  const confirmRename = useCallback(async () => {
    if (!uid || !renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    await aiConversationService.rename(uid, renamingId, renameValue.trim());
    setConversations((prev) =>
      prev.map((c) => (c.id === renamingId ? { ...c, title: renameValue.trim() } : c))
    );
    setRenamingId(null);
    setRenameValue('');
  }, [uid, renamingId, renameValue]);

  const hasMessages = messages.length > 0;

  const loadingText = loadingPhase === 'thinking' ? 'Analizando datos del equipo...'
    : loadingPhase === 'searching' ? 'Buscando información actualizada...'
    : 'Preparando respuesta...';

  const activeQuickPrompts = showExternalPrompts ? QUICK_PROMPTS_EXTERNAL : QUICK_PROMPTS_LOCAL;

  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  return (
    <div className="flex h-full bg-slate-50 dark:bg-[var(--surface-0)]">
      {/* ============================================================ */}
      {/* CONVERSATION HISTORY SIDEBAR (left)                           */}
      {/* ============================================================ */}
      <div
        className={`border-r border-slate-200 dark:border-[var(--border-soft)] bg-white dark:bg-[var(--surface-0)] transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 ${
          showHistory ? 'w-64 xl:w-72' : 'w-0 border-r-0'
        }`}
      >
        {showHistory && (
          <div className="flex flex-col h-full w-64 xl:w-72">
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[var(--border-soft)]">
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <i className="fa-solid fa-clock-rotate-left mr-1.5 text-[10px]"></i>
                Historial
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Cerrar historial"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>

            {/* New conversation button inside sidebar */}
            <div className="px-3 py-2">
              <button
                onClick={() => { clearChat(); setShowHistory(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-sport-primary bg-sport-primary/10 hover:bg-sport-primary/20 rounded-lg transition-colors"
              >
                <i className="fa-solid fa-plus text-[10px]"></i>
                Nueva conversación
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-hide">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <i className="fa-solid fa-spinner fa-spin text-slate-400 mr-2"></i>
                  <span className="text-xs text-slate-400">Cargando...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fa-solid fa-comments text-slate-300 dark:text-slate-600 text-2xl mb-2"></i>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Sin conversaciones</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group relative rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                        activeConversationId === conv.id
                          ? 'bg-sport-primary/10 border border-sport-primary/30'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent'
                      }`}
                      onClick={() => loadConversation(conv.id)}
                    >
                      {renamingId === conv.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={confirmRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmRename();
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Nombre de la conversación"
                          title="Renombrar conversación"
                          className="w-full text-xs bg-white dark:bg-[var(--surface-1)] border border-sport-primary/50 rounded px-2 py-1 outline-none text-slate-700 dark:text-slate-200"
                        />
                      ) : (
                        <>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate pr-12">
                            {conv.title}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {conv.messageCount} msgs · {conv.updatedAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </p>
                          {/* Actions */}
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingId(conv.id);
                                setRenameValue(conv.title);
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Renombrar"
                            >
                              <i className="fa-solid fa-pen text-[9px]"></i>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conv.id);
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Eliminar"
                            >
                              <i className="fa-solid fa-trash text-[9px]"></i>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MAIN CHAT AREA                                                */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-200 dark:border-[var(--border-soft)] bg-white dark:bg-[var(--surface-0)]">
          <div className="flex items-center gap-3">
            {/* History toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                showHistory
                  ? 'bg-sport-primary/10 text-sport-primary'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={showHistory ? 'Ocultar historial' : 'Historial de conversaciones'}
            >
              <i className="fa-solid fa-clock-rotate-left text-xs"></i>
            </button>
            <div className="w-7 h-7 bg-gradient-to-br from-[#FF5A5F] to-[#e54449] rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-brain text-white text-xs"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Asistente IA</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {contextSummary || 'Análisis inteligente de tu equipo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Nueva conversación"
            >
              <i className="fa-solid fa-plus text-[10px]"></i>
              <span className="hidden sm:inline">Nueva</span>
            </button>
            <button
              onClick={() => setShowPanel(!showPanel)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                showPanel
                  ? 'bg-sport-primary/10 text-sport-primary'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={showPanel ? 'Ocultar panel' : 'Mostrar panel'}
            >
              <i className={`fa-solid ${showPanel ? 'fa-chevron-right' : 'fa-bars'} text-xs`}></i>
            </button>
          </div>
        </div>

        {/* Messages / Empty State */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {!hasMessages ? (
            /* EMPTY STATE */
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="max-w-2xl w-full text-center">
                <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-[#FF5A5F] to-[#e54449] rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/20">
                  <i className="fa-solid fa-brain text-2xl text-white"></i>
                </div>

                <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {t('aiMode.welcome', '¿En qué puedo ayudarte?')}
                </h1>
                <p className="text-sm text-slate-400 dark:text-slate-500 mb-2">
                  Pregunta sobre tu equipo, calendario, staff o cualquier dato de fútbol
                </p>
                {contextSummary && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
                    <i className="fa-solid fa-circle-info text-blue-400 mr-1"></i>
                    Datos cargados: {contextSummary}
                  </p>
                )}

                {/* Capability badges */}
                <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    capabilities.ai ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <i className={`fa-solid fa-${capabilities.ai ? 'check-circle' : 'circle-xmark'} text-[9px]`}></i>
                    IA {capabilities.ai ? 'Activa' : 'No configurada'}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    capabilities.webSearch ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <i className={`fa-solid fa-${capabilities.webSearch ? 'globe' : 'circle-xmark'} text-[9px]`}></i>
                    Web {capabilities.webSearch ? 'OK' : 'No'}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    capabilities.footballApi ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <i className={`fa-solid fa-${capabilities.footballApi ? 'bolt' : 'circle-xmark'} text-[9px]`}></i>
                    Datos en Vivo {capabilities.footballApi ? 'OK' : 'No'}
                  </span>
                </div>

                {/* Category tabs */}
                <div className="flex items-center justify-center gap-1 mb-4">
                  <button
                    onClick={() => setShowExternalPrompts(false)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      !showExternalPrompts
                        ? 'bg-sport-primary text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <i className="fa-solid fa-database mr-1.5 text-[10px]"></i>
                    Mi Equipo
                  </button>
                  <button
                    onClick={() => setShowExternalPrompts(true)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      showExternalPrompts
                        ? 'bg-sport-primary text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <i className="fa-solid fa-globe mr-1.5 text-[10px]"></i>
                    Fútbol Mundial
                  </button>
                </div>

                {/* Quick prompts */}
                <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto mb-6">
                  {activeQuickPrompts.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(item.prompt)}
                      className={`group flex items-center gap-3 px-4 py-3 bg-white dark:bg-[var(--surface-1)] border rounded-xl hover:shadow-md transition-all text-left ${
                        item.category === 'external'
                          ? 'border-amber-200 dark:border-amber-800/50 hover:border-amber-300 dark:hover:border-amber-700'
                          : item.category === 'analysis'
                          ? 'border-purple-200 dark:border-purple-800/50 hover:border-purple-300 dark:hover:border-purple-700'
                          : 'border-slate-200 dark:border-[var(--border-soft)] hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        item.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        item.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                        item.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                        item.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30' :
                        item.color === 'red' ? 'bg-red-100 dark:bg-red-900/30' :
                        item.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                        item.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30' :
                        item.color === 'pink' ? 'bg-pink-100 dark:bg-pink-900/30' :
                        'bg-slate-100 dark:bg-slate-800'
                      }`}>
                        <i className={`fa-solid ${item.icon} text-xs ${
                          item.color === 'blue' ? 'text-blue-500' :
                          item.color === 'green' ? 'text-green-500' :
                          item.color === 'purple' ? 'text-purple-500' :
                          item.color === 'amber' ? 'text-amber-500' :
                          item.color === 'red' ? 'text-red-500' :
                          item.color === 'yellow' ? 'text-yellow-500' :
                          item.color === 'orange' ? 'text-orange-500' :
                          item.color === 'pink' ? 'text-pink-500' :
                          'text-slate-400'
                        }`}></i>
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white transition-colors font-medium">
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-md mx-auto leading-relaxed">
                  <i className="fa-solid fa-lightbulb text-amber-400 mr-1"></i>
                  Puedo responder sobre <strong>los datos de tu equipo</strong> (plantilla, calendario, staff) y también buscar <strong>información actualizada</strong> de fútbol mundial
                </p>
              </div>
            </div>
          ) : (
            /* MESSAGES */
            <div className="px-5 lg:px-8 py-6 space-y-5">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-fade-in group">
                  {msg.role === 'user' ? (
                    /* USER MESSAGE */
                    <div className="flex justify-end">
                      <div className="max-w-[75%] xl:max-w-[65%]">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2 justify-end">
                            {msg.attachments.map((att, idx) => (
                              <div key={idx} className="relative">
                                {att.type === 'image' && att.preview ? (
                                  <img src={att.preview} alt={att.name} className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-600" />
                                ) : (
                                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-[var(--surface-2)] rounded-lg text-xs text-slate-600 dark:text-slate-300">
                                    <i className="fa-solid fa-file text-slate-400"></i>
                                    {att.name}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="bg-sport-primary text-white px-4 py-3 rounded-2xl rounded-br-md shadow-sm">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content.replace(/\n\n\[Archivos adjuntos:.*\]$/, '')}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 text-right">
                          {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* ASSISTANT MESSAGE */
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <i className={`fa-solid fa-brain text-white text-xs ${isLoading && !msg.confidence ? 'animate-pulse' : ''}`}></i>
                      </div>
                      <div className="flex-1 min-w-0 bg-white dark:bg-[var(--surface-1)] rounded-2xl rounded-tl-md px-5 py-4 shadow-sm border border-slate-100 dark:border-slate-800">
                        {/* Markdown rendered content */}
                        {msg.content ? (
                          <div className="prose-ai">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={markdownComponents}
                            >
                              {msg.content}
                            </ReactMarkdown>
                            {/* Streaming cursor */}
                            {isLoading && !msg.confidence && (
                              <span className="inline-block w-2 h-4 bg-sport-primary/60 animate-pulse rounded-sm ml-0.5 align-middle"></span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 py-1">
                            <span className="inline-block w-2 h-4 bg-sport-primary/60 animate-pulse rounded-sm"></span>
                            <span className="text-xs text-slate-400">Pensando...</span>
                          </div>
                        )}

                        {/* Sources + confidence + actions - only show when finalized */}
                        {(msg.sources?.length || msg.confidence) && (
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                          {msg.sources?.map((source, idx) => (
                            <SourceBadge key={idx} source={source} />
                          ))}
                          {msg.confidence && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              msg.confidence === 'high' ? 'bg-green-50 text-green-500 dark:bg-green-900/20 dark:text-green-400' :
                              msg.confidence === 'medium' ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              <i className={`fa-solid fa-${msg.confidence === 'high' ? 'shield-check' : msg.confidence === 'medium' ? 'shield-halved' : 'shield-exclamation'} text-[8px]`}></i>
                              {msg.confidence === 'high' ? 'Alta confianza' : msg.confidence === 'medium' ? 'Media' : 'Baja'}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {/* Copy button */}
                          <button
                            onClick={() => copyMessage(msg.content)}
                            className="ml-auto opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                            title="Copiar respuesta"
                          >
                            <i className="fa-regular fa-copy text-[11px]"></i>
                          </button>
                        </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator - only show before streaming starts */}
              {isLoading && (() => {
                const lastMsg = messages[messages.length - 1];
                const isStreaming = lastMsg?.role === 'assistant' && lastMsg.content.length > 0;
                if (isStreaming) return null;
                return (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center flex-shrink-0">
                      <i className={`fa-solid ${loadingPhase === 'searching' ? 'fa-globe' : 'fa-brain'} text-white text-xs animate-pulse`}></i>
                    </div>
                    <div className="flex flex-col gap-1.5 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-sport-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-sport-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-sport-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {loadingText}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* INPUT AREA                                                    */}
        {/* ============================================================ */}
        <div className="border-t border-slate-200 dark:border-[var(--border-soft)] bg-white dark:bg-[var(--surface-0)] px-5 py-4">
          <div className="w-full">
            {/* Attached files preview */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="relative group flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-[var(--surface-1)] rounded-lg border border-slate-200 dark:border-[var(--border-soft)]"
                  >
                    {file.type === 'image' && file.preview ? (
                      <img src={file.preview} alt={file.name} className="w-8 h-8 object-cover rounded" />
                    ) : (
                      <i className="fa-solid fa-file text-slate-400"></i>
                    )}
                    <span className="text-xs text-slate-600 dark:text-slate-300 max-w-[100px] truncate">
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <i className="fa-solid fa-xmark text-[10px]"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input row */}
            <div className="relative flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-[var(--surface-1)] transition-all flex-shrink-0"
                title="Adjuntar archivo"
              >
                <i className="fa-solid fa-paperclip"></i>
              </button>

              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pregunta sobre tu equipo, calendario, fichajes, noticias..."
                  rows={1}
                  className="w-full resize-none pl-4 pr-12 py-3 bg-slate-100 dark:bg-[var(--surface-1)] border-0 rounded-2xl text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sport-primary/20 transition-all"
                  style={{ maxHeight: '120px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                  className="absolute right-2 bottom-2 w-8 h-8 bg-sport-primary text-white rounded-lg flex items-center justify-center hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <i className="fa-solid fa-arrow-up text-xs"></i>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={clearChat}
                  className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <i className="fa-solid fa-rotate-right text-[10px]"></i>
                  Nueva conversación
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Enter para enviar · Shift+Enter para nueva línea
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CONTEXT PANEL (right side, collapsible)                        */}
      {/* ============================================================ */}
      <div
        className={`border-l border-slate-200 dark:border-[var(--border-soft)] transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 ${
          showPanel ? 'w-64 xl:w-72' : 'w-0 border-l-0'
        }`}
      >
        {showPanel && (
          <ContextPanel
            context={context}
            messages={messages}
            capabilities={capabilities}
            activeSource={activeSource}
            contextSummary={contextSummary}
          />
        )}
      </div>
    </div>
  );
};

export default AIModeView;
