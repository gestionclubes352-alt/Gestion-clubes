import { db } from './dataService';
import type { Injury } from '../../modules/medical/types';

export async function getInjuries(): Promise<Injury[]> {
  const { data } = await db.injuries.get();
  const list = (data || []) as Injury[];
  return list.slice().sort((a, b) =>
    new Date(b.dateOccurred).getTime() - new Date(a.dateOccurred).getTime()
  );
}

export async function addInjury(injury: Omit<Injury, 'id'>): Promise<string> {
  const saved = await db.injuries.upsert(injury as Injury);
  return (saved as Injury).id;
}

export async function updateInjury(id: string, injury: Partial<Injury>): Promise<void> {
  const { data } = await db.injuries.get();
  const existing = (data || []).find((i: any) => String(i.id) === id);
  if (existing) {
    await db.injuries.upsert({ ...existing, ...injury, id });
  }
}

export async function deleteInjury(id: string): Promise<void> {
  await db.injuries.delete(id);
}

export async function getInjury(id: string): Promise<Injury | null> {
  const { data } = await db.injuries.get();
  return (data || []).find((i: any) => String(i.id) === id) || null;
}
