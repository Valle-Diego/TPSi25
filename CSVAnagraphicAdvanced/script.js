// ── State ──
const STORAGE_KEY = 'anagrafica_v2';
let sources = [];
let sortDir = 'asc';
let currentView = 'grid';

const PALETTE = [
  '#6ee7b7','#93c5fd','#f9a8d4','#fcd34d','#c4b5fd',
  '#86efac','#67e8f9','#fdba74','#a5b4fc','#d9f99d'
];

// ── Init ──
(function init() {
  loadFromStorage();
  setupDrop();
  document.getElementById('file-input-hidden').addEventListener('change', e => {
    if (e.target.files.length) handleFiles([...e.target.files]);
    e.target.value = '';
  });
})();

// ── Storage ──
function saveToStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sources)); } catch(e) {}
}
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      sources = JSON.parse(raw);
      if (sources.length) showApp();
    }
  } catch(e) { sources = []; }
}

// ── Drop zone ──
function setupDrop() {
  const zone = document.getElementById('drop-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = [...e.dataTransfer.files].filter(f => f.name.endsWith('.csv'));
    if (files.length) handleFiles(files);
    else toast('No CSV files found in drop');
  });
}

// ── File handling ──
function handleFiles(files) {
  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const result = parseCSV(e.target.result, file.name);
      if (result) {
        sources.push(result);
        saveToStorage();
        loaded++;
        if (loaded === files.length) {
          showApp();
          toast(`${loaded} file${loaded > 1 ? 's' : ''} imported successfully ✓`);
        }
      }
    };
    reader.readAsText(file, 'UTF-8');
  });
}

// ── CSV Parser ──
function parseCSV(text, filename) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length);
  if (lines.length < 2) { toast('File has no data: ' + filename); return null; }
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = parseLine(lines[0], sep);
  const records = lines.slice(1).map(l => {
    const vals = parseLine(l, sep);
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i] !== undefined ? vals[i] : '');
    return obj;
  });
  const usedColors = sources.map(s => s.color);
  const color = PALETTE.find(c => !usedColors.includes(c)) || PALETTE[sources.length % PALETTE.length];
  return {
    id: Date.now() + Math.random(),
    name: filename.replace(/\.csv$/i, ''),
    color,
    headers,
    records
  };
}

function parseLine(line, sep) {
  const result = [];
  let field = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === sep && !inQ) { result.push(field.trim()); field = ''; }
    else { field += ch; }
  }
  result.push(field.trim());
  return result;
}

// ── Show app ──
function showApp() {
  document.getElementById('drop-zone').style.display = 'none';
  document.getElementById('add-more-btn').style.display = '';
  document.getElementById('clear-all-btn').style.display = '';
  document.getElementById('controls').style.display = 'flex';
  buildSortSelect();
  renderSources();
  renderMergeBar();
  renderGrid();
}

// ── Sources bar ──
function renderSources() {
  const bar = document.getElementById('sources-bar');
  bar.innerHTML = '';
  sources.forEach(src => {
    const chip = document.createElement('div');
    chip.className = 'source-chip';
    chip.innerHTML = `
      <span class="dot" style="background:${src.color}"></span>
      <span>${esc(src.name)}</span>
      <span class="chip-count">(${src.records.length})</span>
      <button class="remove-src" onclick="removeSource('${src.id}')" title="Remove">×</button>
    `;
    bar.appendChild(chip);
  });
}

function removeSource(id) {
  sources = sources.filter(s => String(s.id) !== String(id));
  saveToStorage();
  if (!sources.length) { clearAll(); return; }
  buildSortSelect();
  renderSources();
  renderMergeBar();
  renderGrid();
  toast('Source removed');
}

// ── Merge bar ──
function renderMergeBar() {
  const bar = document.getElementById('merge-bar');
  const info = document.getElementById('merge-info');
  if (sources.length < 2) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  const total = sources.reduce((n, s) => n + s.records.length, 0);
  info.innerHTML = `<strong>${sources.length} sources</strong> · ${total} total records — Export all data fused into a single CSV`;
}

