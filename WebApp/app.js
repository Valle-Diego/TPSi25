/* ===========================
   FOKUS — app.js
   Dashboard SPA
   =========================== */
"use strict";

// ============================================================
// UTILS
// ============================================================
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/** Genera ID univoco senza librerie esterne */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Escape HTML per prevenire injection da input utente */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Formatta data in italiano */
function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Mostra toast */
function showToast(msg, type = 'default') {
  const container = $('#toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = escapeHTML(msg);
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3100);
}

// ============================================================
// STORAGE — wrapper sicuro per localStorage
// ============================================================
const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded */ }
  }
};

// ============================================================
// STATE
// ============================================================
const state = {
  tasks: [],
  goals: [],
  notes: [],
  profile: { name: '', email: '' },
  theme: 'dark',
  taskFilter: { search: '', status: 'all', sort: 'date-desc' },
  taskPage: 1,
  taskPerPage: 5,
  noteSearch: '',
  editingTaskId: null,
};

function loadState() {
  state.tasks   = Storage.get('fokus_tasks',   []);
  state.goals   = Storage.get('fokus_goals',   []);
  state.notes   = Storage.get('fokus_notes',   []);
  state.profile = Storage.get('fokus_profile', { name: '', email: '' });
  state.theme   = Storage.get('fokus_theme',   'dark');
}

function saveState() {
  Storage.set('fokus_tasks',   state.tasks);
  Storage.set('fokus_goals',   state.goals);
  Storage.set('fokus_notes',   state.notes);
  Storage.set('fokus_profile', state.profile);
  Storage.set('fokus_theme',   state.theme);
}

// ============================================================
// TEMA
// ============================================================
function applyTheme(theme) {
  document.body.classList.toggle('dark',  theme === 'dark');
  document.body.classList.toggle('light', theme === 'light');
  document.body.dataset.theme = theme;
  const btn = $('#theme-toggle');
  if (!btn) return;
  if (theme === 'dark') {
    btn.querySelector('.theme-icon').textContent = '☀';
    btn.setAttribute('aria-label', 'Attiva tema chiaro');
    btn.setAttribute('aria-pressed', 'true');
  } else {
    btn.querySelector('.theme-icon').textContent = '☾';
    btn.setAttribute('aria-label', 'Attiva tema scuro');
    btn.setAttribute('aria-pressed', 'false');
  }
}

function initTheme() {
  applyTheme(state.theme);
  $('#theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
    saveState();
    showToast(state.theme === 'dark' ? 'Tema scuro attivato' : 'Tema chiaro attivato');
  });
}

// ============================================================
// OROLOGIO
// ============================================================
function initClock() {
  const clockEl = $('#live-clock');
  const dateEl  = $('#live-date');
  function tick() {
    const now = new Date();
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    if (dateEl) dateEl.textContent = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  tick();
  setInterval(tick, 1000);
}

function updateGreeting() {
  const h = new Date().getHours();
  let greet = 'Buonasera';
  if (h < 12) greet = 'Buongiorno';
  else if (h < 18) greet = 'Buon pomeriggio';
  const el = $('#greeting-text');
  if (el) el.textContent = greet;
}

// ============================================================
// NAVIGAZIONE SPA
// ============================================================
function showSection(id) {
  $$('.section').forEach(s => {
    const active = s.id === id;
    s.classList.toggle('active', active);
    s.hidden = !active;
  });
  $$('.nav-link').forEach(a => {
    const active = a.dataset.section === id;
    a.classList.toggle('active', active);
    a.setAttribute('aria-current', active ? 'page' : 'false');
  });
  // chiudi menu mobile
  closeMobileNav();
  // refresh sezioni
  if (id === 'home')  renderHome();
  if (id === 'tasks') renderTasks();
  if (id === 'goals') renderGoals();
  if (id === 'notes') renderNotes();
  if (id === 'stats') renderStats();
  // aggiorna history
  history.pushState({ section: id }, '', `#${id}`);
}

function initNav() {
  $$('.nav-link').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      showSection(a.dataset.section);
    });
  });
  window.addEventListener('popstate', e => {
    const id = (e.state && e.state.section) || location.hash.slice(1) || 'home';
    showSection(id);
  });
  // sezione iniziale
  const initial = location.hash.slice(1) || 'home';
  showSection(initial);
}

