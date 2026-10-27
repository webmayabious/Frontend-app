// TotalBookingsAgreementsTillDateScreen.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  Linking,
  Alert,
  Image,
  Dimensions,
  Animated,
  Keyboard,
  DeviceEventEmitter,
  ActivityIndicator,
  Modal,
  PanResponder,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  white: '#FFFFFF',
  mutedText: '#8A90B4',
};
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (SCREEN_HEIGHT / 812) * size;

/* ================= DATE FORMAT (local timezone, no UTC shift) ================= */
const formatDate = date => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

/* ================= CALL ================= */
const makeCall = phoneNumber => {
  if (!phoneNumber) return;

  const cleanNumber = phoneNumber.replace(/\D/g, '');

  Alert.alert('Contact', `Choose an action for ${phoneNumber}`, [
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
            await Linking.openURL(webUrl);
          }
        } catch (error) {
          Alert.alert('Error', 'Unable to open WhatsApp.');
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
    Alert.alert('Error', 'Unable to open email app.');
  }
};

/* ================= INLINE DROPDOWN ================= */
const ITEM_H = 42;
const SEARCH_H = 44;
const MAX_LIST_H = 220;
const FIELD_TOP_OFFSET = Platform.OS === 'ios' ? 280 : 200;

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
  const [open, setOpen] = useState(false); // what the user wants
  const [mounted, setMounted] = useState(false); // keeps list alive while closing
  const [search, setSearch] = useState('');
  const heightAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const wrapRef = useRef(null);
  const justOpened = useRef(false);

  const options = data || [];
  const selected = options.find(o => o.value === value);

  const filtered = options.filter(o =>
    String(o.label ?? '')
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // list height follows the real content, capped at MAX_LIST_H
  const contentH = filtered.length === 0 ? 48 : filtered.length * ITEM_H;
  const targetH = Math.min(SEARCH_H + contentH, MAX_LIST_H);

  const scrollFieldIntoView = () => {
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

  // single place that runs every animation
  useEffect(() => {
    if (!open && !mounted) return;

    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: open ? targetH : 0,
        duration: open ? 220 : 180,
        easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: open ? 1 : 0,
        duration: open ? 220 : 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      if (open) {
        if (justOpened.current) {
          justOpened.current = false;
          scrollFieldIntoView();
        }
      } else {
        setMounted(false);
        setSearch('');
        DeviceEventEmitter.emit('toggleBottomNav', true);
      }
    });
  }, [open, targetH]);

  useEffect(() => {
    return () => DeviceEventEmitter.emit('toggleBottomNav', true);
  }, []);

  const toggle = () => {
    if (open) {
      Keyboard.dismiss();
      setOpen(false);
    } else {
      DeviceEventEmitter.emit('toggleBottomNav', false);
      justOpened.current = true;
      setMounted(true);
      setOpen(true);
    }
  };

  const handleSelect = item => {
    onChange && onChange(item.value);
    Keyboard.dismiss();
    setOpen(false);
  };

  const arrowRotate = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View ref={wrapRef} collapsable={false} style={styles.field}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}

      {/* Trigger */}
      <TouchableOpacity
        style={[
          styles.dropdown,
          open && styles.dropdownOpen,
          error && styles.inputError,
        ]}
        onPress={toggle}
        activeOpacity={0.8}
      >
        <View style={styles.ddTriggerLeft}>
          <Text
            style={selected ? styles.selectedText : styles.placeholder}
            numberOfLines={1}
          >
            {selected ? selected.label : placeholder || 'Select...'}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
          <Icon name="keyboard-arrow-down" size={20} color="#8a9daf" />
        </Animated.View>
      </TouchableOpacity>

      {/* Animated list */}
      {mounted && (
        <Animated.View
          style={[
            styles.dropdownMenu,
            {
              height: heightAnim,
              opacity: fadeAnim,
              overflow: 'hidden',
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-6, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.ddSearchWrap, { height: SEARCH_H }]}>
            <Icon
              name="search"
              size={16}
              color="#aaa"
              style={{ marginRight: 6 }}
            />
            <TextInput
              style={styles.ddSearchInput}
              placeholder="Search..."
              placeholderTextColor="#bbb"
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
                <Icon name="close" size={14} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
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
                    style={[
                      styles.dropdownItem,
                      { height: ITEM_H },
                      isActive && styles.dropdownItemActive,
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        isActive && styles.dropdownItemTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {isActive && (
                      <Icon name="check" size={16} color="#1482cc" />
                    )}
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

const InputField = ({ label, placeholder, icon, value, onChange, onPress }) => (
  <View style={styles.field}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <View style={styles.filterInputContainer}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#aab8c4"
          style={styles.filterInput}
          value={value}
          onChangeText={onChange}
          editable={!onPress}
          pointerEvents={onPress ? 'none' : 'auto'}
        />
        {icon && <Icon name={icon} size={18} color="#1482cc" />}
      </View>
    </TouchableOpacity>
  </View>
);

/* ================= FILTER BOTTOM SHEET ================= */
const IOSPickerOverlay = ({ target, tempDate, onDateChange, onDone, onCancel }) => (
  <View style={styles.iosOverlayWrap}>
    <TouchableOpacity
      style={StyleSheet.absoluteFill}
      activeOpacity={1}
      onPress={onCancel}
    />
    <View style={styles.iosPickerContainer}>
      <View style={styles.iosPickerHeader}>
        <TouchableOpacity onPress={onCancel} style={styles.iosPickerHeaderBtn}>
          <Text style={styles.iosPickerCancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.iosPickerTitle}>
          {target === 'fromDate' ? 'From Date' : 'To Date'}
        </Text>
        <TouchableOpacity onPress={onDone} style={styles.iosPickerHeaderBtn}>
          <Text style={styles.iosPickerDoneText}>Done</Text>
        </TouchableOpacity>
      </View>
      <DateTimePicker
        value={tempDate}
        mode="date"
        display="spinner"
        themeVariant="light"
        onChange={(_, d) => {
          if (d) onDateChange(d);
        }}
        style={{ height: 215 }}
      />
    </View>
  </View>
);

const FilterBottomSheet = ({
  visible,
  onClose,
  onApply,
  onReset,
  filters,
  onChange,
  Property,
  Rm,
  projectOptions,
  LeadStatus,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [modalMounted, setModalMounted] = useState(false);
  const scrollAtTop = useRef(true);
  const isClosing = useRef(false);

  const [kbHeight, setKbHeight] = useState(0);

  const scrollRef1 = useRef(null);
  const scrollYRef = useRef(0);

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [iosPickerTarget, setIosPickerTarget] = useState(null);
  const [iosTempDate, setIosTempDate] = useState(new Date());

  // Track keyboard height ourselves so the sheet always returns to the
  // bottom once the keyboard is hidden.
  useEffect(() => {
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvt, e =>
      setKbHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const animateOpen = () => {
    // Reset animation values before opening
    translateY.stopAnimation();
    backdropAnim.stopAnimation();

    translateY.setValue(SCREEN_HEIGHT);
    backdropAnim.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 32,
        stiffness: 180,
        mass: 1,
        overshootClamping: true,
        useNativeDriver: true,
      }),

      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateClose = (vy = 0) => {
    if (isClosing.current) return;

    isClosing.current = true;

    Keyboard.dismiss();

    translateY.stopAnimation();
    backdropAnim.stopAnimation();

    const duration = vy > 1.2 ? 180 : 250;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      isClosing.current = false;
      setKbHeight(0);

      if (finished) {
        setModalMounted(false);
        setShowFromPicker(false);
        setShowToPicker(false);
        setIosPickerTarget(null);
        onClose();
      }
    });
  };

  const snapBack = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 300,
      mass: 0.8,
    }).start();
  };

  // Drag from the handle
  const handlePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        translateY.stopAnimation(val => {
          translateY.setOffset(val);
          translateY.setValue(0);
        });
      },
      onPanResponderMove: (_, g) => {
        translateY.setValue(g.dy > 0 ? g.dy : g.dy * 0.06);
      },
      onPanResponderRelease: (_, g) => {
        translateY.flattenOffset();
        if (g.dy > 80 || g.vy > 0.5) animateClose(g.vy);
        else snapBack();
      },
      onPanResponderTerminate: () => {
        translateY.flattenOffset();
        snapBack();
      },
    }),
  ).current;

  // Drag down from the content when scrolled to top
  const scrollPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        scrollAtTop.current && g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        translateY.stopAnimation(val => {
          translateY.setOffset(val);
          translateY.setValue(0);
        });
      },
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        translateY.flattenOffset();
        if (g.dy > 80 || g.vy > 0.5) animateClose(g.vy);
        else snapBack();
      },
      onPanResponderTerminate: () => {
        translateY.flattenOffset();
        snapBack();
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      setModalMounted(true);
      requestAnimationFrame(() => animateOpen());
    } else {
      if (modalMounted) animateClose();
    }
  }, [visible]);

  /* ---- date handling ---- */
  const onDateChange = (event, selectedDate, key) => {
    if (key === 'fromDate') setShowFromPicker(false);
    else setShowToPicker(false);

    if (event.type === 'dismissed' || !selectedDate) return;

    onChange(key, formatDate(selectedDate));
  };

  const openDatePicker = key => {
    if (Platform.OS === 'ios') {
      setIosTempDate(filters[key] ? new Date(filters[key]) : new Date());
      setIosPickerTarget(key);
    } else if (key === 'fromDate') {
      setShowFromPicker(true);
    } else {
      setShowToPicker(true);
    }
  };

  const handleIosDone = () => {
    onChange(iosPickerTarget, formatDate(iosTempDate));
    setIosPickerTarget(null);
  };
  const handleIosCancel = () => setIosPickerTarget(null);

  if (!modalMounted) return null;

  return (
    <Modal
      transparent
      visible={modalMounted}
      onRequestClose={() => animateClose()}
      animationType="none"
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => animateClose()}
        />
      </Animated.View>

      <View
        style={[styles.kavWrapper, { paddingBottom: kbHeight }]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: Math.max(SCREEN_HEIGHT * 0.9 - kbHeight, 320),
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...handlePan.panHandlers} style={styles.dragHandleWrap}>
            <View style={styles.dragHandleLight} />
          </View>

          <ScrollView
            ref={scrollRef1}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            nestedScrollEnabled
            onScroll={e => {
              const y = e.nativeEvent.contentOffset.y;
              scrollYRef.current = y;
              scrollAtTop.current = y <= 2;
            }}
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 0) + 24,
            }}
            {...scrollPan.panHandlers}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter Leads</Text>
            </View>

            <DropdownField
              label="Property Location"
              data={Property}
              placeholder="Select Location"
              value={filters.location}
              onChange={value => onChange('location', value)}
              scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
            />
            <DropdownField
              label="Relationship Manager"
              data={Rm}
              placeholder="Select RM"
              value={filters.rm}
              onChange={value => onChange('rm', value)}
              scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
            />
            <DropdownField
              label="Project"
              data={projectOptions}
              placeholder="Select Project"
              value={filters.project}
              onChange={value => onChange('project', value)}
              scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
            />
            <DropdownField
              label="Approval Status"
              data={LeadStatus}
              placeholder="Select Status"
              value={filters.booking_approval_status}
              onChange={value => onChange('booking_approval_status', value)}
              scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
            />

            <View style={styles.dateRow}>
              <View style={{ width: '48%' }}>
                <InputField
                  label="From Date"
                  placeholder="YYYY-MM-DD"
                  icon="calendar-today"
                  value={filters.fromDate}
                  onPress={() => openDatePicker('fromDate')}
                />
              </View>
              <View style={{ width: '48%' }}>
                <InputField
                  label="To Date"
                  placeholder="YYYY-MM-DD"
                  icon="calendar-today"
                  value={filters.toDate}
                  onPress={() => openDatePicker('toDate')}
                />
              </View>
            </View>

            {Platform.OS === 'android' && showFromPicker && (
              <DateTimePicker
                value={filters.fromDate ? new Date(filters.fromDate) : new Date()}
                mode="date"
                display="default"
                onChange={(e, d) => onDateChange(e, d, 'fromDate')}
              />
            )}
            {Platform.OS === 'android' && showToPicker && (
              <DateTimePicker
                value={filters.toDate ? new Date(filters.toDate) : new Date()}
                mode="date"
                display="default"
                onChange={(e, d) => onDateChange(e, d, 'toDate')}
              />
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
                <Icon
                  name="refresh"
                  size={16}
                  color="#5a7080"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={onApply}>
                <Text style={styles.applyBtnText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {Platform.OS === 'ios' && iosPickerTarget !== null && (
            <IOSPickerOverlay
              target={iosPickerTarget}
              tempDate={iosTempDate}
              onDateChange={setIosTempDate}
              onDone={handleIosDone}
              onCancel={handleIosCancel}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

/* ================= CARD ================= */
const SiteCard = ({ data, navigation }) => (
  <View style={styles.card}>
    {/* Header */}
    <View style={styles.cardHeader}>
      <View style={styles.nameRow}>
        <Text style={styles.name}>{data?.name || 'N/A'}</Text>

        <View
          style={[
            styles.activeBadge,
            {
              backgroundColor:
                data?.active === '1'
                  ? 'rgba(45,168,94,0.15)'
                  : data?.active === '5'
                    ? 'rgba(107,119,133,0.25)'
                    : 'rgba(224,90,43,0.15)',
            },
          ]}
        >
          <Text
            style={[
              styles.activeText,
              {
                color:
                  data?.active === '1'
                    ? '#2da85e'
                    : data?.active === '5'
                      ? '#aab8c4'
                      : '#e05a2b',
              },
            ]}
          >
            {data?.active === '1'
              ? 'Active'
              : data?.active === '5'
                ? 'Booking Done'
                : 'Inactive'}
          </Text>
        </View>
      </View>

      <Icon
        name="visibility"
        size={20}
        color="#00e5ff"
        onPress={() =>
          navigation.navigate('BookingDetailScreen', {
            id: data?.id,
            data: data,
          })
        }
      />
    </View>

    {/* Project & Location */}
    <Text style={styles.location}>
      {data?.propertyproject?.project_name || 'N/A'} |{' '}
      {data?.propertylocation?.name || 'N/A'}
    </Text>

    {/* Customer Name */}
    <View style={styles.rowBetween}>
      <Text style={styles.label}>
        Customer Name:{' '}
        <Text style={styles.value}>
          {data?.customer_name || data?.name || 'N/A'}
        </Text>
      </Text>
    </View>

    {/* Booking Date */}
    <View style={styles.rowBetween}>
      <Text style={styles.label}>
        Booking Date:{' '}
        <Text style={styles.value}>{data?.date_of_booking || 'N/A'}</Text>
      </Text>
    </View>

    {/* Location */}
    <View style={styles.rowBetween}>
      <Text style={styles.label}>
        Location:{' '}
        <Text style={styles.value}>
          {data?.propertylocation?.name || 'N/A'}
        </Text>
      </Text>
    </View>

    {/* Total Brokerage */}
    <View style={styles.rowBetween}>
      <Text style={styles.label}>
        Total Brokerage:{' '}
        <Text style={styles.value}>₹ {data?.base_brokerage ?? '0'}</Text>
      </Text>
    </View>

    {/* Phone */}
    <View style={styles.rowBetween}>
      <TouchableOpacity onPress={() => makeCall(data?.mobile)}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.label}>Phone: </Text>
          <Text style={styles.phoneText}>{data?.mobile || 'N/A'}</Text>
        </View>
      </TouchableOpacity>
    </View>

    {/* Email */}
    <View style={styles.rowBetween}>
      <TouchableOpacity onPress={() => sendMail(data?.email)}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.label}>Email: </Text>
          <Text style={styles.emailText}>{data?.email || 'N/A'}</Text>
        </View>
      </TouchableOpacity>
    </View>

    {/* RM */}
    <View style={styles.rowBetween}>
      <Text style={styles.label}>
        RM:{' '}
        <Text style={styles.value}>
          {data?.relationshipmanager
            ? `${data.relationshipmanager.usr_fname} ${data.relationshipmanager.usr_lname}`
            : 'N/A'}
        </Text>
      </Text>
    </View>

    {/* Source */}
    <View style={styles.rowBetween}>
      <Text style={styles.label}>
        Source:{' '}
        <Text style={styles.value}>{data?.mrreference?.mrf_name || 'N/A'}</Text>
      </Text>
    </View>
  </View>
);

/* ================= MAIN ================= */
const TotalBookingsAgreementsTillDateScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [filters, setFilters] = useState({
    company_id: null,
    rm: null,
    fromDate: null,
    toDate: null,
    project: null,
    location: null,
    booking_approval_status: null,
    lead_status: null,
    lead_sub_status: null,
    lead_qualification: null,
    call_status: null,
    siteVisitFromDate: null,
    siteVisitToDate: null,
    lead_source: null,
  });
  const [appliedFilters, setAppliedFilters] = useState();

  /* ================= API ================= */
  const { data: Lead, isLoading } = useQuery({
    queryKey: ['totalBookingAndAgreementTillDate', appliedFilters],
    queryFn: async () => {
      // Sudhu "Apply" kora filter use hobe (unapplied edit nay)
      const f = appliedFilters || {};
      const res = await api.get('/api/pm/totalBookingAndAgreementTillDate', {
        params: {
          page: 1,
          limit: 'all',
          company_id: f.company_id || undefined,
          rm: f.rm || undefined,
          fromDate: f.fromDate || undefined,
          toDate: f.toDate || undefined,
          project: f.project || undefined,
          location: f.location || undefined,
          booking_approval_status: f.booking_approval_status || undefined,
          lead_status: f.lead_status || undefined,
          lead_sub_status: f.lead_sub_status || undefined,
          lead_qualification: f.lead_qualification || undefined,
          call_status: f.call_status || undefined,
          siteVisitFromDate: f.siteVisitFromDate || undefined,
          siteVisitToDate: f.siteVisitToDate || undefined,
          reference: f.lead_source || undefined,
        },
      });
      return res?.data?.data?.Bookings || [];
    },
  });

  const filteredfollowUps = (Lead || [])?.filter(item => {
    const name = item?.name?.toLowerCase() || '';
    const phone = item?.mobile || '';
    const email = item?.email?.toLowerCase() || '';

    const search = searchText.toLowerCase();

    return (
      name.includes(search) || phone.includes(search) || email.includes(search)
    );
  });

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

  const Property = AllProperty?.map(item => ({
    label: item.name,
    value: item.id,
  }));
  const Rm = allRmList?.map(item => ({ label: item.name, value: item.id }));
  const projectOptions = projectList?.map(item => ({
    label: item.project_name,
    value: item.id,
  }));

  const LeadStatus = [
    { label: 'PENDING', value: '1' },
    { label: 'APPROVED BY CITY HEAD / BUSINESS HEAD / ADMIN', value: '2' },
  ];

  /* ================= HANDLERS ================= */
  const onChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilter = () => {
    setAppliedFilters(filters);
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    const cleared = {
      company_id: null,
      rm: null,
      fromDate: null,
      toDate: null,
      project: null,
      location: null,
      booking_approval_status: null,
      lead_status: null,
      lead_sub_status: null,
      lead_qualification: null,
      call_status: null,
      siteVisitFromDate: null,
      siteVisitToDate: null,
      lead_source: null,
    };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setShowFilterModal(false);
  };

  const [showTopBtn, setShowTopBtn] = useState(false);
  const scrollRef = useRef();

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../asset/image/bg-img.png')}
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

        {/* TOP BAR: [back + icon + title] ............ [filter] */}
        <View
          style={[styles.topBarContainer, { paddingTop: insets.top + verticalScale(10) }]}
        >
          <View style={styles.topBar}>
            <View style={styles.leftHeader}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon1 name="chevron-back" size={23} color="#fff" />
              </TouchableOpacity>
              <Icon name="history" size={20} color="#ffffff" />
              <Text style={styles.screenTitle} numberOfLines={1}>
                Total Bookings Agreements Till Date
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowFilterModal(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="filter-alt" size={18} color="#00e5ff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* LIST */}
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 90 + insets.bottom },
          ]}
          onScroll={event => {
            const y = event.nativeEvent.contentOffset.y;
            setShowTopBtn(y > 200);
          }}
          scrollEventThrottle={16}
        >
          {/* SEARCH */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Icon name="search" size={16} color={COLORS.mutedText} />
              <TextInput
                placeholder="Search name / phone / email..."
                placeholderTextColor={COLORS.mutedText}
                value={searchText}
                onChangeText={setSearchText}
                style={styles.searchInput}
              />
            </View>
          </View>

          {/* COUNT */}
          <Text style={styles.countText}>
            Showing {filteredfollowUps?.length || 0}
            {Lead?.length != null ? ` of ${Lead.length}` : ''} Records
          </Text>

          {/* CARDS */}
          {isLoading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : filteredfollowUps?.length > 0 ? (
            filteredfollowUps?.map((visit, i) => (
              <SiteCard
                key={
                  visit?.id != null ? `booking-${visit.id}` : `booking-idx-${i}`
                }
                data={visit}
                navigation={navigation}
              />
            ))
          ) : (
            <View style={styles.emptyWrap}>
              <Icon name="history" size={48} color="rgba(255,255,255,0.25)" />
              <Text style={styles.empty}>No data found</Text>
            </View>
          )}
        </ScrollView>

        {/* FILTER BOTTOM SHEET (animated Modal) */}
        <FilterBottomSheet
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={applyFilter}
          onReset={resetFilters}
          filters={filters}
          onChange={onChange}
          Property={Property}
          Rm={Rm}
          projectOptions={projectOptions}
          LeadStatus={LeadStatus}
        />

        {/* TOP BUTTON */}
        {showTopBtn && (
          <TouchableOpacity style={styles.topButton} onPress={scrollToTop}>
            <Icon name="keyboard-arrow-up" size={26} color="#fff" />
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
};

export default TotalBookingsAgreementsTillDateScreen;

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2d3e' },
  bgImageFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: Dimensions.get('screen').height,
  },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: Dimensions.get('screen').height,
    backgroundColor: 'rgba(18,32,48,0.72)',
  },

  /* ── Header pill ── */
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
  screenTitle: {
    color: '#ffffff',
    fontSize: 15,
    marginLeft: 6,
    fontWeight: '700',
    flexShrink: 1,
  },

  /* ── List ── */
  listContent: { paddingHorizontal: scale(10), paddingBottom: 10 },
  centerLoader: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyWrap: { alignItems: 'center', marginTop: 80, gap: 12 },
  empty: { color: 'rgba(255,255,255,0.40)', fontSize: 15 },
  searchContainer: {
    position: 'relative',
    zIndex: 100,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    padding: 0,
    marginLeft: 8,
  },
  countText: {
    color: '#ffb300',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },

  /* ── Card ── */
  card: {
    backgroundColor: 'rgba(4, 35, 70, 0.62)',
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#a78bfa',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    marginRight: 8,
  },
  name: { color: '#ffffff', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  activeBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6,
  },
  activeText: { fontSize: 11, fontWeight: '600' },
  phoneText: {
    color: '#4FC3F7',
    backgroundColor: 'rgba(20,130,204,0.10)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    fontSize: 11.5,
  },
  location: {
    color: '#4FC3F7',
    marginTop: 2,
    fontSize: 12,
    flexWrap: 'wrap',
    lineHeight: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    gap: 6,
    flexWrap: 'wrap',
  },
  label: { fontSize: 11.5, color: '#afaea5', lineHeight: 18 },
  value: { color: '#ffffff', fontSize: 11.5, flexShrink: 1 },
  emailText: {
    color: '#4FC3F7',
    textDecorationLine: 'underline',
    fontWeight: '500',
    fontSize: 11.5,
  },

  /* ── Top button (FAB style) ── */
  topButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#4aa3df',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1a7abf',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 999,
  },

  /* ── Filter bottom sheet ── */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  kavWrapper: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#21283a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: SCREEN_HEIGHT * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  dragHandleWrap: { alignItems: 'center', paddingBottom: 8, paddingTop: 4 },
  dragHandleLight: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#b0bec5',
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: { color: '#d7dbe2', fontSize: 18, fontWeight: '700' },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },

  inputLabel: {
    color: '#9aa8bd',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
    marginTop: 2,
  },
  field: { marginBottom: 5, width: '100%' },

  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2b3348',
    borderWidth: 1,
    borderColor: '#39415a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownOpen: { borderColor: '#4aa3df', backgroundColor: '#28304a' },
  inputError: { borderColor: '#e05a2b' },
  errorText: { color: '#e05a2b', fontSize: 11, marginTop: 4 },
  dropdownMenu: {
    marginTop: 4,
    backgroundColor: '#2b3348',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#39415a',
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#323a52',
  },
  dropdownItemActive: { backgroundColor: 'rgba(74,163,223,0.15)' },
  dropdownItemText: {
    flex: 1,
    fontSize: 13,
    color: '#c3cbdb',
    fontWeight: '500',
  },
  dropdownItemTextActive: { color: '#7cc4f2', fontWeight: '700' },
  placeholder: { color: '#8a9daf', fontSize: 13 },
  selectedText: { color: '#e6ebf2', fontSize: 13, fontWeight: '600' },
  ddTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  ddSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#39415a',
    backgroundColor: '#28304a',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  ddSearchInput: { flex: 1, fontSize: 13, color: '#e6ebf2', padding: 0 },
  ddNoResult: {
    textAlign: 'center',
    color: '#6b7690',
    fontSize: 12,
    paddingVertical: 16,
  },

  filterInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2b3348',
    borderWidth: 1,
    borderColor: '#39415a',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  filterInput: {
    flex: 1,
    color: '#aab8c4',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },

  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 10,
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#2b3348',
    borderWidth: 1,
    borderColor: '#39415a',
  },
  resetBtnText: { fontSize: 14, color: '#c3cbdb', fontWeight: '600' },
  applyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1e9ce8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },

  /* ── iOS date picker overlay ── */
  iosOverlayWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.30)',
    justifyContent: 'flex-end',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    zIndex: 999,
  },
  iosPickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  iosPickerHeaderBtn: { minWidth: 60 },
  iosPickerTitle: {
    color: '#1a2d3e',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  iosPickerCancelText: { color: '#e53935', fontSize: 16, fontWeight: '500' },
  iosPickerDoneText: {
    color: '#1482cc',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
});