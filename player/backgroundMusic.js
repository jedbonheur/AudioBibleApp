// Lightweight background music controller using react-native-sound
// Plays a looping, low-volume track, mixed under Track Player narration.
import Sound from 'react-native-sound';

const LOG = false; // toggle for debug logs

let currentSound = null;
let currentUrl = null;
let currentVolume = 0.3;

// Best-effort category setup at module load (iOS). Safe no-op on Android.
try {
  Sound.setCategory('Playback', true); // true => MixWithOthers
  if (LOG) console.log('[bg] initial category Playback+mix');
} catch (_) {}

async function ensureCategory() {
  try {
    // 'Playback' plays in silent mode; true enables MixWithOthers
    Sound.setCategory('Playback', true);
    if (LOG) console.log('[bg] category Playback+mix');
  } catch (e) {
    if (LOG) console.warn('[bg] setCategory Playback failed, fallback Ambient', e);
    try {
      Sound.setCategory('Ambient', true);
    } catch (_) {}
  }
}

export async function playBackgroundMusic(url, volume = 0.3) {
  try {
    await ensureCategory();
    let vol = Math.max(0, Math.min(1, Number(volume)));
    if (!Number.isFinite(vol)) vol = 0.3;
    if (vol > 0 && vol < 0.01) vol = 0.05; // avoid near-silent
    if (currentSound && currentUrl === url) {
      currentVolume = vol;
      try {
        currentSound.setVolume(vol);
      } catch {}
      try {
        currentSound.play(() => {});
      } catch (e) {
        if (LOG) console.warn('[bg] resume err', e);
      }
      return;
    }
    // Stop previous
    await stopBackgroundMusic();
    currentUrl = url;
    currentVolume = vol;
    if (!url) return;
    await new Promise((resolve) => {
      const s = new Sound(url, undefined, (err) => {
        if (err) {
          if (LOG) console.warn('[bg] load error', err);
          try {
            s.release();
          } catch {}
          currentSound = null;
          currentUrl = null;
          return resolve();
        }
        currentSound = s;
        try {
          s.setNumberOfLoops(-1);
        } catch {}
        try {
          s.setVolume(vol);
        } catch {}
        try {
          s.play((success) => {
            if (!success && LOG) console.warn('[bg] play failed');
            // re-apply volume post start
            try {
              s.setVolume(currentVolume);
            } catch {}
          });
        } catch (e) {
          if (LOG) console.warn('[bg] play err', e);
        }
        resolve();
      });
    });
  } catch (_) {}
}

export async function stopBackgroundMusic() {
  try {
    if (currentSound) {
      try {
        currentSound.stop(() => {});
      } catch {}
      try {
        currentSound.release();
      } catch {}
    }
  } catch (_) {}
  currentSound = null;
  currentUrl = null;
}

export async function setBackgroundMusicVolume(volume) {
  try {
    let vol = Math.max(0, Math.min(1, Number(volume)));
    if (!Number.isFinite(vol)) vol = 0;
    if (vol > 0 && vol < 0.01) vol = 0.05; // avoid near-silent
    currentVolume = vol;
    if (currentSound) {
      try {
        currentSound.setVolume(vol);
      } catch {}
    }
  } catch (_) {}
}

// Keeps BG music state aligned with Bible playback
export async function syncBackgroundMusicWithBible(isBiblePlaying, url, volume = currentVolume) {
  try {
    if (isBiblePlaying) await playBackgroundMusic(url, volume);
    else await stopBackgroundMusic();
  } catch (_) {}
}

export default {
  playBackgroundMusic,
  stopBackgroundMusic,
  setBackgroundMusicVolume,
  syncBackgroundMusicWithBible,
};
