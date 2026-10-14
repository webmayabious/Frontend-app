import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Linking,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import api from '../api/AxiosInstance';
import { useQuery, useMutation } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';

const screenHeight = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const PAGE_SIZE = 20;
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (screenHeight / 812) * size;

// ─── COLORS ──────────────────────────────────────────────────────────────────

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

// ─── CUSTOM ALERT (Alert.alert er replacement, app theme er sathe match kore) ─

let _alertHandler = null;

// Alert.alert er moto-i signature: showAlert(title, message, buttons, options)
const showAlert = (title, message, buttons, options) => {
  if (_alertHandler) {
    _alertHandler({ title, message, buttons, options });
  } else {
    Alert.alert(title, message, buttons, options); // fallback (host mount hoyni)
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
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = () => {
    setIsOpen(true);
    setSearch('');
    // auto-focus search box after modal opens
    setTimeout(() => searchRef.current?.focus(), 150);
  };

  const handleSelect = (item) => {
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

      {/* Trigger Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleOpen}
        style={styles.dropdownTrigger}
      >
        <Text
          style={[
            styles.dropdownTriggerText,
            !selectedItem && { color: COLORS.mutedText },
          ]}
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

      {/* Dropdown Modal */}
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
                {/* Header */}
                <View style={styles.sdHeader}>
                  <Text style={styles.sdTitle}>{label || placeholder}</Text>
                  <TouchableOpacity onPress={() => { setIsOpen(false); setSearch(''); }}>
                    <Icon name="close" size={20} color={COLORS.mutedText} />
                  </TouchableOpacity>
                </View>

                {/* Search Box */}
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

                {/* Count */}
                <Text style={styles.sdCount}>
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </Text>

                {/* List */}
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
                        <Text
                          style={[
                            styles.sdItemText,
                            isSelected && styles.sdItemTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Icon name="check-circle" size={16} color={COLORS.accent} />
                        )}
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
        />
        {icon && <Icon name={icon} size={18} color={COLORS.accent} />}
      </View>
    </TouchableOpacity>
  </View>
);

// ─── MAKE CALL ────────────────────────────────────────────────────────────────

const makeCall = phoneNumber => {
  if (!phoneNumber) return;

  const cleanNumber = phoneNumber.replace(/\D/g, '');

  showAlert('Contact', `Choose an action for ${phoneNumber}`, [
    {
      text: 'Cancel',
      style: 'cancel',
    },
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
            // Opens WhatsApp Web or the app if installed
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
const sendMail = async (email) => {
  if (!email) return;

  try {
    if (Platform.OS === 'android') {
      const gmailUrl = `googlegmail://co?to=${email}`;
      const supported = await Linking.canOpenURL(gmailUrl);

      if (supported) {
        await Linking.openURL(gmailUrl);
      } else {
        // Fallback to mailto
        await Linking.openURL(`mailto:${email}`);
      }
    } else {
      // iOS
      await Linking.openURL(`mailto:${email}`);
    }
  } catch (error) {
    showAlert('Error', 'Unable to open email app.');
  }
};
// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const ChangeRM = ({ setHideBottomNav }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [showrmModal, setShowrmModal] = useState(false);
  const [rms, setrms] = useState(null);
  const [selected, setSelected] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState();

  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  const [filters, setFilters] = useState({
    company_id: null,
    rm_id: null,
    fromDate: null,
    toDate: null,
    project: null,
    location: null,
    active: null,
  });

  const filterAnim = useRef(new Animated.Value(screenHeight)).current;

  const openFilterModal = () => {
    setHideBottomNav(true);
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
      setHideBottomNav(false);
    });
  };

  const formatDate = date => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const onDateChange = (event, selectedDate, key) => {
    key === 'fromDate' ? setShowFromPicker(false) : setShowToPicker(false);
    if (selectedDate) onChange(key, formatDate(selectedDate));
  };

  const { data: allRmList = [] } = useQuery({
    queryKey: ['allRMList'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/pm/getAllRM');
        return res?.data?.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const Rm = allRmList?.map(item => ({ label: item.name, value: item.id }));

  const fetchLeads = useCallback(
    async (pageNum = 1, isReset = false) => {
      if (pageNum === 1) {
        setIsInitialLoading(true);
      } else {
        setIsFetchingMore(true);
      }

      try {
        const res = await api.get('/api/pm/getAllPropertyLeads', {
          params: {
            search: searchText || undefined,
            company_id: filters.company_id || undefined,
            rm_id: filters.rm_id || undefined,
            fromDate: filters.fromDate || undefined,
            toDate: filters.toDate || undefined,
            project: filters.project || undefined,
            location: filters.location || undefined,
            active: filters.active || undefined,
            page: pageNum,
            limit: PAGE_SIZE,
          },
        });

        const newData = res?.data?.data ?? [];

        if (isReset || pageNum === 1) {
          setLeads(newData);
        } else {
          setLeads(prev => {
            const combined = [...prev, ...newData];
            const unique = combined.filter(
              (item, index, self) =>
                index === self.findIndex(i => i.id === item.id)
            );
            return unique;
          });
        }

        setHasMore(newData.length === PAGE_SIZE);
        setPage(pageNum);
      } catch {
        // error
      } finally {
        setIsInitialLoading(false);
        setIsFetchingMore(false);
      }
    },
    [searchText, filters],
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchLeads(1, true);
  }, [searchText, appliedFilters]);

  const loadMore = () => {
    if (!hasMore || isFetchingMore || isInitialLoading) return;
    fetchLeads(page + 1);
  };

  const { data: AllProperty } = useQuery({
    queryKey: ['AllProperty'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLocation');
      return res.data.data;
    },
  });

  const { data: projectList = [] } = useQuery({
    queryKey: ['project'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyProjects');
      return res.data.data || [];
    },
  });

  const Property = AllProperty?.map(item => ({ label: item.name, value: item.id }));
  const projectOptions = projectList?.map(item => ({
    label: item.project_name,
    value: item.id,
  }));

  const toggleSelect = id => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === leads.length) {
      setSelected([]);
    } else {
      setSelected(leads.map(d => d.id));
    }
  };

  const isAllSelected = selected.length === leads.length && leads.length > 0;

  const { mutate: handleAssignRm } = useMutation({
    mutationFn: async () => {
      if (!selected.length) throw new Error('Please select prospects');
      if (!rms) throw new Error('Please select a RM');
      return await api.put('/api/pm/assignRM', {
        rm_id: rms,
        property_lead_id: selected,
      });
    },
    onSuccess: () => {
      showAlert('🎉 Success', 'RM has been changed successfully.', [
        { text: 'OK', onPress: () => console.log('Done') },
      ]);
      setSelected([]);
      setrms(null);
      setShowrmModal(false);
      fetchLeads(1, true);
    },
    onError: error => {
      showAlert('Error', error?.message || 'Something went wrong');
    },
  });

  const onChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilter = () => {
    setAppliedFilters(filters);
    closeFilterModal();
  };

  const resetFilters = () => {
    const cleared = {
      company_id: null,
      rm_id: null,
      fromDate: null,
      toDate: null,
      project: null,
      location: null,
      active: null,
    };
    setFilters(cleared);
    setAppliedFilters(cleared);
    closeFilterModal();
  };

  const renderLeadCard = useCallback(
    ({ item }) => {
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
                <Text style={styles.section}>
                  {item?.propertyproject?.project_name}
                </Text>
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: item?.active === '1' ? '#00C48C22' : '#FF6B6B22',
                    borderColor: item?.active === '1' ? '#00C48C60' : '#FF6B6B60',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: item?.active === '1' ? COLORS.green : COLORS.red },
                  ]}
                >
                  {item?.active === '1' ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardBody}>
            <View style={styles.leftCol}>
              <View style={styles.infoRow}>
                <Icon name="call" size={12} color={COLORS.accent} />
                <TouchableOpacity
                  style={styles.infoTouch}
                  onPress={() => makeCall(item?.phone)}
                >
                  <Text style={styles.phoneText} numberOfLines={1}>
                    {item?.phone || 'N/A'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={12}
                  color={COLORS.accent}
                />
                <Text style={styles.infoText} numberOfLines={1}>
                  {item?.company?.com_name || 'N/A'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Icon name="email" size={12} color={COLORS.accent} />
                <TouchableOpacity
                  style={styles.infoTouch}
                  onPress={() => sendMail(item?.email)}
                >
                  <Text style={styles.emailText} numberOfLines={1}>
                    {item?.email || 'N/A'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.rightCol}>
              <View style={styles.infoRow}>
                <Text style={styles.rmLabelCard}>RM: </Text>
                <Text style={styles.rmValue} numberOfLines={1}>
                  {item?.relationshipManager
                    ? `${item.relationshipManager.usr_fname} ${item.relationshipManager.usr_lname}`
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Icon name="location-on" size={12} color={COLORS.gold} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {item?.propertylocation?.name || 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.refLabel}>Reference: </Text>
                <Text style={styles.refValue} numberOfLines={1}>
                  {item?.mrreference?.mrf_name || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    },
    [selected],
  );

  const renderFooter = () => {
    if (isFetchingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color='#fff'/>
          <Text style={styles.footerText}>Loading more...</Text>
        </View>
      );
    }
    if (!hasMore && leads.length > 0) {
      return (
        <View style={styles.footerLoader}>
          {/* <Text style={styles.footerEndText}>✓ All leads loaded</Text> */}
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Same background as Meeting / Dashboard screens */}
      <Image
        source={require('../asset/image/bg-img.png')}
        style={styles.bgImageFixed}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* TOP BAR: [back + icon + title] ............ [change] */}
      <View
        style={[styles.topBarContainer, { paddingTop: verticalScale(10) }]}
      >
        <View style={styles.topBar}>
          <View style={styles.leftHeader}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Dashboard')}
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
              name="account-switch"
              size={20}
              color="#ffffff"
            />
            <Text style={styles.screenTitle} numberOfLines={1}>
              Change RM
            </Text>
          </View>

          <TouchableOpacity
            style={styles.changeBtn}
            onPress={() => {
              if (selected.length === 0) {
                showAlert(
                  '⚠️ Warning',
                  'Please select at least one lead',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'OK', onPress: () => console.log('OK pressed') },
                  ],
                  { cancelable: true }
                );
                return;
              }
              setShowrmModal(true);
            }}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={leads}
        keyExtractor={item => String(item.id)}
        renderItem={renderLeadCard}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
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
                <Text style={styles.selectAllText}>Select All</Text>
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

            {isInitialLoading && (
              <View style={styles.initialLoader}>
                <ActivityIndicator size="large" color='#fff' />
              </View>
            )}

            {!isInitialLoading && leads.length === 0 && (
              <Text style={styles.centeredText}>No leads found</Text>
            )}
          </>
        }
      />

      {/* ── Change RM Modal ── */}
      {showrmModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change RM</Text>
              <TouchableOpacity onPress={() => { setShowrmModal(false); setrms(null); }}>
                <Icon name="close" size={20} color={COLORS.mutedText} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Icon name="people" size={14} color={COLORS.gold} />
              <Text style={styles.infoBoxText}>
                {selected.length} lead{selected.length > 1 ? 's' : ''} selected
              </Text>
            </View>

            <Text style={styles.rmLabel}>Select RM</Text>

            <ScrollView
              style={styles.dropdownList}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {Rm.length === 0 ? (
                <Text style={styles.noRMText}>No RM found</Text>
              ) : (
                Rm.map(rm => {
                  const isSelected = rms === rm.value;
                  return (
                    <TouchableOpacity
                      key={rm.value}
                      style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                      onPress={() => setrms(rm.value)}
                    >
                      <View style={styles.rmItemLeft}>
                        <View style={[styles.rmRadio, isSelected && styles.rmRadioSelected]}>
                          {isSelected && <View style={styles.rmRadioInner} />}
                        </View>
                        <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                          {rm.label}
                        </Text>
                      </View>
                      {isSelected && <Icon name="check-circle" size={16} color={COLORS.accent} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowrmModal(false); setrms(null); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.assignBtn, !rms && styles.assignBtnDisabled]}
                onPress={handleAssignRm}
                disabled={!rms}
              >
                <Text style={styles.assignBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: filterAnim }] },
            ]}
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

      {/* ── Custom Alert ── */}
      <CustomAlertHost />
    </View>
  );
};

