# Workshop-oppgave: Bygg Wealth Copilot

**Prøv demoen:** [Åpne frontend](https://espkar.github.io/wealth-copilot-workshop/#/) ·
[Åpne API-dokumentasjonen](https://wealth-copilot-api-8493.onrender.com/docs/#/)

## Utfordringen

I samarbeid med Private Banking ønsker Nordea å utvikle en Wealth Copilot som skal gjøre kundens
økonomi og investeringer enklere å forstå.

Ta utgangspunkt i demoen i dette repoet. Dere kan utforske API-et, skissere en løsning,
endre frontend eller syntetiske data og bruke instruksjonene i `/prompts` med GitHub Copilot
CLI, Claude Code eller lignende verktøy.

## Velg ett problemområde

Under er tre problemstillinger med kundecaser fra Private Banking. Velg ett spor og undersøk
hva kunden trenger å forstå, hvilke data som trengs, og hvordan løsningen kan hjelpe. Dere
trenger ikke bygge en full bankløsning. Bruk refleksjonene under som støtte, og legg mest vekt
på det som er relevant for caset dere velger.

### A. Forstå hvorfor porteføljen utvikler seg

**Problemstilling:** Hvordan kan Wealth Copilot forklare porteføljeutviklingen gjennom
forståelige analyser og personlige innsikter?

**Kundecase:** Anne (52) ser at porteføljen har steget med 7 % det siste halvåret, men ser
bare totalsummen. Hun vil forstå hvilke investeringer som har påvirket utviklingen mest,
om økningen skyldes markedet eller egne investeringsvalg, og om utviklingen er forventet
gitt risikoprofilen hennes. Forklaringen bør være enkel og unngå unødvendige fagbegreper.

**Begrensning i demoen:** Markedsdataene er syntetiske og dekker omtrent 90 dager. Den
historiske beregningen bruker dagens beholdninger gjennom hele perioden, så demoen kan ikke
forklare et faktisk halvårsresultat eller skille markedsbevegelser fra kundens kjøp og salg.
De 7 prosentene er en del av kundecaset, ikke et tall dere skal forvente å finne i demoen.

### B. Gjør investeringsrisiko synlig og forståelig

**Problemstilling:** Hvordan kan Wealth Copilot vise kundens investeringsrisiko på en måte
som er forståelig og relevant for kundens mål?

**Kundecase:** Jonas (36) oppfatter risikoprofilen sin som moderat, men porteføljen hans har
gradvis fått større eksponering mot teknologiaksjer og globale aksjefond. Når markedet faller,
blir han overrasket over svingningene. Han vil forstå hvor risikoen kommer fra, hvilke
investeringer som bidrar mest, og om porteføljen fortsatt samsvarer med målene hans.

**Begrensning i demoen:** Risikoscoren er en pedagogisk forenkling, ikke en reell
risikovurdering. API-et viser ikke hvor mye hver enkelt investering bidrar til risikoen, og
demoen inneholder ikke historikk over hvordan Jonas' portefølje gradvis har endret seg.

### C. Følg med på økonomiske mål

**Problemstilling:** Hvordan kan Wealth Copilot hjelpe kunder med å forstå om de ligger an
til å nå økonomiske mål, og hvilke faktorer som påvirker muligheten for å nå dem?

**Kundecase:** Maria (29) ønsker å bli økonomisk uavhengig innen ti år og sparer hver måned.
Hun vil forstå om sparebeløpet kan være tilstrekkelig, hvordan markedsutviklingen påvirker
målet, og om hun ligger foran eller bak planen.

**Begrensning i demoen:** Demoen har ikke registrert Marias økonomiske mål, og transaksjonene
dekker bare en kort periode. For å lage en prognose må dere foreslå manglende opplysninger og
gjøre antakelser om blant annet sparebeløp, tidshorisont og avkastning.

Alle tre problemområdene er like gyldige. Vær tydelige på hvilke data og beregninger demoen
allerede har, hva dere eventuelt må legge til, og hvilke antakelser forklaringen bygger på.
Prognoser må presenteres som usikre scenarioer, ikke som løfter eller garantier.

## Refleksjoner underveis

Bruk disse refleksjonene som støtte mens dere jobber med den valgte kundecasen. Dere trenger
ikke skrive egne svar på hvert punkt.

- **Kundebehov:** Hva prøver kunden å forstå, og hvordan skal løsningen hjelpe?
- **Data:** Hvilke data trengs? Hva finnes allerede i demoen, og hva mangler?
- **Forklaring og tillit:** Hvordan viser løsningen grunnlaget, antakelsene og eventuell
  usikkerhet på en forståelig måte?
- **Nytte og risiko:** Hvordan kan dere undersøke om løsningen er nyttig, også når data
  mangler, er utdaterte eller kan misforstås?

## Foreslåtte arbeidssteg

### 1. Forstå utgangspunktet

Kjør applikasjonen, bytt mellom de fiktive kundene og se på API-svarene bak Dashboard,
Portefølje, Innsikter og Wealth Copilot. Undersøk hvilke data som ligger bak visningene og
tallene, og hva demoen ikke kan svare på i det valgte problemområdet.

### 2. Avgrens kundeproblemet

Beskriv hva kunden prøver å forstå, hvilken informasjon kunden trenger, og hvordan dere kan
se om løsningen faktisk hjelper. Formuler gjerne hva kunden skal kunne forstå etter å ha
brukt funksjonen.

### 3. Finn dataene dere trenger

Finn ut hvilke data funksjonen trenger, hvor de kommer fra, og hva som eventuelt mangler.
Vurder også om dataene er oppdaterte og pålitelige. Hvis det hjelper gruppa, kan dere vise
dataflyten med en enkel skisse eller et diagram.

### 4. Lag en løsning

Lag enten en enkel kodeprototype med de eksisterende API- og UI-mønstrene, eller skisser
løsningen og brukeropplevelsen. Hold beregningene deterministiske og forklarbare. Dere
trenger ikke koble til en ekte språkmodell. Hvis dere foreslår et AI-lag, beskriv hva det kan
gjøre, hvilke data det bruker, og hvilke begrensninger det skal ha.

### 5. Evaluer løsningen

Test eller gå gjennom løsningen med vanlige tilfeller og minst ett tilfelle der data mangler,
er utdatert eller kan misforstås. Vurder både om løsningen håndterer usikkerhet og feil, og om
kunden forstår forklaringen den gir.

### 6. Utfordre løsningen med et nytt scenario (valgfritt)

Velg ett av scenarioene under og diskuter hvordan løsningen deres bør endres. Dere trenger
ikke bygge scenarioet. Ta det bare hvis dere har tid, som en ekstra stresstest av ideen.

- **Eksterne investeringer:** Kunden har investeringer hos en annen finansinstitusjon.
  Hvordan håndterer dere samtykke, ferskhet på data, kobling av instrumenter, bekreftelse av
  eierskap og manglende kostpris? Hva sier Copilot når eksterne data er ufullstendige?
- **Kjøp skal vises umiddelbart:** Kunden kjøper et aktiva og forventer at Wealth Copilot
  reflekterer endringen med en gang. Hvordan håndterer dere ventende versus oppgjorte
  posisjoner, prisens ferskhet og foreløpige verdier i grensesnittet?
- **Åpenhet om personopplysninger:** Kunden ber om å få vist nøyaktig hvilke
  personopplysninger som ble brukt til å lage en AI-innsikt. Hvordan viser dere dataopprinnelse
  og svarer på «Hvorfor ser jeg dette?»
- **Feil AI-innsikt:** AI-en gir kunden en feilaktig investeringsrelatert innsikt. Hvordan
  oppdager, forklarer og retter dere dette, og hvem bør varsles?

### 7. Designoppgave (valgfritt hvis dere har tid): gi appen en Nordea-inspirert stil

Gjør frontend mer visuelt lik en typisk nettbank, inspirert av en mørk og kraftig blåfarge,
ren nordisk stil og en tydelig topplinje/topptekst.

Ting å vurdere:

- Bytt fargepalett i frontend (bakgrunn, knapper, lenker, grafer) til blåtoner
- Legg til en enkel logo eller tekstlogo (for eksempel «Wealth Copilot») i toppteksten
- Vurder skrifttype, avrundede hjørner/kort-design og luftig layout, slik man ofte ser i
  nettbankapplikasjoner

Dette er en god oppgave for dem i gruppa som vil jobbe mer med frontend/UI enn med data og
arkitektur.

## Leveranser

- en kodeprototype eller skisse av én funksjon for den valgte kundecasen
- en kort forklaring av hvilke data funksjonen bruker, hva som mangler, og hvilke antakelser
  den bygger på
- en kort vurdering av forventet nytte for kunden, og hvordan dere ville undersøkt om
  løsningen hjelper
- én eller flere viktige risikoer dere har tatt hensyn til, for eksempel feil data,
  personvern eller at kunden kan misforstå resultatet
