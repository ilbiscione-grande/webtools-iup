# Åtgärdsplan: Teamzone IUP

Datum: 2026-04-06

## Mål

Stabilisera nuvarande produkt innan mer funktionalitet byggs, så att flödet från inloggning till spelare till IUP fungerar konsekvent i kod, databas och build.

## Arbetschecklista

Använd den här listan som löpande avprickning under arbetet.

### Kritiska blockerare

- [x] Synka `review_count` mellan UI och databas.
- [ ] Få `npm run ci` att gå grönt i ren miljö.
- [x] Bestäm och dokumentera faktisk åtkomstmodell.

### Teknisk risk

- [x] Dela upp [page.tsx](c:/Dev/projects/webtools/iup/src/app/iup/[id]/page.tsx) i mindre ansvar.
- [x] Välj en enda strategi för målförslag för `FREE`, `AUTH`, `PAID`.

### Kvalitetsgrund

- [x] Lägg till linting i projektet och i `ci`.
- [x] Lägg till minimala automatiserade smoke-tester.
- [x] Skärp [README.md](c:/Dev/projects/webtools/iup/README.md) till driftbar dokumentation.

### Produktifiering

- [x] Definiera produktbeteende för `FREE`, `AUTH`, `PAID`.
- [ ] Bygg riktiga rollflöden för coach och spelare.
- [x] Aktivera check-ins som faktisk UI-funktion.
- [x] Aktivera spelarkonto-koppling via `team_members.user_id`.

## Sprintchecklista

### Sprint 1

- [x] Fixa `review_count`-mismatchen.
- [ ] Få `npm run ci` grönt.
- [x] Besluta åtkomstmodell.

### Sprint 2

- [x] Bryt upp IUP-editorn.
- [x] Koppla målförslag till Supabase för inloggade användare.

### Sprint 3

- [x] Lägg till linting.
- [x] Lägg till smoke-test.
- [x] Skärp README.

### Sprint 4

- [x] Definiera planer och roller.
- [x] Bygg check-ins i UI.
- [x] Börja använda `team_members.user_id` och rollstyrning fullt ut.

## Principer

- Fixa faktiska blockerare före nya features.
- Synka UI, API och databas innan vidare utveckling.
- Minska komplexitet i största riskytan: IUP-editorn.
- Inför en enkel men verklig kvalitetsgrind.

## Fas 1: Stäng blockerare

Mål: ta bort fel som gör att flöden kan gå sönder trots att UI:t ser korrekt ut.

### 1. Synka `review_count` mellan UI och databas

Problem:

- UI erbjuder 26 och 52 återkopplingar.
- DB accepterar max 12.

Åtgärd:

- Besluta om produkten ska stödja fler än 12 återkopplingar.
- Om nej: begränsa UI till alternativ som DB redan stödjer.
- Om ja: uppdatera DB-constraint, RPC och verifiera editorflödet.

Leverabler:

- uppdaterad [iup_schema.sql](c:/Dev/projects/webtools/iup/supabase/iup_schema.sql)
- uppdaterad [page.tsx](c:/Dev/projects/webtools/iup/src/app/page.tsx)
- uppdaterad [page.tsx](c:/Dev/projects/webtools/iup/src/app/iup/[id]/page.tsx)
- verifierat skapa/spara-flöde

Prioritet: Kritisk

### 2. Få `npm run ci` att gå grönt i ren miljö

Problem:

- `typecheck` passerar
- `build` fallerar på `.next`-låsning lokalt

Åtgärd:

- verifiera att felet är cache-/miljörelaterat och inte appkod
- testa build efter ren `.next`
- säkra att CI eller lokal check kör i ren byggmiljö

Leverabler:

- stabil `npm run ci`
- uppdaterad README med faktisk build-rutin om det behövs

Prioritet: Kritisk

Status 2026-04-06:

- `typecheck` passerar
- `ci` använder nu separat build-katalog för att undvika låst `.next`
- build fallerar fortfarande lokalt på Windows med `EPERM` i Next-builden
- kräver fortsatt åtgärd i buildmiljö/rutin innan punkten kan bockas av

Status 2026-04-08:

