# PROMPTS.md — Diario dei Prompt
## Progetto: Fokus — Dashboard Personale
---

## Prompt 1 — Struttura HTML iniziale

Crea la struttura HTML5 semantica completa per una SPA (Single Page App) 
con 5 sezioni (Home, Attività, Obiettivi, Note, Statistiche).
Requisiti di accessibilità WCAG:
- Skip link per screen reader
- role="dialog" e aria-modal su modale e form
- aria-labelledby su ogni section
- aria-live="polite" per liste dinamiche
- aria-expanded su hamburger menu
- aria-invalid su campi in errore
- Ogni form: label con for, abbr per campi obbligatori
- alt su immagini, focus visibile
Usa pattern hidden/active per la navigazione SPA senza reload.

---

## Prompt 2 — CSS Mobile-First con variabili

Crea un sistema CSS completo mobile-first per una dashboard SPA con tema dark/light.
Estetica: raffinata ed editoriale, palette viola scuro + viola brillante.
Font: DM Serif Display (titoli) + DM Sans (corpo) da Google Fonts.
:root con tutte le variabili (colori, spazi, raggi, ombre, transizioni).
body.light sovrascrive le variabili per tema chiaro.
Breakpoint: 768px (tablet: 2 col), 1024px (desktop: 3 col notes, grid stats).
Componenti: card con hover, badge status/priorità colorati, barre progresso animate,
progress-bar animate con transition: width, toast animati (slideIn + fadeOut),
modale con overlay blur, hamburger con animazione X.
Attenzione: focus-visible visibile con outline 2px accent, stati hover/focus/disabled
su tutti i bottoni. Niente aria-invalid nascosto.

---

## Prompt 3 — Navigazione SPA senza framework

Implementa navigazione SPA in JavaScript puro (no framework):
- showSection(id): mostra section con id, nasconde le altre con .hidden e .active
- Aggiorna aria-current="page" sui link attivi
- Usa history.pushState per aggiornare URL senza reload
- Gestisci popstate per il tasto back del browser
- Ogni cambio sezione chiude il menu mobile e richiama la funzione di render
  della sezione (renderTasks, renderGoals, ecc.)
- Sezione iniziale: letta da location.hash o 'home' come fallback

---

## Prompt 4 — Sicurezza: escapeHTML e prevenzione XSS

Implementa una funzione escapeHTML(str) che converta tutti i caratteri
pericolosi (&, <, >, ", ') nelle rispettive entità HTML.
Regola d'oro: usa SEMPRE escapeHTML() prima di inserire qualsiasi
input utente in attributi HTML (aria-label, title, data-*).
Usa textContent (non innerHTML) per il contenuto testuale dei nodi.
Costruisci il DOM programmaticamente con createElement + textContent
invece di template literals con interpolazione diretta.
Documenta in commento ogni punto dove si riceve input utente.

---

## Prompt 5 — Validazione form client-side robusta

Implementa validazione form JavaScript completa per il form profilo e task:
- Previeni submit con e.preventDefault()
- Funzioni setError(fieldId, msg) e clearError(fieldId):
  setError imposta textContent dell'elemento #fieldId-error E
  aggiunge aria-invalid="true" sull'input
  clearError rimuove il messaggio E aria-invalid
- Validazione email con regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
- Validazione lunghezza minima titoli (>= 2 caratteri)
- I messaggi di errore appaiono inline, vicino al campo, 
  con role="alert" e aria-live="polite" (già nel markup)
- Pulisci TUTTI gli errori prima di ogni nuova validazione
- Non usare alert() — mai

---

## Prompt 6 — localStorage sicuro e gestione errori dati

Crea un modulo Storage con wrapper sicuro per localStorage:
- Storage.get(key, fallback): JSON.parse in try/catch, 
  se fallisce ritorna il fallback (null o [])
- Storage.set(key, value): JSON.stringify in try/catch,
  cattura QuotaExceededError silenziosamente
- Funzioni loadState() e saveState() che usano solo Storage.get/set
- Gestisci null/undefined negli array: usa sempre Array.isArray(data) 
  o fallback a [] prima di chiamare .filter() o .map()
  (prevenisce "Cannot read property 'filter' of undefined")
- Gestisci valori null nei campi: usa optional chaining (?.) 
  o default values nei confronti

---

## Prompt 7 — Hamburger menu accessibile

Implementa hamburger menu accessibile:
- Button con aria-expanded="false" e aria-controls="mobile-nav"
- Naviga su click: toggle aria-expanded true/false e hidden sul nav
- CSS: .hamburger[aria-expanded="true"] .bar:nth-child(1/2/3)
  trasforma le 3 barre in una X con transform e opacity
- Funzione closeMobileNav() chiamata in showSection() 
  (chiude automaticamente navigando)
- Display: none su desktop (768px+), visibile solo mobile

---