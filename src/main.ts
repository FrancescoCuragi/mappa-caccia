import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { T } from './it';
import { store, Luogo } from './store';

const CENTRO: [number, number] = [8.97, 44.56]; // Val Brevenna
const BBOX = { w: 8.88, s: 44.49, e: 9.07, n: 44.64 };
const TILE_URL = 'https://tile.opentopomap.org/{z}/{x}/{y}.png';
const base = import.meta.env.BASE_URL;

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

// ---------- Mappa ----------
const map = new maplibregl.Map({
  container: 'map',
  center: CENTRO,
  zoom: 13,
  maxZoom: 17,
  minZoom: 9,
  attributionControl: { compact: true },
  dragRotate: false,
  style: {
    version: 8,
    glyphs: new URL(`${base}fonts/{fontstack}/{range}.pbf`, location.href).href,
    sources: {
      topo: {
        type: 'raster', tiles: [TILE_URL], tileSize: 256, maxzoom: 17,
        attribution: '© OpenStreetMap, SRTM | © OpenTopoMap (CC-BY-SA)',
      },
    },
    layers: [{ id: 'topo', type: 'raster', source: 'topo' }],
  },
});
map.touchZoomRotate.disableRotation();

const geoloc = new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  showUserLocation: true,
});
map.addControl(geoloc);
map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

type Feat = GeoJSON.Feature<GeoJSON.LineString, { id: number; name: string; ref: string; tipo: string }>;
let tutti: Feat[] = [];
const vuoto: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
const FONT = ['Noto Sans Regular'];
const FONT_B = ['Noto Sans Medium'];

function ufficiale(p: { name?: string; ref?: string }) { return p.name || p.ref || ''; }

function datiLocali(): GeoJSON.FeatureCollection {
  const nomi = store.nomi();
  return {
    type: 'FeatureCollection',
    features: tutti.filter((f) => nomi[f.properties.id]).map((f) => ({
      type: 'Feature', geometry: f.geometry,
      properties: { id: f.properties.id, locale: nomi[f.properties.id].nome, ufficiale: ufficiale(f.properties) },
    })),
  };
}

function aggiornaLocali() {
  (map.getSource('locali') as maplibregl.GeoJSONSource | undefined)?.setData(datiLocali());
  const ids = Object.keys(store.nomi()).map(Number);
  if (map.getLayer('sentieri-etichetta')) {
    map.setFilter('sentieri-etichetta', ['all', ['!=', ['get', 'name'], ''], ['!', ['in', ['get', 'id'], ['literal', ids]]]]);
  }
  disegnaLuoghi();
}

