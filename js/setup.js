import { ROLE_LABELS } from './config.js';
import { getPlayerLabels, savePlayerLabels, resetPlayerLabels } from './playerLabels.js';
import { getSavedSetups, saveSetup, deleteSetup, setPendingSetup, isValidState, getRotationNumber, getFolderNames, setSetupFolder, renameFolder } from './courtSetups.js';
import { getColors, saveColors, resetColors, applyColors, COLOR_LABELS, PRESET_SWATCHES } from './colors.js';
import { getLineSettings, saveLineSettings, resetLineSettings, applyLineSettings, LINE_SETTING_LABELS } from './lineSettings.js';
import { getFontSettings, saveFontSettings, resetFontSettings, applyFontSettings, DEFAULT_FONT_SETTINGS, FONT_SETTING_LABELS, FONT_FAMILY_OPTIONS } from './fontSettings.js';
import { getEffectSettings, saveEffectSettings, resetEffectSettings, applyEffectSettings, EFFECT_SETTING_LABELS } from './effectSettings.js';
import { getPlaylist, addPlaylistItem, removePlaylistItem, movePlaylistItem, clearPlaylist, getPlaylistDelay, setPlaylistDelay } from './playlist.js';

applyColors();
applyLineSettings();
applyFontSettings();
applyEffectSettings();

const form = document.getElementById('playerLabelForm');
const resetBtn = document.getElementById('resetPlayerLabels');
const savedSetupsListEl = document.getElementById('savedSetupsList');
const importSetupBtn = document.getElementById('importSetupBtn');
const importSetupInput = document.getElementById('importSetupInput');
const colorForm = document.getElementById('colorForm');
const resetColorsBtn = document.getElementById('resetColors');
const lineSettingsForm = document.getElementById('lineSettingsForm');
const resetLineSettingsBtn = document.getElementById('resetLineSettings');
const fontSettingsFieldsEl = document.getElementById('fontSettingsFields');
const saveFontSettingsBtn = document.getElementById('saveFontSettings');
const resetFontSettingsBtn = document.getElementById('resetFontSettings');
const effectSettingsForm = document.getElementById('effectSettingsForm');
const resetEffectSettingsBtn = document.getElementById('resetEffectSettings');
const playlistListEl = document.getElementById('playlistList');
const addToPlaylistSelect = document.getElementById('addToPlaylistSelect');
const addToPlaylistBtn = document.getElementById('addToPlaylistBtn');
const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
const playlistDelayInput = document.getElementById('playlistDelayInput');
const folderNamesListEl = document.getElementById('folderNamesList');

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
  const safeName = setup.name.replace(/[^a-z0-9-_]+/gi, '_') || 'setup';
  const rotationNumber = getRotationNumber(setup.state);
  const fileName = rotationNumber ? `${safeName}_R${rotationNumber}.json` : `${safeName}.json`;
  downloadJson(setup, fileName);
}

// Bundles every setup in a folder into one downloadable .json file, so a
// whole group can be exported/shared/re-imported together instead of one
// setup at a time.
function downloadFolder(folderName, setups) {
  const bundle = { folder: folderName, setups };
  const safeName = folderName.replace(/[^a-z0-9-_]+/gi, '_') || 'folder';
  downloadJson(bundle, `${safeName}.json`);
}

function downloadJson(data, fileName) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// Groups saved setups by their `folder` field (see courtSetups.js) - null
// goes in an "Ungrouped" bucket, shown first, followed by folders in
// alphabetical order.
function groupSetupsByFolder(setups) {
  const groups = new Map([[null, []]]);
  for (const name of getFolderNames()) {
    groups.set(name, []);
  }
  for (const setup of setups) {
    if (!groups.has(setup.folder)) {
      groups.set(setup.folder, []);
    }
    groups.get(setup.folder).push(setup);
  }
  return groups;
}

