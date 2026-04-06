export type PositionGroup = "all" | "gk" | "def" | "mid" | "fwd";

export type GoalSuggestion = {
  title: string;
  description: string;
  groups: PositionGroup[];
};

const all: PositionGroup[] = ["all"];
const gk: PositionGroup[] = ["gk"];
const def: PositionGroup[] = ["def"];
const mid: PositionGroup[] = ["mid"];
const fwd: PositionGroup[] = ["fwd"];

const withAll = (groups: PositionGroup[]): PositionGroup[] =>
  Array.from(new Set<PositionGroup>(["all", ...groups]));

export const shortGoalSuggestions: GoalSuggestion[] = [
  { title: "Scanna före mottag", description: "Scanna minst två gånger före första touch i uppspelsfas.", groups: all },
  { title: "Passningsvinkel efter pass", description: "Skapa ny spelbar vinkel direkt efter passning i varje sekvens.", groups: all },
  { title: "Kommunikation i varje aktion", description: "Använd tydliga kommandon i både anfall och försvar.", groups: all },
  { title: "Duellprocent uppåt", description: "Vinna fler 1v1-dueller i både offensiv och defensiv riktning.", groups: all },
  { title: "Snabbare återerövring", description: "Återta boll inom 6 sekunder efter bollförlust i övningar.", groups: all },
  { title: "Bättre beslutshastighet", description: "Minska tid till beslut i smålagsspel under press.", groups: all },
  { title: "Kroppsställning rättvänd", description: "Få fler mottag med kroppen öppen mot spelriktning.", groups: all },
  { title: "Färre tekniska fel", description: "Minska enkla tekniska misstag i matchlika moment.", groups: all },
  { title: "Konsekvent återhämtning", description: "Följa individuell återhämtningsrutin efter pass/match.", groups: all },
  { title: "Tydligare matchfokus", description: "Sätta och följa 1–2 processmål inför varje match.", groups: all },

  { title: "Positionering i skottlinje", description: "Förbättra grundposition och justering i skottögonblicket.", groups: withAll(gk) },
  { title: "Fångstteknik under press", description: "Säkra grepp i trafik och vid andrabollar.", groups: withAll(gk) },
  { title: "Utkast med precision", description: "Öka träffsäkerhet i utkast mot ytor bakom första press.", groups: withAll(gk) },
  { title: "Kommunicera backlinje", description: "Styr backlinjen tydligt i djupled och sidled.", groups: withAll(gk) },
  { title: "En-mot-en räddningar", description: "Välja rätt avstånd och timing i frilägen.", groups: withAll(gk) },
  { title: "Fötter i uppspel", description: "Fler lyckade passningar med båda fötter i uppbyggnad.", groups: withAll(gk) },
  { title: "Reaktionsstart", description: "Snabbare första steg vid riktningsförändring och returer.", groups: withAll(gk) },
  { title: "Luftdueller i box", description: "Ta fler inlägg med rätt beslut: boxa eller fånga.", groups: withAll(gk) },

  { title: "Försvara rygg på motståndare", description: "Minska mottagningar mellan lagdelar genom tajt markering.", groups: withAll(def) },
  { title: "Brytningar i rätt läge", description: "Välj bättre läge mellan brytning och avvaktande försvar.", groups: withAll(def) },
  { title: "Passning genom första linje", description: "Hitta och spela genom första press oftare.", groups: withAll(def) },
  { title: "Djupledskontroll", description: "Synkronisera linjen för att stoppa djupledsspel.", groups: withAll(def) },
  { title: "Vända spel snabbt", description: "Använd spelvändning för att flytta motståndarens block.", groups: withAll(def) },
  { title: "Duellspel i box", description: "Vinn fler dueller i eget straffområde vid inlägg.", groups: withAll(def) },
  { title: "Överlapp tajming", description: "Tajma överlapp för att skapa 2v1 på kant.", groups: withAll(def) },
  { title: "Defensiv kommunikation", description: "Tydligare ansvar i markering och zonväxling.", groups: withAll(def) },

  { title: "Spelbar mellan linjer", description: "Skapa fler bollmottag i ytan mellan motståndarens linjer.", groups: withAll(mid) },
  { title: "Framåtriktad första touch", description: "Rikta första touch för att kunna accelerera spelet framåt.", groups: withAll(mid) },
  { title: "Byta tempo i anfall", description: "Variera tempo för att öppna passningsfönster.", groups: withAll(mid) },
  { title: "Pressresistens centralt", description: "Behålla boll under centralt tryck med rätt kroppsställning.", groups: withAll(mid) },
  { title: "Sista tredjedel-pass", description: "Öka kvalitet i avgörande passningar nära box.", groups: withAll(mid) },
  { title: "Andraboll-position", description: "Ta bättre utgångsposition för att vinna andrabollar.", groups: withAll(mid) },
  { title: "Defensiv omställning", description: "Snabbare återgång till defensiv position vid bolltapp.", groups: withAll(mid) },
  { title: "Skott utifrån", description: "Öka precision och beslut kring avslut utanför box.", groups: withAll(mid) },

  { title: "Löpning i djupled", description: "Starta djupledslöpning i bättre timing bakom backlinje.", groups: withAll(fwd) },
  { title: "Avslut på få touch", description: "Avsluta snabbare med färre touch i box.", groups: withAll(fwd) },
  { title: "Felvänd mottagning", description: "Säkra felvända mottag med väggspel och layoff.", groups: withAll(fwd) },
  { title: "Pressriktning först", description: "Sätt pressriktning som styr motståndaren till svag yta.", groups: withAll(fwd) },
  { title: "Inlöp i box", description: "Öka antal kvalitetsskapande löpningar mot första/andra yta.", groups: withAll(fwd) },
  { title: "1v1 offensivt", description: "Skapa fler genombrott i isolerade kantdueller.", groups: withAll(fwd) },
  { title: "Avslut med svagare fot", description: "Bli tryggare att avsluta med båda fötter.", groups: withAll(fwd) },
  { title: "Spel utan boll", description: "Skapa yta för lagkamrater med smarta motrörelser.", groups: withAll(fwd) },
];

