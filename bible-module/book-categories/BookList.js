import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import theme from '@theme/theme';
import BookListItem from './BookListItem';

const BookList = ({ books, onBookPress }) => {
  const [selectedBookId, setSelectedBookId] = useState(null);

  const handlePress = useCallback(
    (book) => {
      setSelectedBookId(book.id);
      if (onBookPress) onBookPress(book);
    },
    [onBookPress]
  );

  const renderItem = useCallback(
    ({ item }) => {
      const isSelected = item.id === selectedBookId;
      return <BookListItem item={item} isSelected={isSelected} onPress={handlePress} />;
    },
    [selectedBookId, handlePress]
  );

  return (
    <FlatList
      data={books}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      extraData={selectedBookId}
      contentContainerStyle={styles.listContainer}
    />
  );
};

export default BookList;

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 4,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
});