map.on('load', async () => {
  const gj = await (await fetch(`${base}sentieri.geojson`)).json();
  tutti = gj.features;
  map.addSource('sentieri', { type: 'geojson', data: gj });
  map.addSource('locali', { type: 'geojson', data: vuoto });
  map.addSource('sel', { type: 'geojson', data: vuoto });

  const sentiero: maplibregl.ExpressionSpecification = ['in', ['get', 'tipo'], ['literal', ['path', 'footway', 'bridleway']]];
  map.addLayer({ id: 'sentieri-strada', type: 'line', source: 'sentieri', filter: ['!', sentiero],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#6b4b2a', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 16, 4] } });
  map.addLayer({ id: 'sentieri-sentiero', type: 'line', source: 'sentieri', filter: sentiero,
    layout: { 'line-cap': 'butt', 'line-join': 'round' },
    paint: { 'line-color': '#b3261e', 'line-dasharray': [2, 1.2], 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 16, 3.5] } });
  map.addLayer({ id: 'sel-alone', type: 'line', source: 'sel',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#ffe600', 'line-width': 14, 'line-opacity': 0.7 } });
  map.addLayer({ id: 'locali-bordo', type: 'line', source: 'locali',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 5, 16, 10] } });
  map.addLayer({ id: 'locali-linea', type: 'line', source: 'locali',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#0a5fd6', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 6] } });
  map.addLayer({ id: 'sentieri-etichetta', type: 'symbol', source: 'sentieri', minzoom: 14.5,
    filter: ['!=', ['get', 'name'], ''],
    layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 12, 'text-offset': [0, 0.9] },
    paint: { 'text-color': '#4a2a12', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } });
  // Nome dei locali: grande, sopra la linea. Nome ufficiale: piccolo, sotto.
  map.addLayer({ id: 'locali-etichetta', type: 'symbol', source: 'locali', minzoom: 11,
    layout: { 'symbol-placement': 'line', 'text-field': ['get', 'locale'], 'text-font': FONT_B,
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 13, 16, 19], 'text-offset': [0, -0.9],
      'symbol-spacing': 350, 'text-padding': 4, 'text-allow-overlap': true },
    paint: { 'text-color': '#0a3fa0', 'text-halo-color': '#fff', 'text-halo-width': 2.2 } });
  map.addLayer({ id: 'locali-ufficiale', type: 'symbol', source: 'locali', minzoom: 13.5,
    filter: ['!=', ['get', 'ufficiale'], ''],
    layout: { 'symbol-placement': 'line', 'text-field': ['get', 'ufficiale'], 'text-font': FONT,
      'text-size': 11, 'text-offset': [0, 1.0], 'symbol-spacing': 350 },
    paint: { 'text-color': '#555', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } });
  aggiornaLocali();
});

// ---------- Selezione sentiero ----------
function distSeg(p: [number, number], a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function piuVicino(punto: maplibregl.Point): Feat | null {
  const r = 18;
  const hit = map.queryRenderedFeatures(
    [[punto.x - r, punto.y - r], [punto.x + r, punto.y + r]],
    { layers: ['sentieri-strada', 'sentieri-sentiero'] },
  );
  let bestId = -1, bestD = Infinity;
  const visti = new Set<number>();
  for (const h of hit) {
    const id = h.properties!.id as number;
    if (visti.has(id)) continue;
    visti.add(id);
    // La geometria di un pezzo di tassello e' parziale: usiamo quella completa.
    const full = tutti.find((f) => f.properties.id === id);
    if (!full) continue;
    const pts = full.geometry.coordinates.map((c) => { const q = map.project(c as [number, number]); return [q.x, q.y] as [number, number]; });
    for (let i = 1; i < pts.length; i++) {
      const d = distSeg([punto.x, punto.y], pts[i - 1], pts[i]);
      if (d < bestD) { bestD = d; bestId = id; }
    }
  }
  return bestD <= r ? tutti.find((f) => f.properties.id === bestId) ?? null : null;
}

let modoLuogo = false;
map.on('click', (e) => {
  if (modoLuogo) {
    modoLuogo = false; nascondiAvviso();
    formLuogo({ id: crypto.randomUUID(), lat: e.lngLat.lat, lon: e.lngLat.lng, nome: '', nota: '' }, true);
    return;
  }
  const f = piuVicino(e.point);
  if (!f) { chiudiScheda(); avviso(T.nessunSentiero, 1800); return; }
  schedaSentiero(f);
});

function evidenzia(f: Feat | null) {
  (map.getSource('sel') as maplibregl.GeoJSONSource | undefined)?.setData(
    f ? { type: 'FeatureCollection', features: [f] } : vuoto);
}

// ---------- Scheda in basso ----------
const scheda = $('scheda');
function apriScheda(html: string) { scheda.innerHTML = html; scheda.hidden = false; }
function chiudiScheda() { scheda.hidden = true; scheda.innerHTML = ''; evidenzia(null); }
let timerAvviso: number | undefined;
function avviso(testo: string, ms = 0) {
  const a = $('avviso'); a.textContent = testo; a.hidden = false;
  clearTimeout(timerAvviso);
  if (ms) timerAvviso = window.setTimeout(nascondiAvviso, ms);
}
function nascondiAvviso() { $('avviso').hidden = true; }

function schedaSentiero(f: Feat) {
  evidenzia(f);
  const id = f.properties.id;
  const loc = store.nomeDi(id);
  const uff = ufficiale(f.properties);
  apriScheda(`
    <button class="x" data-a="chiudi" aria-label="${T.chiudi}">✕</button>
    ${loc ? `<div class="et">${T.nomeLocale}</div><h2 class="loc">${esc(loc)}</h2>` : ''}
    <div class="et">${T.nomeUfficiale}</div>
    <div class="uff">${uff ? esc(uff) : T.sentieroSenzaNome}</div>
    <input id="inp" type="text" enterkeyhint="done" autocomplete="off" autocapitalize="sentences"
      placeholder="${T.placeholderNome}" value="${esc(loc)}" />
    <div class="righe">
      <button class="grande primario" data-a="salva">${T.salva}</button>
      ${loc ? `<button class="grande pericolo" data-a="elimina">${T.elimina}</button>` : ''}
    </div>`);
  scheda.onclick = (ev) => {
    const a = (ev.target as HTMLElement).closest('button')?.dataset.a;
    if (!a) return;
    if (a === 'chiudi') chiudiScheda();
    if (a === 'salva') {
      const v = ($('inp') as HTMLInputElement).value.trim();
      if (!v) { ($('inp') as HTMLInputElement).focus(); return; }
      store.impostaNome(id, v); chiudiScheda(); avviso(T.salvato, 1200);
    }
    if (a === 'elimina' && confirm(T.confermaElimina)) { store.impostaNome(id, ''); chiudiScheda(); avviso(T.eliminato, 1200); }
  };
}

// ---------- Luoghi (segnaposto) ----------
let marcatori: maplibregl.Marker[] = [];
function disegnaLuoghi() {
  marcatori.forEach((m) => m.remove());
  marcatori = store.luoghi().map((l) => {
    const el = document.createElement('div');
    el.className = 'luogo';
    el.innerHTML = `<div class="pin">📌</div><div class="nome">${esc(l.nome)}</div>`;
    el.onclick = (ev) => { ev.stopPropagation(); formLuogo(l, false); };
    return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([l.lon, l.lat]).addTo(map);
  });
}

function formLuogo(l: Luogo, nuovo: boolean) {
  apriScheda(`
    <button class="x" data-a="chiudi" aria-label="${T.chiudi}">✕</button>
    <h2>${nuovo ? T.nuovoLuogo : T.modificaLuogo}</h2>
    <input id="inp" type="text" placeholder="${T.placeholderLuogo}" value="${esc(l.nome)}" autocomplete="off" />
    <input id="nota" type="text" placeholder="${T.nota}" value="${esc(l.nota)}" autocomplete="off" />
    <div class="righe">
      <button class="grande primario" data-a="salva">${T.salva}</button>
      ${nuovo ? '' : `<button class="grande pericolo" data-a="elimina">${T.elimina}</button>`}
    </div>`);
  scheda.onclick = (ev) => {
    const a = (ev.target as HTMLElement).closest('button')?.dataset.a;
    if (a === 'chiudi') chiudiScheda();
    if (a === 'salva') {
      const nome = ($('inp') as HTMLInputElement).value.trim();
      if (!nome) { ($('inp') as HTMLInputElement).focus(); return; }
      store.salvaLuogo({ ...l, nome, nota: ($('nota') as HTMLInputElement).value.trim() });
      chiudiScheda(); avviso(T.salvato, 1200);
    }
    if (a === 'elimina' && confirm(T.confermaElimina)) { store.eliminaLuogo(l.id); chiudiScheda(); avviso(T.eliminato, 1200); }
  };
}

// ---------- Elenco ----------
function boundsDi(f: Feat) {
  const b = new maplibregl.LngLatBounds();
  f.geometry.coordinates.forEach((c) => b.extend(c as [number, number]));
  return b;
}

function elenco() {
  const nomi = Object.entries(store.nomi()).sort((a, b) => a[1].nome.localeCompare(b[1].nome, 'it'));
  const luoghi = [...store.luoghi()].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  apriScheda(`
    <button class="x" data-a="chiudi" aria-label="${T.chiudi}">✕</button>
    <h2>${T.elencoTitolo}</h2>
    <div class="lista">
      ${nomi.length || luoghi.length ? '' : `<p class="vuoto">${T.elencoVuoto}</p>`}
      ${nomi.length ? `<div class="et">${T.sentieri}</div>` : ''}
      ${nomi.map(([id, n]) => {
        const f = tutti.find((x) => String(x.properties.id) === id);
        const u = f ? ufficiale(f.properties) : '';
        return `<button class="voce" data-s="${id}"><b>${esc(n.nome)}</b><small>${u ? esc(u) : T.sentieroSenzaNome}</small></button>`;
      }).join('')}
      ${luoghi.length ? `<div class="et">${T.luoghi}</div>` : ''}
      ${luoghi.map((l) => `<button class="voce" data-l="${l.id}"><b>📌 ${esc(l.nome)}</b><small>${esc(l.nota)}</small></button>`).join('')}
    </div>`);
  scheda.onclick = (ev) => {
    const btn = (ev.target as HTMLElement).closest('button');
    if (!btn) return;
    if (btn.dataset.a === 'chiudi') return chiudiScheda();
    if (btn.dataset.s) {
      const f = tutti.find((x) => String(x.properties.id) === btn.dataset.s);
      if (f) { map.fitBounds(boundsDi(f), { padding: { top: 100, bottom: 320, left: 40, right: 40 }, maxZoom: 16 }); schedaSentiero(f); }
    }
    if (btn.dataset.l) {
      const l = store.luoghi().find((x) => x.id === btn.dataset.l);
      if (l) { map.flyTo({ center: [l.lon, l.lat], zoom: 16 }); formLuogo(l, false); }
    }
  };
}

// ---------- Mappa offline ----------
function tileXY(lon: number, lat: number, z: number) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const rad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return [x, y];
}

async function scaricaMappa() {
  const urls: string[] = [];
  for (let z = 11; z <= 15; z++) {
    const [x0, y0] = tileXY(BBOX.w, BBOX.n, z), [x1, y1] = tileXY(BBOX.e, BBOX.s, z);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      urls.push(TILE_URL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)));
    }
  }
  let fatti = 0, errori = 0;
  const coda = [...urls];
  const worker = async () => {
    while (coda.length) {
      const u = coda.pop()!;
      try { const r = await fetch(u); if (!r.ok) errori++; } catch { errori++; }
      fatti++;
      avviso(`${T.scaricamento}… ${Math.round((fatti / urls.length) * 100)}%`);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  avviso(errori > urls.length * 0.05 ? T.scaricaErrore : T.scaricata, 5000);
}

// ---------- Menu ----------
function menu() {
  apriScheda(`
    <button class="x" data-a="chiudi" aria-label="${T.chiudi}">✕</button>
    <h2>${T.menu}</h2>
    <button class="grande" data-a="scarica">⬇️ ${T.scaricaMappa}</button>
    <button class="grande" data-a="esporta">📤 ${T.esporta}</button>
    <button class="grande" data-a="importa">📥 ${T.importa}</button>
    <input id="file" type="file" accept="application/json,.json" hidden />
    <p class="suggerimento">${T.suggerimento}</p>`);
  scheda.onclick = async (ev) => {
    const a = (ev.target as HTMLElement).closest('button')?.dataset.a;
    if (a === 'chiudi') chiudiScheda();
    if (a === 'scarica') { chiudiScheda(); scaricaMappa(); }
    if (a === 'esporta') {
      const blob = new Blob([store.esporta()], { type: 'application/json' });
      const file = new File([blob], 'nomi-mappa-caccia.json', { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file] }); } catch { /* annullato */ }
      } else {
        const l = document.createElement('a');
        l.href = URL.createObjectURL(blob); l.download = file.name; l.click();
      }
    }
    if (a === 'importa') $('file').click();
  };
  $('file').onchange = async (ev) => {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try { store.importa(await f.text()); chiudiScheda(); avviso(T.importato, 2000); }
    catch { avviso(T.importaErrore, 2500); }
  };
}

// ---------- Barra ----------
$('b-posizione').onclick = () => {
  if (!navigator.geolocation) return avviso(T.posizioneNonDisp, 3000);
  geoloc.trigger();
};
geoloc.on('error', () => avviso(T.posizioneNonDisp, 3500));
$('b-luogo').onclick = () => { chiudiScheda(); modoLuogo = true; avviso(T.tocca); };
$('b-elenco').onclick = () => { modoLuogo = false; nascondiAvviso(); elenco(); };
$('b-menu').onclick = () => { modoLuogo = false; nascondiAvviso(); menu(); };

store.onChange(aggiornaLocali);

// ---------- Offline (service worker) ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${base}sw.js`).catch(() => {}));
}
