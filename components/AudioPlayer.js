import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import TrackPlayer, { Event, State, RepeatMode } from 'react-native-track-player';

function hashCode(str) {
  let h = 0;
  if (!str) return h;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0; // Convert to 32bit integer
  }
  return h;
}

// A small reusable audio player that loads a remote URL and plays/pauses
// controlled by the `play` prop. Reports playback status via onStatusChange.
// Accepts `seekToMs` (number) to seek to a position in milliseconds and
// calls `onSeekComplete` after the seek finishes.
function AudioPlayer(
  {
    sourceUrl,
    play = false,
    onStatusChange,
    seekToMs = null,
    onSeekComplete = null,
    volume = 1.0,
    rate = 1.0,
    loop = false,
    trackId,
    title = 'Audio',
    artist = 'Kinya Audio Bible',
    artwork,
  },
  ref,
) {
  const [loading, setLoading] = useState(false);
  const listenersRef = useRef([]);
  const currentTrackIdRef = useRef(null);

  // Expose imperative API: play, pause, seek
  useImperativeHandle(ref, () => ({
    play: async () => {
      try {
        await TrackPlayer.play();
      } catch (e) {
        onStatusChange && onStatusChange({ error: String(e) });
      }
    },
    pause: async () => {
      try {
        await TrackPlayer.pause();
      } catch (e) {
        onStatusChange && onStatusChange({ error: String(e) });
      }
    },
    seek: async (ms) => {
      try {
        const pos = Math.max(0, Math.round(ms || 0)) / 1000;
        await TrackPlayer.seekTo(pos);
      } catch (e) {
        onStatusChange && onStatusChange({ error: String(e) });
      }
    },
  }));

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!sourceUrl) return;
      setLoading(true);

      try {
        // cleanup listeners
        try {
          listenersRef.current.forEach((off) => {
            try {
              if (typeof off === 'function') off();
            } catch {}
          });
          listenersRef.current = [];
        } catch {}
        // Reset the queue and add the requested source as a single track
        try {
          const id = trackId || `track-${Math.abs(hashCode(String(sourceUrl)))}`;
          currentTrackIdRef.current = id;
          await TrackPlayer.reset();
          await TrackPlayer.add({
            id,
            url: sourceUrl,
            title: title || 'Audio',
            artist: artist || 'Kinya Audio Bible',
            artwork: artwork || 'https://cdn.kinyabible.com/icon.png',
          });
        } catch (e) {
          onStatusChange && onStatusChange({ error: String(e) });
        }

        // Start if requested
        if (play) {
          try {
            await TrackPlayer.play();
          } catch (e) {
            onStatusChange && onStatusChange({ error: String(e) });
          }
        }
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
      try {
        listenersRef.current.forEach((off) => {
          try {
            if (typeof off === 'function') off();
          } catch {}
        });
        listenersRef.current = [];
      } catch {}
    };
  }, [sourceUrl]);

  // respond to play prop changes
  useEffect(() => {
    (async () => {
      try {
        if (play) await TrackPlayer.play();
        else await TrackPlayer.pause();
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
        // clamp to non-negative
        const pos = Math.max(0, Math.round(seekToMs));
        await TrackPlayer.seekTo(pos / 1000);
        if (play) {
          try {
            await TrackPlayer.play();
          } catch (_) {}
        }
        if (onSeekComplete) onSeekComplete();
      } catch (e) {
        if (onStatusChange) onStatusChange({ error: String(e) });
      }
    })();
  }, [seekToMs]);

  // respond to volume changes
  useEffect(() => {
    (async () => {
      try {
        const v = Math.max(0, Math.min(1, Number(volume) || 0));
        await TrackPlayer.setVolume(v);
      } catch (_) {}
    })();
  }, [volume]);

  // respond to rate changes
  useEffect(() => {
    (async () => {
      try {
        const r = Math.max(0.75, Math.min(2.0, Number(rate) || 1));
        try {
          await TrackPlayer.setRate(r);
        } catch (_) {}
      } catch (_) {}
    })();
  }, [rate]);

  // respond to loop changes
  useEffect(() => {
    (async () => {
      try {
        await TrackPlayer.setRepeatMode(loop ? RepeatMode.Track : RepeatMode.Off);
      } catch (_) {}
    })();
  }, [loop]);

  // status listeners
  useEffect(() => {
    const subs = [];
    try {
      subs.push(
        TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
          onStatusChange &&
            onStatusChange({ positionMillis: Math.round((e.position || 0) * 1000) });
        }),
      );
    } catch (_) {}
    try {
      subs.push(
        TrackPlayer.addEventListener(Event.PlaybackState, async (e) => {
          const isPlaying = e.state === State.Playing;
          onStatusChange && onStatusChange({ isPlaying });
        }),
      );
    } catch (_) {}
    try {
      subs.push(
        TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
          onStatusChange && onStatusChange({ didJustFinish: true, isPlaying: false });
        }),
      );
    } catch (_) {}
    listenersRef.current = subs;
    return () => {
      subs.forEach((s) => {
        try {
          s.remove();
        } catch {}
      });
    };
  }, [onStatusChange]);

  return null; // invisible controller
}

export default forwardRef(AudioPlayer);
