import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  StatusBar,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  DeviceEventEmitter,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import { useSelector } from 'react-redux';

const screenHeight = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (screenHeight / 812) * size;

// ─── COLORS (ChangeRM er sathe same) ─────────────────────────────────────────

const COLORS = {
  bg: '#080d5a',
  cardBg: '#ffffff0e',
  cardSelected: '#0d1a6e',
  headerBg: '#0A0F2E',
  accent: '#00cfff',
  accentDim: '#00cfff18',
  accentBorder: '#00cfff40',
  white: '#FFFFFF',
  mutedText: '#8A90B4',
  labelText: '#FFB85D',
  gold: '#f4c542',
  goldDim: '#f4c54218',
  goldBorder: '#f4c54235',
  green: '#00C48C',
  red: '#FF6B6B',
  borderColor: '#ffffff20',
  modalBg: '#21283a',
  sectionBg: 'rgba(255,255,255,0.13)',
};

const USER_IMG_BASE_URL = 'https://pm2-files.s3.ap-south-1.amazonaws.com/user_images';

const getUserImageUrl = img => {
  if (!img) return null;
  let s = String(img).trim();
  if (!s) return null;

  // Already a full URL (space/special char thakle encode kore dey)
  if (/^https?:\/\//i.test(s)) {
    try { return encodeURI(decodeURI(s)); } catch { return s; }
  }

  // leading slash ar duplicate "user_images/" soriye dey
  s = s.replace(/^\/+/, '').replace(/^user_images\//, '');
  return `${USER_IMG_BASE_URL}/${encodeURI(s)}`;
};

// backend e image field er naam alada hole shob try kore
const pickUserImg = u =>
  u?.usr_img ?? u?.usr_image ?? u?.image ?? u?.profile_image ?? u?.avatar ?? null;

const getChangeMeta = item => {
  const type = String(item?.change_type ?? '');
  const hasChangedBy =
    item?.changed_by !== null && item?.changed_by !== undefined;

  // type "1" + changed_by has a value  => Manual
  // type "2" + changed_by is null      => Automatic
  const isManual = type === '1' && hasChangedBy;
  const isAutomatic = type === '2' && !hasChangedBy;
  const manual = isManual || (!isAutomatic && hasChangedBy);

  return {
    isAutomatic: !manual,
    label: manual ? 'Manual' : 'Automatic',
    color: manual ? '#f59e0b' : '#1a73e8',
  };
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
  const scaleAnim = anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View style={[styles.alertOverlay, { opacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismiss} />

        <Animated.View style={[styles.alertBox, { opacity, transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.alertTopBar, { backgroundColor: t.color }]} />

          <View style={[styles.alertIconWrap, { backgroundColor: t.color + '1f', borderColor: t.color + '55' }]}>
            <Icon name={t.icon} size={26} color={t.color} />
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

// ─── SEARCHABLE DROPDOWN ──────────────────────────────────────────────────────

const SearchableDropdown = ({ label, data = [], placeholder, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  const selectedItem = data.find(item => item.value === value);

  const filtered = data.filter(item =>
    String(item.label ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const handleOpen = () => {
    setIsOpen(true);
    setSearch('');
    setTimeout(() => searchRef.current?.focus(), 150);
  };

  const handleSelect = item => {
    onChange && onChange(item.value);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange && onChange(null);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <View style={styles.inputWrapper}>
      {label ? <Text style={styles.filterLabel}>{label}</Text> : null}

      <TouchableOpacity activeOpacity={0.8} onPress={handleOpen} style={styles.dropdownTrigger}>
        <Text
          style={[styles.dropdownTriggerText, !selectedItem && { color: COLORS.mutedText }]}
          numberOfLines={1}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <View style={styles.dropdownTriggerIcons}>
          {selectedItem ? (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={15} color={COLORS.mutedText} />
            </TouchableOpacity>
          ) : null}
          <Icon name="keyboard-arrow-down" size={20} color={COLORS.accent} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.sdModalOverlay}
          activeOpacity={1}
          onPress={() => { setIsOpen(false); setSearch(''); }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.sdKAV}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.sdContainer}>
                <View style={styles.sdHeader}>
                  <Text style={styles.sdTitle}>{label || placeholder}</Text>
                  <TouchableOpacity onPress={() => { setIsOpen(false); setSearch(''); }}>
                    <Icon name="close" size={20} color={COLORS.mutedText} />
                  </TouchableOpacity>
                </View>

                <View style={styles.sdSearchBox}>
                  <Icon name="search" size={16} color={COLORS.accent} />
                  <TextInput
                    ref={searchRef}
                    style={styles.sdSearchInput}
                    placeholder="Search..."
                    placeholderTextColor={COLORS.mutedText}
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                  />
                  {search ? (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <Icon name="close" size={14} color={COLORS.mutedText} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={styles.sdCount}>
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </Text>

                <FlatList
                  data={filtered}
                  keyExtractor={item => String(item.value)}
                  style={styles.sdList}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const isSelected = item.value === value;
                    return (
                      <TouchableOpacity
                        style={[styles.sdItem, isSelected && styles.sdItemSelected]}
                        onPress={() => handleSelect(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.sdItemText, isSelected && styles.sdItemTextSelected]}>
                          {item.label}
                        </Text>
                        {isSelected && <Icon name="check-circle" size={16} color={COLORS.accent} />}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.sdEmpty}>
                      <Icon name="search-off" size={28} color={COLORS.mutedText} />
                      <Text style={styles.sdEmptyText}>No results found</Text>
                    </View>
                  }
                />
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── INPUT FIELD ──────────────────────────────────────────────────────────────

const InputField = ({ label, placeholder, icon, value, onChange, onPress }) => (
  <View style={styles.field}>
    {label ? <Text style={styles.filterLabel}>{label}</Text> : null}
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={COLORS.mutedText}
          style={styles.input}
          value={value}
          onChangeText={onChange}
          editable={!onPress}
          pointerEvents={onPress ? 'none' : 'auto'}
        />
        {icon && <Icon name={icon} size={18} color={COLORS.accent} />}
      </View>
    </TouchableOpacity>
  </View>
);

// ─── MAKE CALL / MAIL ─────────────────────────────────────────────────────────

const makeCall = phoneNumber => {
  if (!phoneNumber) return;

  const cleanNumber = phoneNumber.replace(/\D/g, '');

  showAlert('Contact', `Choose an action for ${phoneNumber}`, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'WhatsApp',
      onPress: async () => {
        const message = encodeURIComponent('Hello!');
        const appUrl = `whatsapp://send?phone=${cleanNumber}&text=${message}`;
        const webUrl = `https://wa.me/${cleanNumber}?text=${message}`;

        try {
          const supported = await Linking.canOpenURL(appUrl);
          if (supported) {
            await Linking.openURL(appUrl);
          } else {
            await Linking.openURL(webUrl);
          }
        } catch (error) {
          showAlert('Error', 'Unable to open WhatsApp.');
        }
      },
    },
    {
      text: 'Call',
      onPress: () => Linking.openURL(`tel:${phoneNumber}`),
    },
  ]);
};

const sendMail = async email => {
  if (!email) return;

  try {
    if (Platform.OS === 'android') {
      const gmailUrl = `googlegmail://co?to=${email}`;
      const supported = await Linking.canOpenURL(gmailUrl);
      if (supported) {
        await Linking.openURL(gmailUrl);
      } else {
        await Linking.openURL(`mailto:${email}`);
      }
    } else {
      await Linking.openURL(`mailto:${email}`);
    }
  } catch (error) {
    showAlert('Error', 'Unable to open email app.');
  }
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const RemarksText = ({ remarks }) => {
  const [expanded, setExpanded] = useState(false);
  const shouldShowReadMore = remarks.length > 80;

  return (
    <Text style={styles.remarksCardText}>
      {expanded || !shouldShowReadMore
        ? remarks
        : `${remarks.substring(0, 80)}... `}

      {shouldShowReadMore && (
        <Text style={styles.readMore} onPress={() => setExpanded(!expanded)}>
          {expanded ? ' Read Less' : ' Read More'}
        </Text>
      )}
    </Text>
  );
};

const pad = n => String(n).padStart(2, '0');

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// true if ANY feedback has a call back date equal to today
const isCallbackToday = feedbacks => {
  if (!Array.isArray(feedbacks)) return false;
  const today = getTodayString();

  return feedbacks.some(x => {
    if (!x?.call_back_date) return false;
    const raw = String(x.call_back_date).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.substring(0, 10) === today;
    }

    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === today
    );
  });
};

const Avatar = ({ uri, name, style, iconSize = 20 }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [uri]);

  if (!uri || failed) {
    const initial = String(name || '').trim()[0]?.toUpperCase();
    return (
      <View style={[style, styles.rmAvatarPlaceholder]}>
        {initial && initial !== 'N' ? (
          <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: iconSize * 0.8 }}>
            {initial}
          </Text>
        ) : (
          <Icon name="person" size={iconSize} color={COLORS.mutedText} />
        )}
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={e => {
        console.log('Avatar load failed:', uri, e?.nativeEvent?.error);
        setFailed(true);
      }}
    />
  );
};

// ─── LEAD CARD ────────────────────────────────────────────────────────────────

const SiteCard = ({ data, navigation, onInfoPress, canViewAssignment }) => {
  const remarks =
    data?.propertyfeedbacks
      ?.map(x => x?.remarks)
      ?.filter(Boolean)
      ?.join(', ') || 'No Remarks Available';

  const hasMultipleAssignments =
    canViewAssignment && Number(data?.assignment_count) === 2;
  const isTodayCard = isCallbackToday(data?.propertyfeedbacks);

  // Priority: assignment_count border > today's border > default
  const highlighted = hasMultipleAssignments || isTodayCard;
  const cardBorderColor = hasMultipleAssignments
    ? '#dc35469c'
    : isTodayCard
      ? '#30bb7896'
      : 'rgba(255,255,255,0.2)';

  const statusMeta =
    data?.active === '1'
      ? { text: 'Active', color: COLORS.green, bg: '#00C48C22', border: '#00C48C60' }
      : data?.active === '5'
        ? { text: 'Booking Done', color: '#9aa5b4', bg: '#6b778522', border: '#6b778560' }
        : { text: 'Inactive', color: COLORS.red, bg: '#FF6B6B22', border: '#FF6B6B60' };

  const siteVisit =
    data?.propertyfeedbacks?.map(x => x?.site_visit_date).filter(Boolean).join(', ') || 'N/A';

  const callBack =
    data?.propertyfeedbacks
      ?.filter(x => x?.call_back_date)
      ?.map(x => `${x.call_back_date}${x.call_back_time ? ' / ' + x.call_back_time : ''}`)
      ?.join(', ') || 'N/A';

  return (
    <View
      style={[
        styles.card,
        { borderColor: cardBorderColor, borderWidth: highlighted ? 1 : 0.5 },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.nameRow}>
          <Text style={styles.cardName} numberOfLines={2}>
            {data?.name || 'N/A'} |{' '}
            <Text style={styles.section}>{data?.propertyproject?.project_name}</Text>
          </Text>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusMeta.bg, borderColor: statusMeta.border },
            ]}
          >
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {statusMeta.text}
            </Text>
          </View>

          <View style={styles.iconRow}>
            {hasMultipleAssignments && (
              <TouchableOpacity
                onPress={() => onInfoPress && onInfoPress(data?.id, data?.name)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon name="info-outline" size={20} color={COLORS.accent} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('MeetingsEdit', { id: data?.id })}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Icon name="edit" size={17} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBody}>
        <View style={styles.leftCol}>
          <View style={styles.infoRow}>
            <Icon name="call" size={12} color={COLORS.accent} />
            <TouchableOpacity style={styles.infoTouch} onPress={() => makeCall(data?.phone)}>
              <Text style={styles.phoneText} numberOfLines={1}>
                {data?.phone || 'N/A'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Icon name="email" size={12} color={COLORS.accent} />
            <TouchableOpacity style={styles.infoTouch} onPress={() => sendMail(data?.email)}>
              <Text style={styles.emailText} numberOfLines={1}>
                {data?.email || 'N/A'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Icon name="event" size={12} color={COLORS.gold} />
            <Text style={styles.infoText} numberOfLines={1}>
              Visit: {siteVisit}
            </Text>
          </View>
        </View>

        <View style={styles.rightCol}>
          <View style={styles.infoRow}>
            <Text style={styles.rmLabelCard}>RM: </Text>
            <Text style={styles.rmValue} numberOfLines={1}>
              {data?.relationshipManager
                ? `${data.relationshipManager.usr_fname} ${data.relationshipManager.usr_lname}`
                : 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="location-on" size={12} color={COLORS.gold} />
            <Text style={styles.infoText} numberOfLines={1}>
              {data?.propertylocation?.name || 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.refLabel}>Source: </Text>
            <Text style={styles.refValue} numberOfLines={1}>
              {data?.mrreference?.mrf_name || 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.extraBlock}>
        <View style={styles.extraRow}>
          <Text style={styles.refLabel}>Project Form Name: </Text>
          <Text style={[styles.value, { flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">
            {data?.project_form_name || 'N/A'}
          </Text>
        </View>

        <View style={styles.extraRow}>
          <Text style={styles.refLabel}>Call Back: </Text>
          <Text style={[styles.value, { flex: 1 }]}>{callBack}</Text>
        </View>

        <View style={styles.extraRow}>
          <Text style={styles.refLabel}>Remarks: </Text>
          <View style={{ flex: 1 }}>
            <RemarksText remarks={remarks} />
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.interactionBtn}
          onPress={() => navigation.navigate('AllInteractionsScreen', { id: data?.id })}
          activeOpacity={0.8}
        >
          <Icon name="forum" size={12} color={COLORS.accent} />
          <Text style={styles.interactionBtnText}>View Interaction</Text>
        </TouchableOpacity>
        <Text style={styles.completed} numberOfLines={1}>
          {data?.propertyfeedbacks?.map(x => x.propertycallstatus?.name).join(', ') || 'N/A'}
        </Text>
      </View>
    </View>
  );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

const EMPTY_FILTERS = {
  company_id: null,
  rm_id: null,
  fromDate: null,
  toDate: null,
  project: null,
  location: null,
  active: null,
  lead_status: null,
  lead_sub_status: null,
  lead_qualification: null,
  call_status: null,
  siteVisitFromDate: null,
  siteVisitToDate: null,
};

const LeadsListScreen = ({setHideBottomNav} ) => {
  const navigation = useNavigation();
   const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [isTotalLeadsLoading, setIsTotalLeadsLoading] = useState(false);

  const userRole = useSelector(state => state.userRole);
  const isAdmin = userRole?.includes('ADMIN');
  const isCityHead = userRole?.includes('CITY HEAD');
  const canViewAssignment = !!(isAdmin || isCityHead);

  // ── RM history sheet ──
  const [showRMHistory, setShowRMHistory] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedLeadName, setSelectedLeadName] = useState('');
  const rmHistoryAnim = useRef(new Animated.Value(0)).current;

  const showRMHistoryModal = () => {
    setShowRMHistory(true);
    Animated.timing(rmHistoryAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const hideRMHistoryModal = () => {
    Animated.timing(rmHistoryAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowRMHistory(false);
      setSelectedLeadId(null);
    });
  };

  const {
    data: rmHistoryData = [],
    isLoading: rmHistoryLoading,
    isError: rmHistoryError,
  } = useQuery({
    queryKey: ['rmChangeHistory', selectedLeadId],
    queryFn: async () => {
      const res = await api.get(`/api/pm/getRMChangeHistory/${selectedLeadId}`);
      const body = res?.data?.data !== undefined ? res.data : res;
      const data = body?.data ?? body ?? [];
      return Array.isArray(data) ? data : [];
    },
    enabled: !!selectedLeadId,
    retry: 1,
  });

  useEffect(() => {
    if (rmHistoryError) {
      showAlert('Error', 'Unable to load RM change history.');
      hideRMHistoryModal();
    }
  }, [rmHistoryError]);

  const fetchRMChangeHistory = (leadId, leadName) => {
    if (!leadId) return;
    setSelectedLeadName(leadName || '');
    setSelectedLeadId(leadId);
    showRMHistoryModal();
  };

  // ── Filters ──
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState();
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showSiteFromPicker, setShowSiteFromPicker] = useState(false);
  const [showSiteToPicker, setShowSiteToPicker] = useState(false);

  const filterAnim = useRef(new Animated.Value(screenHeight)).current;

  const openFilterModal = () => {
    setHideBottomNav && setHideBottomNav(true);
    DeviceEventEmitter.emit('toggleBottomNav', false);
    setShowFilterModal(true);
    filterAnim.setValue(screenHeight);
    requestAnimationFrame(() => {
      Animated.spring(filterAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
      }).start();
    });
  };

  const closeFilterModal = () => {
    Animated.timing(filterAnim, {
      toValue: screenHeight,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowFilterModal(false);
      setHideBottomNav && setHideBottomNav(false);
      DeviceEventEmitter.emit('toggleBottomNav', true);
    });
  };

  useEffect(() => {
    navigation.setParams({ hideBottomNav: showFilterModal });
  }, [showFilterModal]);

useEffect(() => {
  return () => {
    setHideBottomNav && setHideBottomNav(false);
    DeviceEventEmitter.emit('toggleBottomNav', true);
  };
}, []);

  const formatDate = date => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const onChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const onDateChange = (event, selectedDate, key) => {
    const closers = {
      fromDate: setShowFromPicker,
      toDate: setShowToPicker,
      siteVisitFromDate: setShowSiteFromPicker,
      siteVisitToDate: setShowSiteToPicker,
    };
    closers[key] && closers[key](false);
    if (selectedDate) onChange(key, formatDate(selectedDate));
  };

  const applyFilter = () => {
    setAppliedFilters(filters);
    closeFilterModal();
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    closeFilterModal();
  };

  // ── Leads (infinite) ──
  const {
    data: Lead,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['leads_infinite', appliedFilters, searchText],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get('/api/pm/getAllPropertyLeads', {
        params: {
          page: pageParam,
          search: searchText || undefined,
          rm_id: filters.rm_id || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          project: filters.project || undefined,
          location: filters.location || undefined,
          active: filters.active || undefined,
          lead_status: filters.lead_status || undefined,
          lead_sub_status: filters.lead_sub_status || undefined,
          lead_qualification: filters.lead_qualification || undefined,
          call_status: filters.call_status || undefined,
          siteVisitFromDate: filters.siteVisitFromDate || undefined,
          siteVisitToDate: filters.siteVisitToDate || undefined,
        },
      });
      return res.data;
    },
    getNextPageParam: lastPage => {
      const { currentPage, totalPages } = lastPage;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const leads = useMemo(() => {
    const all = Lead?.pages?.flatMap(page => page.data) || [];
    const seen = new Set();
    return all.filter(item => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [Lead]);

  const totalRecords = Lead?.pages?.[0]?.totalRecords;

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  // ── Dropdown data ──
  const { data: AllProperty } = useQuery({
    queryKey: ['AllProperty'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLocation');
      return res.data.data;
    },
  });

  const { data: allRmList = [] } = useQuery({
    queryKey: ['allRMList'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllRM');
      return res?.data?.data;
    },
  });

  const { data: projectList = [] } = useQuery({
    queryKey: ['project'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyProjects');
      return res.data.data || [];
    },
  });

  const { data: callStatusList = [] } = useQuery({
    queryKey: ['callStatus'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyCallStatus');
      return res.data.data || [];
    },
  });

  const { data: leadQualificationList = [] } = useQuery({
    queryKey: ['leadQualification'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLeadQualification');
      return res.data.data || [];
    },
  });

  const { data: leadStatusList = [] } = useQuery({
    queryKey: ['leadStatus'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLeadStatus');
      return res.data.data || [];
    },
  });

  const { data: leadSubStatusList = [] } = useQuery({
    queryKey: ['leadSubStatus'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLeadSubStatus');
      return res.data.data || [];
    },
  });

  const toOptions = list => list?.map(item => ({ label: item.name, value: item.id })) || [];

  const leadQualificationOptions = toOptions(leadQualificationList);
  const leadStatusOptions = toOptions(leadStatusList);
  const leadSubStatusOptions = toOptions(leadSubStatusList);
  const callStatusOptions = toOptions(callStatusList);
  const Property = toOptions(AllProperty);
  const Rm = toOptions(allRmList);
  const projectOptions =
    projectList?.map(item => ({ label: item.project_name, value: item.id })) || [];

  const LeadStatus = [
    { label: 'Active', value: '1' },
    { label: 'Inactive', value: '2' },
    { label: 'Booking Done', value: '5' },
  ];

  // ── Misc ──
  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleTotalLeads = () => {
    if (isTotalLeadsLoading) return;
    setIsTotalLeadsLoading(true);
    navigation.navigate('Totalleadscreen1');
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setIsTotalLeadsLoading(false);
    });
    return unsubscribe;
  }, [navigation]);

  // ── RM history summary ──
  const first = rmHistoryData[0];
  const summaryLead = selectedLeadName || first?.propertylead?.name || 'N/A';
  const summaryProject = first?.propertylead?.propertyproject?.project_name || 'N/A';

  return (
    <View style={styles.container}>
      {/* Same background as ChangeRM / Meeting / Dashboard screens */}
      <Image
        source={require('../asset/image/bg-img.png')}
        style={styles.bgImageFixed}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* TOP BAR: [back + icon + title] ............ [filter + total leads] (same as ChangeRM) */}
      <View style={[styles.topBarContainer, { paddingTop: insets.top + verticalScale(10) }]}>
        <View style={styles.topBar}>
          <View style={styles.leftHeader}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon1
                name="chevron-back"
                size={23}
                color="#fff"
                // style={styles.backIcon}
              />
            </TouchableOpacity>
            <Icon name="list-alt" size={20} color="#ffffff" />
            <Text style={styles.screenTitle} numberOfLines={1}>
              Leads List
            </Text>
          </View>

          <View style={styles.sectionActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={openFilterModal}
              activeOpacity={0.75}
            >
              <Icon name="filter-alt" size={16} color={COLORS.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.changeBtn, isTotalLeadsLoading && { opacity: 0.6 }]}
              onPress={handleTotalLeads}
              activeOpacity={0.75}
              disabled={isTotalLeadsLoading}
            >
              {isTotalLeadsLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.changeBtnText}>Total Leads</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Lead list ── */}
      <FlatList
        ref={listRef}
        data={leads}
        keyExtractor={(item, i) => (item?.id != null ? `lead-${item.id}` : `lead-idx-${i}`)}
        renderItem={({ item }) => (
          <SiteCard
            data={item}
            navigation={navigation}
            onInfoPress={fetchRMChangeHistory}
            canViewAssignment={canViewAssignment}
          />
        )}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        onScroll={e => setShowTopBtn(e.nativeEvent.contentOffset.y > 200)}
        scrollEventThrottle={100}
        ListHeaderComponent={
          <>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Icon name="search" size={16} color={COLORS.mutedText} />
                <TextInput
                  placeholder="Search name / phone..."
                  placeholderTextColor={COLORS.mutedText}
                  value={searchText}
                  onChangeText={setSearchText}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchText ? (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Icon name="close" size={15} color={COLORS.mutedText} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.addLeadBtn}
                onPress={() => navigation.navigate('Rmform')}
                activeOpacity={0.75}
              >
                <Icon name="add" size={15} color="#fff" />
                <Text style={styles.addLeadBtnText} numberOfLines={1} adjustsFontSizeToFit>
                  Add New Lead
                </Text>
              </TouchableOpacity>
            </View>

            {totalRecords != null && (
              <View style={styles.countRow}>
                <Text style={styles.countText}>
                  Showing {leads.length ? 1 : 0} to {leads.length} of {totalRecords} entries
                </Text>
                {isFetching && !isFetchingNextPage && !isLoading && (
                  <ActivityIndicator size="small" color='#fff' />
                )}
              </View>
            )}

            {isLoading && (
              <View style={styles.initialLoader}>
                <ActivityIndicator size="large" color='#fff' />
              </View>
            )}

            {!isLoading && leads.length === 0 && (
              <Text style={styles.centeredText}>No Data Found</Text>
            )}
          </>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color='#fff' />
              <Text style={styles.footerText}>Loading more...</Text>
            </View>
          ) : null
        }
      />

      {showTopBtn && (
        <TouchableOpacity style={styles.topButton} onPress={scrollToTop} activeOpacity={0.8}>
          <Icon name="keyboard-arrow-up" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── RM CHANGE HISTORY — bottom sheet ── */}
      <Modal
        visible={showRMHistory}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={hideRMHistoryModal}
      >
        <View style={styles.rmHistoryOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={hideRMHistoryModal}
          />

          <Animated.View
            style={[
              styles.rmHistorySheet,
              {
                transform: [
                  {
                    translateY: rmHistoryAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [500, 0],
                    }),
                  },
                ],
                opacity: rmHistoryAnim,
              },
            ]}
          >
            <View style={styles.handleBar} />

            <View style={styles.modalHeader}>
              <View style={styles.filterModalTitleRow}>
                <Icon name="history" size={17} color={COLORS.accent} />
                <Text style={styles.modalTitle}>RM Change History</Text>
              </View>
              <TouchableOpacity onPress={hideRMHistoryModal}>
                <Icon name="close" size={20} color={COLORS.mutedText} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterDivider} />

            {rmHistoryLoading ? (
              <ActivityIndicator
                size="small"
                color={COLORS.accent}
                style={{ marginVertical: 40 }}
              />
            ) : rmHistoryData.length === 0 ? (
              <Text style={styles.rmHistoryEmpty}>No history found</Text>
            ) : (
              <>
                <View style={styles.rmSummaryCard}>
                  <View style={styles.rmSummaryAccent} />
                  <View style={styles.rmSummaryContent}>
                    <View style={styles.rmSummaryItem}>
                      <Text style={styles.rmSummaryLabel}>PROJECT:</Text>
                      <Text style={styles.rmSummaryValue} numberOfLines={1}>
                        {summaryProject}
                      </Text>
                    </View>
                    <View style={styles.rmSummaryItem}>
                      <Text style={styles.rmSummaryLabel}>LEAD:</Text>
                      <Text style={styles.rmSummaryValue} numberOfLines={1}>
                        {summaryLead}
                      </Text>
                    </View>
                    <View style={styles.rmSummaryItem}>
                      <Text style={styles.rmSummaryLabel}>TOTAL CHANGES:</Text>
                      <Text style={styles.rmSummaryCount}>{rmHistoryData.length}</Text>
                    </View>
                  </View>
                </View>

                <ScrollView
                  style={styles.rmHistoryScroll}
                  contentContainerStyle={{ paddingBottom: 12 }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {rmHistoryData.map((item, index) => {
                    const prevName = item?.previousRM
                      ? `${item.previousRM.usr_fname || ''} ${item.previousRM.usr_lname || ''}`.trim()
                      : 'N/A';
                    const newName = item?.newRM
                      ? `${item.newRM.usr_fname || ''} ${item.newRM.usr_lname || ''}`.trim()
                      : 'N/A';
                    const changedBySource =
                      item?.changedBy ||
                      (item?.changed_by && item.changed_by === item.previous_rm
                        ? item.previousRM
                        : null);

                    const changedByName = changedBySource
                      ? `${changedBySource.usr_fname || ''} ${changedBySource.usr_lname || ''}`.trim()
                      : null;

                    // DEBUG: image URL ta console e dekhar jonno (thik hole eta muche dio)
                    if (__DEV__ && index === 0) {
                      console.log('RM history img:', {
                        prev: getUserImageUrl(pickUserImg(item?.previousRM)),
                        new: getUserImageUrl(pickUserImg(item?.newRM)),
                        rawPrevRM: item?.previousRM,
                      });
                    }
                    const prevImg = getUserImageUrl(pickUserImg(item?.previousRM));
                    const newImg = getUserImageUrl(pickUserImg(item?.newRM));
                    const changedByImg = getUserImageUrl(pickUserImg(changedBySource));

                    const { isAutomatic, label: badgeLabel, color: badgeBg } =
                      getChangeMeta(item);

                    const dateStr = item?.created_at
                      ? new Date(item.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : '';

                    const isLast = index === rmHistoryData.length - 1;

                    return (
                      <View key={item?.id ?? index} style={styles.rmTimelineItem}>
                        <View style={styles.rmTimelineLeft}>
                          <View style={styles.rmTimelineDot} />
                          {!isLast && <View style={styles.rmTimelineLine} />}
                        </View>

                        <View style={styles.rmTimelineCard}>
                          <View style={styles.rmCardHeader}>
                            <View style={[styles.rmBadge, { backgroundColor: badgeBg }]}>
                              <Text style={styles.rmBadgeText}>{badgeLabel}</Text>
                            </View>
                            <Text style={styles.rmCardDate}>{dateStr}</Text>
                          </View>

                          <View style={styles.rmTransferRow}>
                            <View style={styles.rmPersonCol}>
                              <Avatar uri={prevImg} name={prevName} style={styles.rmAvatar} />
                              <Text style={styles.rmPersonRole}>PREVIOUS RM</Text>
                              <Text style={styles.rmPersonName} numberOfLines={2}>
                                {prevName}
                              </Text>
                            </View>

                            <View style={styles.rmArrowWrap}>
                              <Icon name="arrow-forward" size={20} color="#fff" />
                            </View>

                            <View style={styles.rmPersonCol}>
                              <Avatar uri={newImg} name={newName} style={styles.rmAvatar} />
                              <Text style={styles.rmPersonRole}>NEW RM</Text>
                              <Text
                                style={[styles.rmPersonName, { color: COLORS.accent }]}
                                numberOfLines={2}
                              >
                                {newName}
                              </Text>
                            </View>
                          </View>

                          {!isAutomatic && changedByName ? (
                            <View style={styles.rmChangedByRow}>
                              <Text style={styles.rmChangedByLabel}>CHANGED BY</Text>
                              <Avatar
                                uri={changedByImg}
                                name={changedByName}
                                style={styles.rmChangedByAvatar}
                                iconSize={12}
                              />
                              <Text style={styles.rmChangedByName}>{changedByName}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}

            <View style={styles.filterDivider} />

            <View style={styles.rmHistoryBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={hideRMHistoryModal}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Filter Bottom Sheet ── */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeFilterModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.bottomSheetOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeFilterModal}
          />
          <Animated.View
            style={[styles.bottomSheet, { transform: [{ translateY: filterAnim }] }]}
          >
            <View style={styles.handleBar} />

            <View style={styles.modalHeader}>
              <View style={styles.filterModalTitleRow}>
                <Icon name="filter-list" size={17} color={COLORS.accent} />
                <Text style={styles.modalTitle}>Filter Leads</Text>
              </View>
              <TouchableOpacity onPress={closeFilterModal}>
                <Icon name="close" size={20} color={COLORS.mutedText} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterDivider} />

            <ScrollView
              style={{ flexShrink: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              <SearchableDropdown
                label="Property Location"
                data={Property}
                placeholder="Select Location"
                value={filters.location}
                onChange={value => onChange('location', value)}
              />
              <SearchableDropdown
                label="Relationship Manager"
                data={Rm}
                placeholder="Select RM"
                value={filters.rm_id}
                onChange={value => onChange('rm_id', value)}
              />

              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.dateSubLabel}>From</Text>
                  <InputField
                    placeholder="YYYY-MM-DD"
                    icon="calendar-today"
                    value={filters.fromDate}
                    onPress={() => setShowFromPicker(true)}
                  />
                </View>
                <View style={styles.dateSeparator}>
                  <Icon name="arrow-forward" size={16} color={COLORS.mutedText} />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.dateSubLabel}>To</Text>
                  <InputField
                    placeholder="YYYY-MM-DD"
                    icon="calendar-today"
                    value={filters.toDate}
                    onPress={() => setShowToPicker(true)}
                  />
                </View>
              </View>

              <SearchableDropdown
                label="Project"
                data={projectOptions}
                placeholder="Select Project"
                value={filters.project}
                onChange={value => onChange('project', value)}
              />
              <SearchableDropdown
                label="Active Status"
                data={LeadStatus}
                placeholder="Select Status"
                value={filters.active}
                onChange={value => onChange('active', value)}
              />

              <View style={styles.sectionDividerRow}>
                <Text style={styles.sectionDividerText}>Feedback</Text>
                <View style={styles.sectionDividerLine} />
              </View>

              <SearchableDropdown
                label="Call Status"
                data={callStatusOptions}
                placeholder="Select Status"
                value={filters.call_status}
                onChange={value => onChange('call_status', value)}
              />
              <SearchableDropdown
                label="Lead Qualification"
                data={leadQualificationOptions}
                placeholder="Select Qualification"
                value={filters.lead_qualification}
                onChange={value => onChange('lead_qualification', value)}
              />
              <SearchableDropdown
                label="Lead Status"
                data={leadStatusOptions}
                placeholder="Select Status"
                value={filters.lead_status}
                onChange={value => onChange('lead_status', value)}
              />
              <SearchableDropdown
                label="Lead Sub Status"
                data={leadSubStatusOptions}
                placeholder="Select Sub Status"
                value={filters.lead_sub_status}
                onChange={value => onChange('lead_sub_status', value)}
              />

              <Text style={styles.filterLabel}>Site Visit Date Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.dateSubLabel}>From</Text>
                  <InputField
                    placeholder="YYYY-MM-DD"
                    icon="calendar-today"
                    value={filters.siteVisitFromDate}
                    onPress={() => setShowSiteFromPicker(true)}
                  />
                </View>
                <View style={styles.dateSeparator}>
                  <Icon name="arrow-forward" size={16} color={COLORS.mutedText} />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.dateSubLabel}>To</Text>
                  <InputField
                    placeholder="YYYY-MM-DD"
                    icon="calendar-today"
                    value={filters.siteVisitToDate}
                    onPress={() => setShowSiteToPicker(true)}
                  />
                </View>
              </View>
            </ScrollView>

            {showFromPicker && (
              <DateTimePicker
                value={filters.fromDate ? new Date(filters.fromDate) : new Date()}
                mode="date"
                display="default"
                onChange={(e, d) => onDateChange(e, d, 'fromDate')}
              />
            )}
            {showToPicker && (
              <DateTimePicker
                value={filters.toDate ? new Date(filters.toDate) : new Date()}
                mode="date"
                display="default"
                onChange={(e, d) => onDateChange(e, d, 'toDate')}
              />
            )}
            {showSiteFromPicker && (
              <DateTimePicker
                value={
                  filters.siteVisitFromDate ? new Date(filters.siteVisitFromDate) : new Date()
                }
                mode="date"
                display="default"
                onChange={(e, d) => onDateChange(e, d, 'siteVisitFromDate')}
              />
            )}
            {showSiteToPicker && (
              <DateTimePicker
                value={
                  filters.siteVisitToDate ? new Date(filters.siteVisitToDate) : new Date()
                }
                mode="date"
                display="default"
                onChange={(e, d) => onDateChange(e, d, 'siteVisitToDate')}
              />
            )}

            <View style={styles.filterDivider} />

            <View style={styles.filterBtnRow}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Icon name="refresh" size={14} color="#5a7080" />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <View style={styles.filterActionBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeFilterModal}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyBtn} onPress={applyFilter}>
                  <Icon name="check" size={14} color="#fff" />
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Custom Alert ── */}
      <CustomAlertHost />
    </View>
  );
};

export default LeadsListScreen;

// ─── STYLES (ChangeRM theme) ──────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Layout ──
  container: { flex: 1, backgroundColor: '#1a2d3e' },
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
  scrollContent: { paddingHorizontal: 12, paddingBottom: 100 },
  centeredText: { color: COLORS.white, textAlign: 'center', marginTop: 24, fontSize: 14, opacity: 0.7 },
  initialLoader: { paddingVertical: 32, alignItems: 'center' },
  footerLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  footerText: { color: COLORS.accent, fontSize: 12 },

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
    paddingRight: 12,
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
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 30, height: 28, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,207,255,0.12)', borderRadius: 16,
    borderWidth: 1.5, borderColor: COLORS.accent,
  },
  changeBtn: {
    backgroundColor: 'rgba(0,207,255,0.12)', borderRadius: 16, paddingHorizontal: 14,
    paddingVertical: 5, borderWidth: 1.5, borderColor: COLORS.accent,
    minWidth: 60, alignItems: 'center', justifyContent: 'center', minHeight: 28,
  },
  changeBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },

  // ── Search ──
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 2 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: COLORS.borderColor, borderRadius: 20, paddingHorizontal: 12,
    height: 40, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: { color: COLORS.white, marginLeft: 8, fontSize: 13, flex: 1, paddingVertical: 0 },
  addLeadBtn: {
    width: 118, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, backgroundColor: 'rgba(0,207,255,0.12)', borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.accent, paddingHorizontal: 6,
  },
  addLeadBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },

  countRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, paddingHorizontal: 2,
  },
  countText: { color: COLORS.mutedText, fontSize: 12, fontWeight: '600' },

  // ── Lead Card ──
  card: {
    backgroundColor:'rgba(4, 35, 70, 0.62)', borderRadius: 12, padding: 12, marginBottom: 10,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  cardTop: { marginBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { color: COLORS.white, fontWeight: '800', fontSize: 13, flex: 1, minWidth: 0 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 0.8, flexShrink: 0 },
  statusText: { fontSize: 10, fontWeight: '700' },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 8 },
  cardBody: { flexDirection: 'row', gap: 8 },
  leftCol: { flex: 1, gap: 5, minWidth: 0 },
  rightCol: { flex: 1, gap: 5, minWidth: 0 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  infoTouch: { flexShrink: 1 },
  infoText: { color: COLORS.mutedText, fontSize: 11, flexShrink: 1 },
  rmLabelCard: { color: COLORS.gold, fontSize: 11, fontWeight: '600' },
  rmValue: { color: COLORS.gold, fontSize: 11, fontWeight: '600', flexShrink: 1 },
  refLabel: { color: COLORS.labelText, fontSize: 10, fontWeight: '600' },
  refValue: { color: COLORS.labelText, fontSize: 10, flexShrink: 1 },
  section: { color: 'rgba(0, 208, 255, 0.84)' },
  value: { color: COLORS.white, fontSize: 11, flexShrink: 1 },
  phoneText: {
    color: '#00acc1',
    backgroundColor: 'rgba(0, 172, 193, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    fontSize: 11,
    flexShrink: 1,
    overflow: 'hidden',
  },
  emailText: {
    color: '#00acc1',
    textDecorationLine: 'underline',
    fontWeight: '500',
    fontSize: 11,
    flexShrink: 1,
  },
  extraBlock: {
    marginTop: 8, paddingTop: 8, gap: 5,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.12)',
  },
  extraRow: { flexDirection: 'row', alignItems: 'flex-start' },
  remarksCardText: { fontSize: 11, color: COLORS.white, lineHeight: 16 },
  readMore: { color: COLORS.accent, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, gap: 6,
  },
  interactionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1,
    backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: COLORS.accentBorder,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  interactionBtnText: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
  completed: { color: COLORS.mutedText, fontSize: 11, flexShrink: 1, textAlign: 'right' },

  topButton: {
    position: 'absolute', bottom: 100, right: 20,
    backgroundColor: '#1e9ce8', width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Modal common ──
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  modalTitle: { color: '#d7dbe2', fontSize: 17, fontWeight: '700' },
  cancelBtn: {
    backgroundColor: '#2b3348', paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 14, borderWidth: 1, borderColor: '#39415a',
  },
  cancelBtnText: { color: '#c3cbdb', fontWeight: '600', fontSize: 13 },

  // ── Filter Bottom Sheet ──
  bottomSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    zIndex: 99999,
    elevation: 99999,
  },
  bottomSheet: {
    backgroundColor: COLORS.modalBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 18, paddingBottom: 30, maxHeight: '85%',
  },
  handleBar: {
    width: 38, height: 4, backgroundColor: '#b0bec5',
    borderRadius: 4, alignSelf: 'center', marginBottom: 14,
  },
  filterModalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 12 },
  filterLabel: {
    color: '#8a9daf', fontSize: 11, fontWeight: '600', letterSpacing: 0.6,
    textTransform: 'uppercase', marginBottom: 6, marginTop: 4,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dateField: { flex: 1 },
  dateSubLabel: { color: COLORS.mutedText, fontSize: 11, marginBottom: 4 },
  dateSeparator: { paddingTop: 18 },
  sectionDividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  sectionDividerText: { color: COLORS.gold, fontSize: 13, fontWeight: '600' },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginLeft: 10 },
  filterBtnRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4,
  },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 14, borderWidth: 1, borderColor: '#39415a',
    backgroundColor: '#2b3348',
  },
  resetBtnText: { color: '#c3cbdb', fontSize: 13, fontWeight: '600' },
  filterActionBtns: { flexDirection: 'row', gap: 10 },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1e9ce8',
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14, minWidth: 80, justifyContent: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ── Input Field ──
  inputWrapper: { marginBottom: 10, width: '100%' },
  field: { marginBottom: 10 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2b3348',
    borderWidth: 1, borderColor: '#39415a', borderRadius: 12, paddingHorizontal: 12, height: 46,
  },
  input: { color: COLORS.white, flex: 1, fontSize: 13 },

  // ── Searchable Dropdown ──
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 46, backgroundColor: '#2b3348',
    borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#39415a',
  },
  dropdownTriggerText: { color: COLORS.white, fontSize: 13, flex: 1 },
  dropdownTriggerIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  sdModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sdKAV: { justifyContent: 'flex-end' },
  sdContainer: {
    backgroundColor: COLORS.modalBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: screenHeight * 0.65,
  },
  sdHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  sdTitle: { color: '#d7dbe2', fontSize: 15, fontWeight: '700' },
  sdSearchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#28304a', borderRadius: 12,
    paddingHorizontal: 12, height: 42, gap: 8,
    borderWidth: 1, borderColor: '#39415a', marginBottom: 8,
  },
  sdSearchInput: { flex: 1, color: COLORS.white, fontSize: 13 },
  sdCount: { color: COLORS.mutedText, fontSize: 11, marginBottom: 6, paddingLeft: 2 },
  sdList: { maxHeight: screenHeight * 0.38 },
  sdItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#323a52',
  },
  sdItemSelected: { backgroundColor: 'rgba(74,163,223,0.15)' },
  sdItemText: { color: COLORS.mutedText, fontSize: 13, flex: 1 },
  sdItemTextSelected: { color: COLORS.accent, fontWeight: '600' },
  sdEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  sdEmptyText: { color: COLORS.mutedText, fontSize: 13 },

  // ── RM History sheet ──
  rmHistoryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  rmHistorySheet: {
    backgroundColor: COLORS.modalBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: screenHeight * 0.85,
    width: '100%',
  },
  rmHistoryEmpty: {
    color: COLORS.mutedText, textAlign: 'center', marginVertical: 32, fontSize: 13,
  },
  rmHistoryBtnRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  rmHistoryScroll: { flexShrink: 1, width: '100%' },

  rmSummaryCard: {
    backgroundColor: '#28304a', borderRadius: 12, marginBottom: 16, overflow: 'hidden',
    flexDirection: 'row', borderWidth: 1, borderColor: '#39415a',
  },
  rmSummaryAccent: { width: 4, backgroundColor: COLORS.accent },
  rmSummaryContent: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
  rmSummaryItem: { flexDirection: 'row', alignItems: 'center', minHeight: 24 },
  rmSummaryLabel: {
    color: COLORS.mutedText, fontSize: 10, fontWeight: '700', letterSpacing: 0.4, width: 105,
  },
  rmSummaryValue: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '600' },
  rmSummaryCount: { color: COLORS.accent, fontSize: 16, fontWeight: '700' },

  rmTimelineItem: { flexDirection: 'row', marginBottom: 4 },
  rmTimelineLeft: { width: 16, alignItems: 'center', marginRight: 8 },
  rmTimelineDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent,
    marginTop: 18, borderWidth: 2, borderColor: COLORS.modalBg,
  },
  rmTimelineLine: { flex: 1, width: 2, backgroundColor: '#39415a', marginTop: 4 },
  rmTimelineCard: {
    flex: 1, backgroundColor: '#2b3348', borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#39415a',
  },
  rmCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  rmBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  rmBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  rmCardDate: { color: COLORS.mutedText, fontSize: 11 },

  rmTransferRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rmPersonCol: { flex: 1, alignItems: 'center' },
  rmAvatar: { width: 42, height: 42, borderRadius: 21, marginBottom: 6, backgroundColor: '#1e255a' },
  rmAvatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  rmPersonRole: {
    color: COLORS.mutedText, fontSize: 9, fontWeight: '600', letterSpacing: 0.4, marginBottom: 2,
  },
  rmPersonName: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  rmArrowWrap: { paddingHorizontal: 6, marginBottom: 18 },

  rmChangedByRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ffffff10', gap: 6,
  },
  rmChangedByLabel: { color: COLORS.mutedText, fontSize: 9, fontWeight: '600', letterSpacing: 0.4 },
  rmChangedByAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#1e255a' },
  rmChangedByName: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // ── Custom Alert ──
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  alertBox: {
    width: '100%', maxWidth: 340, backgroundColor: COLORS.modalBg, borderRadius: 22,
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20, alignItems: 'center',
    borderWidth: 1, borderColor: '#39415a', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 14,
  },
  alertTopBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  alertIconWrap: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 14 },
  alertMsgScroll: { alignSelf: 'stretch', maxHeight: screenHeight * 0.32, marginTop: 8 },
  alertMessage: { color: COLORS.mutedText, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  alertBtnRow: { alignSelf: 'stretch', flexDirection: 'row', gap: 10, marginTop: 20 },
  alertBtn: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 42 },
  alertBtnText: { fontSize: 13, fontWeight: '700' },
});