import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Image,
  Platform,
  Linking,
  Share,
  Modal,
  FlatList,
  Keyboard,
  DeviceEventEmitter,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import api from '../api/AxiosInstance';
import { useMutation, useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { pick, types } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { useSelector } from 'react-redux';

const screenHeight = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const PAGE_LIMIT = 20; // backend er sathe match korte hobe
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

// ─── SEARCHABLE DROPDOWN (filter sheet) ──────────────────────────────────────

const SearchableDropdown = ({ label, data = [], placeholder, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  const selectedItem = data.find(item => item.value === value);
  const filtered = data.filter(item =>
    item.label.toLowerCase().includes(search.toLowerCase()),
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

// ─── INLINE DROPDOWN FIELD (upload modal) ────────────────────────────────────

const LIST_HEIGHT = 220;
const FIELD_TOP_OFFSET = Platform.OS === 'ios' ? 280 : 280;

const DropdownField = ({
  label,
  data,
  value,
  onChange,
  error,
  scrollRef,
  scrollYRef,
  placeholder,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropAnim = useRef(new Animated.Value(0)).current;
  const wrapRef = useRef(null);

  const options = data || [];
  const selected = options.find(o => o.value === value);

  const filtered = options.filter(o =>
    String(o.label ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const maxHeight = dropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LIST_HEIGHT],
  });

  const scrollFieldUp = () => {
    if (!wrapRef.current || !scrollRef?.current) return;
    wrapRef.current.measureInWindow((x, y) => {
      const delta = y - FIELD_TOP_OFFSET;
      if (delta > 0) {
        scrollRef.current.scrollTo({
          y: (scrollYRef?.current || 0) + delta,
          animated: true,
        });
      }
    });
  };

  const close = (duration = 180) => {
    Keyboard.dismiss();
    Animated.timing(dropAnim, {
      toValue: 0,
      duration,
      useNativeDriver: false,
    }).start(() => {
      setOpen(false);
      setSearch('');
      DeviceEventEmitter.emit('toggleBottomNav', true);
    });
  };

  const toggle = () => {
    if (open) {
      close();
    } else {
      DeviceEventEmitter.emit('toggleBottomNav', false);
      setOpen(true);
      scrollFieldUp();
      Animated.timing(dropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start(scrollFieldUp);
    }
  };

  useEffect(() => {
    return () => DeviceEventEmitter.emit('toggleBottomNav', true);
  }, []);

  const handleSelect = item => {
    onChange && onChange(item.value);
    close(150);
  };

  return (
    <View ref={wrapRef} collapsable={false} style={styles.field}>
      {label ? <Text style={styles.filterLabel}>{label}</Text> : null}

      <TouchableOpacity
        style={[styles.ddTrigger, open && styles.ddTriggerOpen, error && styles.inputError]}
        onPress={toggle}
        activeOpacity={0.8}
      >
        <Text
          style={[styles.ddTriggerText, !selected && { color: COLORS.mutedText }]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder || 'Select...'}
        </Text>
        <Icon
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color={COLORS.accent}
        />
      </TouchableOpacity>

      {open && (
        <Animated.View style={[styles.ddMenu, { maxHeight, opacity: dropAnim }]}>
          <View style={styles.ddSearchWrap}>
            <Icon name="search" size={16} color={COLORS.accent} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.ddSearchInput}
              placeholder="Search..."
              placeholderTextColor={COLORS.mutedText}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon name="close" size={14} color={COLORS.mutedText} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={{ maxHeight: 155 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
          >
            {filtered.length === 0 ? (
              <Text style={styles.ddNoResult}>No results found</Text>
            ) : (
              filtered.map(item => {
                const isActive = item.value === value;
                return (
                  <TouchableOpacity
                    key={String(item.value)}
                    style={[styles.ddItem, isActive && styles.ddItemActive]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.ddItemText, isActive && styles.ddItemTextActive]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {isActive && <Icon name="check-circle" size={16} color={COLORS.accent} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const AssignRM = ({ setHideBottomNav }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRM, setSelectedRM] = useState(null);
  const [rmList, setRmList] = useState([]);
  const [rmLoading, setRmLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const [uploadProspect, setUploadProspect] = useState({
    reference: null,
    com_id: null,
    location: null,
  });

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState();
  const [filters, setFilters] = useState({
    fromDate: null,
    toDate: null,
    project: null,
    location: null,
  });

  const filterAnim = useRef(new Animated.Value(screenHeight)).current;
  const uploadAnim = useRef(new Animated.Value(screenHeight)).current;

  const userRole = useSelector(state => state.userRole);
  const isAdmin = userRole?.includes('ADMIN');

  useEffect(() => { fetchRMList(); }, []);

  // ── Bottom Sheet ──
  const openFilterModal = () => {
    setHideBottomNav && setHideBottomNav(true);
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
    });
  };

  // ── Date ──
  const formatDate = date => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const onDateChange = (event, selectedDate, key) => {
    key === 'fromDate' ? setShowFromPicker(false) : setShowToPicker(false);
    if (selectedDate) onFilterChange(key, formatDate(selectedDate));
  };

  // ── RM List ──
  const fetchRMList = async () => {
    setRmLoading(true);
    try {
      const res = await api.get('/api/pm/getAllRM');
      if (res?.data?.success) setRmList(res.data.data || []);
    } catch (error) {
      console.log('RM fetch error:', error);
    } finally {
      setRmLoading(false);
    }
  };

  // ── Queries ──
  const { data: AllReferences } = useQuery({
    queryKey: ['AllReferences'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllMrReferences');
      return res?.data?.data;
    },
  });
  const References = AllReferences?.map(item => ({ label: item.mrf_name, value: item.id }));

  const { data: allCompanies } = useQuery({
    queryKey: ['allOwnCompany'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getOwnCompany');
      return res.data.data || [];
    },
  });
  const Company = allCompanies?.map(item => ({ label: item.com_name, value: item.id }));

  const { data: AllProperty } = useQuery({
    queryKey: ['AllProperty'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLocation');
      return res.data.data;
    },
  });
  const Property = AllProperty?.map(item => ({ label: item.name, value: item.id }));

  const { data: projectList = [] } = useQuery({
    queryKey: ['project'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyProjects');
      return res.data.data || [];
    },
  });
  const projectOptions = projectList?.map(item => ({ label: item.project_name, value: item.id }));

  // ── Infinite Scroll: Leads list ──
  const {
    data: RmPages,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch: rmrefetch,
  } = useInfiniteQuery({
    queryKey: ['AssignRm', appliedFilters],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get('/api/pm/getAllPropertyLeadWithoutRM', {
        params: {
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          project: filters.project || undefined,
          location: filters.location || undefined,
          page: pageParam,
          limit: PAGE_LIMIT,
        },
      });
      return { ...res?.data, page: pageParam };
    },
    getNextPageParam: lastPage => {
      const items = lastPage?.data || [];
      const totalRecords = lastPage?.totalRecords;
      const loadedSoFar = lastPage.page * PAGE_LIMIT;
      if (typeof totalRecords === 'number') {
        return loadedSoFar < totalRecords ? lastPage.page + 1 : undefined;
      }
      return items.length === PAGE_LIMIT ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const allLeads = RmPages?.pages?.flatMap(page => page?.data || []) || [];
  const totalRecords = RmPages?.pages?.[0]?.totalRecords;

  const filteredrm = allLeads?.filter(item => {
    const search = searchText.toLowerCase();
    return (
      (item?.name?.toLowerCase() || '').includes(search) ||
      (item?.phone || '').includes(search) ||
      (item?.email?.toLowerCase() || '').includes(search)
    );
  });

  const selectedLeadIds = selected;

  // ── Assign RM ──
  const handleAssignRM = async () => {
    if (!selectedRM) {
      showAlert('⚠️ No RM Selected', 'Please select a Relationship Manager before assigning.', [{ text: 'OK', style: 'default' }]);
      return;
    }
    if (selectedLeadIds.length === 0) {
      showAlert('⚠️ No Leads Selected', 'Please select at least one lead to assign.', [{ text: 'OK', style: 'default' }]);
      return;
    }
    setAssigning(true);
    try {
      const res = await api.put('/api/pm/assignRM', {
        rm_id: selectedRM,
        property_lead_id: selectedLeadIds,
      });
      if (res?.data?.status) {
        showAlert('✅ Assigned Successfully', res?.data?.message || 'RM has been assigned to the selected leads.', [
          { text: 'OK', style: 'default', onPress: () => { setShowModal(false); setSelected([]); setSelectedRM(null); rmrefetch(); } },
        ], { cancelable: false });
      } else {
        showAlert('❌ Assignment Failed', res?.data?.message || 'Failed to assign RM. Please try again.', [{ text: 'OK', style: 'cancel' }]);
      }
    } catch (error) {
      showAlert('❌ Error', 'Something went wrong. Please try again.', [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setAssigning(false);
    }
  };

  // ── Select ──
  const toggleSelect = id => {
    setSelected(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === allLeads.length) setSelected([]);
    else setSelected(allLeads.map(item => item.id));
  };

  const isAllSelected = selected.length === allLeads.length && allLeads.length > 0;

  // ── Delete ──
  const handleDeleteProspect = (id, status) => {
    showAlert('Are you sure?', 'This lead will be deleted permanently.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Delete', style: 'destructive', onPress: () => deleteProspect({ id, status }) },
    ], { cancelable: true });
  };

  const { mutate: deleteProspect } = useMutation({
    mutationFn: ({ id, status }) =>
      api.put('/api/pm/changePropertyLeadStatus', { property_lead_id: id, active: status }),
    onSuccess: () => rmrefetch(),
  });

  // ── Download Format ──
  const handleDownloadFormat = async () => {
    const fileName = 'mulyam_new.xlsx';
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version < 29) {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            showAlert('Permission Denied', 'Storage permission is required.');
            return;
          }
        }
        const assetContent = await RNFS.readFileAssets(fileName, 'base64');
        const destPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
        await RNFS.writeFile(destPath, assetContent, 'base64');
        await notifee.createChannel({ id: 'download', name: 'Downloads', importance: AndroidImportance.HIGH });
        await notifee.displayNotification({ title: 'Download Complete ✅', body: `File saved: ${destPath}`, android: { channelId: 'download' } });
        showAlert('Success', 'File saved to Downloads folder!');
      } else {
        const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
        const sourcePath = `${RNFS.MainBundlePath}/${fileName}`;
        const sourceExists = await RNFS.exists(sourcePath);
        if (!sourceExists) { showAlert('Error', 'Template file not found in bundle.'); return; }
        const destExists = await RNFS.exists(destPath);
        if (destExists) await RNFS.unlink(destPath);
        await RNFS.copyFile(sourcePath, destPath);
        await Share.share({ url: `file://${destPath}` });
      }
    } catch (err) {
      console.log('❌ Download Error:', err);
      showAlert('Error', err.message || 'Could not download the file.');
    }
  };

  // ── Pick File ──
  const pickExcelFile = async () => {
    try {
      const [file] = await pick({ type: [types.xls, types.xlsx, types.csv] });
      if (file) setSelectedFile({ uri: file.uri, type: file.type, name: file.name });
    } catch (err) {
      console.log('Pick error:', err);
    }
  };

  const handleUpload = async () => {
    if (isAdmin) {
      if (!uploadProspect.reference || !uploadProspect.com_id || !selectedFile) {
        showAlert('⚠️ Missing Fields', 'Please select Reference, Company and File', [{ text: 'OK', style: 'default' }]);
        return;
      }
    } else {
      if (!uploadProspect.reference || !uploadProspect.location || !selectedFile) {
        showAlert('⚠️ Missing Fields', 'Please select Location, Reference and File', [{ text: 'OK', style: 'default' }]);
        return;
      }
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('excelUpload', { uri: selectedFile.uri, type: selectedFile.type, name: selectedFile.name });
      formData.append('reference', String(uploadProspect.reference));
      formData.append('location', String(uploadProspect.location || ''));
      if (isAdmin && uploadProspect.com_id) formData.append('com_id', String(uploadProspect.com_id));
      const res = await api.post('/api/pm/uploadPropertyLeadFromExcel', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const resData = res?.data;
      const insertedCount = resData?.insertedCount ?? 0;
      const skippedCount = resData?.skippedCount ?? 0;
      const errorRows = resData?.errorRows ?? [];
      if (resData?.status === true && insertedCount === 0 && errorRows.length > 0) {
        const duplicateDetails = errorRows.map((e, i) => `${i + 1}. ${e.row?.name} (${e.row?.phone})\n    ↳ ${e.reason}`).join('\n');
        showAlert('⚠️ Duplicate Entries Found', `All ${skippedCount} entries already exist.\n\n${duplicateDetails}`, [{ text: 'OK', style: 'default' }]);
        setSelectedFile(null);
      } else if (resData?.status === true && insertedCount > 0 && errorRows.length > 0) {
        const duplicateDetails = errorRows.map((e, i) => `${i + 1}. ${e.row?.name} (${e.row?.phone})\n    ↳ ${e.reason}`).join('\n');
        showAlert('⚠️ Partial Upload', `✅ ${insertedCount} leads uploaded.\n⚠️ ${skippedCount} skipped:\n\n${duplicateDetails}`, [
          { text: 'OK', style: 'default', onPress: () => { closeUploadModal(); rmrefetch(); } },
        ]);
      } else if (resData?.status === true && insertedCount > 0 && errorRows.length === 0) {
        showAlert('✅ Upload Successful', `${insertedCount} leads uploaded successfully!`, [
          { text: 'OK', style: 'default', onPress: () => { closeUploadModal(); rmrefetch(); } },
        ]);
      } else {
        showAlert('❌ Upload Failed', resData?.message || 'Upload failed.', [{ text: 'OK', style: 'cancel' }]);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || '';
      const errStatus = err?.response?.status;
      if (errStatus === 409 || errMsg.toLowerCase().includes('duplicate') || errMsg.toLowerCase().includes('already exist') || errMsg.toLowerCase().includes('phone') || errMsg.toLowerCase().includes('exist')) {
        showAlert('⚠️ Duplicate Entries Found', `${errMsg || 'Some entries already exist.'}\n\nPlease remove duplicate entries and try again.`, [{ text: 'OK', style: 'default' }]);
        setSelectedFile(null);
      } else {
        showAlert('❌ Something Went Wrong', errMsg || 'An unexpected error occurred.', [{ text: 'OK', style: 'cancel' }]);
      }
    } finally {
      setUploading(false);
    }
  };

  const openUploadModal = () => {
    setHideBottomNav && setHideBottomNav(true);
    setShowUploadModal(true);
    uploadAnim.setValue(screenHeight);
    requestAnimationFrame(() => {
      Animated.spring(uploadAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
      }).start();
    });
  };

  const closeUploadModal = () => {
    Keyboard.dismiss();
    Animated.timing(uploadAnim, {
      toValue: screenHeight,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setUploadProspect({ reference: null, com_id: null, location: null });
      setSelectedFile(null);
      setShowUploadModal(false);
      setHideBottomNav && setHideBottomNav(false);
    });
  };

  const onChange = (key, value) => setUploadProspect(prev => ({ ...prev, [key]: value }));
  const onFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const applyFilter = () => { setAppliedFilters(filters); closeFilterModal(); };
  const resetFilters = () => {
    const cleared = { fromDate: null, toDate: null, project: null, location: null };
    setFilters(cleared);
    setAppliedFilters(cleared);
    closeFilterModal();
  };

  useEffect(() => {
    navigation.setParams({ hideBottomNav: showFilterModal });
  }, [showFilterModal]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  };

  // ─── RENDER: Lead Card ──────────────────────────────────────────────────

  const renderLeadCard = ({ item }) => {
    const isChecked = selected.includes(item.id);
    return (
      <View style={[styles.card, isChecked && styles.cardSelected]}>
        <View style={styles.cardTop}>
          <View style={styles.nameRow}>
            <TouchableOpacity
              onPress={() => toggleSelect(item.id)}
              style={[styles.checkbox, isChecked && styles.checkboxChecked]}
            >
              {isChecked && <Icon name="check" size={11} color="#fff" />}
            </TouchableOpacity>
            <Text style={styles.cardName} numberOfLines={2}>
              {item?.name || 'N/A'} |{' '}
              <Text style={styles.section}>{item?.propertyproject?.project_name}</Text>
            </Text>
            <View style={styles.iconRow}>
              <TouchableOpacity onPress={() => handleDeleteProspect(item?.id, item?.active == 1 ? 0 : 1)}>
                <Icon name="delete" size={16} color={COLORS.red} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('MeetingsEdit', { id: item?.id })}>
                <Icon name="edit" size={16} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <View style={styles.leftCol}>
            <View style={styles.infoRow}>
              <Icon name="call" size={12} color={COLORS.accent} />
              <TouchableOpacity style={styles.infoTouch} onPress={() => makeCall(item?.phone)}>
                <Text style={styles.phoneText} numberOfLines={1}>
                  {item?.phone || 'N/A'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Icon name="email" size={12} color={COLORS.accent} />
              <TouchableOpacity style={styles.infoTouch} onPress={() => sendMail(item?.email)}>
                <Text style={styles.emailText} numberOfLines={1}>
                  {item?.email || 'N/A'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.rightCol}>
            <View style={styles.infoRow}>
              <Icon name="location-on" size={12} color={COLORS.gold} />
              <Text style={styles.infoText} numberOfLines={1}>
                {item?.address || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.refLabel}>Reference: </Text>
              <Text style={styles.refValue} numberOfLines={2}>
                {item?.mrreference?.mrf_name || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* TOP BAR: [back + icon + title] ............ [assign] (same as ChangeRM) */}
        <View
          style={[
            styles.topBarContainer,
            { paddingTop: insets.top + verticalScale(10) },
          ]}
        >
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
              <MaterialCommunityIcons
                name="account-details"
                size={20}
                color="#ffffff"
              />
              <Text style={styles.screenTitle} numberOfLines={1}>
                Assign RM
              </Text>
              {totalRecords ? (
                <View style={styles.recordBadge}>
                  <Text style={styles.recordText}>{totalRecords}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.changeBtn}
              onPress={() => {
                if (selected.length === 0) {
                  showAlert(
                    '⚠️ No Leads Selected',
                    'Please select at least one lead to assign an RM.',
                    [{ text: 'OK', style: 'default' }],
                  );
                  return;
                }
                setShowModal(true);
              }}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.changeBtnText}>Assign</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Action Buttons Row ── */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Rmform')} activeOpacity={0.75}>
            <Icon name="add" size={13} color="#fff" />
            <Text style={styles.actionBtnText} numberOfLines={1} adjustsFontSizeToFit>Add New Lead</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={openUploadModal} activeOpacity={0.75}>
            <Icon name="upload-file" size={13} color="#fff" />
            <Text style={styles.actionBtnText} numberOfLines={1} adjustsFontSizeToFit>Upload List</Text>
          </TouchableOpacity>
        </View>

        {/* ── Infinite Scroll Lead List ── */}
        <FlatList
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          data={filteredrm}
          keyExtractor={item => String(item.id)}
          renderItem={renderLeadCard}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
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
                  />
                  {searchText ? (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                      <Icon name="close" size={15} color={COLORS.mutedText} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={styles.selectAllRow}>
                <TouchableOpacity style={styles.selectAllLeft} onPress={toggleSelectAll}>
                  <View style={[styles.checkbox, isAllSelected && styles.checkboxChecked]}>
                    {isAllSelected && <Icon name="check" size={11} color="#fff" />}
                  </View>
                  <Text style={styles.selectAllText}>
                    {isAllSelected ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>

                {selected.length > 0 && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>{selected.length} selected</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.filterBtn} onPress={openFilterModal}>
                  <Icon name="filter-list" size={13} color="#fff" />
                  <Text style={styles.filterBtnText}>By Details</Text>
                  <Icon name="keyboard-arrow-down" size={13} color="#fff" />
                </TouchableOpacity>
              </View>

              {isLoading && (
                <View style={styles.initialLoader}>
                  <ActivityIndicator size="large" color='#fff' />
                </View>
              )}

              {!isLoading && filteredrm.length === 0 && (
                <Text style={styles.centeredText}>No leads found</Text>
              )}
            </>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color='#fff' />
                <Text style={styles.footerText}>Loading more...</Text>
              </View>
            ) : !hasNextPage && allLeads.length > 0 ? (
              <Text style={styles.endOfListText}>— You've reached the end —</Text>
            ) : null
          }
        />

        {/* ── Assign RM Modal ── */}
        {showModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assign RM</Text>
                <TouchableOpacity onPress={() => { setShowModal(false); setSelectedRM(null); }}>
                  <Icon name="close" size={20} color={COLORS.mutedText} />
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <Icon name="people" size={14} color={COLORS.gold} />
                <Text style={styles.infoBoxText}>
                  {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
                </Text>
              </View>

              <Text style={styles.rmLabel}>Select RM</Text>

              {rmLoading ? (
                <ActivityIndicator color='#fff' style={{ marginVertical: 20 }} />
              ) : (
                <ScrollView style={styles.dropdownList} nestedScrollEnabled showsVerticalScrollIndicator>
                  {rmList.length === 0 ? (
                    <Text style={styles.noRMText}>No RM found</Text>
                  ) : (
                    rmList.map(rm => {
                      const isSelected = selectedRM === rm.id;
                      return (
                        <TouchableOpacity
                          key={rm.id}
                          style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                          onPress={() => setSelectedRM(rm.id)}
                        >
                          <View style={styles.rmItemLeft}>
                            <View style={[styles.rmRadio, isSelected && styles.rmRadioSelected]}>
                              {isSelected && <View style={styles.rmRadioInner} />}
                            </View>
                            <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                              {rm.name}
                            </Text>
                          </View>
                          {isSelected && <Icon name="check-circle" size={16} color={COLORS.accent} />}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              )}

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); setSelectedRM(null); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.assignBtn, (!selectedRM || assigning) && styles.assignBtnDisabled]}
                  onPress={handleAssignRM}
                  disabled={!selectedRM || assigning}
                >
                  {assigning
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.assignBtnText}>Assign</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Upload Bottom Sheet ── */}
        {showUploadModal && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.bottomSheetOverlay}
            keyboardVerticalOffset={0}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeUploadModal}
            />
            <Animated.View
              style={[styles.bottomSheet, { transform: [{ translateY: uploadAnim }] }]}
            >
              <View style={styles.handleBar} />

              <View style={styles.modalHeader}>
                <View style={styles.filterModalTitleRow}>
                  <Icon name="upload-file" size={17} color={COLORS.accent} />
                  <Text style={styles.modalTitle}>Upload Leads</Text>
                </View>
                <TouchableOpacity onPress={closeUploadModal}>
                  <Icon name="close" size={20} color={COLORS.mutedText} />
                </TouchableOpacity>
              </View>

              <View style={styles.roleBadge}>
                <Icon
                  name={isAdmin ? 'admin-panel-settings' : 'business'}
                  size={12}
                  color={isAdmin ? COLORS.gold : COLORS.accent}
                />
                <Text style={[styles.roleBadgeText, { color: isAdmin ? COLORS.gold : COLORS.accent }]}>
                  {isAdmin ? 'Admin Upload' : 'Business Upload'}
                </Text>
              </View>

              <View style={styles.filterDivider} />

              <ScrollView
                style={{ flexShrink: 1 }}
                contentContainerStyle={{ paddingBottom: 8 }}
                ref={scrollRef}
                onScroll={e => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <DropdownField
                  label="Location of Property *"
                  data={Property}
                  placeholder="Select Location"
                  value={uploadProspect.location}
                  onChange={value => onChange('location', value)}
                  scrollRef={scrollRef}
                  scrollYRef={scrollYRef}
                />
                <DropdownField
                  label="Reference *"
                  data={References}
                  placeholder="Select Reference"
                  value={uploadProspect.reference}
                  onChange={value => onChange('reference', value)}
                  scrollRef={scrollRef}
                  scrollYRef={scrollYRef}
                />
                {isAdmin && (
                  <DropdownField
                    label="Company *"
                    data={Company}
                    placeholder="Select Company"
                    value={uploadProspect.com_id}
                    onChange={value => onChange('com_id', value)}
                    scrollRef={scrollRef}
                    scrollYRef={scrollYRef}
                  />
                )}

                <Text style={styles.filterLabel}>Excel / CSV File *</Text>
                <TouchableOpacity style={styles.browseBtn} onPress={pickExcelFile} activeOpacity={0.8}>
                  <Icon name="folder-open" size={15} color="#fff" />
                  <Text style={styles.browseText} numberOfLines={1}>
                    {selectedFile ? selectedFile.name : 'Browse File...'}
                  </Text>
                </TouchableOpacity>

                {selectedFile && (
                  <View style={styles.fileInfoRow}>
                    <Icon name="insert-drive-file" size={13} color={COLORS.green} />
                    <Text style={styles.fileInfoText} numberOfLines={1}>{selectedFile.name}</Text>
                    <TouchableOpacity onPress={() => setSelectedFile(null)}>
                      <Icon name="close" size={13} color={COLORS.red} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.downloadCard}>
                  <Text style={styles.downloadTitle}>📄 Download Format</Text>
                  <Text style={styles.downloadDesc}>
                    Download the template file to prepare your lead data for upload.
                  </Text>
                  <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadFormat}>
                    <Icon name="download" size={15} color="#000" />
                    <Text style={styles.downloadBtnText}>Download Template</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.filterDivider} />

              <View style={styles.uploadBtnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeUploadModal}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.applyBtn, { backgroundColor: '#22c55e' }, uploading && { opacity: 0.6 }]}
                  onPress={handleUpload}
                  disabled={uploading}
                >
                  {uploading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : (
                      <>
                        <Icon name="cloud-upload" size={14} color="#fff" />
                        <Text style={styles.applyBtnText}>Upload</Text>
                      </>
                    )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        )}

        {/* ── Filter Bottom Sheet ── */}
        {showFilterModal && (
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
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
              >
                <SearchableDropdown
                  label="Property Location"
                  data={Property}
                  placeholder="Select Location"
                  value={filters.location}
                  onChange={value => onFilterChange('location', value)}
                />
                <SearchableDropdown
                  label="Project"
                  data={projectOptions}
                  placeholder="Select Project"
                  value={filters.project}
                  onChange={value => onFilterChange('project', value)}
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
        )}
      </KeyboardAvoidingView>

      {/* ── Custom Alert ── */}
      <CustomAlertHost />
    </View>
  );
};

export default AssignRM;

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
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingBottom: 100 },
  centeredText: { color: COLORS.white, textAlign: 'center', marginTop: 24, fontSize: 14, opacity: 0.7 },
  endOfListText: { color: COLORS.mutedText, textAlign: 'center', marginVertical: 16, fontSize: 12, opacity: 0.7 },
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
  changeBtn: {
    backgroundColor: 'rgba(0,207,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  changeBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
  recordBadge: {
    backgroundColor: COLORS.goldDim, borderWidth: 1, borderColor: COLORS.goldBorder,
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 2, marginLeft: 8,
  },
  recordText: { color: COLORS.gold, fontSize: 10, fontWeight: '600' },

  // ── Action Buttons ──
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 10, gap: 6 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: 6,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', minHeight: 36,
  },
  actionBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // ── Search ──
  searchRow: { marginBottom: 8, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: COLORS.borderColor, borderRadius: 20, paddingHorizontal: 12,
    height: 40, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: { color: COLORS.white, marginLeft: 8, fontSize: 13, flex: 1, paddingVertical: 0 },

  // ── Select All Row ──
  selectAllRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, paddingHorizontal: 2,
  },
  selectAllLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectAllText: { color: COLORS.white, fontSize: 13, fontWeight: '500' },
  selectedBadge: {
    backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: COLORS.accentBorder,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
  },
  selectedBadgeText: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(36, 37, 56, 0.27)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderColor, flexShrink: 0,
  },
  filterBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '500' },

  // ── Checkbox ──
  checkbox: {
    width: 17, height: 17, borderRadius: 4, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'transparent',
  },
  checkboxChecked: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },

  // ── Lead Card ──
  card: {
    backgroundColor: 'rgba(4, 35, 70, 0.62)',
    borderRadius: 12, padding: 12, marginBottom: 10,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
    minHeight: 120
  },
  cardSelected: { borderColor: 'rgba(0,207,255,0.45)' },
  cardTop: { marginBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { color: COLORS.white, fontWeight: '800', fontSize: 13, flex: 1, minWidth: 0 },
  iconRow: { flexDirection: 'row', gap: 12, flexShrink: 0 },
  divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 8 },
  cardBody: { flexDirection: 'row', gap: 8 },
  leftCol: { flex: 1, gap: 5, minWidth: 0 },
  rightCol: { flex: 1, gap: 5, minWidth: 0 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  infoTouch: { flexShrink: 1 },
  infoText: { color: COLORS.mutedText, fontSize: 11, flexShrink: 1 },
  refLabel: { color: COLORS.labelText, fontSize: 10, fontWeight: '600' },
  refValue: { color: COLORS.labelText, fontSize: 10, flexShrink: 1 },
  section: { color: 'rgba(0, 208, 255, 0.84)' },
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

  // ── Assign RM Modal ──
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center',
    alignItems: 'center', zIndex: 1000,
  },
  modalContainer: {
    width: '90%', backgroundColor: COLORS.modalBg, borderRadius: 20, padding: 18,
    maxHeight: '75%', borderWidth: 1, borderColor: '#39415a',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  modalTitle: { color: '#d7dbe2', fontSize: 17, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.goldDim,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.goldBorder,
  },
  infoBoxText: { color: COLORS.gold, fontSize: 12, fontWeight: '500' },
  rmLabel: { color: '#9aa8bd', marginBottom: 6, fontSize: 13, fontWeight: '600' },
  dropdownList: {
    maxHeight: 200, borderWidth: 1, borderColor: '#39415a',
    backgroundColor: '#2b3348',
    borderRadius: 12, marginBottom: 12, marginTop: 4,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1,
    borderBottomColor: '#323a52',
  },
  dropdownItemSelected: { backgroundColor: 'rgba(74,163,223,0.15)' },
  rmItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rmRadio: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  rmRadioSelected: { borderColor: COLORS.accent },
  rmRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  dropdownItemText: { color: COLORS.mutedText, fontSize: 13 },
  dropdownItemTextSelected: { color: COLORS.accent, fontWeight: '600' },
  noRMText: { color: COLORS.mutedText, textAlign: 'center', padding: 20, fontSize: 13 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: {
    backgroundColor: '#2b3348', paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 14, borderWidth: 1, borderColor: '#39415a',
  },
  cancelBtnText: { color: '#c3cbdb', fontWeight: '600', fontSize: 13 },
  assignBtn: {
    backgroundColor: '#1e9ce8', paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 14, minWidth: 80, alignItems: 'center',
  },
  assignBtnDisabled: { backgroundColor: 'rgba(30,156,232,0.35)' },
  assignBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ── Upload Modal ──
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 10,
    paddingVertical: 4, marginBottom: 4, borderWidth: 1, borderColor: COLORS.borderColor,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  uploadBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 },
  browseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1e9ce8',
    paddingHorizontal: 14, height: 46, borderRadius: 12,
  },
  browseText: { color: '#fff', fontSize: 12, flex: 1 },
  fileInfoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: 'rgba(0,196,140,0.1)', borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 6, borderWidth: 0.5, borderColor: 'rgba(0,196,140,0.3)',
  },
  fileInfoText: { color: COLORS.green, fontSize: 11, flex: 1 },
  downloadCard: {
    marginTop: 14,
    backgroundColor: '#28304a', borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#39415a',
  },
  downloadTitle: { color: COLORS.gold, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  downloadDesc: { color: COLORS.mutedText, fontSize: 11, marginBottom: 10, lineHeight: 16 },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, alignSelf: 'flex-start',
  },
  downloadBtnText: { color: '#000', fontWeight: '600', fontSize: 12 },

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
  inputError: { borderColor: COLORS.red },
  errorText: { color: COLORS.red, fontSize: 11, marginTop: 4 },

  // ── Searchable Dropdown (filter sheet) ──
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

  // ── Inline Dropdown (upload modal) ──
  ddTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 46, backgroundColor: '#2b3348', borderRadius: 12,
    paddingHorizontal: 14, borderWidth: 1, borderColor: '#39415a',
  },
  ddTriggerOpen: { borderColor: COLORS.accent },
  ddTriggerText: { color: COLORS.white, fontSize: 13, flex: 1 },
  ddMenu: {
    marginTop: 4, backgroundColor: '#2b3348', borderRadius: 12,
    borderWidth: 1, borderColor: '#39415a',
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
  },
  ddSearchWrap: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#39415a', backgroundColor: '#28304a',
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
  },
  ddSearchInput: { flex: 1, fontSize: 13, color: COLORS.white, padding: 0 },
  ddNoResult: { textAlign: 'center', color: COLORS.mutedText, fontSize: 12, paddingVertical: 16 },
  ddItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#323a52',
  },
  ddItemActive: { backgroundColor: 'rgba(74,163,223,0.15)' },
  ddItemText: { flex: 1, fontSize: 13, color: COLORS.mutedText },
  ddItemTextActive: { color: COLORS.accent, fontWeight: '600' },

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