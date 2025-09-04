Background audio with react-native-track-player

1. iOS

- app.json contains UIBackgroundModes: ["audio"].
- We set iosCategory: 'playback' via expo-av.
- Service is registered via TrackPlayer.registerPlaybackService(() => require('./player/service').default).

2. Android

- app.json includes FOREGROUND_SERVICE_MEDIA_PLAYBACK, WAKE_LOCK permissions.
- Service auto-registers through Track Player.

3. App bootstrap

- App waits for player setup before rendering.
- A sample track is added; use lock-screen controls to test.
