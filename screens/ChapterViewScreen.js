import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '@theme/theme';
import { Paragraph } from '@typography/Typography';
import Controller from '@components/Controller';

// Build CDN URL
function buildCdnUrl(book) {
 if (!book || !book.name || !book.id) return null;

 // padded ID for CDN
 const paddedId = String(book.id).padStart(2, '0');

 // slug: lowercase, spaces → _, remove non-alphanumeric except _
 const slug = book.name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
 const base = `https://cdn.kinyabible.com/${book.testament}/`;
 return `${base}${paddedId}_${slug}/${slug}${book.chapter}.json`;
}

// AsyncStorage key
function chapterCacheKey(book) {
 return `chapter_${book.testament}_${book.id}_${book.chapter}`;
}

export default function ChapterViewScreen({ navigation }) {
 const { book, nextBook } = useRoute().params; // nextBook optional
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [data, setData] = useState(null);
 const [controllerVisible, setControllerVisible] = useState(false);
 const [fontSize, setFontSize] = useState(16);
 const [music, setMusic] = useState('none');

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
   .then((json) => { if (!isCancelled) setData(json); })
   .catch((e) => { if (!isCancelled) setError(e.message); })
   .finally(() => { if (!isCancelled) setLoading(false); });

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
   fetchChapter(nextChapterBook).catch(() => { });
  }

  return () => { isCancelled = true; };
 }, [book, nextBook]);

 const gradientColors = [theme.bibleCategory[book?.category] || '#111', '#000'];

 // Convert verses object to array with verse number
 const versesArray = data?.verses
  ? Object.entries(data.verses).map(([verseNumber, verse]) => ({
   verse: verseNumber,
   text: verse.text,
  }))
  : [];

 const renderVerse = ({ item }) => (
  <View style={styles.verseRow}>
   <Text style={[styles.verseNumber, { fontSize: fontSize * 0.9 }]}>{item.verse}</Text>
   <Text style={[styles.verseText, { fontSize }]}>{item.text}</Text>
  </View>
 );

 return (
  <LinearGradient colors={gradientColors} style={{ flex: 1 }} start={{ x: 0.5, y: 0.5 }} end={{ x: 0.6, y: 0.1 }}>
   <SafeAreaView style={styles.container}>
    {/* Header */}
    <View style={styles.header}>
     <TouchableOpacity onPress={() => navigation.goBack()}>
      <Ionicons name="arrow-back" size={24} color="white" />
     </TouchableOpacity>
     <Text style={styles.title}>{book?.name} - Chapter {book.chapter}</Text>
     <View style={{ width: 24 }} />
    </View>

    {/* Content */}
    {loading ? (
     <ActivityIndicator size="large" color={theme.colors.primaryTextWhite} style={{ marginTop: 20 }} />
    ) : error ? (
     <Paragraph style={styles.errorText}>{error}</Paragraph>
    ) : (
     <FlatList
      data={versesArray}
      keyExtractor={(item) => item.verse}
      renderItem={renderVerse}
      contentContainerStyle={styles.content}
      initialNumToRender={20}// renders first 20 verses first
     />
    )}

    {/* Sticky bottom controller */}
    <View style={styles.bottomControllerWrapper} backgroundColor={theme.bibleCategory[book?.category]} pointerEvents="box-none">
     <View style={styles.bottomController}>
      <View style={styles.leftGroup}>
       <TouchableOpacity style={styles.playBtn} onPress={() => { /* TODO: play/pause */ }}>
        <Ionicons name="play" size={20} color="white" />
       </TouchableOpacity>
       <View style={{ marginLeft: 10 }}>
        <Text style={styles.controllerTitle}>{book?.name} - {book.chapter}</Text>
        <Text style={styles.controllerSub}>{data?.verses ? Object.keys(data.verses).length : 0} verses</Text>
       </View>
      </View>

      <TouchableOpacity style={styles.settingsBtn} onPress={() => setControllerVisible(true)}>
       <Ionicons name="settings-outline" size={22} color="white" />
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
     onSelectMusic={(m) => { setMusic(m); setControllerVisible(false); }}
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
  color: theme.colors.primaryTextWhite,
  flex: 1,
  lineHeight: 22,
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
 bottomControllerWrapper: {
  // ensure controller sits above content
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 12,
  alignItems: 'center',
 },
 bottomController: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 12,
  width: '94%',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
 },
 leftGroup: { flexDirection: 'row', alignItems: 'center' },
 playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary || '#1e90ff', alignItems: 'center', justifyContent: 'center' },
 controllerTitle: { color: theme.colors.primaryTextWhite, fontSize: 18, fontWeight: '600' },
 controllerSub: { color: theme.colors.primaryTextWhite, fontSize: 12 },
 settingsBtn: { padding: 6 },
});