// ============================================================
// HAMBURGER MENU
// ============================================================
function closeMobileNav() {
  const nav = $('#mobile-nav');
  const btn = $('#hamburger');
  if (!nav || !btn) return;
  nav.hidden = true;
  btn.setAttribute('aria-expanded', 'false');
}

function initHamburger() {
  const btn = $('#hamburger');
  const nav = $('#mobile-nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    nav.hidden = open;
  });
}

// ============================================================
// HOME
// ============================================================
function renderHome() {
  // Nome utente
  const nameDisplay = $('#user-name-display');
  if (nameDisplay) {
    nameDisplay.textContent = state.profile.name
      ? escapeHTML(state.profile.name)
      : 'Benvenuto';
  }
  // Stats rapide
  const tasksDone = state.tasks.filter(t => t.status === 'done').length;
  const goalsActive = state.goals.filter(g => (g.current / g.target) < 1).length;
  const notesCount = state.notes.length;
  const streak = Storage.get('fokus_streak', 0);

  const setEl = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  setEl('#stat-tasks-done',  tasksDone);
  setEl('#stat-goals-active', goalsActive);
  setEl('#stat-notes-count', notesCount);
  setEl('#stat-streak',      streak);

  // Popola form profilo
  const nameInput  = $('#profile-name');
  const emailInput = $('#profile-email');
  if (nameInput)  nameInput.value  = state.profile.name  || '';
  if (emailInput) emailInput.value = state.profile.email || '';
}

function initProfile() {
  const form = $('#profile-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const nameVal  = $('#profile-name').value.trim();
    const emailVal = $('#profile-email').value.trim();
    let valid = true;

    // Validazione nome
    clearError('profile-name');
    if (!nameVal) { setError('profile-name', 'Il nome è obbligatorio.'); valid = false; }
    // Validazione email
    clearError('profile-email');
    if (!emailVal) {
      setError('profile-email', 'L\'email è obbligatoria.'); valid = false;
    } else if (!isValidEmail(emailVal)) {
      setError('profile-email', 'Inserisci un\'email valida.'); valid = false;
    }
    if (!valid) return;

    state.profile.name  = nameVal;
    state.profile.email = emailVal;
    saveState();
    renderHome();
    showToast('Profilo salvato!', 'success');
  });
}

// ============================================================
// VALIDAZIONE
// ============================================================
function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}
function setError(fieldId, msg) {
  const errEl = $(`#${fieldId}-error`);
  const input = $(`#${fieldId}`);
  if (errEl) errEl.textContent = msg;
  if (input) { input.setAttribute('aria-invalid', 'true'); }
}
function clearError(fieldId) {
  const errEl = $(`#${fieldId}-error`);
  const input = $(`#${fieldId}`);
  if (errEl) errEl.textContent = '';
  if (input) { input.removeAttribute('aria-invalid'); }
}

