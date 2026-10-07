/*
 * OSInt Graph - esplorazione grafica di dati OSINT per casi investigativi
 * Copyright (C) 2025-2026 Andrea Cumini <andrea@osintinfo.net> - www.osintinfo.net
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option)
 * any later version, with the additional terms in the file NOTICE.
 * See the files LICENSE and NOTICE for details. Distributed WITHOUT ANY WARRANTY.
 */
/* ================= HELPERS DOM ================= */
const $ = s => document.querySelector(s);
const on = (sel, evt, fn) => {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (el) el.addEventListener(evt, fn);
};

/* ================= ONTOLOGIA ICONE & COLORI ================= */
const BRAND = {
  instagram: 'E4405F', snapchat: 'FFC400', facebook: '0866FF', google: '4285F4',
  discord: '5865F2', apple: '333333', amazon: 'FF9900', x: '111111', tiktok: '111111',
  threads: '111111', linkedin: '0A66C2', github: '111111', vk: '0077FF', airbnb: 'FF5A5F',
  zynga: 'D6291E', yahoo: '8A2FF2', microsoft: '00A4EF', telegram: '26A5E4',
  whatsapp: '25D366', spotify: '1DB954',
  // messaggistica e servizi aggiuntivi (se il CDN non ha l'icona resta il badge)
  viber: '7360F2', signal: '3A76F0', skype: '00AFF0', line: '00C300',
  wechat: '07C160', youtube: 'FF0000', botim: '00A5E3', imo: '15C0F5',
  zangi: 'E9401A', tango: 'FF4B4B', icq: '21A9F1', threema: '3FE669',
  kakaotalk: 'FFCD00'
};

// NB: il rosso (#dc2626) è RISERVATO al bordo dei "dati di partenza" (seed).
// Nessun colore-tipo deve avvicinarcisi, o si confonderebbe con quel bordo.
const TYPE_COLOR = {
  target: '#d97706', account: '#2563eb', phone: '#059669', email: '#db2777',
  username: '#7c3aed', domain: '#ea580c', breach: '#9333ea', generic: '#4b5563',
  vehicle: '#b45309', latin: '#0891b2', photo: '#0d9488', link: '#0284c7',
  text: '#65a30d', name: '#c026d3', place: '#4f46e5'
};
Object.entries(window.ONTOLOGY || {}).forEach(([k, v]) => { TYPE_COLOR[k] = v.color; });

/* ================= APERTURA PROFILI SOCIAL (Alt+Click) ================= */
/* Piattaforme conosciute -> come costruire l'URL del profilo dall'handle. */
const SOCIAL_URL = {
  instagram: h => `https://www.instagram.com/${h}/`,
  tiktok:    h => `https://www.tiktok.com/@${h}`,
  facebook:  h => `https://www.facebook.com/${h}`,
  x:         h => `https://x.com/${h}`,
  twitter:   h => `https://x.com/${h}`,
  threads:   h => `https://www.threads.net/@${h}`,
  telegram:  h => `https://t.me/${h}`,
  // VK: il profilo è vk.com/id<numero>; un numero puro va prefissato con "id"
  vk:        h => `https://vk.com/${/^\d+$/.test(h) ? 'id' + h : h}`,
  snapchat:  h => `https://www.snapchat.com/add/${h}`,
  linkedin:  h => `https://www.linkedin.com/in/${h}`,
  github:    h => `https://github.com/${h}`,
  youtube:   h => /^UC[A-Za-z0-9_-]{20,}$/.test(h)
                    ? `https://www.youtube.com/channel/${h}`   // ID canale (case-sensitive)
                    : `https://www.youtube.com/@${h}`,          // handle personalizzato
  spotify:   h => `https://open.spotify.com/user/${h}`,
  pinterest: h => `https://www.pinterest.com/${h}/`,
  reddit:    h => `https://www.reddit.com/user/${h}`,
  whatsapp:  h => `https://wa.me/${h.replace(/\D/g, '')}`,
  vkontakte: h => `https://vk.com/${/^\d+$/.test(h) ? 'id' + h : h}`
};

/* ---- Riconoscimento di un URL social: host -> piattaforma, path -> handle ---- */
const SOCIAL_HOSTS = {
  'instagram.com': 'instagram', 'tiktok.com': 'tiktok',
  'facebook.com': 'facebook', 'fb.com': 'facebook', 'fb.me': 'facebook',
  'x.com': 'x', 'twitter.com': 'x',
  'threads.net': 'threads', 'threads.com': 'threads',
  't.me': 'telegram', 'telegram.me': 'telegram', 'telegram.org': 'telegram',
  'vk.com': 'vk', 'vk.ru': 'vk', 'vkontakte.ru': 'vk', 'vk.cc': 'vk',
  'snapchat.com': 'snapchat', 'linkedin.com': 'linkedin', 'github.com': 'github',
  'youtube.com': 'youtube', 'youtu.be': 'youtube',
  'spotify.com': 'spotify', 'pinterest.com': 'pinterest',
  'reddit.com': 'reddit', 'wa.me': 'whatsapp', 'whatsapp.com': 'whatsapp'
};

/* Da un URL di profilo ricava {platform, handle}. null se non riconosciuto. */
function parseSocialUrl(raw) {
  let u;
  try {
    u = new URL(String(raw).trim().replace(/^(?!https?:\/\/)/i, 'https://'));
  } catch (_) { return null; }
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile|open|api)\./, '');
  const platform = SOCIAL_HOSTS[host];
  if (!platform) return null;

  const segs = u.pathname.split('/').filter(Boolean).map(s => decodeURIComponent(s));
  const strip = s => String(s || '').replace(/^@+/, '').trim();
  let h = '';

  if (platform === 'facebook' && /profile\.php$/i.test(u.pathname)) {
    h = u.searchParams.get('id') || '';
  } else if (platform === 'youtube') {
    if (segs[0] === 'channel' || segs[0] === 'c' || segs[0] === 'user') h = segs[1] || '';
    else h = strip(segs[0]);
  } else if (platform === 'snapchat') {
    h = segs[0] === 'add' ? (segs[1] || '') : strip(segs[0]);
  } else if (platform === 'linkedin') {
    h = (segs[0] === 'in' || segs[0] === 'company') ? (segs[1] || '') : strip(segs[0]);
  } else if (platform === 'reddit') {
    h = (segs[0] === 'user' || segs[0] === 'u') ? (segs[1] || '') : strip(segs[0]);
  } else if (platform === 'spotify') {
    h = segs[0] === 'user' ? (segs[1] || '') : strip(segs[0]);
  } else if (platform === 'whatsapp') {
    h = (u.searchParams.get('phone') || segs[0] || '').replace(/\D/g, '');
  } else {
    h = strip(segs[0]);                       // instagram, tiktok, x, vk, telegram...
  }
  h = strip(h).replace(/\/+$/, '');
  return h ? { platform, handle: h } : null;
}

/* Piattaforme in cui un handle "generico" non è affidabile: un username preso
   da una scheda qualsiasi non è detto sia il nome del profilo su quel social.
   VK: sono validi solo gli identificativi id<numero> (o il numero puro). */
const HANDLE_STRICT = {
  vk: h => /^(id)?\d+$/i.test(h)
};

/* Estrattori per id "sporchi": alcuni nodi hanno come identificativo un testo
   descrittivo del dossier o un id con separatore diverso. */
const HANDLE_EXTRACT = {
  whatsapp: s => { const d = String(s).replace(/\D/g, ''); return d.length >= 8 ? d : ''; },
  telegram: s => { const m = String(s).match(/\b(\d{6,})\b/); return m ? m[1] : ''; },
  facebook: s => {
    const m = String(s).match(/profile\.php\?id=(\d{5,})/i) || String(s).match(/\b(\d{8,})\b/);
    return m ? m[1] : '';
  },
  instagram: s => { const m = String(s).match(/\b(\d{8,})\b/); return m ? m[1] : ''; },
  vk: s => { const m = String(s).match(/\bid(\d+)\b/i) || String(s).match(/\b(\d{6,})\b/);
             return m ? 'id' + m[1] : ''; }
};

/* Handle ricavato dalle schede del nodo: campi username/screen_name o un URL
   del profilo presente nei dati. Serve ai nodi il cui id è un hash opaco.
   Un URL della piattaforma è sempre attendibile; un campo username generico
   viene accettato solo se supera l'eventuale controllo stretto. */
function handleFromRecords(d) {
  const HANDLE = /^[A-Za-z0-9._-]{2,}$/;
  const strict = HANDLE_STRICT[d.platform];
  for (const r of (d.records || [])) {
    let rows = [];
    try { rows = flatten(r.raw); } catch (_) { continue; }
    for (const [k, v] of rows) {
      const s = String(v || '').trim();
      if (/^https?:\/\//i.test(s)) {                    // un URL nei dati
        const p = parseSocialUrl(s);
        if (p && p.platform === d.platform && p.handle) return p.handle;
      }
      if (/(^|\.)(usernames?|screen_?name|nickname|login|handle|slug)$/i.test(k)) {
        const c = s.replace(/^@+/, '').split(/[,;\s]+/)[0];
        if (HANDLE.test(c) && (!strict || strict(c))) return c;
      }
    }
  }
  return '';
}

/* Handle da usare nell'URL: si prova il valore dell'id (acct:svc:VALORE), poi
   l'etichetta, poi gli alias; si preferisce un handle testuale a uno numerico. */
function socialHandle(d) {
  const HANDLE = /^[A-Za-z0-9._-]{2,}$/;
  const parts = String(d.id || '').split(':');
  const idVal = parts.length >= 3 ? parts.slice(2).join(':') : '';
  const raw = [idVal, d.label, ...(d.aliases || [])]
    .map(c => String(c || '').trim()).filter(Boolean);
  const labels = [d.label, ...(d.aliases || [])]
    .map(c => String(c || '').trim().replace(/^@+/, ''))
    .filter(c => HANDLE.test(c));
  // 1) etichetta che è lo stesso handle dell'id ma con la capitalizzazione giusta
  if (idVal) {
    const m = labels.find(c => c.toLowerCase() === idVal.toLowerCase());
    if (m) return m;
  }
  // 2) l'id canonico, se testuale (non un id numerico opaco)
  if (idVal && HANDLE.test(idVal) && !/^\d+$/.test(idVal)) return idVal;
  // 3) un'etichetta testuale non numerica
  const nonNum = labels.find(c => !/^\d+$/.test(c));
  if (nonNum) return nonNum;
  // 4) ripiego: id numerico (facebook/vk lo accettano) o prima etichetta
  const fallback = (idVal && HANDLE.test(idVal) ? idVal : '') || labels[0] || '';
  if (fallback) return fallback;
  // 5) estrattore specifico della piattaforma: recupera l'identificativo anche
  //    da id "sporchi" (acct:whatsapp-39..., profile.php?id=..., testo libero)
  const ex = HANDLE_EXTRACT[d.platform];
  if (ex) { for (const s of raw) { const h = ex(s); if (h) return h; } }
  // 6) ultima risorsa: cercare un username o un URL dentro le schede
  return handleFromRecords(d);
}

/* Apre un URL in una NUOVA SCHEDA IN BACKGROUND, senza spostare il focus dal
   grafo. window.open apre in primo piano: si simula invece un Ctrl+Click (Cmd su
   Mac) su un link target=_blank, che i browser aprono in secondo piano. */
/* Apre il profilo in una FINESTRA SEPARATA invece che in una scheda.
   Motivo: una scheda nuova copre il grafo e Chrome, se decide di attivarla, non
   può essere contraddetto via JS. Una finestra distinta lascia invece la
   finestra del grafo dov'è, sempre visibile; poi si prova a ridarle il focus.
   La finestra si apre affiancata (metà destra dello schermo) e viene riusata. */
function openSocialWindow(url) {
  const sw = window.screen.availWidth || 1280;
  const sh = window.screen.availHeight || 800;
  const w = Math.max(720, Math.floor(sw * 0.46));
  const h = Math.max(600, sh - 80);
  const left = sw - w;                       // affiancata a destra
  const feats = `popup=yes,width=${w},height=${h},left=${left},top=20,` +
                'menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes';
  let win = null;
  try {
    // niente 'noopener': serve l'handle per provare a togliere il focus
    win = window.open(url, 'social_profile', feats);
  } catch (_) { win = null; }
  if (!win) return false;                    // bloccata dal popup-blocker
  // riporta subito il focus al grafo (più tentativi: Chrome a volte lo ignora)
  const refocus = () => { try { win.blur(); } catch (_) {} try { window.focus(); } catch (_) {} };
  refocus();
  setTimeout(refocus, 0);
  setTimeout(refocus, 120);
  return true;
}

/* Apertura in scheda di sfondo (Ctrl/Cmd+Click simulato). Usata solo se
   l'utente sceglie la modalità "scheda". */
function openBackgroundTab(url) {
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.style.position = 'fixed';
  a.style.left = '-9999px';
  document.body.appendChild(a);
  a.dispatchEvent(new MouseEvent('click', {
    bubbles: true, cancelable: true, view: window,
    button: 0, ctrlKey: !isMac, metaKey: isMac, shiftKey: false, altKey: false
  }));
  a.remove();
}

/* Copia negli appunti: ripiego sempre disponibile, non sposta mai il focus. */
function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  try {
    const t = document.createElement('textarea');
    t.value = text;
    t.style.position = 'fixed';
    t.style.left = '-9999px';
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    t.remove();
    return true;
  } catch (_) { return false; }
}

/* Modalità di apertura scelta dall'utente (ricordata nel browser):
   'window' = finestra affiancata (default: il grafo resta sempre visibile)
   'tab'    = scheda di sfondo
   'copy'   = copia solo il link */
let openMode = (() => {
  try { return localStorage.getItem('socialOpenMode') || 'window'; } catch (_) { return 'window'; }
})();
function setOpenMode(m) {
  openMode = m;
  try { localStorage.setItem('socialOpenMode', m); } catch (_) {}
}

/* Apre il profilo social del nodo secondo la modalità scelta. */
function openSocial(node) {
  const d = node.data();
  // un nodo con URL proprio (link generico aggiunto a mano) si apre direttamente
  let url = /^https?:\/\//i.test(d.url || '') ? d.url : '';
  if (!url && d.ntype === 'place') {         // luogo senza link: ricerca su Google Maps
    const q = d.lat && d.lon ? `${d.lat},${d.lon}`
            : String(d.label || '').split(/\s+[—–]\s+/).reverse().join(', ');
    if (q) url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  }
  if (!url) {
    const make = SOCIAL_URL[d.platform];
    if (!make) return { ok: false, reason: 'non-social' };
    const h = socialHandle(d);
    if (!h) return { ok: false, reason: 'no-handle' };
    url = make(h);
  }

  if (openMode === 'copy') {
    return { ok: true, url, mode: 'copy', copied: copyToClipboard(url) };
  }
  if (openMode === 'tab') {
    openBackgroundTab(url);
    return { ok: true, url, mode: 'tab' };
  }
  const opened = openSocialWindow(url);      // 'window' (default)
  if (!opened) {                             // popup bloccato: ripiega su scheda
    openBackgroundTab(url);
    return { ok: true, url, mode: 'tab-fallback' };
  }
  return { ok: true, url, mode: 'window' };
}

const IDENT_TYPES = ['phone', 'email', 'username', 'vehicle'];

/* ================= CATEGORIE (filtri mostra/nascondi) =================
   Ogni nodo appartiene a UNA categoria (prima corrispondenza).
   L'ultima ('altro') fa da rete: cattura tutto il resto. */
/* L'etichetta è una chiave di traduzione: si risolve al momento del disegno. */
const CATEGORIES = [
  { key: 'target',   color: TYPE_COLOR.target,   match: n => n.ntype === 'target' },
  { key: 'social',   color: TYPE_COLOR.account,  match: n => n.ntype === 'account' },
  { key: 'phone',    color: TYPE_COLOR.phone,    match: n => n.ntype === 'phone' },
  { key: 'email',    color: TYPE_COLOR.email,    match: n => n.ntype === 'email' },
  { key: 'username', color: TYPE_COLOR.username, match: n => n.ntype === 'username' },
  { key: 'veicoli',  color: TYPE_COLOR.vehicle,  match: n => n.ntype === 'vehicle' },
  { key: 'link',     color: TYPE_COLOR.link,     match: n => n.ntype === 'link' },
  { key: 'text',     color: TYPE_COLOR.text,     match: n => n.ntype === 'text' },
  { key: 'name',     color: TYPE_COLOR.name,     match: n => n.ntype === 'name' },
  { key: 'place',    color: TYPE_COLOR.place,    match: n => n.ntype === 'place' },
  { key: 'domini',   color: TYPE_COLOR.domain,   match: n => n.ntype === 'domain' },
  { key: 'breach',   color: TYPE_COLOR.breach,   match: n => n.ntype === 'breach' },
  { key: 'foto',     color: TYPE_COLOR.photo,    match: n => n.ntype === 'photo' },
  { key: 'translit', color: TYPE_COLOR.latin,    match: n => n.ntype === 'latin' },
  // una categoria per gruppo di elementi investigativi (armi, stupefacenti...)
  ...[...new Set(Object.values(window.ONTOLOGY || {}).sort((a, b) => a.order - b.order)
        .map(o => o.group))].map(g => ({
    key: 'onto_' + g, group: g,
    color: (Object.values(window.ONTOLOGY).find(o => o.group === g) || {}).color || TYPE_COLOR.generic,
    match: n => (window.ONTOLOGY[n.ntype] || {}).group === g
  })),
  { key: 'altro',    color: TYPE_COLOR.generic,  match: () => true }
];
/* Testi dei tipi investigativi nella lingua scelta (ontology_i18n.py). Il
   valore salvato resta quello italiano: si traduce solo cio' che si mostra. */
const ot = s => (LANG === 'it' || !s) ? s : ((((window.ONTO_I18N || {})[LANG]) || {})[s] || s);
const ONTO_GROUP_IT = { Soggetti: 'Organizzazioni', Fatti: 'Eventi / reati', Beni: 'Immobili' };
const catLabel = key => key.startsWith('onto_')
  ? ot(ONTO_GROUP_IT[key.slice(5)] || key.slice(5))
  : t('cat.' + key);
const CAT_BY_KEY = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));
const categoryOf = n => (CATEGORIES.find(c => c.match(n)) || CAT_BY_KEY.altro).key;

/* Tutte le icone sono SVG 64x64 con viewBox esplicito:
   senza dimensioni intrinseche il canvas di Cytoscape ancora l'immagine
   in alto a sinistra invece di centrarla (bug icone social in zoom out). */
const wrapSvg = inner =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">' + inner + '</svg>'
  );

const strokeSvg = i => wrapSvg(
  '<g fill="none" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + i + '</g>'
);

/* Icone Font Awesome Free (static/vendor/fa, inserite nella pagina da app.py).
   L'SVG originale ha un viewBox rettangolare: lo si rende quadrato e con un
   margine, cosi' l'icona resta centrata e della stessa grandezza nel cerchio. */
const _faCache = {};
function faIcon(name, color = '#1e293b') {
  const k = name + color;
  if (_faCache[k]) return _faCache[k];
  const src = (window.FA_ICONS || {})[name] || (window.FA_ICONS || {})['circle-question'];
  if (!src) return null;
  const vb = (src.match(/viewBox="([^"]+)"/) || [, '0 0 512 512'])[1].split(/\s+/).map(Number);
  const w = vb[2], h = vb[3], S = Math.max(w, h), pad = S * 0.14;
  const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" ` +
    `viewBox="${vb[0] - (S - w) / 2 - pad} ${vb[1] - (S - h) / 2 - pad} ${S + 2 * pad} ${S + 2 * pad}">` +
    `<g fill="${color}">${inner}</g></svg>`;
  return (_faCache[k] = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg));
}

// icona per tipo di nodo (persona, telefono, email...): tabella di ontology.py
const SVG = Object.fromEntries(Object.entries(window.BASE_ICONS || {}).map(([k, v]) => [k, faIcon(v)]));
SVG.generic = SVG.generic || faIcon('circle-question');

// Badge con iniziale: usato subito per le piattaforme, poi sostituito
// dall'icona brand vera (scaricata e ri-dimensionata) quando disponibile.
const letterIcon = (name, hex) => {
  const ch = (String(name || '?').trim()[0] || '?').toUpperCase();
  return wrapSvg(
    `<rect x="1" y="1" width="22" height="22" rx="6" fill="#${hex}"/>` +
    `<text x="12" y="17" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="13" font-weight="700" fill="#ffffff">${ch}</text>`
  );
};

/* Icone brand già scaricate: così un nodo aggiunto DOPO il caricamento riceve
   subito la stessa icona di quelli importati, senza aspettare un ricaricamento. */
const BRAND_ICON = {};

const ONTO = window.ONTOLOGY || {};
const iconFor = n => {
  if (n.ntype === 'photo' && n.image) return n.image;   // miniatura della foto
  if (n.ficon) return faIcon(n.ficon);                  // es. cannabis, siringa, passaporto
  if (ONTO[n.ntype]) return faIcon(ONTO[n.ntype].icon);
  if (SVG[n.ntype]) return SVG[n.ntype];
  if (BRAND_ICON[n.platform]) return BRAND_ICON[n.platform];
  if (BRAND[n.platform]) return letterIcon(n.platform, BRAND[n.platform]);
  return SVG.generic;
};

/* Carica le icone dei marchi da static/vendor/icons/ (NON da internet: l'app
   deve funzionare su macchine senza collegamento) e forza width/height, così
   restano perfettamente centrate a qualsiasi livello di zoom.
   Se un'icona non c'e' resta il badge con l'iniziale, come sempre. */
async function upgradeBrandIcons() {
  // elenco delle icone davvero presenti: evita richieste a vuoto (404 inutili
  // in console, che finirebbero per nascondere gli errori veri)
  let disponibili = null;
  try {
    const r = await fetch('/api/brand-icons');
    if (r.ok) disponibili = new Set(await r.json());
  } catch (_) { /* si prova comunque, al massimo resta il badge */ }
  const slugs = [...new Set(cy.nodes().map(n => n.data('platform')))]
    .filter(p => BRAND[p] && (!disponibili || disponibili.has(p)));
  await Promise.all(slugs.map(async slug => {
    try {
      const r = await fetch(`/static/vendor/icons/${slug}.svg`);
      if (!r.ok) return;
      let t = (await r.text()).trim();
      if (!/^<svg/i.test(t)) return;
      t = t.replace(/<svg([^>]*)>/i, (m, a) => {
        a = a.replace(/\s(width|height)\s*=\s*"[^"]*"/gi, '');
        if (!/viewBox/i.test(a)) a += ' viewBox="0 0 24 24"';
        return `<svg${a} width="64" height="64">`;
      });
      const uri = 'data:image/svg+xml;utf8,' + encodeURIComponent(t);
      BRAND_ICON[slug] = uri;                 // memorizzata per i nodi futuri
      cy.batch(() => {
        cy.nodes().forEach(n => {
          if (n.data('platform') === slug && !SVG[n.data('ntype')]) n.data('icon', uri);
        });
      });
    } catch (_) { /* icona assente: resta il badge con l'iniziale */ }
  }));
}