- `scripts/build-ci.mjs` använder nu unik CI-buildkatalog per körning
- CI-builden använder temporär `tsconfig` för att undvika att vanlig `tsconfig.json` muteras av Next
- Turbopack fallerar lokalt på Windows med filsystemfel vid rename/unlink i build-output
- webpack-build kommer längre men fallerar fortfarande lokalt på Windows:
  - med worker-processer: `spawn EPERM`
  - med worker threads: `DataCloneError`
- problemet är nu avgränsat till Next.js-build på lokal Windows-miljö, inte till appens TypeScript- eller UI-kod
- punkten är fortfarande öppen

### 3. Bestäm faktisk åtkomstmodell

Problem:

- DB/RLS stödjer både ägare och teammedlemmar
- frontend hämtar flera listor enbart för ägare

Åtgärd:

- besluta om v1 ska vara `owner-only` eller stödja teammedlemmar fullt ut
- justera queries eller schemaantaganden därefter
- dokumentera beslutet

Leverabler:

- uppdaterad [iupApi.ts](c:/Dev/projects/webtools/iup/src/lib/iupApi.ts)
- uppdaterad README/statusdokumentation

Prioritet: Hög

Status 2026-04-08:

- åtkomstmodellen är fastslagen för v1 och dokumenterad i kod/dokumentation
- coachflödet använder admin-scope och inte allmän teammedlemsåtkomst
- punkten är genomförd

Beslut 2026-04-06:

- v1 använder admin-scope, inte allmän teammedlemsåtkomst
- åtkomst till IUP i coachflödet gäller endast:
  - lagägare
  - aktiv team-admin
  - aktiv klubb-admin för lagets klubb
- vanlig lagmedlem/spelare ingår inte i detta flöde ännu

## Fas 2: Minska teknisk risk

Mål: göra kodbasen lättare att ändra utan regressionsrisk.

### 4. Dela upp IUP-editorn

Problem:

- [page.tsx](c:/Dev/projects/webtools/iup/src/app/iup/[id]/page.tsx) är mycket stor och blandar ansvar

Åtgärd:

- bryt ut stegkomponenter
- bryt ut review cadence-logik
- bryt ut lokal draft-hantering
- bryt ut suggestion-logik

Föreslagen struktur:

- `src/app/iup/[id]/components/`
- `src/app/iup/[id]/hooks/`
- `src/lib/iup/`

Leverabler:

- mindre huvudfil
- separata komponenter för steg 1-4
- separata hjälpfunktioner för review och suggestions

Prioritet: Hög

Status 2026-04-08:

- första uppdelningspass genomfört
- ren domänlogik för assessment, review cadence, suggestions och spelarhjälpare bruten ut från [page.tsx](c:/Dev/projects/webtools/iup/src/app/iup/[id]/page.tsx) till [editorUtils.ts](c:/Dev/projects/webtools/iup/src/lib/iup/editorUtils.ts)
- stegsektioner brutna ut till komponenter:
  - [PlayerProfileStep.tsx](c:/Dev/projects/webtools/iup/src/app/iup/[id]/components/PlayerProfileStep.tsx)
  - [CurrentStateStep.tsx](c:/Dev/projects/webtools/iup/src/app/iup/[id]/components/CurrentStateStep.tsx)
  - [GoalsStep.tsx](c:/Dev/projects/webtools/iup/src/app/iup/[id]/components/GoalsStep.tsx)
  - [SummaryStep.tsx](c:/Dev/projects/webtools/iup/src/app/iup/[id]/components/SummaryStep.tsx)
