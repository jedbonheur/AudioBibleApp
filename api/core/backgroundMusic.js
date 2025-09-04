// Central list of background music URLs provided by the product owner.
// Update this list to add/remove tracks.
const URLS = [
  'https://cdn.kinyabible.com/background_music/hymn.mp3',
  'https://cdn.kinyabible.com/background_music/dwell%20chant.mp3',
];

function toItem(u) {
  try {
    const filename = u.split('/').pop() || 'track';
    const decoded = decodeURIComponent(filename).replace(/\.[a-z0-9]+$/i, '');
    const id = decoded
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');
    const name = decoded;
    return { id, name, url: u };
  } catch (_) {
    return null;
  }
}

export function getBackgroundMusicItems() {
  return URLS.map(toItem).filter(Boolean);
}

export function getBackgroundMusicUrlById(id) {
  const items = getBackgroundMusicItems();
  const found = items.find((i) => i.id === id);
  return found ? found.url : null;
}

export default URLS;
