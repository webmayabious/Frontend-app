// TotalLeadScreen.js (Same design as TotalBookingsAgreementsTillDateScreen - logic unchanged)
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
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Keyboard,
  DeviceEventEmitter,
  Easing,
  Modal,
  PanResponder,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/AxiosInstance';
import Icon1 from 'react-native-vector-icons/Ionicons';
const COLORS = {
  white: '#FFFFFF',
  mutedText: '#8A90B4',
};
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (SCREEN_HEIGHT / 812) * size;

// keyboard events (iOS "Will" = smoother, Android only has "Did")
const KB_SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const KB_HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

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
            // Opens WhatsApp Web or the app if installed
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
        // Fallback to mailto
        await Linking.openURL(`mailto:${email}`);
      }
    } else {
      // iOS
      await Linking.openURL(`mailto:${email}`);
    }
  } catch (error) {
    Alert.alert('Error', 'Unable to open email app.');
  }
};

const formatCallBackDateTime = (date, time) => {
  if (!date) return null;

  const d = new Date(date);
  const formattedDate = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (!time) return formattedDate;

  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const formattedTime = `${hour}:${String(m).padStart(2, '0')} ${ampm}`;

  return `${formattedDate}, ${formattedTime}`;
};

/* ================= INLINE DROPDOWN ================= */
const ITEM_H = 42;
const SEARCH_H = 44;
const MAX_LIST_H = 220;
const LIST_GAP = 4; // marginTop of the list
const EXTRA_GAP = 16; // breathing space between list and keyboard

const DropdownField = ({
  label,
  data,
  value,
  onChange,
  error,
  scrollRef,
  scrollYRef,
  kbTopRef,
  placeholder,
}) => {
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false); // what the user wants
  const [mounted, setMounted] = useState(false); // keeps list alive while closing
  const [search, setSearch] = useState('');
  const heightAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const triggerRef = useRef(null);
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

  // latest values for the keyboard listener (it is registered only once)
  const openRef = useRef(false);
  const targetHRef = useRef(targetH);
  const topInsetRef = useRef(insets.top);
  openRef.current = open;
  targetHRef.current = targetH;
  topInsetRef.current = insets.top;

  /**
   * Scroll the sheet so that the WHOLE list (trigger + list) sits above the
   * keyboard and the field never goes above the visible top of the scroll area.
   * kbTop = Y of the keyboard top edge on the screen (null = no keyboard).
   */
  const ensureListVisible = kbTop => {
    if (!triggerRef.current || !scrollRef?.current) return;

    const run = viewTop => {
      if (!triggerRef.current) return;
      triggerRef.current.measureInWindow((x, y, w, h) => {
        const visibleBottom = kbTop || kbTopRef?.current || SCREEN_HEIGHT;
        const listBottom = y + h + LIST_GAP + targetHRef.current + EXTRA_GAP;

        let delta = 0;
        if (listBottom > visibleBottom) delta = listBottom - visibleBottom;

        // keep the field (and its label) inside the visible scroll area
        const minTop = viewTop + 24;
        if (y - delta < minTop) delta = y - minTop;

        if (delta > 1) {
          scrollRef.current?.scrollTo({
            y: (scrollYRef?.current || 0) + delta,
            animated: true,
          });
        }
      });
    };

    if (typeof scrollRef.current.measureInWindow === 'function') {
      scrollRef.current.measureInWindow((x, vy) => run(vy || 0));
    } else {
      run(topInsetRef.current + 60);
    }
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
          ensureListVisible();
        }
      } else {
        setMounted(false);
        setSearch('');
        DeviceEventEmitter.emit('toggleBottomNav', true);
      }
    });
  }, [open, targetH]);

  // when the keyboard shows (user taps Search) -> re-scroll so the list stays visible
  useEffect(() => {
    const sub = Keyboard.addListener(KB_SHOW, e => {
      if (!openRef.current) return;
      const kbTop = e?.endCoordinates?.screenY;
      // wait a little so the sheet has resized / moved above the keyboard
      setTimeout(() => ensureListVisible(kbTop), Platform.OS === 'ios' ? 120 : 180);
    });
    return () => sub.remove();
  }, []);

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
    <View collapsable={false} style={styles.field}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}

      {/* Trigger */}
      <TouchableOpacity
        ref={triggerRef}
        collapsable={false}
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
              returnKeyType="done"
              blurOnSubmit
              underlineColorAndroid="transparent"
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

