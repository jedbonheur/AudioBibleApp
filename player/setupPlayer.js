import TrackPlayer, { Capability, AppKilledPlaybackBehavior } from 'react-native-track-player';
import { Platform, AppState } from 'react-native';

// Keep a single AppState subscription and metadata cache across setup calls
let appStateSub = null;
let lastAppState = 'active';
// Cache original metadata per track id so we can restore on foreground
const savedMetadata = new Map();
// Canonical capabilities for iOS when not in the app switcher
const IOS_CAPABILITIES = [
  Capability.Play,
  Capability.Pause,
  Capability.SkipToNext,
  Capability.SkipToPrevious,
  Capability.SeekTo,
  Capability.Stop,
];

async function handleAppStateChange(nextState) {
  if (Platform.OS !== 'ios') return; // iOS-specific behavior
  try {
    if (nextState === 'inactive') {
      // In app switcher: remove commands and clear metadata to hide overlay
      try {
        await TrackPlayer.updateOptions({
          // Temporarily relax audio session so iOS doesn't present Now Playing overlay
          iosCategory: 'ambient',
          iosCategoryOptions: ['mixWithOthers'],
          capabilities: [],
          compactCapabilities: [],
        });
      } catch (_) {}
      const currentIndex = await TrackPlayer.getCurrentTrack();
      if (currentIndex == null) return;
      try {
        // Save original metadata once per track index
        if (!savedMetadata.has(currentIndex)) {
          const track = await TrackPlayer.getTrack(currentIndex);
          if (track) {
            savedMetadata.set(currentIndex, {
              title: track.title || '',
              artist: track.artist || '',
              album: track.album || undefined,
              artwork: track.artwork || undefined,
              duration: track.duration || undefined,
              description: track.description || undefined,
            });
          }
        }
      } catch (_) {}
      // Clear minimal fields to suppress app switcher overlay
      try {
        await TrackPlayer.updateMetadataForTrack(currentIndex, {
          title: '',
          artist: '',
          album: '',
          artwork: undefined,
          duration: 0,
          description: '',
        });
      } catch (_) {}
    } else if (nextState === 'background') {
      // While in background (not the switcher), restore commands and metadata for lockscreen/CC
      try {
        await TrackPlayer.updateOptions({
          iosCategory: 'playback',
          iosCategoryOptions: [
            'allowBluetooth',
            'allowBluetoothA2DP',
            'allowAirPlay',
            'defaultToSpeaker',
            'mixWithOthers',
            'duckOthers',
          ],
          capabilities: IOS_CAPABILITIES,
          compactCapabilities: [],
        });
      } catch (_) {}
      const currentIndex = await TrackPlayer.getCurrentTrack();
      if (currentIndex == null) return;
      try {
        const meta = savedMetadata.get(currentIndex);
        if (meta) {
          await TrackPlayer.updateMetadataForTrack(currentIndex, meta);
        }
      } catch (_) {}
    } else if (lastAppState !== 'active' && nextState === 'active') {
      // Foreground: ensure commands and metadata are restored
      try {
        await TrackPlayer.updateOptions({
          iosCategory: 'playback',
          iosCategoryOptions: [
            'allowBluetooth',
            'allowBluetoothA2DP',
            'allowAirPlay',
            'defaultToSpeaker',
            'mixWithOthers',
            'duckOthers',
          ],
          capabilities: IOS_CAPABILITIES,
          compactCapabilities: [],
        });
      } catch (_) {}
      const currentIndex = await TrackPlayer.getCurrentTrack();
      if (currentIndex == null) return;
      const meta = savedMetadata.get(currentIndex);
      if (meta) {
        try {
          await TrackPlayer.updateMetadataForTrack(currentIndex, meta);
        } catch (_) {}
      }
    }
  } finally {
    lastAppState = nextState;
  }
}

export default async function setupPlayer() {
  try {
    await TrackPlayer.setupPlayer({});
  } catch (e) {
    // ignore if already setup
  }

  try {
    await TrackPlayer.updateOptions({
      // Keep playback alive in background
      stopWithApp: false,
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      // iOS: hide tiny Play/Pause overlay in app switcher by disabling compact controls
      // Android: keep compact notification controls
      compactCapabilities:
        Platform.OS === 'ios' ? [] : [Capability.Play, Capability.Pause, Capability.SeekTo],
      // Faster progress updates for snappy verse highlighting (seconds)
      progressUpdateEventInterval: 0.25,
      // iOS: playback category and options to mix and keep speaker/BT stable
      iosCategory: 'playback',
      iosCategoryOptions: [
        'allowBluetooth',
        'allowBluetoothA2DP',
        'allowAirPlay',
        'defaultToSpeaker',
        'mixWithOthers',
        'duckOthers',
      ],
      alwaysPauseOnInterruption: true,
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
    });
    // Register AppState listener once to manage iOS app switcher overlay behavior
    if (Platform.OS === 'ios' && !appStateSub) {
      appStateSub = AppState.addEventListener('change', handleAppStateChange);
    }
  } catch (e) {
    // non-fatal
  }
}
