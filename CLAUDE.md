# שמחת רבקה — מערכת ארוחות ליולדות

@AGENTS.md

Follow the user's `build-standards` skill for every change. Project specifics:

## Context

- Manages one-time breakfast deliveries to new mothers (יולדות) for the
  שמחת רבקה organization. Phone numbers and addresses are personal data.
- **UI addresses users in the feminine form** ("לחצי", "נסי שוב"). Hebrew, RTL,
  phone-first (volunteers use phones).
- **The system is the manager's tool (פייגי).** Volunteers do NOT sign in —
  they are a list (name, phone, cooks / delivers). Only managers (`admin`, with
  e-mail) use the app. Keep it practical and simple: no WhatsApp / SMS;
  contact is e-mail (reminders to mothers) and, later, phone.
- Per meal there is a checklist ("מה מוכן", `prep_tasks`): ✓ what is ready,
  optionally who is making it. No assignment workflow, no nagging to assign.
- Source labels: מהפריזר / להכין / לקנות (`SOURCES` in `lib/menu.ts`).
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

## Data

- `mothers` — one row per new mother incl. her one-time delivery (date,
  status, `delivery_volunteer_id`). Volunteers read only rows assigned to
  them and change status only via `set_delivery_status()` (out / delivered).
- Browser access: `lib/mothersData.ts` (load/save/delete/status) and
  `useMothers()` in `lib/useMothers.ts`. Dates: `lib/dates.ts` (Israel time).
- `menu_items` — the fixed menu (per_meal) and stock. A trigger takes one meal
  off the stock when a mother's status becomes ready/out/delivered and gives
  it back when it goes back (`mothers.stock_used` makes it count once).
  Planning: `lib/menu.ts`; browser access: `lib/menuData.ts`.
- Forms: `components/ui/Modal.tsx` + `components/ui/Field.tsx`. Dates:
  `components/ui/DateInput.tsx` (Hebrew day/month/year selects; Hebrew→Gregorian
  in `lib/hebrewCalendar.ts`). Every date shown carries the Hebrew date.
- Look: `PageHero` banner on each page, `card` / `tile` / `buttonStyle` from
  `lib/theme.ts`, icons in `components/ui/Icon.tsx`, `IconButton`.
- Printing: `.no-print` hides an element on paper (globals.css); /print = day sheet.
- `prep_tasks` — who prepares which menu item for which meal. Manager: the
  dialog in `components/prep/PrepDialog.tsx` and /prep; a volunteer: /prep
  ("ההכנות שלי") via `my_prep_tasks()` / `set_prep_done()` (`lib/prepData.ts`).
- Reminders (`lib/reminders.ts`): the evening before (cron in vercel.json →
  /api/cron/reminders, `CRON_SECRET`), e-mails go to the mother (with a
  confirmation link), each volunteer and the managers. Gmail SMTP
  (`lib/mail.ts`, env `GMAIL_USER` + `GMAIL_APP_PASSWORD`) — nothing is sent
  until both are set. Cron failures e-mail the managers (`lib/cronAlert.ts`).
- The team (`authorized_users`, screen "מתנדבות" at /users): e-mail is optional —
  a volunteer without e-mail is on the list (assignable; `can_deliver` /
  `can_cook` filter the pickers) but never signs in. A manager must have
  e-mail. Show a person with `displayName()` (`lib/users.ts`).
- Home: "מה צריך לעשות" (`computeActions()`, `lib/actions.ts` — change requests,
  make sure she's home, set a date, overdue), then "איפה כל ארוחה עומדת"
  (`components/home/StatusBoard.tsx`, one-tap next step via `nextStatus()`),
  then the freezer / make / buy list. /guide explains the routine.
- /prep (manager) starts with the kitchen sheet per day (`KitchenDays`).
- /confirm is PUBLIC: the mother answers via a secret token in
  `confirm_tokens` (server only). Token "demo" = the manager's sample mail.

## Checks before finishing

`npx tsc --noEmit` · `npx eslint .` · `npm run check:sql` · `npm run build`

After the user ran new SQL: `npm run check:live` — checks the access rules on
the real Supabase project with temporary test accounts it deletes afterwards.

## Deploy

- Repo `mp399066-boop/simchat-rivka`; `main` deploys automatically to Vercel
  project `simchat-rivka` → https://simchat-rivka-fawn.vercel.app
  (`vercel.json` pins the framework to Next.js — the project was created as "Other").
- Deploy status: `gh api repos/mp399066-boop/simchat-rivka/commits/<sha>/statuses --jq '.[0].state'`.
- **This computer's internet goes through NetFree**: new sites (incl. the live
  site, until approved) answer 418, and npm installs are very slow. Check the
  live site from GitHub instead: `gh workflow run smoke.yml`, then read the run log.
- Supabase project `hfhldtvwivyazheqmluy` is in a different account than the
  Supabase CLI here — no CLI access; SQL is run by the user in the SQL Editor.
  Real keys are in `.env.local` (git-ignored) and in Vercel (sensitive).
