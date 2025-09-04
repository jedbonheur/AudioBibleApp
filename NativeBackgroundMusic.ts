import { NativeModules, Platform } from 'react-native';

const { BackgroundMusicManager } = NativeModules as any;

function isAvailable() {
  return Platform.OS === 'ios' && !!BackgroundMusicManager;
}

export function enableBackgroundMusicDebugLogs(enabled: boolean) {
  if (isAvailable()) BackgroundMusicManager?.setDebugLogging?.(enabled);
}

export function playBackgroundMusic(url: string, volume: number = 0.3) {
  if (!isAvailable()) return;
  const vol = Math.max(0, Math.min(1, volume ?? 0.3));
  if (!url) return;
  BackgroundMusicManager?.play?.(url, vol);
}

export function stopBackgroundMusic() {
  if (!isAvailable()) return;
  BackgroundMusicManager?.stop?.();
}

export function setBackgroundMusicVolume(volume: number) {
  if (!isAvailable()) return;
  const vol = Math.max(0, Math.min(1, volume ?? 0));
  BackgroundMusicManager?.setVolume?.(vol);
}

export function syncBackgroundMusicWithBible(
  isBiblePlaying: boolean,
  url?: string,
  volume?: number,
) {
  if (!isAvailable()) return;
  const vol = Math.max(0, Math.min(1, volume ?? 0.3));
  const safeUrl = url || '';
  BackgroundMusicManager?.syncWithBible?.(!!isBiblePlaying, safeUrl, vol);
}

export function pauseBackgroundMusic() {
  if (!isAvailable()) return;
  BackgroundMusicManager?.pause?.();
}

export default {
  enableBackgroundMusicDebugLogs,
  playBackgroundMusic,
  pauseBackgroundMusic,
  stopBackgroundMusic,
  setBackgroundMusicVolume,
  syncBackgroundMusicWithBible,
};
