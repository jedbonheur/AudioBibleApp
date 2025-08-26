import React, { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

// A small reusable audio player that loads a remote URL and plays/pauses
// controlled by the `play` prop. Reports playback status via onStatusChange.
export default function AudioPlayer({ sourceUrl, play = false, onStatusChange }) {
  const soundRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!sourceUrl) return;
      setLoading(true);

      try {
        // Ensure audio mode is configured so playback is audible on iOS/Android
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
            staysActiveInBackground: false,
          });
        } catch (modeErr) {
          // ignore mode errors but forward if needed
          if (onStatusChange) onStatusChange({ error: String(modeErr) });
        }
        // Unload previous
        if (soundRef.current) {
          try {
            await soundRef.current.unloadAsync();
          } catch (e) {
            // ignore unload errors
          }
          soundRef.current.setOnPlaybackStatusUpdate(null);
          soundRef.current = null;
        }

        // quick HEAD check to detect 404/CORS early
        try {
          const head = await fetch(sourceUrl, { method: 'HEAD' });
          if (!head.ok) {
            throw new Error(`Audio not available (status ${head.status})`);
          }
        } catch (headErr) {
          // continue to try creating the sound — but report the head error
          if (onStatusChange) onStatusChange({ error: String(headErr) });
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: sourceUrl },
          { shouldPlay: play, staysActiveInBackground: false },
        );

        // attach playback status update
        if (sound) {
          sound.setOnPlaybackStatusUpdate((status) => {
            if (onStatusChange) onStatusChange(status);
            // small debug log
            try {
              // eslint-disable-next-line no-console
              console.warn(
                '[AudioPlayer] status',
                status?.isPlaying,
                status?.didJustFinish,
                status?.error,
              );
            } catch (e) {}
          });
          // if play was requested while we were loading, start immediately
          if (play) {
            try {
              await sound.playAsync();
            } catch (e) {
              if (onStatusChange) onStatusChange({ error: String(e) });
            }
          }
        }

        soundRef.current = sound;
      } catch (e) {
        // forward an error-like status if available
        if (onStatusChange) onStatusChange({ error: e.message });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
      (async () => {
        if (soundRef.current) {
          try {
            soundRef.current.setOnPlaybackStatusUpdate(null);
            await soundRef.current.unloadAsync();
          } catch (e) {
            // ignore
          }
          soundRef.current = null;
        }
      })();
    };
  }, [sourceUrl]);

  // respond to play prop changes
  useEffect(() => {
    (async () => {
      try {
        if (!soundRef.current) return;
        const status = await soundRef.current.getStatusAsync();
        if (play && !status.isPlaying) await soundRef.current.playAsync();
        if (!play && status.isPlaying) await soundRef.current.pauseAsync();
      } catch (e) {
        if (onStatusChange) onStatusChange({ error: e.message });
      }
    })();
  }, [play]);

  return null; // invisible player
}
