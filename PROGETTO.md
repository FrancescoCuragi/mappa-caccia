# Mappa Caccia – App iPhone per la squadra di caccia al cinghiale (Val Brevenna)

## Context

Your dad hunts boar with his team in Val Brevenna (Liguria). The team uses local nicknames for trails (e.g. "la Strada del Tasso") that differ from official/map names. He needs an **Italian-only iPhone app** with an interactive trail map where he can **attach the local name to any trail** and see it shown on top of the official name. Only he uses it, only on iPhone.

**Is it doable? Yes.** It's a small, well-scoped app. Main constraints:
- You're on **Windows**; iOS apps normally need a Mac/Xcode. This is solved with Expo + cloud builds (below).
- Hunting areas have **poor/no mobile signal**, so the map must work **offline**.
- Installing on a real iPhone outside the App Store needs an **Apple Developer account (~99 €/year)** for TestFlight (the simplest route). Free alternative exists but apps expire every 7 days (not suitable).

## Recommended approach

**Stack: React Native + Expo (TypeScript)** with **MapLibre** for the map. Develop on Windows, test instantly on his iPhone via Expo Go / dev build, build the real app in the cloud with **EAS Build**, distribute through **TestFlight** (no App Store review needed for personal use).

| Piece | Choice | Why |
|---|---|---|
| Framework | Expo (React Native) + TypeScript | Works from Windows, one codebase, easy iOS builds in cloud |
| Map | `@maplibre/maplibre-react-native` | Free, offline tiles, vector line layers, labels on lines |
| Base map | OpenStreetMap / OpenTopoMap tiles (curves, topographic) | Free; topographic is best for hunting terrain |
| Trail data | OSM via Overpass API (`highway=path/track/footway`) for Val Brevenna bbox, downloaded once and **bundled in the app as GeoJSON** | Free, no server needed; works offline |
| Local names storage | On-device (SQLite via `expo-sqlite`, or AsyncStorage) | Works offline; no backend |
| Backup/sharing | Export/import JSON file via iOS Share sheet (phase 2) | Lets him back up or send names to teammates |
| Language | All UI strings in Italian, in one `it.ts` file | He doesn't know English |
| Build/distribute | EAS Build → TestFlight | No Mac required |

## Core features (MVP, all in Italian)

1. **Mappa interattiva** – full-screen topographic map centred on Val Brevenna (approx. lat 44.55, lon 8.95), pinch/zoom/pan, "La mia posizione" GPS button (blue dot).
2. **Sentieri visibili** – all trails drawn as coloured lines; official name shown along the line at higher zoom.
3. **Tocca un sentiero → scheda** – bottom sheet with: official name (or "Sentiero senza nome"), local name if any, and button **"Aggiungi nome locale"** / **"Modifica"**.
4. **Nome locale sopra al nome ufficiale** – local name rendered on the map in bold/coloured label with the official name smaller underneath (e.g. **"Strada del Tasso"** / *Sentiero 12*). Trails with a local name are highlighted in a different colour so they stand out.
5. **Elenco nomi locali** – list screen: all custom names, tap to jump to that trail on the map; edit/delete.
6. **Funziona offline** – bundled trail data + downloadable offline map tiles for the valley (done once at home on Wi-Fi via "Scarica mappa offline").
7. **Interfaccia per uso all'aperto** – large buttons and text, high contrast, works with gloves/one hand, light/dark mode, big tap target for selecting a trail (tap tolerance ~20 px).

### Phase 2 (optional, after MVP)
- Esporta / importa nomi locali (backup + share with team via WhatsApp file).
- Shared names for the whole team (small backend, e.g. Supabase/Firebase) so everyone sees the same names.
- Posizione GPS in tempo reale dei compagni (needs backend – only if wanted).
- Add personal markers: "postazione" (stand/post), "avvistamento" (sighting).
- Split/rename only part of a trail (see open question below).

## Key technical details

