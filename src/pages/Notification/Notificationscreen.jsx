/**
 * NotificationScreen.js
 *
 * React Native CLI screen — recreated from the "mokhsh" app notification design.
 *
 * Dependencies to install:
 *   npm install react-native-vector-icons
 *   (iOS) cd ios && pod install
 *   For Android, make sure vector icons are linked in android/app/build.gradle:
 *     apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
 *
 * Usage:
 *   import NotificationScreen from './NotificationScreen';
 *   ...render <NotificationScreen /> inside your navigator or App.js
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

const COLORS = {
  bg: '#1B1442',
  header: '#241A5C',
  card: '#2C2166',
  cardHighlight: '#3A2C8C',
  accent: '#7C6BFF',
  text: '#FFFFFF',
  subText: '#B8B0E0',
  pill: '#2C2166',
  border: '#3A2C8C',
};

const NOTIFICATIONS = [
  {
    id: '1',
    title: 'Interview Scheduled for Test on 2026-07-01',
    subtitle: '13:05',
    highlighted: true,
  },
  {
    id: '2',
    title: 'You are assigned to Project: Delay Test',
    subtitle: 'Project 2',
    highlighted: false,
  },
  {
    id: '3',
    title: 'Interview Scheduled for Test on 2026-07-01',
    subtitle: '13:05',
    highlighted: true,
  },
  {
    id: '4',
    title: 'You are assigned to Project: Delay Test',
    subtitle: 'Project 2',
    highlighted: false,
  },
  {
    id: '5',
    title: 'You are assigned to Project: Delay Test',
    subtitle: 'Project 2',
    highlighted: false,
  },
  {
    id: '6',
    title: 'You are assigned to Project: Delay Test',
    subtitle: 'Project 2',
    highlighted: false,
  },
  {
    id: '7',
    title: 'Interview Scheduled for Test on 2026-07-01',
    subtitle: '13:05',
    highlighted: true,
  },
  {
    id: '8',
    title: 'You are assigned to Project: Delay Test',
    subtitle: 'Project 2',
    highlighted: false,
  },
  {
    id: '9',
    title: 'You are assigned to Project: Delay Test',
    subtitle: 'Project 2',
    highlighted: false,
  },
];

const NotificationScreen = () => {
  const [selectAll, setSelectAll] = useState(false);
  const [checkedIds, setCheckedIds] = useState([]);
  const [filter, setFilter] = useState('All');

  const toggleSelectAll = () => {
    const next = !selectAll;
    setSelectAll(next);
    setCheckedIds(next ? NOTIFICATIONS.map(n => n.id) : []);
  };

  const toggleItem = id => {
    setCheckedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const renderCheckbox = checked => (
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Icon name="checkmark" size={14} color="#fff" />}
    </View>
  );

  const renderItem = ({item}) => {
    const checked = checkedIds.includes(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, item.highlighted && styles.cardHighlight]}
        onPress={() => toggleItem(item.id)}>
        <TouchableOpacity
          onPress={() => toggleItem(item.id)}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          {renderCheckbox(checked)}
        </TouchableOpacity>

        <View style={styles.bellCircle}>
          <Icon name="notifications" size={16} color={COLORS.text} />
        </View>

        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.header} />

      {/* Top App Header */}
      <View style={styles.appHeader}>
        <TouchableOpacity>
          <Icon name="menu" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.appTitle}>mokhsh</Text>

        <View style={styles.appHeaderRight}>
          <TouchableOpacity style={{marginRight: 14}}>
            <Icon name="notifications-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Icon name="person" size={18} color={COLORS.header} />
          </View>
        </View>
      </View>

      {/* Section Title Row */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Notification</Text>
        <TouchableOpacity>
          <MaterialIcon name="filter-variant" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Select All + Filter Dropdown */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.selectAllWrap} onPress={toggleSelectAll}>
          {renderCheckbox(selectAll)}
          <Text style={styles.selectAllText}>Select All</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterPill}>
          <Text style={styles.filterPillText}>{filter}</Text>
          <Icon name="chevron-down" size={16} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Notification List */}
      <FlatList
        data={NOTIFICATIONS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TabItem icon="chatbubble-ellipses-outline" label="Discussions" />
        <TabItem icon="finger-print-outline" label="Attendance" />
        <TabItem icon="mail-outline" label="Chat" />
        <TabItem icon="notifications" label="Notifications" active />
      </View>
    </SafeAreaView>
  );
};

const TabItem = ({icon, label, active}) => (
  <TouchableOpacity style={styles.tabItem}>
    <Icon
      name={icon}
      size={22}
      color={active ? COLORS.accent : COLORS.subText}
    />
    <Text style={[styles.tabLabel, active && {color: COLORS.accent}]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.header,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  appTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  appHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  selectAllWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    color: COLORS.text,
    marginLeft: 8,
    fontSize: 14,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterPillText: {
    color: COLORS.text,
    fontSize: 13,
    marginRight: 4,
    fontWeight: '600',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.subText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardHighlight: {
    backgroundColor: COLORS.cardHighlight,
  },
  bellCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginRight: 10,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: COLORS.subText,
    fontSize: 12,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.header,
    paddingVertical: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  tabItem: {
    alignItems: 'center',
  },
  tabLabel: {
    color: COLORS.subText,
    fontSize: 10,
    marginTop: 4,
  },
});

export default NotificationScreen;