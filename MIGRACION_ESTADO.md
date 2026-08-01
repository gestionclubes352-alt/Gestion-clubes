# Estado de la migración Firebase → Supabase

## ✅ Hecho y listo para usar
- **Base de datos completa en Supabase** (`supabase/migrations/001` a `005`):
  clubes, equipos, plantillas, personal, usuarios, competiciones, partidos,
  sesiones, pizarras_tacticas, tareas — con RLS habilitado.
- **`src/shared/services/supabaseClient.ts`** — cliente Supabase inicializado desde `.env`.
- **`src/context/AuthContext.tsx`** — login/registro/sesión con Supabase Auth,
  lee rol/club/estado desde la tabla `usuarios`.
- **`src/shared/services/dataService.ts`** — CRUD tipado para las 10 tablas nuevas
  (`clubesService`, `equiposService`, `plantillasService`, etc.)
- **`.env` / `.env.example`** con tus credenciales reales de Supabase.
- `package.json` sin la dependencia `firebase`, con `@supabase/supabase-js`.

## ⚠️ Pendiente (todavía dependen de Firebase, romperán el build si se usan)
Estos archivos del proyecto original importan `firebase` directamente y
necesitan reescribirse contra Supabase uno a uno:

| Archivo | Para qué sirve | Usado por |
|---|---|---|
| `shared/services/authService.ts` | Login/roles Firebase (ya sustituido por `AuthContext.tsx`) | `App.tsx`, `MatchReportView.tsx` |
| `shared/services/roleService.ts` | Gestión de roles vía custom claims | `App.tsx` |
| `shared/services/photoService.ts` | Subida de fotos de jugador/club a Firebase Storage | `EditPlayerModal`, `EditClubModal`, `EditTeamModal` |
| `shared/services/staffPhotoService.ts` | Subida de fotos de staff | `EditStaffModal`, `EditUserModal` |
| `shared/services/migrateToFirestore.ts` | Script de migración antiguo (ya no aplica) | `DataSourceSettings.tsx` |
| `shared/services/aiConversationService.ts` | Guarda el historial del chat IA en Firestore | (uso interno del asistente IA) |
| `shared/services/staffService.ts` | Helpers de staff sobre Firestore | — |

**`App.tsx`** (el orquestador principal) importa varios de estos directamente
y usa tipos (`Player`, `User`, `Club`, `CompetitionTeam`) con una forma
distinta a las tablas nuevas (`Jugador`, `Usuario`, `Club`, `Competicion`).
Conectarlo del todo requiere reescribir esas partes módulo a módulo, no de
golpe, para poder comprobar que cada uno compila.

## Siguiente paso recomendado
Ir módulo por módulo, empezando por el más sencillo:
1. `photoService.ts` / `staffPhotoService.ts` → subir a **Supabase Storage**
   (API casi idéntica a Firebase Storage, cambio rápido).
2. `authService.ts` / `roleService.ts` → eliminar, y actualizar los 2-3 sitios
   que los usan para que usen `useAuth()` de `AuthContext.tsx` directamente.
3. `App.tsx` → conectar cada tabla (`plantillasService.list()`, etc.) en vez
   de `db.players.get()`.
4. Descartar `migrateToFirestore.ts` y `aiConversationService.ts` (o migrar
   el historial de chat a una tabla `ai_conversations` en Supabase si lo
   quieres conservar).
