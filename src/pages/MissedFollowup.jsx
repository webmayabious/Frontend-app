
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  StatusBar,
  Platform,
  Image,
  Dimensions,
  Keyboard,
  Animated,
  DeviceEventEmitter,
  Modal,
  PanResponder,
  KeyboardAvoidingView,
  Easing,
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon1 from 'react-native-vector-icons/Ionicons';
const COLORS = {
  white: '#FFFFFF',
  mutedText: '#8A90B4',
};
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (SCREEN_HEIGHT / 812) * size;

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

/* ================= CARD ================= */
const LeadCard = ({ item, navigation, setShowRemarks, setRemarksText }) => {
  const feedback = item?.propertyfeedbacks?.[0];
  const remarks =
    item?.propertyfeedbacks
      ?.map(x => x?.remarks)
      ?.filter(Boolean)
      ?.join(', ') || 'No Remarks Available';
  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item?.name || 'N/A'} ||</Text>

          <Text style={styles.ratingText}>
            {feedback?.propertyrating?.name}
          </Text>

          <View
            style={[
              styles.activeBadge,
              {
                backgroundColor:
                  item?.active === '1'
                    ? 'rgba(45,168,94,0.15)'
                    : item?.active === '5'
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
                    item?.active === '1'
                      ? '#2da85e'
                      : item?.active === '5'
                      ? '#aab8c4'
                      : '#e05a2b',
                },
              ]}
            >
              {item?.active === '1'
                ? 'Active'
                : item?.active === '5'
                ? 'Booking Done'
                : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon
            name="edit"
            size={18}
            color="#00e5ff"
            style={{ marginLeft: 8 }}
            onPress={() => navigation.navigate('MeetingsEdit', { id: item.id })}
          />
        </View>
      </View>

      {/* PROJECT + LOCATION */}
      <Text style={styles.location}>
        {item?.propertyproject?.project_name} | {item?.propertylocation?.name}
      </Text>

      {/* PHONE + ASSIGNED DATE */}
      <View style={styles.rowBetween}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>
            Lead Assigned Date:{' '}
            <Text style={styles.value}>{item?.lead_assigned_date || 'N/A'}</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={() => makeCall(item?.phone)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.label}>Phone: </Text>
            <Text style={styles.phoneText}>{item?.phone || 'N/A'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* EMAIL */}
      <View style={styles.rowBetween}>
        <TouchableOpacity onPress={() => sendMail(item?.email)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.label}>Email: </Text>
            <Text style={styles.emailText}>{item?.email || 'N/A'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* RM + CALLBACK */}
      <View style={styles.rowBetween}>
        <Text style={styles.label}>
          RM:{' '}
          <Text style={styles.value}>
            {item?.relationshipManager
              ? `${item.relationshipManager.usr_fname} ${item.relationshipManager.usr_lname}`
              : 'N/A'}
          </Text>
        </Text>

        <Text style={styles.label}>
          Callback:{' '}
          <Text style={styles.value}>{feedback?.call_back_date || 'N/A'}</Text>
        </Text>
      </View>

      {/* LEAD SOURCE */}
      <Text style={[styles.label, { marginTop: 4 }]}>
        Lead Source:{' '}
        <Text style={styles.value}>{item?.mrreference?.mrf_name}</Text>
      </Text>

      {/* REMARKS */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginTop: 8,
        }}
      >
        <Text style={[styles.label, { fontWeight: '700', marginRight: 5 }]}>
          Remarks:
        </Text>

        <View style={{ flex: 1 }}>
          <RemarksText remarks={remarks} />
        </View>
      </View>

      {/* FOOTER */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate('AllInteractionsScreen', { id: item.id })
          }
        >
          <Icon name="forum" size={12} color={'#00cfff'} />
          <Text style={styles.buttonText}>View Interaction</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.completed}>
            {feedback?.propertycallstatus?.name}
          </Text>
        </View>
      </View>
    </View>
  );
};

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
  leadSourceOptions,
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

  const scrollRef1 = useRef(null);
  const scrollYRef = useRef(0);

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [iosPickerTarget, setIosPickerTarget] = useState(null);
  const [iosTempDate, setIosTempDate] = useState(new Date());

  const animateOpen = () => {
    translateY.setValue(SCREEN_HEIGHT);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 26,
        stiffness: 280,
        mass: 0.9,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateClose = (vy = 0) => {
    if (isClosing.current) return;
    isClosing.current = true;
    Keyboard.dismiss();
    const duration = vy > 1.2 ? 150 : 220;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isClosing.current = false;
      setModalMounted(false);
      setShowFromPicker(false);
      setShowToPicker(false);
      setIosPickerTarget(null);
      onClose();
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

  /* ---- date handling (same logic as before) ---- */
  const onDateChange = (event, selectedDate, key) => {
    if (key === 'fromDate') setShowFromPicker(false);
    else setShowToPicker(false);

    if (event.type === 'dismissed' || !selectedDate) return;

    onChange(key, selectedDate.toISOString().split('T')[0]);
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
    onChange(iosPickerTarget, iosTempDate.toISOString().split('T')[0]);
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavWrapper}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View {...handlePan.panHandlers} style={styles.dragHandleWrap}>
            <View style={styles.dragHandleLight} />
          </View>

          <ScrollView
            ref={scrollRef1}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
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
              label="Lead Source"
              data={leadSourceOptions}
              placeholder="Select"
              value={filters.lead_source}
              onChange={value => onChange('lead_source', value)}
              scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
            />
            <DropdownField
              label="Property Location"
              data={Property}
              placeholder="Select"
              value={filters.location}
              onChange={value => onChange('location', value)}
              scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
            />
            <DropdownField
              label="RM"
              data={Rm}
              placeholder="Select"
              value={filters.rm_id}
              onChange={value => onChange('rm_id', value)}
              scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
            />
            <DropdownField
              label="Project"
              data={projectOptions}
              placeholder="Select"
              value={filters.project}
              onChange={value => onChange('project', value)}
              scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
            />
            <DropdownField
              label="Lead Status"
              data={LeadStatus}
              placeholder="Select"
              value={filters.status}
              onChange={value => onChange('status', value)}
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
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ================= MAIN ================= */
const MissedFollowup = () => {
  const navigation = useNavigation();
  const scrollRef = useRef();
  const isScrollingToTop = useRef(false);
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    company_id: null,
    rm_id: null,
    fromDate: null,
    toDate: null,
    project: null,
    location: null,
    active: null,
    lead_source: null,
  });
  const [appliedFilters, setAppliedFilters] = useState();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['MissedFollowups', appliedFilters],
      queryFn: async ({ pageParam = 1 }) => {
        const res = await api.get('/api/pm/missedCallBackLeads', {
          params: {
            page: pageParam,
            search: searchText || undefined,
            company_id: filters.company_id || undefined,
            rm_id: filters.rm_id || undefined,
            fromDate: filters.fromDate || undefined,
            toDate: filters.toDate || undefined,
            project: filters.project || undefined,
            location: filters.location || undefined,
            status: filters.status || undefined,
            reference: filters.lead_source || undefined,
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

  const leads = data?.pages?.flatMap(page => page.data) || [];

  const uniqueLeadsMap = new Map();
  leads.forEach(item => {
    if (item?.id != null) {
      uniqueLeadsMap.set(item.id, item);
    }
  });
  const uniqueLeads = Array.from(uniqueLeadsMap.values());

  const lastPageData = data?.pages?.[data.pages.length - 1];
  const totalCount =
    lastPageData?.total ??
    lastPageData?.totalRecords ??
    lastPageData?.totalCount ??
    null;

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const filteredLeads = uniqueLeads.filter(item => {
    const search = searchText.toLowerCase();
    return (
      item?.name?.toLowerCase().includes(search) ||
      item?.phone?.includes(search) ||
      item?.email?.toLowerCase().includes(search)
    );
  });
  const { data: AllProperty } = useQuery({
    queryKey: ['AllProperty'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLocation');
      return res.data.data;
    },
  });

  // Fetch RMs
  const { data: allRmList = [] } = useQuery({
    queryKey: ['allRMList'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllRM');
      return res?.data?.data;
    },
  });

  // Fetch Projects
  const { data: projectList = [] } = useQuery({
    queryKey: ['project'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyProjects');
      return res.data.data || [];
    },
  });

  // Fetch Lead Source (Mr References)
  const { data: mrReferenceList = [] } = useQuery({
    queryKey: ['mrReferences'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllMrReferences', {
        params: { limit: 'all' },
      });
      return res.data.data || [];
    },
  });

  /* ================= DATA MAPPING ================= */
  const Property = AllProperty?.map(item => ({
    label: item.name,
    value: item.id,
  }));
  const Rm = allRmList?.map(item => ({ label: item.name, value: item.id }));
  const projectOptions = projectList?.map(item => ({
    label: item.project_name,
    value: item.id,
  }));
  const leadSourceOptions = mrReferenceList?.map(item => ({
    label: item.mrf_name,
    value: item.id,
  }));

  const LeadStatus = [
    { label: 'Active', value: '1' },
    { label: 'Inactive', value: '2' },
    { label: 'Booking Done', value: '5' },
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
      rm_id: null,
      fromDate: null,
      toDate: null,
      project: null,
      location: null,
      status: null,
      lead_source: null,
    };

    setFilters(cleared);
    setAppliedFilters(cleared);
    setShowFilterModal(false);
  };

  const scrollToTop = () => {
    isScrollingToTop.current = true;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setTimeout(() => {
      isScrollingToTop.current = false;
    }, 600);
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
          style={[
            styles.topBarContainer,
            { paddingTop:  verticalScale(10) },
            // insets.top +
          ]}
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
                                  //  style={styles.backIcon}
                                 />
              </TouchableOpacity>
              <Icon name="notifications-off" size={20} color="#ffffff" />
              <Text style={styles.screenTitle} numberOfLines={1}>
                Missed Followups
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
          contentContainerStyle={styles.listContent}
          onScroll={event => {
            const { layoutMeasurement, contentOffset, contentSize } =
              event.nativeEvent;
            const y = contentOffset.y;

            setShowTopBtn(y > 200);
            if (isScrollingToTop.current) return;

            const isNearBottom =
              layoutMeasurement.height + y >= contentSize.height - 150;
            if (isNearBottom) {
              handleLoadMore();
            }
          }}
          scrollEventThrottle={400}
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
            Showing {filteredLeads.length}
            {totalCount != null ? ` of ${totalCount}` : ''} entries
          </Text>

          {/* CARDS */}
          {isLoading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : filteredLeads.length > 0 ? (
            filteredLeads.map((item, i) => (
              <LeadCard
                key={item?.id != null ? `lead-${item.id}` : `lead-idx-${i}`}
                item={item}
                navigation={navigation}
                setShowRemarks={setShowRemarks}
                setRemarksText={setRemarksText}
              />
            ))
          ) : (
            <View style={styles.emptyWrap}>
              <Icon
                name="notifications-off"
                size={48}
                color="rgba(255,255,255,0.25)"
              />
              <Text style={styles.empty}>No missed followups found</Text>
            </View>
          )}
          {isFetchingNextPage && (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.footerText}>Loading more...</Text>
            </View>
          )}
        </ScrollView>

        {/* REMARKS MODAL */}
        {showRemarks && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Icon name="check-circle" size={32} color="#4aa3df" />
              <Text style={styles.modalTitle}>Latest Remarks</Text>
              <Text style={styles.modalText}>{remarksText}</Text>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowRemarks(false)}
              >
                <Text style={styles.modalCloseText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* FILTER BOTTOM SHEET (animated Modal) */}
        <FilterBottomSheet
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={applyFilter}
          onReset={resetFilters}
          filters={filters}
          onChange={onChange}
          leadSourceOptions={leadSourceOptions}
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

export default MissedFollowup;

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
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#ffffff',
  },
  screenTitle: {
    color: '#ffffff',
    fontSize: 15,
    marginLeft: 6,
    fontWeight: '700',
    flexShrink: 1,
  },

  /* ── List ── */
  listContent: { paddingHorizontal: scale(10), paddingBottom: verticalScale(10) },
  centerLoader: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerText: { color: 'rgba(255,255,255,0.50)', fontSize: 13 },
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
  searchInput: { flex: 1, fontSize: 14, color: '#fff', padding: 0, marginLeft: 8 },
  countText: {
    color: '#ffb300',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },

  /* ── Card ── */
  card: {
    backgroundColor: '#rgba(4, 35, 70, 0.62)',
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
  ratingText: { color: '#4FC3F7', fontSize: 11, marginLeft: 4 },
  activeBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6,
  },
  activeText: { fontSize: 11, fontWeight: '600' },
  remarksCardText: { fontSize: 11.5, color: '#ffffff', lineHeight: 18 },
  readMore: { color: '#4FC3F7', fontWeight: '600', marginTop: 3 },
  phoneText: {
    color: '#4FC3F7',
    backgroundColor: 'rgba(20,130,204,0.10)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    fontSize: 11.5,
  },
  location: { color: '#4FC3F7', marginTop: 2, fontSize: 12 },
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1,
    backgroundColor:'#00cfff18', borderWidth: 1, borderColor: '#00cfff40',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  buttonText: { color: '#00cfff', fontSize: 11, fontWeight: '600' },
  completed: { color: '#8A90B4', fontSize: 11, flexShrink: 1, textAlign: 'right' },

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

  /* ── Remarks modal ── */
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '88%',
    maxHeight: SCREEN_HEIGHT * 0.72,
    backgroundColor: '#21283a',
    borderWidth: 1,
    borderColor: '#39415a',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#e6ebf2',
    fontSize: 18,
    marginBottom: 10,
    fontWeight: '700',
  },
  modalText: { color: '#c3cbdb', textAlign: 'center', marginBottom: 15 },
  modalCloseBtn: {
    backgroundColor: '#1e9ce8',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalCloseText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },

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
    marginBottom: 0,
    marginTop: 0,
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