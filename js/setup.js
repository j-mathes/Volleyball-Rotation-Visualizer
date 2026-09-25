import { ROLE_LABELS } from './config.js';
import { getPlayerLabels, savePlayerLabels, resetPlayerLabels } from './playerLabels.js';
import { getSavedSetups, saveSetup, deleteSetup, setPendingSetup, isValidState, getRotationNumber } from './courtSetups.js';

const form = document.getElementById('playerLabelForm');
const resetBtn = document.getElementById('resetPlayerLabels');
const savedSetupsListEl = document.getElementById('savedSetupsList');
const importSetupBtn = document.getElementById('importSetupBtn');
const importSetupInput = document.getElementById('importSetupInput');

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

// Turns a saved setup into a downloadable .json file so it can be shared
// or backed up outside localStorage.
function downloadSetup(setup) {
  const blob = new Blob([JSON.stringify(setup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = setup.name.replace(/[^a-z0-9-_]+/gi, '_') || 'setup';
  const rotationNumber = getRotationNumber(setup.state);
  link.download = rotationNumber ? `${safeName}_R${rotationNumber}.json` : `${safeName}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderSavedSetups() {
  const setups = getSavedSetups();
  savedSetupsListEl.innerHTML = '';

  if (setups.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'hint';
    empty.textContent = 'No saved setups yet.';
    savedSetupsListEl.appendChild(empty);
    return;
  }

  for (const setup of setups) {
    const item = document.createElement('li');
    item.className = 'saved-setup-row';

    const name = document.createElement('span');
    name.className = 'saved-setup-name';
    name.textContent = setup.name;
    item.appendChild(name);

    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', () => {
      setPendingSetup(setup.state);
      window.location.href = 'index.html';
    });
    item.appendChild(loadBtn);

    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.textContent = 'Export';
    exportBtn.addEventListener('click', () => downloadSetup(setup));
    item.appendChild(exportBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      deleteSetup(setup.id);
      renderSavedSetups();
    });
    item.appendChild(deleteBtn);

    savedSetupsListEl.appendChild(item);
  }
}

importSetupBtn.addEventListener('click', () => importSetupInput.click());

importSetupInput.addEventListener('change', async () => {
  const file = importSetupInput.files[0];
  if (!file) {
    return;
  }
  try {
    const parsed = JSON.parse(await file.text());
    // Accept either a full exported entry ({ name, state }) or a bare state object.
    const state = isValidState(parsed.state) ? parsed.state : parsed;
    if (!isValidState(state)) {
      throw new Error('invalid setup file');
    }
    const name = parsed.name || file.name.replace(/\.json$/i, '');
    saveSetup(name, state);
    renderSavedSetups();
  } catch {
    alert("Could not import that file — make sure it's a setup exported from this app.");
  } finally {
    importSetupInput.value = '';
  }
});

renderSavedSetups();