/* ================= UTILITY ================= */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const short = u => u.replace(/^https?:\/\//, '').slice(0, 60);
const SKIP = /^(sstt|epid|hd_profile_pic_versions|checksums|crypted_custom_password|salt|FidoParams|threads_profile_glyph_url|profile_pic_url_hd|profile_pic_url|avatarLarger|profile_photo_hash|avatar|hd_profile_pic_url_info)$/i;
const NOISE = /^(is_|has_|can_|show_|enable_|allow_|should_|eligible|include_|remove_|disable_|highlight_|open_|feed_|live_|reels_|stories_|posts_|trial_|spam_|request_|profile_reels|not_meta|meta_verified_benefits|recs_from|avatar_status|profile_overlay|profile_mentions|profile_hours|pinned_channels|qa_freeform)/i;

function flatten(o, p = '', out = []) {
  if (out.length > 150) return out;
  if (Array.isArray(o)) {
    if (o.length && typeof o[0] !== 'object') { out.push([p, o.join(', ')]); return out; }
    o.slice(0, 8).forEach((v, i) => flatten(v, `${p}[${i}]`, out));
  } else if (o && typeof o === 'object') {
    for (const k in o) {
      if (SKIP.test(k)) continue;
      if (NOISE.test(k) && typeof o[k] !== 'object') continue;
      flatten(o[k], p ? `${p}.${k}` : k, out);
    }
  } else if (o !== null && o !== '' && o !== false) {
    // I testi lunghi NON vengono scartati: verrebbero trovati dalla ricerca ma
    // non sarebbero visibili nella scheda. Si mostrano accorciati, espandibili.
    const v = String(o);
    if (v.length <= MAX_VAL) out.push([p, v]);
    else out.push([p, v.slice(0, MAX_VAL) + '…']);
  }
  return out;
}
const MAX_VAL = 10000;        // tetto di sicurezza per valori abnormi
const CLAMP_VAL = 400;        // oltre questa lunghezza il valore parte accorciato

const IMG_URL = /^https?:\/\/[^\s]+\.(jpg|jpeg|png|webp|gif|bmp)(\?|#|$)/i;
const linkify = v => {
  if (!/^https?:\/\//.test(v)) return esc(v);
  if (IMG_URL.test(v)) return `<img class="thumb" src="${esc(v)}" loading="lazy" alt="" onerror="this.remove()">`;
  return `<a href="${v}" target="_blank" rel="noopener">${esc(short(v))}</a>`;
};

/* Valore di una scheda: i testi lunghi si mostrano accorciati con "mostra tutto". */
const renderVal = v => {
  if (/^https?:\/\//.test(v) || v.length <= CLAMP_VAL) return linkify(v);
  return `<span class="lv">${esc(v)}</span>` +
         `<button type="button" class="lv-more">${esc(t('card.showMore'))}</button>`;
};

/* ================= PROPRIETÀ DEI COLLEGAMENTI =================
   Lo stesso blocco di controlli (nome, frecce, forma, snodo, tipo di linea,
   colore, spessore) compare in tre finestre: aggiunta di un nodo ('add'),
   collegamento di nodi selezionati ('link') e modifica di un collegamento
   ('edg'). Viene generato qui una sola volta per finestra, con id "<prefisso>-…". */
const EDGE_DEFAULT_COLOR = '#94a3b8';
const EDGE_PALETTE = ['#94a3b8', '#0f172a', '#dc2626', '#ea580c', '#d97706', '#16a34a',
                      '#0891b2', '#2563eb', '#7c3aed', '#db2777'];
const EDGE_DEFAULT_BEND = 40;
const EDGE_DEFAULTS = { label: '', arrow: 'none', curve: 'bezier', lstyle: '', color: '',
                        width: 0, bend: EDGE_DEFAULT_BEND };
/* Tutte le forme di Cytoscape adatte a un collegamento con frecce
   ('haystack' resta fuori: non disegna le frecce). */
const EDGE_CURVES = ['bezier', 'straight', 'unbundled-bezier', 'segments', 'round-segments',
                     'taxi', 'round-taxi', 'straight-triangle'];
const BEND_CURVES = ['unbundled-bezier', 'segments', 'round-segments'];   // con snodo regolabile

function buildEdgeProps(box) {
  const p = box.dataset.prefix;
  box.innerHTML = `
    <label class="af-lb" for="${p}-edge-label" data-i18n="add.edgeName"></label>
    <input id="${p}-edge-label" autocomplete="off" maxlength="300" data-i18n-ph="add.edgeNamePh">
    <label class="af-lb" for="${p}-edge-shape" data-i18n="add.edgeShape"></label>
    <select id="${p}-edge-shape">
      ${EDGE_CURVES.map(c => `<option value="${c}" data-i18n="curve.${c}"></option>`).join('')}
    </select>
    <div class="ep-bend" id="${p}-bend-row" hidden>
      <label class="af-lb" for="${p}-edge-bend" data-i18n="edge.bend"></label>
      <div class="ep-bend-ctl">
        <input type="range" id="${p}-edge-bend" min="-200" max="200" step="5" value="${EDGE_DEFAULT_BEND}">
        <span id="${p}-edge-bend-val" class="ep-bend-val"></span>
        <button type="button" class="mini" id="${p}-bend-flip" data-i18n-title="edge.bendFlip">⇅</button>
      </div>
    </div>
    <div class="ep-row2">
      <div>
        <label class="af-lb" for="${p}-edge-lstyle" data-i18n="edge.lineStyle"></label>
        <select id="${p}-edge-lstyle">
          <option value="" data-i18n="edge.lsDefault"></option>
          <option value="solid" data-i18n="edge.lsSolid"></option>
          <option value="dashed" data-i18n="edge.lsDashed"></option>
          <option value="dotted" data-i18n="edge.lsDotted"></option>
        </select>
      </div>
      <div>
        <label class="af-lb" for="${p}-edge-width" data-i18n="edge.width"></label>
        <select id="${p}-edge-width">
          <option value="0" data-i18n="edge.lsDefault"></option>
          <option value="1">1</option><option value="2">2</option>
          <option value="3">3</option><option value="4">4</option>
          <option value="6">6</option><option value="8">8</option>
          <option value="12">12</option>
        </select>
      </div>
    </div>
    <label class="af-lb" data-i18n="edge.color"></label>
    <div class="ep-color">
      <input type="color" id="${p}-edge-color" value="${EDGE_DEFAULT_COLOR}">
      ${EDGE_PALETTE.map(c => `<button type="button" class="ep-sw" data-sw="${c}" style="background:${c}" title="${c}"></button>`).join('')}
      <label class="af-cb-label"><input type="checkbox" id="${p}-edge-color-def" checked>
        <span data-i18n="edge.colorDefault"></span></label>
    </div>
    <div class="af-prev-head">
      <label class="af-lb" data-i18n="edge.preview"></label>
      <span class="af-hint" data-i18n="edge.previewHint"></span>
    </div>
    <div id="${p}-arrow-preview" class="af-arrow-preview" data-arrow="none"></div>`;

  const upd = () => updateEdgePreview(p);
  box.addEventListener('input', upd);
  box.addEventListener('change', upd);

  // Anteprima interattiva: è l'unico comando per le frecce. Un clic sulla metà
  // del nodo di partenza mette o toglie la punta verso quel nodo (freccia
  // all'indietro), un clic sulla metà del nodo di arrivo fa lo stesso con la
  // freccia in avanti. Funziona anche da tastiera (Tab, Invio o Spazio).
  const prev = box.querySelector(`#${p}-arrow-preview`);
  const toggleHead = (side, refocus) => {
    const { fwd, bwd } = arrowHeads(p);
    setArrowHeads(p, side === 'dst' ? !fwd : fwd, side === 'src' ? !bwd : bwd);
    upd();
    if (refocus) { const g = prev.querySelector(`[data-side="${side}"]`); if (g) g.focus(); }
  };
  prev.addEventListener('click', e => {
    const h = e.target.closest('[data-side]');
    if (h) toggleHead(h.dataset.side, false);
  });
  prev.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const h = e.target.closest('[data-side]');
    if (h) { e.preventDefault(); toggleHead(h.dataset.side, true); }
  });
  box.querySelector(`#${p}-edge-color`).addEventListener('input', () => {
    box.querySelector(`#${p}-edge-color-def`).checked = false; upd();
  });
  box.querySelectorAll('.ep-sw').forEach(b => b.addEventListener('click', () => {
    box.querySelector(`#${p}-edge-color`).value = b.dataset.sw;
    box.querySelector(`#${p}-edge-color-def`).checked = false;
    upd();
  }));
  box.querySelector(`#${p}-bend-flip`).addEventListener('click', () => {
    const r = box.querySelector(`#${p}-edge-bend`);
    r.value = String(-parseInt(r.value, 10) || 0);
    upd();
  });
}
document.querySelectorAll('.edge-props').forEach(buildEdgeProps);

/* Stato delle frecce di una finestra: vive sull'anteprima (data-arrow), che è
   anche il comando con cui si cambia. Valori: none | target | source | both. */
const EDGE_ARROWS = ['none', 'target', 'source', 'both'];
const arrowHeads = p => {
  const a = $(`#${p}-arrow-preview`).dataset.arrow || 'none';
  return { fwd: a === 'target' || a === 'both', bwd: a === 'source' || a === 'both' };
};
function setArrowHeads(p, fwd, bwd) {
  $(`#${p}-arrow-preview`).dataset.arrow = fwd && bwd ? 'both' : fwd ? 'target' : bwd ? 'source' : 'none';
}

function readEdgeProps(p) {
  const curve = $(`#${p}-edge-shape`).value;
  const v = {
    label: $(`#${p}-edge-label`).value.trim(),
    arrow: $(`#${p}-arrow-preview`).dataset.arrow || 'none',
    curve,
    lstyle: $(`#${p}-edge-lstyle`).value,
    color: $(`#${p}-edge-color-def`).checked ? '' : $(`#${p}-edge-color`).value,
    width: parseFloat($(`#${p}-edge-width`).value) || 0
  };
  if (BEND_CURVES.includes(curve)) v.bend = parseInt($(`#${p}-edge-bend`).value, 10) || 0;
  return v;
}

function writeEdgeProps(p, props) {
  const v = Object.assign({}, EDGE_DEFAULTS, props || {});
  $(`#${p}-edge-label`).value = v.label || '';
  $(`#${p}-arrow-preview`).dataset.arrow = EDGE_ARROWS.includes(v.arrow) ? v.arrow : 'none';
  $(`#${p}-edge-shape`).value = EDGE_CURVES.includes(v.curve) ? v.curve : 'bezier';
  $(`#${p}-edge-bend`).value = String(v.bend ?? EDGE_DEFAULT_BEND);
  $(`#${p}-edge-lstyle`).value = v.lstyle || '';
  const w = $(`#${p}-edge-width`);
  w.value = String(v.width || 0);
  if (w.value === '' && v.width) {                 // spessore non in elenco
    w.insertAdjacentHTML('beforeend', `<option value="${v.width}">${v.width}</option>`);
    w.value = String(v.width);
  }
  $(`#${p}-edge-color`).value = v.color || EDGE_DEFAULT_COLOR;
  $(`#${p}-edge-color-def`).checked = !v.color;
  updateEdgePreview(p);
}

/* Proprietà correnti di un arco del grafo (quelle non impostate = predefinite). */
const edgePropsOf = e => ({
  label: e.data('label') || '', arrow: e.data('arrow') || 'none',
  curve: e.data('curve') || 'bezier', lstyle: e.data('lstyle') || '',
  color: e.data('color') || '', width: e.data('width') || 0,
  bend: e.data('bend') ?? EDGE_DEFAULT_BEND
});

/* Applica le proprietà a un arco del grafo: le chiavi vuote si tolgono, così
   torna a valere lo stile predefinito (o quello del tipo di relazione). */
function setEdgeProps(e, props) {
  const v = Object.assign({}, EDGE_DEFAULTS, props || {});
  const want = {
    label: v.label || '', arrow: v.arrow !== 'none' ? v.arrow : '',
    curve: v.curve !== 'bezier' ? v.curve : '', lstyle: v.lstyle || '',
    color: v.color || '', width: v.width || 0
  };
  for (const k in want) {
    if (want[k]) e.data(k, want[k]); else e.removeData(k);
  }
  if (BEND_CURVES.includes(v.curve)) e.data('bend', typeof v.bend === 'number' ? v.bend : EDGE_DEFAULT_BEND);
  else e.removeData('bend');
}

/* ---- Anteprima: i due nodi VERI (icona, colore, nome) e la linea come
   apparirà nel grafo. Ogni finestra registra i suoi due nodi. ---- */
const previewNodes = {};
const nodeView = n => n && n.length
  ? { icon: n.data('icon'), label: n.data('label'), color: n.data('color'), ntype: n.data('ntype') }
  : null;
function setPreviewNodes(p, a, b) {
  previewNodes[p] = [a, b];
  updateEdgePreview(p);
}

function previewNodeSvg(n, x, y, r, id) {
  const col = (n && n.color) || '#475569';
  const photo = n && n.ntype === 'photo';
  const bg = n && n.ntype === 'target' ? '#fef3c7' : '#ffffff';
  const lab = n ? String(n.label || '') : '';
  const short = lab.length > 22 ? lab.slice(0, 21) + '…' : lab;
  const clip = photo
    ? `<clipPath id="${id}"><rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="5"/></clipPath>`
    : `<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath>`;
  const shape = photo
    ? `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="5" fill="${bg}" stroke="${col}" stroke-width="2.5"/>`
    : `<circle cx="${x}" cy="${y}" r="${r}" fill="${bg}" stroke="${col}" stroke-width="2.5"/>`;
  const s = photo ? 2 * r : r * 1.24;                // come nel grafo: icona al 62%
  const img = n && n.icon
    ? `<image href="${esc(n.icon)}" x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" ` +
      `preserveAspectRatio="${photo ? 'xMidYMid slice' : 'xMidYMid meet'}" clip-path="url(#${id})"/>`
    : '';
  const txt = short
    ? `<text x="${x}" y="${y + r + 13}" text-anchor="middle" font-size="10.5" font-weight="600" ` +
      `fill="${n.ntype === 'target' ? '#b45309' : '#0f172a'}" stroke="#fff" stroke-width="3" ` +
      `paint-order="stroke">${esc(short)}</text>` : '';
  return clip + shape + img + txt;
}

function updateEdgePreview(p) {
  const box = $(`#${p}-arrow-preview`);
  if (!box) return;
  const v = readEdgeProps(p);
  const bendRow = $(`#${p}-bend-row`);
  if (bendRow) bendRow.hidden = !BEND_CURVES.includes(v.curve);
  const bv = $(`#${p}-edge-bend-val`);
  if (bv) bv.textContent = `${parseInt($(`#${p}-edge-bend`).value, 10) || 0} px`;

  const [na, nb] = previewNodes[p] || [];
  const col = v.color || EDGE_DEFAULT_COLOR;
  const w = v.width || (v.curve === 'straight-triangle' ? 8 : 2);
  const R = 17;
  const A = { x: 52, y: 62 }, B = { x: 308, y: 86 };  // un po' sfalsati, come in un grafo vero
  const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
  const nx = dy / len, ny = -dx / len;                 // normale (verso "sopra" la linea)
  const bend = (v.bend ?? EDGE_DEFAULT_BEND) * 0.26;   // scala ridotta: sta nel riquadro
  const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  const K = { x: M.x + nx * bend, y: M.y + ny * bend };   // snodo / punto di controllo

  // punti di partenza e arrivo sul BORDO dei nodi, lungo la direzione di uscita
  const edgeAt = (P, Q) => { const l = Math.hypot(Q.x - P.x, Q.y - P.y) || 1;
    return { x: P.x + (Q.x - P.x) / l * R, y: P.y + (Q.y - P.y) / l * R }; };
  let d = '', firstDir = B, lastDir = A, labelAt = M;
  const f = n => n.toFixed(1);
  switch (v.curve) {
    case 'unbundled-bezier': {
      const C = { x: 2 * K.x - M.x, y: 2 * K.y - M.y };   // la curva passa per K
      const s = edgeAt(A, C), e = edgeAt(B, C);
      d = `M${f(s.x)} ${f(s.y)} Q${f(C.x)} ${f(C.y)} ${f(e.x)} ${f(e.y)}`;
      firstDir = C; lastDir = C; labelAt = K; break;
    }
    case 'segments': case 'round-segments': {
      const s = edgeAt(A, K), e = edgeAt(B, K);
      if (v.curve === 'segments') d = `M${f(s.x)} ${f(s.y)} L${f(K.x)} ${f(K.y)} L${f(e.x)} ${f(e.y)}`;
      else {
        const r = 16, a1 = edgeAt(K, A), b1 = edgeAt(K, B);   // raccordo arrotondato
        const k1 = { x: K.x + (a1.x - K.x) * r / R, y: K.y + (a1.y - K.y) * r / R };
        const k2 = { x: K.x + (b1.x - K.x) * r / R, y: K.y + (b1.y - K.y) * r / R };
        d = `M${f(s.x)} ${f(s.y)} L${f(k1.x)} ${f(k1.y)} Q${f(K.x)} ${f(K.y)} ${f(k2.x)} ${f(k2.y)} L${f(e.x)} ${f(e.y)}`;
      }
      firstDir = K; lastDir = K; labelAt = K; break;
    }
    case 'taxi': case 'round-taxi': {
      const X = M.x, s = { x: A.x + R, y: A.y }, e = { x: B.x - R, y: B.y };
      if (v.curve === 'taxi') d = `M${s.x} ${s.y} L${X} ${A.y} L${X} ${B.y} L${e.x} ${e.y}`;
      else {
        const r = 12;
        d = `M${s.x} ${s.y} L${X - r} ${A.y} Q${X} ${A.y} ${X} ${A.y + r} ` +
            `L${X} ${B.y - r} Q${X} ${B.y} ${X + r} ${B.y} L${e.x} ${e.y}`;
      }
      firstDir = { x: A.x + 100, y: A.y }; lastDir = { x: B.x - 100, y: B.y };
      labelAt = { x: X, y: M.y }; break;
    }
    case 'straight-triangle': {
      const s = edgeAt(A, B), e = edgeAt(B, A), h = w / 2;
      d = `M${f(s.x + nx * h)} ${f(s.y + ny * h)} L${f(e.x)} ${f(e.y)} L${f(s.x - nx * h)} ${f(s.y - ny * h)} Z`;
      break;
    }
    default: {                                           // bezier (auto) e retta
      const s = edgeAt(A, B), e = edgeAt(B, A);
      d = `M${f(s.x)} ${f(s.y)} L${f(e.x)} ${f(e.y)}`;
    }
  }
  const tri = v.curve === 'straight-triangle';
  const dash = tri ? '' : v.lstyle === 'dashed' ? `stroke-dasharray="${w * 3} ${w * 2}"`
             : v.lstyle === 'dotted' ? `stroke-dasharray="0.1 ${w * 2}" stroke-linecap="round"` : '';
  // punta di freccia: triangolo appoggiato al bordo del nodo. Quella "fantasma"
  // (tratteggiata, semitrasparente) compare al passaggio del mouse dove la
  // punta non c'è ancora, per far capire che un clic la aggiunge.
  const head = (P, from, ghost) => {
    const l = Math.hypot(P.x - from.x, P.y - from.y) || 1;
    const ux = (P.x - from.x) / l, uy = (P.y - from.y) / l;
    const tip = { x: P.x - ux * R, y: P.y - uy * R };
    const s = 5 + w * 1.6, b = { x: tip.x - ux * s * 1.4, y: tip.y - uy * s * 1.4 };
    const look = ghost
      ? `class="pv-ghost" fill="${col}" fill-opacity=".35" stroke="${col}" stroke-width="1" stroke-dasharray="2 1.5"`
      : `class="pv-head" fill="${col}"`;
    return `<path d="M${f(tip.x)} ${f(tip.y)} L${f(b.x - uy * s * 0.7)} ${f(b.y + ux * s * 0.7)} ` +
           `L${f(b.x + uy * s * 0.7)} ${f(b.y - ux * s * 0.7)} Z" ${look}/>`;
  };
  const fwd = v.arrow === 'target' || v.arrow === 'both';
  const bwd = v.arrow === 'source' || v.arrow === 'both';
  // zone cliccabili: la metà del nodo di partenza e la metà del nodo di
  // arrivo dell'anteprima; ciascuna mette/toglie la propria punta
  const W = 360, H = 132;
  const side = (key, P, from, active, name) => {
    const tip = t(active ? 'edge.headRemove' : 'edge.headAdd', { n: name });
    const half = key === 'src' ? `x="0" y="0" width="${f(M.x)}" height="${H}"`
                               : `x="${f(M.x)}" y="0" width="${f(W - M.x)}" height="${H}"`;
    return `<g class="pv-side${active ? ' on' : ''}" data-side="${key}" tabindex="0" role="button" ` +
           `aria-pressed="${active}" aria-label="${esc(tip)}"><title>${esc(tip)}</title>` +
           `<rect class="pv-hit" ${half} rx="6"/>` + head(P, from, !active) + `</g>`;
  };
  const nameA = (na && na.label) || t('link.from');
  const nameB = (nb && nb.label) || (p === 'add' ? t('add.newNode') : t('link.to'));
  const lbl = v.label ? v.label.slice(0, 40) : '';
  const lw = lbl.length * 5.6 + 10;
  box.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">` +
    (tri ? `<path d="${d}" fill="${col}"/>`
         : `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" ${dash}/>`) +
    side('src', A, firstDir, bwd, nameA) + side('dst', B, lastDir, fwd, nameB) +
    (lbl ? `<rect x="${f(labelAt.x - lw / 2)}" y="${f(labelAt.y - 17)}" width="${f(lw)}" height="15" rx="4" ` +
           `fill="#fff" stroke="#cbd5e1"/>` +
           `<text x="${f(labelAt.x)}" y="${f(labelAt.y - 6)}" text-anchor="middle" font-size="9.5" ` +
           `font-weight="600" fill="#334155">${esc(lbl)}</text>` : '') +
    previewNodeSvg(na, A.x, A.y, R, `pv-${p}-a`) + previewNodeSvg(nb, B.x, B.y, R, `pv-${p}-b`) +
    `</svg>`;
}

/* ================= MENU CONTESTUALE DEL GRAFO ================= */
function showCtxMenu(x, y) {
  const m = $('#ctxmenu');
  if (!m) return;
  m.hidden = false;
  // resta dentro la finestra anche vicino ai bordi
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(0, Math.min(x, window.innerWidth - r.width - 4)) + 'px';
  m.style.top = Math.max(0, Math.min(y, window.innerHeight - r.height - 4)) + 'px';
}
function hideCtxMenu() {
  const m = $('#ctxmenu');
  if (m) m.hidden = true;
}

/* ================= STATO GLOBALE ================= */
let cy = null;
let hasCase = false;             // c'e' un caso aperto? (senza, niente nodi)
let showIds = true;
let pathOnly = false;
let degFilter = 0;
const hiddenCats = new Set();    // categorie attualmente spente (stato dei pulsanti)
const catHidden = new Set();     // nodi tolti dalla vista perché la loro categoria è spenta
let curLayout = 'fcose';
let searchTimer = null;
const MIN_SEARCH = 3;            // caratteri minimi per mostrare i risultati
let INDEX = [];                  // indice di ricerca precalcolato
const VOCAB = new Map();         // parola -> id dei nodi che la contengono
const TOKEN_RE = /[\p{L}\p{N}][\p{L}\p{N}._]*/gu;
const expanded = new Set();      // nodi espansi
const selected = new Set();      // nodi selezionati (ctrl+click)
const visibleNodes = new Set();  // nodi aggiunti a mano (ricerca/modale)
const pinned = new Set();        // nodi del percorso evidenziato
const placed = new Set();        // nodi che hanno già una posizione stabile

const depthVal = () => parseInt(($('#depth') && $('#depth').value) || '1', 10) || 1;

/* ================= EVIDENZIA COLLEGAMENTI (H+Click) =================
   Tenendo premuto H e cliccando un nodo, quel nodo e i suoi collegamenti
   DIRETTI visibili restano in evidenza; tutto il resto viene attenuato.
   Un click normale (o H+Click sullo stesso nodo) ripristina la vista. */
let focusId = null;
let hDown = false;
let nDown = false;
const hiddenNodes = new Set();   // nodi nascosti a mano con N+Click (solo in sessione)

const typingInField = () => {
  const el = document.activeElement;
  return !!(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable));
};

document.addEventListener('keydown', e => {
  if (typingInField()) return;
  if (e.key === 'h' || e.key === 'H') hDown = true;
  if (e.key === 'n' || e.key === 'N') nDown = true;
});
document.addEventListener('keyup', e => {
  if (e.key === 'h' || e.key === 'H') hDown = false;
  if (e.key === 'n' || e.key === 'N') nDown = false;
});
window.addEventListener('blur', () => { hDown = false; nDown = false; });

/* N+Click: toglie il nodo dalla vista (con i suoi archi). Non tocca i dati:
   è una scelta di sola visualizzazione, valida per questa sessione. */
function hideNode(node) {
  const id = node.id();
  hiddenNodes.add(id);
  visibleNodes.delete(id);
  expanded.delete(id);
  if (focusId === id) clearFocus(true);
  refresh(false);
  syncHiddenBtn();
  $('#stat').textContent = t('stat.nodeHidden', { label: node.data('label'), n: hiddenNodes.size });
}

function showHiddenNodes() {
  if (!hiddenNodes.size) return;
  const n = hiddenNodes.size;
  hiddenNodes.clear();
  refresh(true);
  syncHiddenBtn();
  $('#stat').textContent = t('stat.hiddenRestored', { n });
}

/* Il pulsante di ripristino compare solo se c'è qualcosa di nascosto. */
function syncHiddenBtn() {
  const b = $('#showHidden');
  if (!b) return;
  b.hidden = !hiddenNodes.size;
  b.textContent = t('btn.showHidden', { n: hiddenNodes.size });
}

function clearFocus(silent) {
  if (!focusId) return;
  focusId = null;
  if (cy) cy.elements().removeClass('dim foc foc-src');
  if (!silent && cy) refreshStat();
}

/* Applica l'evidenziazione in base a focusId (richiamata anche dopo refresh,
   perché cambiando i nodi visibili cambia anche cosa va attenuato). */
function applyFocus() {
  if (!cy || !focusId) return;
  const node = cy.getElementById(focusId);
  if (!node.length || node.hasClass('hidden')) { clearFocus(true); return; }

  const visible = cy.elements().not('.hidden');
  const keep = node.closedNeighborhood().not('.hidden');   // nodo + vicini + archi
  cy.batch(() => {
    cy.elements().removeClass('dim foc foc-src');
    visible.difference(keep).addClass('dim');
    keep.addClass('foc');
    node.removeClass('foc').addClass('foc-src');
  });
  return keep.nodes().length - 1;                          // quanti collegamenti diretti
}

function toggleFocus(node) {
  if (focusId === node.id()) { clearFocus(); return; }
  focusId = node.id();
  const n = applyFocus();
  $('#stat').textContent = t('stat.focusOn', { label: node.data('label'), n: n || 0 });
}

/* ================= CARICAMENTO ================= */
/* Senza Cytoscape non nasce il grafo e TUTTO tace: ricerca, filtri, esporta.
   Era il caso dell'eseguibile portato su una macchina senza collegamento,
   quando le librerie arrivavano da internet. Ora stanno in static/vendor/, ma
   se per qualunque motivo non si caricassero l'utente deve VEDERLO, non
   restare davanti a una ricerca che non risponde. */
function graphLibReady() {
  if (typeof cytoscape !== 'undefined') return true;
  const box = $('#stat');
  if (box) { box.textContent = t('stat.libMissing'); box.classList.add('fatal'); }
  console.error('Cytoscape non caricato: static/vendor/ non trovata o illeggibile.');
  return false;
}

async function load() {
  if (!graphLibReady()) return;
  let g;
  try {
    const r = await fetch('/api/graph');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    g = await r.json();
    if (g.error) throw new Error(g.error);
  } catch (err) {
    console.error('Caricamento fallito:', err);
    $('#stat').textContent = t('stat.loadError', { e: err.message });
    return;
  }
  // senza dati il grafo nasce comunque (vuoto): si possono creare nodi a mano,
  // importare un file o usare l'AI anche su un'installazione nuova
  const empty = !g || !g.nodes || !g.nodes.length;
  if (empty) g = { nodes: [], edges: [], no_case: !!(g && g.no_case) };

  const deg = {};
  g.edges.forEach(e => { deg[e.source] = (deg[e.source] || 0) + 1; deg[e.target] = (deg[e.target] || 0) + 1; });

  const els = [];
  INDEX = [];
  VOCAB.clear();
  for (const n of g.nodes) {
    const ident = IDENT_TYPES.includes(n.ntype);
    n.deg = deg[n.id] || 0;
    n.ident = ident;
    n.cat = categoryOf(n);
    n.bridge = ident && n.deg > 1;
    n.size = n.ntype === 'target' ? 50 : n.ntype === 'photo' ? 46
           : n.ntype === 'account' ? 32 : (n.bridge ? 26 : 22);

    indexNode(n);      // indice di ricerca (etichetta, alias, note E schede)

    els.push({ data: { ...n, icon: iconFor(n), color: TYPE_COLOR[n.ntype] || TYPE_COLOR.generic, disp: n.label } });
  }
  g.edges.forEach(e => els.push({ data: { ...e, rel: e.rel || '' } }));

  render(els);
  if (g.no_case) $('#stat').textContent = t('case.noneHint');
  else if (empty) $('#stat').textContent = t('stat.noData');
}

/* ================= RICARICA DATI (senza riavviare l'app) =================
   Rilegge le cartelle dei target e allinea il grafo VIVO: aggiunge i nodi
   nuovi, toglie quelli spariti, aggiorna quelli cambiati. La vista corrente
   (nodi aperti, posizioni, zoom) resta intatta. */
function indexNode(d) {
  let hay = `${d.label} ${d.id} ${d.platform} ${d.ntype} ${d.roman || ''} ` +
            `${d.script || ''} ${(d.aliases || []).join(' ')} ` +
            `${(d.alias_ids || []).join(' ')} ${d.note || ''}`;
  const headLen = hay.toLowerCase().length;
  for (const r of (d.records || [])) {
    hay += ' ' + (r.collection || '');
    try { hay += ' ' + JSON.stringify(r.raw); } catch (_) {}
  }
  hay = hay.toLowerCase().slice(0, 20000);
  INDEX.push({ id: d.id, hay, headLen });
  const toks = hay.match(TOKEN_RE);
  if (toks) {
    let c = 0;
    for (const w of new Set(toks)) {
      if (w.length < 2 || w.length > 40) continue;
      let post = VOCAB.get(w);
      if (!post) { post = []; VOCAB.set(w, post); }
      if (post.length < 8000) post.push(d.id);
      if (++c > 600) break;
    }
  }
}

function rebuildIndex() {
  INDEX = [];
  VOCAB.clear();
  cy.nodes().forEach(n => indexNode(n.data()));
}

/* Allinea il grafo VIVO a un grafo appena arrivato dal server: aggiunge i nodi
   nuovi, toglie quelli spariti (anche quelli confluiti in un'altra scheda dopo
   una rinomina) e aggiorna quelli cambiati. La vista corrente resta intatta. */
function applyGraphData(g) {
  {
    const deg = {};
    g.edges.forEach(e => { deg[e.source] = (deg[e.source] || 0) + 1;
                           deg[e.target] = (deg[e.target] || 0) + 1; });
    const newIds = new Set(g.nodes.map(n => n.id));
    const newEdgeIds = new Set(g.edges.map(e => e.id));
    let added = 0, removed = 0, updated = 0;

    cy.batch(() => {
      // 1) via i nodi che non esistono più nei dati
      cy.nodes().forEach(n => {
        const id = n.id();
        if (newIds.has(id)) return;
        [visibleNodes, expanded, selected, pinned, placed, hiddenNodes]
          .forEach(s => s.delete(id));
        if (focusId === id) focusId = null;
        n.remove();
        removed++;
      });
      // 2) aggiunge i nuovi e aggiorna gli esistenti
      g.nodes.forEach(d => {
        d.deg = deg[d.id] || 0;
        d.ident = IDENT_TYPES.includes(d.ntype);
        d.cat = categoryOf(d);
        d.bridge = d.ident && d.deg > 1;
        d.size = d.ntype === 'target' ? 50 : d.ntype === 'photo' ? 46
               : d.ntype === 'account' ? 32 : (d.bridge ? 26 : 22);
        const ex = cy.getElementById(d.id);
        if (!ex.length) { addNodeToCy(d); added++; return; }
        Object.keys(d).forEach(k => ex.data(k, d[k]));   // schede, note, etichetta…
        ['url', 'edited', 'note'].forEach(k => { if (!(k in d)) ex.removeData(k); });
        ex.data('renamed', !!d.renamed);                // ripristinata: torna false
        ex.data('label_orig', d.label_orig || '');
        ex.data('disp', d.label);
        ex.data('icon', iconFor(d));
        ex.data('color', TYPE_COLOR[d.ntype] || TYPE_COLOR.generic);
        ex.toggleClass('noted', !!d.note);
        updated++;
      });
      // 3) archi: toglie i superati, aggiunge i nuovi, aggiorna nome e stile
      //    di quelli rimasti (modificati col tasto destro)
      cy.edges().forEach(e => { if (!newEdgeIds.has(e.id())) e.remove(); });
      g.edges.forEach(e => {
        const ex = cy.getElementById(e.id);
        if (ex.length) {
          if (ex.data('source') !== e.source || ex.data('target') !== e.target) {
            if (cy.getElementById(e.source).length && cy.getElementById(e.target).length) {
              ex.move({ source: e.source, target: e.target });
            }
          }
          setEdgeProps(cy.getElementById(e.id), e);   // move() ricrea l'arco
          return;
        }
        if (cy.getElementById(e.source).length && cy.getElementById(e.target).length) {
          cy.add({ group: 'edges', data: Object.assign({ rel: '' }, e) });
        }
      });
    });

    rebuildIndex();
    ADJ = null;
    refreshTranslitBtn();
    clearFocus(true);
    buildLegend(); buildCatFilters(); buildDegFilter();
    syncHiddenBtn(); syncDegOnlyBtn(); renderSel();
    refresh(added > 0);
    upgradeBrandIcons();
    return { tot: g.nodes.length, add: added, del: removed, upd: updated };
  }
}

/* Rilegge il grafo dal server SENZA rileggere i file dei target: serve dopo
   una modifica alle annotazioni (nota, etichetta, collegamento). */
async function syncGraph() {
  const r = await fetch('/api/graph');
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const g = await r.json();
  if (g.error) throw new Error(g.error);
  return applyGraphData(g);
}

async function reloadData() {
  const btn = $('#reloadData');
  if (btn) { btn.disabled = true; btn.textContent = t('btn.reloading'); }
  try {
    const g = await apiPost('/api/reload', {});
    $('#stat').textContent = t('stat.reloaded', applyGraphData(g));
  } catch (err) {
    alert(t('err.reloadFailed', { e: err.message }));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = t('btn.reloadData'); }
  }
}
on('#reloadData', 'click', reloadData);

/* ================= TRASLITTERAZIONE CON IL CHATBOT =================
   Il pulsante compare solo se in chatbot.conf c'e' un endpoint. Se il chatbot
   non risponde non succede nulla: si continua con il dizionario compilato a
   mano e la traslitterazione automatica di sempre. */
async function refreshTranslitBtn() {
  const b = $('#aiTranslit');
  if (!b) return;
  try {
    const r = await fetch('/api/translit/status');
    if (!r.ok) { b.hidden = true; return; }
    const s = await r.json();
    b.hidden = !s.enabled;
    b.disabled = !s.todo;
    b.textContent = s.todo ? t('btn.aiTranslitN', { n: s.todo }) : t('btn.aiTranslitOk');
    b.title = (s.down && s.reason) ? t('ai.down', { e: s.reason })
                                   : t('ai.hint', { model: s.model || '' });
  } catch (_) {
    b.hidden = true;
  }
}

on('#aiTranslit', 'click', async () => {
  const b = $('#aiTranslit');
  const testo = b.textContent;
  b.disabled = true;
  b.textContent = t('btn.aiWorking');
  try {
    const j = await apiPost('/api/translit/ai', {});
    if (j.tradotte) {
      await reloadData();                 // le etichette latine vanno rifatte
      $('#stat').textContent = t('stat.aiDone', { n: j.tradotte, rest: j.restano });
    } else {
      $('#stat').textContent = t('stat.aiNothing');
    }
  } catch (err) {
    alert(t('err.aiFailed', { e: err.message }));
  } finally {
    b.textContent = testo;
    b.disabled = false;
    refreshTranslitBtn();
  }
});

