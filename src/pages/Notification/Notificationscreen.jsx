/**
 * NotificationScreen.js
 *
 * React Native CLI screen — recreated from the "mokhsh" app notification design,
 * now with a date-range + user "advanced filter" modal (opened via the filter icon).
 *
 * Dependencies to install:
 *   npm install react-native-vector-icons @react-native-community/datetimepicker
 *   (iOS) cd ios && pod install
 *   For Android, make sure vector icons are linked in android/app/build.gradle:
 *     apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
 *
 * Auth:
 *   Requests go through the shared `api` instance (../../api/AxiosInstance),
 *   which attaches the `PM_TOKEN` bearer token from AsyncStorage on every
 *   request automatically — same as LeadsListScreen. Adjust the import path
 *   below if this file lives in a different folder.
 *
 * Usage:
 *   import NotificationScreen from './NotificationScreen';
 *   ...render <NotificationScreen /> inside your navigator or App.js
 */

import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import api from '../../api/AxiosInstance';

const SCREEN_HEIGHT = Dimensions.get('window').height;

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
const USERLIST_API_PATH = '/api/pm/getUserListOnly';

// label shown in dropdown -> query param value sent to the API
// (value: null means "All" -> no `type` param, fetches everything)
const FILTER_OPTIONS = [
  {label: 'All', value: null},
  {label: 'Assigned', value: 'ASG'},
  {label: 'Follow Up Date', value: 'FLOWUPDT'},
  {label: 'Site Visit Date', value: 'VISITDT'},
  {label: 'Reminder', value: 'REMINDER'},
];

