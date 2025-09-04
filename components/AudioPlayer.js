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
    // Optional known duration in milliseconds; improves lock-screen time-left
    durationMs,
  },
  ref,
) {
  const [loading, setLoading] = useState(false);
  const listenersRef = useRef([]);
  const currentTrackIdRef = useRef(null);
  const didSetDurationRef = useRef(false);
  const prewarmedRef = useRef(false);
  const suppressEventsRef = useRef(false);
  // Serialize player operations to avoid race conditions across fast toggles
  const opQueueRef = useRef(Promise.resolve());
  const desiredPlayRef = useRef(Boolean(play));

  const enqueue = (fn) => {
    const run = async () => {
      try {
        return await fn();
      } catch (e) {
        throw e;
      }
    };
    opQueueRef.current = opQueueRef.current.then(run).catch(() => {});
    return opQueueRef.current;
  };

  const getSafeState = async () => {
    try {
      const s = await TrackPlayer.getState();
      return s;
    } catch (_) {
      return null;
    }
  };

  const safePlay = async () => {
    desiredPlayRef.current = true;
    return enqueue(async () => {
      const state = await getSafeState();
      if (state === State.Playing) return; // idempotent
      try {
        await TrackPlayer.play();
      } catch (e1) {
        // tiny backoff + retry once
        await new Promise((r) => setTimeout(r, 120));
        await TrackPlayer.play();
      }
    });
  };

  const safePause = async () => {
    desiredPlayRef.current = false;
    return enqueue(async () => {
      const state = await getSafeState();
      if (state === State.Paused || state === State.Stopped || state === State.None) return;
      try {
        await TrackPlayer.pause();
      } catch (e) {
        // ignore
      }
    });
  };

  // Soft stop that keeps the queue: pause + seek to start
  const safeStop = async () => {
    desiredPlayRef.current = false;
    return enqueue(async () => {
      try {
        const state = await getSafeState();
        if (state !== State.Paused && state !== State.Stopped && state !== State.None) {
          try {
            await TrackPlayer.pause();
          } catch (_) {}
        }
        try {
          await TrackPlayer.seekTo(0);
        } catch (_) {}
      } catch (_) {}
    });
  };

  // Expose imperative API: play, pause, seek
  useImperativeHandle(ref, () => ({
    play: async () => {
      try {
        await safePlay();
      } catch (e) {
        onStatusChange && onStatusChange({ error: String(e) });
      }
    },
    pause: async () => {
      try {
        await safePause();
      } catch (e) {
        onStatusChange && onStatusChange({ error: String(e) });
      }
    },
    stop: async () => {
      try {
        await safeStop();
      } catch (e) {
        onStatusChange && onStatusChange({ error: String(e) });
      }
    },
    seek: async (ms) => {
      try {
        const pos = Math.max(0, Math.round(ms || 0)) / 1000;
        await enqueue(async () => {
          await TrackPlayer.seekTo(pos);
        });
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
        // Reset the queue and add the requested source as a single track (with small retries)
        try {
          const id = trackId || `track-${Math.abs(hashCode(String(sourceUrl)))}`;
          currentTrackIdRef.current = id;
          didSetDurationRef.current = false;
          const delay = (ms) => new Promise((r) => setTimeout(r, ms));
          const withRetry = async (fn, attempts = 3, waitMs = 120) => {
            let lastErr;
            for (let i = 0; i < attempts; i++) {
              try {
                return await fn();
              } catch (e) {
                lastErr = e;
                if (i < attempts - 1) await delay(waitMs);
              }
            }
            throw lastErr;
          };

          await enqueue(() => withRetry(() => TrackPlayer.reset()));
          const track = {
            id,
            url: sourceUrl,
            title: title || 'Audio',
            artist: artist || 'Kinya Audio Bible',
            artwork: artwork || 'https://cdn.kinyabible.com/icon.png',
            // Provide duration if known (in seconds)
            ...(typeof durationMs === 'number' && durationMs > 0
              ? { duration: Math.round(durationMs) / 1000 }
              : {}),
          };
          await enqueue(() => withRetry(() => TrackPlayer.add(track)));
          // Proactively push metadata to Now Playing so lock screen updates immediately
          try {
            const meta = {
              title: title || 'Audio',
              artist: artist || 'Kinya Audio Bible',
              artwork: artwork || 'https://cdn.kinyabible.com/icon.png',
              ...(typeof durationMs === 'number' && durationMs > 0
                ? { duration: Math.round(durationMs) / 1000 }
                : {}),
            };
            await enqueue(() => TrackPlayer.updateMetadataForTrack(id, meta));
          } catch (_) {}
          // If duration not provided, probe player for it and set metadata once known
          if (!(typeof durationMs === 'number' && durationMs > 0)) {
            try {
              const setDurationIfAvailable = async () => {
                if (didSetDurationRef.current) return;
                const d = await TrackPlayer.getDuration();
                if (d && isFinite(d) && d > 0 && currentTrackIdRef.current) {
                  await enqueue(() =>
                    TrackPlayer.updateMetadataForTrack(currentTrackIdRef.current, {
                      duration: d,
                    }),
                  );
                  didSetDurationRef.current = true;
                }
              };
              // Try immediately, then retry shortly; some streams report a bit later
              await setDurationIfAvailable();
              if (!didSetDurationRef.current) {
                setTimeout(setDurationIfAvailable, 400);
              }
            } catch (_) {}
          }

          // Silent pre-warm: if not starting playback yet, briefly play at volume 0 to
          // force Now Playing to initialize on first lock, then pause and restore volume.
          if (!play && !prewarmedRef.current) {
            try {
              prewarmedRef.current = true;
              const desiredVol = Math.max(0, Math.min(1, Number(volume) || 0));
              suppressEventsRef.current = true;
              await TrackPlayer.setVolume(0);
              await TrackPlayer.play();
              await new Promise((r) => setTimeout(r, 180));
              await TrackPlayer.pause();
              await TrackPlayer.setVolume(desiredVol);
            } catch (_) {
              // ignore prewarm errors
            } finally {
              suppressEventsRef.current = false;
            }
          }
        } catch (e) {
          onStatusChange && onStatusChange({ error: String(e) });
        }

        // Start if requested
        if (play) {
          try {
            // pre-configure desired volume/rate before starting
            try {
              const v = Math.max(0, Math.min(1, Number(volume) || 0));
              await TrackPlayer.setVolume(v);
            } catch (_) {}
            try {
              const r = Math.max(0.75, Math.min(2.0, Number(rate) || 1));
              await TrackPlayer.setRate(r);
            } catch (_) {}
            // small delay to allow the queue to settle
            await new Promise((r) => setTimeout(r, 80));
            const delay = (ms) => new Promise((r) => setTimeout(r, ms));
            // attempt play with a quick retry
            try {
              await safePlay();
            } catch (e1) {
              await delay(120);
              await safePlay();
            }
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
        if (play) {
          await safePlay();
        } else {
          await safePause();
        }
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
        await enqueue(async () => {
          await TrackPlayer.seekTo(pos / 1000);
        });
        if (play) {
          try {
            await safePlay();
          } catch (_) {}
          // quick retry if initial play failed due to race
          try {
            await new Promise((r) => setTimeout(r, 100));
            await safePlay();
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
        await enqueue(() => TrackPlayer.setVolume(v));
      } catch (_) {}
    })();
  }, [volume]);

  // respond to rate changes
  useEffect(() => {
    (async () => {
      try {
        const r = Math.max(0.75, Math.min(2.0, Number(rate) || 1));
        try {
          await enqueue(() => TrackPlayer.setRate(r));
        } catch (_) {}
      } catch (_) {}
    })();
  }, [rate]);

  // respond to loop changes
  useEffect(() => {
    (async () => {
      try {
        await enqueue(() => TrackPlayer.setRepeatMode(loop ? RepeatMode.Track : RepeatMode.Off));
      } catch (_) {}
    })();
  }, [loop]);

  // status listeners
  useEffect(() => {
    const subs = [];
    try {
      subs.push(
        TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
          if (!suppressEventsRef.current) {
            onStatusChange &&
              onStatusChange({ positionMillis: Math.round((e.position || 0) * 1000) });
          }
        }),
      );
    } catch (_) {}
    try {
      subs.push(
        TrackPlayer.addEventListener(Event.PlaybackState, async (e) => {
          const isPlaying = e.state === State.Playing;
          if (!suppressEventsRef.current) {
            onStatusChange && onStatusChange({ isPlaying });
          }
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