- **Trail identity:** each OSM way has a stable `id` (e.g. `way/123456`). Local names are stored as `{ wayId, localName, updatedAt }`. Joined to the GeoJSON at render time, so the data file never changes.
- **Rendering names:** MapLibre `SymbolLayer` with `symbol-placement: line`, `text-field: ['coalesce', ['get','localName'], ['get','name']]`; a second layer for the official name in smaller text. Local-name features get a distinct `LineLayer` colour via a data-driven expression.
- **Selecting a trail:** `onPress` on the map → `queryRenderedFeaturesAtPoint` with a padded bounding box around the tap → pick the nearest trail.
- **Long OSM ways problem:** one OSM way can be a long path spanning several "local" trails. MVP: name applies to whole way. Phase 2: let him draw a cut point to split a way into segments stored locally.
- **Data prep (one-off script, `scripts/fetch-trails.ts`):** query Overpass for the bbox of Val Brevenna (Casella / Savignone / Busalla / Montoggio hills — confirm exact bbox with your dad), save as `assets/sentieri.geojson`.
- **Offline tiles:** MapLibre `OfflineManager.createPack` for the valley bbox at zoom 10–16; show progress in Italian ("Scaricamento… 45%").
- **Permissions strings** (Info.plist, Italian): "Questa app usa la tua posizione per mostrarti sulla mappa."

## Project structure (to be created in `e:\Visualstudio\AntoineMappaCaccia`)

```
app/                 # Expo Router screens
  index.tsx          # Mappa
  nomi.tsx           # Elenco nomi locali
  impostazioni.tsx   # Download offline, backup
src/
  components/        # MappaView, SchedaSentiero, EtichettaNome
  data/db.ts         # SQLite: nomi locali CRUD
  i18n/it.ts         # all Italian strings
assets/sentieri.geojson
scripts/fetch-trails.ts
app.json / eas.json
```

## Roadmap

1. **Setup** – Expo project, TypeScript, Italian strings, Expo Go test on his iPhone.
2. **Dati** – download Val Brevenna trails from OSM, bundle GeoJSON.
3. **Mappa** – MapLibre map + trail layers + GPS.
4. **Nomi locali** – tap trail → sheet → save name → label rendering + highlight.
5. **Elenco + modifica/elimina.**
6. **Offline** – tile download + test in airplane mode.
7. **Build & installazione** – Apple Developer account, `eas build`, TestFlight invite to his Apple ID.
8. **Test sul campo** with your dad, adjust sizes/colours; then Phase 2 items.

Rough effort: working MVP in a few focused sessions; the Apple account/TestFlight setup is the slowest step (account approval can take 1–2 days).

## Costs

- Apple Developer Program: ~99 €/year (required for TestFlight).
- Everything else (Expo, EAS free tier, OSM data, MapLibre): free. Tile hosting: free for personal use if you respect OSM tile policy / use OpenTopoMap with downloads limited to the valley.

## Open questions for you / your dad

1. Does a Mac exist anywhere? (Not required, but would simplify.)
2. Only your dad, or will teammates use it too (→ shared names backend)?
3. Do local names apply to whole trails, or often just to *parts* of a trail (→ splitting in MVP)?
4. Exact area boundaries of the hunting zone (to size the data and offline download).
5. Does he want to name only trails, or also places (e.g. "il Pianello") as pins?

## Verification

- Run in Expo Go / dev build on iPhone: map loads, trails visible, GPS dot works.
- Tap a trail → sheet appears → save "Strada del Tasso" → label appears above official name, trail changes colour; restart app → name persists.
- Enable airplane mode after offline download → map, trails and names still work.
- Confirm all screens, buttons, alerts and permission prompts are in Italian.
- Install via TestFlight on his iPhone and do a walk-through with him outdoors (sunlight readability, glove-sized buttons).

## Immediate next step (after plan approval)

Save this document as `e:\Visualstudio\AntoineMappaCaccia\PROGETTO.md` (the requested md file), then scaffold the Expo project and fetch the Val Brevenna trail data.

---

# VARIANTE GRATUITA (0 €): sito web installabile (PWA)

**Decisione:** niente App Store, niente Apple Developer (99 €). Si costruisce un **sito web** che sull'iPhone si installa dalla schermata Home come una vera app ("Aggiungi a Home" da Safari). Tutto gratis.

## Come funziona
- Il papà apre un link in **Safari** → Condividi → **"Aggiungi alla schermata Home"** → icona app a schermo intero, senza barra del browser.
- Interfaccia tutta in italiano.
- Funziona **offline** grazie a un service worker + mappa salvata in un file unico.

