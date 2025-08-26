import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Audio } from 'expo-av';

// A small reusable audio player that loads a remote URL and plays/pauses
// controlled by the `play` prop. Reports playback status via onStatusChange.
// Accepts `seekToMs` (number) to seek to a position in milliseconds and
// calls `onSeekComplete` after the seek finishes.
function AudioPlayer(
  { sourceUrl, play = false, onStatusChange, seekToMs = null, onSeekComplete = null },
  ref,
) {
  const soundRef = useRef(null);
  const [loading, setLoading] = useState(false);

  // Expose imperative API: play, pause, seek
  useImperativeHandle(ref, () => ({
    play: async () => {
      try {
        if (!soundRef.current) return;
        await soundRef.current.playAsync();
      } catch (e) {
        if (onStatusChange) onStatusChange({ error: String(e) });
      }
    },
    pause: async () => {
      try {
        if (!soundRef.current) return;
        await soundRef.current.pauseAsync();
      } catch (e) {
        if (onStatusChange) onStatusChange({ error: String(e) });
      }
    },
    seek: async (ms) => {
      try {
        if (!soundRef.current) return;
        const pos = Math.max(0, Math.round(ms || 0));
        await soundRef.current.setPositionAsync(pos);
      } catch (e) {
        if (onStatusChange) onStatusChange({ error: String(e) });
      }
    },
  }));

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
            // debug logging removed
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
        // Directly request play or pause. Avoid relying on getStatusAsync() to
        // decide because status can be stale during quick user interactions.
        if (play) await soundRef.current.playAsync();
        else await soundRef.current.pauseAsync();
      } catch (e) {
        if (onStatusChange) onStatusChange({ error: e.message });
      }
    })();
  }, [play]);

  // respond to external seek requests (seekToMs)
  useEffect(() => {
    (async () => {
      try {
        if (seekToMs === null || seekToMs === undefined) return;
        if (!soundRef.current) return;
        // clamp to non-negative
        const pos = Math.max(0, Math.round(seekToMs));
        await soundRef.current.setPositionAsync(pos);
        // if playback was requested, ensure we are playing
        if (play) {
          try {
            await soundRef.current.playAsync();
          } catch (e) {
            // ignore play errors here, status handler will report
          }
        }
        if (onSeekComplete) onSeekComplete();
      } catch (e) {
        if (onStatusChange) onStatusChange({ error: String(e) });
      }
    })();
  }, [seekToMs]);

  return null; // invisible player
}

export default forwardRef(AudioPlayer);
