import { KEYBOARD_SHORTCUTS, MOUSE_CONTROLS } from './shortcutsData.js';

function inputText(entry) {
  return 'key' in entry ? entry.key : entry.input;
}

// A checked/blank cell for the 2D or 3D column, rather than a separate
// table per mode - avoids listing every "both" entry (the majority) twice.
function checkmarkCell(applies) {
  const cell = document.createElement('td');
  cell.className = 'ref-check-col';
  cell.textContent = applies ? '\u2713' : '';
  return cell;
}

function renderTable() {
  const tbodyEl = document.querySelector('#referenceTable tbody');
  tbodyEl.innerHTML = '';
  for (const entry of [...KEYBOARD_SHORTCUTS, ...MOUSE_CONTROLS]) {
    const row = document.createElement('tr');
    row.append(
      checkmarkCell(entry.appliesTo === '2d' || entry.appliesTo === 'both'),
      checkmarkCell(entry.appliesTo === '3d' || entry.appliesTo === 'both'),
    );
    const inputCell = document.createElement('td');
    inputCell.className = 'ref-input-col';
    inputCell.textContent = inputText(entry);
    row.appendChild(inputCell);
    const labelCell = document.createElement('td');
    labelCell.textContent = entry.label;
    row.appendChild(labelCell);
    tbodyEl.appendChild(row);
  }
}

renderTable();