- profilheader och review-toolbar brutna ut till [IupHeader.tsx](c:/Dev/projects/webtools/iup/src/app/iup/[id]/components/IupHeader.tsx)
- huvudfilen minskad från cirka 2650 till cirka 1390 rader
- första hook för review state/logik bruten ut till [useIupReviewState.ts](c:/Dev/projects/webtools/iup/src/app/iup/[id]/hooks/useIupReviewState.ts)
- `auth/init` brutet ut till [useIupAuthInit.ts](c:/Dev/projects/webtools/iup/src/app/iup/[id]/hooks/useIupAuthInit.ts)
- planladdning och lokal draft-återställning brutet ut till [useIupPlanLoader.ts](c:/Dev/projects/webtools/iup/src/app/iup/[id]/hooks/useIupPlanLoader.ts)
- photo state/helpers brutet ut till [useIupPhotoState.ts](c:/Dev/projects/webtools/iup/src/app/iup/[id]/hooks/useIupPhotoState.ts)
- save/complete/archive/delete brutet ut till [useIupSaveActions.ts](c:/Dev/projects/webtools/iup/src/app/iup/[id]/hooks/useIupSaveActions.ts)
- suggestions-state brutet ut till [useIupSuggestionsState.ts](c:/Dev/projects/webtools/iup/src/app/iup/[id]/hooks/useIupSuggestionsState.ts)
- custom suggestions ägs nu av suggestions-hooken i stället för `auth/init`, vilket gör nästa DB-koppling tydligare
- huvudfilen minskad vidare till cirka 525 rader
- punkten är genomförd som riskreducering, även om fortsatt finputs kan göras senare

### 5. Välj en enda strategi för målförslag

Problem:

- lokala custom suggestions finns i `localStorage`
- samma domän finns också i Supabase via `iup_goal_suggestions`

Åtgärd:

- använd Supabase för inloggade användare
- behåll lokal lagring endast för `FREE`
- ta bort dubbla källor i `AUTH`/`PAID`

Leverabler:

- inkopplat DB-flöde via [iupApi.ts](c:/Dev/projects/webtools/iup/src/lib/iupApi.ts)
- förenklad logik i [page.tsx](c:/Dev/projects/webtools/iup/src/app/iup/[id]/page.tsx)

Prioritet: Hög

Status 2026-04-08:

- `AUTH`/inloggade användare läser nu custom suggestions från databasen via [iupApi.ts](c:/Dev/projects/webtools/iup/src/lib/iupApi.ts)
- samma flöde sparar nu tillbaka till `iup_goal_suggestions` vid spara/slutför
- `FREE` behåller lokal lagring för custom suggestions
- suggestions-state äger nu datakällan i [useIupSuggestionsState.ts](c:/Dev/projects/webtools/iup/src/app/iup/[id]/hooks/useIupSuggestionsState.ts)
- punkten är genomförd

## Fas 3: Sätt grund för kvalitet

Mål: minska beroendet av manuell testning.

### 6. Lägg till linting

Åtgärd:

- inför lint-script
- kör det i `ci`

Leverabler:

- uppdaterad [package.json](c:/Dev/projects/webtools/iup/package.json)
- konfigurerad lint-rutin

Prioritet: Medium

Status 2026-04-08:

- `lint`-script tillagt i [package.json](c:/Dev/projects/webtools/iup/package.json)
- `ci` kör nu `lint` före `typecheck` och build
- ESLint flat config tillagd i [eslint.config.mjs](c:/Dev/projects/webtools/iup/eslint.config.mjs)
- punkten är genomförd i kodbasen

### 7. Lägg till minimala automatiserade smoke-tester

Fokusflöden:

- logga in
- öppna trupp
- skapa spelare
- skapa IUP
- öppna och spara IUP

Leverabler:

- första E2E-smoke eller motsvarande automatiserad kontroll

Prioritet: Medium

Status 2026-04-08:

- `smoke`-script tillagt i [package.json](c:/Dev/projects/webtools/iup/package.json)
- smoke-kontroll tillagd i [smoke-contracts.mjs](c:/Dev/projects/webtools/iup/scripts/smoke-contracts.mjs)
- `ci` kör nu `smoke` efter `lint` och `typecheck`
- nuvarande smoke är en lätt kontraktstest för kärnmoduler och scripts, inte full browser-E2E
- punkten är genomförd som första automatiserade smoke-nivå

### 8. Skärp README till driftbar dokumentation

Åtgärd:

- dokumentera verklig setup
- dokumentera planbegränsningar
- dokumentera build/test-rutin
- dokumentera kända begränsningar i v1

Leverabler:

- uppdaterad [README.md](c:/Dev/projects/webtools/iup/README.md)

Prioritet: Medium

Status 2026-04-08:

