/**
 * script.js — Lista Regali
 * ------------------------
 * Logica dell'app: due ruoli (creatore / amico) condividono la stessa lista
 * tramite window.storage (dati "shared" visibili a tutti; dati "personali"
 * visibili solo nel browser di chi li ha inseriti, come ruolo, nome e
 * credenziali Discogs).
 *
 * Indice:
 *   1. Configurazione e stato
 *   2. Helper di storage (persistenza)
 *   3. Import musica: Discogs API + parsing CSV
 *   4. Rendering: regali (creatore / amico)
 *   5. Rendering: musica (creatore / amico)
 *   6. Gate iniziale (scelta ruolo) e navigazione app
 *   7. Listener eventi (form, bottoni, import)
 *   8. Avvio app
 */
(function(){

  /* ---- 1. Configurazione e stato ---- */

  const CREATOR_PASSWORD = 'Pinolo2026!';

  // Chiavi di storage: "shared" = condivisa tra creatore e amici,
  // le altre sono personali (restano nel browser di chi le imposta).
  const GIFTS_KEY = 'gift-list:gifts';               // shared — lista regali manuali
  const CLAIMS_KEY = 'gift-list:claims';             // shared — chi ha preso cosa
  const ROLE_KEY = 'gift-list:role';                 // personale — ruolo scelto
  const NAME_KEY = 'gift-list:friend-name';          // personale — nome amico
  const WANTLIST_KEY = 'gift-list:music-wantlist';   // shared — dischi desiderati
  const COLLECTION_KEY = 'gift-list:music-collection'; // shared — dischi già posseduti
  const DISCOGS_USER_KEY = 'gift-list:discogs-user';   // personale — solo nel browser del creatore
  const DISCOGS_TOKEN_KEY = 'gift-list:discogs-token'; // personale — mai salvato in shared storage

  let role = null;              // 'creator' | 'friend' | null
  let friendName = '';          // nome inserito dall'amico
  let gifts = [];                // regali aggiunti manualmente dal creatore
  let claims = {};               // { [itemId]: { takenBy, takenAt } }
  let wantlist = [];             // dischi desiderati (da Discogs o CSV)
  let collection = [];           // dischi già posseduti (da Discogs o CSV)
  let currentPref = 0;           // valore stelle selezionato nel form "aggiungi regalo"
  let friendSortValue = 'default'; // criterio di ordinamento scelto dall'amico

  const $ = (id) => document.getElementById(id);

  function uid(){ return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  /* ---- 2. Helper di storage ---- */

  async function safeGet(key, shared){
    try{
      const r = await window.storage.get(key, shared);
      return r ? r.value : null;
    }catch(e){ return null; }
  }
  async function safeSet(key, value, shared){
    try{ return await window.storage.set(key, value, shared); }
    catch(e){ console.error('storage set failed', key, e); return null; }
  }

  async function loadRole(){
    const r = await safeGet(ROLE_KEY, false);
    if(r) role = r;
    const n = await safeGet(NAME_KEY, false);
    if(n) friendName = n;
  }

  async function loadGifts(){
    const raw = await safeGet(GIFTS_KEY, true);
    gifts = raw ? JSON.parse(raw) : [];
  }
  async function saveGifts(){
    await safeSet(GIFTS_KEY, JSON.stringify(gifts), true);
  }
  async function loadClaims(){
    const raw = await safeGet(CLAIMS_KEY, true);
    claims = raw ? JSON.parse(raw) : {};
  }
  async function saveClaims(){
    await safeSet(CLAIMS_KEY, JSON.stringify(claims), true);
  }

  async function loadMusic(){
    const w = await safeGet(WANTLIST_KEY, true);
    wantlist = w ? JSON.parse(w) : [];
    const c = await safeGet(COLLECTION_KEY, true);
    collection = c ? JSON.parse(c) : [];
  }
  async function saveMusic(){
    await safeSet(WANTLIST_KEY, JSON.stringify(wantlist), true);
    await safeSet(COLLECTION_KEY, JSON.stringify(collection), true);
  }
  async function loadDiscogsCreds(){
    const u = await safeGet(DISCOGS_USER_KEY, false);
    const t = await safeGet(DISCOGS_TOKEN_KEY, false);
    if(u) $('discogsUser').value = u;
    if(t) $('discogsToken').value = t;
  }

  function escapeHtml(s){
    return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function setStarWidget(el, value){
    el.dataset.value = value;
    el.querySelectorAll('.star').forEach(btn => {
      btn.classList.toggle('filled', Number(btn.dataset.val) <= value);
    });
  }

  function renderPrefDisplay(pref){
    if(!pref) return '';
    let out = '<div class="pref-display">';
    for(let i = 1; i <= 5; i++){
      out += `<span class="${i <= pref ? 'filled' : ''}">★</span>`;
    }
    out += '</div>';
    return out;
  }

  function renderPriceTag(price){
    if(price === null || price === undefined || price === '') return '';
    return `<span class="price-tag">€ ${Number(price).toFixed(2)}</span>`;
  }

  function sortGiftsForFriend(list){
    const arr = list.slice();
    if(friendSortValue === 'pref-desc'){
      arr.sort((a,b) => (b.pref || 0) - (a.pref || 0));
    } else if(friendSortValue === 'price-asc'){
      arr.sort((a,b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    } else if(friendSortValue === 'price-desc'){
      arr.sort((a,b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    }
    return arr;
  }

  /* ---- 3. Import musica: Discogs API + parsing CSV ---- */

  function parseCsv(text){
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for(let i = 0; i < text.length; i++){
      const c = text[i];
      if(inQuotes){
        if(c === '"'){
          if(text[i+1] === '"'){ field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if(c === '"') inQuotes = true;
        else if(c === ','){ row.push(field); field = ''; }
        else if(c === '\n' || c === '\r'){
          if(field !== '' || row.length){ row.push(field); rows.push(row); row = []; field = ''; }
          if(c === '\r' && text[i+1] === '\n') i++;
        } else field += c;
      }
    }
    if(field !== '' || row.length){ row.push(field); rows.push(row); }
    if(rows.length === 0) return [];
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const idx = (name) => headers.indexOf(name);
    const iArtist = idx('artist');
    const iTitle = idx('title');
    const iFormat = idx('format');
    const iYear = idx('released');
    return rows.slice(1).filter(r => r.length > 1).map(r => ({
      artist: iArtist > -1 ? (r[iArtist] || '').trim() : '',
      title: iTitle > -1 ? (r[iTitle] || '').trim() : '',
      format: iFormat > -1 ? (r[iFormat] || '').trim() : '',
      year: iYear > -1 ? (r[iYear] || '').trim() : ''
    })).filter(item => item.title);
  }

  function hashId(prefix, item, index){
    const base = `${item.artist}-${item.title}-${index}`;
    let h = 0;
    for(let i = 0; i < base.length; i++){ h = ((h << 5) - h + base.charCodeAt(i)) | 0; }
    return prefix + Math.abs(h);
  }

  async function fetchDiscogsList(username, token, kind){
    const base = kind === 'collection'
      ? `https://api.discogs.com/users/${encodeURIComponent(username)}/collection/folders/0/releases`
      : `https://api.discogs.com/users/${encodeURIComponent(username)}/wants`;
    let items = [];
    let page = 1;
    const maxPages = 5;
    while(page <= maxPages){
      const res = await fetch(`${base}?token=${encodeURIComponent(token)}&per_page=100&page=${page}`);
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const releases = kind === 'collection' ? data.releases : data.wants;
      if(!releases || releases.length === 0) break;
      releases.forEach(r => {
        const info = r.basic_information;
        if(!info) return;
        items.push({
          id: (kind === 'collection' ? 'c-' : 'w-') + r.id,
          artist: (info.artists && info.artists[0] && info.artists[0].name) || '',
          title: info.title || '',
          year: info.year || '',
          format: (info.formats && info.formats[0] && info.formats[0].name) || ''
        });
      });
      const pages = data.pagination ? data.pagination.pages : 1;
      if(page >= pages) break;
      page++;
    }
    return items;
  }

  /* ---- 4. Rendering: regali (creatore / amico) ---- */

  function renderCreator(){
    const ul = $('creatorGiftList');
    if(gifts.length === 0){
      ul.innerHTML = '<div class="empty">Non hai ancora aggiunto regali. Scrivine uno qui sopra per iniziare la tua lista.</div>';
      return;
    }
    ul.innerHTML = gifts.map(g => `
      <li>
        <div class="gift-main">
          <p class="gift-name">${escapeHtml(g.name)}</p>
          ${g.note ? `<p class="gift-note">${escapeHtml(g.note)}</p>` : ''}
          ${g.link ? `<a class="gift-link" href="${escapeHtml(g.link)}" target="_blank" rel="noopener">Vedi il link</a>` : ''}
          <div class="gift-meta">${renderPriceTag(g.price)}${renderPrefDisplay(g.pref)}</div>
        </div>
        <div class="gift-side">
          <button class="del-btn" data-id="${g.id}">rimuovi</button>
        </div>
      </li>
    `).join('');
    ul.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        gifts = gifts.filter(g => g.id !== btn.dataset.id);
        await saveGifts();
        renderCreator();
      });
    });
  }

  function albumLabel(item){
    const parts = [item.artist, item.title].filter(Boolean).join(' — ');
    const meta = [item.format, item.year].filter(Boolean).join(', ');
    return { parts, meta };
  }

  /* ---- 5. Rendering: musica (creatore / amico) ---- */

  function renderMusicCreator(){
    $('creatorWantlistWrap').style.display = wantlist.length ? 'block' : 'none';
    $('creatorCollectionWrap').style.display = collection.length ? 'block' : 'none';

    $('creatorWantlist').innerHTML = wantlist.map(item => {
      const { parts, meta } = albumLabel(item);
      return `<li><div class="gift-main"><p class="gift-name">${escapeHtml(parts)}</p>${meta ? `<p class="music-sub">${escapeHtml(meta)}</p>` : ''}</div></li>`;
    }).join('');

    $('creatorCollection').innerHTML = collection.map(item => {
      const { parts, meta } = albumLabel(item);
      return `<li><div class="gift-main"><p class="gift-name">${escapeHtml(parts)}</p>${meta ? `<p class="music-sub">${escapeHtml(meta)}</p>` : ''}</div></li>`;
    }).join('');
  }

  function renderMusicFriend(){
    $('friendWantlistWrap').style.display = wantlist.length ? 'block' : 'none';
    $('friendCollectionWrap').style.display = collection.length ? 'block' : 'none';

    $('friendWantlist').innerHTML = wantlist.map(item => {
      const { parts, meta } = albumLabel(item);
      const claim = claims[item.id];
      const takenByMe = claim && claim.takenBy === friendName;
      const statusHtml = claim
        ? `<span class="status taken">Preso da ${escapeHtml(claim.takenBy)}</span>`
        : `<span class="status available">Disponibile</span>`;
      let actionBtn = '';
      if(!claim){
        actionBtn = `<button class="btn btn-outline" data-take="${item.id}" style="padding:7px 14px;font-size:0.82rem;">Lo prendo io</button>`;
      } else if(takenByMe){
        actionBtn = `<button class="btn btn-ghost" data-release="${item.id}" style="padding:7px 0;">annulla</button>`;
      }
      return `
        <li>
          <div class="gift-main">
            <p class="gift-name">${escapeHtml(parts)}</p>
            ${meta ? `<p class="music-sub">${escapeHtml(meta)}</p>` : ''}
          </div>
          <div class="gift-side">${statusHtml}${actionBtn}</div>
        </li>`;
    }).join('');

    $('friendCollection').innerHTML = collection.map(item => {
      const { parts, meta } = albumLabel(item);
      return `
        <li>
          <div class="gift-main">
            <p class="gift-name">${escapeHtml(parts)}</p>
            ${meta ? `<p class="music-sub">${escapeHtml(meta)}</p>` : ''}
          </div>
          <div class="gift-side"><span class="owned-tag">già posseduto</span></div>
        </li>`;
    }).join('');

    $('friendWantlist').querySelectorAll('[data-take]').forEach(btn => {
      btn.addEventListener('click', async () => {
        claims[btn.dataset.take] = { takenBy: friendName, takenAt: Date.now() };
        await saveClaims();
        renderMusicFriend();
      });
    });
    $('friendWantlist').querySelectorAll('[data-release]').forEach(btn => {
      btn.addEventListener('click', async () => {
        delete claims[btn.dataset.release];
        await saveClaims();
        renderMusicFriend();
      });
    });
  }

  function renderFriend(){
    const ul = $('friendGiftList');
    if(gifts.length === 0){
      ul.innerHTML = '<div class="empty">Chi ha creato la lista non ha ancora aggiunto regali. Torna a controllare più tardi.</div>';
      return;
    }
    ul.innerHTML = sortGiftsForFriend(gifts).map(g => {
      const claim = claims[g.id];
      const takenByMe = claim && claim.takenBy === friendName;
      const statusHtml = claim
        ? `<span class="status taken">Preso da ${escapeHtml(claim.takenBy)}</span>`
        : `<span class="status available">Disponibile</span>`;
      let actionBtn = '';
      if(!claim){
        actionBtn = `<button class="btn btn-outline" data-take="${g.id}" style="padding:7px 14px;font-size:0.82rem;">Lo prendo io</button>`;
      } else if(takenByMe){
        actionBtn = `<button class="btn btn-ghost" data-release="${g.id}" style="padding:7px 0;">annulla</button>`;
      }
      return `
        <li>
          <div class="gift-main">
            <p class="gift-name">${escapeHtml(g.name)}</p>
            ${g.note ? `<p class="gift-note">${escapeHtml(g.note)}</p>` : ''}
            ${g.link ? `<a class="gift-link" href="${escapeHtml(g.link)}" target="_blank" rel="noopener">Vedi il link</a>` : ''}
            <div class="gift-meta">${renderPriceTag(g.price)}${renderPrefDisplay(g.pref)}</div>
          </div>
          <div class="gift-side">
            ${statusHtml}
            ${actionBtn}
          </div>
        </li>
      `;
    }).join('');

    ul.querySelectorAll('[data-take]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.take;
        claims[id] = { takenBy: friendName, takenAt: Date.now() };
        await saveClaims();
        renderFriend();
      });
    });
    ul.querySelectorAll('[data-release]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.release;
        delete claims[id];
        await saveClaims();
        renderFriend();
      });
    });
  }

  async function refreshAndRender(){
    await loadGifts();
    await loadMusic();
    if(role === 'creator'){
      renderCreator();
      renderMusicCreator();
    } else if(role === 'friend'){
      await loadClaims();
      renderFriend();
      renderMusicFriend();
    }
  }

  function showApp(){
    $('gate').style.display = 'none';
    $('app').classList.add('show');
    if(role === 'creator'){
      $('creatorPanel').style.display = 'block';
      $('friendPanel').style.display = 'none';
      $('roleLabel').textContent = 'Stai vedendo la lista come creatore';
    } else {
      $('creatorPanel').style.display = 'none';
      $('friendPanel').style.display = 'block';
      $('roleLabel').textContent = friendName ? `Ciao ${friendName}, stai vedendo la lista come amico` : 'Stai vedendo la lista come amico';
    }
  }

  function showGate(){
    $('app').classList.remove('show');
    $('gate').style.display = 'block';
  }

  // --- gate interactions ---
  /* ---- 6. Gate iniziale (scelta ruolo) e navigazione app ---- */

  $('btnCreator').addEventListener('click', () => {
    $('friendNameForm').classList.remove('show');
    $('creatorPassForm').classList.add('show');
    $('creatorPassInput').focus();
  });

  $('creatorPassConfirm').addEventListener('click', confirmCreator);
  $('creatorPassInput').addEventListener('keydown', (e) => { if(e.key === 'Enter') confirmCreator(); });

  async function confirmCreator(){
    const val = $('creatorPassInput').value;
    if(val !== CREATOR_PASSWORD){
      $('creatorPassError').classList.add('show');
      $('creatorPassInput').focus();
      return;
    }
    $('creatorPassError').classList.remove('show');
    role = 'creator';
    await safeSet(ROLE_KEY, role, false);
    showApp();
    await loadDiscogsCreds();
    await refreshAndRender();
  }

  $('btnFriend').addEventListener('click', () => {
    $('creatorPassForm').classList.remove('show');
    $('friendNameForm').classList.add('show');
    $('friendNameInput').focus();
  });

  $('friendNameConfirm').addEventListener('click', confirmFriend);
  $('friendNameInput').addEventListener('keydown', (e) => { if(e.key === 'Enter') confirmFriend(); });

  async function confirmFriend(){
    const val = $('friendNameInput').value.trim();
    if(!val){ $('friendNameInput').focus(); return; }
    friendName = val;
    role = 'friend';
    await safeSet(ROLE_KEY, role, false);
    await safeSet(NAME_KEY, friendName, false);
    showApp();
    await refreshAndRender();
  }

  $('switchRole').addEventListener('click', () => {
    role = null;
    showGate();
  });

  $('giftPrefStars').querySelectorAll('.star').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = Number(btn.dataset.val);
      const current = Number($('giftPrefStars').dataset.value);
      setStarWidget($('giftPrefStars'), val === current ? 0 : val);
      currentPref = Number($('giftPrefStars').dataset.value);
    });
  });

  /* ---- 7. Listener eventi (form, bottoni, import) ---- */

  $('addGiftBtn').addEventListener('click', async () => {
    const name = $('giftName').value.trim();
    if(!name) { $('giftName').focus(); return; }
    const note = $('giftNote').value.trim();
    const link = $('giftLink').value.trim();
    const priceRaw = $('giftPrice').value.trim();
    const price = priceRaw === '' ? null : Math.max(0, parseFloat(priceRaw));
    gifts.push({ id: uid(), name, note, link, price, pref: currentPref, addedAt: Date.now() });
    await saveGifts();
    $('giftName').value = '';
    $('giftNote').value = '';
    $('giftLink').value = '';
    $('giftPrice').value = '';
    currentPref = 0;
    setStarWidget($('giftPrefStars'), 0);
    renderCreator();
  });

  $('friendSort').addEventListener('change', () => {
    friendSortValue = $('friendSort').value;
    renderFriend();
  });

  $('discogsImportBtn').addEventListener('click', async () => {
    const username = $('discogsUser').value.trim();
    const token = $('discogsToken').value.trim();
    const status = $('discogsStatus');
    if(!username || !token){
      status.textContent = 'Inserisci username e token.';
      status.classList.add('err');
      return;
    }
    const btn = $('discogsImportBtn');
    btn.disabled = true;
    status.classList.remove('err');
    status.textContent = 'Importazione in corso…';
    try{
      await safeSet(DISCOGS_USER_KEY, username, false);
      await safeSet(DISCOGS_TOKEN_KEY, token, false);
      const [newWantlist, newCollection] = await Promise.all([
        fetchDiscogsList(username, token, 'wants'),
        fetchDiscogsList(username, token, 'collection')
      ]);
      wantlist = newWantlist;
      collection = newCollection;
      await saveMusic();
      renderMusicCreator();
      status.textContent = `Importati ${newCollection.length} dischi in collezione, ${newWantlist.length} in wantlist.`;
    }catch(e){
      status.classList.add('err');
      status.textContent = 'Importazione non riuscita. Controlla username e token (il browser potrebbe bloccare la richiesta a Discogs).';
    }finally{
      btn.disabled = false;
    }
  });

  function readFileAsText(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  $('csvCollectionFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const status = $('csvStatus');
    try{
      const text = await readFileAsText(file);
      const parsed = parseCsv(text);
      collection = parsed.map((item, i) => ({ ...item, id: hashId('c-', item, i) }));
      await saveMusic();
      renderMusicCreator();
      status.classList.remove('err');
      status.textContent = `Importati ${collection.length} dischi in collezione dal CSV.`;
    }catch(err){
      status.classList.add('err');
      status.textContent = 'Il file CSV non è leggibile.';
    }
  });

  $('csvWantlistFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const status = $('csvStatus');
    try{
      const text = await readFileAsText(file);
      const parsed = parseCsv(text);
      wantlist = parsed.map((item, i) => ({ ...item, id: hashId('w-', item, i) }));
      await saveMusic();
      renderMusicCreator();
      status.classList.remove('err');
      status.textContent = `Importati ${wantlist.length} dischi in wantlist dal CSV.`;
    }catch(err){
      status.classList.add('err');
      status.textContent = 'Il file CSV non è leggibile.';
    }
  });

  /* ---- 8. Avvio app ---- */
  // --- init ---
  (async function init(){
    await loadRole();
    await loadGifts();
    await loadMusic();
    if(role === 'creator' || role === 'friend'){
      if(role === 'friend'){
        await loadClaims();
        showApp();
        renderFriend();
        renderMusicFriend();
      } else {
        showApp();
        await loadDiscogsCreds();
        renderCreator();
        renderMusicCreator();
      }
    } else {
      showGate();
    }

    // light polling so everyone stays in sync without a manual refresh
    setInterval(() => {
      if(role) refreshAndRender();
    }, 4000);
  })();
})();
