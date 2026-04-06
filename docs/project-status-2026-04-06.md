# Projektstatus: Teamzone IUP

Datum: 2026-04-06

## Syfte

Det här dokumentet sammanfattar projektets nu-status, identifierade risker, vad som behöver åtgärdas kortsiktigt och vad som bör planeras framåt.

Underlaget bygger på genomgång av kodbasen, befintlig README, Supabase-schema och lokal verifiering via `npm run ci`.

## Kort nulägesbild

Projektet är en fristående Next.js-app för IUP-hantering kopplad till samma Supabase-projekt som övriga Teamzone/Tactics Board-delar.

Följande finns på plats i koden:

- Inloggning via Supabase med mail/lösenord.
- Tydlig indelning i `FREE`, `AUTH` och `PAID`.
- Skapa lokala utkast i `FREE`/`AUTH`.
- Trupphantering för `PAID`-användare.
- Skapa IUP för spelare i truppen.
- IUP-editor med nuläge, korta/långa mål, återkopplingspunkter och självskattning.
- Supabase-schema med tabeller för planer, mål, check-ins, målförslag och koppling spelare <-> användare.

Statusen är alltså mer än ett prototypskal. Det finns ett användbart vertikalt flöde från auth till spelare till IUP. Samtidigt finns flera gap mellan produktidé, datamodell och faktisk implementation.

## Det som fungerar bra

- Kodbasen är liten nog att fortfarande gå att styra om utan tung migrationskostnad.
- `npm run typecheck` passerar, vilket visar att TypeScript-läget är relativt kontrollerat.
- Datamodellen i `supabase/iup_schema.sql` täcker flera framtida behov redan nu.
- UI:t visar att produkten har ett konkret arbetssätt, inte bara generiska CRUD-sidor.
- README innehåller en rimlig manuell smoke-checklista.

## Akuta problem att åtgärda

### 1. UI och databas är inte överens om antal återkopplingar

Det här är den tydligaste funktionsbuggen just nu.

UI:t erbjuder följande val:

- `weekly` = 52 återkopplingar
- `bi_weekly` = 26 återkopplingar
- `monthly` = 12 återkopplingar

Men databasen begränsar `review_count` till max 12 i `supabase/iup_schema.sql`.

Konsekvens:

- användaren kan välja giltiga alternativ i UI:t
- `createIupPlan` och `saveIupPlanEditor` skickar vidare dessa värden
- databasen kommer att neka planen för 26 eller 52

Berörda filer:

- `src/app/page.tsx`
- `src/app/iup/[id]/page.tsx`
- `src/lib/iupApi.ts`
- `supabase/iup_schema.sql`

Rekommendation:

- besluta om produkten verkligen ska stödja veckovis och varannan vecka
- om ja: höj DB-gränsen och verifiera hela flödet
- om nej: ta bort valen ur UI:t direkt

### 2. Byggsteget är inte stabilt lokalt

`npm run ci` gav:

```text
typecheck: OK
build: FAIL
EPERM: operation not permitted, unlink '.next/diagnostics/build-diagnostics.json'
```

Det här ser inte ut som en kodbugg i appen, utan ett arbetsmiljö-/build-cache-problem. Men det spelar ändå roll eftersom README säger att `npm run ci` är kvalitetsgrinden före release.

Rekommendation:

- säkra att `.next` kan rensas utan låsning i lokal miljö och CI
- överväg att rensa `.next` före build i CI om problemet återkommer
- verifiera build i en ren miljö

### 3. Åtkomstmodell fastslagen för v1

IUP-flödet för coach/admin är nu definierat som admin-scope.

Det gäller:

- lagägare
- aktiv team-admin via `team_members.is_team_admin = true`
- aktiv klubb-admin för lagets klubb

Det gäller inte ännu:

- vanliga teammedlemmar utan adminroll
- spelare som bara är kopplade som medlem/användare

Konsekvens:

- frontend och databas pekar nu åt samma håll
- coachflödet blir förutsägbart
- spelaregenåtkomst och bred medlemsåtkomst skjuts till senare produktfas

## Viktiga kvalitetsbrister

### 1. För stor logik i en enskild sida

`src/app/iup/[id]/page.tsx` är cirka 2030 rader och innehåller:

- dataladdning
- auth-kontroll
- lokal lagring
- målhantering
- kategorisering av målförslag
- review cadence-logik
- editor-UI
- arkivering/radering

Det här är den största källan till framtida underhållsrisk.

Rekommendation:

- bryt ut domänlogik till hooks eller services
- bryt ut UI i mindre komponenter per steg
- separera lokal draft-logik från serverlagrad IUP-logik

### 2. Målförslag finns både lokalt och i databasen, men används inte konsekvent

Det finns stöd i databasen och API:t för `iup_goal_suggestions`, men IUP-sidan använder fortfarande `localStorage` för anpassade förslag.

Konsekvens:

- samma funktion finns i två modeller
- användarens data blir enhetsbunden istället för kontobunden
- databasen bär på funktionalitet som inte nyttjas fullt ut

Rekommendation:

- välj en strategi
- om inloggad användare ska ha egna målbibliotek: använd DB-spåret fullt ut
- behåll `localStorage` endast som fallback för `FREE`

### 3. Avsaknad av automatiserade tester och linting

Projektet har idag scripts för:

- `dev`
- `build`
- `start`
- `typecheck`
- `ci`

Det saknas:

- enhets- eller integrationstester
- E2E-smoke
- lint-script

Det betyder att mycket funktionalitet bara skyddas av manuell testning.

Rekommendation:

- inför åtminstone ett lätt E2E-smoke för kärnflöden
- lägg till linting innan koden växer vidare

### 4. Settings-sidan är fortfarande grov

`src/app/settings/page.tsx` använder inline styles och en lokal `localStorage`-toggle för coach-skattning. Det fungerar, men känns mer som ett internt hjälpsteg än en färdig del av produkten.

Rekommendation:

- antingen formaliseras sidan som riktig produktinställning
- eller så flyttas detta till en enklare intern feature-flag-lösning

## Produktmässiga luckor

Följande är påbörjat eller antytt i modellen, men ännu inte färdigt som hel produkt:

- tydliga rollvyer för coach respektive spelare
- check-in-flöde som faktiskt används i UI:t
- koppling mellan spelare och auth-användare i verkligt flöde
- notiser/påminnelser
- bättre statushantering än endast `active/completed/archived`
- tydligare deploy- och releaseprocess

## Rekommenderad prioritering

### Prioritet 1: innan mer funktionalitet byggs

1. Rätta mismatch kring `review_count` mellan UI och databas.
2. Säkra att `npm run ci` går igenom i ren miljö.
3. Bestäm och dokumentera faktisk åtkomstmodell: endast ägare eller även teammedlemmar.
4. Bryt upp `src/app/iup/[id]/page.tsx` i mindre delar.

### Prioritet 2: för att göra första versionen robust

1. Flytta målförslag för inloggade användare från lokal lagring till Supabase.
2. Lägg till linting och minst ett automatiserat smoke-flöde.
3. Definiera tydligt vad `FREE`, `AUTH` och `PAID` faktiskt innebär funktionellt.
4. Förbättra README med verklig setup, kända begränsningar och release-checklista.

### Prioritet 3: framåt

1. Bygg riktiga rollflöden för coach/spelare.
2. Aktivera check-ins som en central del av IUP-arbetet.
3. Använd `team_members.user_id` och rollstyrning för spelarinloggning och egen uppföljning.
4. Lägg till notiser, deadlines och uppföljningspåminnelser.
5. Följ upp med analys/rapportering per spelare och period.

## Samlad bedömning

Projektet har kommit förbi idéstadiet och har redan ett användbart kärnflöde. Det största värdet just nu är inte att lägga till fler features, utan att göra det som redan finns konsekvent och driftsäkert.

Den mest rimliga vägen framåt är:

1. stäng de konkreta mismatcharna mellan UI, API och databas
2. stabilisera build och kvalitetsgrind
3. minska komplexiteten i IUP-editorn
4. först därefter bygga rollflöden, check-ins och spelarkoppling fullt ut

## Referenser i kodbasen

- `package.json`
- `README.md`
- `src/app/page.tsx`
- `src/app/iup/[id]/page.tsx`
- `src/app/squad/page.tsx`
- `src/app/settings/page.tsx`
- `src/lib/iupApi.ts`
- `supabase/iup_schema.sql`
