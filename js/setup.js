import { ROLE_LABELS } from './config.js';
import { getPlayerLabels, savePlayerLabels, resetPlayerLabels } from './playerLabels.js';

const form = document.getElementById('playerLabelForm');
const resetBtn = document.getElementById('resetPlayerLabels');

function renderForm() {
  const labels = getPlayerLabels();
  form.innerHTML = '';
  for (const role of Object.keys(ROLE_LABELS)) {
    const row = document.createElement('label');
    row.className = 'player-label-row';

    const roleName = document.createElement('span');
    roleName.textContent = role;
    row.appendChild(roleName);

    const input = document.createElement('input');
    input.type = 'text';
    input.name = role;
    input.maxLength = 3;
    input.value = labels[role];
    row.appendChild(input);

    form.appendChild(row);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const labels = {};
  for (const role of Object.keys(ROLE_LABELS)) {
    const value = form.elements.namedItem(role).value.trim().slice(0, 3);
    labels[role] = value || ROLE_LABELS[role];
  }
  savePlayerLabels(labels);
  renderForm();
});

resetBtn.addEventListener('click', () => {
  resetPlayerLabels();
  renderForm();
});

renderForm();
