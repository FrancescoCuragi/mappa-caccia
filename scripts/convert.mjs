// Converte data/overpass.json (Overpass "out geom") in public/sentieri.geojson
import fs from 'node:fs';
const src = JSON.parse(fs.readFileSync('data/overpass.json', 'utf8'));
const r = (n) => Math.round(n * 1e5) / 1e5;
const features = src.elements
  .filter((e) => e.type === 'way' && e.geometry?.length > 1)
  .map((e) => ({
    type: 'Feature',
    id: e.id,
    properties: {
      id: e.id,
      name: e.tags.name || '',
      ref: e.tags.ref || '',
      tipo: e.tags.highway,
    },
    geometry: { type: 'LineString', coordinates: e.geometry.map((p) => [r(p.lon), r(p.lat)]) },
  }));
fs.writeFileSync('public/sentieri.geojson', JSON.stringify({ type: 'FeatureCollection', features }));
const named = features.filter((f) => f.properties.name || f.properties.ref).length;
console.log(`${features.length} sentieri (${named} con nome/ref)`);