/* ================= GRAFO ================= */
function render(els) {
  cy = cytoscape({
    container: $('#graph'),
    elements: els,
    wheelSensitivity: 0.25,
    minZoom: 0.05,
    maxZoom: 3,
    zoom: 1,                 // niente fit automatico all'avvio (partiva a zoom 3)
    pan: { x: 0, y: 0 },
    motionBlur: false,
    layout: { name: 'preset', fit: false },
    // Ctrl (o Shift) + trascinamento sullo sfondo = riquadro di selezione:
    // con il pan attivo Cytoscape lo avvia solo se si tiene premuto un modificatore
    boxSelectionEnabled: true,
    selectionType: 'additive',
    style: [
      { selector: 'node', style: {
        'width': 'data(size)', 'height': 'data(size)',
        'shape': 'ellipse',
        'background-color': '#ffffff',
        'background-image': 'data(icon)',
        'background-fit': 'contain',
        'background-clip': 'none',
        'background-image-containment': 'inside',
        'background-position-x': '50%',
        'background-position-y': '50%',
        'background-offset-x': 0,
        'background-offset-y': 0,
        'background-width': '62%', 'background-height': '62%',
        'background-width-relative-to': 'inner',
        'background-height-relative-to': 'inner',
        'border-width': 2.5,
        'border-color': 'data(color)',
        'label': 'data(disp)',
        'color': '#0f172a',
        'font-size': 11,
        'font-weight': '600',
        'text-valign': 'bottom',
        'text-margin-y': 5,
        'text-wrap': 'ellipsis',
        'text-max-width': 90,
        'text-outline-color': '#ffffff',
        'text-outline-width': 3,
        'min-zoomed-font-size': 7
      } },
      { selector: 'node[ntype="target"]', style: {
        'font-size': 14, 'font-weight': 'bold', 'color': '#b45309',
        'border-width': 4, 'background-color': '#fef3c7'
      } },
      // dati di partenza (dal file iniziale del target): bordo rosso.
      // Il target è escluso: ha già il suo stile dorato distintivo.
      { selector: 'node[?seed][ntype != "target"]', style: {
        'border-color': '#dc2626', 'border-width': 4
      } },
      { selector: 'node.exp', style: { 'border-style': 'double', 'border-width': 6 } },
      { selector: 'edge', style: {
        'width': 2, 'line-color': '#94a3b8', 'opacity': 0.8, 'curve-style': 'bezier',
        'target-arrow-shape': 'none', 'source-arrow-shape': 'none',
        'target-arrow-color': '#94a3b8', 'source-arrow-color': '#94a3b8',
        'arrow-scale': 1.25
      } },
      // Frecce direzionali
      { selector: 'edge[arrow = "target"]', style: {
        'target-arrow-shape': 'triangle', 'source-arrow-shape': 'none'
      } },
      { selector: 'edge[arrow = "source"]', style: {
        'target-arrow-shape': 'none', 'source-arrow-shape': 'triangle'
      } },
      { selector: 'edge[arrow = "both"]', style: {
        'target-arrow-shape': 'triangle', 'source-arrow-shape': 'triangle'
      } },
      { selector: 'edge[arrow = "none"]', style: {
        'target-arrow-shape': 'none', 'source-arrow-shape': 'none'
      } },
      // Forme del collegamento (curva, retta, segmenti)
      { selector: 'edge[curve = "straight"]', style: {
        'curve-style': 'straight'
      } },
      { selector: 'edge[curve = "bezier"]', style: {
        'curve-style': 'bezier'
      } },
      { selector: 'edge[curve = "unbundled-bezier"]', style: {
        'curve-style': 'unbundled-bezier', 'control-point-weights': 0.5,
        'control-point-distances': e => -(e.data('bend') ?? EDGE_DEFAULT_BEND)
      } },
      { selector: 'edge[curve = "segments"], edge[curve = "round-segments"]', style: {
        'curve-style': 'segments', 'segment-weights': 0.5,
        'segment-distances': e => -(e.data('bend') ?? EDGE_DEFAULT_BEND)
      } },
      { selector: 'edge[curve = "round-segments"]', style: {
        'curve-style': 'round-segments', 'segment-radius': 18
      } },
      { selector: 'edge[curve = "taxi"], edge[curve = "round-taxi"]', style: {
        'curve-style': 'taxi', 'taxi-direction': 'auto', 'taxi-turn': '50%'
      } },
      { selector: 'edge[curve = "round-taxi"]', style: {
        'curve-style': 'round-taxi', 'taxi-radius': 14
      } },
      { selector: 'edge[curve = "straight-triangle"]', style: {
        'curve-style': 'straight-triangle', 'width': 8
      } },
      // Etichette dei collegamenti
      { selector: 'edge[?label]', style: {
        'label': 'data(label)',
        'text-rotation': 'autorotate',
        'text-margin-y': -8,
        'font-size': 9.5,
        'font-weight': '600',
        'color': '#334155',
        'text-background-opacity': 0.92,
        'text-background-color': '#ffffff',
        'text-background-padding': '3px',
        'text-background-shape': 'roundrectangle',
        'text-border-color': '#cbd5e1',
        'text-border-width': 1,
        'text-border-opacity': 0.8,
        'text-wrap': 'ellipsis',
        'text-max-width': 140
      } },
      { selector: 'edge[rel="alias"]', style: {
        'line-color': '#f59e0b', 'target-arrow-color': '#f59e0b', 'source-arrow-color': '#f59e0b',
        'line-style': 'dashed', 'width': 3, 'opacity': 1
      } },
      { selector: 'edge[rel="phone-link"]', style: {
        'line-color': '#059669', 'target-arrow-color': '#059669', 'source-arrow-color': '#059669',
        'line-style': 'dashed', 'width': 2.5
      } },
      { selector: 'edge[rel="email-alias"]', style: {
        'line-color': '#db2777', 'target-arrow-color': '#db2777', 'source-arrow-color': '#db2777',
        'line-style': 'dashed', 'width': 2.5
      } },
      { selector: 'edge[rel="translit"]', style: {
        'line-color': '#0891b2', 'target-arrow-color': '#0891b2', 'source-arrow-color': '#0891b2',
        'line-style': 'dotted', 'width': 3, 'opacity': 1
      } },
      { selector: 'node[ntype="latin"]', style: { 'color': '#0e7490', 'border-style': 'dashed' } },
      { selector: 'node[ntype="photo"]', style: {
        'background-fit': 'cover', 'background-width': '100%', 'background-height': '100%',
        'background-clip': 'node', 'border-width': 3, 'shape': 'round-rectangle',
        'color': '#0f766e'
      } },
      { selector: 'edge[rel="photo"]', style: {
        'line-color': '#14b8a6', 'target-arrow-color': '#14b8a6', 'source-arrow-color': '#14b8a6', 'width': 2.5
      } },
      // Stile scelto dall'utente per il singolo collegamento: vince su quello
      // del tipo di relazione (ma non sugli evidenziamenti qui sotto)
      { selector: 'edge[?color]', style: {
        'line-color': 'data(color)', 'target-arrow-color': 'data(color)',
        'source-arrow-color': 'data(color)', 'opacity': 1
      } },
      { selector: 'edge[lstyle = "solid"]', style: { 'line-style': 'solid' } },
      { selector: 'edge[lstyle = "dashed"]', style: { 'line-style': 'dashed', 'line-dash-pattern': [8, 5] } },
      { selector: 'edge[lstyle = "dotted"]', style: { 'line-style': 'dotted' } },
      { selector: 'edge[?width]', style: { 'width': 'data(width)' } },
      // Stile scelto per TUTTI i collegamenti dal pannello di sinistra: sta in
      // fondo, quindi vince sugli stili del singolo collegamento (si torna
      // indietro scegliendo «come impostati»)
      { selector: 'edge.gs-bezier', style: { 'curve-style': 'bezier' } },
      { selector: 'edge.gs-straight', style: { 'curve-style': 'straight' } },
      { selector: 'edge.gs-unbundled-bezier', style: {
        'curve-style': 'unbundled-bezier', 'control-point-weights': 0.5,
        'control-point-distances': e => -(e.data('bend') ?? EDGE_DEFAULT_BEND)
      } },
      { selector: 'edge.gs-segments, edge.gs-round-segments', style: {
        'curve-style': 'segments', 'segment-weights': 0.5,
        'segment-distances': e => -(e.data('bend') ?? EDGE_DEFAULT_BEND)
      } },
      { selector: 'edge.gs-round-segments', style: { 'curve-style': 'round-segments', 'segment-radius': 18 } },
      { selector: 'edge.gs-taxi, edge.gs-round-taxi', style: {
        'curve-style': 'taxi', 'taxi-direction': 'auto', 'taxi-turn': '50%'
      } },
      { selector: 'edge.gs-round-taxi', style: { 'curve-style': 'round-taxi', 'taxi-radius': 14 } },
      { selector: 'edge.gs-straight-triangle', style: { 'curve-style': 'straight-triangle' } },
      { selector: 'edge.gl-solid', style: { 'line-style': 'solid' } },
      { selector: 'edge.gl-dashed', style: { 'line-style': 'dashed', 'line-dash-pattern': [8, 5] } },
      { selector: 'edge.gl-dotted', style: { 'line-style': 'dotted' } },
      { selector: 'edge.gw-1', style: { 'width': 1 } },
      { selector: 'edge.gw-2', style: { 'width': 2 } },
      { selector: 'edge.gw-3', style: { 'width': 3 } },
      { selector: 'edge.gw-4', style: { 'width': 4 } },
      { selector: 'edge.gw-6', style: { 'width': 6 } },
      { selector: 'edge.gw-8', style: { 'width': 8 } },
      { selector: 'edge:active', style: { 'overlay-opacity': 0.12, 'overlay-padding': 6 } },
      { selector: 'edge.edg-hi', style: {
        'underlay-color': '#f59e0b', 'underlay-opacity': 0.35, 'underlay-padding': 5
      } },
      { selector: '.hidden', style: { 'display': 'none' } },
      { selector: 'node.sel', style: {
        'border-color': '#f59e0b', 'border-width': 5,
        'background-color': '#fef3c7', 'z-index': 120
      } },
      { selector: 'node.fresh', style: { 'border-color': '#2563eb', 'border-width': 5 } },
      // H+Click: il nodo e i suoi collegamenti diretti restano in evidenza,
      // tutto il resto viene attenuato
      { selector: 'node.dim', style: { 'opacity': 0.13, 'text-opacity': 0.13 } },
      { selector: 'edge.dim', style: { 'opacity': 0.05 } },
      { selector: 'node.foc', style: {
        'border-color': '#7c3aed', 'border-width': 5, 'z-index': 140
      } },
      { selector: 'node.foc-src', style: {
        'border-color': '#6d28d9', 'border-width': 7,
        'background-color': '#ede9fe', 'z-index': 150
      } },
      { selector: 'edge.foc', style: {
        'line-color': '#7c3aed', 'target-arrow-color': '#7c3aed', 'source-arrow-color': '#7c3aed',
        'width': 4, 'opacity': 1, 'z-index': 140
      } },
      // i nodi con nota NON cambiano più aspetto (niente contorno giallo):
      // la nota resta nel tooltip, nella scheda e nella ricerca.
      { selector: 'node.path', style: { 'border-color': '#10b981', 'border-width': 5, 'z-index': 110 } },
      { selector: 'edge.path', style: {
        'line-color': '#10b981', 'target-arrow-color': '#10b981', 'source-arrow-color': '#10b981',
        'line-style': 'solid', 'width': 4, 'opacity': 1, 'z-index': 110
      } },
      { selector: 'node.path.sel', style: { 'border-color': '#f59e0b', 'border-width': 6, 'background-color': '#d1fae5', 'z-index': 125 } },
      { selector: 'node.path-hi', style: { 'border-color': '#0ea5e9', 'border-width': 7, 'z-index': 130 } },
      { selector: 'edge.path-hi', style: {
        'line-color': '#0ea5e9', 'target-arrow-color': '#0ea5e9', 'source-arrow-color': '#0ea5e9',
        'width': 6, 'opacity': 1, 'z-index': 130
      } }
    ]
  });

  cy.nodes().forEach(n => { if (n.data('note')) n.addClass('noted'); });
  buildDegFilter();
  buildCatFilters();
  buildLegend();
  if ($('#openMode')) $('#openMode').value = openMode;   // ripristina la scelta salvata
  syncHiddenBtn();
  syncDegOnlyBtn();
  refresh(false);            // all'avvio: grafo vuoto
  upgradeBrandIcons();
  refreshViews();            // popola la tendina delle viste salvate
  loadSrcStatus();           // stato dell'indice delle fonti documentali

  cy.on('tap', 'node', e => {
    const oe = e.originalEvent;
    if (oe && oe.altKey) {                       // Alt+Click = apri profilo social
      const r = openSocial(e.target);
      const s = $('#stat');
      if (r.ok && r.mode === 'copy') s.textContent = t('stat.linkCopied', { url: r.url });
      else if (r.ok) s.textContent = t('stat.profileOpened', { url: r.url });
      else if (r.reason === 'no-handle') s.textContent = t('stat.noHandle');
      else s.textContent = t('stat.notSocial');
      return;
    }
    if (nDown) { hideNode(e.target); return; }      // N+Click = nascondi il nodo
    if (hDown) { toggleFocus(e.target); return; }   // H+Click = evidenzia i collegamenti
    clearFocus(true);                                // click normale: vista piena
    if (oe && (oe.ctrlKey || oe.metaKey || oe.shiftKey)) toggleSel(e.target);
    else toggleExpand(e.target);
  });
  cy.on('cxttap', 'node', e => { hideTip(); openModal(e.target); });
  // riquadro di selezione: i nodi racchiusi si AGGIUNGONO alla selezione
  // dell'app (la stessa di Ctrl+Click, usata da percorsi e "Collega")
  let boxed = [];
  cy.on('boxselect', 'node', e => { boxed.push(e.target); });
  cy.on('boxend', () => setTimeout(() => {
    let n = 0;
    boxed.forEach(node => {
      if (node.hasClass('hidden') || selected.has(node.id())) return;
      selected.add(node.id()); node.addClass('sel'); n++;
    });
    boxed = [];
    cy.elements().unselect();              // la selezione "vera" è quella dell'app
    if (n) {
      renderSel(); refresh(false);
      $('#stat').textContent = t('stat.boxSelected', { n, tot: selected.size });
    }
  }, 0));
  // trascinando un nodo selezionato si spostano con lui tutti gli altri
  // selezionati (la selezione dell'app non e' quella di Cytoscape, che
  // altrimenti lo farebbe da solo)
  let group = null;                        // { grabbed, last: {x,y}, others }
  cy.on('grab', 'node', e => {
    const n = e.target;
    group = null;
    if (!selected.has(n.id()) || selected.size < 2) return;
    const others = cy.collection();
    selected.forEach(id => {
      const m = cy.getElementById(id);
      if (id !== n.id() && m.length && !m.hasClass('hidden') && !m.locked()) others.merge(m);
    });
    if (others.length) group = { grabbed: n, last: { ...n.position() }, others };
  });
  cy.on('drag', 'node', e => {
    if (!group || e.target !== group.grabbed) return;
    const p = e.target.position();
    const dx = p.x - group.last.x, dy = p.y - group.last.y;
    group.last = { x: p.x, y: p.y };
    if (dx || dy) group.others.positions(m => {
      const q = m.position();
      return { x: q.x + dx, y: q.y + dy };
    });
  });
  cy.on('free', 'node', () => {
    if (group) group.others.forEach(m => placed.add(m.id()));
    group = null;
  });
  // tasto destro su un collegamento: nome, frecce, colore, linea…
  cy.on('cxttap', 'edge', e => { hideTip(); openEdgeModal(e.target); });
  cy.on('mouseover', 'edge', e => showEdgeTip(e.target));
  cy.on('mousemove', 'edge', e => moveTip(e));
  cy.on('mouseout', 'edge', hideTip);
  cy.on('tap', e => {
    if (e.target === cy) {
      cy.elements().removeClass('path-hi');
      clearFocus();                                  // click sullo sfondo: vista piena
      hideResults();
      // click sullo sfondo SENZA Ctrl/Cmd/Shift: si perde tutta la selezione
      // (con il modificatore premuto la selezione resta, come nel riquadro)
      const oe = e.originalEvent;
      if (selected.size && !(oe && (oe.ctrlKey || oe.metaKey || oe.shiftKey))) clearSel();
    }
  });
  cy.on('mouseover', 'node', e => showTip(e.target));
  cy.on('mousemove', 'node', e => moveTip(e));
  cy.on('mouseout', 'node', hideTip);
  cy.on('drag zoom pan', () => { hideTip(); hideCtxMenu(); });
  // tasto destro sullo sfondo: menu con «Nuovo nodo»
  cy.on('cxttap', e => {
    if (e.target !== cy) return;
    hideTip();
    const oe = e.originalEvent;
    showCtxMenu(oe ? oe.clientX : 0, oe ? oe.clientY : 0);
  });

  $('#stat').textContent = t('stat.ready', { n: cy.nodes().length });
}

/* ================= RICERCA ================= */
let lastMatches = [];
let DIST = new Map();

/* Distanza di Levenshtein limitata: restituisce max+1 se supera la soglia */
function lev(a, b, max) {
  if (a === b) return 0;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  if (!la) return lb; if (!lb) return la;
  let prev = new Array(lb + 1), cur = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    const from = Math.max(1, i - max), to = Math.min(lb, i + max);
    if (from > 1) cur[from - 1] = max + 1;
    let best = max + 1;
    for (let j = from; j <= to; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < best) best = cur[j];
    }
    for (let j = to + 1; j <= lb; j++) cur[j] = max + 1;
    if (best > max) return max + 1;
    const t = prev; prev = cur; cur = t;
  }
  return prev[lb];
}

/* Nodi che contengono una parola entro distanza max dal termine.
   Scorre il vocabolario globale (parole uniche del grafo), non i nodi:
   il costo non dipende dal numero di nodi ma da quello delle parole distinte. */
function termHits(term, max) {
  const hit = new Map();
  for (const it of INDEX) if (it.hay.includes(term)) hit.set(it.id, 0);   // esatti
  // il vocabolario è tokenizzato: confronta senza punteggiatura ai bordi (+39, "mario,"...)
  const t = term.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') || term;
  for (const [w, ids] of VOCAB) {
    if (Math.abs(w.length - t.length) > max) continue;
    const d = lev(t, w, max);
    if (d > max) continue;
    for (const id of ids) {
      const p = hit.get(id);
      if (p === undefined || d < p) hit.set(id, d);
    }
  }
  return hit;
}

/* Intersezione dei termini: un nodo è valido solo se li soddisfa tutti */
function fuzzySearch(terms, max) {
  let acc = null;
  for (const t of terms) {
    const hit = termHits(t, max);
    if (acc === null) acc = hit;
    else {
      const next = new Map();
      for (const [id, d] of hit) {
        const p = acc.get(id);
        if (p !== undefined) next.set(id, p + d);
      }
      acc = next;
    }
    if (!acc.size) break;
  }
  return [...(acc || new Map())].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
}

/* Riallinea l'indice di ricerca di un nodo (usato dopo aver salvato una nota,
   così il testo della nota è cercabile senza ricaricare la pagina). */
function reindexNode(node) {
  const d = node.data();
  const it = INDEX.find(x => x.id === d.id);
  if (!it) return;
  const base = `${d.label} ${d.id} ${d.platform} ${d.ntype} ${d.roman || ''} ` +
               `${d.script || ''} ${(d.aliases || []).join(' ')} ${(d.alias_ids || []).join(' ')} ` +
               `${d.note || ''}`;
  // conserva la parte "schede" già indicizzata, sostituendo solo l'intestazione
  const tail = it.hay.slice(it.headLen || 0);
  const head = base.toLowerCase();
  it.headLen = head.length;
  it.hay = (head + tail).slice(0, 20000);
  // vocabolario: aggiunge le parole della nota per la ricerca approssimata
  const toks = String(d.note || '').toLowerCase().match(TOKEN_RE);
  if (toks) {
    for (const w of new Set(toks)) {
      if (w.length < 2 || w.length > 40) continue;
      let post = VOCAB.get(w);
      if (!post) { post = []; VOCAB.set(w, post); }
      if (!post.includes(d.id)) post.push(d.id);
    }
  }
}

function searchNodes(q) {
  const list = $('#search-results');
  if (!list) return;
  const query = q.trim();
  if (!cy || !query) { list.innerHTML = ''; DIST = new Map(); hideResults(); return; }
  // servono almeno 3 caratteri: con 1-2 i risultati sarebbero migliaia
  if (query.length < MIN_SEARCH) {
    DIST = new Map(); lastMatches = [];
    list.innerHTML = `<li class="no-res">${esc(t('search.minChars', { n: MIN_SEARCH }))}</li>`;
    list.style.display = 'block';
    return;
  }

  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const fuzzy = $('#fuzzy') && $('#fuzzy').checked;
  const maxD = parseInt(($('#fuzzyLevel') && $('#fuzzyLevel').value) || '1', 10);
  const ids = [];

  if (!fuzzy) {
    for (const it of INDEX) {
      let ok = true;
      for (const t of terms) { if (!it.hay.includes(t)) { ok = false; break; } }
      if (ok) ids.push(it.id);
    }
  } else {
    const scored = fuzzySearch(terms, maxD);
    DIST = new Map(scored);
    scored.forEach(([id]) => ids.push(id));
  }

  // ordina i risultati per nome (crescente). Con la ricerca approssimata
  // i più simili restano in cima (distanza), a parità di distanza è alfabetico.
  const labelOf = id => {
    const n = cy.getElementById(id);
    return n.length ? String(n.data('label') || '') : '';
  };
  const byName = (a, b) => labelOf(a).localeCompare(labelOf(b), undefined,
                                                    { sensitivity: 'base', numeric: true });
  if (fuzzy) ids.sort((a, b) => (DIST.get(a) - DIST.get(b)) || byName(a, b));
  else ids.sort(byName);

  lastMatches = ids;

  list.innerHTML = '';
  if (!ids.length) {
    list.innerHTML = `<li class="no-res">${esc(t('search.noRes'))}</li>`;
    list.style.display = 'block';
    return;
  }

  const frag = document.createDocumentFragment();
  ids.slice(0, 80).forEach(id => {
    const n = cy.getElementById(id);
    if (!n.length) return;
    const li = document.createElement('li');
    li.dataset.id = id;
    if (visibleNodes.has(id)) li.classList.add('added');
    const d = DIST.get(id);
    li.innerHTML = `<img src="${n.data('icon')}" alt=""><span>${esc(n.data('label'))}</span>` +
      (d ? `<em class="dist">~${d}</em>` : '') + `<small>${esc(n.data('ntype'))}</small>`;
    frag.appendChild(li);
  });
  list.appendChild(frag);

  const foot = document.createElement('li');
  foot.className = 'res-foot';
  foot.textContent = t('search.foot', { n: ids.length });
  list.appendChild(foot);
  list.style.display = 'block';
}

// Delegation: i risultati restano cliccabili anche dopo nuove ricerche
on('#search-results', 'click', e => {
  e.stopPropagation();
  if (e.target.closest('li.res-foot')) { showAllMatches(); return; }
  const li = e.target.closest('li[data-id]');
  if (!li) return;
  addToGraph([li.dataset.id], true);
  li.classList.add('added');
});

function hideResults() {
  const l = $('#search-results');
  if (l) l.style.display = 'none';
}

/* Aggiunge nodi al grafo SENZA rimuovere quelli già presenti */
function addToGraph(ids, focus) {
  if (!cy || !ids || !ids.length) return;
  const fresh = ids.filter(id => !visibleNodes.has(id) && cy.getElementById(id).length);
  ids.forEach(id => { if (cy.getElementById(id).length) visibleNodes.add(id); });
  unhide(ids);                       // aggiungere a mano vince su un nascondimento
  refresh(true);

  const want = new Set(ids);
  const eles = cy.nodes().filter(n => want.has(n.id()) && !n.hasClass('hidden'));
  if (!eles.length) return;

  cy.nodes('.fresh').removeClass('fresh');
  eles.addClass('fresh');
  setTimeout(() => eles.removeClass('fresh'), 1600);

  if (focus) bringIntoView(eles);
  const s = $('#stat');
  if (s && !fresh.length) s.textContent += t('stat.alreadyThere');
}

/* Limita lo zoom dopo un fit automatico (evita nodi giganteschi) */
function capZoom(max = 1.5) {
  try {
    if (cy.zoom() > max) cy.zoom({ level: max, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  } catch (_) {}
}

/* Porta i nodi nella vista muovendo la camera il meno possibile */
function bringIntoView(eles) {
  const bb = eles.boundingBox();
  const ext = cy.extent();
  const inside = bb.x1 >= ext.x1 && bb.x2 <= ext.x2 && bb.y1 >= ext.y1 && bb.y2 <= ext.y2;
  if (inside) return;
  const z = cy.zoom();
  const w = cy.width(), h = cy.height();
  const cx = (bb.x1 + bb.x2) / 2, cyy = (bb.y1 + bb.y2) / 2;
  cy.animate({ pan: { x: w / 2 - cx * z, y: h / 2 - cyy * z } }, { duration: 350 });
}

function showAllMatches() {
  if (!lastMatches.length) return;
  addToGraph(lastMatches.slice(0, 300), true);
  const l = $('#search-results');
  if (l) l.querySelectorAll('li[data-id]').forEach(li => li.classList.add('added'));
}

/* ================= VISIBILITÀ & ESPANSIONE ================= */
function nbhd(node, depth) {
  let set = cy.collection().union(node);
  for (let i = 0; i < depth; i++) set = set.union(set.neighborhood('node'));
  return set;
}

function visibleSet() {
  const vis = new Set(visibleNodes);
  const d = depthVal();
  expanded.forEach(id => {
    const n = cy.getElementById(id);
    if (!n.length) return;
    vis.add(id);
    nbhd(n, d).forEach(m => vis.add(m.id()));
  });
  selected.forEach(id => vis.add(id));
  pinned.forEach(id => vis.add(id));
  // Filtro "Collegamenti": rivela i nodi con ESATTAMENTE N collegamenti,
  // insieme ai nodi a cui sono collegati (altrimenti apparirebbero isolati)
  computeDegReveal();
  degReveal.forEach(id => vis.add(id));
  return vis;
}

/* Insieme dei nodi mostrati dal filtro sul numero di collegamenti:
   quelli con grado esatto + i loro vicini diretti. */
let degReveal = new Set();
let degOnly = false;          // true = solo i nodi con quel grado, senza i vicini
function computeDegReveal() {
  degReveal = new Set();
  if (!cy || !degFilter) return;
  cy.nodes().forEach(n => {
    if ((n.data('deg') || 0) !== degFilter) return;
    degReveal.add(n.id());
    if (!degOnly) n.neighborhood('node').forEach(m => degReveal.add(m.id()));
  });
}

/* Il pulsante "nascondi/mostra gli altri" ha senso solo a filtro attivo. */
function syncDegOnlyBtn() {
  const b = $('#degOnly');
  if (!b) return;
  b.hidden = !degFilter;
  b.textContent = degOnly ? t('btn.showOthers') : t('btn.hideOthers');
  b.classList.toggle('on', degOnly);
}

function allowed(n) {
  const id = n.id();
  if (hiddenNodes.has(id)) return false;      // nascosto a mano (N+Click)
  if (catHidden.has(id)) return false;        // categoria spenta dai pulsanti
  if (pathOnly && pinned.size) return pinned.has(id) || selected.has(id);
  // filtro "Collegamenti" attivo: decide SOLO lui, anche sui nodi gia' nella
  // vista (altrimenti il filtro aggiungerebbe nodi senza mai toglierne, e
  // "Nascondi gli altri" non avrebbe effetto)
  if (degFilter > 0) return degReveal.has(id);
  // NB: le categorie NON sono un filtro permanente: si applicano su richiesta
  // al grafo visibile (pulsante "Applica"). Così espandere un nodo mostra
  // sempre tutti i suoi collegamenti, senza vincoli di categoria.
  if (visibleNodes.has(id) || selected.has(id) || pinned.has(id)) return true;
  if (!showIds && n.data('ident')) return false;
  return true;
}

function refresh(doLayout = false) {
  if (!cy) return;
  const vis = visibleSet();
  const freshIds = [];

  cy.batch(() => {
    cy.nodes().forEach(n => {
      const show = vis.has(n.id()) && allowed(n);
      n.toggleClass('hidden', !show);
      n.toggleClass('exp', expanded.has(n.id()));
      if (show && !placed.has(n.id())) freshIds.push(n.id());
    });
    cy.edges().forEach(e => {
      const s = cy.getElementById(e.data('source'));
      const t = cy.getElementById(e.data('target'));
      let ok = s.length && t.length && !s.hasClass('hidden') && !t.hasClass('hidden');
      e.toggleClass('hidden', !ok);
    });
  });

  applyGStyle();          // stile scelto per tutti i collegamenti
  // NB: nessun layout globale e nessun movimento di camera: espandendo un nodo
  // si posizionano soltanto i nuovi nodi, tutto il resto resta dov'è
  if (doLayout && freshIds.length) placeFresh(freshIds);

  if (focusId) applyFocus();     // l'evidenziazione segue i nodi ora visibili
  refreshStat();
}

/* Riga di stato con il conteggio dei nodi visibili. */
function refreshStat() {
  if (!cy) return;
  const c = cy.nodes().not('.hidden').length;
  $('#stat').textContent = t('stat.visible', { v: c, t: cy.nodes().length, e: expanded.size });
}

/* Un'azione esplicita dell'utente (espansione, aggiunta) ha la precedenza sui
   nascondimenti fatti prima: i nodi coinvolti tornano visibili. Così i filtri
   per categoria non vincolano le operazioni successive. */
function unhide(ids) {
  let n = 0;
  ids.forEach(id => {
    if (hiddenNodes.delete(id)) n++;
    catHidden.delete(id);            // un'azione esplicita vince anche sulle categorie spente
  });
  if (n) syncHiddenBtn();
}

/* Clic su un nodo: il primo espande (mostra i suoi collegamenti), il secondo
   contrae. Contrarre nasconde i vicini che si vedevano per via di questa
   espansione, anche se erano stati aggiunti in altro modo (ricerca, importazione);
   restano quelli espansi a loro volta, quelli vicini a un altro nodo espanso,
   quelli selezionati e il nodo al centro dell'evidenziazione. */
function toggleExpand(node) {
  if (!cy || !node) return;
  const id = node.id();
  visibleNodes.add(id);              // il nodo resta sul grafo anche dopo il collasso
  if (expanded.has(id)) {
    expanded.delete(id);
    const keep = new Set([id]);
    expanded.forEach(eid => {
      const en = cy.getElementById(eid);
      if (en.length) nbhd(en, depthVal()).forEach(m => keep.add(m.id()));
    });
    nbhd(node, depthVal()).forEach(m => {
      const mid = m.id();
      if (keep.has(mid) || selected.has(mid) || mid === focusId) return;
      visibleNodes.delete(mid);
      placed.delete(mid);            // alla prossima espansione si ridispone attorno al nodo
    });
  } else {
    expanded.add(id);
    // espandere significa "voglio vedere i suoi collegamenti", tutti
    unhide([id, ...nbhd(node, depthVal()).map(m => m.id())]);
  }
  refresh(true);
}

/* ================= LAYOUT ================= */
/* Posiziona SOLO i nodi nuovi, in corona attorno al nodo da cui nascono.
   Nessun layout globale, nessun movimento dei nodi esistenti, camera ferma. */
function placeFresh(freshIds) {
  // ingombri già occupati dai nodi visibili e posizionati
  const busy = [];
  cy.nodes().not('.hidden').forEach(n => {
    if (placed.has(n.id())) {
      const p = n.position();
      busy.push({ x: p.x, y: p.y, r: (n.data('size') || 24) / 2 + 26 });
    }
  });
  const free = (x, y, rad) =>
    busy.every(p => (p.x - x) ** 2 + (p.y - y) ** 2 > (p.r + rad) ** 2);
  const put = (id, x, y) => {
    const n = cy.getElementById(id);
    n.position({ x, y });
    busy.push({ x, y, r: (n.data('size') || 24) / 2 + 26 });
    placed.add(id);
  };

  // raggruppa i nuovi nodi per nodo di origine (l'ancora già posizionata)
  const groups = new Map();
  const orphans = [];
  freshIds.forEach(id => {
    const n = cy.getElementById(id);
    if (!n.length) return;
    const anch = n.neighborhood('node').filter(m => placed.has(m.id()) && !m.hasClass('hidden'));
    if (anch.length) {
      const a = anch[0].id();
      if (!groups.has(a)) groups.set(a, []);
      groups.get(a).push(id);
    } else orphans.push(id);
  });

  for (const [aid, ids] of groups) {
    const anchor = cy.getElementById(aid);
    const a = anchor.position();
    const base = 120 + (anchor.data('size') || 24);
    const slots = Math.max(ids.length, 6);
    const step = (2 * Math.PI) / slots;
    ids.forEach((id, i) => {
      let done = false;
      for (let ring = 0; ring < 8 && !done; ring++) {
        const rad = base + ring * 75;
        for (let k = 0; k < slots * 2 && !done; k++) {
          const ang = step * i + k * (step / 3) + ring * 0.35;
          const x = a.x + Math.cos(ang) * rad;
          const y = a.y + Math.sin(ang) * rad;
          if (free(x, y, 26)) { put(id, x, y); done = true; }
        }
      }
      if (!done) put(id, a.x + Math.cos(step * i) * (base + 650),
                        a.y + Math.sin(step * i) * (base + 650));
    });
  }

  // nodi senza collegamenti già sul grafo: al centro della vista corrente
  if (orphans.length) {
    const ext = cy.extent();
    const cx = (ext.x1 + ext.x2) / 2, cy0 = (ext.y1 + ext.y2) / 2;
    orphans.forEach((id, i) => {
      const ang = 2.399 * i;                 // angolo aureo: distribuzione uniforme
      let rad = i ? 100 + 26 * i : 0, t = 0;
      let x = cx + Math.cos(ang) * rad, y = cy0 + Math.sin(ang) * rad;
      while (!free(x, y, 26) && t < 60) {
        t++;
        x = cx + Math.cos(ang + t * 0.45) * (rad + t * 28);
        y = cy0 + Math.sin(ang + t * 0.45) * (rad + t * 28);
      }
      put(id, x, y);
    });
  }
}

function runLayout(extra = {}) {
  if (!cy) return;
  const eles = cy.elements().not('.hidden');
  if (!eles.length) return;
  if (eles.nodes().length === 1) { cy.center(eles); placed.add(eles.nodes()[0].id()); return; }

  const name = curLayout === 'untangle' ? 'fcose' : curLayout;
  const big = eles.nodes().length > 220;
  const opts = Object.assign({
    name,
    animate: !big,
    animationDuration: 380,
    fit: true,
    padding: 60,
    nodeDimensionsIncludeLabels: true,
    randomize: curLayout === 'untangle',
    idealEdgeLength: 110,
    nodeRepulsion: 9000,
    numIter: big ? 1200 : 2500,
    quality: big ? 'draft' : 'default'
  }, extra);
  if (name === 'breadthfirst') { opts.directed = false; opts.spacingFactor = 1.3; }
  if (opts.fit) opts.stop = () => capZoom();
  if (name !== 'fcose') delete opts.fixedNodeConstraint;

  try {
    cy.stop();
    eles.layout(opts).run();
  } catch (err) {
    console.warn('layout fallback', err);
    eles.layout({ name: 'cose', animate: false, fit: true, padding: 60 }).run();
  }
  eles.nodes().forEach(n => placed.add(n.id()));
}

/* ================= RIDUCI INCROCI =================
   fcose (come "Organico") non minimizza gli incroci: ripetendo la disposizione
   con semi diversi e tenendo quella con meno archi che si intersecano si ottiene
   un grafo molto più leggibile e in modo stabile. */
let untangling = false;

/* Segmenti degli archi visibili (in coordinate del modello). */
function edgeSegs() {
  const segs = [];
  cy.edges().not('.hidden').forEach(e => {
    const a = e.source(), b = e.target();
    if (a.empty() || b.empty()) return;
    const p = a.position(), q = b.position();
    segs.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y, s: e.data('source'), t: e.data('target') });
  });
  return segs;
}

/* Due segmenti si incrociano? Gli archi che condividono un nodo non contano. */
function crosses(p, q) {
  if (p.s === q.s || p.s === q.t || p.t === q.s || p.t === q.t) return false;
  const sgn = (ax, ay, bx, by, cx, cy) => Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
  const d1 = sgn(p.x1, p.y1, p.x2, p.y2, q.x1, q.y1);
  const d2 = sgn(p.x1, p.y1, p.x2, p.y2, q.x2, q.y2);
  const d3 = sgn(q.x1, q.y1, q.x2, q.y2, p.x1, p.y1);
  const d4 = sgn(q.x1, q.y1, q.x2, q.y2, p.x2, p.y2);
  return d1 !== d2 && d3 !== d4;
}

function countCrossings() {
  const s = edgeSegs();
  let c = 0;
  for (let i = 0; i < s.length; i++)
    for (let j = i + 1; j < s.length; j++)
      if (crosses(s[i], s[j])) c++;
  return c;
}

/* Un singolo passaggio fcose ad alta qualità, senza animazione: la Promise si
   risolve a layout finito così si possono confrontare più tentativi. */
function fcoseOnce(extra = {}) {
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const eles = cy.elements().not('.hidden');
    // Parametri "puliti": fcose non minimizza gli incroci, quindi conta poco
    // strapazzarlo (packing/tiling peggiorano); il guadagno vero è tenere il
    // migliore di molti tentativi randomizzati.
    const lay = eles.layout(Object.assign({
      name: 'fcose',
      animate: false,
      fit: false,
      randomize: true,
      quality: 'default',
      nodeDimensionsIncludeLabels: true,
      idealEdgeLength: 110,
      nodeRepulsion: 9000,
      numIter: 2500
    }, extra));
    lay.one('layoutstop', finish);
    lay.run();
    setTimeout(finish, 6000);            // rete di sicurezza: mai bloccarsi
  });
}

function snapshotPos() {
  const m = new Map();
  cy.nodes().not('.hidden').forEach(n => { const p = n.position(); m.set(n.id(), { x: p.x, y: p.y }); });
  return m;
}
function restorePos(m) {
  cy.batch(() => m.forEach((p, id) => { const n = cy.getElementById(id); if (n.length) n.position(p); }));
}

async function untangle() {
  if (!cy || untangling) return;
  const eles = cy.elements().not('.hidden');
  const nN = eles.nodes().length, nE = eles.edges().length;
  if (nN < 3) { runLayout({ fit: true }); return; }

  untangling = true;
  const btn = $('#lyUntangle');
  const label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '✂ …'; }
  curLayout = 'fcose';
  await new Promise(r => setTimeout(r, 0));    // fa dipingere lo stato "in corso" prima del calcolo

  try {
    cy.stop();
    // Un passaggio fcose blocca il thread (è sincrono): su centinaia di nodi
    // la qualità 'default' impiega qualche secondo, quindi oltre una soglia si
    // passa a 'draft' (rapida) per non congelare la UI. Ogni passaggio è molto
    // variabile: si ripete finché resta tempo e si tiene quello con meno incroci.
    const quality = nN > 1200 ? 'draft' : 'default';   // oltre ~1200 nodi 'default' rischia lunghi blocchi
    const numIter = nN > 1200 ? 1000 : 2500;
    const measure = nE <= 5000;                  // il conteggio O(E²) resta a buon mercato
    // Ogni tentativo blocca il thread: sui grafi grandi dura ~3s, quindi il
    // budget basso li limita a pochi passaggi (lì la varianza è bassa e non
    // servono); su quelli piccoli (~250ms/tentativo) ne restano comunque tanti.
    const budgetMs = 4000;
    const maxRuns = 16;
    let best = null, bestC = Infinity, k = 0;
    const start = performance.now();

    do {
      await fcoseOnce({ quality, numIter, idealEdgeLength: 100 + (k % 3) * 30 });
      k++;
      const c = measure ? countCrossings() : 0;
      if (c < bestC) { bestC = c; best = snapshotPos(); }
      if (!measure || bestC === 0) break;        // grafo enorme (niente misura) o già perfetto
      await new Promise(r => setTimeout(r));      // cede il thread alla UI tra un tentativo e l'altro
    } while (k < maxRuns && performance.now() - start < budgetMs);

    if (best) restorePos(best);
    eles.nodes().forEach(n => placed.add(n.id()));

    cy.fit(eles, 60);
    capZoom();
    const s = $('#stat');
    if (s) s.textContent = measure
      ? t('stat.untangled', { n: bestC, k })
      : t('stat.untangledBig', { n: nN });
  } catch (err) {
    console.warn('untangle fallback', err);
    runLayout({ fit: true, randomize: true });
  } finally {
    untangling = false;
    if (btn) { btn.disabled = false; btn.textContent = label || t('ly.untangle'); }
  }
}

