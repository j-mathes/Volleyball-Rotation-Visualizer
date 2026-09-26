import { ROLE_LABELS } from './config.js';
import { getPlayerLabels, savePlayerLabels, resetPlayerLabels } from './playerLabels.js';
import { getSavedSetups, saveSetup, deleteSetup, setPendingSetup, isValidState, getRotationNumber } from './courtSetups.js';
import { getColors, saveColors, resetColors, applyColors, COLOR_LABELS } from './colors.js';
import { getLineSettings, saveLineSettings, resetLineSettings, applyLineSettings, LINE_SETTING_LABELS } from './lineSettings.js';
import { getPlaylist, addPlaylistItem, removePlaylistItem, movePlaylistItem, clearPlaylist, getPlaylistDelay, setPlaylistDelay } from './playlist.js';

applyColors();
applyLineSettings();

const form = document.getElementById('playerLabelForm');
const resetBtn = document.getElementById('resetPlayerLabels');
const savedSetupsListEl = document.getElementById('savedSetupsList');
const importSetupBtn = document.getElementById('importSetupBtn');
const importSetupInput = document.getElementById('importSetupInput');
const colorForm = document.getElementById('colorForm');
const resetColorsBtn = document.getElementById('resetColors');
const lineSettingsForm = document.getElementById('lineSettingsForm');
const resetLineSettingsBtn = document.getElementById('resetLineSettings');
const playlistListEl = document.getElementById('playlistList');
const addToPlaylistSelect = document.getElementById('addToPlaylistSelect');
const addToPlaylistBtn = document.getElementById('addToPlaylistBtn');
const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
const playlistDelayInput = document.getElementById('playlistDelayInput');

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
      renderPlaylist();
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
    renderPlaylist();
  } catch {
    alert("Could not import that file — make sure it's a setup exported from this app.");
  } finally {
    importSetupInput.value = '';
  }
});

renderSavedSetups();

function renderColorForm() {
  const colors = getColors();
  colorForm.innerHTML = '';
  for (const name of Object.keys(COLOR_LABELS)) {
    const row = document.createElement('label');
    row.className = 'color-row';

    const input = document.createElement('input');
    input.type = 'color';
    input.name = name;
    input.value = colors[name];
    row.appendChild(input);

    const labelText = document.createElement('span');
    labelText.textContent = COLOR_LABELS[name];
    row.appendChild(labelText);

    colorForm.appendChild(row);
  }
}

colorForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const colors = {};
  for (const name of Object.keys(COLOR_LABELS)) {
    colors[name] = colorForm.elements.namedItem(name).value;
  }
  saveColors(colors);
  applyColors();
});

resetColorsBtn.addEventListener('click', () => {
  resetColors();
  applyColors();
  renderColorForm();
});

renderColorForm();

function renderLineSettingsForm() {
  const settings = getLineSettings();
  lineSettingsForm.innerHTML = '';
  for (const name of Object.keys(LINE_SETTING_LABELS)) {
    const row = document.createElement('label');
    row.className = 'line-setting-row';

    const labelText = document.createElement('span');
    labelText.textContent = LINE_SETTING_LABELS[name];
    row.appendChild(labelText);

    const input = document.createElement('input');
    input.type = 'number';
    input.name = name;
    input.min = 1;
    input.max = 20;
    input.value = settings[name];
    row.appendChild(input);

    lineSettingsForm.appendChild(row);
  }
}

lineSettingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const settings = {};
  for (const name of Object.keys(LINE_SETTING_LABELS)) {
    const value = Number(lineSettingsForm.elements.namedItem(name).value);
    settings[name] = Number.isFinite(value) && value > 0 ? value : getLineSettings()[name];
  }
  saveLineSettings(settings);
  applyLineSettings();
  renderLineSettingsForm();
});

resetLineSettingsBtn.addEventListener('click', () => {
  resetLineSettings();
  applyLineSettings();
  renderLineSettingsForm();
});

renderLineSettingsForm();

function renderPlaylist() {
  const setups = getSavedSetups();
  const byId = Object.fromEntries(setups.map((setup) => [setup.id, setup]));

  // Keep the "add" dropdown in sync with the current saved-setup list.
  addToPlaylistSelect.innerHTML = '';
  for (const setup of setups) {
    const option = document.createElement('option');
    option.value = setup.id;
    option.textContent = setup.name;
    addToPlaylistSelect.appendChild(option);
  }

  const items = getPlaylist();
  playlistListEl.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'hint';
    empty.textContent = 'Playlist is empty.';
    playlistListEl.appendChild(empty);
    return;
  }

  items.forEach((item, index) => {
    const setup = byId[item.setupId];
    const row = document.createElement('li');
    row.className = 'saved-setup-row';

    const name = document.createElement('span');
    name.className = 'saved-setup-name';
    name.textContent = setup ? `${index + 1}. ${setup.name}` : `${index + 1}. (deleted setup)`;
    row.appendChild(name);

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.textContent = '\u2191';
    upBtn.disabled = index === 0;
    upBtn.addEventListener('click', () => {
      movePlaylistItem(item.id, -1);
      renderPlaylist();
    });
    row.appendChild(upBtn);

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.textContent = '\u2193';
    downBtn.disabled = index === items.length - 1;
    downBtn.addEventListener('click', () => {
      movePlaylistItem(item.id, 1);
      renderPlaylist();
    });
    row.appendChild(downBtn);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      removePlaylistItem(item.id);
      renderPlaylist();
    });
    row.appendChild(removeBtn);

    playlistListEl.appendChild(row);
  });
}

addToPlaylistBtn.addEventListener('click', () => {
  if (!addToPlaylistSelect.value) {
    return;
  }
  addPlaylistItem(addToPlaylistSelect.value);
  renderPlaylist();
});

clearPlaylistBtn.addEventListener('click', () => {
  clearPlaylist();
  renderPlaylist();
});

playlistDelayInput.value = getPlaylistDelay();
playlistDelayInput.addEventListener('change', () => {
  const ms = Number(playlistDelayInput.value);
  if (Number.isFinite(ms) && ms > 0) {
    setPlaylistDelay(ms);
  }
});

renderPlaylist();