- [README.md](c:/Dev/projects/webtools/iup/README.md) omskriven från starter-text till faktisk projektdokumentation
- setup, databasordning, produktnivåer och åtkomstmodell är nu dokumenterade
- kvalitetsgrind med `lint`, `typecheck`, `smoke` och `ci` är beskriven
- kända begränsningar för lokal Windows/Next-build är dokumenterade
- punkten är genomförd

## Fas 4: Produktifiering

Mål: bygga vidare först när grunden är stabil.

### 9. Definiera produktbeteende för `FREE`, `AUTH`, `PAID`

Behov:

- tydliga regler för vad som sparas lokalt respektive i DB
- tydliga skillnader i UI och flöden

Leverabler:

- dokumenterat regelverk
- konsekvent gating i UI/API

Prioritet: Medium

Regelverk 2026-04-08:

- `FREE` används utan inloggning.
- `FREE` kan skapa och öppna tillfälliga IUP-utkast i nuvarande session.
- `FREE` sparar utkast i `sessionStorage`, inte i databasen.
- `FREE` sparar egna målförslag lokalt i `localStorage`.
- `FREE` har inte tillgång till trupphantering eller serverlagrade spelarflöden.
- `AUTH` används av inloggad användare utan `PAID`-truppflöde.
- `AUTH` kan skapa och öppna egna IUP:er och arbeta vidare i editorn.
- `AUTH` använder lokala utkast per användare på enheten som återställningsspår.
- `AUTH` sparar egna målförslag konto-bundet i databasen via `iup_goal_suggestions`.
- `AUTH` får inte truppsidan eller lagadministration som kräver `PAID`.
- `PAID` inkluderar allt i `AUTH`.
- `PAID` låser dessutom upp trupphantering, spelare i databas och coachflödet kring lagets spelare.
- coach/admin-flödet i v1 gäller lagägare, aktiv team-admin och aktiv klubb-admin för lagets klubb.
- vanlig teammedlem eller spelare utan adminroll ingår ännu inte i coachflödet.

Status 2026-04-08:

- regelverket är dokumenterat
- teknisk gating finns delvis redan i UI/API
- rollflöden för coach respektive spelare återstår som separat produktsteg

### 10. Bygg riktiga rollflöden

Behov:

- coach-vy
- spelare-vy
- rättigheter för läsning, egen skattning och uppföljning

Beroenden:

- åtkomstmodell måste vara fastslagen först

Prioritet: Medium

Status 2026-04-08:

- första spelarläget är infört som läs- och egen-skattningsflöde
- kopplad spelare kan nu se sina egna IUP:er från startsidan via [fetchMyPlayerPlans](c:/Dev/projects/webtools/iup/src/lib/iupApi.ts)
- IUP-vyn visar nu tydligare spelarroll i läsläge i [page.tsx](c:/Dev/projects/webtools/iup/src/app/iup/[id]/page.tsx)
- RLS för läsning är utökad i [iup_schema.sql](c:/Dev/projects/webtools/iup/supabase/iup_schema.sql) så att kopplad spelare kan läsa egen plan, mål och check-ins
- spelaren kan nu spara egen nulägesbild och självskattning via [save_iup_player_assessment](c:/Dev/projects/webtools/iup/supabase/iup_schema.sql)
- coachredigering är fortsatt separat från spelarläget
- punkten är påbörjad men inte färdig: check-ins, spelarspecifik uppföljning och full rollprodukt återstår

### 11. Aktivera check-ins som faktisk funktion

Behov:

- check-ins finns i schema men används inte som central UI-funktion idag

Åtgärd:

- skapa check-in-tidslinje
- koppla till review points
- tydliggör vem som får skriva vad

Prioritet: Medium

Status 2026-04-08:

- första check-in-tidslinjen finns nu i IUP-vyn via [CheckinsSection.tsx](c:/Dev/projects/webtools/iup/src/app/iup/[id]/components/CheckinsSection.tsx)
- coach och kopplad spelare kan läsa check-ins på egen IUP
- coach och kopplad spelare kan skapa egna check-ins via [createIupCheckin](c:/Dev/projects/webtools/iup/src/lib/iupApi.ts)
- användare kan ta bort sina egna check-ins
- insert-policy i [iup_schema.sql](c:/Dev/projects/webtools/iup/supabase/iup_schema.sql) stödjer nu både coach/admin och kopplad spelare
- check-ins kan nu också kopplas explicit till mål och återkopplingspunkt i UI:t
- `iup_checkins` bär nu även `review_point_id` för denna koppling
- punkten är genomförd som första riktiga produktnivå för check-ins