// Strip basic HTML tags/entities from the API's `body` field.
const stripHtml = html =>
  (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();

const STATUS_OPTIONS = [
  {label: 'All', value: ''},
  {label: 'Unread', value: '1'},
  {label: 'Read', value: '2'},
];

const formatDate = date => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

// ─── Searchable user picker (From/To date + user list w/ search) ──────────
const UserPicker = ({users, loading, value, onSelect}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = !query
    ? users
    : users.filter(
        u =>
          u.name?.toLowerCase().includes(query.toLowerCase()) ||
          u.username?.toLowerCase().includes(query.toLowerCase()),
      );

  return (
    <View style={styles.field}>
      <Text style={styles.filterLabel}>User</Text>

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.filterInputContainer}
        onPress={() => setOpen(prev => !prev)}>
        <Text
          style={value ? styles.userValueText : styles.userPlaceholderText}
          numberOfLines={1}>
          {value ? value.name : 'Select user'}
        </Text>
        {value ? (
          <TouchableOpacity
            onPress={() => {
              onSelect(null);
              setQuery('');
            }}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <MaterialIcon name="close" size={16} color="#7a8fc4" />
          </TouchableOpacity>
        ) : (
          <MaterialIcon
            name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color="#00e5ff"
          />
        )}
      </TouchableOpacity>

      {open && (
        <View style={styles.userDropdownBox}>
          <View style={styles.userSearchRow}>
            <MaterialIcon name="search" size={16} color="#7a8fc4" />
            <TextInput
              placeholder="Search name or username..."
              placeholderTextColor="#7a8fc4"
              value={query}
              onChangeText={setQuery}
              style={styles.userSearchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {loading ? (
            <ActivityIndicator
              size="small"
              color="#00e5ff"
              style={{marginVertical: 14}}
            />
          ) : (
            <ScrollView
              style={styles.userListScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {filtered.length === 0 ? (
                <Text style={styles.userEmptyText}>No users found</Text>
              ) : (
                filtered.slice(0, 60).map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.userListItem}
                    onPress={() => {
                      onSelect(u);
                      setOpen(false);
                      setQuery('');
                    }}>
                    <Text style={styles.userListItemName}>{u.name}</Text>
                    <Text style={styles.userListItemUsername}>
                      @{u.username}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

const InputField = ({label, placeholder, icon, value, onPress}) => (
  <View style={styles.field}>
    <Text style={styles.filterLabel}>{label}</Text>
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <View style={styles.filterInputContainer}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#7a8fc4"
          style={styles.filterInput}
          value={value}
          editable={false}
          pointerEvents="none"
        />
        {icon && <MaterialIcon name={icon} size={18} color="#00bcd4" />}
      </View>
    </TouchableOpacity>
  </View>
);

// ─── Bottom-sheet advanced-filter modal (date range + user) ───────────────
const AdvancedFilterModal = ({
  visible,
  onClose,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  status,
  onStatusChange,
  selectedUser,
  onSelectUser,
  users,
  usersLoading,
  onApply,
  onReset,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [mounted, setMounted] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      slideAnim.setValue(SCREEN_HEIGHT);
      requestAnimationFrame(() => {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
        }).start();
      });
    } else if (mounted) {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setMounted(false);
      onClose();
    });
  };

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.bottomSheetOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.bottomSheet,
            {transform: [{translateY: slideAnim}]},
          ]}>
          <View style={styles.dragHandle} />

          <View style={styles.sheetHeaderRow}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <MaterialIcon name="filter-alt" size={18} color="#00e5ff" />
              <Text style={styles.modalTitle}>Filter Notifications</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <MaterialIcon name="close" size={20} color="#a0b4e8" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalDivider} />

          <ScrollView
            style={styles.filterScrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%'}}>
              <View style={{width: '48%'}}>
                <InputField
                  label="From Date"
                  placeholder="YYYY-MM-DD"
                  icon="calendar-today"
                  value={fromDate}
                  onPress={() => setShowFromPicker(true)}
                />
              </View>
              <View style={{width: '48%'}}>
                <InputField
                  label="To Date"
                  placeholder="YYYY-MM-DD"
                  icon="calendar-today"
                  value={toDate}
                  onPress={() => setShowToPicker(true)}
                />
              </View>
            </View>

            <UserPicker
              users={users}
              loading={usersLoading}
              value={selectedUser}
              onSelect={onSelectUser}
            />

            <View style={styles.field}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.statusChipRow}>
                {STATUS_OPTIONS.map(opt => {
                  const active = status === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      style={[
                        styles.statusChip,
                        active && styles.statusChipActive,
                      ]}
                      onPress={() => onStatusChange(opt.value)}>
                      <Text
                        style={[
                          styles.statusChipText,
                          active && styles.statusChipTextActive,
                        ]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {showFromPicker && (
              <DateTimePicker
                value={fromDate ? new Date(fromDate) : new Date()}
                mode="date"
                display="default"
                onChange={(e, d) => {
                  setShowFromPicker(false);
                  if (d) onFromDateChange(formatDate(d));
                }}
              />
            )}
            {showToPicker && (
              <DateTimePicker
                value={toDate ? new Date(toDate) : new Date()}
                mode="date"
                display="default"
                onChange={(e, d) => {
                  setShowToPicker(false);
                  if (d) onToDateChange(formatDate(d));
                }}
              />
            )}
            <View style={{height: 8}} />
          </ScrollView>

          <View style={styles.modalDivider} />

          <View style={styles.sheetBtnRow}>
            <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
              <MaterialIcon name="refresh" size={14} color="#ff6b6b" />
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>

            <View style={{flexDirection: 'row', gap: 10}}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={onApply}>
                <MaterialIcon name="check" size={14} color="#fff" />
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const NotificationScreen = ({setHideBottomNav}) => {
  const [selectAll, setSelectAll] = useState(false);
  const [checkedIds, setCheckedIds] = useState([]);
  const [filter, setFilter] = useState(FILTER_OPTIONS[0]); // {label, value}
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Advanced filter (From Date / To Date / User) ──
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [modalFromDate, setModalFromDate] = useState(null);
  const [modalToDate, setModalToDate] = useState(null);
  const [modalUser, setModalUser] = useState(null);
  const [modalStatus, setModalStatus] = useState('');
  const [advancedFilter, setAdvancedFilter] = useState({
    fromDate: null,
    toDate: null,
    user: null,
    status: '',
  });
  const [userList, setUserList] = useState([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const userListFetchedRef = useRef(false);

  const isAdvancedFilterActive =
    !!advancedFilter.fromDate ||
    !!advancedFilter.toDate ||
    !!advancedFilter.user ||
    !!advancedFilter.status;

  const toggleExpand = id => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const buildQueryParams = useCallback(() => {
    if (isAdvancedFilterActive) {
      const params = {type: 'FIL'};
      if (advancedFilter.fromDate) params.fromDate = advancedFilter.fromDate;
      if (advancedFilter.toDate) params.toDate = advancedFilter.toDate;
      if (advancedFilter.user) params.user = advancedFilter.user.username;
      if (advancedFilter.status) params.status = advancedFilter.status;
      return params;
    }
    return filter.value ? {type: filter.value} : undefined;
  }, [filter, advancedFilter, isAdvancedFilterActive]);

  const fetchNotifications = useCallback(async params => {
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line no-console
      console.log('[Notifications] fetch params ->', params);
      const res = await api.get(API_PATH, {params});
      const json = res.data;
      // eslint-disable-next-line no-console
      console.log('[Notifications] response filters ->', json?.filters, 'count ->', json?.uarray?.length);

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
    fetchNotifications(buildQueryParams());
    // reset selections when the filter changes
    setSelectAll(false);
    setCheckedIds([]);
    setExpandedIds([]);
  }, [filter, advancedFilter, fetchNotifications, buildQueryParams]);

  const selectFilter = option => {
    setFilter(option);
    setDropdownOpen(false);
    // quick category filter overrides the advanced (date/user) filter
    setAdvancedFilter({fromDate: null, toDate: null, user: null});
  };

  const fetchUserList = useCallback(async () => {
    if (userListFetchedRef.current) return;
    setUserListLoading(true);
    try {
      const res = await api.get(USERLIST_API_PATH);
      setUserList(res?.data?.data || []);
      userListFetchedRef.current = true;
    } catch (e) {
      // silent — the search box will just show "No users found"
    } finally {
      setUserListLoading(false);
    }
  }, []);

  const openFilterModal = () => {
    setModalFromDate(advancedFilter.fromDate);
    setModalToDate(advancedFilter.toDate);
    setModalUser(advancedFilter.user);
    setModalStatus(advancedFilter.status || '');
    fetchUserList();
    setHideBottomNav && setHideBottomNav(true);
    setFilterModalVisible(true);
  };

  const closeFilterModal = () => {
    setFilterModalVisible(false);
    setHideBottomNav && setHideBottomNav(false);
  };

  const applyAdvancedFilter = () => {
    setAdvancedFilter({
      fromDate: modalFromDate,
      toDate: modalToDate,
      user: modalUser,
      status: modalStatus,
    });
    closeFilterModal();
  };

  const resetAdvancedFilter = () => {
    setModalFromDate(null);
    setModalToDate(null);
    setModalUser(null);
    setModalStatus('');
    setAdvancedFilter({fromDate: null, toDate: null, user: null, status: ''});
    closeFilterModal();
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
        ids.map(id => api.post(STATUS_API_PATH, {chanstat: String(id), val})),
      );
      setCheckedIds([]);
      setSelectAll(false);
      await fetchNotifications(buildQueryParams());
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
              await fetchNotifications(buildQueryParams());
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

            <TouchableOpacity
              style={styles.filterIconBtn}
              onPress={openFilterModal}>
              <MaterialIcon name="filter-alt" size={22} color="#00e5ff" />
              {isAdvancedFilterActive && <View style={styles.filterActiveDot} />}
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
            <Text style={styles.filterPillText}>
              {isAdvancedFilterActive ? 'Filtered' : filter.label}
            </Text>
            <Icon
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.text}
            />
          </TouchableOpacity>

          {dropdownOpen && (
            <View style={styles.dropdown}>
              {FILTER_OPTIONS.map(option => {
                const active =
                  option.label === filter.label && !isAdvancedFilterActive;
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
          onRefresh={() => fetchNotifications(buildQueryParams())}
        />
      )}

      <AdvancedFilterModal
        visible={filterModalVisible}
        onClose={closeFilterModal}
        fromDate={modalFromDate}
        toDate={modalToDate}
        onFromDateChange={setModalFromDate}
        onToDateChange={setModalToDate}
        status={modalStatus}
        onStatusChange={setModalStatus}
        selectedUser={modalUser}
        onSelectUser={setModalUser}
        users={userList}
        usersLoading={userListLoading}
        onApply={applyAdvancedFilter}
        onReset={resetAdvancedFilter}
      />
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
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5C5C',
    borderWidth: 1,
    borderColor: COLORS.bg,
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

  /* ── Advanced filter modal (bottom sheet) ── */
  bottomSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    zIndex: 99999,
    elevation: 99999,
  },
  bottomSheet: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: '#1a1f6b',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: '#3d45b0',
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    elevation: 99999,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  filterScrollView: {
    width: '100%',
    flexGrow: 0,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#3d45b033',
    marginVertical: 10,
  },
  modalTitle: {
    color: '#00e5ff',
    fontSize: 15,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,82,82,0.35)',
    backgroundColor: 'rgba(255,82,82,0.1)',
  },
  resetBtnText: {color: '#ff6b6b', fontSize: 13, fontWeight: '500'},
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  cancelBtnText: {color: '#fff', fontWeight: '500', fontSize: 13},
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00acc1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
  },
  applyBtnText: {color: '#fff', fontWeight: '700', fontSize: 13},

  field: {marginBottom: 12, width: '100%'},
  filterLabel: {
    color: '#a0b4e8',
    fontSize: 12,
    marginBottom: 5,
    fontWeight: '500',
  },
  filterInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff12',
    borderWidth: 1,
    borderColor: '#3d55cc',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  filterInput: {flex: 1, color: '#fff', fontSize: 13, paddingVertical: 0},

  userPlaceholderText: {color: '#7a8fc4', fontSize: 13, flex: 1},
  userValueText: {color: '#fff', fontSize: 13, flex: 1, marginRight: 8},
  userDropdownBox: {
    marginTop: 6,
    backgroundColor: '#151a54',
    borderWidth: 1,
    borderColor: '#3d55cc',
    borderRadius: 8,
    padding: 8,
  },
  userSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff12',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 34,
    marginBottom: 6,
  },
  userSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    marginLeft: 6,
    paddingVertical: 0,
  },
  userListScroll: {
    maxHeight: 180,
  },
  userListItem: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff10',
  },
  userListItemName: {color: '#fff', fontSize: 13, fontWeight: '600'},
  userListItemUsername: {color: '#7a8fc4', fontSize: 11, marginTop: 1},
  userEmptyText: {
    color: '#7a8fc4',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  statusChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3d55cc',
    backgroundColor: '#ffffff12',
  },
  statusChipActive: {
    backgroundColor: '#00acc1',
    borderColor: '#00acc1',
  },
  statusChipText: {
    color: '#a0b4e8',
    fontSize: 13,
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#fff',
  },
});

export default NotificationScreen;