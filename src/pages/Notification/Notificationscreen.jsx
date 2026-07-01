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
 * Auth:
 *   Requests go through the shared `api` instance (../api/AxiosInstance),
 *   which attaches the `PM_TOKEN` bearer token from AsyncStorage on every
 *   request automatically — same as LeadsListScreen. Adjust the import path
 *   below (`../api/AxiosInstance`) if this file lives in a different folder.
 *
 * Usage:
 *   import NotificationScreen from './NotificationScreen';
 *   ...render <NotificationScreen /> inside your navigator or App.js
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import api from '../../api/AxiosInstance';

const COLORS = {
  bg: '#070c4d',
  header: '#241A5C',
  card: '#2C2166',
  cardHighlight: '#ffffff57',
  accent: '#2488B5',
  accentt: '#B8B0E0',
  text: '#FFFFFF',
  subText: '#B8B0E0',
  pill: '#2C2166',
  border: '#3A2C8C',
};

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API_PATH = '/api/pm/fetchNotification';
const STATUS_API_PATH = '/api/pm/changeStatusOfNotification';
const DELETE_API_PATH = '/api/pm/deleteNotification';

// label shown in dropdown -> query param value sent to the API
// (value: null means "All" -> no `type` param, fetches everything)
const FILTER_OPTIONS = [
  {label: 'All', value: null},
  {label: 'Assigned', value: 'ASG'},
  {label: 'Follow Up Date', value: 'FLOWUPDT'},
  {label: 'Site Visit Date', value: 'VISITDT'},
  {label: 'Reminder', value: 'REMINDER'},
];