// ============================================================
// TASKS
// ============================================================
function getFilteredTasks() {
  const { search, status, sort } = state.taskFilter;
  let list = [...state.tasks];

  // Filtro status
  if (status !== 'all') list = list.filter(t => t.status === status);

  // Ricerca (sanitizzata prima del confronto)
  const q = search.toLowerCase().trim();
  if (q) list = list.filter(t =>
    t.title.toLowerCase().includes(q) ||
    (t.desc && t.desc.toLowerCase().includes(q))
  );

  // Ordinamento
  const sortMap = {
    'date-desc': (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    'date-asc':  (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    'name-asc':  (a, b) => a.title.localeCompare(b.title),
    'priority':  (a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
    }
  };
  if (sortMap[sort]) list.sort(sortMap[sort]);
  return list;
}

function renderTasks() {
  const list = getFilteredTasks();
  const container = $('#tasks-list');
  const emptyEl   = $('#tasks-empty');
  const pagEl     = $('#tasks-pagination');
  if (!container) return;

  // Paginazione
  const total = list.length;
  const pages = Math.ceil(total / state.taskPerPage);
  if (state.taskPage > pages) state.taskPage = Math.max(1, pages);
  const start = (state.taskPage - 1) * state.taskPerPage;
  const paged = list.slice(start, start + state.taskPerPage);

  container.innerHTML = '';

  if (total === 0) {
    emptyEl && (emptyEl.hidden = false);
    pagEl && (pagEl.innerHTML = '');
    return;
  }
  emptyEl && (emptyEl.hidden = true);

  paged.forEach(task => {
    const item = buildTaskItem(task);
    container.appendChild(item);
  });

  // Render paginazione
  if (pagEl) {
    pagEl.innerHTML = '';
    for (let i = 1; i <= pages; i++) {
      const btn = document.createElement('button');
      btn.className = `page-btn${i === state.taskPage ? ' active' : ''}`;
      btn.textContent = i;
      btn.setAttribute('aria-label', `Pagina ${i}`);
      btn.setAttribute('aria-current', i === state.taskPage ? 'page' : 'false');
      btn.addEventListener('click', () => { state.taskPage = i; renderTasks(); });
      pagEl.appendChild(btn);
    }
  }
}

function buildTaskItem(task) {
  const div = document.createElement('div');
  div.className = `task-item${task.status === 'done' ? ' done-item' : ''}`;
  div.dataset.priority = task.priority || 'medium';
  div.setAttribute('role', 'listitem');
  div.setAttribute('tabindex', '0');

  const statusLabels = { todo: 'Da fare', 'in-progress': 'In corso', done: 'Completata' };
  const priorityLabels = { high: 'Alta', medium: 'Media', low: 'Bassa' };

  // Checkbox
  const check = document.createElement('div');
  check.className = 'task-checkbox';
  check.setAttribute('aria-hidden', 'true');
  if (task.status === 'done') check.textContent = '✓';

  // Content
  const content = document.createElement('div');
  content.className = 'task-content';

  const titleEl = document.createElement('div');
  titleEl.className = 'task-title';
  titleEl.textContent = escapeHTML(task.title); // testo sicuro

  const meta = document.createElement('div');
  meta.className = 'task-meta';
  const badgeStatus = document.createElement('span');
  badgeStatus.className = `task-badge badge-status-${task.status}`;
  badgeStatus.textContent = statusLabels[task.status] || task.status;
  const badgePrio = document.createElement('span');
  badgePrio.className = `task-badge badge-priority-${task.priority}`;
  badgePrio.textContent = priorityLabels[task.priority] || task.priority;
  meta.append(badgeStatus, badgePrio);
  content.append(titleEl, meta);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-icon';
  editBtn.setAttribute('aria-label', `Modifica ${escapeHTML(task.title)}`);
  editBtn.title = 'Modifica';
  editBtn.textContent = '✏';
  editBtn.addEventListener('click', e => { e.stopPropagation(); openEditTask(task.id); });

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-icon';
  delBtn.setAttribute('aria-label', `Elimina ${escapeHTML(task.title)}`);
  delBtn.title = 'Elimina';
  delBtn.textContent = '🗑';
  delBtn.addEventListener('click', e => { e.stopPropagation(); deleteTask(task.id); });

  actions.append(editBtn, delBtn);
  div.append(check, content, actions);

  // Click item → toggle done / modale
  div.addEventListener('click', () => openTaskModal(task.id));
  div.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openTaskModal(task.id); });

  // Click checkbox → toggle
  check.addEventListener('click', e => { e.stopPropagation(); toggleTaskDone(task.id); });

  return div;
}

function toggleTaskDone(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.status = task.status === 'done' ? 'todo' : 'done';
  saveState();
  renderTasks();
  updateStreak();
  showToast(task.status === 'done' ? 'Attività completata! 🎉' : 'Attività riaperta', 'success');
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  renderTasks();
  showToast('Attività eliminata', 'danger');
}

function openEditTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  state.editingTaskId = id;
  $('#task-title').value    = task.title;
  $('#task-desc').value     = task.desc  || '';
  $('#task-priority').value = task.priority || 'medium';
  $('#task-status').value   = task.status   || 'todo';
  const container = $('#task-form-container');
  container.hidden = false;
  const titleEl = container.querySelector('h3');
  if (titleEl) titleEl.textContent = 'Modifica attività';
  $('#task-title').focus();
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function openTaskModal(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  const statusLabels = { todo: 'Da fare', 'in-progress': 'In corso', done: 'Completata' };
  const priorityLabels = { high: 'Alta', medium: 'Media', low: 'Bassa' };

  const modalContent = $('#modal-content');
  if (!modalContent) return;

  // Costruiamo il contenuto in modo sicuro — niente innerHTML con input utente
  modalContent.innerHTML = '';

  const title = document.createElement('h3');
  title.id = 'modal-title';
  title.textContent = escapeHTML(task.title);

  const desc = document.createElement('p');
  desc.className = 'modal-body';
  desc.textContent = task.desc ? escapeHTML(task.desc) : 'Nessuna descrizione.';

  const badges = document.createElement('div');
  badges.className = 'modal-badges';
  const b1 = document.createElement('span');
  b1.className = `task-badge badge-status-${task.status}`;
  b1.textContent = statusLabels[task.status] || task.status;
  const b2 = document.createElement('span');
  b2.className = `task-badge badge-priority-${task.priority}`;
  b2.textContent = 'Priorità: ' + (priorityLabels[task.priority] || task.priority);
  badges.append(b1, b2);

  const meta = document.createElement('div');
  meta.className = 'modal-meta';
  meta.textContent = 'Creata il: ' + formatDate(task.createdAt);

  modalContent.append(title, desc, badges, meta);

  const overlay = $('#modal-overlay');
  overlay.hidden = false;
  $('#modal-close-btn').focus();
}

function initTaskForm() {
  const addBtn    = $('#add-task-btn');
  const cancelBtn = $('#cancel-task-btn');
  const form      = $('#task-form');
  const container = $('#task-form-container');

  addBtn && addBtn.addEventListener('click', () => {
    state.editingTaskId = null;
    form && form.reset();
    clearAllTaskErrors();
    const titleEl = container.querySelector('h3');
    if (titleEl) titleEl.textContent = 'Nuova attività';
    container.hidden = false;
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    $('#task-title').focus();
  });

  cancelBtn && cancelBtn.addEventListener('click', () => {
    container.hidden = true;
    state.editingTaskId = null;
    form && form.reset();
    clearAllTaskErrors();
  });

  form && form.addEventListener('submit', e => {
    e.preventDefault();
    const titleVal = $('#task-title').value.trim();
    const descVal  = $('#task-desc').value.trim();
    const prio     = $('#task-priority').value;
    const status   = $('#task-status').value;

    clearAllTaskErrors();
    if (!titleVal) { setError('task-title', 'Il titolo è obbligatorio.'); return; }
    if (titleVal.length < 2) { setError('task-title', 'Minimo 2 caratteri.'); return; }

    if (state.editingTaskId) {
      const t = state.tasks.find(t => t.id === state.editingTaskId);
      if (t) { t.title = titleVal; t.desc = descVal; t.priority = prio; t.status = status; }
      showToast('Attività aggiornata', 'success');
    } else {
      state.tasks.push({ id: uid(), title: titleVal, desc: descVal, priority: prio, status, createdAt: new Date().toISOString() });
      showToast('Attività aggiunta! ✅', 'success');
    }
    saveState();
    container.hidden = true;
    state.editingTaskId = null;
    form.reset();
    renderTasks();
    renderHome();
  });
}

function clearAllTaskErrors() {
  clearError('task-title');
}