function renderSavedSetups() {
  const setups = getSavedSetups();
  savedSetupsListEl.innerHTML = '';

  folderNamesListEl.innerHTML = '';
  for (const name of getFolderNames()) {
    const option = document.createElement('option');
    option.value = name;
    folderNamesListEl.appendChild(option);
  }

  if (setups.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'hint';
    empty.textContent = 'No saved setups yet.';
    savedSetupsListEl.appendChild(empty);
    return;
  }

  for (const [folderName, folderSetups] of groupSetupsByFolder(setups)) {
    if (folderSetups.length === 0) {
      continue;
    }

    const header = document.createElement('li');
    header.className = 'setup-folder-header';

    if (folderName) {
      const renameInput = document.createElement('input');
      renameInput.type = 'text';
      renameInput.className = 'folder-rename-input';
      renameInput.value = folderName;
      renameInput.addEventListener('change', () => {
        const newName = renameInput.value.trim();
        if (newName && newName !== folderName) {
          renameFolder(folderName, newName);
          renderSavedSetups();
          renderPlaylist();
        } else {
          renameInput.value = folderName;
        }
      });
      header.appendChild(renameInput);

      const exportFolderBtn = document.createElement('button');
      exportFolderBtn.type = 'button';
      exportFolderBtn.textContent = 'Export Folder';
      exportFolderBtn.addEventListener('click', () => downloadFolder(folderName, folderSetups));
      header.appendChild(exportFolderBtn);
    } else {
      const headerName = document.createElement('span');
      headerName.textContent = 'Ungrouped';
      header.appendChild(headerName);
    }

    savedSetupsListEl.appendChild(header);

    for (const setup of folderSetups) {
      const item = document.createElement('li');
      item.className = 'saved-setup-row';

      const name = document.createElement('span');
      name.className = 'saved-setup-name';
      name.textContent = setup.name;
      item.appendChild(name);

      const folderInput = document.createElement('input');
      folderInput.type = 'text';
      folderInput.className = 'folder-input';
      folderInput.placeholder = 'Folder';
      folderInput.setAttribute('list', 'folderNamesList');
      folderInput.value = setup.folder || '';
      folderInput.addEventListener('change', () => {
        setSetupFolder(setup.id, folderInput.value.trim());
        renderSavedSetups();
        renderPlaylist();
      });
      item.appendChild(folderInput);

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
}

importSetupBtn.addEventListener('click', () => importSetupInput.click());

importSetupInput.addEventListener('change', async () => {
  const file = importSetupInput.files[0];
  if (!file) {
    return;
  }
  try {
    const parsed = JSON.parse(await file.text());
    if (Array.isArray(parsed.setups)) {
      // A folder bundle exported via "Export Folder": re-add every setup
      // under its original name, tagged with the (possibly renamed-on-
      // import-conflict) folder name.
      const folderName = parsed.folder || file.name.replace(/\.json$/i, '');
      for (const entry of parsed.setups) {
        if (isValidState(entry.state)) {
          saveSetup(entry.name || 'Setup', entry.state, folderName);
        }
      }
    } else {
      // Accept either a full exported entry ({ name, state }) or a bare state object.
      const state = isValidState(parsed.state) ? parsed.state : parsed;
      if (!isValidState(state)) {
        throw new Error('invalid setup file');
      }
      const name = parsed.name || file.name.replace(/\.json$/i, '');
      saveSetup(name, state, parsed.folder);
    }
    renderSavedSetups();
    renderPlaylist();
  } catch {
    alert("Could not import that file — make sure it's a setup (or folder) exported from this app.");
  } finally {
    importSetupInput.value = '';
  }
});

renderSavedSetups();

// Entries in COLOR_LABELS that are a plain 0-1 opacity value rather than a
// hex color, so they need a number input instead of a color swatch.
const NUMERIC_COLOR_SETTINGS = ['bench-fill-opacity'];

// Closes every open color popover - called before opening a new one, and
// on any click outside a `.color-picker` (see the document listener
// below, attached once rather than per-render).
function closeAllColorPopovers() {
  colorForm.querySelectorAll('.color-popover:not([hidden])').forEach((popover) => {
    popover.hidden = true;
  });
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.color-picker')) {
    closeAllColorPopovers();
  }
});