function setLayout(kind, btnId) {
  curLayout = kind;
  document.querySelectorAll('.ly').forEach(b => b.classList.remove('on'));
  const b = $(btnId);
  if (b) b.classList.add('on');
  runLayout({ fit: true });
}

/* ================= TOOLTIP ================= */
function showTip(n) {
  const box = $('#tip');
  if (!box || !n) return;
  const d = n.data();
  const openable = /^https?:\/\//i.test(d.url || '') ||
                   (SOCIAL_URL[d.platform] && socialHandle(d));
  const hint = openable ? `<u>${esc(t('tip.altclick'))}</u>` : '';
  // la nota del nodo, se presente, compare in evidenza nel tooltip
  const note = d.note
    ? `<div class="tip-note"><b>${esc(t('card.note'))}</b>${esc(d.note)}</div>` : '';
  box.innerHTML = `<small>${esc(d.ntype)} · ${esc(d.platform)}</small><b>${esc(d.label)}</b>` +
    `<i>${d.deg} ${esc(t('card.links'))}</i>${note}${hint}`;
  box.style.display = 'block';
}
const ARROW_SYM = { none: '—', target: '→', source: '←', both: '↔' };
function showEdgeTip(e) {
  const box = $('#tip');
  if (!box || !e) return;
  const d = e.data();
  const s = e.source().data('label'), tg = e.target().data('label');
  box.innerHTML = `<small>${esc(t('edge.tipKind'))}${d.rel ? ' · ' + esc(d.rel) : ''}</small>` +
    (d.label ? `<b>${esc(d.label)}</b>` : '') +
    `<i>${esc(s)} ${ARROW_SYM[d.arrow || 'none']} ${esc(tg)}</i>` +
    `<u>${esc(t('edge.tipHint'))}</u>`;
  box.style.display = 'block';
}
function moveTip(e) {
  const box = $('#tip');
  if (!box || !e.originalEvent) return;
  box.style.left = (e.originalEvent.clientX + 15) + 'px';
  box.style.top = (e.originalEvent.clientY + 15) + 'px';
}
const hideTip = () => { const box = $('#tip'); if (box) box.style.display = 'none'; };

/* ================= SELEZIONE ================= */
function toggleSel(node) {
  const id = node.id();
  if (selected.has(id)) { selected.delete(id); node.removeClass('sel'); }
  else { selected.add(id); node.addClass('sel'); visibleNodes.add(id); }
  renderSel();
  refresh(false);
}

function renderSel() {
  const cnt = $('#selcount'), lst = $('#sellist'), fp = $('#findpath');
  if (cnt) cnt.textContent = selected.size;
  if (fp) fp.disabled = selected.size < 2;
  const lk = $('#linknodes');
  if (lk) lk.disabled = selected.size < 2;
  if (!lst) return;
  lst.innerHTML = [...selected].map(id => {
    const n = cy.getElementById(id);
    return `<li><img src="${n.data('icon')}" alt=""><span>${esc(n.data('label'))}</span><b data-id="${id}">✕</b></li>`;
  }).join('');
}
on('#sellist', 'click', e => {
  if (e.target.tagName === 'B') toggleSel(cy.getElementById(e.target.dataset.id));
});

function clearSel() {
  selected.forEach(id => cy.getElementById(id).removeClass('sel'));
  selected.clear();
  renderSel();
  refresh(false);
}

function clearHl() {
  if (!cy) return;
  cy.elements().removeClass('path').removeClass('path-hi');
  pinned.clear();
  const pi = $('#pathinfo');
  if (pi) pi.textContent = '';
  pathOnly = false;
  const po = $('#pathonly');
  if (po) { po.hidden = true; po.classList.remove('on'); po.textContent = t('btn.hideRest'); }
  refresh(false);
}

/* ================= PERCORSI (TUTTI) ================= */
const MAX_PATHS_PAIR = 400;   // limite percorsi per coppia
const MAX_STEPS = 400000;     // limite passi DFS (anti-freeze)

// Adiacenza precalcolata: enumerare i percorsi con l'API di Cytoscape è troppo lento
let ADJ = null;
function buildAdj() {
  ADJ = new Map();
  cy.nodes().forEach(n => ADJ.set(n.id(), []));
  cy.edges().forEach(e => {
    const s = e.data('source'), t = e.data('target');
    if (s === t || !ADJ.has(s) || !ADJ.has(t)) return;
    ADJ.get(s).push(t);
    ADJ.get(t).push(s);
  });
}

/* Tutti i percorsi semplici src→dst entro maxHops archi.
   Pruning bidirezionale: si esplora solo chi può ancora arrivare a dst. */
function allSimplePaths(srcId, dstId, maxHops) {
  if (!ADJ) buildAdj();
  if (srcId === dstId || !ADJ.has(srcId) || !ADJ.has(dstId)) return [];

  // distanza BFS da dst (limitata a maxHops)
  const dist = new Map([[dstId, 0]]);
  let frontier = [dstId];
  for (let d = 1; d <= maxHops && frontier.length; d++) {
    const next = [];
    for (const id of frontier) {
      for (const m of ADJ.get(id)) {
        if (!dist.has(m)) { dist.set(m, d); next.push(m); }
      }
    }
    frontier = next;
  }
  const d0 = dist.get(srcId);
  if (d0 === undefined || d0 > maxHops) return [];

  const paths = [];
  const stack = [srcId];
  const onPath = new Set([srcId]);
  let steps = 0;

  (function dfs(cur, hopsLeft) {
    if (paths.length >= MAX_PATHS_PAIR || steps > MAX_STEPS) return;
    if (cur === dstId) { paths.push(stack.slice()); return; }
    if (hopsLeft === 0) return;
    for (const nid of ADJ.get(cur)) {
      if (paths.length >= MAX_PATHS_PAIR || ++steps > MAX_STEPS) return;
      if (onPath.has(nid)) continue;
      const d = dist.get(nid);
      if (d === undefined || d > hopsLeft - 1) continue;   // non arriverebbe mai a dst
      onPath.add(nid); stack.push(nid);
      dfs(nid, hopsLeft - 1);
      stack.pop(); onPath.delete(nid);
    }
  })(srcId, maxHops);

  return paths;
}

function findPath() {
  if (!cy || selected.size < 2) return;
  clearHl();
  buildAdj();

  const maxHops = parseInt(($('#maxHops') && $('#maxHops').value) || '4', 10);
  const ids = [...selected];
  const all = [];
  let truncated = false;

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const ps = allSimplePaths(ids[i], ids[j], maxHops);
      if (ps.length >= MAX_PATHS_PAIR) truncated = true;
      all.push(...ps);
    }
  }

  if (!all.length) {
    $('#pathinfo').innerHTML = t('path.none', { n: maxHops });
    return;
  }

  // Evidenzia TUTTI i percorsi trovati (unione di nodi e archi)
  const nodeIds = new Set();
  const edgeIds = new Set();
  all.forEach(p => {
    p.forEach(id => nodeIds.add(id));
    for (let k = 0; k < p.length - 1; k++) {
      cy.getElementById(p[k]).edgesWith(cy.getElementById(p[k + 1])).forEach(e => edgeIds.add(e.id()));
    }
  });

  cy.batch(() => {
    nodeIds.forEach(id => { pinned.add(id); cy.getElementById(id).addClass('path'); });
    edgeIds.forEach(id => cy.getElementById(id).addClass('path'));
  });
  selected.forEach(id => cy.getElementById(id).addClass('sel'));

  const po = $('#pathonly');
  if (po) { po.hidden = false; po.textContent = pathOnly ? t('btn.showRest') : t('btn.hideRest'); }

  refresh(true);
  cy.fit(cy.elements().not('.hidden'), 60);
  capZoom(1.6);

  all.sort((a, b) => a.length - b.length);
  const lbl = id => cy.getElementById(id).data('label') || id;
  const rows = all.slice(0, 25).map(p =>
    `<div class="p-row" data-path="${esc(p.join('|'))}">${p.map(lbl).map(esc).join(' → ')}</div>`).join('');

  $('#pathinfo').innerHTML =
    t('path.found', { n: all.length, tr: truncated ? t('path.truncated') : '',
                      nodes: nodeIds.size, edges: edgeIds.size }) +
    `<div class="p-list">${rows}${all.length > 25
      ? `<div class="p-more">${esc(t('path.more', { n: all.length - 25 }))}</div>` : ''}</div>`;
}

// Passaggio del mouse su un percorso dell'elenco: lo mette in risalto sul grafo
on('#pathinfo', 'mouseover', e => {
  const row = e.target.closest('.p-row');
  if (!row || !cy) return;
  const ids = row.dataset.path.split('|');
  cy.elements().removeClass('path-hi');
  cy.batch(() => {
    ids.forEach((id, i) => {
      cy.getElementById(id).addClass('path-hi');
      if (i) cy.getElementById(ids[i - 1]).edgesWith(cy.getElementById(id)).addClass('path-hi');
    });
  });
});
on('#pathinfo', 'mouseout', e => {
  if (e.target.closest('.p-row') && cy) cy.elements().removeClass('path-hi');
});

/* ================= MODALE ================= */
let modalNode = null;

function openModal(node) {
  if (!node) return;
  modalNode = node;
  const d = node.data();
  const cards = (d.records || []).length;
  $('#modal-ic').src = d.icon;
  const ttl = $('#modal-title');
  ttl.textContent = d.label;
  ttl.className = 'cp';                       // anche il titolo si copia
  ttl.dataset.cp = d.label;
  ttl.title = t('cp.hint');
  $('#modal-sub').textContent =
    `${d.ntype} · ${d.platform} · ${d.deg} ${t('card.links')} · ` +
    (cards === 1 ? t('card.card', { n: cards }) : t('card.cards', { n: cards })) +
    ((d.merged || 1) > 1 ? ' · ' + t('card.merged', { n: d.merged }) : '') +
    (d.renamed ? ' · ' + t('card.renamed') : '');
  $('#modal-body').innerHTML = bodyFor(node);
  $('#modal-exp').textContent = expanded.has(d.id) ? t('modal.collapse') : t('modal.expand');
  if ($('#modal-src')) { $('#modal-src').hidden = true; $('#modal-src-res').innerHTML = ''; }
  if ($('#modal-src-btn')) $('#modal-src-btn').hidden = !srcState.indexed;
  $('#modal').hidden = false;
  $('#modal-body').scrollTop = 0;
}
function closeModal() { $('#modal').hidden = true; modalNode = null; }

/* ---- Nodi collegati, per il riepilogo della scheda ----
   Un target va esplorato a 2 salti (i telefoni non pendono da lui ma
   dall'account); ogni altro nodo si ferma ai collegamenti DIRETTI.
   In ogni caso un nodo target incontrato lungo il cammino non viene mai
   espanso: è un confine, altrimenti si tirerebbe dentro mezzo grafo. */
function collectAround(node, hops = 1) {
  const seen = new Set([node.id()]);
  let frontier = [node];
  const found = [];
  for (let i = 0; i < hops; i++) {
    const next = [];
    frontier.forEach(n => {
      n.neighborhood('node').forEach(m => {
        if (seen.has(m.id())) return;
        seen.add(m.id());
        found.push(m);
        if (m.data('ntype') !== 'target') next.push(m);   // i target non si attraversano
      });
    });
    frontier = next;
    if (!frontier.length) break;
  }
  return found;
}

/* Titolo tradotto di un gruppo di identificativi (per ntype). */
const GROUP_KEYS = ['target', 'phone', 'email', 'username', 'vehicle',
                    'photo', 'latin', 'domain', 'breach', 'link', 'text',
                    'name', 'place', 'generic'];
const groupTitle = nt => nt === 'account' ? t('card.social')
                       : GROUP_KEYS.includes(nt) ? t('grp.' + nt) : nt;

/* Riepilogo raggruppato: prima i social per piattaforma, poi gli altri tipi. */
function groupedSummary(node) {
  // target: 2 salti (telefoni/email pendono dagli account). Altri nodi: solo
  // i collegamenti diretti, altrimenti comparirebbe tutto il vicinato dei target.
  const around = collectAround(node, node.data('ntype') === 'target' ? 2 : 1);
  if (!around.length) return '';

  const isTarget = node.data('ntype') === 'target';
  const socials = {};      // piattaforma -> nodi account
  const others = {};       // ntype -> nodi
  around.forEach(m => {
    const nt = m.data('ntype');
    if (nt === 'account') {
      const p = m.data('platform') || 'generic';
      (socials[p] = socials[p] || []).push(m);
    } else if (nt === 'target') {
      // per un nodo qualsiasi, i target a cui appartiene sono l'informazione
      // più utile; nella scheda di un target, invece, non servono
      if (!isTarget) (others[nt] = others[nt] || []).push(m);
    } else {
      (others[nt] = others[nt] || []).push(m);
    }
  });

  const row = m => {
    const dd = m.data();
    // il nome si copia con un click; la freccia (visibile al passaggio del
    // mouse) porta al nodo nel grafo
    const name = `<span class="g-name cp" data-cp="${esc(dd.label)}" ` +
                 `title="${esc(t('cp.hint'))}">${esc(dd.label)}</span>` +
                 `<button class="g-go" data-goto="${esc(m.id())}" ` +
                 `title="${esc(t('cp.goto'))}">↗</button>`;

    // foto: miniatura visibile (click = ingrandimento)
    if (dd.ntype === 'photo' && dd.image) {
      return `<li class="g-photo"><img class="g-thumb" src="${esc(dd.image)}" ` +
             `loading="lazy" alt="" onerror="this.remove()">${name}</li>`;
    }

    // traslitterazione: termine originale -> forma latina
    if (dd.ntype === 'latin') {
      const orig = m.connectedEdges('[rel="translit"]').connectedNodes()
                    .filter(x => x.id() !== m.id());
      const origLab = orig.length
        ? [...new Set(orig.map(x => x.data('label')))].join(' · ')
        : '';
      const scr = dd.script || (orig.length ? orig[0].data('script') : '');
      return `<li class="g-tr"><span class="g-orig cp" dir="auto" ` +
             `data-cp="${esc(origLab)}" title="${esc(t('cp.hint'))}">${esc(origLab || '—')}</span>` +
             `<span class="g-arrow">→</span>${name}` +
             (scr ? `<em class="g-scr">${esc(scr)}</em>` : '') + '</li>';
    }

    // URL proprio del nodo (link generico) oppure ricostruito dalla piattaforma
    const mk = SOCIAL_URL[dd.platform];
    const hnd = mk ? socialHandle(dd) : '';
    const url = /^https?:\/\//i.test(dd.url || '') ? dd.url : (mk && hnd ? mk(hnd) : '');
    const link = url
      ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`
      : '';
    return `<li>${name} ${link}</li>`;
  };

  const blk = (title, color, list, cls) => {
    list = list.sort((a, b) => String(a.data('label')).localeCompare(String(b.data('label'))));
    return `<div class="g-blk${cls ? ' ' + cls : ''}"><h5><i style="background:${color}"></i>` +
           `${esc(title)} <b>${list.length}</b></h5><ul class="g-list">` +
           list.map(row).join('') + '</ul></div>';
  };
  const byCount = (a, b) => socials[b].length - socials[a].length || a.localeCompare(b);

  const plats = Object.keys(socials);
  const known = plats.filter(p => SOCIAL_URL[p]).sort(byCount);   // social apribili
  const rest = plats.filter(p => !SOCIAL_URL[p]).sort(byCount);   // altri servizi

  let h = `<div class="d-sec g-sum"><h4>${esc(t('card.summary'))}</h4>`;

  if (known.length) {
    h += `<div class="g-cat">${esc(t('card.social'))}</div>`;
    known.forEach(p => { h += blk(p, TYPE_COLOR.account, socials[p], 'g-social'); });
  }

  // tipi non-account (telefoni, email, username, veicoli, foto...)
  const otherTypes = Object.keys(others)
    .sort((a, b) => others[b].length - others[a].length || a.localeCompare(b));
  if (otherTypes.length) {
    h += `<div class="g-cat">${esc(t('card.identifiers'))}</div>`;
    otherTypes.forEach(nt => {
      h += blk(groupTitle(nt), TYPE_COLOR[nt] || TYPE_COLOR.generic, others[nt]);
    });
  }

  if (rest.length) {
    const tot = rest.reduce((s, p) => s + socials[p].length, 0);
    h += `<details class="g-more"><summary>` +
         esc(t('card.otherServices', { p: rest.length, n: tot })) + '</summary>';
    rest.forEach(p => { h += blk(p, TYPE_COLOR.generic, socials[p]); });
    h += '</details>';
  }

  return h + '</div>';
}

/* opts.print = versione per il PDF: niente nuvola di chip con le icone dei
   nodi, restano i riferimenti in forma di elenco/tabella. */
function bodyFor(node, opts = {}) {
  const d = node.data();
  let h = '';

  // Nota dell'utente, ben visibile in cima
  if (d.note) {
    h += `<div class="d-note"><b>${esc(t('card.note'))}</b><div>${esc(d.note).replace(/\n/g, '<br>')}</div></div>`;
  }

  // Etichetta cambiata a mano: si mostra sempre quella dei dati di origine
  if (d.renamed && d.label_orig) {
    h += `<div class="d-ren"><b>${esc(t('card.renamedFrom'))}</b>` +
         `<span class="cp" data-cp="${esc(d.label_orig)}" title="${esc(t('cp.hint'))}">` +
         `${esc(d.label_orig)}</span></div>`;
  }

  // Riepilogo raggruppato: per i target (e per ogni nodo molto collegato)
  if (d.ntype === 'target' || (d.deg || 0) >= 4) {
    h += groupedSummary(node);
  }

  // Etichette alternative dei nodi fusi
  if (d.aliases && d.aliases.length) {
    h += `<div class="d-sec"><h4>${esc(t('card.aliases', { n: d.aliases.length }))}</h4><div class="d-imgs-list">` +
      d.aliases.map(a => `<span class="chip static cp" data-cp="${esc(a)}" ` +
        `title="${esc(t('cp.hint'))}">${esc(a)}</span>`).join('') + '</div></div>';
  }

  // Nuvola dei nodi collegati (con icone): solo a schermo, non nel PDF
  const nbr = node.neighborhood('node');
  if (nbr.length && !opts.print) {
    h += `<div class="d-sec"><h4>${esc(t('card.connectedTo', { n: nbr.length }))}</h4><div class="d-imgs-list">` +
      nbr.map(m => `<span class="chip" data-goto="${esc(m.id())}"><img src="${m.data('icon')}" alt="">${esc(m.data('label'))}</span>`).join('') +
      '</div></div>';
  }

  // TUTTE le schede del nodo (anche quelle provenienti dai nodi fusi)
  const recs = d.records || [];
  if (recs.length) h += `<h4 class="d-count">${esc(recs.length === 1
      ? t('card.card', { n: recs.length }) : t('card.cards', { n: recs.length }))}</h4>`;
  recs.forEach((r, i) => {
    h += '<div class="d-card">';
    h += `<div class="d-badge">${esc(t('card.recordBadge', { i: i + 1, n: recs.length,
      coll: r.collection || t('card.sheet') }))}</div>`;
    if (r.images && r.images.length) {
      h += '<div class="d-imgs">' +
        r.images.slice(0, 12).map(u => `<img src="${esc(u)}" loading="lazy" alt="" onerror="this.remove()">`).join('') +
        '</div>';
    }
    // il valore si copia con un click (comodo per cercare su altri portali)
    h += '<div class="d-grid">' + flatten(r.raw).map(([k, v]) =>
      `<div>${esc(k)}</div><div class="cp" data-cp="${esc(v)}" ` +
      `title="${esc(t('cp.hint'))}">${renderVal(v)}</div>`).join('') + '</div>';
    h += '</div>';
  });

  return h || `<div class="empty">${esc(t('card.empty'))}</div>`;
}

/* ================= COLLEGAMENTI MANUALI ================= */
/* Inserisce archi nel grafo vivo, senza ricaricare. */
function injectEdges(edges) {
  let n = 0;
  cy.batch(() => {
    edges.forEach(e => {
      if (cy.getElementById(e.id).length) return;              // già presente
      const s = cy.getElementById(e.source), t = cy.getElementById(e.target);
      if (!s.length || !t.length) return;
      cy.add({ group: 'edges', data: Object.assign({}, e) });
      s.data('deg', (s.data('deg') || 0) + 1);
      t.data('deg', (t.data('deg') || 0) + 1);
      n++;
    });
  });
  if (n) { ADJ = null; buildDegFilter(); }
  return n;
}

/* Collega i nodi scelti. Con due nodi si sceglie il verso (Da → A); con più
   nodi si collega ogni coppia (a,b,c -> ab, ac, bc). In entrambi i casi si
   impostano nome, frecce, forma, colore e tipo di linea del collegamento.
   Fra due nodi possono esserci più collegamenti, ognuno con il suo nome. */
let linkIds = [];

function openLinkModal(ids, preset) {
  if (!cy || !ids || ids.length < 2 || !requireCase()) return;
  linkIds = [...ids];
  const two = linkIds.length === 2;
  $('#link-endpoints').hidden = !two;
  const hint = $('#link-multi-hint');
  hint.hidden = two;
  if (!two) {
    const c = linkIds.length * (linkIds.length - 1) / 2;
    hint.textContent = t('link.multiHint', { n: linkIds.length, c });
  }
  syncLinkEndpoints();
  writeEdgeProps('link', preset || {});
  $('#linkmodal').hidden = false;
  setTimeout(() => $('#link-edge-label').focus(), 50);
}

function syncLinkEndpoints() {
  setPreviewNodes('link', nodeView(cy.getElementById(linkIds[0])),
                  nodeView(cy.getElementById(linkIds[1])));
  if (linkIds.length !== 2) return;
  $('#link-from-label').textContent = nodeLabel(linkIds[0]);
  $('#link-to-label').textContent = nodeLabel(linkIds[1]);
}

async function saveLink() {
  if (linkIds.length < 2) return;
  const btn = $('#linkmodal-save');
  btn.disabled = true;
  try {
    const payload = Object.assign({ ids: linkIds }, readEdgeProps('link'));
    if (linkIds.length === 2) { payload.source = linkIds[0]; payload.target = linkIds[1]; }
    const j = await apiPost('/api/link/add', payload);
    const n = injectEdges(j.edges || []);
    $('#linkmodal').hidden = true;
    refresh(false);
    $('#stat').textContent = j.created
      ? t('stat.linksCreated', { n: j.created, c: j.coppie, v: n })
      : t('stat.noNewLinks');
  } catch (err) {
    alert(t('err.linkFailed', { e: err.message }));
  } finally {
    btn.disabled = false;
  }
}

on('#linknodes', 'click', () => openLinkModal([...selected]));
on('#link-swap-btn', 'click', () => {
  if (linkIds.length !== 2) return;
  linkIds.reverse();
  syncLinkEndpoints();
});
on('#linkmodal-save', 'click', saveLink);
on('#linkmodal-close', 'click', () => { $('#linkmodal').hidden = true; });
on('#linkmodal', 'click', e => { if (e.target.id === 'linkmodal' && !dragEnd('linkmodal')) $('#linkmodal').hidden = true; });
on('#link-edge-label', 'keydown', e => { if (e.key === 'Enter') saveLink(); });

/* ================= MODIFICA DI UN COLLEGAMENTO (tasto destro) ================= */
let edgeEditId = null;

/* Da dove viene l'arco: decide cosa si può fare (eliminarlo, ripristinarlo). */
const edgeKind = e => e.data('rel') === 'collegamento' ? 'link'
                    : e.data('manual') ? 'added' : 'data';

function openEdgeModal(edge) {
  if (!edge || !edge.length) return;
  if (edgeEditId) cy.getElementById(edgeEditId).removeClass('edg-hi');
  edgeEditId = edge.id();
  edge.addClass('edg-hi');
  const kind = edgeKind(edge);
  $('#edg-from-label').textContent = edge.source().data('label');
  $('#edg-to-label').textContent = edge.target().data('label');
  previewNodes.edg = [nodeView(edge.source()), nodeView(edge.target())];
  $('#edgemodal-sub').textContent = edge.data('rel') ? `${t('edge.relation')}: ${edge.data('rel')}` : '';
  $('#edg-kind').textContent = t('edge.kind.' + kind);
  $('#edgemodal-del').hidden = kind !== 'link';
  $('#edgemodal-reset').hidden = kind !== 'data';
  writeEdgeProps('edg', edgePropsOf(edge));

  // altri collegamenti fra gli stessi due nodi: si passa dall'uno all'altro
  const par = edge.parallelEdges();
  const others = $('#edg-others');
  if (par.length > 1) {
    others.innerHTML = `<div class="eo-t">${esc(t('edge.parallel', { n: par.length }))}</div>` +
      par.map(p => `<button type="button" data-eid="${esc(p.id())}" class="${p.id() === edgeEditId ? 'cur' : ''}">` +
        `${ARROW_SYM[p.data('arrow') || 'none']} ${esc(p.data('label') || t('edge.unnamed'))}` +
        `</button>`).join('');
  } else {
    others.innerHTML = '';
  }
  $('#edgemodal').hidden = false;
}

function closeEdgeModal() {
  if (edgeEditId && cy) cy.getElementById(edgeEditId).removeClass('edg-hi');
  edgeEditId = null;
  $('#edgemodal').hidden = true;
}

async function saveEdge(reset) {
  const e = edgeEditId && cy.getElementById(edgeEditId);
  if (!e || !e.length) return;
  const props = readEdgeProps('edg');
  try {
    const j = await apiPost('/api/link/update',
      reset ? { id: e.id(), reset: true } : Object.assign({ id: e.id() }, props));
    setEdgeProps(e, reset ? EDGE_DEFAULTS : j.props || props);
    closeEdgeModal();
    $('#stat').textContent = reset ? t('edge.resetDone') : t('edge.saved');
  } catch (err) {
    alert(t('err.opFailed', { e: err.message }));
  }
}

on('#edgemodal-save', 'click', () => saveEdge(false));
on('#edgemodal-reset', 'click', () => saveEdge(true));
on('#edgemodal-close', 'click', closeEdgeModal);
on('#edgemodal', 'click', e => { if (e.target.id === 'edgemodal' && !dragEnd('edgemodal')) closeEdgeModal(); });
on('#edg-edge-label', 'keydown', e => { if (e.key === 'Enter') saveEdge(false); });
/* inverte il verso: si scambiano le frecce (il collegamento resta lo stesso) */
on('#edg-swap-btn', 'click', () => {
  const { fwd, bwd } = arrowHeads('edg');
  setArrowHeads('edg', bwd, fwd);
  updateEdgePreview('edg');
});
on('#edg-others', 'click', e => {
  const b = e.target.closest('[data-eid]');
  if (b) openEdgeModal(cy.getElementById(b.dataset.eid));
});
on('#edgemodal-new', 'click', () => {
  const e = edgeEditId && cy.getElementById(edgeEditId);
  if (!e || !e.length) return;
  const ids = [e.source().id(), e.target().id()];
  closeEdgeModal();
  openLinkModal(ids);
});
on('#edgemodal-del', 'click', async () => {
  const e = edgeEditId && cy.getElementById(edgeEditId);
  if (!e || !e.length) return;
  const a = e.source(), b = e.target();
  if (!confirm(t('man.confirmLink', { a: a.data('label'), b: b.data('label') }))) return;
  try {
    await apiPost('/api/link/delete', { id: e.id() });
    [a, b].forEach(m => m.data('deg', Math.max(0, (m.data('deg') || 0) - 1)));
    closeEdgeModal();
    e.remove();
    ADJ = null;
    refresh(false); buildDegFilter();
    $('#stat').textContent = t('stat.linkDeleted');
  } catch (err) {
    alert(t('err.opFailed', { e: err.message }));
  }
});

/* ================= AGGIUNTA MANUALE DI UN NODO ================= */
let addParent = null;

/* Etichetta e segnaposto del campo valore, per tipo di nodo (chiavi i18n). */
const ADD_FIELDS = {
  social:   { label: 'add.urlLabel',   ph: 'add.urlPh' },
  link:     { label: 'add.linkLabel',  ph: 'add.linkPh' },
  phone:    { label: 'add.phoneLabel', ph: 'add.phonePh' },
  email:    { label: 'add.emailLabel', ph: 'add.emailPh' },
  username: { label: 'add.userLabel',  ph: 'add.userPh' },
  vehicle:  { label: 'add.plateLabel', ph: 'add.platePh' },
  name:     { label: 'add.nameOnly',   ph: 'add.nameOnlyPh' },
  place:    { label: 'add.cityLabel',  ph: 'add.cityPh' },
  text:     { label: '',               ph: '' },   // usa solo titolo + testo
  photo:    { label: '',               ph: '' }    // usa l'area immagine
};

/* Quali campi mostrare per ciascun tipo. */
const ADD_LAYOUT = {
  social:   { value: true,  name: true,  text: false, photo: false, nameKey: 'add.nameLabel',  namePh: 'add.namePh' },
  link:     { value: true,  name: true,  text: false, photo: false, nameKey: 'add.nameLabel',  namePh: 'add.linkNamePh' },
  phone:    { value: true,  name: false, text: false, photo: false },
  email:    { value: true,  name: false, text: false, photo: false },
  username: { value: true,  name: false, text: false, photo: false },
  vehicle:  { value: true,  name: true,  text: false, photo: false, vehicle: true, nameKey: 'add.vehNameLabel', namePh: 'add.vehNamePh' },
  name:     { value: false, name: false, text: false, photo: false, person: true },
  place:    { value: true,  name: false, text: false, photo: false, place: true },
  text:     { value: false, name: true,  text: true,  photo: false, nameKey: 'add.titleLabel',   namePh: 'add.titlePh' },
  photo:    { value: false, name: true,  text: false, photo: true,  nameKey: 'add.photoNameLabel', namePh: 'add.photoNamePh' }
};

let addPhoto = null;   // { dataUrl, filename, path } dell'immagine scelta

/* node = nodo di partenza (il nuovo nodo gli viene collegato); null = "Nuovo
   nodo" indipendente: la sezione del collegamento non serve e si nasconde. */
function openAdd(node, opts = {}) {
  if (!requireCase()) return;
  addParent = node || null;
  $('#addmodal-title').textContent = node ? t('add.title') : t('add.titleNew');
  $('#addmodal-sub').textContent = node ? t('add.toNode', { name: node.data('label') })
                                        : t('add.standalone');
  $('#add-edge-sec').hidden = !node;
  resetAi();
  setAiMode(false);
  syncAiSide();
  $('#add-value').value = '';
  $('#add-name').value = '';
  $('#add-text').value = '';
  ['#add-address', '#add-civico', '#add-lat', '#add-lon'].forEach(s => { if ($(s)) $(s).value = ''; });
  fillToponimi();
  ['#add-cognome', '#add-nome', '#add-nascita', '#add-colore'].forEach(s => { if ($(s)) $(s).value = ''; });
  if ($('#add-target')) $('#add-target').checked = !!opts.target;
  if (opts.kind) $('#add-type').value = opts.kind;
  $('#add-onto-row').dataset.kind = '';          // campi ontologici vuoti
  setAddPhoto(null);
  previewNodes.add = [node ? nodeView(node) : null, null];
  writeEdgeProps('add', EDGE_DEFAULTS);
  syncAddType();
  $('#addmodal').hidden = false;
  const first = $('#add-type').value === 'name' ? '#add-cognome' : '#add-value';
  setTimeout(() => $(first).focus(), 50);
}

/* Persona: stessa identità del server (nome senza ordine + data di nascita). */
function foldName(s) {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function personKey(full) { return foldName(full).split(/\s+/).filter(Boolean).sort().join(' '); }
function birthIt(iso) { return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : ''; }

/* ---- elementi investigativi (armi, stupefacenti, valori...): i campi del
   modulo vengono da ontology.py ---- */
const ontoLabel = o => ot(o.label);

/* Una sezione della tendina per gruppo (Armi, Stupefacenti, Valori...), nell'ordine
   di ontology.py (il JSON della pagina ha le chiavi in ordine alfabetico). */
function fillOntoOptions() {
  const sel = $('#add-type');
  if (!sel) return;
  const cur = sel.value;
  sel.querySelectorAll('optgroup').forEach(g => g.remove());
  const items = Object.entries(ONTO).sort((a, b) => a[1].order - b[1].order);
  const groups = [...new Set(items.map(([, o]) => o.group))];
  groups.forEach(gr => {
    const og = document.createElement('optgroup');
    og.label = catLabel('onto_' + gr);
    og.innerHTML = items.filter(([, o]) => o.group === gr)
      .map(([k, o]) => `<option value="${esc(k)}">${esc(ontoLabel(o))}</option>`).join('');
    sel.appendChild(og);
  });
  if (cur) sel.value = cur;
}

function renderOntoFields(kind) {
  const box = $('#add-onto-row');
  const o = ONTO[kind];
  box.dataset.kind = kind;
  box.innerHTML = o.fields.map(f => {
    const id = `onto-f-${f.key}`;
    const lab = ot(f.label);
    if (f.type === 'check') {
      return `<label class="af-check af-wide"><input type="checkbox" id="${id}" data-k="${f.key}">` +
             `<span>${esc(lab)}</span></label>`;
    }
    let input;
    if (f.type === 'select') {
      input = `<select id="${id}" data-k="${f.key}"><option value="">—</option>` +
        f.options.map(x => `<option value="${esc(x)}">${esc(ot(x))}</option>`).join('') + `</select>`;
    } else {
      const typ = f.type === 'number' ? 'text" inputmode="decimal' : f.type === 'date' ? 'date' : 'text';
      input = `<input id="${id}" data-k="${f.key}" type="${typ}" autocomplete="off" placeholder="${esc(ot(f.ph || ''))}">`;
    }
    const wide = /descrizione|confezionamento|seriali|tagli/.test(f.key) ? ' af-wide' : '';
    return `<div class="af-of${wide}"><label class="af-lb" for="${id}">${esc(lab)}</label>${input}</div>`;
  }).join('');
}

function readOntoFields() {
  const out = {};
  $('#add-onto-row').querySelectorAll('[data-k]').forEach(el => {
    if (el.type === 'checkbox') { if (el.checked) out[el.dataset.k] = true; }
    else if (el.value.trim()) out[el.dataset.k] = el.value.trim();
  });
  return out;
}

/* Anteprima dell'etichetta (quella vera la compone il server). */
function ontoPreviewLabel(kind, f) {
  const o = ONTO[kind];
  const skip = /descrizione|confezionamento|seriali|tagli|intestatario|traente|beneficiario|sede|stato/;
  return o.fields.filter(x => f[x.key] && f[x.key] !== true && !skip.test(x.key) && x.type !== 'date')
    .map(x => ot(f[x.key])).join(' ') || ontoLabel(o);
}

function syncAddType() {
  const kind = $('#add-type').value;
  const f = ADD_FIELDS[kind] || ADD_FIELDS.username;
  const L = ONTO[kind] ? { onto: true } : (ADD_LAYOUT[kind] || ADD_LAYOUT.username);
  $('#add-onto-row').hidden = !L.onto;
  if (L.onto && $('#add-onto-row').dataset.kind !== kind) renderOntoFields(kind);

  $('#add-value-row').hidden = !L.value;
  if (L.value) {
    $('#add-vlabel').textContent = t(f.label);
    $('#add-value').placeholder = t(f.ph);
  }
  $('#add-name-row').hidden = !L.name;
  if (L.name) {
    $('#add-nlabel').textContent = t(L.nameKey || 'add.nameLabel');
    $('#add-name').placeholder = t(L.namePh || 'add.namePh');
  }
  $('#add-text-row').hidden = !L.text;
  $('#add-photo-row').hidden = !L.photo;
  $('#add-place-row').hidden = !L.place;
  $('#add-person-row').hidden = !L.person;
  $('#add-vehicle-row').hidden = !L.vehicle;
  updateAddPreview();
}

/* ---- immagine: scelta da file, trascinamento o incolla ---- */
function setAddPhoto(dataUrl, filename) {
  addPhoto = dataUrl ? { dataUrl, filename: filename || 'immagine' } : null;
  const img = $('#add-thumb'), txt = $('#add-drop-txt');
  if (addPhoto) {
    img.src = dataUrl; img.hidden = false;
    txt.textContent = addPhoto.filename;
  } else {
    img.hidden = true; img.removeAttribute('src');
    txt.textContent = t('add.photoDrop');
  }
  updateAddPreview();
}

function readImageFile(file) {
  if (!file || !/^image\//i.test(file.type)) return;
  const r = new FileReader();
  r.onload = () => setAddPhoto(r.result, file.name);
  r.readAsDataURL(file);
}

/* Cosa verrà creato: piattaforma e identificativo estratti dall'URL.
   Qualsiasi tipo può essere evidenziato come target (spunta nel modulo). */
function addPayload() {
  const p = addPayloadOf($('#add-type').value);
  if (!p.err) p.target = !!($('#add-target') && $('#add-target').checked);
  return p;
}
function addPayloadOf(kind) {
  const v = $('#add-value').value.trim();
  const nome = ($('#add-name') && $('#add-name').value.trim()) || '';

  // tipi che non usano il campo "valore"
  if (kind === 'text') {
    if (!nome) return { err: '' };
    const corpo = ($('#add-text') && $('#add-text').value.trim()) || '';
    if (!corpo) return { err: t('add.errText') };
    return { ntype: 'text', platform: 'text', value: nome, label: nome, text: corpo };
  }
  if (ONTO[kind]) {
    const fields = readOntoFields();
    if (!Object.keys(fields).length) return { err: '' };
    const label = ontoPreviewLabel(kind, fields);
    return { ntype: kind, platform: kind, onto: true, fields, label, value: '' };
  }
  if (kind === 'photo') {
    if (!addPhoto) return { err: '' };
    return { ntype: 'photo', platform: 'photo', value: '', label: nome, photo: true };
  }

  if (kind === 'name') {
    const cognome = ($('#add-cognome').value || '').trim().replace(/\s+/g, ' ');
    const nomeP = ($('#add-nome').value || '').trim().replace(/\s+/g, ' ');
    const nascita = ($('#add-nascita').value || '').trim();      // AAAA-MM-GG
    const full = `${cognome} ${nomeP}`.trim();
    if (!full) return { err: '' };
    if (full.length < 2) return { err: t('add.errName') };
    return { ntype: 'name', platform: 'name', value: full, cognome, nome: nomeP, nascita,
             label: nascita ? `${full} (${birthIt(nascita)})` : full };
  }
  if (!v) return { err: '' };
  if (kind === 'place') {
    const nomeVia = ($('#add-address') && $('#add-address').value.trim()) || '';
    const topo = ($('#add-toponimo') && $('#add-toponimo').value) || '';
    // tipo dalla tendina, se il nome non ne contiene gia' uno ("Piazza Duomo")
    const strada = nomeVia && topo && !STREET_TYPE_RE.test(nomeVia) ? `${topo} ${nomeVia}` : nomeVia;
    const civico = ($('#add-civico') && $('#add-civico').value.trim()) || '';
    const via = `${strada} ${civico}`.trim();
    const lat = ($('#add-lat') && $('#add-lat').value.trim().replace(',', '.')) || '';
    const lon = ($('#add-lon') && $('#add-lon').value.trim().replace(',', '.')) || '';
    const num = /^-?\d{1,3}(\.\d+)?$/;
    if ((lat && !lon) || (lon && !lat)) return { err: t('add.errCoordPair') };
    if (lat && (!num.test(lat) || Math.abs(+lat) > 90)) return { err: t('add.errLat') };
    if (lon && (!num.test(lon) || Math.abs(+lon) > 180)) return { err: t('add.errLon') };
    return { ntype: 'place', platform: 'place', value: v,
             label: via ? `${v} — ${via}` : v, address: strada, civico, lat, lon };
  }
  if (kind === 'vehicle') {
    const targa = v.replace(/\s+/g, '').toUpperCase();
    if (targa.length < 3) return { err: t('add.errPlate') };
    const colore = ($('#add-colore') && $('#add-colore').value.trim()) || '';
    return { ntype: 'vehicle', platform: 'vehicle', value: v, colore,
             label: nome ? `${targa} ${nome}` : targa };
  }
  if (kind === 'link') {
    if (!/^https?:\/\/\S+$/i.test(v)) return { err: t('add.errLink') };
    const nome = ($('#add-name') && $('#add-name').value.trim()) || '';
    return { ntype: 'link', platform: 'link', value: v, label: nome || v, url: v };
  }
  if (kind === 'social') {
    const p = parseSocialUrl(v);
    if (!p) return { err: t('add.errUrl') };
    const nome = ($('#add-name') && $('#add-name').value.trim()) || '';
    return { ntype: 'account', platform: p.platform, value: p.handle,
             label: nome || p.handle, url: v };
  }
  if (kind === 'phone') {
    const d = v.replace(/\D/g, '');
    if (d.length < 6) return { err: t('add.errPhone') };
    return { ntype: 'phone', value: v, label: v };
  }
  if (kind === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { err: t('add.errEmail') };
    return { ntype: 'email', value: v, label: v };
  }
  if (!/^[A-Za-z0-9._@-]{2,}$/.test(v)) return { err: t('add.errUser') };
  return { ntype: 'username', value: v.replace(/^@+/, ''), label: v.replace(/^@+/, '') };
}

/* Anteprima del collegamento nella finestra di aggiunta: il nodo di partenza e
   il nodo che si sta creando, con l'icona e il colore del tipo scelto. */
const ADD_KIND_NTYPE = { social: 'account' };
function addPreviewNode(p) {
  if (!previewNodes.add) return;
  const kind = $('#add-type').value;
  const d = (p && !p.err && p.ntype) ? Object.assign({}, p)
          : { ntype: ADD_KIND_NTYPE[kind] || kind, platform: kind === 'social' ? '' : kind,
              label: $('#add-value').value.trim() || $('#add-name').value.trim() || t('add.newNode') };
  if (d.ntype === 'photo' && addPhoto) d.image = addPhoto.dataUrl;
  if ($('#add-target') && $('#add-target').checked) d.ntype = 'target';   // come farà il server
  previewNodes.add[1] = { icon: iconFor(d), label: d.label || d.value || t('add.newNode'),
                          color: TYPE_COLOR[d.ntype] || TYPE_COLOR.generic, ntype: d.ntype };
  updateEdgePreview('add');
}

/* Tipi di via della tendina (toponimi). Non contano nel confronto fra
   indirizzi: "Via Giacomo Leopardi" e "Giacomo Leopardi" sono la stessa via. */
const TOPONIMI = ['Via', 'Viale', 'Piazza', 'Piazzale', 'Piazzetta', 'Corso', 'Largo',
  'Vicolo', 'Vico', 'Strada', 'Contrada', 'Località', 'Frazione', 'Borgo', 'Lungomare',
  'Lungolago', 'Salita', 'Traversa', 'Galleria', 'Circonvallazione', 'Calle', 'Rue',
  'Avenue', 'Boulevard', 'Avenida', 'Plaza'];
const STREET_TYPE_RE = new RegExp('^(' + TOPONIMI.join('|') +
  '|v\\.le|p\\.?za|p\\.le|c\\.so|l\\.go|loc\\.)(\\s|\\.|$)', 'i');

function fillToponimi() {
  const s = $('#add-toponimo');
  if (!s) return;
  if (!s.options.length) {
    s.innerHTML = `<option value="">—</option>` +
      TOPONIMI.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
  }
  s.value = 'Via';
}
fillToponimi();

function updateAddPreview() {
  const box = $('#add-preview');
  const p = addPayload();
  addPreviewNode(p);
  if (p.err === '') { box.className = 'af-prev'; box.textContent = ''; return; }
  if (p.err) { box.className = 'af-prev af-err'; box.textContent = '⚠ ' + p.err; return; }
  // la foto riceve l'id solo dopo il caricamento sul server
  if (p.ntype === 'photo') {
    box.className = 'af-prev af-ok';
    box.innerHTML = `<b>${esc(t('cat.foto'))}</b> · ${esc(addPhoto.filename)}` +
                    `<br><i>${esc(t('add.photoWillSave'))}</i>`;
    return;
  }
  if (p.onto) {
    box.className = 'af-prev af-ok';
    box.innerHTML = `<b>${esc(ontoLabel(ONTO[p.ntype]))}</b> · ${esc(p.label)}`;
    return;
  }
  const id = p.ntype === 'account' ? `acct:${p.platform}:${p.value.toLowerCase()}`
           : p.ntype === 'name' ? (p.nascita ? `person:${personKey(p.value)}|${p.nascita}` : 'name:' + personKey(p.value))
           : p.ntype === 'place' ? 'place:' + `${p.value} ${p.address || ''} ${p.civico || ''}`.replace(/\s+/g, ' ').trim().toLowerCase()
           : p.ntype === 'link' ? 'link:' + p.value.replace(/\/+$/, '').toLowerCase()
           : p.ntype === 'vehicle' ? 'vehicle:' + p.value.replace(/\s+/g, '').toUpperCase()
           : p.ntype === 'text' ? 'text:' + p.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
           : p.ntype === 'phone' ? 'phone:' + p.value.replace(/\D/g, '')
           : p.ntype === 'email' ? 'email:' + p.value.toLowerCase()
           : 'user:' + p.value.toLowerCase();
  const exists = cy && cy.getElementById(id).length > 0;
  box.className = 'af-prev af-ok';
  box.innerHTML =
    (p.platform ? `<b>${esc(p.platform)}</b> · ` : '') +
    `${esc(t('add.identifier'))}: <b>${esc(p.value)}</b><br><code>${esc(id)}</code>` +
    (exists ? `<br><i>${esc(t('add.exists'))}</i>` : '');
}

/* Aggiunge un nodo a cytoscape con gli stessi campi calcolati al caricamento
   (icona, colore, categoria, dimensione) e lo indicizza per la ricerca.
   Se esiste già lo restituisce e basta. */
function addNodeToCy(nodeData) {
  const existing = cy.getElementById(nodeData.id);
  if (existing.length) return existing;

  const n = Object.assign({}, nodeData);
  n.ident = IDENT_TYPES.includes(n.ntype);
  n.cat = categoryOf(n);
  n.deg = n.deg || 0;
  n.bridge = n.ident && n.deg > 1;
  n.size = n.ntype === 'target' ? 50 : n.ntype === 'photo' ? 46
         : n.ntype === 'account' ? 32 : (n.bridge ? 26 : 22);
  cy.add({ group: 'nodes', data: Object.assign({}, n, {
    icon: iconFor(n), color: TYPE_COLOR[n.ntype] || TYPE_COLOR.generic, disp: n.label
  }) });

  // indice di ricerca (etichetta, id, piattaforma, alias, nota)
  const hay = `${n.label} ${n.id} ${n.platform} ${n.ntype} ` +
              `${(n.aliases || []).join(' ')} ${n.note || ''}`.toLowerCase();
  if (!INDEX.some(it => it.id === n.id)) {
    INDEX.push({ id: n.id, hay, headLen: hay.length });
    const toks = hay.match(TOKEN_RE);
    if (toks) for (const w of new Set(toks)) {
      if (w.length < 2 || w.length > 40) continue;
      let post = VOCAB.get(w);
      if (!post) { post = []; VOCAB.set(w, post); }
      if (!post.includes(n.id)) post.push(n.id);
    }
  }
  return cy.getElementById(n.id);
}

/* Inserisce nel grafo VIVO il nodo appena creato, senza ricaricare la pagina:
   la vista corrente (nodi aperti, posizioni, zoom) resta intatta. */
function injectNode(nodeData, edgeData, parentId) {
  const node = addNodeToCy(nodeData);

  if (edgeData && !cy.getElementById(edgeData.id).length) {
    cy.add({ group: 'edges', data: Object.assign({}, edgeData) });
    [edgeData.source, edgeData.target].forEach(id => {
      const m = cy.getElementById(id);
      if (m.length) m.data('deg', (m.data('deg') || 0) + 1);
    });
  }

  // rende visibile il nuovo nodo accanto al suo genitore
  visibleNodes.add(node.id());
  if (parentId) visibleNodes.add(parentId);
  const parent = parentId ? cy.getElementById(parentId) : null;
  if (parent && parent.length && placed.has(parentId) && !placed.has(node.id())) {
    const p = parent.position();
    node.position({ x: p.x + 140, y: p.y + 90 });
    placed.add(node.id());
  }
  refresh(true);
  ADJ = null;                                  // adiacenza da ricalcolare
  buildLegend();
  buildCatFilters();
  buildDegFilter();

  node.addClass('fresh');
  setTimeout(() => node.removeClass('fresh'), 2000);
  bringIntoView(node);
  // se la piattaforma è nuova, scarica la sua icona (le altre sono già in cache)
  upgradeBrandIcons();
  return node;
}

on('#modal-add', 'click', () => { if (modalNode) openAdd(modalNode); });
on('#newNode', 'click', () => { if (cy) openAdd(null); });
on('#addmodal-close', 'click', () => { $('#addmodal').hidden = true; });
on('#addmodal', 'click', e => {
  // il clic sullo sfondo chiude, ma non se è la fine di un trascinamento
  if (e.target.id === 'addmodal' && !dragEnd('addmodal')) $('#addmodal').hidden = true;
});

/* ---- finestre trascinabili: si prendono dalla barra del titolo ----
   Lo spostamento è una traslazione del riquadro (che resta centrato dal
   contenitore flex); la posizione si conserva fra un'apertura e l'altra e
   viene riportata dentro lo schermo quando la finestra si apre o cambia di
   misura. Doppio clic sulla barra = torna al centro. */
const DRAG = {};                                     // stato per id della finestra
const dragEnd = id => !!(DRAG[id] && DRAG[id].justDragged);
function makeDraggable(id) {
  const modal = $(`#${id}`), box = $(`#${id}-box`), head = $(`#${id}-head`);
  if (!modal || !box || !head) return;
  const st = DRAG[id] = { dx: 0, dy: 0, justDragged: false };
  head.classList.add('draggable');
  const apply = () => { box.style.transform = (st.dx || st.dy) ? `translate(${st.dx}px, ${st.dy}px)` : ''; };
  // tiene il riquadro dentro la finestra (almeno la barra del titolo resta visibile)
  const clamp = () => {
    if (modal.hidden) return;
    const r = box.getBoundingClientRect();
    const bx = r.left - st.dx, by = r.top - st.dy;          // posizione senza traslazione
    const maxX = window.innerWidth - bx - 80, minX = -bx - r.width + 80;
    const maxY = window.innerHeight - by - 40, minY = -by;
    st.dx = Math.round(Math.max(minX, Math.min(maxX, st.dx)));
    st.dy = Math.round(Math.max(minY, Math.min(maxY, st.dy)));
    apply();
  };
  head.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('button, input, select, a, label')) return;
    const sx = e.clientX - st.dx, sy = e.clientY - st.dy;
    let moved = false;
    const move = ev => {
      const nx = ev.clientX - sx, ny = ev.clientY - sy;
      if (!moved && Math.abs(nx - st.dx) < 3 && Math.abs(ny - st.dy) < 3) return;
      moved = true;
      st.dx = nx; st.dy = ny; apply();
      head.classList.add('dragging');
    };
    const up = () => {
      head.removeEventListener('pointermove', move);
      head.removeEventListener('pointerup', up);
      head.removeEventListener('pointercancel', up);
      head.classList.remove('dragging');
      if (moved) {
        clamp();
        st.justDragged = true;                       // il clic che segue non chiude
        setTimeout(() => { st.justDragged = false; }, 0);
      }
    };
    try { head.setPointerCapture(e.pointerId); } catch (_) {}
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', up);
    head.addEventListener('pointercancel', up);
    e.preventDefault();
  });
  head.addEventListener('dblclick', e => {
    if (e.target.closest('button, input, select, a, label')) return;
    st.dx = 0; st.dy = 0; apply();
  });
  window.addEventListener('resize', clamp);
  new MutationObserver(clamp).observe(modal, { attributes: true, attributeFilter: ['hidden'] });
}
['modal', 'addmodal', 'linkmodal', 'edgemodal', 'editmodal', 'impmodal', 'aimodal',
 'casemodal', 'manmodal', 'delmodal', 'srcmodal', 'licmodal'].forEach(makeDraggable);
