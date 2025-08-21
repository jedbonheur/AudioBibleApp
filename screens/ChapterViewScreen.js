import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '@theme/theme';
import { Paragraph } from '@typography/Typography';

function buildCdnUrl(book) {
 if (!book || !book.name || !book.id) return null;

 // Create slug: lowercase, spaces → _, remove non-alphanumeric except _
 const slug = book.name
  .toLowerCase()
  .trim()
  .replace(/\s+/g, '_')
  .replace(/[^a-z0-9_]/g, '');

 const base = `https://cdn.kinyabible.com/${book.testament}/`;
 return `${base}${book.id}_${slug}/${slug}${book.chapter}.json`;
}

export default function ChapterViewScreen({ navigation }) {
 const { book } = useRoute().params;
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [data, setData] = useState(null);

 useEffect(() => {
  let isCancelled = false;

  const fetchChapter = async () => {
   setLoading(true);
   setError(null);
   try {
    const url = buildCdnUrl(book);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Chapter not found');
    const json = await res.json();
    if (!isCancelled) setData(json);
   } catch (e) {
    if (!isCancelled) setError(e.message);
   } finally {
    if (!isCancelled) setLoading(false);
   }
  };

  fetchChapter();
  return () => { isCancelled = true; };
 }, [book]);

 const gradientColors = [theme.bibleCategory[book?.category] || '#111', '#000'];

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
    <ScrollView contentContainerStyle={styles.content}>
     {loading && <ActivityIndicator size="large" color={theme.colors.primaryTextWhite} />}
     {error && <Paragraph style={styles.errorText}>{error}</Paragraph>}

     {!loading && !error && data && (
      <View>
       {data.verses && typeof data.verses === 'object' ? (
        Object.entries(data.verses)
         .sort((a, b) => Number(a[0]) - Number(b[0]))
         .map(([verseNumber, verse]) => (
          <View key={verseNumber} style={styles.verseRow}>
           <Text style={styles.verseNumber}>{verseNumber}</Text>
           <Text style={styles.verseText}>{verse.text}</Text>
          </View>
         ))
       ) : Array.isArray(data) ? (
        data.map((item, idx) => (
         <Paragraph key={idx} style={styles.paragraph}>
          {typeof item === 'string' ? item : JSON.stringify(item)}
         </Paragraph>
        ))
       ) : data.chapter || data.text || data.content ? (
        <Paragraph style={styles.paragraph}>{data.chapter || data.text || data.content}</Paragraph>
       ) : (
        <Paragraph style={styles.paragraph}>{JSON.stringify(data)}</Paragraph>
       )}
      </View>
     )}
    </ScrollView>
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
 },
});
