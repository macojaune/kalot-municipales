# KalotMunicipales

MVP TanStack Start pour centraliser les chansons de campagne en Guadeloupe et lancer des votes en duel winner-stays-on.

## Stack

- TanStack Start (React + TypeScript)
- TanStack Query
- Tailwind CSS + shadcn/ui
- Clerk (social login)
- Drizzle ORM + Turso (libsql)

## Demarrage

```bash
npm install
npm run dev
```

App locale: `http://localhost:3000`

## Variables d'environnement

Configurer `.env.local`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

## Base de donnees (Drizzle)

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

- Config Drizzle: `drizzle.config.ts`
- Schema initial: `src/db/schema.ts`
- Client DB: `src/db/client.ts`

## Mecanique de vote implemente

- Session de vote pairwise (2 sons en duel)
- Winner-stays-on: le son choisi reste, un nouveau challenger arrive
- Elo update a chaque vote pour le classement global
- Leaderboard live expose via `GET /api/leaderboard`
- Moderation minimale via `POST /api/report`
- Backoffice manuel pour ajouter des tracks via `/admin`

## Notes

- Si `VITE_CLERK_PUBLISHABLE_KEY` est vide, l'app reste utilisable sans login.
- Les fichiers routes `demo*` peuvent etre supprimes ensuite.
