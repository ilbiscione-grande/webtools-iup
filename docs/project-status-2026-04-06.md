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

Status 2026-04-08:

- CI-skriptet använder nu unik buildkatalog per körning i stället för delad `.next`
- CI-builden använder temporär `tsconfig` så att vanlig `tsconfig.json` inte skrivs om av Next
- problemet kvarstår ändå i lokal Windows-miljö och har nu smalnats av till Next-builden själv:
  - Turbopack: `EPERM` vid rename/unlink i build-output
  - webpack: `spawn EPERM`
  - webpack + worker threads: `DataCloneError`

Bedömning:

- felet ser nu mer ut som Next.js 16 + lokal Windows-miljö/filsystem/processhantering än som appspecifik kodbugg
- `typecheck` är fortfarande grön
- kärnrisken ligger i att kvalitetsgrinden inte kan verifieras konsekvent lokalt

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

### 1. IUP-editorn var tidigare den största komplexitetsytan

`src/app/iup/[id]/page.tsx` var tidigare mycket stor och blandade:

- dataladdning
- auth-kontroll
- lokal lagring
- målhantering
- kategorisering av målförslag
- review cadence-logik
- editor-UI
- arkivering/radering

Status 2026-04-08:

- sidan är nu nere på cirka 525 rader
- steg-UI är brutet ut till egna komponenter
- review, auth/init, planladdning, foto, save-actions och suggestions ligger i egna hooks

Bedömning:

- detta är inte längre den mest akuta riskytan i projektet
- fortsatt finputs kan göras, men huvudproblemet är redan tydligt reducerat

### 2. Målförslag har nu tydligare källa, men produktgränserna måste hållas tydliga

Det finns stöd i databasen och API:t för `iup_goal_suggestions`. IUP-sidan använder nu databasen för inloggade användare och behåller `localStorage` endast för `FREE`.

Konsekvens:

- `AUTH` och `PAID` får konto-bundna målförslag i stället för enhetsbundna
- `FREE` kan fortsatt fungera utan konto och utan databasberoende
- den tekniska strategin är tydligare än tidigare

Kvar att bevaka:

- produktbeteendet för `AUTH` kontra `PAID` måste fortsätta vara konsekvent i UI och dokumentation
- dubbla lagringsmodeller finns fortfarande medvetet kvar eftersom `FREE` är offline/lokal

### 3. Avsaknad av automatiserade tester och linting

Projektet har idag scripts för:

- `dev`
- `build`
- `start`
- `typecheck`
- `ci`

Det saknas:

- enhets- eller integrationstester
- full browser-E2E

Status 2026-04-08:

- `lint`-script finns nu i projektet
- `ci` kör nu lint före `typecheck` och build
- ett första automatiserat smoke-test finns nu som kontraktstest för kärnmoduler och scripts
- nästa kvalitetsgap i denna del är full browser-E2E, inte avsaknad av smoke över huvud taget

Det betyder att mycket funktionalitet bara skyddas av manuell testning.

Rekommendation:

- håll lint- och smoke-rutinen aktiv
- lägg till full browser-E2E när build-/Windows-blockeraren inte längre styr teststrategin

### 4. README speglar nu projektets faktiska läge bättre

README var tidigare skriven mer som en starter-mall än som driftbar dokumentation.

Status 2026-04-08:

- setup och databasordning är dokumenterade mot faktisk kodbas
- `FREE`, `AUTH` och `PAID` är beskrivna utifrån nuvarande beteende
- kvalitetsgrind och kända begränsningar finns dokumenterade

Bedömning:

- dokumentationen är nu tillräckligt nära verkligheten för att fungera som arbetsunderlag
- framtida uppdateringar bör nu handla om produktförändringar, inte om att rätta gammal starter-text
### 5. Settings-sidan är fortfarande grov

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

Status 2026-04-08:

- ett första spelarläge finns nu som läs- och egen-skattningsflöde
- kopplad spelare kan se egna planer från startsidan och öppna dem i spelarläge
- spelaren kan spara egen nulägesbild och självskattning utan att få coachens redigeringsrättigheter
- första check-in-tidslinjen finns nu i IUP-vyn för coach och kopplad spelare
- check-ins kan nu knytas till både mål och review points i UI:t
- `team_members.user_id` används nu också i verkligt produktflöde: coachen kan spara spelarens e-post i squad-vyn och spelaren claim:ar sin koppling automatiskt vid inloggning
- coachredigering och full uppföljningsdialog är fortfarande inte färdiga rollflöden

## Rekommenderad prioritering

### Prioritet 1: innan mer funktionalitet byggs

1. Rätta mismatch kring `review_count` mellan UI och databas.
2. Säkra att `npm run ci` går igenom i ren miljö.
3. Bestäm och dokumentera faktisk åtkomstmodell: endast ägare eller även teammedlemmar.
4. Håll den uppdelade IUP-editorn stabil och undvik att lägga tillbaka blandat ansvar i `page.tsx`.

### Prioritet 2: för att göra första versionen robust

1. Lägg till linting och minst ett automatiserat smoke-flöde.
2. Definiera tydligt vad `FREE`, `AUTH` och `PAID` faktiskt innebär funktionellt i all produktnära dokumentation.
3. Förbättra README med verklig setup, kända begränsningar och release-checklista.
4. Verifiera att suggestions-flödet beter sig rätt i både `FREE` och inloggat läge.

### Prioritet 3: framåt

1. Bygg riktiga rollflöden för coach/spelare.
2. Fördjupa check-ins med bättre uppföljningsdialog, filtrering eller historikvy.
3. Fördjupa rollstyrningen ovanpå den nya `team_members.user_id`-kopplingen, till exempel med tydligare invite/link-UI.
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