on('#add-type', 'change', syncAddType);
on('#add-value', 'input', updateAddPreview);
on('#add-name', 'input', updateAddPreview);
on('#add-text', 'input', updateAddPreview);
['#add-address', '#add-civico', '#add-lat', '#add-lon'].forEach(s => on(s, 'input', updateAddPreview));
on('#add-toponimo', 'change', updateAddPreview);

/* immagine: clic per scegliere, trascinamento, incolla dagli appunti */
on('#add-drop', 'click', () => $('#add-file').click());
on('#add-file', 'change', e => readImageFile(e.target.files && e.target.files[0]));
on('#add-drop', 'dragover', e => { e.preventDefault(); $('#add-drop').classList.add('over'); });
on('#add-drop', 'dragleave', () => $('#add-drop').classList.remove('over'));
on('#add-drop', 'drop', e => {
  e.preventDefault();
  $('#add-drop').classList.remove('over');
  const dt = e.dataTransfer;
  if (dt && dt.files && dt.files.length) readImageFile(dt.files[0]);
});
document.addEventListener('paste', e => {
  if ($('#addmodal').hidden || $('#add-photo-row').hidden) return;
  const items = (e.clipboardData && e.clipboardData.items) || [];
  for (const it of items) {
    if (it.kind === 'file' && /^image\//i.test(it.type)) {
      readImageFile(it.getAsFile());
      e.preventDefault();
      return;
    }
  }
});

/* ---- nuovo target: crea la cartella in data/ e mette il nodo nel grafo ---- */
on('#add-value', 'keydown', e => { if (e.key === 'Enter') $('#addmodal-save').click(); });
['#add-cognome', '#add-nome', '#add-nascita', '#add-colore'].forEach(sel => {
  on(sel, 'input', updateAddPreview);
  on(sel, 'keydown', e => { if (e.key === 'Enter') $('#addmodal-save').click(); });
});
on('#add-target', 'change', updateAddPreview);

on('#addmodal-save', 'click', async () => {
  if (aiMode) { commitAi(); return; }
  const p = addPayload();
  if (p.err !== undefined) {
    updateAddPreview();
    if (p.err) alert(p.err); else alert(t('add.enterValue'));
    return;
  }
  const btn = $('#addmodal-save');
  btn.disabled = true;
  try {
    const parentId = addParent ? addParent.id() : '';
    let value = p.value;
    if (p.photo) {                     // prima si carica l'immagine, poi il nodo
      const up = await apiPost('/api/upload', {
        data: addPhoto.dataUrl, filename: addPhoto.filename
      });
      value = up.path;                 // es. "media/foto_20260829-...png"
    }
    const j = await apiPost('/api/node/add', {
      parent: parentId, ntype: p.ntype, platform: p.platform || '',
      value, label: p.label, url: p.url || '', text: p.text || '',
      address: p.address || '', civico: p.civico || '', lat: p.lat || '', lon: p.lon || '',
      cognome: p.cognome || '', nome: p.nome || '', nascita: p.nascita || '', target: !!p.target,
      colore: p.colore || '', fields: p.fields || null,
      edge: parentId ? readEdgeProps('add') : null   // nome, frecce, forma, colore, linea
    });
    $('#addmodal').hidden = true;
    // inserimento a caldo: il grafo resta com'è, con il nuovo nodo in evidenza
    const isNew = !cy.getElementById(j.id).length;
    const node = injectNode(j.node, j.edge, parentId || null);
    if (!parentId && isNew) {                // nodo indipendente: al centro della vista
      const ex = cy.extent();
      node.position({ x: (ex.x1 + ex.x2) / 2, y: (ex.y1 + ex.y2) / 2 });
      placed.add(node.id());
    }
    // etichetta non latina: sincronizza per far comparire il nodo latino
    // (traslitterazione) e mostralo insieme al nodo appena aggiunto
    if (j.script) {
      try {
        await syncGraph();
        const m = cy.getElementById(j.id);
        const lat = m.length ? m.neighborhood('node').filter(x => x.data('ntype') === 'latin') : cy.collection();
        addToGraph([j.id, ...lat.map(x => x.id())], false);
      } catch (_) {}
    }
    // luogo o persona: il server li unisce ai nodi uguali (una scheda in piu')
    // e li collega con un tratteggio a quelli della stessa via / con lo stesso
    // nome; si sincronizza per vedere subito quei collegamenti e i nodi collegati
    if (p.ntype === 'place' || p.ntype === 'name' || ONTO[p.ntype]) {
      try {
        await syncGraph();
        const m = cy.getElementById(j.id);
        const via = m.length ? m.connectedEdges('[rel = "stessa_via"], [rel = "stesso_nome"]').connectedNodes() : cy.collection();
        addToGraph([j.id, ...via.map(x => x.id())], false);
      } catch (_) {}
    }
    if (modalNode && modalNode.id() === parentId) {
      $('#modal-body').innerHTML = bodyFor(modalNode);   // aggiorna il riepilogo
    }
    $('#stat').textContent = parentId
      ? t('add.done', { label: j.label, parent: addParent.data('label') })
      : (j.existed ? t('add.existedNew', { label: j.label }) : t('add.doneNew', { label: j.label }));
    void node;
  } catch (err) {
    alert(t('add.failed', { e: err.message }));
  } finally {
    btn.disabled = false;
  }
});

/* ================= IMPORTAZIONE MASSIVA DA CSV / EXCEL =================
   Ogni riga: nome nodo 1, tipo nodo 1, collegamento, nome nodo 2, tipo nodo 2
   (+ colonne facoltative: url, piattaforma, testo, indirizzo, lat, lon, nota
   per ciascun nodo; frecce, forma, colore, linea, spessore per il collegamento).
   Il server legge il file e mostra l'anteprima; poi importa le righe spuntate. */
let impFile = null;                 // { filename, data } del file scelto
let impRows = [];

const IMPORT_TEMPLATE = [
  ['nome1', 'tipo1', 'collegamento', 'nome2', 'tipo2', 'url1', 'url2', 'frecce', 'forma', 'colore', 'linea', 'nota1', 'nota2'],
  ['Mario Rossi', 'persona', 'utenza', '+39 333 1234567', 'telefono', '', '', '->', 'retta', '', '', 'soggetto principale', ''],
  ['Mario Rossi', 'persona', 'profilo', 'mario.rossi', 'instagram', '', 'https://www.instagram.com/mario.rossi/', '->', '', 'blu', '', '', ''],
  ['Mario Rossi', 'persona', 'email', 'mario.rossi@example.com', 'email', '', '', '->', '', '', '', '', ''],
  ['Mario Rossi', 'persona', 'socio', 'ACME srl', 'persona', '', '', '<->', 'curva', 'rosso', 'tratteggiata', '', ''],
  ['ACME srl', 'persona', 'sito web', 'Sito ACME', 'link', '', 'https://www.acme.example', '->', 'spezzata', '', '', '', ''],
  ['ACME srl', 'persona', 'sede', 'Milano', 'luogo', '', '', '', '', '', '', '', ''],
  ['Mario Rossi', 'persona', 'veicolo', 'AB123CD', 'veicolo', '', '', '->', '', '', 'punteggiata', '', ''],
  ['Luca Bianchi', 'persona', '', '', '', '', '', '', '', '', '', 'nodo senza collegamenti', '']
];

function downloadTemplate() {
  const q = v => /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  const csv = '\ufeff' + IMPORT_TEMPLATE.map(r => r.map(q).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'modello_importazione.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---- procedura guidata: 1 file, 2 colonne, 3 anteprima ---- */
let impCols = null;                 // risposta di /api/import/columns
let impMapping = {};                // {indice colonna: chiave}
const IMP_NODE_KEYS = ['name', 'type', 'label', 'url', 'platform', 'text', 'cognome', 'nascita',
                       'colore', 'flag', 'address', 'civico', 'lat', 'lon', 'note'];
const IMP_EDGE_KEYS = ['rel', 'arrow', 'curve', 'color', 'lstyle', 'width'];

function impStep(n) {
  [1, 2, 3].forEach(k => { $(`#imp-step${k}`).hidden = k !== n; });
  document.querySelectorAll('.imp-step').forEach(el => {
    const k = +el.dataset.step;
    el.classList.toggle('on', k === n); el.classList.toggle('done', k < n);
  });
  $('#impmodal-back').hidden = n === 1;
  $('#impmodal-next').hidden = n !== 2;
  $('#impmodal-go').hidden = n !== 3;
}

function openImport() {
  if (!requireCase()) return;
  impFile = null; impRows = []; impCols = null; impMapping = {};
  $('#imp-file').value = '';
  $('#imp-drop-txt').textContent = t('imp.drop');
  $('#imp-res').innerHTML = ''; $('#imp-sum').textContent = '';
  $('#imp-map').innerHTML = ''; $('#imp-map-msg').textContent = '';
  $('#imp-def-rel').value = '';
  fillImpTypeSelects();
  impStep(1);
  $('#impmodal').hidden = false;
}

/* tipi di nodo predefiniti: gli stessi della finestra «Nuovo nodo» (tranne la foto) */
function fillImpTypeSelects() {
  const src = $('#add-type');
  const opts = `<option value="">${esc(t('imp.auto'))}</option>` +
    [...src.querySelectorAll('option')].filter(o => o.value && o.value !== 'photo')
      .map(o => `<option value="${esc(o.value)}">${esc(o.textContent)}</option>`).join('');
  ['#imp-def-type1', '#imp-def-type2'].forEach(sel => { $(sel).innerHTML = opts; });
}

function readImportFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => { impFile = { filename: file.name, data: r.result }; loadImportColumns(); };
  r.readAsDataURL(file);
  $('#imp-drop-txt').textContent = file.name;
}

async function loadImportColumns() {
  if (!impFile) return;
  $('#imp-map').innerHTML = `<div class="empty">${esc(t('err.loading'))}</div>`;
  impStep(2);
  try {
    impCols = await apiPost('/api/import/columns', impFile);
  } catch (err) {
    impStep(1);
    $('#imp-drop-txt').textContent = `⚠ ${err.message}`;
    impFile = null;
    return;
  }
  $('#imp-header').checked = !!impCols.header;
  // mappatura iniziale: le colonne riconosciute dalle intestazioni; le altre
  // diventano campi aggiuntivi del nodo 1 (cosi' nessun valore va perso)
  impMapping = {};
  impCols.columns.forEach(c => {
    impMapping[c.index] = c.auto || (impCols.header && c.name ? `extra1:${c.name}` : '');
  });
  renderImportMapping();
}

function impColName(c) {
  return $('#imp-header').checked && c.name ? c.name : t('imp.colN', { n: c.index + 1 });
}

function impMapOptions(sel) {
  const opt = (v, lab) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(lab)}</option>`;
  const grp = (lab, inner) => `<optgroup label="${esc(lab)}">${inner}</optgroup>`;
  return opt('', t('imp.ignore')) +
    grp(t('imp.grpNode1'), IMP_NODE_KEYS.map(k => opt(k + '1', t('imp.f.' + k))).join('') + opt('extra1', t('imp.extra1'))) +
    grp(t('imp.grpEdge'), IMP_EDGE_KEYS.map(k => opt(k, t('imp.e.' + k))).join('')) +
    grp(t('imp.grpNode2'), IMP_NODE_KEYS.map(k => opt(k + '2', t('imp.f.' + k))).join('') + opt('extra2', t('imp.extra2')));
}

function renderImportMapping() {
  if (!impCols) return;
  const header = $('#imp-header').checked;
  const auto = impCols.columns.filter(c => c.auto).length;
  $('#imp-detected').textContent = t('imp.detected', { n: auto, t: impCols.columns.length, r: impCols.rows + (header ? 0 : 1) });
  $('#imp-map').innerHTML = `<table class="imp-t imp-map-t"><thead><tr>` +
    `<th>${esc(t('imp.colName'))}</th><th>${esc(t('imp.colSamples'))}</th><th>${esc(t('imp.colMap'))}</th></tr></thead><tbody>` +
    impCols.columns.map(c => {
      const v = impMapping[c.index] || '';
      const sel = v.startsWith('extra1:') ? 'extra1' : v.startsWith('extra2:') ? 'extra2' : v;
      const samples = (header ? c.samples : [impCols.first_row[c.index], ...c.samples]).filter(Boolean).slice(0, 3);
      return `<tr><td><b>${esc(impColName(c))}</b></td>` +
        `<td class="imp-samples">${samples.map(x => esc(x)).join(' · ')}</td>` +
        `<td><select data-col="${c.index}">${impMapOptions(sel)}</select></td></tr>`;
    }).join('') + '</tbody></table>';
  $('#imp-map-msg').textContent = '';
}

function readImportMapping() {
  const header = $('#imp-header').checked;
  const m = {};
  document.querySelectorAll('#imp-map select[data-col]').forEach(sel => {
    const c = impCols.columns[+sel.dataset.col];
    let v = sel.value;
    if (v === 'extra1' || v === 'extra2') v = `${v}:${impColName(c)}`;
    if (v) m[c.index] = v;
  });
  impMapping = m;
  return { mapping: m, header, defaults: {
    type1: $('#imp-def-type1').value, type2: $('#imp-def-type2').value, rel: $('#imp-def-rel').value.trim() } };
}

on('#imp-header', 'change', () => {
  // senza intestazione le colonne non hanno nome: i «campi aggiuntivi» non hanno senso
  if (!$('#imp-header').checked) {
    Object.keys(impMapping).forEach(k => { if (String(impMapping[k]).startsWith('extra')) impMapping[k] = ''; });
  }
  renderImportMapping();
});
on('#imp-map', 'change', e => {
  const sel = e.target.closest('select[data-col]');
  if (!sel) return;
  const c = impCols.columns[+sel.dataset.col];
  impMapping[c.index] = (sel.value === 'extra1' || sel.value === 'extra2') ? `${sel.value}:${impColName(c)}` : sel.value;
  // la stessa chiave su due colonne: la precedente torna a «ignora»
  Object.keys(impMapping).forEach(k => {
    if (+k !== c.index && impMapping[k] && impMapping[k] === impMapping[c.index] && !impMapping[k].startsWith('extra')) {
      impMapping[k] = '';
    }
  });
  renderImportMapping();
});

const impNode = n => n
  ? `<span class="imp-n${n.exists ? ' ex' : ''}" title="${esc(n.id)}">` +
    `<img src="${iconFor(n)}" alt=""><span>${esc(n.label)}</span>` +
    `<small>${esc(n.ntype === 'account' ? n.platform : n.ntype)}</small></span>`
  : '<span class="imp-none">—</span>';

/* Tabella di anteprima (righe del piano: nodo 1, collegamento, nodo 2), usata
   dall'importazione da file e dall'AI. Le righe con errore non si importano;
   le altre hanno una casella per escluderle. */
function planTableHtml(rows) {
  return `<table class="imp-t"><thead><tr><th></th><th>#</th>` +
    `<th>${esc(t('imp.node1'))}</th><th>${esc(t('imp.link'))}</th><th>${esc(t('imp.node2'))}</th></tr></thead><tbody>` +
    rows.slice(0, 1000).map(r => {
      const [a, b] = [r.nodes.find(n => n.side === '1'), r.nodes.find(n => n.side === '2')];
      const e = r.edge;
      return `<tr class="${r.error ? 'imp-err' : ''}">` +
        `<td>${r.error ? '⚠' : `<input type="checkbox" data-row="${r.row}" checked>`}</td>` +
        `<td>${r.row}</td>` +
        (r.error ? `<td colspan="3">${esc(r.error)}</td>`
          : `<td>${impNode(a)}</td><td class="imp-e">${e ? `<i style="color:${esc(e.color || '#64748b')}">${ARROW_SYM[e.arrow] || '—'}</i> ${esc(e.label || '')}` : ''}</td><td>${impNode(b)}</td>`) +
        '</tr>';
    }).join('') + '</tbody></table>' +
    (rows.length > 1000 ? `<div class="af-hint">${esc(t('imp.more', { n: rows.length - 1000 }))}</div>` : '');
}

