import TrackPlayer, { Event, State } from 'react-native-track-player';

export default async function playbackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    await TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    await TrackPlayer.pause();
  });

  // Ensure robust stop: stop if possible, otherwise pause + seek to start
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    try {
      await TrackPlayer.stop();
    } catch (e) {
      try {
        await TrackPlayer.pause();
      } catch (_) {}
      try {
        await TrackPlayer.seekTo(0);
      } catch (_) {}
    }
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch (e) {}
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch (e) {}
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
    try {
      await TrackPlayer.seekTo(position);
    } catch (e) {}
  });
}
