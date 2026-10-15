const cards = document.querySelector('#cards');
const count = document.querySelector('#count');

const titleCase = value => String(value)
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/^./, character => character.toUpperCase());

const humanValue = value => {
  if (Array.isArray(value)) {
    return value.flatMap(item => item && typeof item === 'object' ? Object.values(item) : [item])
      .filter(entry => entry !== null && typeof entry !== 'object');
  }
  if (value && typeof value === 'object') {
    return Object.values(value)
      .flatMap(entry => Array.isArray(entry) ? entry : [entry])
      .filter(entry => entry === null || typeof entry !== 'object');
  }
  return [value];
};

function render(data) {
  if (!Array.isArray(data)) throw new Error('Il file deve contenere un array JSON (una collection).');
  count.textContent = `${data.length} ${data.length === 1 ? 'elemento' : 'elementi'} nella collection`;
  cards.replaceChildren();

  if (!data.length) {
    cards.innerHTML = '<div class="empty">La collection è vuota. Aggiungi un elemento in collection.json.</div>';
    return;
  }

  data.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const card = document.createElement('article');
    card.className = 'card';
    const fullName = [item.nome, item.cognome].filter(Boolean).join(' ');
    const heading = fullName || item.titolo || item.name || `Elemento ${index + 1}`;
    const top = document.createElement('div');
    top.className = 'card-top';
    const identity = document.createElement('div');
    const headingElement = document.createElement('h2');
    headingElement.className = 'name';
    headingElement.textContent = heading;
    identity.append(headingElement);

    if (fullName && item.eta !== undefined) {
      const subtitle = document.createElement('p');
      subtitle.className = 'subtitle';
      subtitle.textContent = `${item.eta} anni`;
      identity.append(subtitle);
    }

    const badge = document.createElement('span');
    badge.className = 'number';
    badge.textContent = String(index + 1).padStart(2, '0');
    top.append(identity, badge);
    card.append(top);
    const list = document.createElement('dl');

    Object.entries(item).forEach(([key, value]) => {
      if (['nome', 'cognome'].includes(key) || (key === 'eta' && fullName)) return;
      const values = humanValue(value);
      const term = document.createElement('dt');
      term.textContent = titleCase(key);
      const description = document.createElement('dd');

      if (values.length > 1 || (Array.isArray(value) && values.length)) {
        const chips = document.createElement('span');
        chips.className = 'chips';
        values.forEach(entry => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = String(entry);
          chips.append(chip);
        });
        description.append(chips);
      } else {
        description.textContent = values[0] == null ? '—' : String(values[0]);
      }
      list.append(term, description);
    });

    if (!list.childElementCount) {
      const term = document.createElement('dt');
      term.textContent = 'Dettagli';
      const description = document.createElement('dd');
      description.textContent = '—';
      list.append(term, description);
    }
    card.append(list);
    cards.append(card);
  });
}

function showError(message) {
  count.textContent = 'Impossibile caricare la collection';
  cards.replaceChildren();
  const box = document.createElement('div');
  box.className = 'error';
  box.textContent = `${message} Puoi aprire direttamente un file JSON con il pulsante qui sopra.`;
  cards.append(box);
}

async function loadDefault() {
  try {
    const response = await fetch('./collection.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('File collection.json non trovato.');
    render(await response.json());
  } catch (error) {
    showError(`${error.message} Se hai aperto la pagina come file locale, usa “Apri un file JSON” oppure avviala con un server locale.`);
  }
}

document.querySelector('#reload').addEventListener('click', loadDefault);
document.querySelector('#file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    render(JSON.parse(await file.text()));
  } catch (error) {
    showError(`JSON non valido: ${error.message}`);
  }
});

loadDefault();