## Hosting gratuito (scegline uno)
| Servizio | Pro |
|---|---|
| **GitHub Pages** | Gratis, semplice, link tipo `tuonome.github.io/mappa-caccia` |
| **Cloudflare Pages** | Gratis, molto veloce, nessun limite di banda |
| **Netlify** | Gratis, trascini la cartella e va online |
Richiede solo un account gratuito (GitHub/Cloudflare/Netlify). Nessuna carta di credito.

## Stack
- **HTML + TypeScript/JavaScript** (niente framework pesante), **MapLibre GL JS** per la mappa.
- **Mappa offline:** file **PMTiles** (estratto di Protomaps/OSM della sola Val Brevenna, pochi decine di MB) ospitato sullo stesso sito. Evita di scaricare in massa i tile OSM (vietato dalle loro regole).
- **Sentieri:** GeoJSON da OpenStreetMap (Overpass) incluso nel sito.
- **Nomi locali:** salvati sul telefono (IndexedDB) + `navigator.storage.persist()`.
- **Backup:** pulsante "Esporta nomi" (file JSON) / "Importa nomi".
- **Posizione GPS:** Geolocation API di Safari (chiede il permesso la prima volta).

## Limiti da conoscere (iOS)
- Safari può cancellare i dati dei siti non usati per 7 giorni, **ma non per le app aggiunte alla Home**: quindi va sempre installata dalla Home.
- Niente GPS in background a schermo spento (ok per questo uso).
- Qualche rifinitura in meno rispetto a un'app nativa, ma per mappa + nomi è più che sufficiente.
- Se in futuro i compagni devono condividere i nomi: backend gratuito (Supabase/Firebase piano free).

## Piano di lavoro
1. Progetto web (Vite + MapLibre), testo tutto in `it.ts`.
2. Scarico sentieri OSM e creo il PMTiles della valle.
3. Mappa + sentieri + GPS.
4. Tocca sentiero → scheda → nome locale → etichetta sopra il nome ufficiale + colore evidenziato.
5. Elenco nomi, modifica/elimina, esporta/importa.
6. Service worker per l'offline.
7. Pubblico su GitHub Pages/Cloudflare e installo sull'iPhone del papà.

**Costo totale: 0 €.**

---

# STATO DEL LAVORO (v0.1)

Scelte confermate: solo il papà, nome su sentiero intero, luoghi con nome (segnaposto), zona = solo Val Brevenna (bbox `8.88,44.49 → 9.07,44.64`, modificabile in `src/main.ts` e `scripts/`).

Fatto: mappa topografica, 5.825 tracciati OSM, tocca-sentiero → nome dei locali (grande, blu, sopra) + nome ufficiale (piccolo, sotto), elenco nomi, luoghi con nota, GPS, salva/ripristina copia dei nomi, scarico mappa offline, service worker, icona, tutto in italiano.

## Come provarlo
```
npm install
npm run dev        # poi apri l'indirizzo "Network" dall'iPhone (stesso Wi-Fi)
npm run build      # crea la cartella dist/ da pubblicare
```
Nota: il GPS e l'installazione offline su iPhone richiedono **HTTPS**, quindi funzionano solo dopo la pubblicazione (punto sotto), non dall'indirizzo locale.

## Pubblicare gratis (GitHub Pages)
1. Crea un account GitHub gratuito e un repository nuovo (es. `mappa-caccia`).
2. Carica questa cartella (`git init`, `git add .`, `git commit`, `git remote add origin …`, `git push -u origin main`).
3. Su GitHub: Settings → Pages → Source: **GitHub Actions**. Il file `.github/workflows/deploy.yml` pubblica da solo.
4. Link finale: `https://TUONOME.github.io/mappa-caccia/`
5. Sull'iPhone del papà: apri il link in Safari → Condividi → **Aggiungi alla schermata Home** → aprilo da lì → Altro → **Scarica la mappa** (col Wi-Fi, una sola volta).

## Da fare / da verificare
- Prova sul campo con il papà (dimensioni, colori al sole).
- Aggiornare i sentieri OSM: rilanciare Overpass + `npm run dati`.
- Mappa offline: ora usa i tasselli OpenTopoMap (~1.800, scaricati una volta per un uso personale). Per un uso più intenso passare a un file PMTiles proprio.