/* Conteggi del piano per la riga di riepilogo. */
function planCounts(rows) {
  const ok = rows.filter(r => !r.error);
  const newN = new Set(), oldN = new Set();
  ok.forEach(r => r.nodes.forEach(n => (n.exists ? oldN : newN).add(n.id)));
  return { rows: rows.length, nn: newN.size, on: oldN.size,
           l: ok.filter(r => r.nodes.length === 2).length, err: rows.length - ok.length };
}

async function previewImport() {
  if (!impFile || !impCols) return;
  const opts = readImportMapping();
  if (!Object.values(opts.mapping).includes('name1')) {
    $('#imp-map-msg').textContent = t('imp.needName');
    return;
  }
  impStep(3);
  $('#imp-res').innerHTML = `<div class="empty">${esc(t('err.loading'))}</div>`;
  $('#impmodal-go').disabled = true;
  try {
    const j = await apiPost('/api/import/preview', Object.assign({}, impFile, opts));
    impRows = j.rows || [];
    const ok = impRows.filter(r => !r.error);
    $('#imp-sum').textContent = t('imp.summary', planCounts(impRows));
    $('#imp-res').innerHTML = planTableHtml(impRows);
    $('#impmodal-go').disabled = !ok.length;
  } catch (err) {
    $('#imp-res').innerHTML = `<div class="empty imp-fail">⚠ ${esc(err.message)}</div>`;
    $('#imp-sum').textContent = '';
  }
}

async function commitImport() {
  if (!impFile) return;
  const skip = [...document.querySelectorAll('#imp-res input[data-row]')]
    .filter(c => !c.checked).map(c => +c.dataset.row);
  const btn = $('#impmodal-go');
  btn.disabled = true;
  btn.textContent = t('imp.working');
  try {
    const j = await apiPost('/api/import/commit', Object.assign({ skip }, impFile, readImportMapping()));
    await syncGraph();
    $('#impmodal').hidden = true;
    const ids = (j.ids || []).filter(id => cy.getElementById(id).length);
    if (ids.length) {
      addToGraph(ids, false);
      cy.fit(cy.nodes().filter(n => ids.includes(n.id())), 60); capZoom(1.4);
    }
    $('#stat').textContent = t('imp.done', { n: j.nodes, l: j.links, s: j.same_links,
                                             err: (j.errors || []).length });
    if ((j.errors || []).length) {
      alert(t('imp.errList') + '\n\n' +
        j.errors.slice(0, 30).map(e => `${t('imp.rowN', { n: e.row })}: ${e.error}`).join('\n'));
    }
  } catch (err) {
    alert(t('err.opFailed', { e: err.message }));
  } finally {
    btn.disabled = false;
    btn.textContent = t('imp.go');
  }
}

on('#importData', 'click', openImport);

on('#modal-ai', 'click', () => { if (modalNode) { openAdd(modalNode); setAiMode(true); } });
on('#impmodal-close', 'click', () => { $('#impmodal').hidden = true; });
on('#impmodal', 'click', e => { if (e.target.id === 'impmodal' && !dragEnd('impmodal')) $('#impmodal').hidden = true; });
on('#imp-template', 'click', downloadTemplate);
on('#imp-drop', 'click', () => $('#imp-file').click());
on('#imp-file', 'change', e => readImportFile(e.target.files && e.target.files[0]));
on('#imp-drop', 'dragover', e => { e.preventDefault(); $('#imp-drop').classList.add('over'); });
on('#imp-drop', 'dragleave', () => $('#imp-drop').classList.remove('over'));
on('#imp-drop', 'drop', e => {
  e.preventDefault();
  $('#imp-drop').classList.remove('over');
  const dt = e.dataTransfer;
  if (dt && dt.files && dt.files.length) readImportFile(dt.files[0]);
});
on('#impmodal-go', 'click', commitImport);
on('#impmodal-next', 'click', previewImport);
on('#impmodal-back', 'click', () => impStep($('#imp-step3').hidden ? 1 : 2));

/* ================= AI: DAL TESTO LIBERO AI NODI =================
   Nella finestra "Aggiungi" / "Nuovo nodo" il pulsante ✨ AI trasforma il
   modulo in un'unica area di testo: il chatbot legge il testo, propone nodi e
   collegamenti, l'utente sceglie quali tenere e li aggiunge al grafo. */
let aiConf = null;                  // configurazione pubblica (senza la chiave)
let aiMode = false;
let aiItems = [];                   // righe proposte dal server (da rimandare al commit)
let aiRows = [];

async function loadAiConf() {
  try {
    const r = await fetch('/api/ai/config');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    aiConf = await r.json();
  } catch (_) { aiConf = null; }
  syncAiSide();
}

function syncAiSide() {
  const sw = $('#aiSwitch'), st = $('#aiSideStatus'), tg = $('#add-ai-toggle');
  const on = !!(aiConf && aiConf.enabled);
  if (sw) sw.checked = on;
  if (st) {
    st.className = 'ai-side-st ' + (aiConf && aiConf.ready ? 'ok' : 'off');
    st.textContent = !aiConf ? t('ai.unavailable')
      : !aiConf.endpoint ? t('ai.noEndpoint')
      : `${aiConf.model} · ${aiConf.endpoint.replace(/^https?:\/\//, '')}`;
  }
  if (tg) tg.classList.toggle('off', !(aiConf && aiConf.ready));
}

function setAiMode(onoff) {
  aiMode = !!onoff;
  $('#add-form').hidden = aiMode;
  $('#add-ai-sec').hidden = !aiMode;
  $('#add-ai-toggle').classList.toggle('on', aiMode);
  $('#addmodal-box').classList.toggle('ai-mode', aiMode);
  $('#addmodal-save').textContent = aiMode ? t('ai.addAll') : t('add.save');
  syncAiSave();
  if (aiMode) {
    const g = $('#ai-glow');
    g.classList.remove('intro'); void g.offsetWidth;      // riavvia l'animazione
    g.classList.add('intro');
    setTimeout(() => g.classList.remove('intro'), 1700);
    setTimeout(() => $('#ai-text').focus(), 60);
  }
}

function resetAi() {
  aiItems = []; aiRows = [];
  $('#ai-text').value = '';
  $('#ai-res').innerHTML = '';
  aiStatus('');
}

function aiStatus(msg, kind) {
  const el = $('#ai-status');
  el.textContent = msg || '';
  el.className = 'ai-status' + (kind ? ' ' + kind : '');
}

function syncAiSave() {
  const b = $('#addmodal-save');
  if (aiMode) b.disabled = !aiRows.some(r => !r.error);
  else b.disabled = false;
}

on('#add-ai-toggle', 'click', () => {
  if (!aiMode && !(aiConf && aiConf.ready)) {       // AI spenta o non configurata
    if (confirm(t('ai.needConfig'))) openAiConfig();
    return;
  }
  setAiMode(!aiMode);
});

