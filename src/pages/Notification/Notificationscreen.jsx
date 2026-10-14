/**
 * NotificationScreen.js
 *
 * Design = first Notification page (header pill, left-border cards, round
 * checkboxes, blue filter pill, bottom-sheet filter).
 * Header pill is now the same as ChangeRM / Leads List / Assign RM.
 * Logic / API calls are unchanged:
 *  - Quick filter dropdown shows unread counts from Redux `unreadCounts`.
 *  - Advanced filter (From/To date, User, Status) opens as a bottom sheet.
 *  - After read / unread / delete, `syncBadge()` refreshes counts + iOS badge.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import api from '../../api/AxiosInstance';
import { syncBadge } from './syncBadge';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (SCREEN_HEIGHT / 812) * size;

// ─── COLORS (first page theme) ───────────────────────────────────────────────

const COLORS = {
  bg: '#1a2d3e',
  card: 'rgba(4, 35, 70, 0.62)',
  cardHighlight: 'rgba(255, 255, 255, 0.11)',
  accent: '#4aa3df',
  accentt: '#4aa3df',
  text: '#FFFFFF',
  subText: '#afaea5',
  pill: '#2b3348',
  border: 'rgba(255,255,255,0.15)',
  panel: '#2b3348',
  panelBorder: '#39415a',
  // used by the custom alert
  white: '#FFFFFF',
  mutedText: '#8A90B4',
  gold: '#f4c542',
  green: '#00C48C',
  red: '#FF6B6B',
  borderColor: '#ffffff20',
  modalBg: '#21283a',
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
const PAGE_LIMIT = 20;

// label shown in dropdown -> query param value sent to the API
// (value: null means "All" -> no `type` param, fetches everything)
const FILTER_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Assign Leads', value: 'ASGLEAD' },
  { label: 'Follow Up Date', value: 'FLOWUPDT' },
  { label: 'Site Visit Date', value: 'VISITDT' },
];

// dropdown option value -> Redux unreadCounts key
const COUNT_KEY = {
  ASGLEAD: 'assigned_lead',
  FLOWUPDT: 'follow_up_date',
  VISITDT: 'site_visit_date',
};

// Strip basic HTML tags/entities from the API's `body` field.
const stripHtml = html =>
  (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Unread', value: '1' },
  { label: 'Read', value: '2' },
];

// When the quick filter is "All", only show the allowed categories —
// regardless of whether an advanced filter is active.
const ALLOWED_TYPES = FILTER_OPTIONS.filter(o => o.value).map(o => o.value);

const formatDate = date => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const parseDate = str => {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, m - 1, d);
};

// ─── CUSTOM ALERT ────────────────────────────────────────────────────────────

let _alertHandler = null;

const showAlert = (title, message, buttons, options) => {
  if (_alertHandler) {
    _alertHandler({ title, message, buttons, options });
  } else {
    Alert.alert(title, message, buttons, options);
  }
};

const ALERT_TYPES = {
  success: { icon: 'check-circle', color: COLORS.green },
  error: { icon: 'error', color: COLORS.red },
  warning: { icon: 'warning', color: COLORS.gold },
  danger: { icon: 'delete-forever', color: COLORS.red },
  contact: { icon: 'contact-phone', color: COLORS.accent },
  info: { icon: 'info', color: COLORS.accent },
};

const parseAlert = (title = '', buttons = []) => {
  const raw = String(title);
  let type = 'info';
  if (raw.startsWith('\u2705') || raw.startsWith('\uD83C\uDF89')) type = 'success';
  else if (raw.startsWith('\u274C')) type = 'error';
  else if (raw.startsWith('\u26A0')) type = 'warning';
  else if (/^success$/i.test(raw)) type = 'success';
  else if (/^(error|permission denied)$/i.test(raw)) type = 'error';
  else if (/^contact$/i.test(raw)) type = 'contact';
  else if (buttons.some(b => b.style === 'destructive')) type = 'danger';
  const cleanTitle = raw.replace(/^(?:[\u2705\u274C\u26A0]\uFE0F?|\uD83C\uDF89)\s*/, '');
  return { type, cleanTitle };
};