export default ChangeRM;

// ─── STYLES ───────────────────────────────────────────────────────────────────

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
  footerEndText: { color: COLORS.mutedText, fontSize: 12 },

  /* ── Header pill (same as Missed Followups) ── */
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

  // ── Search ──
  searchRow: { marginBottom: 8, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: COLORS.borderColor, borderRadius: 20, paddingHorizontal: 12,
    height: 40, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: { color: COLORS.white, marginLeft: 8, fontSize: 13, flex: 1 },

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
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderColor,
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
  },
  cardSelected: { borderColor: 'rgba(0,207,255,0.45)' },
  cardTop: { marginBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { color: COLORS.white, fontWeight: '800', fontSize: 13, flex: 1, minWidth: 0 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 0.8, flexShrink: 0 },
  statusText: { fontSize: 10, fontWeight: '700' },
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

  // ── Change RM Modal ──
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
  phoneText: {
    color: '#00acc1',
    backgroundColor: 'rgba(0, 172, 193, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    fontSize: 11,
    flexShrink: 1,
  },
  emailText: {
    color: '#00acc1',
    textDecorationLine: 'underline',
    fontWeight: '500',
    fontSize: 11,
    flexShrink: 1,
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
  selectedRMBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accentDim,
    borderWidth: 1, borderColor: COLORS.accentBorder, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7, marginBottom: 14,
  },
  selectedRMText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
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

  // ── Searchable Dropdown ──
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 46, backgroundColor: '#2b3348',
    borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#39415a',
  },
  dropdownTriggerText: { color: COLORS.white, fontSize: 13, flex: 1 },
  dropdownTriggerIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // ── Searchable Dropdown Modal ──
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