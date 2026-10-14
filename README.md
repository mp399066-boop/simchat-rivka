# שמחת רבקה — ניהול ארוחות ליולדות

Meal-delivery management for the שמחת רבקה organization: new mothers, one-time
breakfast deliveries, preparation tasks, missing items, delivery tracking.

Next.js 16 · Supabase (database + Google sign-in) · Vercel (hosting).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev
```

## Database

SQL files live in `supabase/`; run order and rules in `supabase/README.md`.
`npm run check:sql` verifies them on a local throwaway Postgres.

## Checks

```bash
npx tsc --noEmit && npx eslint . && npm run check:sql && npm run build
```

The same checks run in GitHub Actions on every push to `main`; Vercel deploys
`main` automatically.
