import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Platform } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Audio as AV } from 'expo-av';

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
    preservePitch = false,
  },
  ref,
) {
  const player = useAudioPlayer?.() || null;
  const [loading, setLoading] = useState(false);
  const listenersRef = useRef([]);
  const avSoundRef = useRef(null);
  const usingAVRef = useRef(false);
  const progressTimerRef = useRef(null);

  // Expose imperative API: play, pause, seek
  useImperativeHandle(ref, () => ({
    play: async () => {
      try {
        if (usingAVRef.current) {
          if (!avSoundRef.current) return;
          await avSoundRef.current.playAsync();
        } else {
          if (!player) return;
          if (typeof player.playAsync === 'function') await player.playAsync();
          else if (typeof player.play === 'function') await player.play();
        }
      } catch (e) {
        onStatusChange && onStatusChange({ error: String(e) });
      }
    },
    pause: async () => {
      try {
        if (usingAVRef.current) {
          if (!avSoundRef.current) return;
          await avSoundRef.current.pauseAsync();
        } else {
          if (!player) return;
          if (typeof player.pauseAsync === 'function') await player.pauseAsync();
          else if (typeof player.pause === 'function') await player.pause();
        }
      } catch (e) {
        onStatusChange && onStatusChange({ error: String(e) });
      }
    },
    seek: async (ms) => {
      try {
        const pos = Math.max(0, Math.round(ms || 0));
        if (usingAVRef.current) {
          if (!avSoundRef.current) return;
          await avSoundRef.current.setPositionAsync(pos);
        } else {
          if (!player) return;
          if (typeof player.setPositionAsync === 'function') await player.setPositionAsync(pos);
          else if (typeof player.seekTo === 'function') await player.seekTo(pos);
        }
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
        // Ensure platform audio session is configured for silent-mode + background
        try {
          await AV.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            // Do not mix with other audio
            interruptionModeIOS: AV.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
            interruptionModeAndroid: AV.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
            shouldDuckAndroid: false,
            playThroughEarpieceAndroid: false,
          });
          try {
            await AV.setIsEnabledAsync(true);
          } catch (_) {}
        } catch (_) {}

        // Unload previous expo-audio
        try {
          if (player && typeof player.unloadAsync === 'function') await player.unloadAsync();
          else if (player && typeof player.unload === 'function') await player.unload();
        } catch (_) {}
        // Unload previous expo-av
        try {
          if (avSoundRef.current) {
            avSoundRef.current.setOnPlaybackStatusUpdate(null);
            await avSoundRef.current.unloadAsync();
            avSoundRef.current = null;
          }
        } catch (_) {}
        // cleanup listeners
        try {
          listenersRef.current.forEach((off) => {
            try {
              if (typeof off === 'function') off();
            } catch {}
          });
          listenersRef.current = [];
        } catch {}
        // stop any progress polling
        try {
          if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
          }
        } catch (_) {}

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

        // Prefer expo-av on iOS to ensure reliable silent-mode behavior
        const preferAV = Platform.OS === 'ios' || !!preservePitch;
        // Try expo-audio first unless iOS prefers AV
        usingAVRef.current = false;
        let expoAudioLoaded = false;
        if (!preferAV) {
          try {
            if (
              player &&
              (typeof player.loadAsync === 'function' || typeof player.load === 'function')
            ) {
              if (typeof player.loadAsync === 'function') await player.loadAsync(sourceUrl);
              else await player.load(sourceUrl);
              expoAudioLoaded = true;
            }
          } catch (e) {
            expoAudioLoaded = false;
            onStatusChange && onStatusChange({ error: String(e) });
          }
        }

        // Set volume/unmute if available for expo-audio
        if (expoAudioLoaded) {
          try {
            if (player && typeof player.setIsMuted === 'function') await player.setIsMuted(false);
            if (player && typeof player.setIsMutedAsync === 'function')
              await player.setIsMutedAsync(false);
            if (player && typeof player.setVolume === 'function') await player.setVolume(volume);
            if (player && typeof player.setVolumeAsync === 'function')
              await player.setVolumeAsync(volume);
            // set rate if supported
            if (player && typeof player.setRateAsync === 'function')
              await player.setRateAsync(rate);
            else if (player && typeof player.setPlaybackRate === 'function')
              await player.setPlaybackRate(rate);
            else if (player && typeof player.setRate === 'function') await player.setRate(rate);
          } catch (_) {}
        }

        // Attach status listeners for expo-audio
        if (expoAudioLoaded) {
          try {
            if (player && typeof player.addListener === 'function') {
              const offEnd = player.addListener('ended', () => {
                onStatusChange &&
                  onStatusChange({ didJustFinish: true, isPlaying: false, _engine: 'expo-audio' });
              });
              const offErr = player.addListener('error', (e) => {
                onStatusChange && onStatusChange({ error: String(e), _engine: 'expo-audio' });
              });
              listenersRef.current.push(offEnd, offErr);
            } else if (player && typeof player.setOnPlaybackStatusUpdate === 'function') {
              player.setOnPlaybackStatusUpdate(
                (status) => onStatusChange && onStatusChange({ ...status, _engine: 'expo-audio' }),
              );
            }
          } catch (_) {}
          // Start periodic progress polling for expo-audio (it may not emit frequent updates)
          try {
            const poll = async () => {
              if (!player || usingAVRef.current) return;
              try {
                let posMs = null;
                let isPlayingFlag = undefined;
                // Try a generic status getter if available
                if (typeof player.getStatusAsync === 'function') {
                  const status = await player.getStatusAsync();
                  if (status) {
                    if (typeof status.positionMillis === 'number') posMs = status.positionMillis;
                    else if (typeof status.position === 'number') posMs = status.position;
                    else if (typeof status.currentTime === 'number')
                      posMs = Math.round(status.currentTime * 1000);
                    if (typeof status.isPlaying === 'boolean') isPlayingFlag = !!status.isPlaying;
                  }
                } else if (typeof player.getPosition === 'function') {
                  const p = await player.getPosition();
                  if (typeof p === 'number') posMs = p > 100000 ? p : Math.round(p * 1000);
                } else if (typeof player.getCurrentTime === 'function') {
                  const sec = await player.getCurrentTime();
                  if (typeof sec === 'number') posMs = Math.round(sec * 1000);
                }
                if (posMs !== null && onStatusChange) {
                  const payload = { positionMillis: posMs, _engine: 'expo-audio' };
                  if (typeof isPlayingFlag === 'boolean') payload.isPlaying = isPlayingFlag;
                  onStatusChange(payload);
                }
              } catch (_) {}
            };
            progressTimerRef.current = setInterval(poll, 500);
          } catch (_) {}
        }

        // If expo-audio failed, fallback to expo-av
        if (!expoAudioLoaded) {
          try {
            await AV.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              interruptionModeIOS: AV.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
              interruptionModeAndroid: AV.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
              shouldDuckAndroid: false,
            });
            try {
              await AV.setIsEnabledAsync(true);
            } catch (_) {}
          } catch (_) {}
          try {
            const { sound } = await AV.Sound.createAsync(
              { uri: sourceUrl },
              {
                shouldPlay: false,
                isMuted: false,
                volume: volume,
                rate: rate,
                shouldCorrectPitch: !!preservePitch,
                pitchCorrectionQuality: 'high',
              },
            );
            avSoundRef.current = sound;
            usingAVRef.current = true;
            try {
              await sound.setIsMutedAsync(false);
              await sound.setVolumeAsync(volume);
              // set rate for AV
              if (typeof sound.setStatusAsync === 'function')
                await sound.setStatusAsync({
                  rate,
                  shouldCorrectPitch: !!preservePitch,
                  pitchCorrectionQuality: 'high',
                });
              else if (typeof sound.setRateAsync === 'function')
                await sound.setRateAsync(rate, !!preservePitch, 'high');
            } catch (_) {}
            sound.setOnPlaybackStatusUpdate((status) => {
              onStatusChange && onStatusChange({ ...status, _engine: 'expo-av' });
            });
          } catch (e) {
            onStatusChange && onStatusChange({ error: String(e) });
          }
        }

        // Start if requested
        if (play) {
          try {
            if (usingAVRef.current) {
              if (avSoundRef.current) await avSoundRef.current.playAsync();
            } else if (player) {
              if (typeof player.playAsync === 'function') await player.playAsync();
              else if (typeof player.play === 'function') await player.play();
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
      (async () => {
        try {
          if (player && typeof player.setOnPlaybackStatusUpdate === 'function') {
            player.setOnPlaybackStatusUpdate(null);
          }
          listenersRef.current.forEach((off) => {
            try {
              if (typeof off === 'function') off();
            } catch {}
          });
          listenersRef.current = [];
          if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
          }
          if (player && typeof player.unloadAsync === 'function') await player.unloadAsync();
          else if (player && typeof player.unload === 'function') await player.unload();
        } catch (_) {}
        try {
          if (avSoundRef.current) {
            avSoundRef.current.setOnPlaybackStatusUpdate(null);
            await avSoundRef.current.unloadAsync();
            avSoundRef.current = null;
          }
        } catch (_) {}
      })();
    };
  }, [sourceUrl, player]);

  // respond to play prop changes
  useEffect(() => {
    (async () => {
      try {
        if (usingAVRef.current) {
          if (!avSoundRef.current) return;
          if (play) await avSoundRef.current.playAsync();
          else await avSoundRef.current.pauseAsync();
        } else {
          if (!player) return;
          if (play) {
            if (typeof player.playAsync === 'function') await player.playAsync();
            else if (typeof player.play === 'function') await player.play();
          } else {
            if (typeof player.pauseAsync === 'function') await player.pauseAsync();
            else if (typeof player.pause === 'function') await player.pause();
          }
        }
      } catch (e) {
        if (onStatusChange) onStatusChange({ error: e.message });
      }
    })();
  }, [play, player]);

  // respond to external seek requests (seekToMs)
  useEffect(() => {
    (async () => {
      try {
        if (seekToMs === null || seekToMs === undefined) return;
        // clamp to non-negative
        const pos = Math.max(0, Math.round(seekToMs));
        if (usingAVRef.current) {
          if (!avSoundRef.current) return;
          await avSoundRef.current.setPositionAsync(pos);
          if (play) {
            try {
              await avSoundRef.current.playAsync();
            } catch (_) {}
          }
        } else {
          if (!player) return;
          if (typeof player.setPositionAsync === 'function') await player.setPositionAsync(pos);
          else if (typeof player.seekTo === 'function') await player.seekTo(pos);
          if (play) {
            try {
              if (typeof player.playAsync === 'function') await player.playAsync();
              else if (typeof player.play === 'function') await player.play();
            } catch (e) {}
          }
        }
        if (onSeekComplete) onSeekComplete();
      } catch (e) {
        if (onStatusChange) onStatusChange({ error: String(e) });
      }
    })();
  }, [seekToMs, player]);

  // respond to volume changes
  useEffect(() => {
    (async () => {
      try {
        const v = Math.max(0, Math.min(1, Number(volume) || 0));
        if (usingAVRef.current) {
          if (avSoundRef.current) await avSoundRef.current.setVolumeAsync(v);
        } else if (player) {
          if (typeof player.setVolumeAsync === 'function') await player.setVolumeAsync(v);
          else if (typeof player.setVolume === 'function') await player.setVolume(v);
        }
      } catch (_) {}
    })();
  }, [volume, player]);

  // respond to rate changes
  useEffect(() => {
    (async () => {
      try {
        const r = Math.max(0.75, Math.min(2.0, Number(rate) || 1));
        if (usingAVRef.current) {
          if (avSoundRef.current) {
            if (typeof avSoundRef.current.setStatusAsync === 'function')
              await avSoundRef.current.setStatusAsync({
                rate: r,
                shouldCorrectPitch: !!preservePitch,
                pitchCorrectionQuality: 'high',
              });
            else if (typeof avSoundRef.current.setRateAsync === 'function')
              await avSoundRef.current.setRateAsync(r, !!preservePitch, 'high');
            // Nudge playback so changes take effect immediately when playing
            try {
              if (play) {
                await avSoundRef.current.playAsync();
              }
            } catch (_) {}
          }
        } else if (player) {
          if (typeof player.setRateAsync === 'function') await player.setRateAsync(r);
          else if (typeof player.setPlaybackRate === 'function') await player.setPlaybackRate(r);
          else if (typeof player.setRate === 'function') await player.setRate(r);
        }
      } catch (_) {}
    })();
  }, [rate, player, play, preservePitch]);

  return null; // invisible player
}

export default forwardRef(AudioPlayer);
