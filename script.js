const CORRECT_PASSWORD = "495715"; // ← cambia questa password

function openModal() {
  document.getElementById('modal').classList.add('active');
  setTimeout(() => document.getElementById('pwd').focus(), 100);
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  document.getElementById('pwd').value = '';
  document.getElementById('modal-error').textContent = '';
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

function handleKey(e) {
  if (e.key === 'Enter') checkPassword();
  if (e.key === 'Escape') closeModal();
}

function checkPassword() {
  const input = document.getElementById('pwd');
  const err = document.getElementById('modal-error');

  if (input.value === CORRECT_PASSWORD) {
    window.location.href = 'Secret/secret.html';
  } else {
    err.textContent = 'password errata — riprova.';
    input.classList.remove('shake');
    void input.offsetWidth; // reflow per riavviare l'animazione
    input.classList.add('shake');
    input.value = '';
    setTimeout(() => input.classList.remove('shake'), 400);
  }
}
