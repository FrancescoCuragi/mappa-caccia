// Dati salvati sul telefono (localStorage). Nessun server.
export interface NomeSentiero { nome: string; ts: number }
export interface Luogo { id: string; lat: number; lon: number; nome: string; nota: string }
interface Dati { nomi: Record<string, NomeSentiero>; luoghi: Luogo[] }

const KEY = 'mappa-caccia-v1';

function carica(): Dati {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { nomi: {}, luoghi: [], ...JSON.parse(raw) };
  } catch { /* ignora */ }
  return { nomi: {}, luoghi: [] };
}

let dati = carica();
const ascoltatori: (() => void)[] = [];

function salva() {
  try { localStorage.setItem(KEY, JSON.stringify(dati)); } catch { /* spazio finito */ }
  ascoltatori.forEach((f) => f());
}

export const store = {
  onChange: (f: () => void) => ascoltatori.push(f),
  nomi: () => dati.nomi,
  luoghi: () => dati.luoghi,
  nomeDi: (id: number | string) => dati.nomi[String(id)]?.nome ?? '',
  impostaNome(id: number | string, nome: string) {
    nome = nome.trim();
    if (nome) dati.nomi[String(id)] = { nome, ts: Date.now() };
    else delete dati.nomi[String(id)];
    salva();
  },
  salvaLuogo(l: Luogo) {
    const i = dati.luoghi.findIndex((x) => x.id === l.id);
    if (i >= 0) dati.luoghi[i] = l; else dati.luoghi.push(l);
    salva();
  },
  eliminaLuogo(id: string) { dati.luoghi = dati.luoghi.filter((l) => l.id !== id); salva(); },
  esporta: () => JSON.stringify(dati, null, 1),
  importa(testo: string) {
    const d = JSON.parse(testo);
    if (typeof d !== 'object' || !d || typeof d.nomi !== 'object') throw new Error('formato');
    dati = { nomi: d.nomi, luoghi: Array.isArray(d.luoghi) ? d.luoghi : [] };
    salva();
  },
};

// Chiede a Safari di non cancellare i dati.
navigator.storage?.persist?.().catch(() => {});
