# Teamzone IUP Starter

Minimal Next.js starter for a separate IUP app, reusing the same Supabase project as Tactics Board.

## 1. Install and run

```bash
npm install
npm run dev
```

## 2. Environment

Copy `.env.example` to `.env.local` and fill values from your existing Supabase project.

## 3. Database

Run:

1. `supabase/schema.sql` (already used in your current app)
2. `supabase/iup_schema.sql` (new IUP tables/policies)

## 4. What this starter includes

- Supabase auth (magic link)
- Team list (owner teams)
- IUP plans list per team
- Create plan flow for one selected player in team
- Basic structure for goals/check-ins persistence

## 5. Recommended next steps

1. Add role views (`coach` vs `player`).
2. Add goal editing and check-in timeline UI.
3. Add links from team players to auth users (`team_player_accounts`).
4. Add notifications and reminders.