/* ================= SITE CARD ================= */
const SiteCard = ({ data, navigation, setShowRemarks, setRemarksText }) => {
  const remarks =
    data?.propertyfeedbacks
      ?.map(x => x?.remarks)
      ?.filter(Boolean)
      ?.join(', ') || 'No Remarks Available';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{data?.name}</Text>

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
          name="edit"
          size={20}
          color="#00e5ff"
          onPress={() =>
            navigation.navigate('MeetingsEdit', {
              id: data?.id,
            })
          }
        />
      </View>

      {/* Project & Location */}
      <Text style={styles.location}>
        {data?.propertyproject?.project_name} | {data?.propertylocation?.name}
      </Text>

      {/* Phone */}
      <View style={styles.rowBetween}>
        <TouchableOpacity onPress={() => makeCall(data?.phone)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.label}>Phone: </Text>
            <Text style={styles.phoneText}>{data?.phone || 'N/A'}</Text>
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

      {/* Site Visit Date & RM */}
      <View style={styles.rowBetween}>
        <View style={styles.leftBox}>
          <Text style={styles.label}>
            Site Visit Date:
            <Text style={styles.value}>
              {' '}
              {data?.propertyfeedbacks?.map(x => x?.site_visit_date).join(', ')}
            </Text>
          </Text>
        </View>
        <View style={styles.rightBox}>
          <Text style={styles.label}>
            RM:{' '}
            <Text style={styles.value}>
              {data?.relationshipManager
                ? `${data.relationshipManager.usr_fname} ${data.relationshipManager.usr_lname}`
                : 'N/A'}
            </Text>
          </Text>
        </View>
      </View>

      {/* Call Back */}
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>
            Call Back:{' '}
            <Text style={styles.value}>
              {data?.propertyfeedbacks
                ?.map(x =>
                  formatCallBackDateTime(x?.call_back_date, x?.call_back_time),
                )
                .filter(Boolean)
                .join(', ') || 'N/A'}
            </Text>
          </Text>
        </View>
      </View>

      {/* Lead Source */}
      <View style={styles.rowBetween}>
        <Text style={styles.label}>
          Lead Source:{' '}
          <Text style={styles.value}>{data?.mrreference?.mrf_name}</Text>
        </Text>
      </View>

      {/* Remarks */}
      <View style={styles.remarksRow}>
        <Text style={styles.label}>Remarks:</Text>
        <View style={{ flex: 1 }}>
          <RemarksText remarks={remarks} />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate('AllInteractionsScreen', {
              id: data?.id,
            })
          }
        >
          <Icon name="forum" size={12} color={'#00cfff'} />
          <Text style={styles.buttonText}>View Interaction</Text>
        </TouchableOpacity>

        <Text style={styles.completed}>
          {data?.propertyfeedbacks
            ?.map(x => x.propertycallstatus?.name)
            .join(', ') || 'N/A'}
        </Text>
      </View>
    </View>
  );
};

