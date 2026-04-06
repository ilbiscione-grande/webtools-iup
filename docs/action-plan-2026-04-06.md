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

- [ ] Dela upp [page.tsx](c:/Dev/projects/webtools/iup/src/app/iup/[id]/page.tsx) i mindre ansvar.
- [ ] Välj en enda strategi för målförslag för `FREE`, `AUTH`, `PAID`.

### Kvalitetsgrund

- [ ] Lägg till linting i projektet och i `ci`.
- [ ] Lägg till minimala automatiserade smoke-tester.
- [ ] Skärp [README.md](c:/Dev/projects/webtools/iup/README.md) till driftbar dokumentation.

### Produktifiering

- [ ] Definiera produktbeteende för `FREE`, `AUTH`, `PAID`.
- [ ] Bygg riktiga rollflöden för coach och spelare.
- [ ] Aktivera check-ins som faktisk UI-funktion.
- [ ] Aktivera spelarkonto-koppling via `team_members.user_id`.

## Sprintchecklista

### Sprint 1

- [x] Fixa `review_count`-mismatchen.
- [ ] Få `npm run ci` grönt.
- [x] Besluta åtkomstmodell.

### Sprint 2

- [ ] Bryt upp IUP-editorn.
- [ ] Koppla målförslag till Supabase för inloggade användare.

### Sprint 3

- [ ] Lägg till linting.
- [ ] Lägg till smoke-test.
- [ ] Skärp README.

### Sprint 4

- [ ] Definiera planer och roller.
- [ ] Bygg check-ins i UI.
- [ ] Börja använda `team_members.user_id` och rollstyrning fullt ut.

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

### 8. Skärp README till driftbar dokumentation

Åtgärd:

- dokumentera verklig setup
- dokumentera planbegränsningar
- dokumentera build/test-rutin
- dokumentera kända begränsningar i v1

Leverabler:

- uppdaterad [README.md](c:/Dev/projects/webtools/iup/README.md)

Prioritet: Medium

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

### 10. Bygg riktiga rollflöden

Behov:

- coach-vy
- spelare-vy
- rättigheter för läsning, egen skattning och uppföljning

Beroenden:

- åtkomstmodell måste vara fastslagen först

Prioritet: Medium

### 11. Aktivera check-ins som faktisk funktion

Behov:

- check-ins finns i schema men används inte som central UI-funktion idag

Åtgärd:

- skapa check-in-tidslinje
- koppla till review points
- tydliggör vem som får skriva vad

Prioritet: Medium

### 12. Aktivera spelarkonto-koppling

Behov:

- spelare behöver kunna kopplas till auth-användare via delade modellen

Åtgärd:

- använd `team_members.user_id` och rollfält konsekvent
- möjliggör spelarspecifik inloggning och självskattning

Prioritet: Låg till Medium

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