// ── Sort select ──
function buildSortSelect() {
  const allHeaders = [...new Set(sources.flatMap(s => s.headers))];
  const sel = document.getElementById('sort-select');
  const prev = sel.value;
  sel.innerHTML = '<option value="">—</option>';
  allHeaders.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h; opt.textContent = h;
    sel.appendChild(opt);
  });
  if (prev && allHeaders.includes(prev)) sel.value = prev;
}

// ── Sort direction ──
function toggleSortDir() {
  sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  const btn = document.getElementById('sort-dir');
  btn.className = sortDir;
  renderGrid();
}

// ── View ──
function setView(v) {
  currentView = v;
  document.getElementById('grid').className = v === 'list' ? 'view-table' : '';
  document.getElementById('btn-grid').className = 'view-btn' + (v === 'grid' ? ' active' : '');
  document.getElementById('btn-list').className = 'view-btn' + (v === 'list' ? ' active' : '');
  renderGrid();
}

// ── Render grid ──
function renderGrid() {
  const query  = document.getElementById('search').value.toLowerCase();
  const sortBy = document.getElementById('sort-select').value;
  const grid   = document.getElementById('grid');

  let data = sources.flatMap(src =>
    src.records.map(r => ({ ...r, __src: src }))
  );

  if (query) {
    data = data.filter(r =>
      Object.entries(r)
        .filter(([k]) => k !== '__src')
        .some(([, v]) => String(v).toLowerCase().includes(query))
    );
  }

  if (sortBy) {
    data = data.slice().sort((a, b) => {
      const av = String(a[sortBy] || '');
      const bv = String(b[sortBy] || '');
      const cmp = av.localeCompare(bv, 'en', { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  grid.innerHTML = '';
  const empty = document.getElementById('empty-state');

  if (!data.length) {
    empty.style.display = 'block';
    document.getElementById('counter').textContent = '0 records';
    return;
  }

  empty.style.display = 'none';
  document.getElementById('counter').textContent = `${data.length} record${data.length !== 1 ? 's' : ''}`;

  const frag = document.createDocumentFragment();
  data.forEach(r => frag.appendChild(createCard(r, query)));
  grid.appendChild(frag);
}

// ── Card ──
function createCard(record, query) {
  const src = record.__src;
  const card = document.createElement('div');
  card.className = 'card' + (currentView === 'list' ? ' row-view' : '');
  card.style.setProperty('--src-color', src.color);

  const srcTag = `<div class="card-src-tag"><span class="dot" style="background:${src.color}"></span>${esc(src.name)}</div>`;
  const allHeaders = [...new Set(sources.flatMap(s => s.headers))];

  const fields = allHeaders.map(k => {
    if (k === '__src') return '';
    const v = record[k] !== undefined ? String(record[k]) : '';
    const displayed = v ? highlight(esc(v), query) : '<em>—</em>';
    return `<div class="field"><span class="label">${esc(k)}</span><span class="value">${displayed}</span></div>`;
  }).join('');

  card.innerHTML = srcTag + fields;
  return card;
}

function highlight(text, query) {
  if (!query) return text;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${safe})`, 'gi'), '<span class="highlight">$1</span>');
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Export merged CSV ──
function exportMerged() {
  const allHeaders = [...new Set(sources.flatMap(s => s.headers))];
  const rows = [allHeaders.join(',')];
  sources.forEach(src => {
    src.records.forEach(r => {
      const row = allHeaders.map(h => {
        const v = r[h] !== undefined ? String(r[h]) : '';
        return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g,'""')}"` : v;
      });
      rows.push(row.join(','));
    });
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = 'contacts_merged_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('Export complete ✓');
}

// ── Clear all ──
function clearAll() {
  sources = [];
  saveToStorage();
  document.getElementById('drop-zone').style.display = '';
  document.getElementById('add-more-btn').style.display = 'none';
  document.getElementById('clear-all-btn').style.display = 'none';
  document.getElementById('controls').style.display = 'none';
  document.getElementById('sources-bar').innerHTML = '';
  document.getElementById('merge-bar').style.display = 'none';
  document.getElementById('grid').innerHTML = '';
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('search').value = '';
  document.getElementById('sort-select').innerHTML = '<option value="">—</option>';
  document.getElementById('counter').textContent = '';
}

// ── Toast ──
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}