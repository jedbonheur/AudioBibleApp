import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Paragraph } from '@typography/Typography';
import theme from '@theme/theme';
import BookList from './BookList';

import { getBooks } from '@data/dataApi';

const OldTestament = () => {
  const [books, setBooks] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const otBooks = getBooks({ section: 'oldTestament' });
      setBooks(otBooks);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load Old Testament books');
    }
  }, []);

  if (error)
    return (
      <View style={styles.center}>
        <Paragraph>Error: {error}</Paragraph>
      </View>
    );

  return (
    <View style={styles.container}>
      <BookList books={books} />
    </View>
  );
};

export default OldTestament;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  title: { marginBottom: 8, fontWeight: '600' },
});
