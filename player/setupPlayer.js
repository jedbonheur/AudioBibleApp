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
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
      progressUpdateEventInterval: 2,
      // iOS: ensure playback category and explicitly avoid mixing/ducking
      iosCategory: 'playback',
      iosCategoryOptions: ['allowBluetooth', 'allowAirPlay', 'defaultToSpeaker', 'mixWithOthers'],
      alwaysPauseOnInterruption: true,
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
    });
  } catch (e) {
    // non-fatal
  }
}