export const longGoalSuggestions: GoalSuggestion[] = [
  { title: "Bygg hållbar spelidentitet", description: "Utveckla tydlig spelstil kopplad till lagets principer över hela säsongen.", groups: all },
  { title: "Mentalt matchledarskap", description: "Bli mer stabil i prestation oavsett matchbild och motstånd.", groups: all },
  { title: "Fysisk helhet", description: "Förbättra styrka, snabbhet och uthållighet enligt långsiktig plan.", groups: all },
  { title: "Teknisk bas på hög fart", description: "Bibehålla teknisk kvalitet i maxfart och under trötthet.", groups: all },
  { title: "Taktisk flexibilitet", description: "Hantera flera roller/system utan tydligt prestationsbortfall.", groups: all },
  { title: "Konsekvent återhämtning", description: "Etablera vanor för sömn, kost och återhämtning över tid.", groups: all },
  { title: "Ökad matchpåverkan", description: "Bidra i fler avgörande sekvenser per match över säsongen.", groups: all },
  { title: "Bättre beslutskvalitet", description: "Minska felbeslut under press i samtliga matchfaser.", groups: all },
  { title: "Kommunikation som verktyg", description: "Använd kommunikation för att förbättra lagets organisation.", groups: all },
  { title: "Självständigt lärande", description: "Planera och följa upp egen utveckling med regelbunden reflektion.", groups: all },

  { title: "Målvakt: dominera straffområdet", description: "Bli trygg ledare i boxspel och luftdueller under hela säsongen.", groups: withAll(gk) },
  { title: "Målvakt: distributionsspel", description: "Utveckla passnings- och utsparkskvalitet som första anfallsvapen.", groups: withAll(gk) },
  { title: "Målvakt: 1v1-expertis", description: "Bygga konsekvent beteende i frilägen och snabba omställningar.", groups: withAll(gk) },
  { title: "Målvakt: matchcoaching", description: "Styra lagets försvar med tydliga och tidiga signaler.", groups: withAll(gk) },
  { title: "Målvakt: återhämtningsrutin", description: "Skapa robust fysisk/mental rutin mellan matcher.", groups: withAll(gk) },
  { title: "Målvakt: svag fot", description: "Nå trygg distribution med båda fötter.", groups: withAll(gk) },
  { title: "Målvakt: positionsspel", description: "Konsekvent rätt position i relation till boll och backlinje.", groups: withAll(gk) },
  { title: "Målvakt: reaktionskapacitet", description: "Öka kvalitet i reaktioner på returer och riktningsförändringar.", groups: withAll(gk) },

  { title: "Försvar: djupledsspel", description: "Kontrollera ytor bakom backlinje i olika matchbilder.", groups: withAll(def) },
  { title: "Försvar: progressivt uppspel", description: "Bidra med fler linjebrytande passningar över säsongen.", groups: withAll(def) },
  { title: "Försvar: duellstyrka", description: "Öka vinstprocent i både mark- och luftdueller.", groups: withAll(def) },
  { title: "Försvar: relationer i linje", description: "Förbättra samarbete och avstånd i backlinjen.", groups: withAll(def) },
  { title: "Försvar: press & återerövring", description: "Sätta effektiv första press när läge uppstår.", groups: withAll(def) },
  { title: "Försvar: vändningsspel", description: "Snabbare och säkrare spelvändningar från backlinje.", groups: withAll(def) },
  { title: "Försvar: offensivt bidrag", description: "Kvalitativt understöd i anfall med timing och beslut.", groups: withAll(def) },
  { title: "Försvar: ledarskap", description: "Bli tydlig organisatör i defensiva fasta situationer.", groups: withAll(def) },

  { title: "Mittfält: kontrollera tempo", description: "Styra rytmen i matchen med boll och utan boll.", groups: withAll(mid) },
  { title: "Mittfält: progressiva aktioner", description: "Öka antal framåtbrytande passningar/drivningar.", groups: withAll(mid) },
  { title: "Mittfält: tredjemansspel", description: "Utveckla timing i kombinationer och spel mellan linjer.", groups: withAll(mid) },
  { title: "Mittfält: återerövring centralt", description: "Vinna tillbaka fler bollar centralt efter bolltapp.", groups: withAll(mid) },
  { title: "Mittfält: målpoängsproduktion", description: "Bidra med fler poänggivande aktioner över året.", groups: withAll(mid) },
  { title: "Mittfält: defensiv balans", description: "Skydda yta framför backlinje bättre i omställning.", groups: withAll(mid) },
  { title: "Mittfält: scanning-vanor", description: "Göra scanning till automatisk vana före mottag.", groups: withAll(mid) },
  { title: "Mittfält: ledarroll", description: "Bli nav för kommunikation och beslut i match.", groups: withAll(mid) },

  { title: "Anfall: avslutskvalitet", description: "Öka kvalitet och variation i avslut i box.", groups: withAll(fwd) },
  { title: "Anfall: löpningar bakom linje", description: "Skapa fler djupledshot med korrekt tajming.", groups: withAll(fwd) },
  { title: "Anfall: presspel", description: "Bli förstaförsvarare med hög effektivitet i återerövring.", groups: withAll(fwd) },
  { title: "Anfall: felvändt spel", description: "Utveckla felvända aktioner som skapar lagets nästa fas.", groups: withAll(fwd) },
  { title: "Anfall: inläggsspel", description: "Öka precision i inlöp och avslut på inlägg.", groups: withAll(fwd) },
  { title: "Anfall: 1v1-vapen", description: "Skapa och avgöra fler 1v1-situationer offensivt.", groups: withAll(fwd) },
  { title: "Anfall: beslut i sista tredjedel", description: "Välja bättre mellan skott, pass och dribbling.", groups: withAll(fwd) },
  { title: "Anfall: mentalt tålamod", description: "Behålla kvalitet även under perioder utan mål/poäng.", groups: withAll(fwd) },
];

