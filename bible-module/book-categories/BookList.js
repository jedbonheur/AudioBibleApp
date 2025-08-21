import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import theme from '@theme/theme';
import BookListItem from './BookListItem';

const BookList = ({ books }) => {
  const navigation = useNavigation();

  const handlePress = useCallback(
    (book) => {
      navigation.navigate('ChapterScreen', { book });
    },
    [navigation]
  );


  const renderItem = useCallback(
    ({ item }) => {
      return <BookListItem item={item} onPress={() => handlePress(item)} />;
    },
    [handlePress]
  );

  return (
    <FlatList
      data={books}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.listContainer}
      style={styles.list}
      showsVerticalScrollIndicator={true}
    />
  );
};

export default BookList;

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 4,
    flexGrow: 1,

  },
  list: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
});
