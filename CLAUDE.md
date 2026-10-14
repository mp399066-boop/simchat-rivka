# שמחת רבקה — מערכת ארוחות ליולדות

@AGENTS.md

Follow the user's `build-standards` skill for every change. Project specifics:

## Context

- Manages one-time breakfast deliveries to new mothers (יולדות) for the
  שמחת רבקה organization. Phone numbers and addresses are personal data.
- **UI addresses users in the feminine form** ("לחצי", "נסי שוב"). Hebrew, RTL,
  phone-first (volunteers use phones).
- Roles in `authorized_users`: `admin` (the manager — everything) and
  `volunteer` (sees only deliveries/tasks assigned to her — from stage 2 on).
- Fixed menu per meal: rolls or bagels; veggie box (cucumber, tomato, onion,
  pepper, olives, sunflower seeds); 2 quiches; 2 cup desserts; dips or cheeses;
  cutlery and napkins.
- Stack: Next.js 16 (App Router, `proxy.ts`), Supabase, Vercel.

## Use what exists

| Need | Use |
|---|---|
| Auth in an API route | `getAuthorizedUser(req)` / `getAdminUser(req)` from `lib/auth.ts` |
| Call our API from the browser | `authFetch(url, init)` from `lib/supabase.ts` (adds the token) |
| Who is signed in (client) | `useMe()` from `components/layout/AppShell.tsx` |
| Manager-only page | `adminOnly: true` in `navItems` in `AppShell.tsx` |
| Load "all rows" | `fetchAll` from `lib/fetchAll.ts` |
| Confirm / toast | `useFeedback()` from `components/ui/Feedback.tsx` (never `alert`/`confirm`) |
| Colors, buttons, inputs | `colors`, `buttonStyle`, `inputStyle` from `lib/theme.ts` |
| Loading / error / empty | `components/ui/StatusMessage.tsx` |
| Supabase on the server | `createServerClient()` from `lib/supabaseServer.ts` (service role) |

## Database

- SQL in `supabase/`, run order in `supabase/README.md`. The user runs SQL by
  hand in the Supabase SQL Editor — never automatically.
- New file → add to the README table **and** `FILES` in `scripts/check-sql.mjs`
  → `npm run check:sql`.

## Checks before finishing

`npx tsc --noEmit` · `npx eslint .` · `npm run check:sql` · `npm run build`
