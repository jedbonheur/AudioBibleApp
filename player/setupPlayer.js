import TrackPlayer, { Capability, AppKilledPlaybackBehavior } from 'react-native-track-player';

export default async function setupPlayer() {
  try {
    await TrackPlayer.setupPlayer({});
  } catch (e) {
    // ignore if already setup
  }

  try {
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SeekTo],
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
  } catch (e) {
    // non-fatal
  }
}
