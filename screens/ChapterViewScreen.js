import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '@theme/theme';
import { Paragraph } from '@typography/Typography';
import Controller from '@components/Controller';
import { getBackgroundMusicUrlById } from '@data/backgroundMusic';
import BottomController from '@components/BottomController';
import AudioPlayer from '@components/AudioPlayer';
import { syncBackgroundMusicWithBible, setBackgroundMusicVolume, stopBackgroundMusic } from '../NativeBackgroundMusic';
import { bookIconPngMap } from '../assets/bible_icons_png/map';

// Build CDN JSON URL
function buildCdnUrl(book) {
  if (!book || !book.name || !book.id) return null;

  const paddedId = String(book.id).padStart(2, '0');
  const slug = book.name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  const base = `https://cdn.kinyabible.com/${book.testament}/`;
  return `${base}${paddedId}_${slug}/${slug}${book.chapter}.json`;
}

// Build MP3 audio URL for a chapter (derived from JSON URL)
function buildAudioUrl(book) {
  const jsonUrl = buildCdnUrl(book);
  if (!jsonUrl) return null;
  return jsonUrl
    .replace('https://cdn.kinyabible.com/', 'https://cdn.kinyabible.com/audiobible/')
    .replace(/\.json$/i, '.mp3');
}

// Build artwork URL for the book icon (SVG in bible_icons)
function buildBookIconArtwork(book) {
  if (!book || !book.name || !book.id) return require('../assets/icon.png');
  const padded = String(book.id).padStart(2, '0');
  const slug = book.name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-');
  const key = `${padded}-${slug}`;
  return bookIconPngMap[key] || require('../assets/icon.png');
}

// AsyncStorage cache key for a chapter
function chapterCacheKey(book) {
  if (!book) return 'chapter_unknown';
  const testament = book.testament ?? 't';
  const id = typeof book.id !== 'undefined' ? String(book.id) : '0';
  const ch = typeof book.chapter !== 'undefined' ? String(book.chapter) : '0';
  return `chapter_${testament}_${id}_${ch}`;
}

