/**
 * @fileoverview Persistencia de conversaciones IA.
 * Interino (Fase 1 de la migración): se guarda en localStorage por usuario,
 * en vez de Firestore. TODO(Fase 2): mover a una tabla `ai_conversations` en Supabase.
 */

export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  preview: string;
  teamId?: string;
}

export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: string[];
  confidence?: 'high' | 'medium' | 'low';
}

interface StoredConversation {
  id: string;
  title: string;
  messages: StoredMessage[];
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
  teamId?: string;
}

function storageKey(uid: string): string {
  return `sport_management_ai_conversations_${uid}`;
}

function readAll(uid: string): StoredConversation[] {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    return raw ? (JSON.parse(raw) as StoredConversation[]) : [];
  } catch {
    return [];
  }
}

function writeAll(uid: string, conversations: StoredConversation[]): void {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(conversations));
  } catch { /* almacenamiento no disponible */ }
}

function generateTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/\n/g, ' ').trim();
  if (cleaned.length <= 50) return cleaned;
  return cleaned.substring(0, 47) + '...';
}

export const aiConversationService = {
  async list(uid: string, maxResults = 50, teamId?: string): Promise<ConversationMeta[]> {
    const all = readAll(uid)
      .filter(c => !teamId || c.teamId === teamId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, maxResults);
    return all.map(c => ({
      id: c.id,
      title: c.title,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      messageCount: c.messageCount,
      preview: c.preview,
      teamId: c.teamId,
    }));
  },

  async load(uid: string, conversationId: string): Promise<StoredMessage[]> {
    const conv = readAll(uid).find(c => c.id === conversationId);
    return conv?.messages ?? [];
  },

  async create(uid: string, messages: StoredMessage[], teamId?: string): Promise<string | null> {
    const firstUserMsg = messages.find(m => m.role === 'user');
    const now = new Date().toISOString();
    const conv: StoredConversation = {
      id: crypto.randomUUID(),
      title: firstUserMsg ? generateTitle(firstUserMsg.content) : 'Nueva conversación',
      messages,
      createdAt: now,
      updatedAt: now,
      messageCount: messages.length,
      preview: firstUserMsg?.content.substring(0, 100) || '',
      teamId,
    };
    const all = readAll(uid);
    all.push(conv);
    writeAll(uid, all);
    return conv.id;
  },

  async update(uid: string, conversationId: string, messages: StoredMessage[]): Promise<boolean> {
    const all = readAll(uid);
    const idx = all.findIndex(c => c.id === conversationId);
    if (idx === -1) return false;
    all[idx] = { ...all[idx], messages, messageCount: messages.length, updatedAt: new Date().toISOString() };
    writeAll(uid, all);
    return true;
  },

  async delete(uid: string, conversationId: string): Promise<boolean> {
    const all = readAll(uid);
    const next = all.filter(c => c.id !== conversationId);
    writeAll(uid, next);
    return next.length !== all.length;
  },

  async rename(uid: string, conversationId: string, newTitle: string): Promise<boolean> {
    const all = readAll(uid);
    const idx = all.findIndex(c => c.id === conversationId);
    if (idx === -1) return false;
    all[idx] = { ...all[idx], title: newTitle, updatedAt: new Date().toISOString() };
    writeAll(uid, all);
    return true;
  },
};

export default aiConversationService;
