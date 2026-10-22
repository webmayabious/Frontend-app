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
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import Icon1 from 'react-native-vector-icons/Ionicons';
const screenHeight = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

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
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View style={[styles.alertOverlay, { opacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismiss} />

        <Animated.View style={[styles.alertBox, { opacity, transform: [{ scale }] }]}>
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

// ─── LEAD CARD ────────────────────────────────────────────────────────────────

const SiteCard = ({ data, navigation }) => {
  const remarks =
    data?.propertyfeedbacks
      ?.map(x => x?.remarks)
      ?.filter(Boolean)
      ?.join(', ') || 'No Remarks Available';

  const statusMeta =
    data?.active === '1'
      ? { text: 'Active', color: COLORS.green, bg: '#00C48C22', border: '#00C48C60' }
      : data?.active === '5'
        ? { text: 'Booking Done', color: '#9aa5b4', bg: '#6b778522', border: '#6b778560' }
        : { text: 'Inactive', color: COLORS.red, bg: '#FF6B6B22', border: '#FF6B6B60' };

  const siteVisit =
    data?.propertyfeedbacks?.map(x => x?.site_visit_date).filter(Boolean).join(', ') || 'N/A';

  return (
    <View style={styles.card}>
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

          <TouchableOpacity
            onPress={() => navigation.navigate('MeetingsEdit', { id: data?.id })}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Icon name="edit" size={17} color={COLORS.accent} />
          </TouchableOpacity>
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
                ? `${data.relationshipManager.usr_fname || ''} ${data.relationshipManager.usr_lname || ''}`.trim() || 'N/A'
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

const Totalleadscreen1 = ({setHideBottomNav}) => {
  const navigation = useNavigation();
  const listRef = useRef(null);
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);

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
    return () => 
      setHideBottomNav && setHideBottomNav(false),
      DeviceEventEmitter.emit('toggleBottomNav', true);
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
      const res = await api.get('/api/pm/getAllLeads', {
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

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

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

      {/* ── Section Header ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
            <TouchableOpacity
                     onPress={() => navigation.navigate('LeadsListScreen')}
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
          <Icon name="list-alt" size={20} color='#ffffff' />
          <Text style={styles.sectionTitle}>Total Leads</Text>
        </View>
        <View style={styles.sectionActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={openFilterModal} activeOpacity={0.75}>
            <Icon name="filter-alt" size={16} color={COLORS.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeBtn}
            onPress={() => navigation.navigate('LeadsListScreen')}
            activeOpacity={0.75}
          >
            <Text style={styles.changeBtnText}>Assign Leads</Text>
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.navigate('LeadsListScreen')}
            activeOpacity={0.75}
          >
            <View style={styles.backButton}>
              <Image
                source={require('../asset/image/icon/Arrow.png')}
                style={{ width: 11, height: 11, marginRight: 4 }}
              />
              <Text style={styles.closeBtnText}>Back</Text>
            </View>
          </TouchableOpacity> */}
        </View>
      </View>

      {/* ── Lead list ── */}
      <FlatList
        ref={listRef}
        data={leads}
        keyExtractor={(item, i) => (item?.id != null ? `lead-${item.id}` : `lead-idx-${i}`)}
        renderItem={({ item }) => <SiteCard data={item} navigation={navigation} />}
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
                  placeholder="Search name / phone / email..."
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
            </View>

            {totalRecords != null && (
              <View style={styles.countRow}>
                <Text style={styles.countText}>
                  Showing {leads.length ? 1 : 0} to {leads.length} of {totalRecords} entries
                </Text>
                {isFetching && !isFetchingNextPage && !isLoading && (
                  <ActivityIndicator size="small" color={COLORS.accent} />
                )}
              </View>
            )}

            {isLoading && (
              <View style={styles.initialLoader}>
                <ActivityIndicator size="large" color={COLORS.accent} />
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
              <ActivityIndicator size="small" color={COLORS.accent} />
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

export default Totalleadscreen1;

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

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.sectionBg, borderRadius: 20, marginHorizontal: 12,
    marginTop: 10, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sectionTitle: { color: '#ffffff', fontSize: 17, fontWeight: '700'},
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
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingHorizontal: 12,
    paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  closeBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
  backButton: { flexDirection: 'row', alignItems: 'center' },

  // ── Search ──
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 2 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: COLORS.borderColor, borderRadius: 20, paddingHorizontal: 12,
    height: 40, backgroundColor: 'rgba(255,255,255,0.06)',
  },
    backBtn: {
    paddingRight: 2,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(4, 35, 70, 0.62)', borderRadius: 12, padding: 12, marginBottom: 10,
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