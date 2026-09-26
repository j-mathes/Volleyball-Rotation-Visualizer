import { KEYBOARD_SHORTCUTS, MOUSE_CONTROLS } from './shortcutsData.js';

function inputText(entry) {
  return 'key' in entry ? entry.key : entry.input;
}

function renderTable(tbodyEl, mode) {
  tbodyEl.innerHTML = '';
  for (const entry of [...KEYBOARD_SHORTCUTS, ...MOUSE_CONTROLS]) {
    if (entry.appliesTo !== 'both' && entry.appliesTo !== mode) {
      continue;
    }
    const row = document.createElement('tr');
    const inputCell = document.createElement('td');
    inputCell.textContent = inputText(entry);
    const labelCell = document.createElement('td');
    labelCell.textContent = entry.label;
    row.append(inputCell, labelCell);
    tbodyEl.appendChild(row);
  }
}

renderTable(document.querySelector('#table2D tbody'), '2d');
renderTable(document.querySelector('#table3D tbody'), '3d');
