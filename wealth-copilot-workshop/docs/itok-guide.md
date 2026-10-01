# ITØK-guide: Hva går workshopen egentlig ut på?

## Kort sagt

Dette er **ikke** først og fremst en programmeringsoppgave. Det er en case-oppgave hvor dere
har fått et fungerende demo-produkt (Wealth Copilot), og skal jobbe som et team for å
**videreutvikle det som et produkt**.

Dere kan velge selv hvor teknisk dere vil gå:

- **Lite teknisk**: diskutere, tegne arkitektur, skrive ned beslutninger og begrunnelser
- **Middels teknisk**: endre tekster, tall, regler eller syntetiske data
- **Mer teknisk**: endre kode i frontend/API hvis noen i gruppa vil og kan

Alle nivåer er gyldige. Det viktigste er at dere kan **forklare og begrunne** valgene deres.

## Hva finnes i demoen fra før?

- **Kunder** med kontoer, transaksjoner og porteføljer (syntetiske data)
- **Portefølje-oversikt**: hva kunden eier, fordelt på aktivaklasser
- **Risikoscore**: en enkel, forklarbar modell (IKKE ekte finansiell rådgivning)
- **Innsikter**: automatisk genererte observasjoner om kundens økonomi
- **Wealth Copilot**: en enkel «chatbot» som svarer på spørsmål om kundens egen økonomi —
  i dag er den regelbasert (ikke en ekte AI/LLM)

Tallene og beregningene er laget for en pedagogisk demo. De er ikke ekte kundedata eller
finansiell rådgivning.

## Slik henger datamodellene sammen

API-et består av både rådata og beregnede modeller:

- En **kunde** kan ha én eller flere **kontoer**.
- En konto kan ha mange **transaksjoner**, for eksempel innbetalinger, uttak og overføringer.
- En **investeringsposisjon** er kundens beholdning i et instrument. Den har blant annet
  antall, kjøpspris og nåværende pris, og `account_id` viser hvilken investerings- eller
  pensjonskonto den tilhører. Kontoverdien beregnes ved å summere posisjonenes markedsverdi
  (antall × nåværende pris).
- Et **instrument** er selve produktet, for eksempel en aksje, ETF, et fond, en obligasjon
  eller kontanter. Det samme instrumentet kan eies av mange kunder.
- **Markedsdata** beskriver hvordan prisen på et instrument har utviklet seg over tid.
- API-et bruker disse dataene til å beregne en **porteføljeoversikt**, en illustrativ
  **risikoscore** og regelbaserte **innsikter**.

Se «Datamodeller i API-et» i `README.md` for feltene som inngår i hver modell.

## Hva skal dere egentlig gjøre?

Velg én av kundecasene i `docs/workshop.md`. Der finner dere oppgaven og fire korte
refleksjoner som hjelper dere med å se kundebehov, data, forklaring og nytte.

Du trenger ikke kode for å bidra. Du kan for eksempel:

- beskrive hvilket kundeproblem løsningen skal løse, og hvilken nytte den kan gi
- vurdere hvilke data som trengs, og om de er relevante og til å stole på
- drøfte hvordan kunden kan forstå forklaringen og eventuell usikkerhet
- skissere en brukerflyt eller en enkel dataflyt

Det er heller ikke nødvendig å koble på en ekte språkmodell. Dere kan diskutere hvor AI
eventuelt kan hjelpe, og hvordan risikoen for feilinformasjon eller uønskede investeringsråd
kan begrenses.

## Hvor finner jeg mer?

- `README.md` — hvordan kjøre appen og hvordan datamodellene henger sammen
- `docs/workshop.md` — kundecaser, refleksjoner, arbeidssteg og leveranser
- `prompts/` — ferdige prompts for å utforske/endre koden med GitHub Copilot CLI