/* ================= FILTER BOTTOM SHEET ================= */
const FilterBottomSheet = ({
  visible,
  onClose,
  filters,
  onChange,
  onApply,
  onReset,
  Property,
  callStatusListfetch,
  leadQualificationOptions,
  leadStatusOptions,
  leadSubStatusOptions,
  leadSourceOptions,
  Rm,
  projectOptions,
  LeadStatus,
  showFromPicker,
  showToPicker,
  setShowFromPicker,
  setShowToPicker,
  onDateChange,
  setActivePicker,
  activePicker,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [modalMounted, setModalMounted] = useState(false);
  const scrollAtTop = useRef(true);
  const isClosing = useRef(false);

  const scrollRef1 = useRef(null);
  const scrollYRef = useRef(0);

  // ── keyboard handling (manual, same on Android + iOS) ──
  // wrapRef = full-screen area that holds the sheet (bottom aligned)
  const wrapRef = useRef(null);
  const kbTopRef = useRef(null);
  const [wrapH, setWrapH] = useState(0);
  const [kbOverlap, setKbOverlap] = useState(0); // how much the keyboard covers the wrapper

  useEffect(() => {
    if (!modalMounted) return;

    const showSub = Keyboard.addListener(KB_SHOW, e => {
      const kbTop = e?.endCoordinates?.screenY ?? null;
      kbTopRef.current = kbTop;
      if (kbTop == null || !wrapRef.current) return;
      // If Android already resized the window, overlap is 0 -> no double shift.
      wrapRef.current.measureInWindow((x, y, w, h) => {
        setKbOverlap(Math.max(0, y + h - kbTop));
      });
    });
    const hideSub = Keyboard.addListener(KB_HIDE, () => {
      kbTopRef.current = null;
      setKbOverlap(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [modalMounted]);

  const animateOpen = () => {
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

      if (finished) {
        setModalMounted(false);
        setKbOverlap(0);
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

  if (!modalMounted) return null;

  // sheet never taller than the space left above the keyboard / under the status bar
  const availableH = (wrapH || SCREEN_HEIGHT) - kbOverlap - insets.top - 8;
  const sheetMaxH = Math.min(SCREEN_HEIGHT * 0.9, availableH);

  // shared props for every dropdown inside the sheet
  const ddShared = { scrollRef: scrollRef1, scrollYRef, kbTopRef };

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

      {/* KeyboardAvoidingView removed: the sheet is lifted manually by kbOverlap */}
      <View
        ref={wrapRef}
        collapsable={false}
        onLayout={e => setWrapH(e.nativeEvent.layout.height)}
        style={[styles.kavWrapper, { paddingBottom: kbOverlap }]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            { maxHeight: sheetMaxH, transform: [{ translateY }] },
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
              paddingBottom: (kbOverlap > 0 ? 0 : Math.max(insets.bottom, 0)) + 24,
            }}
            {...scrollPan.panHandlers}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter Leads</Text>
            </View>

            <DropdownField
              label="Lead Source"
              data={leadSourceOptions}
              placeholder="Select Lead Source"
              value={filters.lead_source}
              onChange={value => onChange('lead_source', value)}
              {...ddShared}
            />
            <DropdownField
              label="Property Location"
              data={Property}
              placeholder="Select Location"
              value={filters.location}
              onChange={value => onChange('location', value)}
              {...ddShared}
            />
            <DropdownField
              label="Relationship Manager"
              data={Rm}
              placeholder="Select RM"
              value={filters.rm_id}
              onChange={value => onChange('rm_id', value)}
              {...ddShared}
            />

            <View style={styles.dateRow}>
              <View style={{ width: '48%' }}>
                <InputField
                  label="From Date"
                  placeholder="YYYY-MM-DD"
                  icon="calendar-today"
                  value={filters.fromDate}
                  onPress={() => setShowFromPicker(true)}
                />
              </View>
              <View style={{ width: '48%' }}>
                <InputField
                  label="To Date"
                  placeholder="YYYY-MM-DD"
                  icon="calendar-today"
                  value={filters.toDate}
                  onPress={() => setShowToPicker(true)}
                />
              </View>
            </View>

            <DropdownField
              label="Project"
              data={projectOptions}
              placeholder="Select Project"
              value={filters.project}
              onChange={value => onChange('project', value)}
              {...ddShared}
            />
            <DropdownField
              label="Lead Status"
              data={LeadStatus}
              placeholder="Select Status"
              value={filters.active}
              onChange={value => onChange('active', value)}
              {...ddShared}
            />

            {/* Feedback section divider */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>FeedBack</Text>
              <View style={styles.sectionLine} />
            </View>

            <DropdownField
              label="Call Status"
              data={callStatusListfetch}
              placeholder="Select Status"
              value={filters.call_status}
              onChange={value => onChange('call_status', value)}
              {...ddShared}
            />
            <DropdownField
              label="Lead Qualification"
              data={leadQualificationOptions}
              placeholder="Select Qualification"
              value={filters.lead_qualification}
              onChange={value => onChange('lead_qualification', value)}
              {...ddShared}
            />
            <DropdownField
              label="Lead Status"
              data={leadStatusOptions}
              placeholder="Select Status"
              value={filters.lead_status}
              onChange={value => onChange('lead_status', value)}
              {...ddShared}
            />
            <DropdownField
              label="Lead Sub Status"
              data={leadSubStatusOptions}
              placeholder="Select Sub Status"
              value={filters.lead_sub_status}
              onChange={value => onChange('lead_sub_status', value)}
              {...ddShared}
            />

            <View style={styles.dateRow}>
              <View style={{ width: '48%' }}>
                <InputField
                  label="Site Visit From Date"
                  placeholder="YYYY-MM-DD"
                  icon="calendar-today"
                  value={filters.siteVisitFromDate}
                  onPress={() => setActivePicker(true)}
                />
              </View>
              <View style={{ width: '48%' }}>
                <InputField
                  label="Site Visit To Date"
                  placeholder="YYYY-MM-DD"
                  icon="calendar-today"
                  value={filters.siteVisitToDate}
                  onPress={() => setActivePicker(true)}
                />
              </View>
            </View>

            {showFromPicker && (
              <DateTimePicker
                value={
                  filters.fromDate ? new Date(filters.fromDate) : new Date()
                }
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
            {activePicker && (
              <DateTimePicker
                value={
                  filters.siteVisitFromDate
                    ? new Date(filters.siteVisitFromDate)
                    : new Date()
                }
                mode="date"
                display="default"
                onChange={(e, d) => onDateChange(e, d, 'siteVisitFromDate')}
              />
            )}
            {activePicker && (
              <DateTimePicker
                value={
                  filters.siteVisitToDate
                    ? new Date(filters.siteVisitToDate)
                    : new Date()
                }
                mode="date"
                display="default"
                onChange={(e, d) => onDateChange(e, d, 'siteVisitToDate')}
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
        </Animated.View>
      </View>
    </Modal>
  );
};

/* ================= MAIN SCREEN ================= */
const TotalLeadScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [filters, setFilters] = useState({
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
    lead_source: null,
  });
  const [appliedFilters, setAppliedFilters] = useState();
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [activePicker, setActivePicker] = useState(null);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const scrollRef = useRef(null);
  const loadMoreLock = useRef(false);

  const formatDate = date => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const onDateChange = (event, selectedDate, key) => {
    const isFrom = key === 'fromDate';

    if (isFrom) {
      setShowFromPicker(false);
    } else {
      setActivePicker(false);
    }

    if (key === 'toDate') {
      setShowToPicker(false);
    }

    if (selectedDate) {
      onChange(key, formatDate(selectedDate));
    }
  };
  const queryClient = useQueryClient();
  /* ================= INFINITE QUERY ================= */
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['TotalLead', appliedFilters],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get('/api/pm/getAllPropertyLeadsWithAndWihoutRM', {
        params: {
          page: pageParam,
          limit: 20,
          company_id: filters.company_id || undefined,
          rm_id: filters.rm_id || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          project: filters.project || undefined,
          location: filters.location || undefined,
          active: filters.active || undefined,
          status: filters.active || undefined,
          lead_status: filters.lead_status || undefined,
          lead_sub_status: filters.lead_sub_status || undefined,
          lead_qualification: filters.lead_qualification || undefined,
          call_status: filters.call_status || undefined,
          siteVisitFromDate: filters.siteVisitFromDate || undefined,
          siteVisitToDate: filters.siteVisitToDate || undefined,
          reference: filters.lead_source || undefined,
        },
      });
      console.log(
        'LEAD API RESPONSE:',
        JSON.stringify(res.data?.data?.[0], null, 2),
      );
      return res.data;
    },
    getNextPageParam: lastPage => {
      const { currentPage, totalPages } = lastPage;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // সব pages থেকে data flatten করো
  const leads = data?.pages?.flatMap(page => page.data) || [];
  const filteredleads = leads?.filter(item => {
    const name = item?.name?.toLowerCase() || '';
    const phone = item?.phone?.toString() || '';
    const email = item?.email?.toLowerCase() || '';
    const project = item?.propertyproject?.project_name?.toLowerCase() || '';
    const address = item?.propertylocation?.name?.toLowerCase() || '';
    const rm = `${item?.relationshipManager?.usr_fname || ''} ${item?.relationshipManager?.usr_lname || ''
      }`
      .trim()
      .toLowerCase();
    const remarks =
      item?.propertyfeedbacks
        ?.map(x => x?.remarks)
        ?.filter(Boolean)
        ?.join(', ')
        ?.toLowerCase() || 'no remarks available';
    const search = searchText.toLowerCase().trim();

    return (
      name.includes(search) ||
      phone.includes(search) ||
      email.includes(search) ||
      project.includes(search) ||
      address.includes(search) ||
      rm.includes(search) ||
      remarks.includes(search)
    );
  });

  // Count is derived from loaded pages, so it always starts at 1
  const lastPage = data?.pages?.[data.pages.length - 1];
  const totalRecords = lastPage?.totalRecords;
  const startEntry = leads.length > 0 ? 1 : 0;
  const endEntry = leads.length;

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  /* ================= FILTER QUERIES ================= */
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
  const leadQualificationOptions = leadQualificationList?.map(item => ({
    label: item.name,
    value: item.id,
  }));
  const leadStatusOptions = leadStatusList?.map(item => ({
    label: item.name,
    value: item.id,
  }));
  const leadSubStatusOptions = leadSubStatusList?.map(item => ({
    label: item.name,
    value: item.id,
  }));
  const callStatusListfetch = callStatusList?.map(item => ({
    label: item.name,
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
      active: null,
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

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({
      x: 0,
      y: 0,
      animated: true,
    });
  };
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        queryClient.resetQueries({ queryKey: ['TotalLead'] });
      };
    }, [queryClient]),
  );
  /* ================= RENDER ================= */
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
              <Icon name="people" size={20} color="#ffffff" />
              <Text style={styles.screenTitle} numberOfLines={1}>
                Active Leads / Total Leads
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
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          onScroll={event => {
            const { layoutMeasurement, contentOffset, contentSize } =
              event.nativeEvent;

            const y = contentOffset.y;

            setShowTopBtn(y > 200);

            const isNearBottom =
              layoutMeasurement.height + y >= contentSize.height - 150;

            if (
              isNearBottom &&
              hasNextPage &&
              !isFetchingNextPage &&
              !loadMoreLock.current
            ) {
              // lock so ONE scroll-to-bottom loads only ONE page (20 records)
              loadMoreLock.current = true;
              fetchNextPage().finally(() => {
                setTimeout(() => {
                  loadMoreLock.current = false;
                }, 500);
              });
            }
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
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          {/* COUNT */}
          {totalRecords != null && (
            <Text style={styles.countText}>
              Showing {startEntry} to {endEntry} of {totalRecords} entries
            </Text>
          )}

          {/* CARDS */}
          {isLoading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : isFetching && !isFetchingNextPage && filteredleads?.length > 0 ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.refreshingText}>Refreshing...</Text>
            </View>
          ) : filteredleads?.length > 0 ? (
            filteredleads?.map((visit, i) => (
              <SiteCard
                key={visit.id || i}
                data={visit}
                setShowRemarks={setShowRemarks}
                setRemarksText={setRemarksText}
                navigation={navigation}
              />
            ))
          ) : (
            <View style={styles.emptyWrap}>
              <Icon name="people" size={48} color="rgba(255,255,255,0.25)" />
              <Text style={styles.empty}>No data found</Text>
            </View>
          )}

          {isFetchingNextPage && (
            <ActivityIndicator
              size="small"
              color="#999"
              style={{
                marginVertical: 12,
                alignSelf: 'center',
              }}
            />
          )}

          <View style={{ height: 100 }} />
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
          filters={filters}
          onChange={onChange}
          onApply={applyFilter}
          onReset={resetFilters}
          Property={Property}
          callStatusListfetch={callStatusListfetch}
          leadQualificationOptions={leadQualificationOptions}
          leadStatusOptions={leadStatusOptions}
          leadSubStatusOptions={leadSubStatusOptions}
          leadSourceOptions={leadSourceOptions}
          Rm={Rm}
          projectOptions={projectOptions}
          LeadStatus={LeadStatus}
          showFromPicker={showFromPicker}
          showToPicker={showToPicker}
          setShowFromPicker={setShowFromPicker}
          setShowToPicker={setShowToPicker}
          onDateChange={onDateChange}
          setActivePicker={setActivePicker}
          activePicker={activePicker}
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

export default TotalLeadScreen;

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
  refreshingText: { color: '#fff', marginTop: 8, fontSize: 12 },
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
    borderLeftColor: '#ffb85d',
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
  leftBox: { flex: 1, minWidth: 0 },
  rightBox: { flex: 1, minWidth: 0 },
  label: { fontSize: 11.5, color: '#afaea5', lineHeight: 18 },
  value: { color: '#ffffff', fontSize: 11.5, flexShrink: 1 },
  emailText: {
    color: '#4FC3F7',
    textDecorationLine: 'underline',
    fontWeight: '500',
    fontSize: 11.5,
  },
  remarksRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 5,
    gap: 5,
  },
  remarksCardText: {
    fontSize: 11.5,
    color: '#ffffff',
    lineHeight: 18,
  },
  readMore: {
    color: '#4FC3F7',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  button: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1,
    backgroundColor: '#00cfff18', borderWidth: 1, borderColor: '#00cfff40',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  buttonText: { color: '#00cfff', fontSize: 11, fontWeight: '600' },
  completed: {
    color: '#8A90B4',
    fontSize: 11,
    flexShrink: 1,
    textAlign: 'right',
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  sectionTitle: { color: '#ffb300', fontSize: 14, fontWeight: '600' },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#39415a',
    marginLeft: 10,
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
    marginTop: LIST_GAP,
    backgroundColor: '#2b3348',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#39415a',
    overflow: 'hidden',
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
});