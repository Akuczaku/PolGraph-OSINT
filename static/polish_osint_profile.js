(() => {
  'use strict';

  const STORAGE_PROFILE = 'osintgraph.profile';
  const PROFILE_STANDARD = 'standard';
  const PROFILE_PL = 'pl_osint';

  const OFFICIAL = {
    KRS:   {label:'KRS', url:'https://wyszukiwarka-krs.ms.gov.pl/'},
    PRS:   {label:'Portal Rejestrów Sądowych', url:'https://prs.ms.gov.pl/'},
    CEIDG: {label:'CEIDG', url:'https://aplikacja.ceidg.gov.pl/ceidg/ceidg.public.ui/search.aspx'},
    VAT:   {label:'Wykaz podatników VAT', url:'https://www.podatki.gov.pl/wykaz-podatnikow-vat-wyszukiwarka'},
    REGON: {label:'REGON / GUS', url:'https://wyszukiwarkaregon.stat.gov.pl/appBIR/index.aspx'},
    BIP:   {label:'BIP', url:'https://www.gov.pl/web/bip'}
  };

  function digits(v) { return String(v || '').replace(/\D+/g, ''); }

  function validatePESEL(v) {
    const s = digits(v);
    if (s.length !== 11) return false;
    const w = [1,3,7,9,1,3,7,9,1,3];
    let sum = 0;
    for (let i=0;i<10;i++) sum += Number(s[i])*w[i];
    const c = (10 - (sum % 10)) % 10;
    return c === Number(s[10]);
  }

  function validateNIP(v) {
    const s = digits(v);
    if (s.length !== 10) return false;
    const w = [6,5,7,2,3,4,5,6,7];
    let sum = 0;
    for (let i=0;i<9;i++) sum += Number(s[i])*w[i];
    const c = sum % 11;
    return c !== 10 && c === Number(s[9]);
  }

  function validateREGON(v) {
    const s = digits(v);
    if (s.length === 9) {
      const w = [8,9,2,3,4,5,6,7];
      let c = 0;
      for (let i=0;i<8;i++) c += Number(s[i])*w[i];
      c %= 11; if (c === 10) c = 0;
      return c === Number(s[8]);
    }
    if (s.length === 14) {
      const w = [2,4,8,5,0,9,7,3,6,1,2,4,8];
      let c = 0;
      for (let i=0;i<13;i++) c += Number(s[i])*w[i];
      c %= 11; if (c === 10) c = 0;
      return c === Number(s[13]);
    }
    return false;
  }

  function validateIBANPL(v) {
    let s = String(v || '').replace(/\s+/g,'').toUpperCase();
    if (/^\d{26}$/.test(s)) s = 'PL' + s;
    if (!/^PL\d{26}$/.test(s)) return false;
    const rearranged = s.slice(4) + s.slice(0,4);
    let num = '';
    for (const ch of rearranged) {
      num += /[A-Z]/.test(ch) ? String(ch.charCodeAt(0)-55) : ch;
    }
    let rem = 0;
    for (const ch of num) rem = (rem*10 + Number(ch)) % 97;
    return rem === 1;
  }

  function classify(v) {
    const s = digits(v);
    const out = [];
    if (validatePESEL(v)) out.push('PESEL');
    if (validateNIP(v)) out.push('NIP');
    if ((s.length === 9 || s.length === 14) && validateREGON(v)) out.push('REGON');
    if (s.length === 10) out.push('KRS?');
    if (validateIBANPL(v)) out.push('IBAN PL');
    return out;
  }

  function selectedNodeValue() {
    try {
      if (window.cy && typeof window.cy.$ === 'function') {
        const sel = window.cy.$(':selected');
        if (sel && sel.length) {
          const d = sel[0].data ? sel[0].data() : {};
          return d.label || d.name || d.value || d.id || '';
        }
      }
    } catch (_) {}
    return '';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function mk(tag, attrs={}, text='') {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v]) => {
      if (k === 'class') el.className = v;
      else if (k === 'style') el.setAttribute('style', v);
      else el.setAttribute(k, v);
    });
    if (text) el.textContent = text;
    return el;
  }

  function getProfile() {
    return localStorage.getItem(STORAGE_PROFILE) || PROFILE_STANDARD;
  }

  function setProfile(v) {
    localStorage.setItem(STORAGE_PROFILE, v);
    renderProfileState();
    window.dispatchEvent(new CustomEvent('osintgraph-profile-changed', {detail:{profile:v}}));
  }

  function ensureStyles() {
    if (document.getElementById('pl-osint-style')) return;
    const st = mk('style', {id:'pl-osint-style'});
    st.textContent = `
      #pl-osint-settings{font:inherit;margin:.45rem 0;padding:.55rem;border:1px solid rgba(120,120,120,.35);border-radius:10px}
      #pl-osint-settings label{font-weight:600;display:block;margin-bottom:.25rem}
      #pl-osint-profile-select{width:100%;padding:.35rem;border-radius:7px}
      #pl-osint-panel{margin:.55rem 0;padding:.7rem;border:1px solid rgba(60,120,220,.35);border-radius:12px}
      #pl-osint-panel[hidden]{display:none!important}
      .pl-osint-title{font-weight:700;margin-bottom:.5rem}
      .pl-osint-row{display:flex;gap:.35rem;flex-wrap:wrap;margin:.35rem 0}
      .pl-osint-input{flex:1 1 180px;min-width:120px;padding:.4rem .5rem;border-radius:7px;border:1px solid rgba(120,120,120,.45)}
      .pl-osint-btn{padding:.38rem .55rem;border-radius:8px;border:1px solid rgba(120,120,120,.45);cursor:pointer;background:transparent;color:inherit}
      .pl-osint-btn:hover{filter:brightness(1.08)}
      .pl-osint-status{font-size:.9em;opacity:.9;margin-top:.25rem}
      .pl-osint-badge{display:inline-block;padding:.12rem .42rem;margin:.1rem;border-radius:999px;background:rgba(60,120,220,.15)}
      .pl-osint-note{font-size:.82em;opacity:.72;margin-top:.45rem}
    `;
    document.head.appendChild(st);
  }

  function findSettingsHost() {
    const selectors = [
      '#settings', '.settings', '[data-section="settings"]',
      '.sidebar', '#sidebar', 'aside', '.controls', '#controls'
    ];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return document.body;
  }

  function ensureProfileSelector() {
    if (document.getElementById('pl-osint-settings')) return;
    const host = findSettingsHost();
    const box = mk('div', {id:'pl-osint-settings'});
    const label = mk('label', {for:'pl-osint-profile-select'}, 'Profil OSINT');
    const sel = mk('select', {id:'pl-osint-profile-select'});
    const o1 = mk('option', {value:PROFILE_STANDARD}, 'Standard');
    const o2 = mk('option', {value:PROFILE_PL}, 'Polski OSINT');
    sel.append(o1,o2);
    sel.value = getProfile();
    sel.addEventListener('change', () => setProfile(sel.value));
    box.append(label, sel);

    // Nie ingerujemy w selektor języka. To osobne ustawienie.
    const langCandidate = document.querySelector('select[id*="lang" i], select[name*="lang" i], [data-i18n*="lang"]');
    if (langCandidate && langCandidate.parentElement) {
      langCandidate.parentElement.insertAdjacentElement('afterend', box);
    } else {
      host.prepend(box);
    }
  }

  function ensurePanel() {
    if (document.getElementById('pl-osint-panel')) return;
    const host = findSettingsHost();
    const panel = mk('div', {id:'pl-osint-panel', hidden:'hidden'});
    panel.appendChild(mk('div', {class:'pl-osint-title'}, '🇵🇱 Polski OSINT'));

    const row = mk('div', {class:'pl-osint-row'});
    const input = mk('input', {
      id:'pl-osint-value',
      class:'pl-osint-input',
      type:'text',
      placeholder:'PESEL / NIP / REGON / KRS / IBAN'
    });
    const fromNode = mk('button', {type:'button', class:'pl-osint-btn'}, 'Z zaznaczonego węzła');
    fromNode.addEventListener('click', () => {
      const v = selectedNodeValue();
      if (v) { input.value = v; analyze(); }
    });
    const check = mk('button', {type:'button', class:'pl-osint-btn'}, 'Sprawdź');
    row.append(input, fromNode, check);
    panel.appendChild(row);

    const status = mk('div', {id:'pl-osint-status', class:'pl-osint-status'}, 'Profil aktywny.');
    panel.appendChild(status);

    const registryRow = mk('div', {class:'pl-osint-row', id:'pl-osint-registry-row'});
    Object.values(OFFICIAL).forEach(item => {
      const b = mk('button', {type:'button', class:'pl-osint-btn'}, item.label);
      b.addEventListener('click', () => window.open(item.url, '_blank', 'noopener,noreferrer'));
      registryRow.appendChild(b);
    });
    panel.appendChild(registryRow);
    panel.appendChild(mk('div', {class:'pl-osint-note'},
      'Źródła są otwierane ręcznie. Moduł nie omija CAPTCHA, logowania ani innych zabezpieczeń.'));
    host.prepend(panel);

    function analyze() {
      const v = input.value.trim();
      if (!v) { status.textContent = 'Wpisz identyfikator lub pobierz wartość z zaznaczonego węzła.'; return; }
      const kinds = classify(v);
      status.innerHTML = kinds.length
        ? 'Rozpoznano: ' + kinds.map(k => `<span class="pl-osint-badge">${esc(k)}</span>`).join(' ')
        : 'Brak pewnego rozpoznania identyfikatora.';
    }
    check.addEventListener('click', analyze);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });
  }

  function renderProfileState() {
    const profile = getProfile();
    const sel = document.getElementById('pl-osint-profile-select');
    if (sel && sel.value !== profile) sel.value = profile;
    const panel = document.getElementById('pl-osint-panel');
    if (panel) {
      if (profile === PROFILE_PL) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden','hidden');
    }
    document.documentElement.dataset.osintProfile = profile;
  }

  function init() {
    ensureStyles();
    ensureProfileSelector();
    ensurePanel();
    renderProfileState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }

  // Jeśli GUI jest przebudowywane dynamicznie, odtwórz kontrolki.
  const mo = new MutationObserver(() => {
    if (!document.getElementById('pl-osint-settings') || !document.getElementById('pl-osint-panel')) {
      ensureProfileSelector();
      ensurePanel();
      renderProfileState();
    }
  });
  setTimeout(() => mo.observe(document.body, {childList:true, subtree:true}), 500);

  window.OSIntGraphPL = {
    getProfile, setProfile, classify,
    validatePESEL, validateNIP, validateREGON, validateIBANPL
  };
})();