### 12. Aktivera spelarkonto-koppling

Behov:

- spelare behöver kunna kopplas till auth-användare via delade modellen

Åtgärd:

- använd `team_members.user_id` och rollfält konsekvent
- möjliggör spelarspecifik inloggning och självskattning

Prioritet: Låg till Medium

Status 2026-04-08:

- squad-vyn kan nu spara spelarens e-post på `team_members`
- ny RPC i [iup_schema.sql](c:/Dev/projects/webtools/iup/supabase/iup_schema.sql) låter inloggad användare claim:a matchande spelarposter via e-post och sätta `team_members.user_id`
- claim körs nu automatiskt vid inloggning och vid init av IUP-sidan via [page.tsx](c:/Dev/projects/webtools/iup/src/app/page.tsx) och [useIupAuthInit.ts](c:/Dev/projects/webtools/iup/src/app/iup/[id]/hooks/useIupAuthInit.ts)
- detta gör att spelarläget, `Mina IUP` och spelarens egen uppföljning kan börja fungera utan manuell databaskoppling
- punkten är genomförd som första riktig produktnivå för spelarkonto-koppling

## Rekommenderad ordning vecka för vecka

### Sprint 1

1. fixa `review_count`
2. få `npm run ci` grönt
3. besluta åtkomstmodell

Utfall:

- inga uppenbara blockerare i kärnflödet

### Sprint 2

1. bryt upp IUP-editorn
2. koppla målförslag till Supabase för inloggade användare

Utfall:

- lägre ändringsrisk
- färre dubbla datakällor

### Sprint 3

1. lägg till linting
2. lägg till smoke-test
3. skärp README

Utfall:

- enklare att släppa ändringar utan manuellt gissande

### Sprint 4

1. definiera planer och roller
2. bygg check-ins i UI
3. börja använda `team_members.user_id` och rollstyrning fullt ut

Utfall:

- tydligare produkt
- bättre grund för verklig användning

## Beslut som behöver tas av produkt/ägare

Följande behöver avgöras tidigt, annars blir implementationen spretig:

1. Ska v1 stödja endast lagägare eller även tränare/teammedlemmar fullt ut?
2. Ska veckovis och varannan vecka verkligen stödjas?
3. Ska `AUTH` vara en lokal premiumnivå eller en riktig serverlagrad nivå?
4. Ska spelare kunna logga in och fylla i egen del i v1 eller senare?

## Definition av klar för stabil v1

Projektet kan betraktas som tekniskt stabilt för nästa steg när följande är sant:

- `npm run ci` går grönt konsekvent
- skapa/spara IUP fungerar för alla val som UI visar
- åtkomstmodell är konsekvent mellan UI och RLS
- IUP-editorn är uppdelad i mindre ansvar
- minst ett automatiserat smoke-flöde finns
- README speglar faktisk setup och begränsningar

## Rekommenderat första genomförande

Om arbetet ska påbörjas direkt är bästa ordningen:

1. fixa `review_count`-mismatchen
2. stabilisera build/check
3. därefter ta uppdelningen av IUP-editorn

Det ger högst riskreduktion per insats.

## Arbetslogg 2026-04-08

Genomfört:

- språkstöd justerat för sökfält, mål-pills och review-plan i UI
- build-check undersökt vidare i lokal Windows-miljö
- CI-skriptet förbättrat för separat build-output och separat CI-tsconfig

Verifierat:

- `npm run typecheck` passerar
- `npm run ci` fallerar fortfarande lokalt i Next-builden trots separat CI-output

Föreslaget nästa steg:

1. verifiera samma build i ren extern CI-miljö eller annan Windows-maskin utan lokal låsning/AV-påverkan
2. om felet reproduceras där: pinn eller nedgradera Next-version alternativt testa annan buildkonfiguration isolerat
3. om felet inte reproduceras där: dokumentera lokal Windows-begränsning i README och fortsätt med Sprint 2