function initTaskFilters() {
  const searchInput = $('#task-search');
  const filterSel   = $('#task-filter');
  const sortSel     = $('#task-sort');
  const resetBtn    = $('#reset-task-filters');

  searchInput && searchInput.addEventListener('input', () => {
    state.taskFilter.search = searchInput.value;
    state.taskPage = 1;
    renderTasks();
  });
  filterSel && filterSel.addEventListener('change', () => {
    state.taskFilter.status = filterSel.value;
    state.taskPage = 1;
    renderTasks();
  });
  sortSel && sortSel.addEventListener('change', () => {
    state.taskFilter.sort = sortSel.value;
    renderTasks();
  });
  resetBtn && resetBtn.addEventListener('click', () => {
    state.taskFilter = { search: '', status: 'all', sort: 'date-desc' };
    state.taskPage = 1;
    if (searchInput) searchInput.value = '';
    if (filterSel) filterSel.value = 'all';
    if (sortSel) sortSel.value = 'date-desc';
    renderTasks();
    showToast('Filtri resettati');
  });
}

// ============================================================
// GOALS
// ============================================================
function renderGoals() {
  const container = $('#goals-list');
  const emptyEl   = $('#goals-empty');
  if (!container) return;
  container.innerHTML = '';

  if (state.goals.length === 0) {
    emptyEl && (emptyEl.hidden = false);
    return;
  }
  emptyEl && (emptyEl.hidden = true);

  state.goals.forEach(goal => {
    const item = buildGoalItem(goal);
    container.appendChild(item);
  });
}

function buildGoalItem(goal) {
  const pct = Math.min(Math.round((goal.current / goal.target) * 100), 100);
  const complete = pct >= 100;
  const div = document.createElement('div');
  div.className = 'goal-item';
  div.setAttribute('role', 'listitem');

  const header = document.createElement('div');
  header.className = 'goal-header';

  const titleGroup = document.createElement('div');
  const titleEl = document.createElement('div');
  titleEl.className = 'goal-title';
  titleEl.textContent = escapeHTML(goal.title);
  const valEl = document.createElement('div');
  valEl.className = 'goal-values';
  valEl.textContent = `${goal.current} / ${goal.target} ${escapeHTML(goal.unit || '')}`;
  titleGroup.append(titleEl, valEl);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-danger';
  delBtn.setAttribute('aria-label', `Elimina obiettivo ${escapeHTML(goal.title)}`);
  delBtn.textContent = 'Elimina';
  delBtn.addEventListener('click', () => deleteGoal(goal.id));

  header.append(titleGroup, delBtn);

  const progressWrap = document.createElement('div');
  progressWrap.className = 'goal-progress-wrap';
  const barOuter = document.createElement('div');
  barOuter.className = 'progress-bar-wrap';
  barOuter.setAttribute('role', 'progressbar');
  barOuter.setAttribute('aria-valuenow', pct);
  barOuter.setAttribute('aria-valuemin', 0);
  barOuter.setAttribute('aria-valuemax', 100);
  barOuter.setAttribute('aria-label', `${escapeHTML(goal.title)}: ${pct}%`);
  const barInner = document.createElement('div');
  barInner.className = `progress-bar${complete ? ' complete' : ''}`;
  barInner.style.width = `${pct}%`;
  barOuter.appendChild(barInner);
  const pctEl = document.createElement('div');
  pctEl.className = 'goal-pct';
  pctEl.textContent = `${pct}%`;
  progressWrap.append(barOuter, pctEl);

  // Input aggiorna progresso
  const inputRow = document.createElement('div');
  inputRow.className = 'goal-input-row';
  const numInput = document.createElement('input');
  numInput.type = 'number';
  numInput.min = '0';
  numInput.max = String(goal.target);
  numInput.value = goal.current;
  numInput.setAttribute('aria-label', `Aggiorna progresso per ${escapeHTML(goal.title)}`);
  const updateBtn = document.createElement('button');
  updateBtn.className = 'btn btn-primary';
  updateBtn.textContent = 'Aggiorna';
  updateBtn.addEventListener('click', () => {
    const val = parseFloat(numInput.value);
    if (isNaN(val) || val < 0 || val > goal.target) {
      showToast('Valore non valido', 'warning');
      return;
    }
    updateGoalProgress(goal.id, val);
  });
  inputRow.append(numInput, updateBtn);

  div.append(header, progressWrap, inputRow);
  return div;
}

function updateGoalProgress(id, val) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  goal.current = Math.max(0, Math.min(val, goal.target));
  saveState();
  renderGoals();
  if (goal.current >= goal.target) showToast('🎉 Obiettivo raggiunto!', 'success');
  else showToast('Progresso aggiornato', 'success');
}

