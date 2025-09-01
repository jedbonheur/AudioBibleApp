import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Audio } from 'expo-av';

// Lightweight background music player using expo-av Audio.Sound that mixes with others
// Props: { sourceUrl, play, volume=1, loop=true }
// Imperative API via ref: play(), pause(), stop(), setVolume(v)
const BackgroundMusicPlayer = ({ sourceUrl, play = false, volume = 1.0, loop = true }, ref) => {
  const soundRef = useRef(null);

  useImperativeHandle(ref, () => ({
    play: async () => {
      try {
        if (soundRef.current) await soundRef.current.playAsync();
      } catch {}
    },
    pause: async () => {
      try {
        if (soundRef.current) await soundRef.current.pauseAsync();
      } catch {}
    },
    stop: async () => {
      try {
        if (!soundRef.current) return;
        await soundRef.current.stopAsync();
        await soundRef.current.setPositionAsync(0);
      } catch {}
    },
    setVolume: async (v) => {
      try {
        const vol = Math.max(0, Math.min(1, Number(v) || 0));
        if (soundRef.current) await soundRef.current.setVolumeAsync(vol);
      } catch {}
    },
  }));

  // Intentionally avoid setting global audio mode here to prevent overriding
  // Track Player's background/lock-screen configuration.

  // Minimal audio mode to ensure playback in silent mode and allow mixing under Track Player
  useEffect(() => {
    (async () => {
      try {
        await Audio.setIsEnabledAsync(true);
      } catch {}
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          allowsRecordingIOS: false,
          shouldDuckAndroid: false,
          // Mix with others on iOS so Bible narration remains primary
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
          // Do not force any Android interruption mode; default behavior + no ducking
        });
      } catch {}
    })();
  }, []);

  // Load/unload when source changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // unload previous
        try {
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
        } catch {}
        if (!sourceUrl) return;
        const { sound } = await Audio.Sound.createAsync(
          { uri: sourceUrl },
          {
            shouldPlay: false,
            isLooping: !!loop,
            volume: Math.max(0, Math.min(1, Number(volume) || 0)),
          },
        );
        if (cancelled) {
          try {
            await sound.unloadAsync();
          } catch {}
          return;
        }
        soundRef.current = sound;
        if (play) {
          try {
            await sound.playAsync();
          } catch {}
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceUrl]);

  // respond to play toggle
  useEffect(() => {
    (async () => {
      try {
        if (!soundRef.current) return;
        if (play) await soundRef.current.playAsync();
        else await soundRef.current.pauseAsync();
      } catch {}
    })();
  }, [play]);

  // respond to volume changes
  useEffect(() => {
    (async () => {
      try {
        if (!soundRef.current) return;
        const vol = Math.max(0, Math.min(1, Number(volume) || 0));
        await soundRef.current.setVolumeAsync(vol);
      } catch {}
    })();
  }, [volume]);

  // respond to loop changes
  useEffect(() => {
    (async () => {
      try {
        if (!soundRef.current) return;
        await soundRef.current.setIsLoopingAsync(!!loop);
      } catch {}
    })();
  }, [loop]);

  useEffect(() => {
    return () => {
      (async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
        } catch {}
      })();
    };
  }, []);

  return null;
};

export default forwardRef(BackgroundMusicPlayer);