async function runAi() {
  const text = $('#ai-text').value.trim();
  if (text.length < 3) { aiStatus(t('ai.empty'), 'err'); return; }
  const btn = $('#ai-run'), g = $('#ai-glow');
  btn.disabled = true; g.classList.add('busy');
  $('#ai-text').readOnly = true;
  aiStatus(t('ai.working'), 'shimmer');
  $('#ai-res').innerHTML = '';
  aiRows = []; syncAiSave();
  try {
    const j = await apiPost('/api/ai/nodes', { text, parent: addParent ? addParent.id() : '' });
    aiItems = j.items || [];
    aiRows = j.rows || [];
    const c = planCounts(aiRows);
    aiStatus(t('ai.found', c));
    $('#ai-res').innerHTML = planTableHtml(aiRows);
  } catch (err) {
    aiStatus('⚠ ' + err.message, 'err');
  } finally {
    btn.disabled = false; g.classList.remove('busy');
    $('#ai-text').readOnly = false;
    syncAiSave();
  }
}
on('#ai-run', 'click', runAi);
on('#ai-text', 'keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runAi(); });

/* Aggiunge al grafo le righe spuntate della proposta. */
async function commitAi() {
  const skip = [...document.querySelectorAll('#ai-res input[data-row]')]
    .filter(c => !c.checked).map(c => +c.dataset.row);
  const btn = $('#addmodal-save');
  btn.disabled = true;
  try {
    const j = await apiPost('/api/ai/commit', { items: aiItems, skip });
    await syncGraph();
    $('#addmodal').hidden = true;
    const ids = (j.ids || []).filter(id => cy.getElementById(id).length);
    if (addParent) ids.push(addParent.id());
    if (ids.length) addToGraph(ids, true);
    if (modalNode && addParent && modalNode.id() === addParent.id()) openModal(cy.getElementById(addParent.id()));
    $('#stat').textContent = t('ai.done', { n: j.nodes, l: j.links });
  } catch (err) {
    alert(t('err.opFailed', { e: err.message }));
  } finally {
    syncAiSave();
  }
}

/* ---------------- pannello di configurazione (chatbot.conf) ---------------- */
function openAiConfig() {
  const c = aiConf || {};
  $('#aic-enabled').checked = !!c.enabled;
  $('#aic-endpoint').value = c.endpoint || '';
  $('#aic-key').value = '';
  $('#aic-key').type = 'password';
  $('#aic-key').placeholder = c.has_key ? t('aicfg.keyKeep', { h: c.key_hint }) : t('aicfg.keyNone');
  $('#aic-model').value = c.model || '';
  $('#aic-api').value = c.api || 'auto';
  $('#aic-timeout').value = c.timeout || 25;
  $('#aic-header').value = c.auth_header || '';
  $('#aic-prefix').value = c.auth_prefix || '';
  $('#aic-auto').checked = !!c.auto;
  const r = $('#aic-test-res'); r.textContent = ''; r.className = 'aic-test';
  $('#aimodal').hidden = false;
}

function aiConfPayload() {
  const p = {
    enabled: $('#aic-enabled').checked, endpoint: $('#aic-endpoint').value.trim(),
    model: $('#aic-model').value.trim(), api: $('#aic-api').value,
    timeout: $('#aic-timeout').value, auth_header: $('#aic-header').value.trim(),
    auth_prefix: $('#aic-prefix').value.trim(), auto: $('#aic-auto').checked
  };
  const k = $('#aic-key').value.trim();
  if (k) p.api_key = k;                // vuota = resta quella salvata
  return p;
}

async function saveAiConfig() {
  const btn = $('#aimodal-save');
  btn.disabled = true;
  try {
    aiConf = await apiPost('/api/ai/config', aiConfPayload());
    syncAiSide();
    $('#aimodal').hidden = true;
    $('#stat').textContent = t('aicfg.saved');
  } catch (err) {
    alert(t('err.opFailed', { e: err.message }));
  } finally {
    btn.disabled = false;
  }
}

async function testAiConfig() {
  const r = $('#aic-test-res'), btn = $('#aimodal-test');
  btn.disabled = true;
  r.className = 'aic-test'; r.textContent = t('aicfg.testing');
  try {
    // si prova la configurazione SALVATA: prima si salva quella del modulo
    aiConf = await apiPost('/api/ai/config', aiConfPayload());
    syncAiSide();
    $('#aic-key').value = '';
    $('#aic-key').placeholder = aiConf.has_key ? t('aicfg.keyKeep', { h: aiConf.key_hint }) : t('aicfg.keyNone');
    const j = await apiPost('/api/ai/test', {});
    r.className = 'aic-test ' + (j.ok ? 'ok' : 'err');
    r.textContent = j.ok ? t('aicfg.testOk', { ms: j.ms, model: j.model, api: j.api || '' })
                         : t('aicfg.testErr', { e: j.error, ms: j.ms });
  } catch (err) {
    r.className = 'aic-test err'; r.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
}

on('#aiSettings', 'click', openAiConfig);
on('#aimodal-save', 'click', saveAiConfig);
on('#aimodal-test', 'click', testAiConfig);
on('#aimodal-close', 'click', () => { $('#aimodal').hidden = true; });
on('#aimodal', 'click', e => { if (e.target.id === 'aimodal' && !dragEnd('aimodal')) $('#aimodal').hidden = true; });
on('#aic-key-eye', 'click', () => {
  const k = $('#aic-key'); k.type = k.type === 'password' ? 'text' : 'password';
});
/* interruttore nella barra laterale: accende/spegne subito (salvato in chatbot.conf) */
on('#aiSwitch', 'change', async e => {
  const want = e.target.checked;
  try {
    aiConf = await apiPost('/api/ai/config', { enabled: want });
    $('#stat').textContent = want ? t('ai.switchedOn') : t('ai.switchedOff');
  } catch (err) {
    alert(t('err.opFailed', { e: err.message }));
  }
  syncAiSide();
});
loadAiConf();

/* ================= PANNELLO MODIFICHE MANUALI ================= */
let manData = { added: [], links: [], labels: [] };   // ultimo elenco ricevuto
let manShowAll = false;                   // false = solo le prime MAN_LIMIT voci
const MAN_LIMIT = 8;

async function openManual() {
  const box = $('#manmodal');
  if (!box) return;
  $('#manmodal-body').innerHTML = `<div class="empty">${esc(t('err.loading'))}</div>`;
  box.hidden = false;
  try {
    const r = await fetch('/api/manual');
    if (r.status === 404) throw new Error(t('err.restartServer'));
    manData = await r.json();
    renderManual();
  } catch (err) {
    $('#manmodal-body').innerHTML = `<div class="empty">${esc(t('err.generic', { e: err.message }))}</div>`;
    $('#manmodal-sub').textContent = '';
  }
}

/* Etichetta leggibile di un nodo: dal grafo se c'è, altrimenti l'id. */
const nodeLabel = id => {
  const n = cy && cy.getElementById(id);
  return (n && n.length && n.data('label')) || id;
};

/* Disegna l'elenco applicando il filtro di testo e il limite di righe.
   Con molte modifiche l'elenco resta corto: il pulsante mostra tutto. */
function renderManual() {
  const q = (($('#man-filter') && $('#man-filter').value) || '').trim().toLowerCase();
  const hit = s => !q || String(s || '').toLowerCase().includes(q);

  const added = (manData.added || []).filter(a =>
    hit(a.label) || hit(a.id) || hit(a.platform) || hit(nodeLabel(a.parent)) || hit(a.url));
  const links = (manData.links || []).filter(l =>
    hit(nodeLabel(l.a)) || hit(nodeLabel(l.b)) || hit(l.a) || hit(l.b));
  const labels = (manData.labels || []).filter(x =>
    hit(x.label) || hit(x.orig) || hit(x.id) || hit(x.ntype));

  const totAll = (manData.added || []).length + (manData.links || []).length +
                 (manData.labels || []).length;
  const totHit = added.length + links.length + labels.length;
  $('#manmodal-sub').textContent =
    t('man.sub', { a: (manData.added || []).length, b: (manData.links || []).length,
                   c: (manData.labels || []).length });

  const cut = arr => (manShowAll ? arr : arr.slice(0, MAN_LIMIT));
  const shownA = cut(added), shownL = cut(links), shownE = cut(labels);
  const shown = shownA.length + shownL.length + shownE.length;

  // pulsante "mostra tutto / mostra meno"
  const btn = $('#man-showall');
  if (btn) {
    const needed = totHit > shown || manShowAll;
    btn.hidden = !needed;
    btn.textContent = manShowAll ? t('man.showLess') : t('man.showAllBtn', { n: totHit });
  }

  let h = '';
  if (q && !totHit) {
    h = `<div class="empty">${esc(t('man.noMatch'))}</div>`;
  } else {
    h += `<div class="mn-cat">${esc(t('man.addedNodes'))}</div>`;
    h += shownA.length ? shownA.map(a => `
        <div class="dl-row">
          <div class="dl-info">
            <div class="dl-lab">${esc(a.label || a.id)}</div>
            <div class="dl-meta">${esc([a.ntype, a.platform].filter(Boolean).join(' · '))}${a.at ? ' · ' + esc(a.at) : ''}</div>
            <div class="dl-tg">${esc(t('man.connectedTo'))} <span>${esc(nodeLabel(a.parent))}</span></div>
            ${a.url ? `<div class="mn-url">${esc(a.url)}</div>` : ''}
          </div>
          <button class="dl-btn danger" data-delnode="${esc(a.id)}">${esc(t('btn.delete'))}</button>
        </div>`).join('')
      : `<div class="empty">${esc(t('man.noNodes'))}</div>`;

    h += `<div class="mn-cat">${esc(t('man.createdLinks'))}</div>`;
    h += shownL.length ? shownL.map(l => `
        <div class="dl-row">
          <div class="dl-info">
            <div class="dl-lab mn-link">
              <span>${esc(nodeLabel(l.a))}</span><i>${ARROW_SYM[l.arrow || 'none']}</i><span>${esc(nodeLabel(l.b))}</span>
              ${l.label ? `<span class="mn-edge-lbl">${esc(l.label)}</span>` : ''}
            </div>
            <div class="dl-meta">${l.at ? esc(l.at) : ''}</div>
          </div>
          ${cy && cy.getElementById(l.edge_id || '').length
            ? `<button class="dl-btn" data-editedge="${esc(l.edge_id)}">${esc(t('edge.editBtn'))}</button>` : ''}
          <button class="dl-btn danger" data-dellink="${esc(l.a)}|${esc(l.b)}"
                  data-edge="${esc(l.edge_id || '')}">${esc(t('btn.delete'))}</button>
        </div>`).join('')
      : `<div class="empty">${esc(t('man.noLinks'))}</div>`;

    h += `<div class="mn-cat">${esc(t('man.renamedLabels'))}</div>`;
    h += shownE.length ? shownE.map(x => `
        <div class="dl-row">
          <div class="dl-info">
            <div class="dl-lab mn-link">
              <span>${esc(x.orig || x.id)}</span><i>→</i><span>${esc(x.label)}</span>
            </div>
            <div class="dl-meta">${esc([x.ntype].filter(Boolean).join(' · '))}${x.at ? ' · ' + esc(x.at) : ''}</div>
          </div>
          <button class="dl-btn" data-unrename="${esc(x.id)}">${esc(t('man.restoreLabel'))}</button>
        </div>`).join('')
      : `<div class="empty">${esc(t('man.noLabels'))}</div>`;

    if (totHit > shown) {
      h += `<div class="mn-more">${esc(t('man.showing', { shown, total: totHit }))}</div>`;
    }
  }
  void totAll;
  $('#manmodal-body').innerHTML = h;
}

on('#showManual', 'click', () => { manShowAll = false; if ($('#man-filter')) $('#man-filter').value = ''; openManual(); });
on('#man-filter', 'input', () => { manShowAll = false; renderManual(); });
on('#man-showall', 'click', () => { manShowAll = !manShowAll; renderManual(); });
on('#manmodal-close', 'click', () => { $('#manmodal').hidden = true; });
on('#manmodal', 'click', e => { if (e.target.id === 'manmodal' && !dragEnd('manmodal')) $('#manmodal').hidden = true; });

on('#manmodal-body', 'click', async e => {
  const delNode = e.target.closest('[data-delnode]');
  const delLink = e.target.closest('[data-dellink]');
  const unRen = e.target.closest('[data-unrename]');
  const edEdge = e.target.closest('[data-editedge]');
  if (edEdge) {
    $('#manmodal').hidden = true;
    const ed = cy.getElementById(edEdge.dataset.editedge);
    if (ed.length) openEdgeModal(ed);
    return;
  }
  try {
    if (delNode) {
      const id = delNode.dataset.delnode;
      if (!confirm(t('man.confirmNode', { label: nodeLabel(id) }))) return;
      await apiPost('/api/node/remove_manual', { id });
      [visibleNodes, expanded, selected, pinned, placed].forEach(s => s.delete(id));
      cy.getElementById(id).remove();
      INDEX = INDEX.filter(it => it.id !== id);
      ADJ = null;
      renderSel(); refresh(false); buildLegend(); buildCatFilters(); buildDegFilter();
      $('#stat').textContent = t('stat.manualNodeDeleted');
    } else if (delLink) {
      const [a, b] = delLink.dataset.dellink.split('|');
      if (!confirm(t('man.confirmLink', { a: nodeLabel(a), b: nodeLabel(b) }))) return;
      const j = await apiPost('/api/link/delete', { id: delLink.dataset.edge || '', a, b });
      const eid = j.edge_id || delLink.dataset.edge;
      if (eid) {
        const ed = cy.getElementById(eid);
        if (ed.length) {
          [a, b].forEach(id => {
            const m = cy.getElementById(id);
            if (m.length) m.data('deg', Math.max(0, (m.data('deg') || 0) - 1));
          });
          ed.remove();
        }
      }
      ADJ = null;
      refresh(false); buildDegFilter();
      $('#stat').textContent = t('stat.linkDeleted');
    } else if (unRen) {
      const id = unRen.dataset.unrename;
      if (!confirm(t('man.confirmLabel'))) return;
      await apiPost('/api/node/label', { id, label: '' });
      await syncGraph();               // annullando la rinomina salta la fusione
      $('#stat').textContent = t('stat.renameReset');
    } else return;
    openManual();                       // ricarica l'elenco
  } catch (err) {
    alert(t('err.opFailed', { e: err.message }));
  }
});

/* ================= PANNELLO NODI CANCELLATI ================= */
async function openDeleted() {
  const box = $('#delmodal');
  if (!box) return;
  $('#delmodal-body').innerHTML = `<div class="empty">${esc(t('err.loading'))}</div>`;
  box.hidden = false;
  try {
    const r = await fetch('/api/deleted');
    if (r.status === 404) throw new Error(t('err.restartServer'));
    const j = await r.json();
    renderDeleted(j.items || []);
  } catch (err) {
    $('#delmodal-body').innerHTML = `<div class="empty">${esc(t('err.generic', { e: err.message }))}</div>`;
    $('#delmodal-sub').textContent = '';
  }
}

function renderDeleted(items) {
  $('#delmodal-sub').textContent = items.length
    ? t('del.sub', { n: items.length }) : t('del.noneSub');
  $('#delmodal-all').disabled = !items.length;
  if (!items.length) {
    $('#delmodal-body').innerHTML = `<div class="empty">${esc(t('del.none'))}</div>`;
    return;
  }
  $('#delmodal-body').innerHTML = items.map(it => {
    const tg = (it.targets || []).length
      ? `<div class="dl-tg">${esc(t('del.from'))} ` +
        (it.targets || []).map(x => `<span>${esc(x)}</span>`).join('') + '</div>'
      : `<div class="dl-tg dl-none">${esc(t('del.unknownOrigin'))}</div>`;
    const meta = [it.ntype, it.platform].filter(Boolean).map(esc).join(' · ');
    return `<div class="dl-row">
        <div class="dl-info">
          <div class="dl-lab">${esc(it.label || it.id)}</div>
          <div class="dl-meta">${meta}${it.at ? ' · ' + esc(it.at) : ''}</div>
          ${tg}
        </div>
        <button class="dl-btn" data-restore="${esc(it.id)}">${esc(t('del.restore'))}</button>
      </div>`;
  }).join('');
}

/* Ripristino a caldo: i nodi tornano nel grafo senza ricaricare la pagina,
   quindi la vista corrente (nodi aperti, posizioni, zoom) resta intatta. */
async function restoreDeleted(payload, msg) {
  try {
    const j = await apiPost('/api/node/restore', payload);
    const nodes = j.nodes || [], edges = j.edges || [];
    const back = [];

    cy.batch(() => {
      nodes.forEach(n => { addNodeToCy(n); back.push(n.id); });
      edges.forEach(e => {
        if (cy.getElementById(e.id).length) return;
        const s = cy.getElementById(e.source), tt = cy.getElementById(e.target);
        if (s.length && tt.length) cy.add({ group: 'edges', data: Object.assign({}, e) });
      });
    });

    // i gradi si ricalcolano dagli archi realmente presenti
    const touched = new Set(back);
    edges.forEach(e => { touched.add(e.source); touched.add(e.target); });
    touched.forEach(id => {
      const m = cy.getElementById(id);
      if (m.length) m.data('deg', m.connectedEdges().length);
    });

    // i nodi ripristinati diventano visibili, accanto a un vicino già in vista
    const eles = cy.collection();
    back.forEach(id => {
      const n = cy.getElementById(id);
      if (!n.length) return;
      visibleNodes.add(id);
      if (!placed.has(id)) {
        const anchor = n.neighborhood('node').filter(m => placed.has(m.id()))[0];
        if (anchor) {
          const p = anchor.position();
          const a = Math.random() * Math.PI * 2;
          n.position({ x: p.x + Math.cos(a) * 150, y: p.y + Math.sin(a) * 150 });
          placed.add(id);
        }
      }
      eles.merge(n);
    });

    ADJ = null;
    refresh(true);
    buildLegend(); buildCatFilters(); buildDegFilter();
    if (eles.length) {
      eles.addClass('fresh');
      setTimeout(() => eles.removeClass('fresh'), 2000);
      bringIntoView(eles);
    }
    openDeleted();                              // aggiorna l'elenco dei cancellati
    $('#stat').textContent = typeof msg === 'function' ? msg(j.restored) : msg;
  } catch (err) {
    alert(t('err.restoreFailed', { e: err.message }));
  }
}

on('#showDeleted', 'click', openDeleted);
on('#delmodal-close', 'click', () => { $('#delmodal').hidden = true; });
on('#delmodal', 'click', e => { if (e.target.id === 'delmodal' && !dragEnd('delmodal')) $('#delmodal').hidden = true; });
on('#delmodal-body', 'click', e => {
  const b = e.target.closest('[data-restore]');
  if (!b) return;
  restoreDeleted({ id: b.dataset.restore }, () => t('del.restored'));
});
on('#delmodal-all', 'click', () => {
  if (!confirm(t('del.confirmAll'))) return;
  restoreDeleted({ all: true }, n => t('del.restoredAll', { n }));
});

/* ================= LIGHTBOX IMMAGINI ================= */
function openLightbox(src) {
  const lb = $('#lightbox');
  if (!lb || !src) return;
  $('#lb-img').src = src;
  $('#lb-open').href = src;
  lb.hidden = false;
}
function closeLightbox() {
  const lb = $('#lightbox');
  if (!lb) return;
  lb.hidden = true;
  $('#lb-img').src = '';
}
// click su una qualsiasi immagine della scheda -> ingrandimento
on('#modal-body', 'click', e => {
  if (e.target.tagName === 'IMG' && !e.target.closest('.chip')) {
    e.stopPropagation();
    openLightbox(e.target.currentSrc || e.target.src);
  }
});
on('#lightbox', 'click', e => { if (e.target.id !== 'lb-open') closeLightbox(); });
on('#lb-close', 'click', closeLightbox);

/* ================= LEGENDA & FILTRI ================= */
function buildLegend() {
  const l = $('#legend');
  if (!l || !cy) return;
  const used = [...new Set(cy.nodes().map(n => n.data('ntype')))];
  const fused = cy.nodes().filter(n => (n.data('merged') || 1) > 1).length;
  const seed = cy.nodes().some(n => n.data('seed') && n.data('ntype') !== 'target');
  l.innerHTML = used.map(nt =>
      `<span><i style="background:${TYPE_COLOR[nt] || TYPE_COLOR.generic}"></i>` +
      `${esc(groupTitle(nt).replace(/^\S+\s/, ''))}</span>`).join('') +
    (fused ? `<span><i style="background:#f59e0b"></i>${esc(t('card.merged', { n: fused }))}</span>` : '') +
    (seed ? `<span><i class="lg-seed"></i>${esc(t('legend.seed'))}</span>` : '');
}

/* Tendina "Collegamenti": elenco dei numeri di connessioni realmente presenti
   nel grafo. La selezione è ESATTA: ogni voce indica quanti nodi hanno
   precisamente quel numero di collegamenti. */
function buildDegFilter() {
  const sel = $('#minDeg');
  if (!sel || !cy) return;
  const counts = new Map();
  cy.nodes().forEach(n => {
    const d = n.data('deg') || 0;
    if (d >= 1) counts.set(d, (counts.get(d) || 0) + 1);
  });
  let html = `<option value="0">${esc(t('opt.all'))}</option>`;
  for (const d of [...counts.keys()].sort((a, b) => a - b)) {
    html += `<option value="${d}">${esc(t('opt.degree', { d, n: counts.get(d) }))}</option>`;
  }
  sel.innerHTML = html;
  sel.value = String(degFilter);
}

/* Pulsanti categoria: uno per ogni categoria presente nel grafo, con conteggio.
   Click = mostra/nascondi tutti i nodi di quella categoria. */
function buildCatFilters() {
  const box = $('#catFilters');
  if (!box || !cy) return;
  const counts = {};
  cy.nodes().forEach(n => { const c = n.data('cat') || 'altro'; counts[c] = (counts[c] || 0) + 1; });
  box.innerHTML = CATEGORIES.filter(c => counts[c.key]).map(c => {
    const off = hiddenCats.has(c.key);
    const lab = catLabel(c.key);
    return `<button class="cat-btn${off ? ' off' : ' on'}" data-cat="${c.key}" ` +
      `style="--cat:${c.color}" title="${esc(t('cat.toggle', { name: lab }))}">` +
      `<i class="cat-dot" style="background:${c.color}"></i>` +
      `<span class="cat-lb">${esc(lab)}</span>` +
      `<span class="cat-n">${counts[c.key]}</span></button>`;
  }).join('');
  syncCatButtons();
}

/* Chiavi delle categorie realmente presenti nel grafo. */
function presentCatKeys() {
  const s = new Set();
  cy.nodes().forEach(n => s.add(n.data('cat') || 'altro'));
  return [...s];
}

/* Allinea le classi dei pulsanti a hiddenCats e aggiorna l'etichetta del
   pulsante "Nascondi/Mostra tutto" in base allo stato corrente. */
function syncCatButtons() {
  document.querySelectorAll('#catFilters .cat-btn').forEach(b => {
    const off = hiddenCats.has(b.dataset.cat);
    b.classList.toggle('off', off);
    b.classList.toggle('on', !off);
  });
  const tg = $('#catToggleAll');
  if (tg) {
    const keys = presentCatKeys();
    const allHidden = keys.length > 0 && keys.every(k => hiddenCats.has(k));
    tg.textContent = allHidden ? t('btn.showAll') : t('btn.hideAll');
  }
}

/* ================= EVENT HANDLERS ================= */
on('#search', 'input', e => {
  const v = e.target.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => searchNodes(v), 160);
});
on('#search', 'keydown', e => {
  if (e.key === 'Enter') { clearTimeout(searchTimer); searchNodes($('#search').value); }
  if (e.key === 'Escape') hideResults();
});
on('#search', 'focus', () => { if ($('#search-results').children.length) $('#search-results').style.display = 'block'; });
on('#searchBtn', 'click', () => { clearTimeout(searchTimer); searchNodes($('#search').value); });
on('#addAll', 'click', showAllMatches);
/* Porta nel grafo tutti i nodi target (senza espanderli). */
on('#loadTargets', 'click', () => {
  if (!cy) return;
  const ids = cy.nodes().filter(n => n.data('ntype') === 'target').map(n => n.id());
  if (!ids.length) { $('#stat').textContent = t('stat.noTargets'); return; }
  addToGraph(ids, false);
  runLayout({ fit: true });
  $('#stat').textContent = t('stat.targetsLoaded', { n: ids.length });
});
on('#fuzzy', 'change', e => {
  $('#fuzzyLevel').disabled = !e.target.checked;
  if (!e.target.checked) DIST = new Map();
  searchNodes($('#search').value);
});
on('#fuzzyLevel', 'change', () => searchNodes($('#search').value));

on('#toggleIds', 'change', e => { showIds = e.target.checked; refresh(true); });
on('#depth', 'change', () => refresh(true));
on('#minDeg', 'change', e => {
  degFilter = parseInt(e.target.value, 10) || 0;
  if (!degFilter) degOnly = false;          // senza filtro il comando non serve
  syncDegOnlyBtn();
  refresh(true);
});
on('#degOnly', 'click', () => {
  degOnly = !degOnly;
  syncDegOnlyBtn();
  refresh(true);
});

/* ---- selettore di lingua ---- */
function buildLangSelector() {
  const sel = $('#langSel');
  if (!sel) return;
  sel.innerHTML = LANGS.map(l =>
    `<option value="${l.code}">${esc(l.name)}</option>`).join('');
  sel.value = LANG;
}
on('#langSel', 'change', e => setLang(e.target.value));

/* Richiamata da setLang(): ridisegna tutto ciò che contiene testo tradotto. */
function onLangChange() {
  const sel = $('#langSel');
  if (sel && sel.value !== LANG) sel.value = LANG;   // tiene allineato il selettore
  document.querySelectorAll('.edge-props').forEach(b => updateEdgePreview(b.dataset.prefix));
  fillOntoOptions();                               // tipi investigativi nella lingua scelta
  loadGStyle();                                    // forme dei collegamenti
  if ($('#add-onto-row')) $('#add-onto-row').dataset.kind = '';
  if (!cy) {
    // grafo non ancora caricato: i testi dinamici della barra laterale si
    // traducono comunque (altrimenti restavano in italiano)
    const tg = $('#catToggleAll');
    if (tg) tg.textContent = t('btn.hideAll');
    const md = $('#minDeg');
    if (md && md.options[0]) md.options[0].textContent = t('opt.all');
    return;
  }
  buildLegend();
  buildCatFilters();
  buildDegFilter();
  refreshViews($('#viewList') ? $('#viewList').value : '');
  syncDegOnlyBtn();
  syncHiddenBtn();
  syncAddType();
  renderSel();
  refresh(false);
  if (!$('#manmodal').hidden) renderManual();
  syncAiSide();
  if (!$('#addmodal').hidden) $('#addmodal-save').textContent = aiMode ? t('ai.addAll') : t('add.save');
  if (!$('#linkmodal').hidden && linkIds.length > 2) {
    $('#link-multi-hint').textContent =
      t('link.multiHint', { n: linkIds.length, c: linkIds.length * (linkIds.length - 1) / 2 });
  }
  if (!$('#edgemodal').hidden && edgeEditId) {
    const e = cy.getElementById(edgeEditId);
    if (e.length) $('#edg-kind').textContent = t('edge.kind.' + edgeKind(e));
  }  if (modalNode) openModal(modalNode);            // riapre la scheda tradotta
  const po = $('#pathonly');
  if (po && !po.hidden) po.textContent = pathOnly ? t('btn.showRest') : t('btn.hideRest');
  refreshTranslitBtn();
}
on('#openMode', 'change', e => setOpenMode(e.target.value));
/* Mostra/nascondi una categoria: effetto IMMEDIATO sul grafo.
   - spegnere una categoria toglie subito dalla vista i suoi nodi;
   - riaccenderla li rimette;
   il pulsante resta rosso finché la categoria è spenta.
   Non è un filtro permanente: se in seguito espandi un nodo, i suoi
   collegamenti compaiono comunque (puoi rispegnere la categoria per nasconderli).*/
function hideCat(cat) {
  hiddenCats.add(cat);
  cy.nodes().not('.hidden').forEach(n => {
    if ((n.data('cat') || 'altro') === cat) catHidden.add(n.id());
  });
}
function showCat(cat) {
  hiddenCats.delete(cat);
  [...catHidden].forEach(id => {
    const n = cy.getElementById(id);
    if (!n.length || (n.data('cat') || 'altro') === cat) catHidden.delete(id);
  });
}
on('#catFilters', 'click', e => {
  const b = e.target.closest('.cat-btn');
  if (!b || !cy) return;
  const cat = b.dataset.cat;
  if (hiddenCats.has(cat)) showCat(cat); else hideCat(cat);
  syncCatButtons();
  refresh(false);
});
on('#catToggleAll', 'click', () => {
  if (!cy) return;
  const keys = presentCatKeys();
  const allHidden = keys.length > 0 && keys.every(k => hiddenCats.has(k));
  if (allHidden) keys.forEach(showCat);            // erano tutte spente -> riaccendi
  else keys.forEach(k => { if (!hiddenCats.has(k)) hideCat(k); });   // spegni le accese
  syncCatButtons();
  refresh(false);
});

on('#lyFcose', 'click', () => setLayout('fcose', '#lyFcose'));
on('#lyCircle', 'click', () => setLayout('circle', '#lyCircle'));
on('#lyTree', 'click', () => setLayout('breadthfirst', '#lyTree'));
on('#lyGrid', 'click', () => setLayout('grid', '#lyGrid'));
on('#lyUntangle', 'click', untangle);

on('#expandAll', 'click', () => {
  const ids = [];
  cy.nodes().not('.hidden').forEach(n => {
    expanded.add(n.id()); visibleNodes.add(n.id());
    ids.push(n.id(), ...nbhd(n, depthVal()).map(m => m.id()));
  });
  unhide(ids);                       // espandere tutto mostra davvero tutto
  refresh(true);
  runLayout({ fit: true });
});
on('#collapseAll', 'click', () => { expanded.clear(); refresh(false); });
on('#clearGraph', 'click', () => {
  expanded.clear(); visibleNodes.clear(); pinned.clear(); placed.clear();
  hiddenNodes.clear(); catHidden.clear(); clearFocus(true);
  // azzera anche i filtri, altrimenti il grafo si ripopola subito
  degFilter = 0; degOnly = false;
  if ($('#minDeg')) $('#minDeg').value = '0';
  hiddenCats.clear();
  syncHiddenBtn(); syncDegOnlyBtn(); syncCatButtons();
  clearSel(); clearHl(); refresh(false);
  document.querySelectorAll('#search-results li.added').forEach(li => li.classList.remove('added'));
});
on('#fit', 'click', () => { if (cy) { cy.fit(cy.elements().not('.hidden'), 50); capZoom(1.8); } });

/* ================= VISTE SALVATE ================= */
/* Fotografa lo stato corrente del grafo: nodi a schermo con la loro posizione,
   nodi espansi, nascondimenti, filtri e inquadratura (zoom+pan). */
function captureView() {
  // salva OGNI nodo attualmente a schermo con la sua posizione esatta, non solo
  // quelli aggiunti a mano: così anche i vicini mostrati dalle espansioni tornano
  // al loro posto, senza essere riposizionati da capo.
  const nodes = [];
  cy.nodes().not('.hidden').forEach(n => {
    const p = n.position();
    nodes.push({ id: n.id(), x: Math.round(p.x), y: Math.round(p.y) });
  });
  return {
    nodes, expanded: [...expanded], pinned: [...pinned],
    hiddenNodes: [...hiddenNodes], catHidden: [...catHidden], hiddenCats: [...hiddenCats],
    degFilter, degOnly, showIds, depth: depthVal(),
    zoom: cy.zoom(), pan: { ...cy.pan() }
  };
}

/* Ricostruisce il grafo esattamente com'era. Ritorna il numero di nodi della
   vista che non esistono più (dati cambiati nel frattempo). */
function applyView(v) {
  if (!cy || !v) return 0;
  [visibleNodes, expanded, pinned, placed, hiddenNodes, catHidden, hiddenCats,
   selected].forEach(s => s.clear());
  clearFocus(true); clearHl();

  let missing = 0;
  cy.batch(() => {
    (v.nodes || []).forEach(it => {
      const n = cy.getElementById(it.id);
      if (!n.length) { missing++; return; }
      visibleNodes.add(it.id);
      if (typeof it.x === 'number') { n.position({ x: it.x, y: it.y }); placed.add(it.id); }
    });
  });
  (v.expanded || []).forEach(id => { if (cy.getElementById(id).length) expanded.add(id); });
  (v.pinned || []).forEach(id => { if (cy.getElementById(id).length) pinned.add(id); });
  (v.hiddenNodes || []).forEach(id => hiddenNodes.add(id));
  (v.catHidden || []).forEach(id => catHidden.add(id));
  (v.hiddenCats || []).forEach(c => hiddenCats.add(c));

  showIds = (v.showIds === undefined) ? true : !!v.showIds;
  if ($('#toggleIds')) $('#toggleIds').checked = showIds;
  degFilter = v.degFilter || 0;
  degOnly = !!v.degOnly;
  if ($('#minDeg')) $('#minDeg').value = String(degFilter);
  if ($('#depth') && v.depth) $('#depth').value = String(v.depth);
  computeDegReveal();

  syncCatButtons(); syncHiddenBtn(); syncDegOnlyBtn();
  refresh(false);                       // niente layout: le posizioni sono ripristinate
  if (v.zoom && v.pan) { cy.zoom(v.zoom); cy.pan(v.pan); }
  else cy.fit(cy.elements().not('.hidden'), 50);
  return missing;
}

let viewsCache = [];
function fmtViewOpt(v) {
  const d = (v.at || '').slice(0, 16).replace('T', ' ');
  return `${v.name} · ${v.count} ${t('views.nodesShort')}${d ? ' · ' + d : ''}`;
}
async function refreshViews(selectId) {
  const sel = $('#viewList');
  if (!sel) return;
  try {
    const r = await fetch('/api/views');
    const j = await r.json();
    viewsCache = j.items || [];
  } catch (_) { viewsCache = []; }
  const none = `<option value="">${esc(t('views.none'))}</option>`;
  sel.innerHTML = none + viewsCache.map(v =>
    `<option value="${esc(v.id)}">${esc(fmtViewOpt(v))}</option>`).join('');
  if (selectId) sel.value = selectId;
  syncViewButtons();
}
function syncViewButtons() {
  const sel = $('#viewList');
  const has = sel && sel.value;
  if ($('#viewLoad')) $('#viewLoad').disabled = !has;
  if ($('#viewDelete')) $('#viewDelete').disabled = !has;
}
on('#viewList', 'change', syncViewButtons);

on('#viewSave', 'click', async () => {
  if (!cy || !requireCase()) return;
  const inp = $('#viewName');
  const name = (inp.value || '').trim();
  if (!name) { inp.focus(); $('#stat').textContent = t('views.needName'); return; }
  if (!visibleNodes.size) { $('#stat').textContent = t('views.empty'); return; }
  const dup = viewsCache.find(v => v.name.toLowerCase() === name.toLowerCase());
  if (dup && !confirm(t('views.confirmOverwrite', { name }))) return;
  try {
    const j = await apiPost('/api/views/save', { name, view: captureView() });
    inp.value = '';
    await refreshViews(j.id);
    $('#stat').textContent = t(j.overwritten ? 'views.updated' : 'views.saved',
      { name: j.name, n: j.count });
  } catch (e) { $('#stat').textContent = t('views.saveErr'); }
});

on('#viewLoad', 'click', async () => {
  const sel = $('#viewList');
  if (!sel || !sel.value) return;
  try {
    const j = await apiPost('/api/views/load', { id: sel.value });
    const missing = applyView(j.view);
    $('#stat').textContent = missing
      ? t('views.loadedPartial', { name: j.name, m: missing })
      : t('views.loaded', { name: j.name });
  } catch (e) { $('#stat').textContent = t('views.loadErr'); }
});

on('#viewDelete', 'click', async () => {
  const sel = $('#viewList');
  if (!sel || !sel.value) return;
  const v = viewsCache.find(x => x.id === sel.value);
  if (!confirm(t('views.confirmDelete', { name: v ? v.name : '' }))) return;
  try {
    await apiPost('/api/views/delete', { id: sel.value });
    await refreshViews();
    $('#stat').textContent = t('views.deleted');
  } catch (e) { $('#stat').textContent = t('views.deleteErr'); }
});

/* ================= FONTI DOCUMENTALI ================= */
const srcState = { indexed: false, folder: '', count: 0, ocr: false };
const SRC_ICON = { '.pdf': '📕', '.docx': '📘', '.doc': '📘', '.xlsx': '📗',
  '.xls': '📗', '.csv': '📗', '.txt': '📄', '.md': '📄', '.log': '📄',
  '.png': '🖼️', '.jpg': '🖼️', '.jpeg': '🖼️', '.webp': '🖼️', '.gif': '🖼️',
  '.bmp': '🖼️', '.tif': '🖼️', '.tiff': '🖼️' };
const IMG_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff']);

/* Download di Tesseract dall'interfaccia: stato del lavoro sul server. */
const ocrJob = { state: 'idle', stage: '', percent: 0, error: '' };

function ocrJobText() {
  if (ocrJob.stage === 'download') return t('src.ocrDownloading', { p: ocrJob.percent });
  if (ocrJob.stage === 'extract') return t('src.ocrExtracting');
  return t('src.ocrWorking');
}

function renderSrcStatus() {
  const el = $('#srcStatus');
  if (!el) return;
  const ocr = srcState.ocr
    ? `<span class="src-ocr on">${esc(t('src.ocrOn'))}</span>`
    : `<span class="src-ocr">${esc(t('src.ocrOff'))}</span>`;
  let html;
  if (srcState.indexed) {
    const port = srcState.portable ? ` · <span class="src-ocr on">${esc(t('src.portable'))}</span>` : '';
    // se portabile mostro il nome relativo (es. «fonti»), non il percorso assoluto
    const shown = (srcState.portable && srcState.folderRel) ? srcState.folderRel : srcState.folder;
    html = `<b>${srcState.count}</b> ${esc(t('src.files'))} · ${ocr}${port}` +
      `<div class="src-folder" title="${esc(srcState.folder)}">${esc(shown)}</div>`;
  } else {
    html = `<span class="src-none">${esc(t('src.noneYet'))}</span> · ${ocr}`;
  }
  // OCR assente: su Windows un pulsante scarica Tesseract in tools/tesseract,
  // altrove si spiega come installarlo
  if (!srcState.ocr) {
    if (ocrJob.state === 'running') {
      html += `<div class="src-ocr-job">${esc(ocrJobText())}</div>`;
    } else {
      if (ocrJob.state === 'error') html += `<div class="src-ocr-job err">${esc(t('src.ocrErr', { e: ocrJob.error }))}</div>`;
      html += srcState.canInstall
        ? `<button type="button" id="ocrInstall" class="src-ocr-btn">${esc(t('src.ocrInstall'))}</button>`
        : `<div class="src-hint">${esc(t(srcState.ocrReason === 'module' ? 'src.ocrModule' : 'src.ocrUnix'))}</div>`;
    }
  }
  el.innerHTML = html;
}

async function pollOcrInstall() {
  for (;;) {
    await sleep(1000);
    try {
      const j = await fetch('/api/ocr/install/status').then(r => r.json());
      Object.assign(ocrJob, { state: j.state, stage: j.stage, percent: j.percent || 0, error: j.error || '' });
    } catch (_) { continue; }
    if (ocrJob.state !== 'running') break;
    renderSrcStatus();
  }
  if (ocrJob.state === 'done') $('#stat').textContent = t('src.ocrDone');
  await loadSrcStatus();                         // «OCR attivo» e niente più pulsante
}

async function startOcrInstall() {
  if (!confirm(t('src.ocrConfirm', { url: srcState.ocrUrl || '' }))) return;
  try {
    await apiPost('/api/ocr/install', {});
    Object.assign(ocrJob, { state: 'running', stage: 'download', percent: 0, error: '' });
    renderSrcStatus();
    pollOcrInstall();
  } catch (e) {
    Object.assign(ocrJob, { state: 'error', error: e.message });
    renderSrcStatus();
  }
}
on('#srcStatus', 'click', e => { if (e.target.closest('#ocrInstall')) startOcrInstall(); });

async function loadSrcStatus() {
  try {
    const r = await fetch('/api/sources/status');
    const j = await r.json();
    srcState.indexed = !!j.indexed;
    srcState.folder = j.folder || '';
    srcState.count = j.count || 0;
    srcState.ocr = !!j.ocr_available;
    srcState.portable = !!j.portable;
    srcState.folderRel = j.folder_rel || '';
    srcState.defaultFolder = j.default_folder || '';
    srcState.canInstall = !!j.ocr_can_install;
    srcState.ocrReason = j.ocr_reason || '';
    srcState.ocrUrl = j.ocr_url || '';
    // download gia' in corso (es. pagina ricaricata): si riprende a seguirlo
    if (j.ocr_install === 'running' && ocrJob.state !== 'running') {
      ocrJob.state = 'running'; pollOcrInstall();
    }
    // il campo si lascia VUOTO per la cartella 'fonti' predefinita (portabile):
    // così Scansiona usa sempre il percorso relativo. Lo precompilo solo se
  } catch (_) { srcState.indexed = false; }
  renderSrcStatus();
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

on('#srcScan', 'click', async () => {
  // scansiona SEMPRE la cartella 'fonti' del programma: invio la cartella vuota,
  // il server usa la predefinita e la memorizza come percorso relativo (portabile).
  const folder = '';
  const btn = $('#srcScan');
  const old = btn.textContent;
  btn.disabled = true; btn.textContent = t('src.scanning');
  const st = $('#srcStatus');
  st.innerHTML = `<span class="src-busy">${esc(t('src.scanning'))}</span>`;
  try {
    await apiPost('/api/sources/scan', { folder });   // avvia in background
    // segue l'avanzamento con polling di /api/sources/progress
    for (;;) {
      await sleep(300);
      const r = await fetch('/api/sources/progress');
      const p = await r.json();
      if (p.error) throw new Error(p.error);
      if (p.running && p.total) {
        st.innerHTML = `<span class="src-busy">` +
          esc(t('src.indexing', { i: p.done, n: p.total })) +
          `</span><div class="src-folder" title="${esc(p.name)}">${esc(p.name)}</div>`;
      } else if (p.running) {
        st.innerHTML = `<span class="src-busy">${esc(t('src.scanning'))}</span>`;
      }
      if (p.finished) {
        if (p.error) throw new Error(p.error);
        const d = p.summary || {};
        srcState.indexed = true; srcState.folder = d.folder || folder;
        srcState.count = d.count || 0; srcState.ocr = !!d.ocr_available;
        srcState.portable = !!d.portable; srcState.folderRel = d.folder_rel || '';
        renderSrcStatus();
        $('#stat').textContent = t('src.scanned', { n: d.count || 0 });
        break;
      }
    }
  } catch (e) {
    st.innerHTML = `<span class="src-err">${esc(e.message || t('src.scanErr'))}</span>`;
  } finally { btn.disabled = false; btn.textContent = old; }
});

/* Evidenzia il termine trovato dentro uno snippet, dato l'offset. */
function markSnippet(text, at, len) {
  if (typeof at !== 'number' || at < 0) return esc(text);
  return esc(text.slice(0, at)) + '<mark>' + esc(text.slice(at, at + len)) +
    '</mark>' + esc(text.slice(at + len));
}

/* Card HTML di un file-fonte, dato l'HTML degli snippet già evidenziati. */
function srcFileCard(f, snipsHtml) {
  const ic = SRC_ICON[f.ext] || '📄';
  const url = '/api/sources/file/' + encodeURIComponent(f.id);
  const ocr = f.ocr ? ` <span class="src-badge">OCR</span>` : '';
  const prev = IMG_EXTS.has(f.ext)
    ? `<a href="${url}" target="_blank" rel="noopener" class="src-thumb">` +
      `<img src="${url}" loading="lazy" alt=""></a>` : '';
  return `<div class="src-file"><div class="src-file-h"><span class="src-ic">${ic}</span>` +
    `<span class="src-name" title="${esc(f.rel)}">${esc(f.name)}</span>` +
    `<span class="src-occ">${f.occ}×</span>${ocr}` +
    `<a class="src-open" href="${url}" target="_blank" rel="noopener">${esc(t('src.open'))}</a></div>` +
    prev + snipsHtml + `</div>`;
}

function renderSrcResultsInto(box, res, term) {
  if (!res.results || !res.results.length) {
    box.innerHTML = `<div class="src-empty">${esc(t('src.noHits', { q: term }))}</div>`;
    return;
  }
  box.innerHTML =
    `<div class="src-count">${esc(t('src.hits', { n: res.count }))}` +
    (res.truncated ? ' ' + esc(t('src.more')) : '') + `</div>` +
    res.results.map(f => {
      const snips = (f.snippets || []).map(s =>
        `<div class="src-snip">${markSnippet(s.text, s.at, s.len ?? term.length)}</div>`).join('');
      return srcFileCard(f, snips);
    }).join('');
}

/* Scompone la chiave scheda (etichetta del nodo) nei termini da cercare:
   parole >= 3 lettere, escludendo numeri puri e sigle tipo "A2". */
function labelTerms(label) {
  const raw = String(label || '').split(/[\s\-_/.,;:()·|]+/).map(s => s.trim()).filter(Boolean);
  const terms = raw.filter(s => s.length >= 3 && !/^\d+$/.test(s)
    && !/^[a-z]?\d+[a-z]?$/i.test(s));
  return [...new Set(terms)].slice(0, 12);
}

/* ---- ricerca dalla scheda: multi-termine con chip selezionabili ---- */
let srcMulti = null;              // ultimo risultato multi-termine
const srcSel = new Set();         // termini attualmente selezionati

function renderMulti() {
  const box = $('#modal-src-res');
  if (!srcMulti || !srcMulti.terms.length) {
    box.innerHTML = `<div class="src-empty">${esc(t('src.noHitsCard'))}</div>`;
    return;
  }
  const chips = srcMulti.terms.map(tt => {
    const on = srcSel.has(tt.term);
    return `<button class="src-chip${on ? ' on' : ''}" data-term="${esc(tt.term)}">` +
      `${esc(tt.term)}<span class="src-chip-n">${tt.count}</span></button>`;
  }).join('');
  const files = srcMulti.results.filter(f => f.matched.some(m => srcSel.has(m)));
  let body;
  if (!srcSel.size) {
    body = `<div class="src-empty">${esc(t('src.pickTerm'))}</div>`;
  } else {
    body = `<div class="src-count">${esc(t('src.hits', { n: files.length }))}` +
      (srcMulti.truncated ? ' ' + esc(t('src.more')) : '') + `</div>` +
      files.map(f => {
        const snips = (f.snippets || []).filter(s => srcSel.has(s.term)).slice(0, 3)
          .map(s => `<div class="src-snip">${markSnippet(s.text, s.at, s.len)}</div>`).join('');
        return srcFileCard(f, snips);
      }).join('');
  }
  box.innerHTML = `<div class="src-chips">${chips}</div>` + body;
}

async function searchSources() {
  if (!modalNode) return;
  const label = modalNode.data('label') || '';
  let terms = labelTerms(label);
  if (!terms.length) terms = [label];
  const mode = $('#srcExact') && $('#srcExact').checked ? 'total' : 'partial';
  $('#modal-src').hidden = false;
  $('#modal-src-res').innerHTML = `<div class="src-busy">${esc(t('src.searching'))}</div>`;
  try {
    srcMulti = await apiPost('/api/sources/multi', { terms, mode });
    srcSel.clear();
    // all'inizio seleziono la combinazione più specifica (la prima: più parole,
    // più risultati): mostra subito i match migliori. Gli altri chip li aggiungi tu.
    if (srcMulti.terms.length) srcSel.add(srcMulti.terms[0].term);
    renderMulti();
  } catch (e) {
    $('#modal-src-res').innerHTML = `<div class="src-err">${esc(e.message || t('src.searchErr'))}</div>`;
  }
}
on('#modal-src-btn', 'click', searchSources);
on('#srcExact', 'change', () => { if (modalNode && !$('#modal-src').hidden) searchSources(); });
// click sui chip: seleziona/deseleziona un termine e rifiltra i risultati
on('#modal-src-res', 'click', e => {
  const chip = e.target.closest('.src-chip');
  if (!chip) return;
  const term = chip.dataset.term;
  if (srcSel.has(term)) srcSel.delete(term); else srcSel.add(term);
  renderMulti();
});

/* ---- ricerca libera nelle fonti (modal dedicato) ---- */
async function freeSearchSources(term) {
  const q = (term || '').trim();
  if (q.length < 2) { $('#srcQuery').focus(); return; }
  if (!srcState.indexed) { $('#stat').textContent = t('src.noneYet'); return; }
  $('#srcQuery2').value = q;
  $('#srcmodal').hidden = false;
  const box = $('#srcmodal-res');
  box.innerHTML = `<div class="src-busy">${esc(t('src.searching'))}</div>`;
  const mode = $('#srcQueryExact') && $('#srcQueryExact').checked ? 'total' : 'partial';
  try {
    const j = await apiPost('/api/sources/search', { q, mode });
    renderSrcResultsInto(box, j, q);
  } catch (e) {
    box.innerHTML = `<div class="src-err">${esc(e.message || t('src.searchErr'))}</div>`;
  }
}
on('#srcSearch', 'click', () => freeSearchSources($('#srcQuery').value));
on('#srcQuery', 'keydown', e => { if (e.key === 'Enter') freeSearchSources($('#srcQuery').value); });
on('#srcSearch2', 'click', () => freeSearchSources($('#srcQuery2').value));
on('#srcQuery2', 'keydown', e => { if (e.key === 'Enter') freeSearchSources($('#srcQuery2').value); });
on('#srcQueryExact', 'change', () => { if (!$('#srcmodal').hidden) freeSearchSources($('#srcQuery2').value); });
on('#srcmodal-close', 'click', () => { $('#srcmodal').hidden = true; });
on('#srcmodal', 'click', e => { if (e.target.id === 'srcmodal' && !dragEnd('srcmodal')) $('#srcmodal').hidden = true; });

on('#selclear', 'click', clearSel);
on('#findpath', 'click', findPath);
on('#clearpath', 'click', clearHl);
on('#pathonly', 'click', () => {
  pathOnly = !pathOnly;
  $('#pathonly').textContent = pathOnly ? t('btn.showRest') : t('btn.hideRest');
  $('#pathonly').classList.toggle('on', pathOnly);
  refresh(true);
  cy.fit(cy.elements().not('.hidden'), 60);
  capZoom(1.6);
});
on('#maxHops', 'change', () => { if (selected.size >= 2 && cy.nodes('.path').length) findPath(); });

on('#modal-close', 'click', closeModal);
on('#modal', 'click', e => { if (e.target.id === 'modal' && !dragEnd('modal')) closeModal(); });
on('#modal-exp', 'click', () => { if (modalNode) { toggleExpand(modalNode); openModal(modalNode); } });
on('#modal-focus', 'click', () => {
  if (!modalNode) return;
  const id = modalNode.id();
  closeModal();
  addToGraph([id], true);
});
on('#modal-body', 'click', e => {
  if (e.target.closest('a')) return;          // i link del riepilogo restano cliccabili
  const chip = e.target.closest('[data-goto]');
  if (!chip) return;
  const id = chip.dataset.goto;
  closeModal();
  addToGraph([id], true);
});

/* ---- Copia con un click sui valori della scheda ----
   Serve a riusare rapidamente un dato su altri portali o in un documento. */
function flashCopied(el) {
  el.classList.add('copied');
  setTimeout(() => el.classList.remove('copied'), 900);
}

function handleCopyClick(e) {
  // link, foto e pulsanti hanno un comportamento proprio
  if (e.target.closest('a') || e.target.tagName === 'IMG' ||
      e.target.closest('button')) return;
  const el = e.target.closest('[data-cp]');
  if (!el) return;
  const val = el.dataset.cp;
  if (!val) return;
  e.stopPropagation();
  if (copyToClipboard(val)) {
    flashCopied(el);
    $('#stat').textContent = t('cp.done', { v: val.length > 60 ? val.slice(0, 60) + '…' : val });
  }
}
on('#modal-body', 'click', handleCopyClick);
on('#modal-title', 'click', handleCopyClick);

/* "mostra tutto / mostra meno" sui valori lunghi delle schede */
on('#modal-body', 'click', e => {
  const btn = e.target.closest('.lv-more');
  if (!btn) return;
  e.stopPropagation();
  const span = btn.previousElementSibling;
  if (!span || !span.classList.contains('lv')) return;
  const open = span.classList.toggle('open');
  btn.textContent = open ? t('card.showLess') : t('card.showMore');
});

/* POST JSON con errori parlanti: se l'endpoint non esiste (server non
   riavviato) la risposta è una pagina HTML e r.json() darebbe un messaggio
   incomprensibile; qui si distingue il caso e si dice cosa fare. */
async function apiPost(url, payload) {
  let r;
  try {
    r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    throw new Error(t('err.unreachable', { e: e.message }));
  }
  if (r.status === 404) {
    throw new Error(t('err.notFound', { url }));
  }
  const txt = await r.text();
  let j = null;
  try { j = JSON.parse(txt); } catch (_) {
    throw new Error(t('err.badResponse', { s: r.status }));
  }
  if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

/* ---- Nota sul nodo ---- */
on('#modal-note', 'click', async () => {
  if (!modalNode) return;
  const d = modalNode.data();
  const cur = d.note || '';
  const txt = window.prompt(t('note.prompt', { label: d.label }), cur);
  if (txt === null) return;                   // annullato
  try {
    const j = await apiPost('/api/note', { id: d.id, note: txt });
    modalNode.data('note', j.note || '');
    modalNode.toggleClass('noted', !!j.note);
    reindexNode(modalNode);                   // la nota diventa cercabile subito
    $('#modal-body').innerHTML = bodyFor(modalNode);
    $('#stat').textContent = j.note ? t('stat.noteSaved') : t('stat.noteRemoved');
  } catch (err) {
    alert(t('note.failedTitle', { e: err.message }));
  }
});

/* ---- Rinomina la scheda ----
   L'etichetta nuova sta nelle annotazioni: i file di origine non si toccano.
   Se dopo la modifica un'altra scheda rappresenta lo stesso identificativo
   (es. lo stesso numero scritto con 00 e con +) le due diventano una sola. */
async function renameNode(node) {
  if (!node || !node.length) return;
  const d = node.data();
  const cur = String(d.label || '');
  const txt = window.prompt(t('rename.prompt', { label: cur }), cur);
  if (txt === null) return;                   // annullato
  const nuovo = txt.trim();
  if (nuovo === cur.trim()) return;           // niente da cambiare
  try {
    const j = await apiPost('/api/node/label', { id: d.id, label: nuovo });
    await syncGraph();                        // la fusione cambia nodi e archi
    const n = cy.getElementById(j.id);
    if (n && n.length) {
      if (!visibleNodes.has(j.id)) addToGraph([j.id], true);
      openModal(n);
    } else {
      closeModal();
    }
    $('#stat').textContent =
      j.merged ? t('stat.renameMerged', { label: j.label })
      : j.reset ? t('stat.renameReset')
      : t('stat.renamed', { label: j.label });
  } catch (err) {
    alert(t('rename.failed', { e: err.message }));
  }
}
/* ---- Modifica di TUTTI i valori del nodo ----
   Etichetta, URL, nota, ogni campo di ogni scheda e i campi aggiunti a mano.
   I file di origine non si toccano: le modifiche stanno in annotations.json
   e si possono annullare in blocco. */
let editNode = null;

function edRow(key, val, attrs) {
  return `<div class="ed-row" ${attrs}>` +
    `<div class="ed-k" title="${esc(key)}">${esc(key)}</div>` +
    `<textarea rows="${Math.min(6, Math.max(1, Math.ceil(String(val).length / 60)))}">${esc(val)}</textarea>` +
    `<button type="button" class="mini ed-x" title="${esc(t('edit.delField'))}">✕</button></div>`;
}

function edExtraRow(key, val) {
  return `<div class="ed-row ed-extra">` +
    `<input class="ed-k" value="${esc(key)}" placeholder="${esc(t('edit.fieldName'))}">` +
    `<textarea rows="1" placeholder="${esc(t('edit.fieldValue'))}">${esc(val)}</textarea>` +
    `<button type="button" class="mini ed-x" title="${esc(t('edit.delField'))}">✕</button></div>`;
}

function openEditModal(node) {
  if (!node || !node.length) return;
  editNode = node;
  const d = node.data();
  $('#editmodal-sub').textContent = `${d.label} · ${d.ntype} · ${d.id}`;
  let h = `<div class="ed-sec ed-meta"><h4>${esc(t('edit.general'))}</h4>
      <label class="af-lb" for="ed-label">${esc(t('edit.label'))}</label>
      <input id="ed-label" value="${esc(d.label)}">
      <label class="af-lb" for="ed-url">${esc(t('edit.url'))}</label>
      <input id="ed-url" value="${esc(d.url || '')}" placeholder="https://…">
      <label class="af-lb" for="ed-note">${esc(t('card.note'))}</label>
      <textarea id="ed-note" rows="3">${esc(d.note || '')}</textarea>
      <label class="af-check"><input type="checkbox" id="ed-target"${d.ntype === 'target' ? ' checked' : ''}>
        <span>${esc(t('add.isTarget'))}</span></label>
    </div>`;
  const recs = d.records || [];
  let extra = [];
  recs.forEach((r, i) => {
    if (r.extra) { extra = Object.entries(r.raw || {}); return; }
    const rows = flatten(r.raw || {});
    h += `<div class="ed-sec"><h4>${esc(t('card.recordBadge', { i: i + 1, n: recs.length,
      coll: r.collection || t('card.sheet') }))}</h4>` +
      (rows.length ? rows.map(([k, v]) =>
        // i valori accorciati (oltre MAX_VAL) non si modificano: si perderebbe il resto
        edRow(k, v, `data-ri="${i}" data-path="${esc(k)}" data-orig="${esc(v)}"` +
          (v.length > MAX_VAL ? ' data-ro="1"' : ''))).join('')
        : `<div class="af-hint">${esc(t('card.empty'))}</div>`) +
      '</div>';
  });
  h += `<div class="ed-sec"><h4>${esc(t('edit.extra'))}</h4><div id="ed-extra">` +
       extra.map(([k, v]) => edExtraRow(k, v)).join('') + '</div>' +
       `<button type="button" id="ed-addfield" class="mini ed-add">${esc(t('edit.addField'))}</button></div>`;
  $('#editmodal-body').innerHTML = h;
  $('#editmodal-body').querySelectorAll('[data-ro] textarea').forEach(x => { x.readOnly = true; });
  $('#editmodal-reset').hidden = !d.edited;
  $('#editmodal').hidden = false;
}

on('#editmodal-body', 'input', e => {
  const row = e.target.closest('.ed-row[data-ri]');
  if (row) row.classList.toggle('ed-chg', e.target.value !== row.dataset.orig);
});
on('#editmodal-body', 'click', e => {
  if (e.target.id === 'ed-addfield') {
    $('#ed-extra').insertAdjacentHTML('beforeend', edExtraRow('', ''));
    $('#ed-extra').lastElementChild.querySelector('input').focus();
    return;
  }
  const x = e.target.closest('.ed-x');
  if (!x) return;
  const row = x.closest('.ed-row');
  if (row.classList.contains('ed-extra')) row.remove();      // campo aggiunto: via
  else if (!row.dataset.ro) row.classList.toggle('ed-del');  // campo della scheda: segnato
});

async function saveEdit() {
  if (!editNode) return;
  const d = editNode.data();
  const fields = {};
  $('#editmodal-body').querySelectorAll('.ed-row[data-ri]').forEach(row => {
    if (row.dataset.ro) return;
    const key = `${row.dataset.ri}|${row.dataset.path}`;
    const v = row.querySelector('textarea').value;
    if (row.classList.contains('ed-del')) fields[key] = null;
    else if (v !== row.dataset.orig) fields[key] = v;
  });
  const extra = {};
  $('#editmodal-body').querySelectorAll('.ed-extra').forEach(row => {
    const k = row.querySelector('input').value.trim();
    const v = row.querySelector('textarea').value.trim();
    if (k && v) extra[k] = v;
  });
  const oldExtra = ((d.records || []).find(r => r.extra) || {}).raw || {};
  const url = $('#ed-url').value.trim();
  const note = $('#ed-note').value.trim();
  const label = $('#ed-label').value.trim();

  const payload = { id: d.id };
  if (Object.keys(fields).length) payload.fields = fields;
  if (JSON.stringify(extra) !== JSON.stringify(oldExtra)) payload.extra = extra;
  if (url !== (d.url || '')) payload.url = url;
  const btn = $('#editmodal-save');
  btn.disabled = true;
  try {
    if (Object.keys(payload).length > 1) await apiPost('/api/node/edit', payload);
    if (note !== (d.note || '').trim()) await apiPost('/api/note', { id: d.id, note });
    // qualsiasi nodo puo' diventare (o smettere di essere) un target
    const tgt = $('#ed-target') && $('#ed-target').checked;
    if (tgt !== (d.ntype === 'target')) await apiPost('/api/node/target', { id: d.id, target: tgt });
    let id = d.id;
    if (label && label !== String(d.label || '').trim()) {
      const j = await apiPost('/api/node/label', { id: d.id, label });
      id = j.id;                                   // la rinomina può fondere le schede
    }
    await syncGraph();
    $('#editmodal').hidden = true;
    const n = cy.getElementById(id);
    if (n.length) {
      if (!visibleNodes.has(id)) addToGraph([id], false);
      if (modalNode) openModal(n);
    } else closeModal();
    $('#stat').textContent = t('edit.saved', { label: label || d.label });
  } catch (err) {
    alert(t('err.opFailed', { e: err.message }));
  } finally {
    btn.disabled = false;
  }
}

on('#modal-edit', 'click', () => openEditModal(modalNode));
on('#editmodal-save', 'click', saveEdit);
on('#editmodal-close', 'click', () => { $('#editmodal').hidden = true; });
on('#editmodal', 'click', e => { if (e.target.id === 'editmodal' && !dragEnd('editmodal')) $('#editmodal').hidden = true; });
on('#editmodal-reset', 'click', async () => {
  if (!editNode || !confirm(t('edit.confirmReset'))) return;
  try {
    await apiPost('/api/node/edit', { id: editNode.id(), reset: true });
    await syncGraph();
    $('#editmodal').hidden = true;
    const n = cy.getElementById(editNode.id());
    if (n.length && modalNode) openModal(n);
    $('#stat').textContent = t('edit.resetDone');
  } catch (err) {
    alert(t('err.opFailed', { e: err.message }));
  }
});

on('#modal-rename', 'click', () => renameNode(modalNode));
on('#modal-title', 'dblclick', () => renameNode(modalNode));

/* ---- Esporta la scheda in PDF ----
   Si stampa in un iframe nascosto: il browser offre "Salva come PDF" senza
   librerie esterne e senza disturbare la pagina del grafo. */
function cardToPdf(node) {
  const d = node.data();
  const cards = (d.records || []).length;
  const sub = `${d.ntype} · ${d.platform} · ${d.deg} ${t('card.links')} · ` +
              (cards === 1 ? t('card.card', { n: cards }) : t('card.cards', { n: cards })) +
              ((d.merged || 1) > 1 ? ' · ' + t('card.merged', { n: d.merged }) : '');
  const css = `
    *{box-sizing:border-box}
    body{font:12px/1.5 system-ui,-apple-system,sans-serif;color:#0f172a;margin:24px}
    h1{font-size:18px;margin:0 0 2px}
    .sub{color:#64748b;font-size:11px;margin-bottom:4px}
    .gen{color:#94a3b8;font-size:10px;margin-bottom:14px;
         border-bottom:1px solid #e2e8f0;padding-bottom:10px}
    h4{font-size:12px;margin:14px 0 6px;color:#334155}
    h5{display:flex;gap:6px;align-items:center;font-size:11px;margin:8px 0 3px;color:#475569}
    h5 i{display:none}
    .g-cat{font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;
           border-bottom:1px solid #e2e8f0;padding-bottom:2px;margin:12px 0 6px}
    ul.g-list{list-style:none;margin:0;padding:0 0 0 12px}
    ul.g-list li{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 14px;
                 padding:2px 0;border-bottom:1px dotted #e2e8f0;font-size:11px}
    .g-name{font-weight:600;margin-right:8px}
    .g-go{display:none}                     /* pulsanti di navigazione: solo a schermo */
    /* in stampa i testi lunghi vanno per intero */
    .lv{display:block;max-height:none;white-space:pre-wrap;word-break:break-word}
    .lv-more{display:none}
    ul.g-list a{color:#1d4ed8;text-decoration:none;font-size:10px;word-break:break-all}
    ul.g-list li.g-photo{align-items:center;gap:8px;page-break-inside:avoid}
    .g-thumb{width:56px;height:56px;object-fit:cover;border:1px solid #e2e8f0;border-radius:5px}
    ul.g-list li.g-tr{gap:2px 8px}
    .g-orig{font-weight:700;font-size:12px}
    .g-arrow{color:#94a3b8}
    .g-scr{font-style:normal;font-size:8px;text-transform:uppercase;color:#64748b;
           background:#f1f5f9;border-radius:8px;padding:1px 5px}
    .d-note{background:#fef9c3;border:1px solid #eab308;border-left:4px solid #ca8a04;
            border-radius:6px;padding:8px 10px;margin-bottom:12px;color:#713f12}
    .d-note b{display:block;font-size:10px;text-transform:uppercase;margin-bottom:3px}
    .d-ren{background:#f1f5f9;border:1px solid #e2e8f0;border-left:4px solid #94a3b8;
           border-radius:6px;padding:6px 10px;margin-bottom:12px;color:#334155;
           display:flex;gap:8px;align-items:baseline}
    .d-ren b{font-size:10px;text-transform:uppercase;color:#64748b}
    .d-card{border:1px solid #e2e8f0;border-radius:6px;padding:8px;margin:8px 0;
            page-break-inside:avoid}
    .d-badge{font-size:10px;color:#2563eb;font-weight:700;margin-bottom:5px}
    .d-grid{display:grid;grid-template-columns:minmax(120px,32%) 1fr;gap:2px 10px;font-size:10px}
    .d-grid>div:nth-child(odd){color:#64748b;word-break:break-word}
    .d-grid>div:nth-child(even){word-break:break-word}
    .chip{display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;
          padding:1px 7px;margin:2px 3px 0 0;font-size:10px}
    .chip img,.d-imgs img,img.thumb{max-height:70px;max-width:110px;margin:3px}
    details{margin-top:8px} summary{font-size:11px;color:#475569}
    details[open] summary{margin-bottom:6px}
    @page{margin:14mm}`;
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8">
    <title>${esc(d.label)}</title><style>${css}</style></head><body>
    <h1>${esc(d.label)}</h1><div class="sub">${esc(sub)}</div>
    <div class="gen">${esc(t('card.generated', { date: new Date().toLocaleString(LANG) }))}</div>
    ${bodyFor(node, { print: true })}</body></html>`;

  printDoc(html);
}

/* Stampa un documento HTML in un iframe nascosto: il browser propone
   "Salva come PDF" senza librerie esterne e senza disturbare la pagina. */
function printDoc(html, waitMs) {
  const ifr = document.createElement('iframe');
  ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(ifr);
  const doc = ifr.contentDocument;
  doc.open(); doc.write(html); doc.close();
  const go = () => {
    try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (_) {}
    setTimeout(() => ifr.remove(), 1500);      // rimosso a stampa avviata
  };
  // attende il caricamento delle immagini, ma senza bloccarsi
  setTimeout(go, waitMs !== undefined ? waitMs : (doc.images.length ? 700 : 120));
}

/* Intestazione comune dei documenti stampabili. */
const REPORT_CSS = `
  *{box-sizing:border-box}
  body{font:11px/1.45 system-ui,-apple-system,sans-serif;color:#0f172a;margin:18px;
       -webkit-print-color-adjust:exact;print-color-adjust:exact}
  h1{font-size:17px;margin:0 0 2px}
  .gen{color:#94a3b8;font-size:10px;margin-bottom:12px;
       border-bottom:1px solid #e2e8f0;padding-bottom:8px}
  h2{font-size:13px;margin:16px 0 6px;color:#334155}
  table{width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed}
  th{background:#f1f5f9;text-align:left;font-size:9px;text-transform:uppercase;
     letter-spacing:.04em;color:#475569;padding:4px 5px;border:1px solid #e2e8f0}
  td{padding:4px 5px;border:1px solid #e2e8f0;vertical-align:top;
     word-break:break-word;overflow-wrap:anywhere}
  tr{page-break-inside:avoid}
  thead{display:table-header-group}
  .num{color:#64748b;text-align:right}
  .ty{color:#2563eb;white-space:nowrap}
  a{color:#1d4ed8;text-decoration:none}
  img.th{max-width:54px;max-height:54px;object-fit:cover;border:1px solid #e2e8f0;border-radius:4px}
  .note{background:#fef9c3;color:#713f12;padding:2px 4px;border-radius:3px;display:inline-block}
  .sum{display:flex;gap:14px;flex-wrap:wrap;font-size:10px;color:#475569;margin-bottom:10px}
  .sum b{color:#0f172a}
  @page{margin:12mm}`;

/* ---- 1) Esporta l'immagine del grafo visibile ---- */
function exportGraphPdf() {
  const eles = cy.elements().not('.hidden');
  if (!eles.length) { alert(t('exp.empty')); return; }
  let png;
  try {
    png = cy.png({ full: true, scale: 2, bg: '#ffffff', maxWidth: 3000, maxHeight: 3000 });
  } catch (err) {
    alert(t('exp.failed', { e: err.message }));
    return;
  }
  const html = `<!doctype html><html lang="${LANG}"><head><meta charset="utf-8">
    <title>${esc(t('exp.graphTitle'))}</title><style>${REPORT_CSS}
    img.g{width:100%;height:auto;max-height:186mm;object-fit:contain}
    @page{size:A4 landscape;margin:10mm}</style></head><body>
    <h1>${esc(t('exp.graphTitle'))}</h1>
    <div class="gen">${esc(t('card.generated', { date: new Date().toLocaleString(LANG) }))}
      · ${eles.nodes().length} ${esc(t('exp.nodes'))} · ${eles.edges().length} ${esc(t('exp.edges'))}</div>
    <img class="g" src="${png}" alt=""></body></html>`;
  printDoc(html, 900);
  $('#stat').textContent = t('stat.pdfReady');
}

/* ---- 2) Scheda tabellare dei nodi: rapporto di analisi ----
   Volutamente SENZA la tabella dei collegamenti: questo documento e' l'anagrafe
   delle entita' presenti nella vista, non la mappa delle relazioni (quella e'
   il PDF del grafo). L'impaginazione segue lo schema di un rapporto: testata,
   dati del documento, sintesi quantitativa, poi l'inventario per categoria. */
function exportTablePdf() {
  const nodes = cy.nodes().not('.hidden');
  if (!nodes.length) { alert(t('exp.empty')); return; }

  const urlOf = d => {
    if (/^https?:\/\//i.test(d.url || '')) return d.url;
    const mk = SOCIAL_URL[d.platform];
    const h = mk ? socialHandle(d) : '';
    return mk && h ? mk(h) : '';
  };
  // il titolo di categoria senza l'emoji iniziale: in stampa e' solo rumore
  const catName = k => groupTitle(k).replace(/^\S+\s/, '');

  const rows = nodes.map(n => n.data());
  const tot = rows.length;

  // --- conteggi per categoria, dalla piu' numerosa alla meno
  const byType = {};
  rows.forEach(d => { byType[d.ntype] = (byType[d.ntype] || 0) + 1; });
  const cats = Object.keys(byType).sort((a, b) =>
    byType[b] - byType[a] || catName(a).localeCompare(catName(b)));

  const quota = n => (n * 100 / tot);
  const distRows = cats.map(k => {
    const q = quota(byType[k]);
    return `<tr>
      <td class="cat">${esc(catName(k))}</td>
      <td class="num">${byType[k]}</td>
      <td class="pc"><span class="bar"><i style="width:${q.toFixed(1)}%"></i></span>
        <span class="pcv">${q.toFixed(1)}%</span></td>
    </tr>`;
  }).join('');

  // --- inventario: una sezione per categoria, numerazione progressiva unica
  let np = 0;
  const sezioni = cats.map(k => {
    const lista = rows.filter(d => d.ntype === k)
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
    const trs = lista.map(d => {
      const u = urlOf(d);
      np += 1;
      return `<tr>
        <td class="num">${np}</td>
        <td>${d.image ? `<img class="th" src="${esc(d.image)}" onerror="this.remove()" alt="">` : ''}</td>
        <td><b dir="auto">${esc(d.label)}</b></td>
        <td>${esc(d.platform || '—')}</td>
        <td class="num">${d.deg || 0}</td>
        <td>${u ? `<a href="${esc(u)}">${esc(u)}</a>` : ''}</td>
        <td>${d.note ? `<span class="note">${esc(d.note)}</span>` : ''}</td>
      </tr>`;
    }).join('');
    return `<section class="sec">
      <h3>${esc(catName(k))}<span class="cnt">${lista.length}</span></h3>
      <table><colgroup><col class="c1"><col class="c2"><col><col class="c5">
        <col class="c6"><col class="c7"><col class="c8"></colgroup>
        <thead><tr><th>#</th><th>${esc(t('col.image'))}</th><th>${esc(t('col.label'))}</th>
        <th>${esc(t('col.platform'))}</th><th>${esc(t('col.degree'))}</th>
        <th>${esc(t('col.ref'))}</th><th>${esc(t('col.notes'))}</th></tr></thead>
        <tbody>${trs}</tbody></table>
    </section>`;
  }).join('');

  const meta = [
    [t('exp.metaDate'), new Date().toLocaleString(LANG)],
    [t('exp.metaScope'), t('exp.metaScopeVal')],
    [t('exp.metaNodes'), String(tot)],
    [t('exp.metaCats'), String(cats.length)],
  ].map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');

  const html = `<!doctype html><html lang="${LANG}"><head><meta charset="utf-8">
    <title>${esc(t('exp.tableTitle'))}</title><style>${REPORT_CSS}
    .rp-hd{border-bottom:2px solid #0f172a;padding-bottom:9px;margin-bottom:14px}
    .rp-kicker{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
               color:#64748b;margin-bottom:5px}
    .rp-hd h1{font-size:20px;letter-spacing:-.01em;margin:0}
    .rp-sub{font-size:11px;color:#475569;margin-top:2px}
    table.meta{width:min(360px,100%);margin:0 0 18px;font-size:10px}
    table.meta th{width:46%;background:#f8fafc;font-size:9px;letter-spacing:.05em}
    table.meta td{font-weight:600}
    h2{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:#0f172a;
       border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin:20px 0 9px}
    h2 .n{color:#2563eb;margin-right:6px}
    section.sec{margin-bottom:14px;break-inside:auto}
    section.sec h3{display:flex;align-items:center;gap:8px;font-size:11px;margin:13px 0 5px;
                   color:#334155;break-after:avoid;page-break-after:avoid}
    section.sec h3::after{content:"";flex:1;border-bottom:1px dotted #cbd5e1}
    section.sec h3 .cnt{order:3;font-size:9px;font-weight:700;color:#475569;
                        background:#f1f5f9;border:1px solid #e2e8f0;border-radius:9px;padding:0 7px}
    td.cat{font-weight:600}
    td.pc{white-space:nowrap}
    .bar{display:inline-block;width:64px;height:5px;background:#e2e8f0;border-radius:3px;
         overflow:hidden;vertical-align:middle;margin-right:6px}
    .bar i{display:block;height:100%;background:#2563eb}
    .pcv{color:#475569}
    .rp-foot{margin-top:22px;border-top:1px solid #e2e8f0;padding-top:7px;
             font-size:9px;color:#94a3b8}
    col.c1{width:34px} col.c2{width:56px} col.c5{width:74px} col.c6{width:38px}
    col.c7{width:31%} col.c8{width:17%}
    </style></head><body>

    <div class="rp-hd">
      <div class="rp-kicker">${esc(t('brand'))} · ${esc(t('exp.reportKicker'))}</div>
      <h1>${esc(t('exp.reportTitle'))}</h1>
      <div class="rp-sub">${esc(t('exp.reportSub'))}</div>
    </div>

    <table class="meta"><tbody>${meta}</tbody></table>

    <h2><span class="n">1</span>${esc(t('exp.secDist'))}</h2>
    <table><colgroup><col><col class="c6"><col class="c7"></colgroup>
      <thead><tr><th>${esc(t('col.category'))}</th><th>${esc(t('col.count'))}</th>
      <th>${esc(t('col.share'))}</th></tr></thead>
      <tbody>${distRows}</tbody></table>

    <h2><span class="n">2</span>${esc(t('exp.secInv'))}</h2>
    ${sezioni}

    <div class="rp-foot">${esc(t('exp.footNote'))}</div>
    </body></html>`;
  printDoc(html, 900);
  $('#stat').textContent = t('stat.pdfReady');
}

on('#expGraph', 'click', exportGraphPdf);
on('#expTable', 'click', exportTablePdf);
on('#showHidden', 'click', showHiddenNodes);

on('#modal-pdf', 'click', () => {
  if (!modalNode) return;
  cardToPdf(modalNode);
  $('#stat').textContent = t('stat.pdfReady');
});

/* ---- Eliminazione nodo (doppia conferma) ---- */
on('#modal-del', 'click', async () => {
  if (!modalNode) return;
  const d = modalNode.data();
  if (!confirm(t('confirm.delete1', { label: d.label, ntype: d.ntype, deg: d.deg }))) return;
  if (!confirm(t('confirm.delete2', { label: d.label }))) return;
  try {
    // target di provenienza: utile a riconoscere il nodo nell'elenco cancellati
    const targets = [...new Set(collectAround(modalNode, 2)
      .filter(m => m.data('ntype') === 'target')
      .map(m => m.data('label')))];
    await apiPost('/api/node/delete', {
      id: d.id, alias_ids: d.alias_ids || [],
      label: d.label, ntype: d.ntype, platform: d.platform, targets
    });
    const id = d.id;
    closeModal();
    // toglie il nodo dalla vista e da tutti gli insiemi di stato
    [visibleNodes, expanded, selected, pinned, placed].forEach(s => s.delete(id));
    cy.getElementById(id).remove();
    INDEX = INDEX.filter(it => it.id !== id);
    ADJ = null;
    renderSel();
    refresh(false);
    buildLegend();
    $('#stat').textContent = t('stat.nodeDeleted', { label: d.label });
  } catch (err) {
    alert(t('err.deleteFailed', { e: err.message }));
  }
});

/* ---- Crediti: piccolo banner con i dati dello sviluppatore ---- */
const setCredits = mostra => { const b = $('#credmodal'); if (b) b.hidden = !mostra; };
on('#creditsLink', 'click', () => setCredits(true));
on('#credmodal-close', 'click', () => setCredits(false));
// clic fuori dal riquadro = chiusura, come negli altri pannelli
on('#credmodal', 'click', e => { if (e.target.id === 'credmodal') setCredits(false); });

on('#ctx-new-node', 'click', () => { hideCtxMenu(); if (cy) openAdd(null); });
document.addEventListener('mousedown', e => { if (!e.target.closest('#ctxmenu')) hideCtxMenu(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#ctxmenu').hidden) hideCtxMenu();
  else if (!$('#licmodal').hidden) $('#licmodal').hidden = true;
  else if (!$('#credmodal').hidden) setCredits(false);
  else if (!$('#lightbox').hidden) closeLightbox();
  else if (!$('#aimodal').hidden) $('#aimodal').hidden = true;
  else if (!$('#impmodal').hidden) $('#impmodal').hidden = true;
  else if (!$('#editmodal').hidden) $('#editmodal').hidden = true;
  else if (!$('#edgemodal').hidden) closeEdgeModal();
  else if (!$('#linkmodal').hidden) $('#linkmodal').hidden = true;
  else if (!$('#addmodal').hidden) $('#addmodal').hidden = true;
  else if (!$('#manmodal').hidden) $('#manmodal').hidden = true;
  else if (!$('#delmodal').hidden) $('#delmodal').hidden = true;
  else closeModal();
});
document.addEventListener('click', e => { if (!e.target.closest('.search-container')) hideResults(); });

document.addEventListener('contextmenu', e => {
  const el = e.target;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
  e.preventDefault();
}, { capture: true });

/* ================= LICENZE =================
   Il programma (GPL v3 con clausole aggiuntive) e tutti i componenti di terze
   parti: elenco e testi in static/licenses/ (generati da tools/make_licenses.py). */
let licIndex = null, licCur = '';
const LIC_GROUPS = ['program', 'js', 'python', 'assets', 'tools'];

async function openLicenses() {
  $('#licmodal').hidden = false;
  if (!licIndex) {
    $('#lic-list').innerHTML = `<div class="lic-grp">${esc(t('lic.loading'))}</div>`;
    try {
      licIndex = await fetch('/static/licenses/index.json').then(r => r.json());
    } catch (e) {
      $('#lic-list').innerHTML = `<div class="lic-grp">${esc(e.message)}</div>`;
      return;
    }
  }
  renderLicList();
  showLicense(licCur || (licIndex[0] && licIndex[0].id));
}

const licRole = e => (e.role && (e.role[LANG] || e.role.en || e.role.it)) || '';

function renderLicList() {
  const box = $('#lic-list');
  box.innerHTML = LIC_GROUPS.map(g => {
    const items = licIndex.filter(e => e.group === g);
    if (!items.length) return '';
    return `<div class="lic-grp">${esc(t('lic.grp.' + g))}</div>` + items.map(e =>
      `<button type="button" class="lic-item${e.id === licCur ? ' cur' : ''}" data-lic="${esc(e.id)}">` +
      `${esc(e.name)}${e.version ? ` <small>${esc(e.version)}</small>` : ''}` +
      `<small>${esc(e.license)}${e.bundled ? '' : ` · <span class="lic-ext">${esc(t('lic.external'))}</span>`}</small></button>`
    ).join('');
  }).join('');
}

async function showLicense(id) {
  const e = licIndex && licIndex.find(x => x.id === id);
  if (!e) return;
  licCur = id;
  $('#lic-list').querySelectorAll('.lic-item').forEach(b => b.classList.toggle('cur', b.dataset.lic === id));
  $('#lic-meta').innerHTML =
    `<b>${esc(e.name)}</b>${e.version ? ` <span>${esc(e.version)}</span>` : ''}` +
    `<span class="lic-badge">${esc(e.license)}</span>` +
    `<div class="lic-role">${esc(licRole(e))}${e.bundled ? '' : ` · ${esc(t('lic.external'))}`}</div>` +
    (e.copyright ? `<div>${esc(e.copyright)}</div>` : '') +
    (e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.url)}</a>` : '');
  const pre = $('#lic-text');
  pre.textContent = t('lic.loading');
  if (!e.file) { pre.textContent = ''; return; }
  try {
    pre.textContent = await fetch('/static/licenses/' + e.file).then(r => r.text());
  } catch (err) {
    pre.textContent = err.message;
  }
  pre.scrollTop = 0;
}

on('#licLink', 'click', e => { e.preventDefault(); openLicenses(); });
/* manuale d'uso (static/manual/manuale.html, sei lingue): si apre nella lingua dell'interfaccia */
on('#manualLink', 'click', e => {
  e.preventDefault();
  window.open('/static/manual/manuale.html?lang=' + encodeURIComponent(LANG), '_blank', 'noopener');
});
on('#lic-list', 'click', e => { const b = e.target.closest('[data-lic]'); if (b) showLicense(b.dataset.lic); });
on('#licmodal-close', 'click', () => { $('#licmodal').hidden = true; });
on('#licmodal', 'click', e => { if (e.target.id === 'licmodal' && !dragEnd('licmodal')) $('#licmodal').hidden = true; });

/* Traduzioni applicate PRIMA di costruire il grafo, così ogni testo
   generato dinamicamente nasce già nella lingua scelta. */
applyI18n();
buildLangSelector();
load();
refreshTranslitBtn();
/* elementi investigativi nella tendina del tipo di nodo */
fillOntoOptions();
on('#add-onto-row', 'input', updateAddPreview);
on('#add-onto-row', 'change', updateAddPreview);

/* ================= CASI (FASCICOLI) =================
   Ogni caso ha i suoi nodi, schede, collegamenti, note, viste e JSON importati.
   Cambiando caso si ricarica la pagina: lo stato del grafo e' del caso. */
let casesList = [], caseMode = 'new';

async function loadCases() {
  try {
    const j = await fetch('/api/cases').then(r => r.json());
    casesList = j.items || [];
    const cur = casesList.find(c => c.id === j.current);
    hasCase = !!cur;
    const sel = $('#caseSel');
    sel.innerHTML = (hasCase ? '' : `<option value="">${esc(t('case.noneOpt'))}</option>`) +
      casesList.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    sel.value = hasCase ? j.current : '';
    $('#caseDesc').textContent = hasCase ? cur.description || '' : t('case.noneHint');
    $('.case-box').classList.toggle('no-case', !hasCase);
    $('#caseEdit').disabled = !hasCase;
    $('#caseDel').disabled = !hasCase;
    $('#caseMerge').disabled = casesList.length < 2;
    // primo avvio (o ultimo caso eliminato): si chiede subito di creare un caso
    if (!hasCase) openCaseModal('new');
  } catch (e) {
    $('#caseDesc').textContent = e.message;
  }
}

/* Senza un caso aperto non si aggiunge nulla: si apre la finestra per crearne
   uno (o sceglierne uno esistente dalla tendina) con l'avviso del perche'. */
function requireCase() {
  if (hasCase) return true;
  openCaseModal('new');
  $('#cm-msg').textContent = t('case.needCase');
  $('#stat').textContent = t('case.needCase');
  return false;
}

function openCaseModal(mode) {
  caseMode = mode;
  const cur = casesList.find(c => c.id === $('#caseSel').value) || {};
  $('#casemodal-title').textContent = t('case.title.' + mode);
  $('#casemodal-sub').textContent = mode === 'edit' ? cur.name
                                  : mode === 'new' && !hasCase ? t('case.firstHint')
                                  : t('case.sub.' + mode);
  $('#cm-merge').hidden = mode !== 'merge';
  $('#cm-name').value = mode === 'edit' ? cur.name || '' : '';
  $('#cm-desc').value = mode === 'edit' ? cur.description || '' : '';
  $('#cm-delsrc').checked = false;
  $('#cm-msg').textContent = '';
  if (mode === 'merge') {
    $('#cm-list').innerHTML = casesList.map(c =>
      `<label class="af-check"><input type="checkbox" value="${esc(c.id)}"${c.current ? ' checked' : ''}>` +
      `<span>${esc(c.name)}</span></label>`).join('');
  }
  $('#casemodal').hidden = false;
  setTimeout(() => $(mode === 'merge' ? '#cm-list input' : '#cm-name').focus(), 50);
}

async function saveCaseModal() {
  const name = $('#cm-name').value.trim(), description = $('#cm-desc').value.trim();
  const msg = $('#cm-msg');
  msg.classList.add('err');
  try {
    if (caseMode === 'merge') {
      const ids = [...$('#cm-list').querySelectorAll('input:checked')].map(i => i.value);
      if (ids.length < 2) { msg.textContent = t('case.needTwo'); return; }
      if ($('#cm-delsrc').checked && !confirm(t('case.confirmMergeDel', { n: ids.length }))) return;
      await apiPost('/api/cases/merge', { ids, name, description, delete_sources: $('#cm-delsrc').checked });
      location.reload();
    } else if (caseMode === 'edit') {
      if (!name) { msg.textContent = t('case.needName'); return; }
      await apiPost('/api/cases/update', { id: $('#caseSel').value, name, description });
      $('#casemodal').hidden = true;
      loadCases();
    } else {
      if (!name) { msg.textContent = t('case.needName'); return; }
      await apiPost('/api/cases/add', { name, description });
      location.reload();                       // il nuovo caso e' vuoto
    }
  } catch (e) {
    msg.textContent = e.message;
  }
}

on('#caseSel', 'change', async e => {
  if (!e.target.value) return;                 // voce «nessun caso»
  try {
    await apiPost('/api/cases/switch', { id: e.target.value });
    location.reload();
  } catch (err) { alert(err.message); loadCases(); }
});
on('#caseNew', 'click', () => openCaseModal('new'));
on('#caseEdit', 'click', () => openCaseModal('edit'));
on('#caseMerge', 'click', () => openCaseModal('merge'));
on('#caseDel', 'click', async () => {
  const cur = casesList.find(c => c.id === $('#caseSel').value);
  if (!cur || !confirm(t('case.confirmDel', { name: cur.name }))) return;
  try {
    await apiPost('/api/cases/delete', { id: cur.id });
    location.reload();
  } catch (e) { alert(e.message); }
});
on('#casemodal-close', 'click', () => { $('#casemodal').hidden = true; });
on('#casemodal-save', 'click', saveCaseModal);
on('#cm-name', 'keydown', e => { if (e.key === 'Enter') saveCaseModal(); });
loadCases();

/* ============ STILE DI TUTTI I COLLEGAMENTI (pannello di sinistra) ============
   Vale per il grafo intero e si applica sopra lo stile del singolo collegamento,
   che resta salvato: con «come impostati» ogni collegamento torna come prima.
   La scelta e' una preferenza di chi guarda: sta nel browser, non nei dati. */
const GSTYLE = { shape: '', line: '', width: '' };

function loadGStyle() {
  try {
    Object.assign(GSTYLE, JSON.parse(localStorage.getItem('edgeStyle') || '{}'));
  } catch (_) { /* preferenza assente o illeggibile: si resta sui valori attuali */ }
  const sh = $('#gsShape');
  if (sh) {
    sh.innerHTML = `<option value="">${esc(t('gstyle.keep'))}</option>` +
      EDGE_CURVES.map(c => `<option value="${c}">${esc(t('curve.' + c))}</option>`).join('');
    sh.value = GSTYLE.shape || '';
  }
  if ($('#gsLine')) $('#gsLine').value = GSTYLE.line || '';
  if ($('#gsWidth')) $('#gsWidth').value = GSTYLE.width || '';
}

function applyGStyle() {
  if (!cy) return;
  cy.batch(() => {
    cy.edges().forEach(e => {
      const cls = e.classes().filter(c => /^g[slw]-/.test(c));
      if (cls.length) e.removeClass(cls.join(' '));
      if (GSTYLE.shape) e.addClass('gs-' + GSTYLE.shape);
      if (GSTYLE.line) e.addClass('gl-' + GSTYLE.line);
      if (GSTYLE.width) e.addClass('gw-' + GSTYLE.width);
    });
  });
}

function setGStyle(k, v) {
  GSTYLE[k] = v;
  try { localStorage.setItem('edgeStyle', JSON.stringify(GSTYLE)); } catch (_) {}
  applyGStyle();
}

on('#gsShape', 'change', e => setGStyle('shape', e.target.value));
on('#gsLine', 'change', e => setGStyle('line', e.target.value));
on('#gsWidth', 'change', e => setGStyle('width', e.target.value));
loadGStyle();