function deleteGoal(id) {
  state.goals = state.goals.filter(g => g.id !== id);
  saveState();
  renderGoals();
  showToast('Obiettivo eliminato', 'danger');
}

function initGoalForm() {
  const addBtn    = $('#add-goal-btn');
  const cancelBtn = $('#cancel-goal-btn');
  const form      = $('#goal-form');
  const container = $('#goal-form-container');

  addBtn && addBtn.addEventListener('click', () => {
    form && form.reset();
    clearAllGoalErrors();
    container.hidden = false;
    $('#goal-title').focus();
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  cancelBtn && cancelBtn.addEventListener('click', () => {
    container.hidden = true;
    form && form.reset();
  });
  form && form.addEventListener('submit', e => {
    e.preventDefault();
    const titleVal  = $('#goal-title').value.trim();
    const targetVal = parseInt($('#goal-target').value);
    const unitVal   = $('#goal-unit').value.trim();

    clearAllGoalErrors();
    let valid = true;
    if (!titleVal)       { setError('goal-title',  'Titolo obbligatorio.'); valid = false; }
    if (isNaN(targetVal) || targetVal < 1) { setError('goal-target', 'Target minimo: 1.'); valid = false; }
    if (!valid) return;

    state.goals.push({ id: uid(), title: titleVal, target: targetVal, current: 0, unit: unitVal, createdAt: new Date().toISOString() });
    saveState();
    container.hidden = true;
    form.reset();
    renderGoals();
    renderHome();
    showToast('Obiettivo aggiunto! 🎯', 'success');
  });
}

function clearAllGoalErrors() {
  clearError('goal-title');
  clearError('goal-target');
}

// ============================================================
// NOTES
// ============================================================
function renderNotes() {
  const container = $('#notes-grid');
  const emptyEl   = $('#notes-empty');
  if (!container) return;
  container.innerHTML = '';

  const q = (state.noteSearch || '').toLowerCase().trim();
  let list = [...state.notes];
  if (q) list = list.filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.body.toLowerCase().includes(q) ||
    (n.tag && n.tag.toLowerCase().includes(q))
  );

  if (list.length === 0) { emptyEl && (emptyEl.hidden = false); return; }
  emptyEl && (emptyEl.hidden = true);

  list.forEach(note => {
    const card = buildNoteCard(note);
    container.appendChild(card);
  });
}

function buildNoteCard(note) {
  const div = document.createElement('div');
  div.className = 'note-card';
  div.setAttribute('role', 'listitem');
  div.setAttribute('tabindex', '0');
  div.setAttribute('aria-label', `Nota: ${escapeHTML(note.title)}`);

  const header = document.createElement('div');
  header.className = 'note-card-header';

  const titleEl = document.createElement('div');
  titleEl.className = 'note-card-title';
  titleEl.textContent = escapeHTML(note.title);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-icon';
  delBtn.setAttribute('aria-label', `Elimina nota ${escapeHTML(note.title)}`);
  delBtn.title = 'Elimina';
  delBtn.textContent = '🗑';
  delBtn.addEventListener('click', e => { e.stopPropagation(); deleteNote(note.id); });

  header.append(titleEl, delBtn);

  const body = document.createElement('div');
  body.className = 'note-card-body';
  body.textContent = escapeHTML(note.body); // sicuro: textContent

  const footer = document.createElement('div');
  if (note.tag) {
    const tagEl = document.createElement('span');
    tagEl.className = 'note-tag';
    tagEl.textContent = '#' + escapeHTML(note.tag);
    footer.appendChild(tagEl);
  }
  const dateEl = document.createElement('div');
  dateEl.className = 'note-date';
  dateEl.textContent = formatDate(note.createdAt);
  footer.appendChild(dateEl);

  div.append(header, body, footer);
  div.addEventListener('click', () => openNoteModal(note.id));
  div.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openNoteModal(note.id); });
  return div;
}

function deleteNote(id) {
  state.notes = state.notes.filter(n => n.id !== id);
  saveState();
  renderNotes();
  renderHome();
  showToast('Nota eliminata', 'danger');
}

