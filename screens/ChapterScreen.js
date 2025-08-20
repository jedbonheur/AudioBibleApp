import React, { useState } from 'react';
import { SafeAreaView, Text, FlatList, View, Button } from 'react-native';
import Header from '@header/Header';

const verses = [
  { id: 1, text: "In the beginning was the Word," },
  { id: 2, text: "The Word was with God," },
  { id: 3, text: "And the Word was God." },
  { id: 4, text: "He was with God in the beginning." },
];

export default function ChapterScreen({ navigation }) {
  const [activeVerse, setActiveVerse] = useState(null);

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <Header />
      <Text style={{ fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>
        John 1
      </Text>
      <FlatList
        data={verses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text
            style={{
              fontSize: 18,
              marginVertical: 6,
              backgroundColor: item.id === activeVerse ? 'yellow' : 'transparent',
            }}
          >
            {item.text}
          </Text>
        )}
      />
      <View style={{ marginTop: 10 }}>
        <Button title="Back to Home" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}