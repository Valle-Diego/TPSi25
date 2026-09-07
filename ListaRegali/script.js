```javascript
/**
 * script.js — Lista Regali
 * ------------------------
 * Logica dell'app: due ruoli (creatore / amico) condividono la stessa lista
 * tramite window.storage (dati "shared" visibili a tutti; dati "personali"
 * visibili solo nel browser di chi li ha inseriti, come ruolo, nome e
 * credenziali Discogs).
 */

(function(){

  /* ---- 1. Configurazione e stato ---- */

  const CREATOR_PASSWORD = 'Pinolo2026!';

  const GIFTS_KEY = 'gift-list:gifts';
  const CLAIMS_KEY = 'gift-list:claims';
  const ROLE_KEY = 'gift-list:role';
  const NAME_KEY = 'gift-list:friend-name';
  const WANTLIST_KEY = 'gift-list:music-wantlist';
  const COLLECTION_KEY = 'gift-list:music-collection';
  const DISCOGS_USER_KEY = 'gift-list:discogs-user';
  const DISCOGS_TOKEN_KEY = 'gift-list:discogs-token';

  let role = null;
  let friendName = '';
  let gifts = [];
  let claims = {};
  let wantlist = [];
  let collection = [];
  let currentPref = 0;
  let friendSortValue = 'default';

  const $ = (id) => document.getElementById(id);

  function uid(){
    return 'g' + Date.now().toString(36) +
      Math.random().toString(36).slice(2,7);
  }


  /* ---- 2. Helper di storage ---- */

  async function safeGet(key, shared){
    try{
      if(window.storage &&
         typeof window.storage.get === 'function'){

        const r = await window.storage.get(key, shared);

        if(r &&
           r.value !== undefined &&
           r.value !== null){

          return r.value;
        }
      }
    }catch(e){
      console.warn('shared storage get failed', key, e);
    }

    try{
      return localStorage.getItem(key);
    }catch(e){
      return null;
    }
  }


  async function safeSet(key, value, shared){
    try{
      if(window.storage &&
         typeof window.storage.set === 'function'){

        const r = await window.storage.set(
          key,
          value,
          shared
        );

        if(r) return r;
      }
    }catch(e){
      console.warn('shared storage set failed', key, e);
    }

    try{
      localStorage.setItem(key, value);
      return true;
    }catch(e){
      console.error('storage set failed', key, e);
      return null;
    }
  }


  function parseStoredArray(raw, fallback=[]){
    try{
      const value = raw ? JSON.parse(raw) : fallback;

      return Array.isArray(value)
        ? value
        : fallback;

    }catch(e){
      return fallback;
    }
  }


  function parseStoredObject(raw, fallback={}){
    try{
      const value = raw ? JSON.parse(raw) : fallback;

      return value &&
             typeof value === 'object' &&
             !Array.isArray(value)
        ? value
        : fallback;

    }catch(e){
      return fallback;
    }
  }


  async function loadRole(){

    const r = await safeGet(
      ROLE_KEY,
      false
    );

    if(r) role = r;


    const n = await safeGet(
      NAME_KEY,
      false
    );

    if(n) friendName = n;
  }


  async function loadGifts(){

    const raw = await safeGet(
      GIFTS_KEY,
      true
    );

    gifts = parseStoredArray(raw);
  }


  async function saveGifts(){

    await safeSet(
      GIFTS_KEY,
      JSON.stringify(gifts),
      true
    );
  }


  async function loadClaims(){

    const raw = await safeGet(
      CLAIMS_KEY,
      true
    );

    claims = parseStoredObject(raw);
  }


  async function saveClaims(){

    await safeSet(
      CLAIMS_KEY,
      JSON.stringify(claims),
      true
    );
  }


  async function loadMusic(){

    const w = await safeGet(
      WANTLIST_KEY,
      true
    );

    wantlist = parseStoredArray(w);


    const c = await safeGet(
      COLLECTION_KEY,
      true
    );

    collection = parseStoredArray(c);
  }


  async function saveMusic(){

    await safeSet(
      WANTLIST_KEY,
      JSON.stringify(wantlist),
      true
    );

    await safeSet(
      COLLECTION_KEY,
      JSON.stringify(collection),
      true
    );
  }


  async function loadDiscogsCreds(){

    const u = await safeGet(
      DISCOGS_USER_KEY,
      false
    );

    const t = await safeGet(
      DISCOGS_TOKEN_KEY,
      false
    );

    if(u)
      $('discogsUser').value = u;

    if(t)
      $('discogsToken').value = t;
  }


  function escapeHtml(s){

    return (s || '').replace(
      /[&<>"']/g,
      c => ({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[c])
    );
  }


  function setStarWidget(el, value){

    el.dataset.value = value;

    el.querySelectorAll('.star').forEach(btn => {

      btn.classList.toggle(
        'filled',
        Number(btn.dataset.val) <= value
      );

    });
  }


  function renderPrefDisplay(pref){

    if(!pref)
      return '';

    let out = '<div class="pref-display">';

    for(let i = 1; i <= 5; i++){

      out += `
        <span class="${i <= pref ? 'filled' : ''}">
          ★
        </span>
      `;

    }

    out += '</div>';

    return out;
  }


  function renderPriceTag(price){

    if(
      price === null ||
      price === undefined ||
      price === ''
    ){
      return '';
    }

    return `
      <span class="price-tag">
        € ${Number(price).toFixed(2)}
      </span>
    `;
  }


  function sortGiftsForFriend(list){

    const arr = list.slice();

    if(friendSortValue === 'pref-desc'){

      arr.sort(
        (a,b) =>
          (b.pref || 0) -
          (a.pref || 0)
      );

    }else if(friendSortValue === 'price-asc'){

      arr.sort(
        (a,b) =>
          (a.price ?? Infinity) -
          (b.price ?? Infinity)
      );

    }else if(friendSortValue === 'price-desc'){

      arr.sort(
        (a,b) =>
          (b.price ?? -Infinity) -
          (a.price ?? -Infinity)
      );
    }

    return arr;
  }


  /* ---- 3. Import musica: Discogs API + parsing CSV ---- */

  function parseCsv(text){

    const rows = [];

    let row = [];
    let field = '';
    let inQuotes = false;


    for(let i = 0; i < text.length; i++){

      const c = text[i];


      if(inQuotes){

        if(c === '"'){

          if(text[i+1] === '"'){

            field += '"';
            i++;

          }else{

            inQuotes = false;
          }

        }else{

          field += c;
        }

      }else{

        if(c === '"'){

          inQuotes = true;

        }else if(c === ','){

          row.push(field);
          field = '';

        }else if(
          c === '\n' ||
          c === '\r'
        ){

          if(
            field !== '' ||
            row.length
          ){

            row.push(field);
            rows.push(row);

            row = [];
            field = '';
          }

          if(
            c === '\r' &&
            text[i+1] === '\n'
          ){

            i++;
          }

        }else{

          field += c;
        }
      }
    }


    if(
      field !== '' ||
      row.length
    ){

      row.push(field);
      rows.push(row);
    }


    if(rows.length === 0)
      return [];


    const headers =
      rows[0].map(
        h => h.trim().toLowerCase()
      );


    const idx = (...names) => {

      for(const name of names){

        const i =
          headers.indexOf(name);

        if(i > -1)
          return i;
      }

      return -1;
    };


    const iArtist =
      idx('artist', 'artists');

    const iTitle =
      idx('title');

    const iFormat =
      idx('format');

    const iYear =
      idx('released', 'year');

    const iId =
      idx(
        'release_id',
        'release id',
        'id'
      );

    const iUri =
      idx(
        'uri',
        'release_url',
        'url',
        'discogs_url'
      );

    const iPrice =
      idx(
        'price',
        'lowest_price',
        'lowest price',
        'marketplace_price',
        'marketplace price'
      );


    return rows
      .slice(1)
      .filter(r => r.length > 1)
      .map(r => {

        const releaseId =
          iId > -1
            ? (r[iId] || '').trim()
            : '';


        const rawPrice =
          iPrice > -1
            ? (r[iPrice] || '')
                .trim()
                .replace(',', '.')
            : '';


        const parsedPrice =
          rawPrice &&
          !Number.isNaN(
            Number(rawPrice)
          )
            ? Number(rawPrice)
            : null;


        let link =
          iUri > -1
            ? (r[iUri] || '').trim()
            : '';


        if(!link && releaseId){

          link =
            `https://www.discogs.com/release/${encodeURIComponent(releaseId)}`;
        }


        return {

          artist:
            iArtist > -1
              ? (r[iArtist] || '').trim()
              : '',

          title:
            iTitle > -1
              ? (r[iTitle] || '').trim()
              : '',

          format:
            iFormat > -1
              ? (r[iFormat] || '').trim()
              : '',

          year:
            iYear > -1
              ? (r[iYear] || '').trim()
              : '',

          releaseId,

          link,

          price:
            parsedPrice
        };

      })
      .filter(
        item => item.title
      );
  }


  function hashId(prefix, item, index){

    const base =
      `${item.artist}-${item.title}-${index}`;

    let h = 0;


    for(let i = 0; i < base.length; i++){

      h =
        (
          (h << 5) -
          h +
          base.charCodeAt(i)
        ) | 0;
    }


    return prefix + Math.abs(h);
  }


  async function fetchDiscogsList(
    username,
    token,
    kind
  ){

    const base =
      kind === 'collection'

        ? `https://api.discogs.com/users/${encodeURIComponent(username)}/collection/folders/0/releases`

        : `https://api.discogs.com/users/${encodeURIComponent(username)}/wants`;


    let items = [];

    let page = 1;

    const maxPages = 5;


    while(page <= maxPages){

      const res =
        await fetch(
          `${base}?token=${encodeURIComponent(token)}&per_page=100&page=${page}`
        );


      if(!res.ok)
        throw new Error(
          'HTTP ' + res.status
        );


      const data =
        await res.json();


      const releases =
        kind === 'collection'
          ? data.releases
          : data.wants;


      if(
        !releases ||
        releases.length === 0
      ){

        break;
      }


      releases.forEach(r => {

        const info =
          r.basic_information;


        if(!info)
          return;


        const releaseId =
          r.id || info.id;


        items.push({

          id:
            (kind === 'collection'
              ? 'c-'
              : 'w-') +
            releaseId,

          releaseId,

          artist:
            (
              info.artists &&
              info.artists[0] &&
              info.artists[0].name
            ) || '',

          title:
            info.title || '',

          year:
            info.year || '',

          format:
            (
              info.formats &&
              info.formats[0] &&
              info.formats[0].name
            ) || '',

          link:
            `https://www.discogs.com/release/${encodeURIComponent(releaseId)}`,

          price:
            null
        });

      });


      const pages =
        data.pagination
          ? data.pagination.pages
          : 1;


      if(page >= pages)
        break;


      page++;
    }


    return items;
  }


  async function fetchDiscogsPrices(
    items,
    token
  ){

    const concurrency = 6;

    let next = 0;


    async function worker(){

      while(next < items.length){

        const item =
          items[next++];


        if(!item.releaseId)
          continue;


        try{

          const res =
            await fetch(
              `https://api.discogs.com/marketplace/stats/${encodeURIComponent(item.releaseId)}?curr_abbr=EUR&token=${encodeURIComponent(token)}`
            );


          if(!res.ok)
            continue;


          const data =
            await res.json();


          const value =
            data.lowest_price &&
            data.lowest_price.value;


          if(
            value !== undefined &&
            value !== null &&
            !Number.isNaN(Number(value))
          ){

            item.price =
              Number(value);

            item.currency =
              data.lowest_price.currency ||
              'EUR';
          }

        }catch(e){

          // Il prezzo può non essere disponibile:
          // l'importazione continua comunque.

        }
      }
    }


    await Promise.all(
      Array.from(
        {
          length:
            Math.min(
              concurrency,
              items.length
            )
        },
        worker
      )
    );


    return items;
  }


  /* ---- 4. Rendering: regali ---- */

  function renderCreator(){

    const ul =
      $('creatorGiftList');


    if(gifts.length === 0){

      ul.innerHTML =
        '<div class="empty">Non hai ancora aggiunto regali. Scrivine uno qui sopra per iniziare la tua lista.</div>';

      return;
    }


    ul.innerHTML =
      gifts.map(g => `

        <li>

          <div class="gift-main">

            <p class="gift-name">
              ${escapeHtml(g.name)}
            </p>

            ${
              g.note
                ? `<p class="gift-note">
                    ${escapeHtml(g.note)}
                   </p>`
                : ''
            }

            ${
              g.link
                ? `<a
                    class="gift-link"
                    href="${escapeHtml(g.link)}"
                    target="_blank"
                    rel="noopener">
                    Vedi il link
                   </a>`
                : ''
            }

            <div class="gift-meta">

              ${renderPriceTag(g.price)}

              ${renderPrefDisplay(g.pref)}

            </div>

          </div>


          <div class="gift-side">

            <button
              class="del-btn"
              data-id="${g.id}">
              rimuovi
            </button>

          </div>

        </li>

      `).join('');


    ul.querySelectorAll(
      '.del-btn'
    ).forEach(btn => {

      btn.addEventListener(
        'click',
        async () => {

          gifts =
            gifts.filter(
              g => g.id !== btn.dataset.id
            );

          await saveGifts();

          renderCreator();
        }
      );

    });
  }


  function albumLabel(item){

    const parts =
      [
        item.artist,
        item.title
      ]
      .filter(Boolean)
      .join(' — ');


    const meta =
      [
        item.format,
        item.year
      ]
      .filter(Boolean)
      .join(', ');


    return {
      parts,
      meta
    };
  }


  function renderMusicLink(item){

    return item.link

      ? `<a
          class="gift-link music-link"
          href="${escapeHtml(item.link)}"
          target="_blank"
          rel="noopener noreferrer">
          Vedi su Discogs ↗
         </a>`

      : '';
  }


  function renderMusicItemMain(item){

    const {
      parts,
      meta
    } =
      albumLabel(item);


    return `

      <div class="gift-main">

        <p class="gift-name">
          ${escapeHtml(parts)}
        </p>

        ${
          meta
            ? `<p class="music-sub">
                ${escapeHtml(meta)}
               </p>`
            : ''
        }

        <div class="gift-meta">

          ${renderPriceTag(item.price)}

        </div>

        ${renderMusicLink(item)}

      </div>

    `;
  }


  /* ---- 5. Rendering musica ---- */

  function renderMusicCreator(){

    $('creatorWantlistWrap')
      .style.display =
        wantlist.length
          ? 'block'
          : 'none';


    $('creatorCollectionWrap')
      .style.display =
        collection.length
          ? 'block'
          : 'none';


    $('creatorWantlist')
      .innerHTML =
        wantlist
          .map(
            item =>
              `<li>
                ${renderMusicItemMain(item)}
               </li>`
          )
          .join('');


    $('creatorCollection')
      .innerHTML =
        collection
          .map(
            item =>
              `<li>
                ${renderMusicItemMain(item)}
               </li>`
          )
          .join('');
  }


  function renderMusicFriend(){

    $('friendWantlistWrap')
      .style.display =
        wantlist.length
          ? 'block'
          : 'none';


    $('friendCollectionWrap')
      .style.display =
        collection.length
          ? 'block'
          : 'none';


    $('friendWantlist')
      .innerHTML =
        wantlist.map(item => {

          const claim =
            claims[item.id];


          const takenByMe =
            claim &&
            claim.takenBy === friendName;


          const statusHtml =
            claim

              ? `<span class="status taken">
                  Preso da ${escapeHtml(claim.takenBy)}
                 </span>`

              : `<span class="status available">
                  Disponibile
                 </span>`;


          let actionBtn = '';


          if(!claim){

            actionBtn =
              `<button
                class="btn btn-outline"
                data-take="${item.id}"
                style="padding:7px 14px;font-size:0.82rem;">
                Lo prendo io
               </button>`;

          }else if(takenByMe){

            actionBtn =
              `<button
                class="btn btn-ghost"
                data-release="${item.id}"
                style="padding:7px 0;">
                annulla
               </button>`;
          }


          return `

            <li>

              ${renderMusicItemMain(item)}

              <div class="gift-side">

                ${statusHtml}

                ${actionBtn}

              </div>

            </li>

          `;

        }).join('');


    $('friendCollection')
      .innerHTML =
        collection
          .map(item => `

            <li>

              ${renderMusicItemMain(item)}

              <div class="gift-side">

                <span class="owned-tag">
                  già posseduto
                </span>

              </div>

            </li>

          `)
          .join('');


    $('friendWantlist')
      .querySelectorAll(
        '[data-take]'
      )
      .forEach(btn => {

        btn.addEventListener(
          'click',
          async () => {

            claims[
              btn.dataset.take
            ] = {

              takenBy:
                friendName,

              takenAt:
                Date.now()
            };


            await saveClaims();

            renderMusicFriend();
          }
        );

      });


    $('friendWantlist')
      .querySelectorAll(
        '[data-release]'
      )
      .forEach(btn => {

        btn.addEventListener(
          'click',
          async () => {

            delete claims[
              btn.dataset.release
            ];


            await saveClaims();

            renderMusicFriend();
          }
        );

      });
  }


  function renderFriend(){

    const ul =
      $('friendGiftList');


    if(gifts.length === 0){

      ul.innerHTML =
        '<div class="empty">Chi ha creato la lista non ha ancora aggiunto regali. Torna a controllare più tardi.</div>';

      return;
    }


    ul.innerHTML =
      sortGiftsForFriend(gifts)
        .map(g => {

          const claim =
            claims[g.id];


          const takenByMe =
            claim &&
            claim.takenBy === friendName;


          const statusHtml =
            claim

              ? `<span class="status taken">
                  Preso da ${escapeHtml(claim.takenBy)}
                 </span>`

              : `<span class="status available">
                  Disponibile
                 </span>`;


          let actionBtn = '';


          if(!claim){

            actionBtn =
              `<button
                class="btn btn-outline"
                data-take="${g.id}"
                style="padding:7px 14px;font-size:0.82rem;">
                Lo prendo io
               </button>`;

          }else if(takenByMe){

            actionBtn =
              `<button
                class="btn btn-ghost"
                data-release="${g.id}"
                style="padding:7px 0;">
                annulla
               </button>`;
          }


          return `

            <li>

              <div class="gift-main">

                <p class="gift-name">
                  ${escapeHtml(g.name)}
                </p>

                ${
                  g.note
                    ? `<p class="gift-note">
                        ${escapeHtml(g.note)}
                       </p>`
                    : ''
                }

                ${
                  g.link
                    ? `<a
                        class="gift-link"
                        href="${escapeHtml(g.link)}"
                        target="_blank"
                        rel="noopener">
                        Vedi il link
                       </a>`
                    : ''
                }

                <div class="gift-meta">

                  ${renderPriceTag(g.price)}

                  ${renderPrefDisplay(g.pref)}

                </div>

              </div>


              <div class="gift-side">

                ${statusHtml}

                ${actionBtn}

              </div>

            </li>

          `;

        })
        .join('');


    ul.querySelectorAll(
      '[data-take]'
    ).forEach(btn => {

      btn.addEventListener(
        'click',
        async () => {

          const id =
            btn.dataset.take;


          claims[id] = {

            takenBy:
              friendName,

            takenAt:
              Date.now()
          };


          await saveClaims();

          renderFriend();
        }
      );

    });


    ul.querySelectorAll(
      '[data-release]'
    ).forEach(btn => {

      btn.addEventListener(
        'click',
        async () => {

          const id =
            btn.dataset.release;


          delete claims[id];


          await saveClaims();

          renderFriend();
        }
      );

    });
  }


  async function refreshAndRender(){

    await loadGifts();

    await loadMusic();


    if(role === 'creator'){

      renderCreator();

      renderMusicCreator();

    }else if(role === 'friend'){

      await loadClaims();

      renderFriend();

      renderMusicFriend();
    }
  }


  /* ---- 6. Gate e navigazione ---- */

  function showApp(){

    $('gate').style.display =
      'none';

    $('app').classList.add(
      'show'
    );


    if(role === 'creator'){

      $('creatorPanel')
        .style.display =
          'block';

      $('friendPanel')
        .style.display =
          'none';

      $('roleLabel').textContent =
        'Stai vedendo la lista come creatore';

    }else{

      $('creatorPanel')
        .style.display =
          'none';

      $('friendPanel')
        .style.display =
          'block';

      $('roleLabel').textContent =
        friendName
          ? `Ciao ${friendName}, stai vedendo la lista come amico`
          : 'Stai vedendo la lista come amico';
    }
  }


  function showGate(){

    $('app').classList.remove(
      'show'
    );

    $('gate').style.display =
      'block';
  }


  $('btnCreator')
    .addEventListener(
      'click',
      () => {

        $('friendNameForm')
          .classList.remove(
            'show'
          );

        $('creatorPassForm')
          .classList.add(
            'show'
          );

        $('creatorPassInput')
          .focus();
      }
    );


  $('creatorPassConfirm')
    .addEventListener(
      'click',
      confirmCreator
    );


  $('creatorPassInput')
    .addEventListener(
      'keydown',
      e => {

        if(e.key === 'Enter')
          confirmCreator();

      }
    );


  async function confirmCreator(){

    const val =
      $('creatorPassInput').value;


    if(val !== CREATOR_PASSWORD){

      $('creatorPassError')
        .classList.add(
          'show'
        );

      $('creatorPassInput')
        .focus();

      return;
    }


    $('creatorPassError')
      .classList.remove(
        'show'
      );


    role = 'creator';


    await safeSet(
      ROLE_KEY,
      role,
      false
    );


    showApp();


    await loadDiscogsCreds();

    await refreshAndRender();
  }


  $('btnFriend')
    .addEventListener(
      'click',
      () => {

        $('creatorPassForm')
          .classList.remove(
            'show'
          );

        $('friendNameForm')
          .classList.add(
            'show'
          );

        $('friendNameInput')
          .focus();
      }
    );


  $('friendNameConfirm')
    .addEventListener(
      'click',
      confirmFriend
    );


  $('friendNameInput')
    .addEventListener(
      'keydown',
      e => {

        if(e.key === 'Enter')
          confirmFriend();

      }
    );


  async function confirmFriend(){

    const val =
      $('friendNameInput')
        .value
        .trim();


    if(!val){

      $('friendNameInput')
        .focus();

      return;
    }


    friendName = val;

    role = 'friend';


    await safeSet(
      ROLE_KEY,
      role,
      false
    );


    await safeSet(
      NAME_KEY,
      friendName,
      false
    );


    showApp();

    await refreshAndRender();
  }


  $('switchRole')
    .addEventListener(
      'click',
      () => {

        role = null;

        showGate();
      }
    );


  $('giftPrefStars')
    .querySelectorAll('.star')
    .forEach(btn => {

      btn.addEventListener(
        'click',
        () => {

          const val =
            Number(
              btn.dataset.val
            );


          const current =
            Number(
              $('giftPrefStars')
                .dataset.value
            );


          setStarWidget(
            $('giftPrefStars'),
            val === current
              ? 0
              : val
          );


          currentPref =
            Number(
              $('giftPrefStars')
                .dataset.value
            );
        }
      );

    });


  /* ---- 7. Listener form/import ---- */

  $('addGiftBtn')
    .addEventListener(
      'click',
      async () => {

        const name =
          $('giftName')
            .value
            .trim();


        if(!name){

          $('giftName')
            .focus();

          return;
        }


        const note =
          $('giftNote')
            .value
            .trim();


        const link =
          $('giftLink')
            .value
            .trim();


        const priceRaw =
          $('giftPrice')
            .value
            .trim();


        const price =
          priceRaw === ''
            ? null
            : Math.max(
                0,
                parseFloat(priceRaw)
              );


        gifts.push({

          id:
            uid(),

          name,

          note,

          link,

          price,

          pref:
            currentPref,

          addedAt:
            Date.now()

        });


        await saveGifts();


        $('giftName').value = '';

        $('giftNote').value = '';

        $('giftLink').value = '';

        $('giftPrice').value = '';


        currentPref = 0;


        setStarWidget(
          $('giftPrefStars'),
          0
        );


        renderCreator();
      }
    );


  $('friendSort')
    .addEventListener(
      'change',
      () => {

        friendSortValue =
          $('friendSort').value;

        renderFriend();
      }
    );


  /* ---- Import Discogs ---- */

  $('discogsImportBtn')
    .addEventListener(
      'click',
      async () => {

        const username =
          $('discogsUser')
            .value
            .trim();


        const token =
          $('discogsToken')
            .value
            .trim();


        const status =
          $('discogsStatus');


        if(!username || !token){

          status.textContent =
            'Inserisci username e token.';

          status.classList.add(
            'err'
          );

          return;
        }


        const btn =
          $('discogsImportBtn');


        btn.disabled = true;


        status.classList.remove(
          'err'
        );


        status.textContent =
          'Importazione in corso…';


        try{

          await safeSet(
            DISCOGS_USER_KEY,
            username,
            false
          );


          await safeSet(
            DISCOGS_TOKEN_KEY,
            token,
            false
          );


          const [
            newWantlist,
            newCollection
          ] =
            await Promise.all([

              fetchDiscogsList(
                username,
                token,
                'wants'
              ),

              fetchDiscogsList(
                username,
                token,
                'collection'
              )

            ]);


          status.textContent =
            'Dischi trovati. Recupero i prezzi disponibili…';


          await Promise.all([

            fetchDiscogsPrices(
              newWantlist,
              token
            ),

            fetchDiscogsPrices(
              newCollection,
              token
            )

          ]);


          wantlist =
            newWantlist;


          collection =
            newCollection;


          await saveMusic();


          renderMusicCreator();


          status.textContent =
            `Importati ${newCollection.length} dischi in collezione, ${newWantlist.length} in wantlist.`;

        }catch(e){

          status.classList.add(
            'err'
          );


          status.textContent =
            'Importazione non riuscita. Controlla username e token (il browser potrebbe bloccare la richiesta a Discogs).';

        }finally{

          btn.disabled = false;
        }
      }
    );


  /* ---- CSV ---- */

  function readFileAsText(file){

    return new Promise(
      (resolve, reject) => {

        const reader =
          new FileReader();


        reader.onload =
          () =>
            resolve(
              reader.result
            );


        reader.onerror =
          reject;


        reader.readAsText(
          file
        );
      }
    );
  }


  $('csvCollectionFile')
    .addEventListener(
      'change',
      async e => {

        const file =
          e.target.files[0];


        if(!file)
          return;


        const status =
          $('csvStatus');


        try{

          const text =
            await readFileAsText(
              file
            );


          const parsed =
            parseCsv(text);


          collection =
            parsed.map(
              (item, i) => ({

                ...item,

                id:
                  item.releaseId
                    ? `c-${item.releaseId}`
                    : hashId(
                        'c-',
                        item,
                        i
                      )

              })
            );


          await saveMusic();


          renderMusicCreator();


          status.classList.remove(
            'err'
          );


          status.textContent =
            `Importati ${collection.length} dischi in collezione dal CSV.`;

        }catch(err){

          status.classList.add(
            'err'
          );


          status.textContent =
            'Il file CSV non è leggibile.';
        }
      }
    );


  $('csvWantlistFile')
    .addEventListener(
      'change',
      async e => {

        const file =
          e.target.files[0];


        if(!file)
          return;


        const status =
          $('csvStatus');


        try{

          const text =
            await readFileAsText(
              file
            );


          const parsed =
            parseCsv(text);


          wantlist =
            parsed.map(
              (item, i) => ({

                ...item,

                id:
                  item.releaseId
                    ? `w-${item.releaseId}`
                    : hashId(
                        'w-',
                        item,
                        i
                      )

              })
            );


          await saveMusic();


          renderMusicCreator();


          status.classList.remove(
            'err'
          );


          status.textContent =
            `Importati ${wantlist.length} dischi in wantlist dal CSV.`;

        }catch(err){

          status.classList.add(
            'err'
          );


          status.textContent =
            'Il file CSV non è leggibile.';
        }
      }
    );


  /* ---- 8. Avvio app ---- */

  (async function init(){

    await loadRole();

    await loadGifts();

    await loadMusic();


    if(
      role === 'creator' ||
      role === 'friend'
    ){

      if(role === 'friend'){

        await loadClaims();

        showApp();

        renderFriend();

        renderMusicFriend();

      }else{

        showApp();

        await loadDiscogsCreds();

        renderCreator();

        renderMusicCreator();
      }

    }else{

      showGate();
    }


    /* sincronizzazione automatica */

    setInterval(
      () => {

        if(role)
          refreshAndRender();

      },
      4000
    );

  })();

})();