function openNoteModal(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  const modalContent = $('#modal-content');
  if (!modalContent) return;
  modalContent.innerHTML = '';

  const titleEl = document.createElement('h3');
  titleEl.id = 'modal-title';
  titleEl.textContent = escapeHTML(note.title);

  const bodyEl = document.createElement('p');
  bodyEl.className = 'modal-body';
  bodyEl.style.whiteSpace = 'pre-wrap';
  bodyEl.textContent = escapeHTML(note.body);

  const meta = document.createElement('div');
  meta.className = 'modal-meta';
  meta.textContent = (note.tag ? `#${escapeHTML(note.tag)} — ` : '') + 'Creata il: ' + formatDate(note.createdAt);

  modalContent.append(titleEl, bodyEl, meta);
  $('#modal-overlay').hidden = false;
  $('#modal-close-btn').focus();
}

function initNoteForm() {
  const addBtn    = $('#add-note-btn');
  const cancelBtn = $('#cancel-note-btn');
  const form      = $('#note-form');
  const container = $('#note-form-container');
  const searchInput = $('#note-search');

  addBtn && addBtn.addEventListener('click', () => {
    form && form.reset();
    clearAllNoteErrors();
    container.hidden = false;
    $('#note-title').focus();
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  cancelBtn && cancelBtn.addEventListener('click', () => { container.hidden = true; form && form.reset(); });
  searchInput && searchInput.addEventListener('input', () => {
    state.noteSearch = searchInput.value;
    renderNotes();
  });
  form && form.addEventListener('submit', e => {
    e.preventDefault();
    const titleVal = $('#note-title').value.trim();
    const bodyVal  = $('#note-body').value.trim();
    const tagVal   = $('#note-tag').value.trim();

    clearAllNoteErrors();
    let valid = true;
    if (!titleVal) { setError('note-title', 'Titolo obbligatorio.'); valid = false; }
    if (!bodyVal)  { setError('note-body',  'Il contenuto è obbligatorio.'); valid = false; }
    if (!valid) return;

    state.notes.unshift({ id: uid(), title: titleVal, body: bodyVal, tag: tagVal, createdAt: new Date().toISOString() });
    saveState();
    container.hidden = true;
    form.reset();
    renderNotes();
    renderHome();
    showToast('Nota salvata! 📝', 'success');
  });
}
function clearAllNoteErrors() {
  clearError('note-title');
  clearError('note-body');
}

// ============================================================
// STATS
// ============================================================
function renderStats() {
  const tasks = state.tasks;
  const total = tasks.length;
  const done  = tasks.filter(t => t.status === 'done').length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const pctEl = $('#completion-pct');
  const barEl = $('#completion-bar');
  const wrapEl = $('#completion-bar-wrap');
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (barEl) barEl.style.width = `${pct}%`;
  if (wrapEl) wrapEl.setAttribute('aria-valuenow', pct);

  // Priority chart
  const priorities = ['high', 'medium', 'low'];
  const prioLabels  = { high: 'Alta', medium: 'Media', low: 'Bassa' };
  const prioColors  = { high: '#f87171', medium: '#fbbf24', low: '#6ee7b7' };
  const prioCounts  = {};
  priorities.forEach(p => { prioCounts[p] = tasks.filter(t => t.priority === p).length; });
  const maxPrio = Math.max(...Object.values(prioCounts), 1);
  const chartEl = $('#priority-chart');
  if (chartEl) {
    chartEl.innerHTML = '';
    priorities.forEach(p => {
      const row = document.createElement('div');
      row.className = 'priority-row';
      const label = document.createElement('span');
      label.className = 'priority-label';
      label.textContent = prioLabels[p];
      const outer = document.createElement('div');
      outer.className = 'priority-bar-outer';
      const inner = document.createElement('div');
      inner.className = 'priority-bar-inner';
      inner.style.width = `${Math.round((prioCounts[p] / maxPrio) * 100)}%`;
      inner.style.background = prioColors[p];
      outer.appendChild(inner);
      const count = document.createElement('span');
      count.className = 'priority-count';
      count.textContent = prioCounts[p];
      row.append(label, outer, count);
      chartEl.appendChild(row);
    });
  }

  // Status bars
  const statuses = ['todo', 'in-progress', 'done'];
  const statusLabels = { todo: 'Da fare', 'in-progress': 'In corso', done: 'Completata' };
  const statusColors = { todo: '#67e8f9', 'in-progress': '#fbbf24', done: '#6ee7b7' };
  const statusCounts = {};
  statuses.forEach(s => { statusCounts[s] = tasks.filter(t => t.status === s).length; });
  const maxStatus = Math.max(...Object.values(statusCounts), 1);
  const statusEl = $('#status-bars');
  if (statusEl) {
    statusEl.innerHTML = '';
    statuses.forEach(s => {
      const row = document.createElement('div');
      row.className = 'status-row';
      const label = document.createElement('span');
      label.className = 'status-label';
      label.textContent = statusLabels[s];
      const outer = document.createElement('div');
      outer.className = 'status-bar-outer';
      const inner = document.createElement('div');
      inner.className = 'status-bar-inner';
      inner.style.width = `${Math.round((statusCounts[s] / maxStatus) * 100)}%`;
      inner.style.background = statusColors[s];
      outer.appendChild(inner);
      const count = document.createElement('span');
      count.className = 'status-count';
      count.textContent = statusCounts[s];
      row.append(label, outer, count);
      statusEl.appendChild(row);
    });
  }

  // Goals progress
  const goalsEl = $('#goals-progress-list');
  if (goalsEl) {
    goalsEl.innerHTML = '';
    if (state.goals.length === 0) {
      const p = document.createElement('p');
      p.style.color = 'var(--text-muted)';
      p.style.fontSize = '0.9rem';
      p.textContent = 'Nessun obiettivo ancora.';
      goalsEl.appendChild(p);
    } else {
      state.goals.forEach(g => {
        const pct2 = Math.min(Math.round((g.current / g.target) * 100), 100);
        const row = document.createElement('div');
        row.className = 'gp-row';
        const lbl = document.createElement('div');
        lbl.className = 'gp-label';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = escapeHTML(g.title);
        const pctSpan = document.createElement('span');
        pctSpan.className = 'gp-pct';
        pctSpan.textContent = `${pct2}%`;
        lbl.append(nameSpan, pctSpan);
        const outer = document.createElement('div');
        outer.className = 'progress-bar-wrap';
        outer.setAttribute('role', 'progressbar');
        outer.setAttribute('aria-valuenow', pct2);
        outer.setAttribute('aria-valuemin', 0);
        outer.setAttribute('aria-valuemax', 100);
        const inner = document.createElement('div');
        inner.className = `progress-bar${pct2 >= 100 ? ' complete' : ''}`;
        inner.style.width = `${pct2}%`;
        outer.appendChild(inner);
        row.append(lbl, outer);
        goalsEl.appendChild(row);
      });
    }
  }
}

// ============================================================
// STREAK
// ============================================================
function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const lastDay = Storage.get('fokus_streak_date', '');
  let streak = Storage.get('fokus_streak', 0);
  if (lastDay !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streak = lastDay === yesterday ? streak + 1 : 1;
    Storage.set('fokus_streak', streak);
    Storage.set('fokus_streak_date', today);
  }
}

// ============================================================
// MODALE
// ============================================================
function initModal() {
  const overlay  = $('#modal-overlay');
  const closeBtn = $('#modal-close-btn');
  if (!overlay) return;

  const close = () => { overlay.hidden = true; };

  closeBtn && closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.hidden) { e.preventDefault(); close(); }
  });
}

// ============================================================
// FOOTER
// ============================================================
function initFooter() {
  const yearEl = $('#footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

// ============================================================
// INIT
// ============================================================
function init() {
  loadState();
  initTheme();
  initClock();
  updateGreeting();
  initNav();
  initHamburger();
  initProfile();
  initTaskForm();
  initTaskFilters();
  initGoalForm();
  initNoteForm();
  initModal();
  initFooter();
  updateStreak();
}

document.addEventListener('DOMContentLoaded', init);
