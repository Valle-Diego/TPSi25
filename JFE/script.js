/* =============================================
   JOY FLUTE ENSEMBLE – script.js
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ------------------------------------------
     1. HAMBURGER MENU (mobile)
  ------------------------------------------ */
  const hamburger = document.getElementById('hamburger');
  const nav       = document.getElementById('nav');

  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    nav.classList.toggle('open');
  });

  // Close nav when clicking a link on mobile
  nav?.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 720) {
        hamburger.classList.remove('open');
        nav.classList.remove('open');
      }
    });
  });


  /* ------------------------------------------
     2. DROPDOWN (mobile tap-to-open)
  ------------------------------------------ */
  document.querySelectorAll('.has-dropdown').forEach(item => {
    item.addEventListener('click', e => {
      if (window.innerWidth > 720) return; // handled by CSS hover on desktop
      e.stopPropagation();
      item.classList.toggle('open');
    });
  });

  // Close all dropdowns when clicking elsewhere
  document.addEventListener('click', () => {
    document.querySelectorAll('.has-dropdown.open').forEach(el => el.classList.remove('open'));
  });


  /* ------------------------------------------
     3. STICKY HEADER — active nav link
  ------------------------------------------ */
  const sections = document.querySelectorAll('section[id], div[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const highlightNav = () => {
    let current = '';
    sections.forEach(sec => {
      const top = sec.getBoundingClientRect().top;
      if (top <= 100) current = sec.id;
    });
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) link.classList.add('active');
    });
  };

  window.addEventListener('scroll', highlightNav, { passive: true });


  /* ------------------------------------------
     4. SCROLL FADE-IN ANIMATIONS
  ------------------------------------------ */
  // Apply the class to animatable elements
  const animTargets = [
    '.card',
    '.resource-item',
    '.gallery-item',
    '.section-tag',
    '.col-text',
    '.col-image',
    '.strip .container > *',
    '.section-intro',
    '.info-list',
    '.video-placeholder',
  ];

  animTargets.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('fade-in');
      el.style.transitionDelay = `${i * 60}ms`;
    });
  });

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));


  /* ------------------------------------------
     5. SMOOTH SCROLL for anchor links
     (polyfill for older browsers)
  ------------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const headerH = document.querySelector('.header')?.offsetHeight ?? 70;
        const top = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });


  /* ------------------------------------------
     6. VIDEO PLAY BUTTON — link to YouTube
  ------------------------------------------ */
  const playBtn = document.getElementById('playBtn');
  playBtn?.addEventListener('click', () => {
    window.open('https://www.youtube.com/@JoyFluteEnsemble', '_blank');
  });


  /* ------------------------------------------
     7. GALLERY — lightbox-style click (basic)
  ------------------------------------------ */
  const galleryItems = document.querySelectorAll('.gallery-item');

  // Create lightbox overlay
  const overlay = document.createElement('div');
  overlay.id = 'lightbox';
  overlay.style.cssText = `
    display:none; position:fixed; inset:0; z-index:9999;
    background:rgba(0,0,0,0.88); align-items:center; justify-content:center;
    cursor:pointer;
  `;
  const overlayMsg = document.createElement('div');
  overlayMsg.style.cssText = `
    color:#fff; font-family:${getComputedStyle(document.body).fontFamily};
    font-size:1.2rem; text-align:center; padding:40px;
  `;
  overlayMsg.innerHTML = `<div style="font-size:5rem;margin-bottom:24px;">📷</div>
    <p style="opacity:.7">Foto non ancora disponibile</p>
    <p style="margin-top:12px;font-size:.85rem;opacity:.5">Clicca per chiudere</p>`;
  overlay.appendChild(overlayMsg);
  document.body.appendChild(overlay);

  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      overlay.style.display = 'flex';
    });
  });

  overlay.addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') overlay.style.display = 'none';
  });


  /* ------------------------------------------
     8. HERO scroll cue — subtle parallax
  ------------------------------------------ */
  const hero = document.querySelector('.hero');
  if (hero) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      hero.style.backgroundPositionY = `${scrollY * 0.3}px`;
    }, { passive: true });
  }


  /* ------------------------------------------
     9. CONTACT FORM — simple mailto fallback
     (if a form is added in future)
  ------------------------------------------ */
  document.querySelectorAll('form[data-mailto]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = new FormData(form);
      const subject = encodeURIComponent('Contatto dal sito Joy Flute Ensemble');
      const body    = encodeURIComponent([...data.entries()].map(([k, v]) => `${k}: ${v}`).join('\n'));
      window.location.href = `mailto:joy.flute.ensemble@gmail.com?subject=${subject}&body=${body}`;
    });
  });


  /* ------------------------------------------
     10. YEAR in footer
  ------------------------------------------ */
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

});
