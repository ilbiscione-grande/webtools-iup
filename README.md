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

The latest `iup_schema.sql` is aligned with the shared `profiles`, `clubs`, `club_members`, `teams`, `team_members` model from Tactics Board.

Squad/player-specific fields are stored on `team_members`, with extra player profile data mapped through `team_members.metadata`.

Current v1 access model for IUP is admin-scoped:

- team owner
- active team admin (`team_members.is_team_admin = true`)
- active club admin for the club that owns the team

Regular team members are not part of the coach/admin IUP workflow in v1.

## 4. What this starter includes

- Supabase auth (email + password)
- Team list (shared teams via same membership model as Tactics Board)
- IUP plans list per team
- Create plan flow for one selected player in team
- Basic structure for goals/check-ins persistence

## 5. Recommended next steps

1. Add role views (`coach` vs `player`).
2. Add goal editing and check-in timeline UI.
3. Tighten player role handling inside `team_members` and player self-service flows.
4. Add notifications and reminders.

## 6. Quality gate (Step 5)

Use this before deploy/merge:

```bash
npm run ci
```

This runs:

1. `npm run typecheck`
2. `npm run build`

## 7. Manual smoke checklist

Run after DB migration and before release:

1. Open `/squad`
2. Create a player (name, number, position, birth date)
3. Edit the same player and save
4. Archive and restore the player
5. Open `/` and create a new IUP for that player
6. Open `/iup/[id]`, edit fields/goals and save
7. Confirm saved values after page reload
8. Confirm archive/delete works for plan owner