function renderColorForm() {
  const colors = getColors();
  colorForm.innerHTML = '';
  for (const name of Object.keys(COLOR_LABELS)) {
    const isNumeric = NUMERIC_COLOR_SETTINGS.includes(name);
    const row = document.createElement('div');
    row.className = 'color-row';

    const header = document.createElement('div');
    header.className = 'color-row-header';

    if (isNumeric) {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 0;
      input.max = 1;
      input.step = 0.01;
      input.name = name;
      input.value = colors[name];
      header.appendChild(input);
    } else {
      header.appendChild(createColorPicker(name, colors[name]));
    }

    const labelText = document.createElement('span');
    labelText.textContent = COLOR_LABELS[name];
    header.appendChild(labelText);

    row.appendChild(header);
    colorForm.appendChild(row);
  }
}

// Builds a swatch button showing the current color, which toggles a
// popover (a preset quick-pick grid + a "Custom…" option that opens the
// browser's native color picker) - the classic "click the swatch, get a
// palette" pattern. The native `<input type="color">` stays in the form
// (so `colorForm.elements` submission still works) but is visually
// hidden; it's only shown to the OS picker when "Custom…" is clicked.
function createColorPicker(name, initialValue) {
  const wrapper = document.createElement('div');
  wrapper.className = 'color-picker';

  const current = document.createElement('button');
  current.type = 'button';
  current.className = 'color-swatch-current';
  current.style.backgroundColor = initialValue;
  current.setAttribute('aria-label', 'Choose color');

  const nativeInput = document.createElement('input');
  nativeInput.type = 'color';
  nativeInput.name = name;
  nativeInput.value = initialValue;
  nativeInput.className = 'color-native-input';
  nativeInput.tabIndex = -1;
  nativeInput.addEventListener('input', () => {
    current.style.backgroundColor = nativeInput.value;
  });

  const popover = document.createElement('div');
  popover.className = 'color-popover';
  popover.hidden = true;

  const swatchGrid = document.createElement('div');
  swatchGrid.className = 'color-swatches';
  for (const preset of PRESET_SWATCHES) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = preset;
    swatch.title = preset;
    swatch.setAttribute('aria-label', preset);
    swatch.addEventListener('click', () => {
      nativeInput.value = preset;
      current.style.backgroundColor = preset;
      popover.hidden = true;
    });
    swatchGrid.appendChild(swatch);
  }
  popover.appendChild(swatchGrid);

  const customBtn = document.createElement('button');
  customBtn.type = 'button';
  customBtn.className = 'color-custom-btn';
  customBtn.textContent = 'Custom…';
  customBtn.addEventListener('click', () => {
    popover.hidden = true;
    nativeInput.click();
  });
  popover.appendChild(customBtn);

  current.addEventListener('click', () => {
    const wasOpen = !popover.hidden;
    closeAllColorPopovers();
    popover.hidden = wasOpen;
  });

  wrapper.appendChild(current);
  wrapper.appendChild(popover);
  wrapper.appendChild(nativeInput);
  return wrapper;
}

colorForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const colors = {};
  for (const name of Object.keys(COLOR_LABELS)) {
    const raw = colorForm.elements.namedItem(name).value;
    colors[name] = NUMERIC_COLOR_SETTINGS.includes(name) ? Number(raw) : raw;
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

function renderFontSettingsFields() {
  const settings = getFontSettings();
  fontSettingsFieldsEl.innerHTML = '';

  const familyRow = document.createElement('label');
  familyRow.className = 'line-setting-row font-family-row';
  const familyLabel = document.createElement('span');
  familyLabel.textContent = FONT_SETTING_LABELS.fontFamily;
  familyRow.appendChild(familyLabel);
  const familySelect = document.createElement('select');
  familySelect.name = 'fontFamily';
  for (const option of FONT_FAMILY_OPTIONS) {
    const optionEl = document.createElement('option');
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    optionEl.style.fontFamily = option.value;
    familySelect.appendChild(optionEl);
  }
  familySelect.value = settings.fontFamily;
  // A previously-saved value that isn't in the curated list (e.g. from an
  // older version) still needs to show as selected, not silently reset.
  if (familySelect.value !== settings.fontFamily) {
    const customOption = document.createElement('option');
    customOption.value = settings.fontFamily;
    customOption.textContent = settings.fontFamily;
    familySelect.appendChild(customOption);
    familySelect.value = settings.fontFamily;
  }
  familyRow.appendChild(familySelect);
  fontSettingsFieldsEl.appendChild(familyRow);

  for (const name of ['playerLabelSize', 'benchLabelSize', 'rotationTrackerSize']) {
    const row = document.createElement('label');
    row.className = 'line-setting-row';

    const labelText = document.createElement('span');
    labelText.textContent = FONT_SETTING_LABELS[name];
    row.appendChild(labelText);

    const input = document.createElement('input');
    input.type = 'number';
    input.name = name;
    input.min = 8;
    input.max = 100;
    input.value = settings[name];
    row.appendChild(input);

    fontSettingsFieldsEl.appendChild(row);
  }
}

saveFontSettingsBtn.addEventListener('click', () => {
  const current = getFontSettings();
  const fontFamily = fontSettingsFieldsEl.querySelector('[name="fontFamily"]').value || DEFAULT_FONT_SETTINGS.fontFamily;
  const settings = { fontFamily };
  for (const name of ['playerLabelSize', 'benchLabelSize', 'rotationTrackerSize']) {
    const value = Number(fontSettingsFieldsEl.querySelector(`[name="${name}"]`).value);
    settings[name] = Number.isFinite(value) && value > 0 ? value : current[name];
  }
  saveFontSettings(settings);
  applyFontSettings();
  renderFontSettingsFields();
});

resetFontSettingsBtn.addEventListener('click', () => {
  resetFontSettings();
  applyFontSettings();
  renderFontSettingsFields();
});

renderFontSettingsFields();

function renderEffectSettingsForm() {
  const settings = getEffectSettings();
  effectSettingsForm.innerHTML = '';
  for (const name of Object.keys(EFFECT_SETTING_LABELS)) {
    const row = document.createElement('label');
    row.className = 'line-setting-row';

    const labelText = document.createElement('span');
    labelText.textContent = EFFECT_SETTING_LABELS[name];
    row.appendChild(labelText);

    const input = document.createElement('input');
    input.type = 'number';
    input.name = name;
    input.min = 0;
    input.value = settings[name];
    row.appendChild(input);

    effectSettingsForm.appendChild(row);
  }
}

effectSettingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const current = getEffectSettings();
  const settings = {};
  for (const name of Object.keys(EFFECT_SETTING_LABELS)) {
    const value = Number(effectSettingsForm.elements.namedItem(name).value);
    settings[name] = Number.isFinite(value) && value >= 0 ? value : current[name];
  }
  saveEffectSettings(settings);
  applyEffectSettings();
  renderEffectSettingsForm();
});

resetEffectSettingsBtn.addEventListener('click', () => {
  resetEffectSettings();
  applyEffectSettings();
  renderEffectSettingsForm();
});

renderEffectSettingsForm();

function renderPlaylist() {
  const setups = getSavedSetups();
  const byId = Object.fromEntries(setups.map((setup) => [setup.id, setup]));

  // Keep the "add" dropdown in sync with the current saved-setup list,
  // grouped into <optgroup>s so folders stay visually distinct there too.
  addToPlaylistSelect.innerHTML = '';
  for (const [folderName, folderSetups] of groupSetupsByFolder(setups)) {
    if (folderSetups.length === 0) {
      continue;
    }
    const group = document.createElement('optgroup');
    group.label = folderName || 'Ungrouped';
    for (const setup of folderSetups) {
      const option = document.createElement('option');
      option.value = setup.id;
      option.textContent = setup.name;
      group.appendChild(option);
    }
    addToPlaylistSelect.appendChild(group);
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

