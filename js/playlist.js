// Ordered list of saved-setup references used to animate through a
// sequence of court positions (see main.js's playlist playback). Each
// entry has its own id (for reordering/removal) plus the id of the saved
// setup it points to (see courtSetups.js) - deleting the underlying saved
// setup just drops it from playback rather than corrupting the list.

const PLAYLIST_KEY = 'volleyballViz.playlist';
const DELAY_KEY = 'volleyballViz.playlistDelay';
const DEFAULT_DELAY_MS = 1500;

export function getPlaylist() {
  try {
    const raw = localStorage.getItem(PLAYLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(items) {
  localStorage.setItem(PLAYLIST_KEY, JSON.stringify(items));
}

export function addPlaylistItem(setupId) {
  const items = getPlaylist();
  items.push({ id: crypto.randomUUID(), setupId });
  persist(items);
}

export function removePlaylistItem(id) {
  persist(getPlaylist().filter((item) => item.id !== id));
}

// Swaps a playlist item with its immediate neighbor (direction: -1 up, 1 down).
export function movePlaylistItem(id, direction) {
  const items = getPlaylist();
  const index = items.findIndex((item) => item.id === id);
  const targetIndex = index + direction;
  if (index === -1 || targetIndex < 0 || targetIndex >= items.length) {
    return;
  }
  [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
  persist(items);
}

export function clearPlaylist() {
  localStorage.removeItem(PLAYLIST_KEY);
}

export function getPlaylistDelay() {
  const raw = Number(localStorage.getItem(DELAY_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DELAY_MS;
}

export function setPlaylistDelay(ms) {
  localStorage.setItem(DELAY_KEY, String(ms));
}
