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
import BottomController from '@components/BottomController';
import AudioPlayer from '@components/AudioPlayer';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [latestStatus, setLatestStatus] = useState(null);
  const [currentVerse, setCurrentVerse] = useState(null);
  const [syncOffsetMs, setSyncOffsetMs] = useState(0);
  const [seekToMs, setSeekToMs] = useState(null);

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('user_font_size');
        if (mounted && stored) {
          const n = parseInt(stored, 10);
          if (!Number.isNaN(n)) setFontSize(n);
        }
      } catch (e) {}
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

      if (flatListRef.current && flatListRef.current.scrollToIndex) {
        try {
          flatListRef.current.scrollToIndex({ index: idx, viewPosition: 0.4, animated: true });
          lastScrolledVerseRef.current = currentVerse;
          lastAutoScrollAtRef.current = now;
          return;
        } catch (e) {
          // fall through to offset fallback
        }
      }

      const layout = verseLayoutsRef.current[currentVerse];
      if (layout && flatListRef.current && flatListRef.current.scrollToOffset) {
        const listHeight = flatListHeightRef.current || 0;
        const offset = Math.max(0, layout.y - listHeight / 2 + layout.height / 2 - 16);
        try {
          flatListRef.current.scrollToOffset({ offset, animated: true });
          lastScrolledVerseRef.current = currentVerse;
          lastAutoScrollAtRef.current = now;
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }
  }, [currentVerse, versesArray]);

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
            getItemLayout={(data, index) => computeItemLayout(index)}
            onLayout={(e) => {
              flatListHeightRef.current = e.nativeEvent.layout.height;
            }}
            onScroll={(e) => {
              try {
                scrollOffsetRef.current = e.nativeEvent.contentOffset.y || 0;
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
              } catch (e) {}
            }}
            scrollEventThrottle={100}
          />
        )}

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
              } else {
                if (audioPlayerRef.current && audioPlayerRef.current.play)
                  audioPlayerRef.current.play();
                setIsPlaying(true);
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

            if (status?.didJustFinish) setIsPlaying(false);
            if (status?.error) setIsPlaying(false);
          }}
        />

        <View style={styles.debugOverlay} pointerEvents="box-none">
          <Text style={styles.debugTitle}>Sync</Text>
          <Text style={styles.debugText}>reported: {latestStatus?.positionMillis ?? '—'} ms</Text>
          <Text style={styles.debugText}>
            applied: {(latestStatus?.positionMillis ?? 0) + syncOffsetMs} ms
          </Text>
          <Text style={styles.debugText}>offset: {syncOffsetMs} ms</Text>
          <Text style={styles.debugText}>matched verse: {currentVerse ?? '—'}</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={() => setSyncOffsetMs((s) => s - 100)}
              style={{ marginRight: 12 }}
            >
              <Text style={styles.debugText}>-100ms</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSyncOffsetMs((s) => s + 100)}>
              <Text style={styles.debugText}>+100ms</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Controller
          visible={controllerVisible}
          onClose={() => setControllerVisible(false)}
          fontSize={fontSize}
          onIncreaseFont={() => setFontSize((s) => Math.min(30, s + 1))}
          onDecreaseFont={() => setFontSize((s) => Math.max(10, s - 1))}
          selectedMusic={music}
          onSelectMusic={(m) => {
            setMusic(m);
            setControllerVisible(false);
          }}
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
  debugOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 72,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 8,
  },
  debugTitle: {
    color: '#ffffffaa',
    fontSize: 11,
    fontWeight: '700',
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 6,
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
});
