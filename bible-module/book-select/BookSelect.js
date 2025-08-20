import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '@theme/theme';
import { Title, Tab } from '@typography/Typography';
import NewTestament from '@bookcategories/NewTestament';
import OldTestament from '@bookcategories/OldTestament';

const BookSelect = () => {
  const [selectedTab, setSelectedTab] = useState('New');

  return (
    <View>
      <Title style={styles.titleSelect}>Select Book</Title>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'Old' && styles.activeTab,
          ]}
          onPress={() => setSelectedTab('Old')}
        >
          <Tab numberOfLines={1} style={[
            styles.tabText,
            selectedTab === 'Old' && styles.activeTabText,
          ]}>Old Testament</Tab>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'New' && styles.activeTab,
          ]}
          onPress={() => setSelectedTab('New')}
        >
          <Tab numberOfLines={1} style={[
            styles.tabText,
            selectedTab === 'New' && styles.activeTabText,
          ]}>New Testament</Tab>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {selectedTab === 'Old' ? <OldTestament /> : <NewTestament />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  titleSelect: {
    marginLeft: theme.spacing.outerPadding,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'center',
    margin: theme.spacing.outerPadding,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.blueDark
  },
  activeTab: {
    backgroundColor: theme.colors.secondaryOrange,
  },
  tabText: {
    color: theme.colors.primaryTextWhite,
    fontWeight: 'bold',
    fontSize: theme.fonts.size.tab,
  },
  activeTabText: {
    color: theme.colors.primaryTextWhite,
  },
  selectTextTitle: {
    color: theme.colors.primaryTextWhite,
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fonts.size.title,
  },
  content: {
    color: theme.colors.primaryTextWhite,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: theme.spacing.outerPadding,
  },
});
export default BookSelect;