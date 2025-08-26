import React, { useEffect, useState } from 'react';
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

// Build MP3 audio URL for a chapter
function buildAudioUrl(book) {
  if (!book || !book.name || !book.id) return null;
  const paddedId = String(book.id).padStart(2, '0');
  const slug = book.name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  // pattern: https://cdn.kinyabible.com/audiobible/newTestament/60_1_peter/1_peter1.mp3
  const testamentSegment = book.testament === 'newTestament' ? 'newTestament' : 'oldTestament';
  return `https://cdn.kinyabible.com/audiobible/${testamentSegment}/${paddedId}_${slug}/${slug}${book.chapter}.mp3`;
}

// AsyncStorage key
function chapterCacheKey(book) {
  return `chapter_${book.testament}_${book.id}_${book.chapter}`;
}

export default function ChapterViewScreen({ navigation }) {
  const route = useRoute();
  const { book, nextBook, autoplay } = route.params || {}; // nextBook optional, autoplay optional
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [controllerVisible, setControllerVisible] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [music, setMusic] = useState('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [latestStatus, setLatestStatus] = useState(null);

  // load persisted font size on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('user_font_size');
        if (mounted && stored) {
          const n = parseInt(stored, 10);
          if (!Number.isNaN(n)) setFontSize(n);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // persist font size whenever it changes
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('user_font_size', String(fontSize));
      } catch (e) {
        // ignore
      }
    })();
  }, [fontSize]);

  // Fetch chapter (with caching)
  const fetchChapter = async (chapterBook) => {
    const key = chapterCacheKey(chapterBook);

    try {
      // Check cache first
      const cached = await AsyncStorage.getItem(key);
      if (cached) return JSON.parse(cached);

      // Fetch from CDN
      const url = buildCdnUrl(chapterBook);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Chapter not found');
      const json = await res.json();

      // Save to cache
      await AsyncStorage.setItem(key, JSON.stringify(json));
      return json;
    } catch (e) {
      throw new Error(e.message);
    }
  };

  // Load current chapter
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

    // Build audio URL for this chapter and set it
    try {
      const mp3 = buildAudioUrl(book);
      setAudioUrl(mp3);
      // autoplay is handled in the effect below once audioUrl is set
    } catch (e) {
      setAudioUrl(null);
    }

    // Prefetch next chapter if it exists
    let nextChapterBook = null;

    if (book.chapter < book.chapters) {
      // same book, next chapter
      nextChapterBook = { ...book, chapter: book.chapter + 1 };
    } else if (nextBook) {
      // next book exists
      nextChapterBook = { ...nextBook, chapter: 1 };
    }

    if (nextChapterBook) {
      fetchChapter(nextChapterBook).catch(() => {});
    }

    return () => {
      isCancelled = true;
    };
  }, [book, nextBook]);

  // If user navigated with autoplay param, start playback when audioUrl is ready
  useEffect(() => {
    if (autoplay && audioUrl) {
      setIsPlaying(true);
    }
  }, [autoplay, audioUrl]);

  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.warn('[ChapterView] audioUrl', audioUrl, 'isPlaying', isPlaying);
    } catch (e) {}
  }, [audioUrl, isPlaying]);

  const gradientColors = [theme.bibleCategory[book?.category] || '#fffdfdff', '#030100d5'];

  // Convert verses object to array with verse number
  const versesArray = data?.verses
    ? Object.entries(data.verses).map(([verseNumber, verse]) => ({
        verse: verseNumber,
        text: verse.text,
      }))
    : [];

  const renderVerse = ({ item }) => {
    const verseMargin = Math.max(8, Math.round(fontSize * 0.75));
    const lineH = Math.round(fontSize * 1.45);

    // Capitalize the first Unicode letter while preserving leading whitespace/punctuation
    const displayText = item.text
      ? item.text.replace(/(\p{L})/u, (m) => m.toUpperCase())
      : item.text;

    return (
      <View style={[styles.verseRow, { marginBottom: verseMargin, flexDirection: 'column' }]}>
        <Text style={[styles.verseText, { fontSize, lineHeight: lineH }]}>{displayText}</Text>
        <Text style={styles.verseFooter}>{`${book?.name} ${book.chapter} : ${item.verse}`}</Text>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={gradientColors}
      style={{ flex: 1 }}
      start={{ x: 0.5, y: 0.5 }}
      end={{ x: 0.6, y: 0.1 }}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {book?.name} - Chapter {book.chapter}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
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
            data={versesArray}
            keyExtractor={(item) => item.verse}
            renderItem={renderVerse}
            contentContainerStyle={styles.content}
            initialNumToRender={20} // renders first 20 verses first
          />
        )}

        <BottomController
          book={book}
          versesCount={data?.verses ? Object.keys(data.verses).length : 0}
          onSettingsPress={() => setControllerVisible(true)}
          onPlayPress={() => {
            setIsPlaying((s) => !s);
          }}
          isPlaying={isPlaying}
          categoryColor={theme.bibleCategory[book?.category]}
        />
        {/* Invisible audio player that loads the dynamic audio URL */}
        <AudioPlayer
          sourceUrl={audioUrl}
          play={isPlaying}
          onStatusChange={(status) => {
            // update local debug status
            setLatestStatus(status);
            // if playback finished, reset isPlaying
            if (status?.didJustFinish) setIsPlaying(false);
            // if error, stop
            if (status?.error) setIsPlaying(false);
          }}
        />

        {/* Debug overlay: shows current audioUrl and latest playback status */}
        <View style={styles.debugOverlay} pointerEvents="none">
          <Text style={styles.debugTitle}>audioUrl</Text>
          <Text style={styles.debugText} numberOfLines={2} ellipsizeMode="tail">
            {audioUrl || '—'}
          </Text>
          <Text style={styles.debugTitle}>status</Text>
          <Text style={styles.debugText} numberOfLines={3} ellipsizeMode="tail">
            {latestStatus ? JSON.stringify(latestStatus) : '—'}
          </Text>
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
});
