/* ============================================================
   JOY FLUTE ENSEMBLE — includes.js
   Inietta header, topbar e footer nelle pagine interne.
   Le pagine inner devono avere:
     <div id="topbar-placeholder"></div>
     <div id="header-placeholder"></div>
     ...contenuto...
     <div id="footer-placeholder"></div>
   E devono passare window.JFE_ROOT = '../' (o '../../' ecc.)
   ============================================================ */

(function() {
  const ROOT = window.JFE_ROOT || '../';
  const DEPTH = window.JFE_DEPTH || 1; // 1 = pages/*, 2 = pages/sub/*

  function rel(path) { return ROOT + path; }

  /* ── Build Nav HTML ── */
  function buildNav() {
    return `
    <div class="topbar">
      <div class="topbar-inner">
        <div class="topbar-left">
          <a href="mailto:joy.flute.ensemble@gmail.com">joy.flute.ensemble@gmail.com</a>
          <span class="topbar-sep">·</span>
          <span>Garbagnate Milanese (Mi)</span>
        </div>
        <div class="topbar-social">
          <a href="https://www.facebook.com" target="_blank" class="social-icon" aria-label="Facebook">
            <svg viewBox="0 0 1024 1024"><path d="M512,0C229.2,0,0,229.2,0,512c0,255.6,187.2,467.4,432,505.8V660H302V512h130V399.2C432,270.9,508.4,200,625.4,200c56,0,114.6,10,114.6,10v126h-64.6c-63.6,0-83.4,39.5-83.4,80v96h142l-22.7,148H592v357.8c244.8-38.4,432-250.2,432-505.8C1024,229.2,794.8,0,512,0z"/></svg>
          </a>
          <a href="https://www.youtube.com" target="_blank" class="social-icon" aria-label="YouTube">
            <svg viewBox="0 0 192 192"><path d="M180.3,53.4c-2-7.6-8-13.6-15.6-15.7C151,34,96,34,96,34s-55,0-68.8,3.7c-7.6,2-13.5,8-15.6,15.7C8,67.2,8,96,8,96s0,28.8,3.7,42.6c2,7.6,8,13.6,15.6,15.7C41,158,96,158,96,158s55,0,68.8-3.7c7.6-2,13.5-8,15.6-15.7C184,124.8,184,96,184,96S184,67.2,180.3,53.4z M78,122.2V69.8L124,96L78,122.2z"/></svg>
          </a>
        </div>
      </div>
    </div>

    <header class="header">
      <div class="header-inner">
        <a href="${rel('index.html')}" class="logo">
          <img src="${rel('logo.png')}" alt="Logo Joy Flute Ensemble" class="logo-img">
          <div class="logo-text-wrap">
            <span class="logo-name">Joy Flute Ensemble</span>
            <span class="logo-tagline">Orchestra di Flauto Traverso · APS</span>
          </div>
        </a>
        <nav class="nav" aria-label="Navigazione principale">
          <ul class="nav-list">
            <li class="nav-item"><a href="${rel('index.html')}" class="nav-link">Home</a></li>
            <li class="nav-item"><a href="${rel('pages/chi-siamo.html')}" class="nav-link">Chi Siamo</a></li>
            <li class="nav-item">
              <a href="#" class="nav-link">Ensemble <svg class="chevron" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
              <div class="dropdown">
                <a href="${rel('pages/ensemble/flautisti.html')}"><span class="d-icon">🎵</span>I Nostri Flautisti</a>
                <a href="${rel('pages/ensemble/foto.html')}"><span class="d-icon">📷</span>Foto Ricordo</a>
                <a href="${rel('pages/ensemble/video.html')}"><span class="d-icon">▶️</span>Video</a>
              </div>
            </li>
            <li class="nav-item">
              <a href="#" class="nav-link">Eventi <svg class="chevron" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
              <div class="dropdown">
                <a href="${rel('pages/eventi/masterclass.html')}"><span class="d-icon">🎓</span>Masterclass Aprile 2024</a>
                <a href="${rel('pages/eventi/passati.html')}"><span class="d-icon">📅</span>Eventi Passati</a>
                <a href="${rel('pages/eventi/prossimo.html')}"><span class="d-icon">🔔</span>Prossimo Concerto</a>
              </div>
            </li>
            <li class="nav-item">
              <a href="#" class="nav-link">Risorse <svg class="chevron" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
              <div class="dropdown">
                <a href="${rel('pages/risorse/edizioni.html')}"><span class="d-icon">🎼</span>Edizioni Musicali</a>
                <a href="${rel('pages/risorse/flauti-acquisto.html')}"><span class="d-icon">🛒</span>Flauti Acquisto</a>
                <a href="${rel('pages/risorse/repertorio.html')}"><span class="d-icon">📖</span>Repertorio</a>
                <a href="${rel('pages/risorse/partiture.html')}"><span class="d-icon">📄</span>Nostre Partiture</a>
                <a href="${rel('pages/risorse/usati.html')}"><span class="d-icon">♻️</span>Flauti &amp; Accessori Usati</a>
                <a href="${rel('pages/risorse/biblioteca.html')}"><span class="d-icon">📚</span>Biblioteca JFE-APS</a>
              </div>
            </li>
            <li class="nav-item">
              <a href="#" class="nav-link">Informazioni <svg class="chevron" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
              <div class="dropdown">
                <a href="${rel('pages/info/bilanci.html')}"><span class="d-icon">📋</span>Bilanci &amp; Regolamenti</a>
                <a href="${rel('pages/info/contatti.html')}"><span class="d-icon">📬</span>Contatti</a>
                <a href="${rel('pages/info/socio.html')}"><span class="d-icon">🎓</span>Diventa Socio JFE-APS</a>
                <a href="${rel('pages/info/statuto.html')}"><span class="d-icon">📜</span>Statuto</a>
              </div>
            </li>
            <li class="nav-item">
              <a href="#" class="nav-link">Donazioni <svg class="chevron" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
              <div class="dropdown">
                <a href="${rel('pages/donazioni/dona.html')}"><span class="d-icon">💜</span>Fai una Donazione</a>
                <a href="${rel('pages/donazioni/sostenitori.html')}"><span class="d-icon">⭐</span>I Nostri Sostenitori</a>
              </div>
            </li>
          </ul>
        </nav>
        <a href="${rel('pages/info/contatti.html')}" class="btn btn-primary btn-sm header-cta">Contattaci</a>
        <button class="hamburger" id="hamburger" aria-label="Apri menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>

    <div class="nav-drawer" id="navDrawer">
      <div class="nav-panel" id="navPanel">
        <div class="nav-panel-header">
          <a href="${rel('index.html')}" class="logo">
            <img src="${rel('logo.png')}" class="logo-img" style="width:40px;height:40px" alt="">
            <div class="logo-text-wrap">
              <span class="logo-name" style="font-size:14px">Joy Flute Ensemble</span>
              <span class="logo-tagline">APS</span>
            </div>
          </a>
          <button class="nav-close" id="navClose">✕</button>
        </div>
        <ul class="nav-mobile-list">
          <li><a href="${rel('index.html')}">Home</a></li>
          <li><a href="${rel('pages/chi-siamo.html')}">Chi Siamo</a></li>
          <li>
            <button class="mob-accordion-trigger">Ensemble <span class="mob-chevron">▾</span></button>
            <div class="mob-accordion-body">
              <a href="${rel('pages/ensemble/flautisti.html')}">🎵 I Nostri Flautisti</a>
              <a href="${rel('pages/ensemble/foto.html')}">📷 Foto Ricordo</a>
              <a href="${rel('pages/ensemble/video.html')}">▶️ Video</a>
            </div>
          </li>
          <li>
            <button class="mob-accordion-trigger">Eventi <span class="mob-chevron">▾</span></button>
            <div class="mob-accordion-body">
              <a href="${rel('pages/eventi/masterclass.html')}">🎓 Masterclass 2024</a>
              <a href="${rel('pages/eventi/passati.html')}">📅 Eventi Passati</a>
              <a href="${rel('pages/eventi/prossimo.html')}">🔔 Prossimo Concerto</a>
            </div>
          </li>
          <li>
            <button class="mob-accordion-trigger">Risorse <span class="mob-chevron">▾</span></button>
            <div class="mob-accordion-body">
              <a href="${rel('pages/risorse/edizioni.html')}">🎼 Edizioni Musicali</a>
              <a href="${rel('pages/risorse/flauti-acquisto.html')}">🛒 Flauti Acquisto</a>
              <a href="${rel('pages/risorse/repertorio.html')}">📖 Repertorio</a>
              <a href="${rel('pages/risorse/partiture.html')}">📄 Nostre Partiture</a>
              <a href="${rel('pages/risorse/usati.html')}">♻️ Usati</a>
              <a href="${rel('pages/risorse/biblioteca.html')}">📚 Biblioteca</a>
            </div>
          </li>
          <li>
            <button class="mob-accordion-trigger">Informazioni <span class="mob-chevron">▾</span></button>
            <div class="mob-accordion-body">
              <a href="${rel('pages/info/bilanci.html')}">📋 Bilanci</a>
              <a href="${rel('pages/info/contatti.html')}">📬 Contatti</a>
              <a href="${rel('pages/info/socio.html')}">🎓 Diventa Socio</a>
              <a href="${rel('pages/info/statuto.html')}">📜 Statuto</a>
            </div>
          </li>
          <li>
            <button class="mob-accordion-trigger">Donazioni <span class="mob-chevron">▾</span></button>
            <div class="mob-accordion-body">
              <a href="${rel('pages/donazioni/dona.html')}">💜 Fai una Donazione</a>
              <a href="${rel('pages/donazioni/sostenitori.html')}">⭐ Sostenitori</a>
            </div>
          </li>
        </ul>
      </div>
    </div>`;
  }

  function buildFooter() {
    return `
    <footer class="footer">
      <div class="footer-bg"></div>
      <div class="footer-inner">
        <div class="footer-brand">
          <a href="${rel('index.html')}" class="logo" style="margin-bottom:16px;display:inline-flex">
            <img src="${rel('logo.png')}" alt="Logo" class="logo-img">
            <div class="logo-text-wrap">
              <span class="logo-name">Joy Flute Ensemble</span>
              <span class="logo-tagline">APS</span>
            </div>
          </a>
          <p class="footer-desc">Associazione di Promozione Sociale dedicata alla musica per flauto traverso. Concerti, formazione e comunità musicale nel territorio milanese.</p>
          <div class="footer-social">
            <a href="https://www.facebook.com" target="_blank" class="social-icon" aria-label="Facebook">
              <svg viewBox="0 0 1024 1024"><path d="M512,0C229.2,0,0,229.2,0,512c0,255.6,187.2,467.4,432,505.8V660H302V512h130V399.2C432,270.9,508.4,200,625.4,200c56,0,114.6,10,114.6,10v126h-64.6c-63.6,0-83.4,39.5-83.4,80v96h142l-22.7,148H592v357.8c244.8-38.4,432-250.2,432-505.8C1024,229.2,794.8,0,512,0z"/></svg>
            </a>
            <a href="https://www.youtube.com" target="_blank" class="social-icon" aria-label="YouTube">
              <svg viewBox="0 0 192 192"><path d="M180.3,53.4c-2-7.6-8-13.6-15.6-15.7C151,34,96,34,96,34s-55,0-68.8,3.7c-7.6,2-13.5,8-15.6,15.7C8,67.2,8,96,8,96s0,28.8,3.7,42.6c2,7.6,8,13.6,15.6,15.7C41,158,96,158,96,158s55,0,68.8-3.7c7.6-2,13.5-8,15.6-15.7C184,124.8,184,96,184,96S184,67.2,180.3,53.4z M78,122.2V69.8L124,96L78,122.2z"/></svg>
            </a>
          </div>
        </div>
        <div class="footer-col">
          <h5>Navigazione</h5>
          <ul class="footer-links">
            <li><a href="${rel('index.html')}">Home</a></li>
            <li><a href="${rel('pages/chi-siamo.html')}">Chi Siamo</a></li>
            <li><a href="${rel('pages/ensemble/flautisti.html')}">I Nostri Flautisti</a></li>
            <li><a href="${rel('pages/eventi/prossimo.html')}">Prossimo Concerto</a></li>
            <li><a href="${rel('pages/info/contatti.html')}">Contatti</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>Risorse</h5>
          <ul class="footer-links">
            <li><a href="${rel('pages/risorse/repertorio.html')}">Repertorio</a></li>
            <li><a href="${rel('pages/risorse/biblioteca.html')}">Biblioteca</a></li>
            <li><a href="${rel('pages/info/socio.html')}">Diventa Socio</a></li>
            <li><a href="${rel('pages/donazioni/dona.html')}">Donazioni</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>Contatti</h5>
          <div class="footer-contact">
            <div class="footer-contact-item">
              <strong>Sede</strong>Via Monviso 144<br>Garbagnate Milanese (Mi)
            </div>
            <div class="footer-contact-item">
              <strong>Email</strong><a href="mailto:joy.flute.ensemble@gmail.com">joy.flute.ensemble@gmail.com</a>
            </div>
            <div class="footer-contact-item">
              <strong>CF / RUNTS</strong>97763630155 / 464098
            </div>
          </div>
        </div>
      </div>
      <div class="footer-bottom container">
        <span>© <span data-year></span> Joy Flute Ensemble – APS · Tutti i diritti riservati</span>
        <div class="footer-legal">
          <a href="${rel('pages/info/statuto.html')}">Statuto</a>
          <a href="#">Cookie Policy</a>
          <a href="#">Privacy Policy</a>
        </div>
      </div>
    </footer>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const navEl    = document.getElementById('nav-include');
    const footerEl = document.getElementById('footer-include');
    if (navEl)    navEl.outerHTML    = buildNav();
    if (footerEl) footerEl.outerHTML = buildFooter();
  });
})();
