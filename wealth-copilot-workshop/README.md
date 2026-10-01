# Bygg Wealth Copilot

Startpakke for en workshop om å designe og lage en moderne data- og AI-plattform for
kapital- og formuesforvaltning.

Repoet inneholder et fiktivt bankmiljø med:

- 100 syntetiske kunder
- kontoer, transaksjoner, investeringer og historiske markedsdata
- et TypeScript/Express REST API med beregnet portefølje, risiko og innsikt
- en React/Vite-frontend med visningene Dashboard, Portefølje, Innsikter og Wealth Copilot
- deterministiske og forklarbare Copilot-svar uten behov for ekstern AI-nøkkel
- workshopoppgave og deltakerveiledning
- utrulling av frontend til GitHub Pages og en Render-konfigurasjon for API-et

**Alle data er syntetiske og fiktive. Dette er en pedagogisk demo, ikke et bank- eller
investeringsprodukt.**

## Kom raskt i gang

Krav: Node.js 18 eller nyere.

```bash
npm install
npm run generate-data
npm run dev
```

Frontend kjører på `http://localhost:5173`, og API-et kjører på `http://localhost:3000`.

Frontend leser API-adressen fra `VITE_API_URL`. Hvis variabelen ikke er satt, brukes
`http://localhost:3000`.

For å kjøre arbeidsområdene separat:

```bash
npm run dev:api
npm run dev:frontend
```

## Nyttige kommandoer

```bash
npm run generate-data  # Lag alle syntetiske JSON-datasett på nytt med en seedet generator
npm run build          # Bygg API-et og frontendens produksjonsfiler
npm test               # Kjør tester for API og frontend
npm run lint           # Typesjekk begge arbeidsområdene
```

## Prosjektstruktur

```text
api/
  src/
    routes/             REST-endepunkter
    services/           logikk for portefølje, risiko, innsikt og Copilot
    data.ts             lasting av JSON-data og indekser
data/
  generate.mjs          reproduserbar generator for syntetiske data
  *.json                genererte datasett for workshopen
frontend/
  src/
    api/                typesikker API-klient og kontrakter
    components/         layout, diagrammer og gjenbrukbare kort
    pages/              dashboard, portefølje, innsikter og Copilot
docs/
  workshop.md           kundecaser, refleksjoner, arbeidssteg og leveranser
  itok-guide.md         ikke-teknisk guide til hva workshopen forventer
prompts/
  *.md                  eksempler på GitHub Copilot CLI-prompter
.github/workflows/
  deploy-frontend.yml   utrulling til GitHub Pages
render.yaml             valgfri konfigurasjon for utrulling av API-et
```

## API-endepunkter

API-et tilbyr:

```text
GET  /health
GET  /instruments
GET  /holdings
GET  /customers
GET  /customers/:customerId
GET  /customers/:customerId/accounts
GET  /customers/:customerId/transactions
GET  /customers/:customerId/investments
GET  /customers/:customerId/portfolio
GET  /customers/:customerId/performance
GET  /customers/:customerId/risk
GET  /customers/:customerId/insights
POST /customers/:customerId/copilot
```

Copilot-endepunktet tar imot `{ "message": "Hvordan har porteføljen min utviklet seg?" }`.
Det bruker deterministisk intensjonsgjenkjenning og beregninger i dag. Tjenestegrensesnittet
er bevisst isolert slik at en senere workshopoppgave kan legge til en LLM eller et
gjenfinningslag uten å endre frontend-kontrakten.

## Datamodeller i API-et

API-et skiller mellom rådata, referansedata og beregnede visninger:

| Modell             | Betydning                                                                                                                                                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Customer`         | Én fiktiv kunde med grunnleggende profil, land, risikoprofil, investeringshorisont, inntekt og kundeforholdets startdato.                                                                                                                                            |
| `Account`          | En konto kunden har, for eksempel brukskonto, sparekonto, investeringskonto eller pensjonskonto. Saldoen på investerings- og pensjonskontoer beregnes fra markedsverdien av posisjonene som tilhører kontoen.                                                        |
| `Transaction`      | En bevegelse på en konto, med dato, type, kategori, beskrivelse, beløp og valuta. Transaksjoner er kontodata og er ikke det samme som investeringer.                                                                                                                 |
| `Investment`       | Kundens konkrete posisjon i et instrument. `account_id` viser hvilken konto posisjonen tilhører. Posisjonen inneholder blant annet antall, kjøpspris, nåværende pris, aktivaklasse, sektor og geografi. Én kunde kan ha flere `Investment`-rader i samme instrument. |
| `Instrument`       | Referanseinformasjon om selve investeringsproduktet, for eksempel et aksjesymbol, fond, ETF, obligasjon eller kontantinstrument. Her finnes én rad per unikt ticker-symbol, uavhengig av hvor mange kunder som eier det.                                             |
| `MarketDataPoint`  | Historisk markedsinformasjon for et instrument på en bestemt dato, blant annet pris og dagsavkastning. Brukes til å beregne den illustrative historiske utviklingen.                                                                                                 |
| `HoldingSummary`   | En beregnet og mer visningsvennlig versjon av en investering, med konto-ID, markedsverdi, urealisert gevinst/tap og andel av porteføljen.                                                                                                                            |
| `PortfolioSummary` | Samlet beregning for én kunde: totalverdi, kontantandel, gevinst/tap, fordeling på aktivaklasse, geografi og sektor, samt største beholdninger.                                                                                                                      |
| `RiskSummary`      | En pedagogisk risikoberegning basert på porteføljens egenskaper. Den er ikke en ekte egnethetsvurdering eller investeringsanbefaling.                                                                                                                                |
| `InsightsSummary`  | Regelbaserte observasjoner som er utledet fra kundens kontoer, transaksjoner og portefølje.                                                                                                                                                                          |

Det er derfor normalt at `/instruments` har langt færre rader enn `/holdings`:
`/instruments` viser unike produkter i hele datasettet, mens `/holdings` viser hver kundes
posisjon. Det samme instrumentet kan dermed opptre mange ganger i `/holdings`, én gang for
hver kunde som eier det.

Saldoene på `Investment Account` og `Pension` beregnes ved å summere markedsverdien
(`quantity × current_price`) til posisjonene som har den aktuelle kontoens `account_id`.
Dashboardets «Net worth» summerer saldoene på alle kontoer; kontantkontoer bruker egne
syntetiske saldoer, mens investerings- og pensjonskontoer bygger på posisjonene. Dette er
fortsatt en forenklet demoformue uten gjeld, ikke en fullstendig beregning av nettoformue.

### API-dokumentasjon (Swagger UI)

Interaktiv API-dokumentasjon er tilgjengelig når API-et kjører:

```text
http://localhost:3000/docs         Swagger UI
http://localhost:3000/openapi.json OpenAPI 3.0-dokument
```

Spesifikasjonen ligger i `api/src/openapi.yaml` og leveres av `swagger-ui-express`. Den
dokumenterer alle endepunkter, skjemaene for forespørsler og svar, samt at risikoscoren er
en pedagogisk demomodell og ikke ekte investeringsråd. Hold den oppdatert når endepunkter
legges til eller endres. `prompts/02-add-api-endpoint.md` minner om dette.

## Distribuere frontend

Workflowen i `.github/workflows/deploy-frontend.yml` bygger og publiserer `frontend/dist`
til GitHub Pages. Konfigurer Pages-kilden i repoet som **GitHub Actions**.

Sett `VITE_API_URL` som en repository-variabel, eller rediger miljøet i workflowen slik at
det peker på det distribuerte API-et. Ikke legg hemmeligheter i frontend-bygget.

## Distribuere API-et

API-et kan ikke distribueres til GitHub Pages fordi GitHub Pages bare leverer statiske filer.
`render.yaml` inneholder en enkel Render-konfigurasjon for en webtjeneste:

```bash
npm install
npm run generate-data
npm run build
node api/dist/index.js
```

Etter at API-et er distribuert, setter du frontendens `VITE_API_URL` til den offentlige
HTTPS-adressen og distribuerer frontend på nytt.

## Bevisste forenklinger i workshopen

- JSON-filer lastes i minnet i stedet for å bruke en database.
- Risikoscoren er illustrativ og er ikke en egnethetsvurdering.
- Historisk utvikling antar at dagens antall har eksistert gjennom hele perioden.
- Copilot-svarene er deterministiske og kaller ikke en ekstern modell.
- Autentisering, tilgangsstyring, samtykkehåndtering og observability på produksjonsnivå er
  dokumenterte designtemaer, men er ikke implementert her.
