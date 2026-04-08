# Teamzone IUP

Next.js-app for individuella utvecklingsplaner kopplad till samma Supabase-projekt som Teamzone/Tactics Board.

## Setup

Installera beroenden och starta utvecklingsservern:

```bash
npm install
npm run dev
```

Miljövariabler:

1. Kopiera `.env.example` till `.env.local`
2. Fyll i Supabase-värden för samma projekt som övriga Teamzone-delar

## Databas

Applicera schema i denna ordning:

1. `supabase/schema.sql`
2. `supabase/iup_schema.sql`

`iup_schema.sql` är anpassad till den delade modellen med `profiles`, `clubs`, `club_members`, `teams` och `team_members`.

Spelarspecifika profilfält lagras på `team_members`, med kompletterande metadata i `team_members.metadata`.

## Produktnivåer

`FREE`

- används utan inloggning
- kan skapa och öppna tillfälliga IUP-utkast i nuvarande session
- sparar utkast i `sessionStorage`
- sparar egna målförslag i `localStorage`
- har inte tillgång till trupphantering eller serverlagrade spelarflöden

`AUTH`

- används av inloggad användare utan `PAID`-truppflöde
- kan skapa och öppna egna IUP:er och arbeta vidare i editorn
- använder lokala utkast per användare på enheten som återställningsspår
- sparar egna målförslag konto-bundet i databasen via `iup_goal_suggestions`
- har inte tillgång till truppsidan eller lagadministration som kräver `PAID`

`PAID`

- inkluderar allt i `AUTH`
- låser upp trupphantering, spelare i databas och coachflödet kring lagets spelare

## Åtkomstmodell

IUP-flödet för coach/admin är admin-scope i v1.

Det gäller:

- lagägare
- aktiv team-admin via `team_members.is_team_admin = true`
- aktiv klubb-admin för lagets klubb

Det gäller inte ännu:

- vanliga teammedlemmar utan adminroll
- spelare som bara är kopplade som medlem/användare

## Det som finns i appen

- Supabase auth med e-post/lösenord
- startsida för `FREE`, `AUTH` och `PAID`
- trupphantering för `PAID`
- IUP-editor med nuläge, korta/långa mål, återkopplingspunkter och självskattning
- check-in-tidslinje för coach och kopplad spelare, med koppling till mål och review points
- lokaliserat UI för svenska och engelska
- konto-bundna målförslag för inloggade användare
- automatisk spelar-koppling via `team_members.email` -> `team_members.user_id` när spelaren loggar in med matchande e-post

## Kvalitetsgrind

Använd dessa kontroller före merge eller release:

```bash
npm run lint
npm run typecheck
npm run smoke
```

`npm run ci` kör samma steg följt av produktionsbuild:

```bash
npm run ci
```

`ci` innehåller nu:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run smoke`
4. `node scripts/build-ci.mjs`

## Smoke-test

`npm run smoke` är just nu ett lätt kontraktstest som verifierar:

- att centrala scripts finns i `package.json`
- att språkdata för kärnsidor finns
- att målförslag har giltig grundstruktur

Det är inte full browser-E2E ännu.

## Kända begränsningar

- `npm run ci` fallerar fortfarande lokalt på Windows i Next-builden trots att `lint`, `typecheck` och `smoke` passerar
- observerade fel i lokal Windows-miljö:
  - Turbopack: `EPERM` vid rename/unlink i build-output
  - webpack: `spawn EPERM`
  - webpack + worker threads: `DataCloneError`
- spelarkonto-koppling kräver fortfarande att coachen sparar rätt spelare-post med rätt e-postadress i squad-vyn
- rollflöden för coach respektive spelare är inte färdigproduktifierade

## Manuell kontrollista

Kör detta efter DB-migrering och före release:

1. Öppna `/`
2. Verifiera `FREE`-flöde för temporärt utkast
3. Logga in och verifiera `AUTH`-flöde
4. Öppna `/squad` som `PAID` och skapa spelare
5. Redigera samma spelare och spara
6. Skapa ny IUP för vald spelare
7. Öppna `/iup/[id]`, redigera fält/mål och spara
8. Ladda om sidan och verifiera sparade värden
9. Lägg till och ta bort en check-in på planen
10. Verifiera att spelare med matchande e-post får sin koppling efter inloggning
11. Verifiera arkivera/ta bort för planägare

## Nästa steg

1. få `npm run ci` grönt även i lokal Windows-miljö
2. lägg till full browser-E2E när buildblockeraren inte längre styr teststrategin
3. bygg riktiga rollflöden för coach och spelare
4. fördjupa check-ins med bättre uppföljningsdialog eller historikvy
5. bygg tydligare invite/link-UI ovanpå spelarkopplingen