const CustomAlertHost = () => {
  const [config, setConfig] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    _alertHandler = cfg => {
      setConfig(cfg);
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 16,
        stiffness: 190,
      }).start();
    };
    return () => { _alertHandler = null; };
  }, [anim]);

  const close = cb => {
    Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setConfig(null);
      cb && cb();
    });
  };

  if (!config) return null;

  const buttons = config.buttons?.length ? config.buttons : [{ text: 'OK' }];
  const { type, cleanTitle } = parseAlert(config.title, buttons);
  const t = ALERT_TYPES[type];
  const cancelable = config.options?.cancelable !== false;
  const stacked = buttons.length > 2;
  const cancelBtns = buttons.filter(b => b.style === 'cancel');
  const otherBtns = buttons.filter(b => b.style !== 'cancel');
  const ordered = stacked ? [...otherBtns, ...cancelBtns] : [...cancelBtns, ...otherBtns];
  const message = config.message ? String(config.message) : '';
  const longMessage = message.includes('\n');

  const dismiss = () => {
    if (!cancelable) return;
    close(() => config.options?.onDismiss && config.options.onDismiss());
  };

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const alertScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View style={[styles.alertOverlay, { opacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismiss} />

        <Animated.View style={[styles.alertBox, { opacity, transform: [{ scale: alertScale }] }]}>
          <View style={[styles.alertTopBar, { backgroundColor: t.color }]} />

          <View style={[styles.alertIconWrap, { backgroundColor: t.color + '1f', borderColor: t.color + '55' }]}>
            <MaterialIcon name={t.icon} size={26} color={t.color} />
          </View>

          <Text style={styles.alertTitle}>{cleanTitle}</Text>

          {message ? (
            <ScrollView
              style={styles.alertMsgScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={[styles.alertMessage, longMessage && { textAlign: 'left' }]}>{message}</Text>
            </ScrollView>
          ) : null}

          <View style={[styles.alertBtnRow, stacked && { flexDirection: 'column' }]}>
            {ordered.map((btn, i) => {
              const isSolo = buttons.length === 1;
              const isCancel = btn.style === 'cancel' && !isSolo;
              const isDestructive = btn.style === 'destructive';
              const bg = isCancel
                ? 'rgba(255,255,255,0.08)'
                : isDestructive || type === 'danger'
                  ? COLORS.red
                  : t.color;
              const txtColor = isCancel ? COLORS.white : isDestructive || type === 'danger' ? '#fff' : '#06104a';
              return (
                <TouchableOpacity
                  key={`${btn.text}-${i}`}
                  activeOpacity={0.8}
                  style={[
                    styles.alertBtn,
                    !stacked && { flex: 1 },
                    { backgroundColor: bg },
                    isCancel && { borderWidth: 1, borderColor: COLORS.borderColor },
                  ]}
                  onPress={() => close(() => btn.onPress && btn.onPress())}
                >
                  <Text style={[styles.alertBtnText, { color: txtColor }]}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Labeled action button (shown on the Select All line) ────────────────────

const ActionBtn = ({ icon, label, color, onPress, disabled }) => (
  <TouchableOpacity
    style={[
      styles.actionBtn,
      { backgroundColor: color + '22' },
      disabled && { opacity: 0.5 },
    ]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
  >
    <Icon name={icon} size={18} color={color} />
    <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Searchable user picker (inline dropdown) ────────────────────────────────

const UserPicker = ({ users, loading, value, onSelect }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const q = query.toLowerCase();
  const filtered = !q
    ? users
    : users.filter(
        u =>
          String(u.name ?? '').toLowerCase().includes(q) ||
          String(u.username ?? '').toLowerCase().includes(q),
      );
  const selectedUser = users.find(u => u.id === value);

  return (
    <View style={styles.field}>
      <Text style={styles.filterLabel}>User</Text>

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.filterInputContainer}
        onPress={() => setOpen(prev => !prev)}
      >
        <Text
          style={value ? styles.userValueText : styles.userPlaceholderText}
          numberOfLines={1}
        >
          {selectedUser ? selectedUser.name : 'Select user'}
        </Text>
        {value ? (
          <TouchableOpacity
            onPress={() => {
              onSelect(null);
              setQuery('');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcon name="close" size={16} color="#8a9daf" />
          </TouchableOpacity>
        ) : (
          <MaterialIcon
            name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color="#8a9daf"
          />
        )}
      </TouchableOpacity>

      {open && (
        <View style={styles.userDropdownBox}>
          <View style={styles.userSearchRow}>
            <MaterialIcon name="search" size={16} color="#8a9daf" />
            <TextInput
              placeholder="Search name..."
              placeholderTextColor="#8a9daf"
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
              color="#4aa3df"
              style={{ marginVertical: 14 }}
            />
          ) : (
            <ScrollView
              style={styles.userListScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {filtered.length === 0 ? (
                <Text style={styles.userEmptyText}>No users found</Text>
              ) : (
                filtered.slice(0, 60).map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.userListItem}
                    onPress={() => {
                      onSelect(u.id);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    <Text style={styles.userListItemName}>{u.name}</Text>
                    {u.username ? (
                      <Text style={styles.userListItemSub}>@{u.username}</Text>
                    ) : null}
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

// ─── Status dropdown ─────────────────────────────────────────────────────────

const StatusPicker = ({ value, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selected =
    STATUS_OPTIONS.find(opt => opt.value === value) || STATUS_OPTIONS[0];

  return (
    <View style={styles.field}>
      <Text style={styles.filterLabel}>Status</Text>

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.filterInputContainer}
        onPress={() => setOpen(prev => !prev)}
      >
        <Text style={styles.userValueText}>{selected.label}</Text>
        <MaterialIcon
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color="#8a9daf"
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.userDropdownBox}>
          {STATUS_OPTIONS.map(opt => {
            const active = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[
                  styles.statusDropdownItem,
                  active && styles.statusDropdownItemActive,
                ]}
                onPress={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.statusDropdownItemText,
                    active && styles.statusDropdownItemTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {active && (
                  <MaterialIcon name="check" size={16} color="#4aa3df" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

// ─── INPUT FIELD ─────────────────────────────────────────────────────────────

const InputField = ({ label, placeholder, icon, value, onPress }) => (
  <View style={styles.field}>
    <Text style={styles.filterLabel}>{label}</Text>
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <View style={styles.filterInputContainer}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#8a9daf"
          style={styles.filterInput}
          value={value || ''}
          editable={false}
          pointerEvents="none"
        />
        {icon && <MaterialIcon name={icon} size={18} color="#1482cc" />}
      </View>
    </TouchableOpacity>
  </View>
);

// ─── ADVANCED FILTER (bottom sheet) ──────────────────────────────────────────

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
  const [kbHeight, setKbHeight] = useState(0);

  // iOS: own spinner panel (one tap). Android keeps its native dialog.
  const isIOS = Platform.OS === 'ios';
  const [iosPicker, setIosPicker] = useState(null); // 'from' | 'to' | null
  const [tempDate, setTempDate] = useState(new Date());

  const openPicker = which => {
    const current = which === 'from' ? fromDate : toDate;
    if (isIOS) {
      setTempDate(current ? parseDate(current) : new Date());
      setIosPicker(which);
    } else if (which === 'from') {
      setShowFromPicker(true);
    } else {
      setShowToPicker(true);
    }
  };

  const confirmIosPicker = () => {
    const formatted = formatDate(tempDate);
    if (iosPicker === 'from') onFromDateChange(formatted);
    else onToDateChange(formatted);
    setIosPicker(null);
  };

  // Android: handle keyboard height manually
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', e =>
      setKbHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setKbHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        enabled={Platform.OS === 'ios'}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottomSheetOverlay}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: slideAnim }],
              marginBottom: Platform.OS === 'android' ? kbHeight : 0,
              maxHeight: Math.min(
                SCREEN_HEIGHT * 0.85,
                SCREEN_HEIGHT - kbHeight - 60,
              ),
            },
          ]}
        >
          <View style={styles.dragHandle} />

          <View style={styles.sheetHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcon name="filter-alt" size={18} color="#00e5ff" />
              <Text style={styles.modalTitle}>Filter Notifications</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <MaterialIcon name="close" size={20} color="#9aa8bd" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalDivider} />

          <ScrollView
            style={styles.filterScrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <View style={{ width: '48%' }}>
                <InputField
                  label="From Date"
                  placeholder="YYYY-MM-DD"
                  icon="calendar-today"
                  value={fromDate}
                  onPress={() => openPicker('from')}
                />
              </View>
              <View style={{ width: '48%' }}>
                <InputField
                  label="To Date"
                  placeholder="YYYY-MM-DD"
                  icon="calendar-today"
                  value={toDate}
                  onPress={() => openPicker('to')}
                />
              </View>
            </View>

            <UserPicker
              users={users}
              loading={usersLoading}
              value={selectedUser}
              onSelect={onSelectUser}
            />

            <StatusPicker
              value={status}
              onSelect={v => onStatusChange(v ?? '')}
            />

            {showFromPicker && (
              <DateTimePicker
                value={fromDate ? parseDate(fromDate) : new Date()}
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
                value={toDate ? parseDate(toDate) : new Date()}
                mode="date"
                display="default"
                onChange={(e, d) => {
                  setShowToPicker(false);
                  if (d) onToDateChange(formatDate(d));
                }}
              />
            )}
            <View style={{ height: 8 }} />
          </ScrollView>

          <View style={styles.modalDivider} />

          <View style={styles.sheetBtnRow}>
            <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
              <MaterialIcon name="refresh" size={14} color="#ff6b6b" />
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={onApply}>
                <MaterialIcon name="check" size={14} color="#fff" />
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isIOS && iosPicker && (
            <View style={styles.iosPickerPanel}>
              <Text style={styles.iosPickerTitle}>
                {iosPicker === 'from' ? 'From Date' : 'To Date'}
              </Text>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                themeVariant="dark"
                textColor="#ffffff"
                onChange={(e, d) => {
                  if (d) setTempDate(d);
                }}
                style={styles.iosPicker}
              />
              <View style={styles.iosPickerBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIosPicker(null)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={confirmIosPicker}
                >
                  <MaterialIcon name="check" size={14} color="#fff" />
                  <Text style={styles.applyBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

const NotificationScreen = ({ setHideBottomNav, navigation }) => {
  // per-type unread counts from Redux
  const unreadCounts = useSelector(state => state.unreadCounts);

  const [selectAll, setSelectAll] = useState(false);
  const [checkedIds, setCheckedIds] = useState([]);
  const [filter, setFilter] = useState(FILTER_OPTIONS[0]); // {label, value}
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Pagination / infinite scroll ──
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);

  // ── Advanced filter (From Date / To Date / User / Status) ──
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

  // Restrict to known types whenever the quick filter is plain "All".
  const shouldRestrictToKnownTypes = filter.value === null;

  const toggleExpand = id => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const buildQueryParams = useCallback(() => {
    const params = {
      type: filter.value, // always include type
    };

    if (isAdvancedFilterActive) {
      if (advancedFilter.fromDate) params.fromDate = advancedFilter.fromDate;
      if (advancedFilter.toDate) params.toDate = advancedFilter.toDate;
      if (advancedFilter.user) params.user = advancedFilter.user;
    }

    if (advancedFilter.status) {
      params.status = advancedFilter.status;
    }

    return params;
  }, [filter, advancedFilter, isAdvancedFilterActive]);

  const fetchNotifications = useCallback(
    async (params, restrictToKnownTypes = false, pageNum = 1) => {
      const isFirstPage = pageNum === 1;
      if (isFirstPage) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const res = await api.get(API_PATH, {
          params: { ...params, page: pageNum, limit: PAGE_LIMIT },
        });
        const json = res.data;

        if (json?.status === false) {
          throw new Error(json?.error || 'Failed to load notifications');
        }

        const rawList = json?.uarray || [];
        // hasMore raw list diye check hobe (client-side filter er age)
        setHasMore(rawList.length >= PAGE_LIMIT);
        pageRef.current = pageNum;

        let list = rawList;
        if (restrictToKnownTypes) {
          list = list.filter(n => ALLOWED_TYPES.includes(n.type));
        }

        if (isFirstPage) {
          setNotifications(list);
        } else {
          setNotifications(prev => {
            const seen = new Set(prev.map(n => n.id));
            return [...prev, ...list.filter(n => !seen.has(n.id))];
          });
        }
      } catch (e) {
        if (isFirstPage) {
          const message =
            e?.response?.data?.error ||
            e?.message ||
            'Failed to load notifications';
          setError(message);
          setNotifications([]);
          setHasMore(false);
        }
      } finally {
        if (isFirstPage) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [],
  );

  const loadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchNotifications(
      buildQueryParams(),
      shouldRestrictToKnownTypes,
      pageRef.current + 1,
    );
  };

  useEffect(() => {
    fetchNotifications(buildQueryParams(), shouldRestrictToKnownTypes);
    // reset selections when the filter changes
    setSelectAll(false);
    setCheckedIds([]);
    setExpandedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, advancedFilter, fetchNotifications, buildQueryParams]);

  // Screen khulle count fresh kore nao
  useEffect(() => {
    syncBadge();
  }, []);

  const selectFilter = option => {
    setFilter(option);
    setDropdownOpen(false);
    // quick category filter overrides the advanced (date/user/status) filter
    setAdvancedFilter({
      fromDate: null,
      toDate: null,
      user: null,
      status: '',
    });
  };

  const fetchUserList = useCallback(async () => {
    if (userListFetchedRef.current) return;
    setUserListLoading(true);
    try {
      const res = await api.get(USERLIST_API_PATH);
      setUserList(res?.data?.data || []);
      userListFetchedRef.current = true;
    } catch (e) {
      // silent — the picker will just show "No users found"
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
    setAdvancedFilter({ fromDate: null, toDate: null, user: null, status: '' });
    closeFilterModal();
  };

  // val: 2 = read, 1 = unread
  const changeStatus = async (ids, val) => {
    if (!ids.length) {
      showAlert(
        '⚠️ Select notifications',
        'Please select at least one notification first.',
      );
      return;
    }
    setActionLoading(true);
    try {
      await Promise.all(
        ids.map(id => api.post(STATUS_API_PATH, { chanstat: String(id), val })),
      );
      setCheckedIds([]);
      setSelectAll(false);
      await fetchNotifications(buildQueryParams(), shouldRestrictToKnownTypes);
      syncBadge(); // refresh counts + iOS badge
    } catch (e) {
      showAlert(
        'Error',
        e?.response?.data?.message || 'Failed to update status',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkRead = () => changeStatus(checkedIds, 2);
  const handleMarkUnread = () => changeStatus(checkedIds, 1);

  // Silently mark a single notification as read (local state update only).
  const markReadSilently = async id => {
    try {
      await api.post(STATUS_API_PATH, { chanstat: String(id), val: 2 });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, stat: 2 } : n)),
      );
      syncBadge(); // refresh counts + iOS badge
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
      showAlert(
        '⚠️ Select notifications',
        'Please select at least one notification first.',
      );
      return;
    }
    showAlert(
      'Delete notifications',
      `Delete ${checkedIds.length} selected notification(s)? They will be moved to trash.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await Promise.all(
                checkedIds.map(id =>
                  api.post(DELETE_API_PATH, { chanstat: String(id), id: 0 }),
                ),
              );
              setCheckedIds([]);
              setSelectAll(false);
              await fetchNotifications(
                buildQueryParams(),
                shouldRestrictToKnownTypes,
              );
              syncBadge(); // refresh counts + iOS badge
            } catch (e) {
              showAlert(
                'Error',
                e?.response?.data?.message || 'Failed to delete',
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
      { cancelable: true },
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications(buildQueryParams(), shouldRestrictToKnownTypes, 1);
    syncBadge();
    setRefreshing(false);
  };

  // checkboxes are hidden until a card is long-pressed (selection mode)
  const selectionMode = checkedIds.length > 0;

  const clearSelection = () => {
    setCheckedIds([]);
    setSelectAll(false);
  };

  const renderCheckbox = checked => (
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <MaterialIcon name="check" size={13} color="#fff" />}
    </View>
  );

  const renderItem = ({ item }) => {
    const checked = checkedIds.includes(item.id);
    const unread = item.stat === 1;
    const expanded = expandedIds.includes(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, !unread && styles.cardHighlight]}
        onPress={() =>
          selectionMode ? toggleItem(item.id) : handleCardPress(item)
        }
        onLongPress={() => {
          if (!checked) toggleItem(item.id);
        }}
        delayLongPress={350}
      >
        <View style={styles.cardRow}>
          {/* Circle only shows in selection mode */}
          {selectionMode && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleItem(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[
                styles.leadCircle,
                styles.leadCircleSelecting,
                checked && styles.leadCircleChecked,
              ]}
            >
              {checked && <MaterialIcon name="check" size={14} color="#fff" />}
            </TouchableOpacity>
          )}

          <View style={styles.cardTextWrap}>
            <Text
              style={[styles.cardTitle, unread && styles.cardTitleUnread]}
              numberOfLines={expanded ? undefined : 2}
            >
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

  const listData = loading && !refreshing ? [] : notifications;

  return (
    <View style={styles.rootWrap}>
      {/* Fixed background + overlay */}
      <Image
        source={require('../../asset/image/bg-img.png')}
        style={styles.bgImageFixed}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />

        {/* TOP BAR: [back + icon + title] ............ [filter] (same as ChangeRM) */}
        <View style={[styles.topBarContainer, { paddingTop: verticalScale(10) }]}>
          <View style={styles.topBar}>
            <View style={styles.leftHeader}>
              {navigation?.goBack && (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon
                    name="chevron-back"
                    size={20}
                    color="#fff"
                    style={styles.backIcon}
                  />
                </TouchableOpacity>
              )}
              <Icon name="notifications-outline" size={20} color="#ffffff" />
              <Text style={styles.screenTitle} numberOfLines={1}>
                Notification
              </Text>
            </View>

            <View style={styles.sectionActions}>
              {actionLoading && (
                <ActivityIndicator size="small" color={COLORS.accent} />
              )}

              <TouchableOpacity
                style={styles.filterIconBtn}
                onPress={openFilterModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcon name="filter-alt" size={20} color="#00e5ff" />
                {isAdvancedFilterActive && (
                  <View style={styles.filterActiveDot} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Select All + Quick filter ── */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.selectAllWrap} onPress={toggleSelectAll}>
            {renderCheckbox(selectAll)}
            <Text
              style={[
                styles.selectAllText,
                checkedIds.length > 0 && styles.selectionCountText,
              ]}
            >
              {checkedIds.length > 0
                ? `${checkedIds.length} selected`
                : 'Select All'}
            </Text>
          </TouchableOpacity>

          {selectionMode ? (
            <View style={styles.actionsRow}>
              <ActionBtn
                icon="mail-open-outline"
                label="Read"
                color="#ffffff"
                disabled={actionLoading}
                onPress={handleMarkRead}
              />
              <ActionBtn
                icon="mail-unread-outline"
                label="Unread"
                color="#4aa3df"
                disabled={actionLoading}
                onPress={handleMarkUnread}
              />
              <ActionBtn
                icon="trash-outline"
                label="Delete"
                color="#ff6b6b"
                disabled={actionLoading}
                onPress={handleDeleteSelected}
              />
              <TouchableOpacity
                style={styles.cancelSelBtn}
                onPress={clearSelection}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={18} color="#cfd8dc" />
              </TouchableOpacity>
            </View>
          ) : (
          <View>
            <TouchableOpacity
              style={styles.filterPill}
              onPress={() => setDropdownOpen(prev => !prev)}
            >
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
                  const count = option.value
                    ? unreadCounts?.[COUNT_KEY[option.value]] || 0
                    : 0;
                  return (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.dropdownItem,
                        active && styles.dropdownItemActive,
                      ]}
                      onPress={() => selectFilter(option)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          active && styles.dropdownItemTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {count > 0 && (
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>
                            {count > 99 ? '99+' : count}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
          )}
        </View>

        {/* Tap outside to close dropdown */}
        {dropdownOpen && !selectionMode && (
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setDropdownOpen(false)}
          />
        )}

        {/* ── Notification List ── */}
        <FlatList
          data={listData}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            loading ? (
              <View style={styles.centerWrap}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            ) : (
              <View style={styles.centerWrap}>
                <Icon
                  name="notifications-outline"
                  size={48}
                  color="rgba(255,255,255,0.25)"
                />
                <Text style={[styles.emptyText, { marginTop: 12 }]}>
                  {error || 'No notifications found'}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={{ marginVertical: 16 }}
              />
            ) : (
              <View style={{ height: 20 }} />
            )
          }
        />

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

        {/* ── Custom Alert ── */}
        <CustomAlertHost />
      </SafeAreaView>
    </View>
  );
};

export default NotificationScreen;

// ─── STYLES (first page design) ──────────────────────────────────────────────

const styles = StyleSheet.create({
  rootWrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  bgImageFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: Dimensions.get('screen').height,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: Dimensions.get('screen').height,
    backgroundColor: 'rgba(18,32,48,0.72)',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  /* ── Header pill (same as ChangeRM) ── */
  topBarContainer: {
    paddingHorizontal: scale(10),
    paddingBottom: verticalScale(10),
  },
  topBar: {
    height: 42,
    borderRadius: scale(22),
    backgroundColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(14),
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  backBtn: {
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#ffffff',
  },
  screenTitle: {
    color: '#ffffff',
    fontSize: 17,
    marginLeft: 6,
    fontWeight: '700',
    flexShrink: 1,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: { padding: 2 },
  filterIconBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ff4d4d',
  },

  /* ── Select All + filter pill ── */
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 16,
    marginBottom: 6,
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
    minWidth: 84,
  },
  selectionCountText: {
    fontWeight: '700',
    color: '#7cc4f2',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
    paddingHorizontal: 6,
    minWidth: 50,
    height: 38,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  cancelSelBtn: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
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
    minWidth: 170,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    borderRadius: 10,
    paddingVertical: 6,
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.accent,
  },
  dropdownItemText: {
    color: '#c3cbdb',
    fontSize: 13,
  },
  dropdownItemTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: COLORS.red,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },

  /* ── Checkbox ── */
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.subText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.accentt,
    borderColor: COLORS.accentt,
  },
  leadCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  leadCircleSelecting: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.subText,
  },
  leadCircleChecked: {
    backgroundColor: COLORS.accentt,
    borderColor: COLORS.accentt,
  },

  /* ── List / empty ── */
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 100,
    flexGrow: 1,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 15,
    textAlign: 'center',
  },

  /* ── Cards ── */
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4aa3df',
    minHeight: 66,
    justifyContent: 'center',
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
    color: '#c3cbdb',
    fontSize: 13,
    lineHeight: 19,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    includeFontPadding: false,
  },
  cardTitleUnread: {
    fontWeight: '700',
  },
  cardSubtitle: {
    color: COLORS.subText,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    includeFontPadding: false,
  },

  /* ── Advanced filter modal (bottom sheet) ── */
  bottomSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    zIndex: 99999,
    elevation: 99999,
  },
  bottomSheet: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: '#21283a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
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
    width: 38,
    height: 4,
    backgroundColor: '#b0bec5',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },
  modalTitle: {
    color: '#e6ebf2',
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
  resetBtnText: { color: '#ff6b6b', fontSize: 13, fontWeight: '500' },
  cancelBtn: {
    backgroundColor: COLORS.panel,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  cancelBtnText: { color: '#c3cbdb', fontWeight: '500', fontSize: 13 },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1e9ce8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  /* ── iOS date picker panel ── */
  iosPickerPanel: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#21283a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  iosPickerTitle: {
    color: '#e6ebf2',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  iosPicker: {
    height: 180,
    width: '100%',
  },
  iosPickerBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },

  /* ── Filter fields ── */
  field: { marginBottom: 12, width: '100%' },
  filterLabel: {
    color: '#9aa8bd',
    fontSize: 12,
    marginBottom: 5,
    fontWeight: '600',
  },
  filterInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  filterInput: { flex: 1, color: '#e6ebf2', fontSize: 13, paddingVertical: 0 },

  userPlaceholderText: { color: '#8a9daf', fontSize: 13, flex: 1 },
  userValueText: { color: '#e6ebf2', fontSize: 13, flex: 1, marginRight: 8 },
  userDropdownBox: {
    marginTop: 6,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    borderRadius: 12,
    padding: 8,
  },
  userSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28304a',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 34,
    marginBottom: 6,
  },
  userSearchInput: {
    flex: 1,
    color: '#e6ebf2',
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
    borderBottomColor: '#323a52',
  },
  userListItemName: { color: '#c3cbdb', fontSize: 13, fontWeight: '600' },
  userListItemSub: { color: '#6b7690', fontSize: 11, marginTop: 1 },
  userEmptyText: {
    color: '#6b7690',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },

  statusDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  statusDropdownItemActive: {
    backgroundColor: 'rgba(74,163,223,0.15)',
  },
  statusDropdownItemText: {
    color: '#c3cbdb',
    fontSize: 13,
    fontWeight: '500',
  },
  statusDropdownItemTextActive: {
    color: '#7cc4f2',
    fontWeight: '700',
  },

  /* ── Custom Alert ── */
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.modalBg,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#39415a',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 14,
  },
  alertTopBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  alertIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
  },
  alertMsgScroll: {
    alignSelf: 'stretch',
    maxHeight: SCREEN_HEIGHT * 0.32,
    marginTop: 8,
  },
  alertMessage: {
    color: COLORS.mutedText,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  alertBtnRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  alertBtn: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  alertBtnText: { fontSize: 13, fontWeight: '700' },
});