// Build MP3 audio URL for a chapter
export default function ChapterViewScreen({ navigation }) {
  const route = useRoute();
  const { book, nextBook, autoplay } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [controllerVisible, setControllerVisible] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [music, setMusic] = useState('none');
  const [bgMusicUrl, setBgMusicUrl] = useState(null);
  const [bgVolume, setBgVolume] = useState(0.3);
  const [bibleVolume, setBibleVolume] = useState(1.0);
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [bibleRate, setBibleRate] = useState(1.5);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [latestStatus, setLatestStatus] = useState(null);
  const [currentVerse, setCurrentVerse] = useState(null);
  const [syncOffsetMs] = useState(0);
  const [seekToMs, setSeekToMs] = useState(null);
  const [showGoToPlaying, setShowGoToPlaying] = useState(false);
  // debug UI removed

  const flatListRef = useRef(null);
  const verseLayoutsRef = useRef({});
  const flatListHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const lastScrolledVerseRef = useRef(null);
  const lastAutoScrollAtRef = useRef(0);
  const MIN_AUTOSCROLL_INTERVAL_MS = 800;
  const lastUserSeekAtRef = useRef(0);
  const lastUserScrollAtRef = useRef(0);
  const USER_SEEK_NO_AUTOSCROLL_MS = 1500;
  const USER_SCROLL_NO_AUTOSCROLL_MS = 1200;
  const lastUserPlayAtRef = useRef(0);
  const USER_PLAY_DEBOUNCE_MS = 800;
  const isUserDraggingRef = useRef(false);
  const audioPlayerRef = useRef(null);
  // no component ref needed; bg music managed by native module
  const autoReturnTimerRef = useRef(null);
  const centerRetryTimerRef = useRef(null);
  const visibleVersesRef = useRef(new Set());
  const onViewableItemsChangedRef = useRef(({ viewableItems }) => {
    try {
      const set = new Set();
      for (const vi of viewableItems || []) {
        const vkey = vi?.item?.verse;
        if (vkey) set.add(vkey);
      }
      visibleVersesRef.current = set;
      if (currentVerse && isPlaying) {
        setShowGoToPlaying(!set.has(currentVerse));
      }
    } catch (e) {}
  });
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 10,
    minimumViewTime: 60,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('user_font_size');
        if (mounted && stored) {
          const n = parseInt(stored, 10);
          if (!Number.isNaN(n)) setFontSize(n);
        }
        // Load persisted music + volumes
        try {
          const entries = await AsyncStorage.multiGet([
            'bg_music_selected',
            'bg_volume',
            'bible_volume',
            'master_volume',
            'bible_rate',
          ]);
          const map = Object.fromEntries(entries || []);
          if (mounted && map.bg_music_selected) setMusic(map.bg_music_selected || 'none');
          if (mounted && map.bg_volume) {
            const v = Math.max(0, Math.min(1, parseFloat(map.bg_volume)));
            if (!Number.isNaN(v)) setBgVolume(v);
          }
          if (mounted && map.bible_volume) {
            const v = Math.max(0, Math.min(1, parseFloat(map.bible_volume)));
            if (!Number.isNaN(v)) setBibleVolume(v);
          }
          if (mounted && map.master_volume) {
            const v = Math.max(0, Math.min(1, parseFloat(map.master_volume)));
            if (!Number.isNaN(v)) setMasterVolume(v);
          }
          if (mounted && map.bible_rate) {
            const r = Math.max(0.75, Math.min(2.0, parseFloat(map.bible_rate)));
            if (!Number.isNaN(r)) setBibleRate(r);
          }
        } catch (e) {}
      } catch (e) {}
      if (mounted) setSettingsLoaded(true);
    })();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('user_font_size', String(fontSize));
      } catch (e) {}
    })();
  }, [fontSize]);

  // Persist music selection and volumes
  useEffect(() => {
    if (!settingsLoaded) return;
    (async () => {
      try {
        await AsyncStorage.multiSet([
          ['bg_music_selected', music || 'none'],
          ['bg_volume', String(Math.max(0, Math.min(1, bgVolume)))],
          ['bible_volume', String(Math.max(0, Math.min(1, bibleVolume)))],
          ['master_volume', String(Math.max(0, Math.min(1, masterVolume)))],
          ['bible_rate', String(Math.max(0.75, Math.min(2.0, bibleRate)))],
        ]);
      } catch (e) {}
    })();
  }, [settingsLoaded, music, bgVolume, bibleVolume, masterVolume, bibleRate]);

  const fetchChapter = async (chapterBook, { forceRefresh = false } = {}) => {
    const key = chapterCacheKey(chapterBook);

    const readCache = async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    };

    const writeCache = async (dataPayload, etag, lastModified) => {
      try {
        const entry = {
          data: dataPayload,
          etag: etag || null,
          lastModified: lastModified || null,
          savedAt: Date.now(),
        };
        await AsyncStorage.setItem(key, JSON.stringify(entry));
      } catch (e) {}
    };

    const cachedEntry = await readCache();
    const url = buildCdnUrl(chapterBook);
    if (!url) throw new Error('Invalid book data');

    const headers = {};
    if (!forceRefresh && cachedEntry) {
      if (cachedEntry.etag) headers['If-None-Match'] = cachedEntry.etag;
      if (cachedEntry.lastModified) headers['If-Modified-Since'] = cachedEntry.lastModified;
    }

    try {
      const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
      if (res.status === 304 && cachedEntry) return cachedEntry.data;
      if (!res.ok) {
        if (cachedEntry) return cachedEntry.data;
        throw new Error(`Chapter fetch failed (status ${res.status})`);
      }
      const json = await res.json();
      const etag = res.headers.get('ETag') || res.headers.get('etag');
      const lastModified = res.headers.get('Last-Modified') || res.headers.get('last-modified');
      await writeCache(json, etag, lastModified);
      return json;
    } catch (e) {
      if (cachedEntry) return cachedEntry.data;
      throw new Error(e.message || 'Network error');
    }
  };

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    fetchChapter(book)
      .then((json) => {
        if (!isCancelled) setData(json);
      })
      .catch((e) => {
        if (!isCancelled) setError(e.message);
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    try {
      const mp3 = buildAudioUrl(book);
      setAudioUrl(mp3);
      if (autoplay) setIsPlaying(true);
    } catch (e) {
      setAudioUrl(null);
    }

    let nextChapterBook = null;
    if (book.chapter < book.chapters) nextChapterBook = { ...book, chapter: book.chapter + 1 };
    else if (nextBook) nextChapterBook = { ...nextBook, chapter: 1 };
    if (nextChapterBook) fetchChapter(nextChapterBook).catch(() => {});

    return () => (isCancelled = true);
  }, [book, nextBook]);

  useEffect(() => {
    if (autoplay && audioUrl) setIsPlaying(true);
  }, [autoplay, audioUrl]);

  // Keep background music in sync with actual TrackPlayer state
  useEffect(() => {
    (async () => {
      try {
        const vol = Math.max(0, Math.min(1, bgVolume * masterVolume));
        const actuallyPlaying = Boolean(isPlaying);
        if (actuallyPlaying && bgMusicUrl) {
          // slight debounce to avoid race with TP session applying
          await new Promise((r) => setTimeout(r, 100));
          await syncBackgroundMusicWithBible(true, bgMusicUrl, vol);
        } else {
          await syncBackgroundMusicWithBible(false, null, 0);
        }
      } catch (_) {}
    })();
  }, [isPlaying, bgMusicUrl, bgVolume, masterVolume]);

  // Apply background music volume changes dynamically (throttled)
  useEffect(() => {
    let timer = null;
    const apply = async () => {
      try {
        const vol = Math.max(0, Math.min(1, bgVolume * masterVolume));
        await setBackgroundMusicVolume(vol);
      } catch (_) {}
    };
    // Coalesce rapid slider updates
    timer = setTimeout(apply, 80);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [bgVolume, masterVolume]);

  // Resolve selected background music URL from static list
  useEffect(() => {
    try {
      let url = null;
      if (music && music !== 'none') url = getBackgroundMusicUrlById(music);
      if (!url) {
        // Fallback default loop if none selected
        url = 'https://cdn.kinyabible.com/background_music/hymn.mp3';
      }
      setBgMusicUrl(url);
    } catch (_) {
      setBgMusicUrl('https://cdn.kinyabible.com/background_music/hymn.mp3');
    }
  }, [music]);

  const gradientColors = [theme.bibleCategory[book?.category] || '#fffdfdff', '#030100d5'];

  const versesArray = data?.verses
    ? Object.entries(data.verses).map(([verseNumber, verse]) => ({
        verse: verseNumber,
        text: verse.text,
        startMs: typeof verse.start === 'number' ? Math.round(verse.start * 1000) : null,
        endMs: typeof verse.end === 'number' ? Math.round(verse.end * 1000) : null,
      }))
    : [];

  const renderVerse = ({ item }) => {
    const verseMargin = Math.max(8, Math.round(fontSize * 0.75));
    const lineH = Math.round(fontSize * 1.45);
    const displayText = item.text
      ? item.text.replace(/(\p{L})/u, (m) => m.toUpperCase())
      : item.text;
    const isActive = item.verse === currentVerse;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (typeof item.startMs === 'number') {
            // mark user-initiated seek so autoscroll can be suppressed briefly
            try {
              lastUserSeekAtRef.current = Date.now();
            } catch (e) {}
            // prefer imperative seek if player ref exists
            if (audioPlayerRef.current && audioPlayerRef.current.seek) {
              try {
                audioPlayerRef.current.seek(item.startMs);
                // ensure playback after seek
                if (audioPlayerRef.current.play) audioPlayerRef.current.play().catch(() => {});
                setIsPlaying(true);
              } catch (e) {
                setSeekToMs(item.startMs);
                setIsPlaying(true);
              }
            } else {
              setSeekToMs(item.startMs);
              setIsPlaying(true);
            }
          }
          // center the tapped verse immediately
          try {
            centerVerse(item.verse, true);
          } catch (e) {}
          // also highlight immediately to avoid any lag
          try {
            setCurrentVerse(item.verse);
          } catch (e) {}
        }}
        onLayout={(e) => {
          try {
            verseLayoutsRef.current[item.verse] = e.nativeEvent.layout;
          } catch (e) {}
        }}
        style={[
          styles.verseRow,
          { marginBottom: verseMargin, flexDirection: 'column' },
          isActive ? styles.activeVerseRow : null,
        ]}
      >
        <Text
          style={[
            styles.verseText,
            { fontSize, lineHeight: lineH },
            isActive ? styles.activeVerseText : null,
          ]}
        >
          {displayText}
        </Text>
        <Text
          style={[styles.verseFooter, isActive ? styles.activeVerseFooter : null]}
        >{`${book?.name} ${book.chapter} : ${item.verse}`}</Text>
      </TouchableOpacity>
    );
  };

  const computeItemLayout = (index) => {
    const item = versesArray[index];
    if (!item) return { length: 60, offset: index * 60, index };
    const charsPerLine = 40;
    const text = item.text || '';
    const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
    const lineHeight = Math.round(fontSize * 1.45);
    const textHeight = lines * lineHeight;
    const footerHeight = 18;
    const marginBottom = Math.max(8, Math.round(fontSize * 0.75));
    const length = textHeight + footerHeight + marginBottom + 16;
    let offset = 0;
    for (let i = 0; i < index; i++) {
      const pi = versesArray[i];
      if (!pi) offset += length;
      else {
        const plines = Math.max(1, Math.ceil((pi.text || '').length / charsPerLine));
        const plen =
          plines * lineHeight + footerHeight + Math.max(8, Math.round(fontSize * 0.75)) + 16;
        offset += plen;
      }
    }
    return { length, offset, index };
  };

  // Determine if a verse is currently visible using FlatList's viewability
  const isVerseVisible = (verseKey) => {
    return visibleVersesRef.current.has(verseKey);
  };

  // Check if a verse is centered in the viewport within a tolerance (px)
  const isVerseCentered = (verseKey, tolerance = 24) => {
    try {
      const layout = verseLayoutsRef.current[verseKey];
      const listHeight = flatListHeightRef.current || 0;
      const scrollY = scrollOffsetRef.current || 0;
      if (!layout || !listHeight) return true; // avoid fighting until measured
      const verseCenter = layout.y + layout.height / 2;
      const visibleCenter = scrollY + listHeight / 2;
      return Math.abs(verseCenter - visibleCenter) <= tolerance;
    } catch (e) {
      return true;
    }
  };

  // Scroll so that a specific verse is centered in the viewport
  const centerVerse = (verseKey, animated = true) => {
    try {
      const idx = versesArray.findIndex((v) => v.verse === verseKey);
      if (idx < 0) return;
      const now = Date.now();
      if (flatListRef.current && flatListRef.current.scrollToIndex) {
        try {
          flatListRef.current.scrollToIndex({ index: idx, viewPosition: 0.5, animated });
          lastScrolledVerseRef.current = verseKey;
          lastAutoScrollAtRef.current = now;
          // Schedule a second pass to ensure exact centering after the item renders
          if (centerRetryTimerRef.current) clearTimeout(centerRetryTimerRef.current);
          centerRetryTimerRef.current = setTimeout(() => {
            try {
              flatListRef.current.scrollToIndex({ index: idx, viewPosition: 0.5, animated: true });
            } catch (e) {}
          }, 80);
          return;
        } catch (e) {
          // ignore and exit
        }
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    try {
      const reportedMs = latestStatus?.positionMillis;
      if (typeof reportedMs !== 'number' || isNaN(reportedMs)) return;
      const posMs = reportedMs + (typeof syncOffsetMs === 'number' ? syncOffsetMs : 0);
      const found = versesArray.find(
        (v) =>
          typeof v.startMs === 'number' &&
          typeof v.endMs === 'number' &&
          posMs >= v.startMs &&
          posMs < v.endMs,
      );
      if (found) {
        if (found.verse !== currentVerse) setCurrentVerse(found.verse);
      } else {
        if (currentVerse !== null) setCurrentVerse(null);
      }
      if (latestStatus?.didJustFinish) setCurrentVerse(null);
    } catch (e) {
      // ignore
    }
  }, [latestStatus, versesArray]);

  useEffect(() => {
    try {
      if (!currentVerse) return;
      const now = Date.now();

      // Prevent auto-scrolling too frequently
      if (
        lastScrolledVerseRef.current === currentVerse &&
        now - lastAutoScrollAtRef.current < MIN_AUTOSCROLL_INTERVAL_MS
      ) {
        return;
      }

      // If the user is currently dragging or just recently scrolled/seeked,
      // avoid auto-scrolling to respect user control.
      if (isUserDraggingRef.current) return;
      if (now - (lastUserSeekAtRef.current || 0) < USER_SEEK_NO_AUTOSCROLL_MS) return;
      if (now - (lastUserScrollAtRef.current || 0) < USER_SCROLL_NO_AUTOSCROLL_MS) return;

      const idx = versesArray.findIndex((v) => v.verse === currentVerse);
      if (idx < 0) return;

      const isVerseVisible = (verseKey) => {
        try {
          const layout = verseLayoutsRef.current[verseKey];
          const listHeight = flatListHeightRef.current || 0;
          const scrollY = scrollOffsetRef.current || 0;
          if (!layout || !listHeight) return false;
          const verseTop = layout.y;
          const verseCenter = verseTop + layout.height / 2;
          const visibleTop = scrollY + listHeight * 0.2; // 20% down
          const visibleBottom = scrollY + listHeight * 0.8; // 80% down
          return verseCenter >= visibleTop && verseCenter <= visibleBottom;
        } catch (e) {
          return false;
        }
      };

      // if already visible within central band, do not scroll
      if (isVerseVisible(currentVerse)) {
        lastScrolledVerseRef.current = currentVerse;
        lastAutoScrollAtRef.current = now;
        return;
      }

      // center the verse
      centerVerse(currentVerse, true);
    } catch (e) {
      // ignore
    }
  }, [currentVerse, versesArray]);

  // Track visibility of the current verse to show/hide the "Go to playing verse" button
  useEffect(() => {
    try {
      if (!currentVerse || !isPlaying) {
        setShowGoToPlaying(false);
        return;
      }
      const visible = isVerseVisible(currentVerse);
      setShowGoToPlaying(!visible);
    } catch (e) {}
  }, [currentVerse, isPlaying]);

  // Periodically ensure the current verse is centered while playing
  useEffect(() => {
    if (!isPlaying || !currentVerse) return;
    const intervalId = setInterval(() => {
      try {
        const now = Date.now();
        if (isUserDraggingRef.current) return;
        if (now - (lastUserSeekAtRef.current || 0) < USER_SEEK_NO_AUTOSCROLL_MS) return;
        if (now - (lastUserScrollAtRef.current || 0) < USER_SCROLL_NO_AUTOSCROLL_MS) return;
        if (now - (lastAutoScrollAtRef.current || 0) < MIN_AUTOSCROLL_INTERVAL_MS) return;
        if (!isVerseCentered(currentVerse)) {
          centerVerse(currentVerse, true);
        }
      } catch (e) {}
    }, 700);
    return () => clearInterval(intervalId);
  }, [isPlaying, currentVerse]);

  // Auto-return after 5 seconds if user hasn't tapped the button
  useEffect(() => {
    try {
      if (autoReturnTimerRef.current) {
        clearTimeout(autoReturnTimerRef.current);
        autoReturnTimerRef.current = null;
      }
      if (showGoToPlaying && isPlaying && currentVerse) {
        autoReturnTimerRef.current = setTimeout(() => {
          centerVerse(currentVerse, true);
          setShowGoToPlaying(false);
        }, 5000);
      }
    } catch (e) {}

    return () => {
      try {
        if (autoReturnTimerRef.current) clearTimeout(autoReturnTimerRef.current);
        autoReturnTimerRef.current = null;
        if (centerRetryTimerRef.current) clearTimeout(centerRetryTimerRef.current);
        centerRetryTimerRef.current = null;
      } catch (e) {}
    };
  }, [showGoToPlaying, isPlaying, currentVerse]);

  return (
    <LinearGradient
      colors={gradientColors}
      style={{ flex: 1 }}
      start={{ x: 0.5, y: 0.5 }}
      end={{ x: 0.6, y: 0.1 }}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {book?.name} - Chapter {book.chapter}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        {/* debug button removed */}

        {loading ? (
          <ActivityIndicator
            size="large"
            color={theme.colors.primaryTextWhite}
            style={{ marginTop: 20 }}
          />
        ) : error ? (
          <Paragraph style={styles.errorText}>{error}</Paragraph>
        ) : (
          <FlatList
            ref={flatListRef}
            data={versesArray}
            keyExtractor={(item) => item.verse}
            renderItem={renderVerse}
            contentContainerStyle={styles.content}
            initialNumToRender={20}
            windowSize={21}
            removeClippedSubviews={false}
            // Using viewability callbacks to detect visibility
            onViewableItemsChanged={onViewableItemsChangedRef.current}
            viewabilityConfig={viewabilityConfigRef.current}
            onLayout={(e) => {
              flatListHeightRef.current = e.nativeEvent.layout.height;
            }}
            onScroll={(e) => {
              try {
                scrollOffsetRef.current = e.nativeEvent.contentOffset.y || 0;
                // update button visibility while scrolling
                if (currentVerse && isPlaying) {
                  const visible = isVerseVisible(currentVerse);
                  setShowGoToPlaying(!visible);
                }
              } catch (err) {}
            }}
            onScrollBeginDrag={() => {
              try {
                isUserDraggingRef.current = true;
                lastUserScrollAtRef.current = Date.now();
              } catch (e) {}
            }}
            onScrollEndDrag={() => {
              try {
                isUserDraggingRef.current = false;
                lastUserScrollAtRef.current = Date.now();
                // re-evaluate visibility after user stops dragging
                if (currentVerse && isPlaying) {
                  const visible = isVerseVisible(currentVerse);
                  setShowGoToPlaying(!visible);
                }
              } catch (e) {}
            }}
            onMomentumScrollBegin={() => {
              try {
                isUserDraggingRef.current = true;
              } catch (e) {}
            }}
            onMomentumScrollEnd={() => {
              try {
                isUserDraggingRef.current = false;
                lastUserScrollAtRef.current = Date.now();
                if (currentVerse && isPlaying) {
                  const visible = isVerseVisible(currentVerse);
                  setShowGoToPlaying(!visible);
                }
              } catch (e) {}
            }}
            scrollEventThrottle={100}
          />
        )}

        {showGoToPlaying && isPlaying && currentVerse ? (
          <View style={styles.goToPlayingWrapper} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.goToPlayingButton}
              activeOpacity={0.9}
              onPress={() => {
                centerVerse(currentVerse, true);
                setShowGoToPlaying(false);
              }}
            >
              <Ionicons name="musical-notes" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.goToPlayingText}>Go to playing verse</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <BottomController
          book={book}
          versesCount={data?.verses ? Object.keys(data.verses).length : 0}
          onSettingsPress={() => setControllerVisible(true)}
          onPlayPress={() => {
            try {
              lastUserPlayAtRef.current = Date.now();
            } catch (e) {}
            try {
              if (isPlaying) {
                if (audioPlayerRef.current && audioPlayerRef.current.pause)
                  audioPlayerRef.current.pause();
                setIsPlaying(false);
                // Immediately pause background music
                try {
                  syncBackgroundMusicWithBible(false, null, 0);
                } catch (_) {}
              } else {
                if (audioPlayerRef.current && audioPlayerRef.current.play)
                  audioPlayerRef.current.play();
                setIsPlaying(true);
                // Immediately resume background music with current url and volume
                try {
                  const vol = Math.max(0, Math.min(1, bgVolume * masterVolume));
                  if (bgMusicUrl) syncBackgroundMusicWithBible(true, bgMusicUrl, vol);
                } catch (_) {}
              }
            } catch (e) {
              setIsPlaying((s) => !s);
            }
          }}
          isPlaying={isPlaying}
          categoryColor={theme.bibleCategory[book?.category]}
        />

        <AudioPlayer
          ref={audioPlayerRef}
          sourceUrl={audioUrl}
          play={isPlaying}
          trackId={`bible-${book?.testament}-${book?.id}-${book?.chapter}`}
          title={`${book?.name} ${book?.chapter}`}
          artist={'Kinya Bible'}
          artwork={buildBookIconArtwork(book)}
          volume={Math.max(0, Math.min(1, bibleVolume * masterVolume))}
          rate={bibleRate}
          preservePitch={true}
          exclusiveFocus={true}
          seekToMs={seekToMs}
          onSeekComplete={() => setSeekToMs(null)}
          onStatusChange={(status) => {
            setLatestStatus(status);
            try {
              const now = Date.now();
              if (now - (lastUserPlayAtRef.current || 0) < USER_PLAY_DEBOUNCE_MS) {
                // recently toggled by user — don't override isPlaying from status
              } else {
                if (status && typeof status.isPlaying === 'boolean')
                  setIsPlaying(Boolean(status.isPlaying));
              }
            } catch (e) {
              if (status && typeof status.isPlaying === 'boolean')
                setIsPlaying(Boolean(status.isPlaying));
            }

            if (status?.didJustFinish) {
              setIsPlaying(false);
              // End background music completely when narration ends
              try {
                stopBackgroundMusic();
              } catch (_) {}
            }
            if (status?.error) setIsPlaying(false);
          }}
        />

        {/* Background music player: plays on loop while bible is playing */}
        {/* Background music handled natively; no JSX needed */}

        {/* debug overlay removed */}

        <Controller
          visible={controllerVisible}
          onClose={() => setControllerVisible(false)}
          fontSize={fontSize}
          onIncreaseFont={() => setFontSize((s) => Math.min(30, s + 1))}
          onDecreaseFont={() => setFontSize((s) => Math.max(10, s - 1))}
          selectedMusic={music}
          onSelectMusic={(m) => {
            setMusic(m);
          }}
          bgVolume={bgVolume}
          onBgVolumeChange={setBgVolume}
          bibleVolume={bibleVolume}
          onBibleVolumeChange={setBibleVolume}
          masterVolume={masterVolume}
          onMasterVolumeChange={setMasterVolume}
          bibleRate={bibleRate}
          onBibleRateChange={setBibleRate}
          bookLabel={`${book?.name} - ${book.chapter}`}
          versesCount={data?.verses ? Object.keys(data.verses).length : 0}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 50,
  },
  verseRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  verseNumber: {
    color: theme.colors.primaryTextWhite,
    fontWeight: '700',
    marginRight: 8,
  },
  verseText: {
    color: theme.colors.greyverse,
    flex: 1,
    lineHeight: 22,
    fontWeight: '600',
  },
  verseFooter: {
    color: theme.colors.greyverse,
    fontSize: 13,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  paragraph: {
    color: theme.colors.primaryTextWhite,
    marginBottom: 12,
    lineHeight: 22,
  },
  errorText: {
    color: '#ffdddd',
    marginTop: 20,
    textAlign: 'center',
  },
  activeVerseRow: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 8,
  },
  activeVerseText: {
    color: '#fff',
  },
  activeVerseFooter: {
    color: '#ffffffaa',
  },
  goToPlayingWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 88, // above bottom controller
    alignItems: 'center',
  },
  goToPlayingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  goToPlayingText: {
    color: '#fff',
    fontWeight: '600',
  },
});
