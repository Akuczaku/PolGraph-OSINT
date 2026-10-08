(() => {
  'use strict';

  function mk(tag, attrs={}, text='') {
    const el = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) {
      if (k === 'class') el.className = v;
      else if (k === 'style') el.setAttribute('style', v);
      else el.setAttribute(k, v);
    }
    if (text) el.textContent = text;
    return el;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function parseCSV(text, delim=',') {
    const rows = [];
    let row = [], cur = '', q = false;
    for (let i=0;i<text.length;i++) {
      const ch = text[i], nx = text[i+1];
      if (q) {
        if (ch === '"' && nx === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else {
        if (ch === '"') q = true;
        else if (ch === delim) { row.push(cur); cur=''; }
        else if (ch === '\n') { row.push(cur); rows.push(row); row=[]; cur=''; }
        else if (ch !== '\r') cur += ch;
      }
    }
    if (cur.length || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ''));
  }

  function guessDelimiter(text) {
    const sample = text.split(/\r?\n/).slice(0, 5).join('\n');
    const candidates = [',',';','\t','|'];
    let best = ',', score = -1;
    for (const d of candidates) {
      const count = (sample.match(new RegExp('\\' + d, 'g')) || []).length;
      if (count > score) { score = count; best = d; }
    }
    return best;
  }

  function normalizeKey(s) {
    return String(s || '').trim().toLowerCase();
  }

  const PRESETS = {
    person_company: {
      label: 'Osoba ↔ Firma',
      nodeType: 'person',
      relation: 'powiązany z',
      map: {
        label: ['imię i nazwisko', 'imie i nazwisko', 'osoba', 'name', 'label'],
        phone: ['telefon', 'phone'],
        email: ['email', 'e-mail', 'mail'],
        address: ['adres', 'address'],
        company: ['firma', 'company', 'organizacja'],
        nip: ['nip'],
      }
    },
    company: {
      label: 'Podmiot gospodarczy',
      nodeType: 'company',
      relation: 'powiązany z',
      map: {
        label: ['firma', 'company', 'nazwa', 'label'],
        nip: ['nip'],
        regon: ['regon'],
        krs: ['krs'],
        address: ['adres', 'address'],
      }
    },
    vehicle: {
      label: 'Pojazd',
      nodeType: 'vehicle',
      relation: 'powiązany z',
      map: {
        label: ['rejestracja', 'nr rejestracyjny', 'numer rejestracyjny', 'label'],
        vin: ['vin'],
        owner: ['właściciel', 'wlasciciel', 'owner'],
      }
    }
  };

  function chooseHeader(headers, aliases) {
    const idx = headers.findIndex(h => aliases.includes(normalizeKey(h)));
    return idx >= 0 ? headers[idx] : '';
  }

  function toGraph(rows, options) {
    const nodes = [];
    const edges = [];
    const seen = new Set();
    const nodeType = options.nodeType || 'entity';
    const relation = options.relation || 'powiązany z';
    const labelKey = options.labelKey;
    const idKey = options.idKey || labelKey;
    const sourceName = options.sourceName || 'import';

    function pushNode(id, label, extra={}) {
      const key = String(id);
      if (!key || seen.has('N:' + key)) return;
      seen.add('N:' + key);
      nodes.push({
        data: Object.assign({
          id: key,
          label: String(label || id),
          type: nodeType,
          source_db: sourceName
        }, extra)
      });
    }

    function pushEdge(s, t, rel) {
      if (!s || !t) return;
      const eid = `E:${s}->${t}->${rel}`;
      if (seen.has(eid)) return;
      seen.add(eid);
      edges.push({
        data: {
          id: eid,
          source: String(s),
          target: String(t),
          label: rel,
          rel: rel,
          source_db: sourceName
        }
      });
    }

    rows.forEach((row, idx) => {
      const baseId = String(row[idKey] || row[labelKey] || '').trim();
      const label = String(row[labelKey] || baseId || '').trim();
      if (!label) return;

      pushNode(baseId || `${sourceName}_${idx+1}`, label, row);

      // Dodatkowe powiązane obiekty
      const extras = [
        ['phone', 'telefon', 'korzysta z telefonu'],
        ['email', 'e-mail', 'korzysta z adresu e-mail'],
        ['address', 'adres', 'mieszka pod adresem'],
        ['company', 'firma', 'powiązany z'],
        ['nip', 'NIP', 'powiązany z'],
        ['regon', 'REGON', 'powiązany z'],
        ['krs', 'KRS', 'powiązany z'],
        ['vin', 'VIN', 'powiązany z'],
        ['owner', 'właściciel', 'powiązany z'],
      ];

      for (const [col, typ, rel] of extras) {
        const v = String(row[col] || '').trim();
        if (!v) continue;
        const nid = `${typ}:${v}`;
        pushNode(nid, v, {type: typ, source_db: sourceName});
        pushEdge(baseId || `${sourceName}_${idx+1}`, nid, rel);
      }
    });

    return {nodes, edges};
  }

  function applyPreset(presetName, headers) {
    const preset = PRESETS[presetName];
    const out = {labelKey:'', idKey:'', nodeType:preset.nodeType, relation:preset.relation};
    const available = headers.map(normalizeKey);
    for (const [field, aliases] of Object.entries(preset.map)) {
      const chosen = chooseHeader(headers, aliases);
      out[field] = chosen || '';
      if (field === 'label') out.labelKey = chosen || headers[0] || '';
      if (field === 'label') out.idKey = chosen || headers[0] || '';
    }
    return out;
  }

  function findHost() {
    const selectors = ['#settings', '.settings', '[data-section="settings"]', '.sidebar', '#sidebar', 'aside', '.controls', '#controls'];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return document.body;
  }

  function ensureStyles() {
    if (document.getElementById('mydb-style')) return;
    const st = mk('style', {id:'mydb-style'});
    st.textContent = `
      #mydb-panel{margin:.55rem 0;padding:.7rem;border:1px solid rgba(90,160,120,.35);border-radius:12px}
      #mydb-panel[hidden]{display:none!important}
      .mydb-title{font-weight:700;margin-bottom:.5rem}
      .mydb-row{display:flex;gap:.35rem;flex-wrap:wrap;margin:.35rem 0}
      .mydb-input,.mydb-select{flex:1 1 180px;min-width:120px;padding:.4rem .5rem;border-radius:7px;border:1px solid rgba(120,120,120,.45)}
      .mydb-btn{padding:.38rem .55rem;border-radius:8px;border:1px solid rgba(120,120,120,.45);cursor:pointer;background:transparent;color:inherit}
      .mydb-btn:hover{filter:brightness(1.08)}
      .mydb-note{font-size:.82em;opacity:.72;margin-top:.45rem}
      .mydb-status{font-size:.9em;opacity:.9}
      .mydb-pre{white-space:pre-wrap;font-size:.82em;max-height:180px;overflow:auto;border:1px dashed rgba(120,120,120,.3);padding:.45rem;border-radius:8px}
    `;
    document.head.appendChild(st);
  }

  function ensurePanel() {
    if (document.getElementById('mydb-panel')) return;
    const host = findHost();
    const panel = mk('div', {id:'mydb-panel'});
    panel.appendChild(mk('div', {class:'mydb-title'}, '🗄 Moje bazy'));

    const row1 = mk('div', {class:'mydb-row'});
    const file = mk('input', {id:'mydb-file', class:'mydb-input', type:'file', accept:'.csv,.json,.txt,.ndjson,.graph.json'});
    const sourceName = mk('input', {id:'mydb-source-name', class:'mydb-input', type:'text', placeholder:'Nazwa źródła, np. Baza członków'});
    row1.append(file, sourceName);
    panel.appendChild(row1);

    const row2 = mk('div', {class:'mydb-row'});
    const preset = mk('select', {id:'mydb-preset', class:'mydb-select'});
    Object.entries(PRESETS).forEach(([key, val]) => {
      const o = mk('option', {value:key}, val.label);
      preset.appendChild(o);
    });
    const delim = mk('select', {id:'mydb-delim', class:'mydb-select'});
    [['auto','Auto'], [',','Przecinek'], [';','Średnik'], ['\t','Tab'], ['|','Pipe']].forEach(([v,t]) => {
      delim.appendChild(mk('option', {value:v}, t));
    });
    const preview = mk('button', {type:'button', class:'mydb-btn'}, 'Podgląd');
    const importBtn = mk('button', {type:'button', class:'mydb-btn'}, 'Importuj do grafu');
    const exportBtn = mk('button', {type:'button', class:'mydb-btn'}, 'Eksportuj Graph JSON');
    row2.append(preset, delim, preview, importBtn, exportBtn);
    panel.appendChild(row2);

    const status = mk('div', {id:'mydb-status', class:'mydb-status'}, 'Obsługa bezpośrednia: CSV / JSON / Graph JSON. XLSX i SQLite: użyj pomocnika CLI i zaimportuj wygenerowany Graph JSON.');
    const out = mk('div', {id:'mydb-preview', class:'mydb-pre'}, '');
    panel.append(status, out);
    panel.appendChild(mk('div', {class:'mydb-note'},
      'Każdy węzeł i relacja dostaje pole source_db z nazwą źródła. Dane można importować wielokrotnie z deduplikacją po identyfikatorze.'));
    host.prepend(panel);

    let currentGraph = null;

    function readFileAsText(f) {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.onerror = reject;
        r.readAsText(f, 'utf-8');
      });
    }

    function mapRows(rows, srcName) {
      if (!rows.length) return {nodes:[], edges:[]};
      const headers = rows[0];
      const body = rows.slice(1).map(r => {
        const o = {};
        headers.forEach((h, i) => o[normalizeKey(h)] = String(r[i] ?? '').trim());
        return o;
      });

      const p = applyPreset(preset.value, headers);
      const mapped = body.map(r => ({
        label: r[normalizeKey(p.label || p.labelKey || headers[0])] || '',
        phone: r[normalizeKey(p.phone || '')] || '',
        email: r[normalizeKey(p.email || '')] || '',
        address: r[normalizeKey(p.address || '')] || '',
        company: r[normalizeKey(p.company || '')] || '',
        nip: r[normalizeKey(p.nip || '')] || '',
        regon: r[normalizeKey(p.regon || '')] || '',
        krs: r[normalizeKey(p.krs || '')] || '',
        vin: r[normalizeKey(p.vin || '')] || '',
        owner: r[normalizeKey(p.owner || '')] || '',
      })).filter(x => x.label);
      return toGraph(mapped, {labelKey:'label', idKey:'label', nodeType:p.nodeType, relation:p.relation, sourceName:srcName});
    }

    async function buildGraph() {
      const f = file.files && file.files[0];
      if (!f) { status.textContent = 'Wybierz plik.'; return null; }
      const srcName = sourceName.value.trim() || f.name;
      const txt = await readFileAsText(f);

      // Graph JSON
      try {
        const parsed = JSON.parse(txt);
        if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          status.textContent = `Gotowy Graph JSON: ${parsed.nodes.length} węzłów, ${parsed.edges.length} relacji.`;
          return parsed;
        }
        if (Array.isArray(parsed)) {
          // zwykły JSON array
          const rows = parsed.map(x => Object.fromEntries(Object.entries(x).map(([k,v]) => [normalizeKey(k), String(v ?? '').trim()])));
          const headers = Object.keys(rows[0] || {});
          const body2 = [headers, ...rows.map(r => headers.map(h => r[h] || ''))];
          const g = mapRows(body2, srcName);
          status.textContent = `JSON array -> ${g.nodes.length} węzłów, ${g.edges.length} relacji.`;
          return g;
        }
      } catch (_) {}

      // CSV / TXT
      const d = delim.value === 'auto' ? guessDelimiter(txt) : delim.value;
      const rows = parseCSV(txt, d);
      const g = mapRows(rows, srcName);
      status.textContent = `CSV/TXT -> ${g.nodes.length} węzłów, ${g.edges.length} relacji.`;
      return g;
    }

    preview.addEventListener('click', async () => {
      try {
        currentGraph = await buildGraph();
        if (!currentGraph) return;
        out.textContent = JSON.stringify({
          nodes: currentGraph.nodes.slice(0, 5),
          edges: currentGraph.edges.slice(0, 5)
        }, null, 2);
      } catch (e) {
        status.textContent = 'Błąd podglądu: ' + e;
      }
    });

    importBtn.addEventListener('click', async () => {
      try {
        currentGraph = currentGraph || await buildGraph();
        if (!currentGraph) return;
        if (window.cy && typeof window.cy.add === 'function') {
          const before = window.cy.elements ? window.cy.elements().length : 0;
          window.cy.add([...(currentGraph.nodes || []), ...(currentGraph.edges || [])]);
          if (typeof window.cy.fit === 'function') window.cy.fit();
          const after = window.cy.elements ? window.cy.elements().length : 0;
          status.textContent = `Zaimportowano do grafu. Elementy przed: ${before}, po: ${after}.`;
        } else {
          status.textContent = 'Nie wykryto obiektu Cytoscape (window.cy). Zapisz Graph JSON i zaimportuj ręcznie.';
        }
      } catch (e) {
        status.textContent = 'Błąd importu: ' + e;
      }
    });

    exportBtn.addEventListener('click', async () => {
      try {
        currentGraph = currentGraph || await buildGraph();
        if (!currentGraph) return;
        const blob = new Blob([JSON.stringify(currentGraph, null, 2)], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (sourceName.value.trim() || 'my_database') + '.graph.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } catch (e) {
        status.textContent = 'Błąd eksportu: ' + e;
      }
    });
  }

  function init() {
    ensureStyles();
    ensurePanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }

  const mo = new MutationObserver(() => {
    if (!document.getElementById('mydb-panel')) ensurePanel();
  });
  setTimeout(() => mo.observe(document.body, {childList:true, subtree:true}), 600);
})();