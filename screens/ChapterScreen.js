import React from 'react';
import { SafeAreaView, Text, StyleSheet, ScrollView, View, StatusBar, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '@theme/theme';
import BibleIcon from "../bible-module/book-categories/utils/BibleIcons";
import { generateLightGradient } from '../bible-module/book-categories/utils/GenerateLightGradient';
import { Paragraph } from '@typography/Typography';

export default function ChapterScreen({ navigation }) {
  const route = useRoute();
  const { book } = route.params;
  const IconComponent = BibleIcon[book.name];
  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
  const gradientColors = generateLightGradient(theme.bibleCategory[book.category], 0.2);
  // --- inside ChapterScreen component ---
  const [expanded, setExpanded] = React.useState(false);

  // Limit text to 50% length
  const maxLength = Math.floor(book.intro.length / 2);
  const previewText = book.intro.slice(0, maxLength);
  const fullText = book.intro;

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }} start={{ x: 0.5, y: 0.5 }}   // top center
      end={{ x: 0.6, y: 0.1 }}  >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>{book.name}</Text>
          <TouchableOpacity onPress={() => console.log('Menu pressed')}>
            <Ionicons name="ellipsis-vertical" size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Book Icon */}
        <View style={styles.bookIconContainer}>
          {IconComponent ? (
            <IconComponent style={styles.bookIconShadow} width={180} height={180} />
          ) : (
            <View style={styles.bookIconPlaceholder} />
          )}
        </View>
        {/* Book Intro */}
        <View style={styles.bookIntro}>
          <Paragraph style={styles.bookIntroText}>
            {expanded ? fullText : previewText + "..."}
            <Text
              style={styles.readMore}
              onPress={() => setExpanded(!expanded)}
            >
              {expanded ? " Read less" : " Read more"}
            </Text>
          </Paragraph>
        </View>

        {/* Chapters List */}
        <ScrollView contentContainerStyle={styles.chapterList}>
          {chapters.map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.chapterButton}
              onPress={() => navigation.navigate('ChapterView', { bookId: book.id, chapterNumber: num })}
            >
              <Text style={styles.chapterText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  chapterList: {
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  bookIntro: {
    padding: 16,
  },
  chapterButton: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: theme.colors.primaryTextWhite,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterText: {
    color: theme.colors.primaryTextWhite,
    fontSize: theme.fonts.size.body,
    fontWeight: '500',
    textAlign: 'center',
  },
  bookIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  bookIconShadow: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Android shadow
    elevation: 8,
  },
  bookIntroText: {
    color: theme.colors.primaryTextWhite,
    fontSize: theme.fonts.size.body,
    lineHeight: 20,
  },

  readMore: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
