/**
 * @fileoverview Script de migración localStorage → Firestore.
 * Ya no aplica: el proyecto migró a Supabase (ver MIGRACION_ESTADO.md).
 * Se mantiene como stub únicamente para no romper `DataSourceSettings.tsx`.
 */

export interface MigrationResult {
  collection: string;
  count: number;
  success: boolean;
  error?: string;
}

export async function migrateLocalStorageToFirestore(
  _onProgress?: (msg: string) => void
): Promise<MigrationResult[]> {
  return [{ collection: 'firestore', count: 0, success: false, error: 'Migración a Firestore obsoleta: el proyecto ya usa Supabase.' }];
}

export async function countFirestoreDocs(): Promise<Record<string, number>> {
  return {};
}