// Strip basic HTML tags/entities from the API's `body` field, if you ever
// want to show it (currently only `subject` + `created_at` are shown).
const stripHtml = html =>
  (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();

const NotificationScreen = () => {
  const [selectAll, setSelectAll] = useState(false);
  const [checkedIds, setCheckedIds] = useState([]);
  const [filter, setFilter] = useState(FILTER_OPTIONS[0]); // {label, value}
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const toggleExpand = id => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const fetchNotifications = useCallback(async type => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(API_PATH, {
        params: type ? {type} : undefined,
      });
      const json = res.data;

      if (json?.status === false) {
        throw new Error(json?.error || 'Failed to load notifications');
      }

      setNotifications(json?.uarray || []);
    } catch (e) {
      const message =
        e?.response?.data?.error || e?.message || 'Failed to load notifications';
      setError(message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(filter.value);
    // reset selections when the filter changes
    setSelectAll(false);
    setCheckedIds([]);
    setExpandedIds([]);
  }, [filter, fetchNotifications]);

  const selectFilter = option => {
    setFilter(option);
    setDropdownOpen(false);
  };

  // val: 2 = read, 1 = unread
  const changeStatus = async (ids, val) => {
    if (!ids.length) {
      Alert.alert('Select notifications', 'Please select at least one notification first.');
      return;
    }
    setActionLoading(true);
    try {
      await Promise.all(
        ids.map(id =>
          api.post(STATUS_API_PATH, {chanstat: String(id), val}),
        ),
      );
      setCheckedIds([]);
      setSelectAll(false);
      await fetchNotifications(filter.value);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkRead = () => changeStatus(checkedIds, 2);
  const handleMarkUnread = () => changeStatus(checkedIds, 1);
  const handleMarkAllRead = () =>
    changeStatus(
      notifications.map(n => n.id),
      2,
    );

  // Silently mark a single notification as read (no alert, no full refetch —
  // just update local state so the UI reflects it immediately).
  const markReadSilently = async id => {
    try {
      await api.post(STATUS_API_PATH, {chanstat: String(id), val: 2});
      setNotifications(prev =>
        prev.map(n => (n.id === id ? {...n, stat: 2} : n)),
      );
    } catch (e) {
      // fail silently — the item just stays marked unread, user can retry
    }
  };

  const handleCardPress = item => {
    const willExpand = !expandedIds.includes(item.id);
    toggleExpand(item.id);
    if (willExpand && item.stat === 1) {
      markReadSilently(item.id);
    }
  };

  const handleDeleteSelected = () => {
    if (!checkedIds.length) {
      Alert.alert('Select notifications', 'Please select at least one notification first.');
      return;
    }
    Alert.alert(
      'Delete notifications',
      `Delete ${checkedIds.length} selected notification(s)? They will be moved to trash.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await Promise.all(
                checkedIds.map(id =>
                  api.post(DELETE_API_PATH, {chanstat: String(id), id: 0}),
                ),
              );
              setCheckedIds([]);
              setSelectAll(false);
              await fetchNotifications(filter.value);
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.message || 'Failed to delete');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const toggleSelectAll = () => {
    const next = !selectAll;
    setSelectAll(next);
    setCheckedIds(next ? notifications.map(n => n.id) : []);
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
    const unread = item.stat === 1;
    const expanded = expandedIds.includes(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, unread && styles.cardHighlight]}
        onPress={() => handleCardPress(item)}>
        <View style={styles.cardRow}>
          <TouchableOpacity
            onPress={() => toggleItem(item.id)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            {renderCheckbox(checked)}
          </TouchableOpacity>

          <View style={styles.bellCircle}>
            <Icon name="notifications" size={16} color={COLORS.text} />
          </View>

          <View style={styles.cardTextWrap}>
            <Text
              style={[styles.cardTitle, unread && styles.cardTitleUnread]}
              numberOfLines={expanded ? undefined : 2}>
              {item.subject}
            </Text>
            <Text style={styles.cardSubtitle}>{item.created_at}</Text>
          </View>

          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={COLORS.subText}
          />
        </View>

        {expanded && (
          <View style={styles.bodyWrap}>
            <Text style={styles.bodyText}>{stripHtml(item.body)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Section Title Row — styled like LeadsListScreen topBar */}
      <View style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Icon name="notifications" size={18} color="#cfd8dc" />
            <Text style={styles.sectionTitle}>Notification</Text>
          </View>

          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {actionLoading && (
              <ActivityIndicator
                size="small"
                color="#00e5ff"
                style={{marginRight: 10}}
              />
            )}

            <TouchableOpacity
              style={styles.topBarIconBtn}
              disabled={actionLoading}
              onPress={handleDeleteSelected}>
              <Icon name="trash-outline" size={24} color="#cfd8dc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.topBarIconBtn}
              disabled={actionLoading}
              onPress={handleMarkRead}>
              <Icon name="mail-open" size={24} color="#cfd8dc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.topBarIconBtn}
              disabled={actionLoading}
              onPress={handleMarkUnread}>
              <Icon name="mail-unread-outline" size={24} color="#cfd8dc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.topBarIconBtn}
              disabled={actionLoading}
              onPress={handleMarkAllRead}>
              <MaterialIcon name="mark-email-read" size={24} color="#cfd8dc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterIconBtn}>
              <MaterialIcon name="filter-alt" size={22} color="#00e5ff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Select All + Filter Dropdown */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.selectAllWrap} onPress={toggleSelectAll}>
          {renderCheckbox(selectAll)}
          <Text style={styles.selectAllText}>Select All</Text>
        </TouchableOpacity>

        <View>
          <TouchableOpacity
            style={styles.filterPill}
            onPress={() => setDropdownOpen(prev => !prev)}>
            <Text style={styles.filterPillText}>{filter.label}</Text>
            <Icon
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.text}
            />
          </TouchableOpacity>

          {dropdownOpen && (
            <View style={styles.dropdown}>
              {FILTER_OPTIONS.map(option => {
                const active = option.label === filter.label;
                return (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.dropdownItem,
                      active && styles.dropdownItemActive,
                    ]}
                    onPress={() => selectFilter(option)}>
                    <Text
                      style={[
                        styles.dropdownItemText,
                        active && styles.dropdownItemTextActive,
                      ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Tap outside to close dropdown */}
      {dropdownOpen && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setDropdownOpen(false)}
        />
      )}

      {/* Notification List */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerWrap}>
          <Text style={styles.emptyText}>No notifications found</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={() => fetchNotifications(filter.value)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topBarContainer: {
    paddingHorizontal: 15,
    marginTop: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff15',
    padding: 10,
    borderRadius: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#cfd8dc',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
  filterIconBtn: {
    borderWidth: 1,
    borderColor: '#00e5ff',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarIconBtn: {
    marginRight: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    zIndex: 30,
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
  dropdown: {
    position: 'absolute',
    top: 36,
    right: 0,
    minWidth: 130,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingVertical: 6,
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 6,
  },
  dropdownItem: {
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.accent,
  },
  dropdownItemText: {
    color: COLORS.subText,
    fontSize: 13,
  },
  dropdownItemTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
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
    backgroundColor: COLORS.accentt,
    borderColor: COLORS.accentt,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    color: COLORS.subText,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHighlight: {
    backgroundColor: COLORS.cardHighlight,
  },
  bodyWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  bodyText: {
    color: COLORS.subText,
    fontSize: 13,
    lineHeight: 19,
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
    position: 'relative',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  cardTitleUnread: {
    fontWeight: '800',
  },
  cardSubtitle: {
    color: COLORS.subText,
    fontSize: 12,
    marginTop: 2,
  },
});

export default NotificationScreen;