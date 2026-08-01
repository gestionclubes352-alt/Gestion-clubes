/**
 * @fileoverview Tipos para el módulo AI Mode
 */

import type { DataSourceOrigin } from '@shared/services';

export type { DataSourceOrigin };

export interface MessageAttachment {
  name: string;
  type: 'image' | 'file';
  preview?: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: MessageAttachment[];
  sources?: DataSourceOrigin[];
  confidence?: 'high' | 'medium' | 'low';
}

export interface AIModeSuggestion {
  icon: string;
  label: string;
  prompt: string;
  category: 'plantilla' | 'partidos' | 'calendario' | 'staff' | 'tactica' | 'external';
}
