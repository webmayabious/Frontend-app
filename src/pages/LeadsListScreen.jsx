import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  Modal,
  DeviceEventEmitter,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Dropdown } from 'react-native-element-dropdown';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import { useSelector } from 'react-redux';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// const makeCall = phoneNumber => {
//   if (!phoneNumber) return;
//   Alert.alert('Call', `Do you want to call ${phoneNumber}?`, [
//     { text: 'Cancel', style: 'cancel' },
//     { text: 'Call', onPress: () => Linking.openURL(`tel:${phoneNumber}`) },
//   ]);
// };
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
  modalBg: '#0f1550',
  sectionBg: 'rgba(255,255,255,0.13)',
};

const USER_IMG_BASE_URL = 'https://pm2-files.s3.ap-south-1.amazonaws.com/user_images';

const getUserImageUrl = img => {
  if (!img) return null;
  // Already a full URL? use as-is
  if (/^https?:\/\//i.test(img)) return img;
  // Remove any leading slash to avoid double slashes
  return `${USER_IMG_BASE_URL}/${String(img).replace(/^\/+/, '')}`;
};

const getChangeMeta = item => {
  const type = String(item?.change_type ?? '');
  const hasChangedBy =
    item?.changed_by !== null && item?.changed_by !== undefined;

  // type "1" + changed_by has a value  => Manual
  // type "2" + changed_by is null      => Automatic
  const isManual = type === '1' && hasChangedBy;
  const isAutomatic = type === '2' && !hasChangedBy;

  // If the data is unexpected, decide using changed_by
  const manual = isManual || (!isAutomatic && hasChangedBy);

  return {
    isAutomatic: !manual,
    label: manual ? 'Manual' : 'Automatic',
    color: manual ? '#f59e0b' : '#1a73e8',
  };
};

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
const RemarksText = ({ remarks }) => {
  const [expanded, setExpanded] = useState(false);

  const shouldShowReadMore = remarks.length > 80;

  return (
    <Text style={styles.remarksCardText}>
      {expanded || !shouldShowReadMore
        ? remarks
        : `${remarks.substring(0, 80)}... `}

      {shouldShowReadMore && (
        <Text
          style={styles.readMore}
          onPress={() => setExpanded(!expanded)}
        >
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

    // Format "YYYY-MM-DD" (or starts with it)
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.substring(0, 10) === today;
    }

    // Any other format: try parsing
    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === today
    );
  });
};

const Avatar = ({ uri, style, iconSize = 20 }) => {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[style, styles.rmAvatarPlaceholder]}>
        <Icon name="person" size={iconSize} color="#8A90B4" />
      </View>
    );
  }

  return (
    <Image source={{ uri }} style={style} onError={() => setFailed(true)} />
  );
};

const SiteCard = ({ data, navigation, setShowRemarks, setRemarksText ,onInfoPress,canViewAssignment,}) => {
  const remarks =
    data?.propertyfeedbacks
      ?.map(x => x?.remarks)
      ?.filter(Boolean)
      ?.join(', ') || 'No Remarks Available';

const hasMultipleAssignments = canViewAssignment && Number(data?.assignment_count) === 2;
const isTodayCard = isCallbackToday(data?.propertyfeedbacks);
// Priority: assignment_count border > today's border > no border
const cardBorderColor = hasMultipleAssignments
  ? '#dc35469c'
  : isTodayCard
    ? '#30bb7896'
    : '#ffffff6e';

  return (
    <View style={[styles.card, , { borderColor: cardBorderColor }]}>
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{data?.name || []}</Text>
          <View
            style={[
              styles.activeBadge,
              {
                backgroundColor:
                  data?.active === '1'
                    ? '#4caf50'
                    : data?.active === '5'
                      ? '#6b7785'
                      : '#f44336',
              },
            ]}
          >
            <Text style={styles.activeText}>
              {data?.active === '1'
                ? 'Active'
                : data?.active === '5'
                  ? 'Booking Done'
                  : 'Inactive'}
            </Text>
          </View>
        </View>

        <View
          style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0, gap:5 }}
        >
          {hasMultipleAssignments && (  
          <Icon
            name="info-outline"
            size={25}
            color="#00e5ff"
            style={{ marginLeft: 8 }}
            onPress={() =>
              onInfoPress && onInfoPress(data?.id, data?.name)
            }
          />
        )}
          {/* <TouchableOpacity
          style={styles.remarksBtn}
          onPress={() => {
            setRemarksText(
              data?.propertyfeedbacks?.map(x => x?.remarks || []).join(', ') ||
                'No remarks available',
            );
            setShowRemarks(true);
          }}
        >
          <Text style={styles.remarksText}>Remarks</Text>
        </TouchableOpacity> */}

          <Icon
            name="edit"
            size={18}
            color="#00e5ff"
            style={{ marginLeft: 8 }}
            onPress={() => navigation.navigate('MeetingsEdit', { id: data?.id })}
          />
        </View>
      </View>




      <Text style={styles.location}>
        {data?.propertyproject?.project_name || []} |{' '}
        {data?.propertylocation?.name || []}
      </Text>

      {/* <View style={styles.rowBetween}>
      <TouchableOpacity onPress={() => makeCall(data?.phone)}>
        <Text style={styles.label}>
          Phone: <Text style={styles.value}>{data?.phone || 'N/A'}</Text>
        </Text>
      </TouchableOpacity>
      <Text style={styles.label}>
        Email: <Text style={styles.value}>{data?.email || 'N/A'}</Text>
      </Text>
    </View> */}
       <View
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    width: '100%',
  }}
>
  <Text
    style={{
      color: '#fb9e08',
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 0,
    }}
  >
    Project Form Name:
  </Text>

  <Text
    style={[
      styles.value,
      {
        flex: 1,
        marginLeft: 5,
      },
    ]}
    numberOfLines={1}
    ellipsizeMode="tail"
  >
    {data?.project_form_name || 'N/A'}
  </Text>
</View>
      <View style={styles.rowBetween}>
        {/* <TouchableOpacity onPress={() => makeCall(data?.propertylead?.phone)}>
        <Text style={styles.label}>
          Phone:{' '}
          <Text style={styles.remarksBtn}>{data?.propertylead?.phone || 'N/A'}</Text>
        </Text>
      </TouchableOpacity> */}
   
     
        <TouchableOpacity onPress={() => makeCall(data?.phone)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.label1}>Phone: </Text>

            {/* <View style={styles.remarksBtn}> */}
            <Text style={styles.phoneText}>{data?.phone || 'N/A'}</Text>
            {/* </View> */}
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.rowBetween}>
        <TouchableOpacity onPress={() => sendMail(data?.email)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.label1}>Email: </Text>

            <Text style={styles.emailText}>{data?.email || 'N/A'}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.rowBetween}>
        <View style={styles.leftBox}>
          <Text style={styles.label}>
            Site Visit Date:
            <Text style={styles.value}>
              {' '}
              {data?.propertyfeedbacks?.map(x => x?.site_visit_date).filter(Boolean).join(', ') || 'N/A'}
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

      {/* নতুন: Call Back Date & Time */}
      <Text style={{ color: '#fb9e08', fontSize: 12, marginTop: 4 }}>
        Call Back Date & Time:{' '}
        <Text style={styles.value}>
          {data?.propertyfeedbacks
            ?.filter(x => x?.call_back_date)
            ?.map(x => `${x.call_back_date}${x.call_back_time ? ' / ' + x.call_back_time : ''}`)
            ?.join(', ') || 'N/A'}
        </Text>
      </Text>

      <Text style={{ color: '#fb9e08', fontSize: 12, marginTop: 4 }}>
        Lead Source:{' '}
        <Text style={styles.value}>{data?.mrreference?.mrf_name || []}</Text>
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginTop: 8,
        }}
      >
        <Text
          style={{
            color: '#fb9e08',
            fontSize: 12,
            fontWeight: '600',
            marginRight: 5,
          }}
        >
          Remarks:
        </Text>

        <View style={{ flex: 1 }}>
          <RemarksText remarks={remarks} />
        </View>
      </View>
        
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate('AllInteractionsScreen', { id: data?.id })
          }
        >
          <Text style={styles.buttonText}>View Interaction</Text>
        </TouchableOpacity>
        <Text style={styles.completed}>
          {data?.propertyfeedbacks
            ?.map(x => x.propertycallstatus?.name)
            .join(', ') || 'N/A'}
        </Text>
      </View>
    </View>
  )
};

const LIST_HEIGHT = 220;
const FIELD_TOP_OFFSET = Platform.OS === 'ios' ? 280 : 250;
// Inline dropdown, same behaviour/look as EmployeeDropdown
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
  const initial = selected?.label?.[0]?.toUpperCase();

  const filtered = options.filter(o =>
    String(o.label ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const maxHeight = dropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LIST_HEIGHT],
  });

  // After the list has expanded, scroll up just enough to keep it above the BottomNav
 // Animate the screen so this field moves up toward the top
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
// const handleSearchFocus = () => {
//     setTimeout(() => {
//       if (!wrapRef.current || !scrollRef?.current) return;
//       wrapRef.current.measureInWindow((x, y) => {
//         const delta = y - SEARCH_TOP_OFFSET;
//         if (delta > 0) {
//           scrollRef.current.scrollTo({
//             y: (scrollYRef?.current || 0) + delta,
//             animated: true,
//           });
//         }
//       });
//     }, 350); // wait for the keyboard animation
//   };
const close = (duration = 180) => {
  Keyboard.dismiss();
  Animated.timing(dropAnim, {
    toValue: 0,
    duration,
    useNativeDriver: false,
  }).start(() => {
    setOpen(false);
    setSearch('');
    DeviceEventEmitter.emit('toggleBottomNav', true);   // show the nav again
  });
};

const toggle = () => {
  if (open) {
    close();
  } else {
    DeviceEventEmitter.emit('toggleBottomNav', false);  // hide the nav as soon as it opens
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
  return () => DeviceEventEmitter.emit('toggleBottomNav', true);  // restore on leaving the screen
}, []);

  const handleSelect = item => {
    onChange && onChange(item.value);
    close(150);
  };

  return (
    <View ref={wrapRef} collapsable={false} style={styles.field}>
     {label ? <Text style={styles.dropLabel}>{label}</Text> : null}

      {/* Trigger */}
      <TouchableOpacity
        style={[
          styles.dropdown,
          open && styles.dropdownOpen,
          error && styles.inputError,
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        ]}
        onPress={toggle}
        activeOpacity={0.8}
      >
        <View style={styles.ddTriggerLeft}>
          {/* {selected ? (
            <View style={styles.ddAvatar}>
              <Text style={styles.ddAvatarTxt}>{initial}</Text>
            </View>
          ) : null} */}
          <Text
            style={selected ? styles.selectedText : styles.placeholder}
            numberOfLines={1}
          >
            {selected ? selected.label : placeholder || 'Select...'}
          </Text>
        </View>
        <Icon
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color="#8a9daf"
        />
      </TouchableOpacity>

      {/* Inline list */}
      {open && (
        <Animated.View
          style={[styles.dropdownMenu, { maxHeight, opacity: dropAnim }]}
        >
          <View style={styles.ddSearchWrap}>
            <Icon name="search" size={16} color="#000" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.ddSearchInput}
              placeholder="Search..."
              placeholderTextColor="#000"
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
                    style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    {/* <View style={[styles.ddAvatar, isActive && styles.ddAvatarSelected]}>
                      <Text style={[styles.ddAvatarTxt, isActive && { color: '#fff' }]}>
                        {String(item.label ?? '')[0]?.toUpperCase()}
                      </Text>
                    </View> */}
                    <Text
                      style={[
                        styles.dropdownItemText,
                        isActive && styles.dropdownItemTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {isActive && <Icon name="check" size={16} color="#1482cc" />}
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
    <Text style={styles.filterLabel}>{label}</Text>
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <View style={styles.filterInputContainer}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#7a8fc4"
          style={styles.filterInput}
          value={value}
          onChangeText={onChange}
          editable={!onPress}
        />
        {icon && <Icon name={icon} size={18} color="#00bcd4" />}
      </View>
    </TouchableOpacity>
  </View>
);

// ─── Centered Filter Modal with scale+fade animation ─────────────────────────
const FilterModal = ({
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
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
 const scrollRef1 = useRef(null);
      const scrollYRef = useRef(0); 
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 5,
          speed: 16,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <Animated.View style={[styles.modalOverlay, { opacity: opacityAnim }]}>
      {/* Backdrop tap to close */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Modal card */}
      <Animated.View
        style={[
          styles.filterModalCard,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        ]}
      >
        <View style={styles.dragHandle} />
        <Text style={styles.modalTitle}>Filter Leads</Text>
        <View style={styles.modalDivider} />

        <ScrollView
          style={styles.filterScrollView}
                 ref={scrollRef1}
          onScroll={e => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
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
            value={filters.rm_id}
            onChange={value => onChange('rm_id', value)}
                   scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
          />

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
                   scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
          />
          <DropdownField
            label="Lead Status"
            data={LeadStatus}
            placeholder="Select Status"
            value={filters.active}
            onChange={value => onChange('active', value)}
                   scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 10 }}>
            <Text
              style={{
                color: '#eec34b',
                fontSize: 14,
                fontWeight: '500',
              }}
            >
              FeedBack
            </Text>

            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: '#6e6e6b',
                marginLeft: 10,
              }}
            />
          </View>
          <DropdownField
            label="Call Status"
            data={callStatusListfetch}
            placeholder="Select Status"
            value={filters.call_status}
            onChange={value => onChange('call_status', value)}
                   scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
          />
          <DropdownField
            label="Lead Qualification"
            data={leadQualificationOptions}
            placeholder="Select Qualification"
            value={filters.lead_qualification}
            onChange={value => onChange('lead_qualification', value)}
                   scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
          />
          <DropdownField
            label="Lead Status"
            data={leadStatusOptions}
            placeholder="Select Status"
            value={filters.lead_status}
            onChange={value => onChange('lead_status', value)}
                   scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
          />
          <DropdownField
            label="Lead Sub Status"
            data={leadSubStatusOptions}
            placeholder="Select Sub Status"
            value={filters.lead_sub_status}
            onChange={value => onChange('lead_sub_status', value)}
                   scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
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
          <View style={{ height: 8 }} />
        </ScrollView>

        <View style={styles.modalDivider} />

        <TouchableOpacity style={styles.modalCloseBtn} onPress={onApply}>
          <Text style={styles.modalCloseText}>Apply Filter</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onReset} style={{ marginTop: 14 }}>
          <Text style={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: 14 }}>
            Reset All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onClose}
          style={{ marginTop: 12, marginBottom: 4 }}
        >
          <Text style={{ color: '#a0b4e8', fontSize: 13 }}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const LeadsListScreen = () => {
  const navigation = useNavigation();
  const scrollRef = useRef();
  const isScrollingToTop = useRef(false);
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);
const [isTotalLeadsLoading, setIsTotalLeadsLoading] = useState(false);
  const userRole = useSelector(state => state.userRole);
const isAdmin = userRole?.includes('ADMIN');
const isCityHead = userRole?.includes('CITY HEAD');
const canViewAssignment = !!(isAdmin || isCityHead);

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
    Alert.alert('Error', 'Unable to load RM change history.');
    hideRMHistoryModal();
  }
}, [rmHistoryError]);

const fetchRMChangeHistory = (leadId, leadName) => {
  if (!leadId) return;
  setSelectedLeadName(leadName || '');
  setSelectedLeadId(leadId);
  showRMHistoryModal();
};

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
  });
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [activePicker, setActivePicker] = useState(null);
  const [appliedFilters, setAppliedFilters] = useState();
  const [pagination, setPagination] = useState(null);
  const formatDate = date => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // const onDateChange = (event, selectedDate, key) => {
  //   key === 'fromDate' ? setShowFromPicker(false) : setShowToPicker(false);
  //   if (selectedDate) onChange(key, formatDate(selectedDate));
  // };
  const onDateChange = (event, selectedDate, key) => {
    const isFrom = key === 'fromDate';
    const isSiteVisitForm = key === 'siteVisitFromDate';

    if (isFrom) {
      setShowFromPicker(false);
    } else {
      setActivePicker(false);
    }

    if (selectedDate) {
      onChange(key, formatDate(selectedDate));
    }
  };
  const {
    data: Lead = [],
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
      console.log('lead data:', JSON.stringify(res?.data?.data?.[0], null, 2));
      setPagination({
        total_records: res.data.totalRecords,
        total_pages: res.data.totalPages,
        current_page: res.data.currentPage,
        per_page: res.data.limit,
      });
      return res.data;
    },
    getNextPageParam: lastPage => {
      const { currentPage, totalPages } = lastPage;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const leads = React.useMemo(() => {
    const all = Lead?.pages?.flatMap(page => page.data) || [];
    const seen = new Set();
    return all.filter(item => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [Lead]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

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
      console.log('callStatusList', res.data.data);
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
    { label: 'Active', value: '1' },
    { label: 'Inactive', value: '2' },
    { label: 'Booking Done', value: '5' },
  ];

  const onChange = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value }));

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
    };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setShowFilterModal(false);
  };
  const startEntry = pagination
    ? (pagination.current_page - 1) * pagination.per_page + 1
    : 0;

  const endEntry = pagination
    ? Math.min(
      pagination.current_page * pagination.per_page,
      pagination.total_records
    )
    : 0;
   
  const scrollToTop = () => {
    isScrollingToTop.current = true;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setTimeout(() => {
      isScrollingToTop.current = false;
    }, 600);
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
  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <View style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="list-alt" size={18} color="#cfd8dc" />
            <Text style={styles.screenTitle}>Leads List</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={[
                styles.backBtn,
                { marginRight: 5, borderColor: '#00e5ff' },
              ]}
              onPress={() => setShowFilterModal(true)}
            >
              <Icon name="filter-alt" size={18} color="#00e5ff" />
            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Rmform')} activeOpacity={0.75}>
                        <Icon name="add" size={13} color="#fff" />
                        <Text style={styles.actionBtnText} numberOfLines={1} adjustsFontSizeToFit>Add New Lead</Text>
                      </TouchableOpacity> */}
            {/* <TouchableOpacity
              style={styles.addNewBtn}
              onPress={() =>
                navigation.navigate('Totalleadscreen1')


              }
              activeOpacity={0.75}
            >
              <Text style={styles.addNewText}>Total Leads</Text>
            </TouchableOpacity> */}
            <TouchableOpacity
  style={[
    styles.addNewBtn,
    isTotalLeadsLoading && { opacity: 0.6 },
  ]}
  onPress={handleTotalLeads}
  activeOpacity={0.75}
  disabled={isTotalLeadsLoading}
>
  {isTotalLeadsLoading ? (
    <ActivityIndicator size="small" color="#FFFFFF" />
  ) : (
    <Text style={styles.addNewText}>Total Leads</Text>
  )}
</TouchableOpacity>
            <TouchableOpacity
              style={styles.backBtn}
               onPress={() => navigation.navigate('Dashboard')}
            >
              <View style={styles.backButton}>
                <Image
                  source={require('../asset/image/icon/Arrow.png')}
                  style={{ width: 12, height: 12, marginRight: 6 }}
                />
                <Text style={styles.backText}>Back</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={event => {
          const { layoutMeasurement, contentOffset, contentSize } =
            event.nativeEvent;
          const y = contentOffset.y;
          setShowTopBtn(y > 200);
          if (isScrollingToTop.current) return;
          const isNearBottom =
            layoutMeasurement.height + y >= contentSize.height - 150;
          if (isNearBottom) handleLoadMore();
        }}
        scrollEventThrottle={400}
      >
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
              clearButtonMode="while-editing"
            />
          </View>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Rmform')} activeOpacity={0.75}>
            <Icon name="add" size={16} color="#fff" />
            <Text style={styles.actionBtnText} numberOfLines={1} adjustsFontSizeToFit>Add New Lead</Text>
          </TouchableOpacity>
        </View>
        {pagination && (
          <Text style={{
            alignSelf: 'flex-start',
            marginLeft: 15,
            // marginTop: 2,
            marginBottom: 8,
            color: '#a0b4e8',
            fontSize: 12,
            fontWeight: '600'
          }}>
            Showing {startEntry} to {endEntry} of {pagination.total_records} entries
          </Text>
        )}
        {isLoading ? (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
            Loading...
          </Text>
        ) : isFetching && !isFetchingNextPage && leads.length > 0 ? (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
            Refreshing...
          </Text>
        ) : leads && leads.length > 0 ? (
          leads.map((visit, i) => (
            <SiteCard
              key={visit?.id != null ? `lead-${visit.id}` : `lead-idx-${i}`}
              data={visit}
              setShowRemarks={setShowRemarks}
              setRemarksText={setRemarksText}
              navigation={navigation}
              onInfoPress={fetchRMChangeHistory}
              canViewAssignment={canViewAssignment}
            />
          ))
        ) : (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
            No Data Found
          </Text>
        )}

        {isFetchingNextPage && (
          <ActivityIndicator
            size="small"
            color="#999"
            style={{ marginVertical: 12, alignSelf: 'center' }}
          />
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* REMARKS MODAL */}
      {/* {showRemarks && (
        <View style={styles.modalOverlay}>
          <View style={styles.remarksModalCard}>
            <View style={styles.checkIcon}>
              <Icon name="check-circle" size={32} color="#00acc1" />
            </View>
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
      )} */}

       {/* RM CHANGE HISTORY — bottom sheet style */}
      <Modal
        visible={showRMHistory}
        transparent
        animationType="none"
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
            <View style={styles.rmHistoryHandle} />
            <Text style={styles.rmHistoryTitle}>RM Change History</Text>

            {rmHistoryLoading ? (
              <ActivityIndicator
                size="small"
                color="#00e5ff"
                style={{ marginVertical: 40 }}
              />
            ) : rmHistoryData.length === 0 ? (
              <Text style={styles.rmHistoryEmpty}>No history found</Text>
            ) : (
              <>
                {/* Summary card */}
{(() => {
  const first = rmHistoryData[0];

  const leadName =
    selectedLeadName || first?.propertylead?.name || 'N/A';

  const projectName =
    first?.propertylead?.propertyproject?.project_name || 'N/A';

  return (
    <View style={styles.rmSummaryCard}>
      <View style={styles.rmSummaryAccent} />

      <View style={styles.rmSummaryContent}>

        {/* PROJECT */}
        <View style={styles.rmSummaryItem}>
          <Text style={styles.rmSummaryLabel}>
            PROJECT:
          </Text>

          <Text
            style={styles.rmSummaryValue}
            numberOfLines={1}
          >
            {projectName}
          </Text>
        </View>

        {/* LEAD */}
        <View style={styles.rmSummaryItem}>
          <Text style={styles.rmSummaryLabel}>
            LEAD:
          </Text>

          <Text
            style={styles.rmSummaryValue}
            numberOfLines={1}
          >
            {leadName}
          </Text>
        </View>

        {/* TOTAL CHANGES */}
        <View style={styles.rmSummaryItem}>
          <Text style={styles.rmSummaryLabel}>
            TOTAL CHANGES:
          </Text>

          <Text style={styles.rmSummaryCount}>
            {rmHistoryData.length}
          </Text>
        </View>

      </View>
    </View>
  );
})()}

                {/* Timeline list */}
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

                    const prevImg = getUserImageUrl(item?.previousRM?.usr_img);
                    const newImg = getUserImageUrl(item?.newRM?.usr_img);
                    const changedByImg = getUserImageUrl(changedBySource?.usr_img);

                    // const isAutomatic =
                    //   !item?.change_type ||
                    //   String(item.change_type).toLowerCase() === 'automatic';
                    // const badgeLabel = isAutomatic ? 'Automatic' : 'Manual';
                    // const badgeBg = isAutomatic ? '#1a73e8' : '#1a73e8';
                    const { isAutomatic, label: badgeLabel, color: badgeBg } = getChangeMeta(item);

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
                              <Avatar uri={prevImg} style={styles.rmAvatar} />
                              <Text style={styles.rmPersonRole}>PREVIOUS RM</Text>
                              <Text style={styles.rmPersonName} numberOfLines={2}>
                                {prevName}
                              </Text>
                            </View>

                            <View style={styles.rmArrowWrap}>
                              <Icon name="arrow-forward" size={20} color="#fff" />
                            </View>

                            <View style={styles.rmPersonCol}>
                              <Avatar uri={newImg} style={styles.rmAvatar} />
                              <Text style={styles.rmPersonRole}>NEW RM</Text>
                              <Text
                                style={[styles.rmPersonName, { color: '#00e5ff' }]}
                                numberOfLines={2}
                              >
                                {newName}
                              </Text>
                            </View>
                          </View>

                          {!isAutomatic && changedByName ? (
                            <View style={styles.rmChangedByRow}>
                              <Text style={styles.rmChangedByLabel}>CHANGED BY</Text>
                              <Avatar uri={changedByImg} style={styles.rmChangedByAvatar} iconSize={12} />
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

            <TouchableOpacity
              style={styles.rmHistoryCancelBtn}
              onPress={hideRMHistoryModal}
              activeOpacity={0.8}
            >
              <Text style={styles.rmHistoryCancelText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>


      {/* ✅ FILTER — Centered modal with scale+fade animation */}
      <FilterModal
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

      {showTopBtn && (
        <TouchableOpacity style={styles.topButton} onPress={scrollToTop}>
          <Icon name="keyboard-arrow-up" size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default LeadsListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070c4d' },
  topBarContainer: { paddingHorizontal: 15, marginTop: 10 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff15',
    padding: 10,
    borderRadius: 20,
    marginBottom: 10,
  },
  screenTitle: { color: '#cfd8dc', fontSize: 13, marginLeft: 6 },
  backBtn: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: { color: '#fff', fontSize: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  // searchRow: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   gap: 10,
  //   width: '100%',
  // },
  //   searchBox: {
  //     flex:1,
  //     flexDirection: 'row',
  //     alignItems: 'center',
  //     marginHorizontal:10,
  //     marginBottom: 5,
  //     borderWidth: 1,
  //     borderColor: '#444',
  //     borderRadius: 22,
  //     paddingHorizontal: 12,
  //     paddingVertical: Platform.OS === 'ios' ? 10 : 0,
  //     minHeight: Platform.OS === 'ios' ? 44 : 40,
  //     backgroundColor: '#ffffff08',
  //   },
  //   searchInput: {
  //     marginLeft: 8,
  //     color: '#fff',
  //     flex: 1,
  //     fontSize: 14,
  //     paddingVertical: 0,
  //     height: Platform.OS === 'ios' ? undefined : 40,
  //   },
  // actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(58,63,122,0.85)', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderColor, minHeight: 36 },
  //   actionBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '600', textAlign: 'center' },
searchRow: {
  flexDirection: 'row',
  alignItems: 'center',
  width: '100%',
  paddingHorizontal: 10,
  gap: 10,
  marginBottom: 8,
},

searchBox: {
  flex: 1,
  height: 40,
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: COLORS.borderColor,
  borderRadius: 20,
  backgroundColor: 'rgba(255,255,255,0.06)',
  paddingHorizontal: 12,
},

searchInput: {
  flex: 1,
  color: COLORS.white,
  fontSize: 13,
  marginLeft: 8,
  paddingVertical: 0,
  height: 40,
},

actionBtn: {
  width: 120,            // 110 theke barano, 13 size e text jate fit hoy
  height: 40,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  backgroundColor: 'rgba(58,63,122,0.85)',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: COLORS.borderColor,
},

actionBtnText: {
  color: COLORS.white,
  fontSize: 12,
  fontWeight: '600',
  textAlign: 'center',
},

  card: {
    marginHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffffff6e',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff20',
  },
  remarksCardText: {
    fontSize: 13,
    color: '#ffffff',
    lineHeight: 20,
  },

  readMore: {
    color: '#00a8ff',
    fontWeight: '600',
    marginTop: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  addNewBtn: {
    backgroundColor: '#2488B5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#1784b7',
    marginRight: 5
  },
  addNewText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  name: { color: '#fff', fontWeight: 'bold', flexShrink: 1 },
  activeBadge: { borderRadius: 10, paddingHorizontal: 6, marginLeft: 6 },
  activeText: { color: '#fff', fontSize: 10 },
  remarksBtn: {
    backgroundColor: '#00acc1',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 80,
  },
  phoneText: {
    color: '#00acc1',
    backgroundColor: 'rgba(0, 172, 193, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  remarksText: { color: '#fff', fontSize: 10 },
  location: {
    color: '#00e5ff',
    marginTop: 5,
    flexWrap: 'wrap',
    lineHeight: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    gap: 6,
  },
  label: {
    color: '#FFB85D',
    fontSize: 12,
    flex: 1,
    flexWrap: 'wrap',
    paddingTop: 2,
  },
  label1: {
    color: '#FFB85D',
    fontSize: 12,
    // flex: 1, flexWrap: 'wrap',
    paddingTop: 2,
  },
  emailText: {
    color: '#00acc1',
    textDecorationLine: 'underline',
    fontWeight: '500',
    fontSize: 12,
  },
  value: { color: '#fff', flexShrink: 1 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  button: {
    backgroundColor: '#00acc1',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 1,
  },
  buttonText: { color: '#fff', fontSize: 12 },
  completed: { color: '#aaa', fontSize: 12, flexShrink: 1, textAlign: 'right' },
  topButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#00acc1',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ✅ Centered overlay — justifyContent: center */
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    bottom: 85,
  },

  /* Remarks modal */
  remarksModalCard: {
    width: '85%',
    backgroundColor: '#1a1f6b',
    borderWidth: 1,
    borderColor: '#3d45b0',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  checkIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e6f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  /* ✅ Filter modal — centered, max 72% screen height */
  filterModalCard: {
    width: '88%',
    maxHeight: SCREEN_HEIGHT * 0.72,
    backgroundColor: '#1a1f6b',
    borderWidth: 1,
    borderColor: '#3d45b0',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    alignItems: 'center',
  },

  /* ScrollView inside modal */
  filterScrollView: {
    width: '100%',
    flexGrow: 0,
  },

  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#3d55cc',
    borderRadius: 2,
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
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  modalText: { color: '#fff', textAlign: 'center', marginBottom: 15 },
  modalCloseBtn: {
    backgroundColor: '#00acc1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 6,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  filterInputWrapper: { width: '100%', marginBottom: 12 },
  filterLabel: {
    color: '#a0b4e8',
    fontSize: 12,
    marginBottom: 5,
    fontWeight: '500',
  },
  filterDropdown: {
    height: 40,
    backgroundColor: '#ffffff12',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#3d55cc',
  },
  dropdownContainer: { backgroundColor: '#fff', borderRadius: 8 },
  dropLabel: { color: '#00cfff', fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 5 },
 dropdown: {
    height: 40,
 backgroundColor: '#ffffff12',
    borderRadius: 12,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
      borderColor: '#3d55cc',
  },
  dropdownOpen: { borderColor: '#4aa3df', 
    // backgroundColor: '#28304a' 
  },
  dropdownMenu: {
    marginTop: 4,
   backgroundColor: '#ffffff',
    borderRadius: 12,
    // borderWidth: 1,
    // borderColor: '#39415a',
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
   
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    // borderBottomWidth: 1,
    // borderBottomColor: '#323a52',
  },
  dropdownItemActive: { backgroundColor: 'rgba(74,163,223,0.15)' },
  dropdownItemText: { flex: 1, fontSize: 13, color: '#000', fontWeight: '500' },
  dropdownItemTextActive: { color: '#7cc4f2', fontWeight: '700' },
  placeholder: { color: '#8a9daf', fontSize: 13 },
  selectedText: { color: '#e6ebf2', fontSize: 13, fontWeight: '600' },
  ddTriggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  ddAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(20,130,204,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ddAvatarSelected: { backgroundColor: '#1482cc' },
  ddAvatarTxt: { fontSize: 11, fontWeight: '700', color: '#1482cc' },
  ddSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#babdc5',
    backgroundColor: '#b1b5c0',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  ddSearchInput: { flex: 1, fontSize: 13, color: '#000', padding: 0 },
  ddNoResult: { textAlign: 'center', color: '#6b7690', fontSize: 12, paddingVertical: 16 },
  placeholderStyle: { color: '#7a8fc4', fontSize: 13 },
  selectedTextStyle: { color: '#fff', fontSize: 13 },

  field: { marginBottom: 12, width: '100%' },
  filterInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff12',
    borderWidth: 1,
    borderColor: '#3d55cc',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  filterInput: { flex: 1, color: '#fff', fontSize: 13, paddingVertical: 0 },
  /* RM History bottom sheet */
  rmHistoryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  rmHistorySheet: {
    backgroundColor: '#0d1240',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.82,
    width:'100%',
  },
  rmHistoryHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3d55cc',
    alignSelf: 'center',
    marginBottom: 12,
  },
  rmHistoryTitle: {
    color: '#00cfff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  rmHistorySubtitle: {
    color: '#a0b4e8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },
  rmHistoryEmpty: {
    color: '#fff',
    textAlign: 'center',
    marginVertical: 32,
    fontSize: 13,
  },

  /* Summary card */
  rmSummaryCard: {
    // backgroundColor: '#151b4a',
    backgroundColor: COLORS.modalBg, 
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ffffff12',
  },
  rmSummaryAccent: {
    width: 4,
    backgroundColor: '#00cfff',
  },
 rmSummaryContent: {
  flex: 1,
  paddingVertical: 12,
  paddingHorizontal: 14,
},

rmSummaryItem: {
  flexDirection: 'row',
  alignItems: 'center',
  minHeight: 24,
},

rmSummaryLabel: {
  color: '#8A90B4',
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 0.4,
  width: 105,
},

rmSummaryValue: {
  flex: 1,
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},

rmSummaryCount: {
  color: '#00cfff',
  fontSize: 16,
  fontWeight: '700',
},

  /* Timeline */
  rmTimelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  rmTimelineLeft: {
    width: 16,
    alignItems: 'center',
    marginRight: 8,
  },
  rmTimelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00cfff',
    marginTop: 18,
    borderWidth: 2,
    borderColor: '#0d1240',
  },
  rmTimelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#2a3370',
    marginTop: 4,
  },
  rmTimelineCard: {
    flex: 1,
    backgroundColor: '#151b4a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffffff10',
  },
  rmCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  rmBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rmBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  rmCardDate: {
    color: '#8A90B4',
    fontSize: 11,
  },

  /* Transfer row */
  rmTransferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rmPersonCol: {
    flex: 1,
    alignItems: 'center',
  },
  rmAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginBottom: 6,
    backgroundColor: '#1e255a',
  },
  rmAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rmPersonRole: {
    color: '#8A90B4',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  rmPersonName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  rmArrowWrap: {
    paddingHorizontal: 6,
    marginBottom: 18,
  },

  /* Changed by */
  rmChangedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ffffff10',
    gap: 6,
  },
  rmChangedByLabel: {
    color: '#8A90B4',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  rmChangedByAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1e255a',
  },
  rmChangedByName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  rmHistoryCancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  rmHistoryCancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  rmHistoryScroll: {
    maxHeight: SCREEN_HEIGHT * 0.52,
    width:'100%',
    marginBottom: 8,
  },
  rmHistoryCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#3d45b055',
  },
  rmHistoryLabel: {
    color: '#FFB85D',
    fontSize: 13,
    marginBottom: 4,
  },
  rmHistoryValue: {
    color: '#fff',
    fontWeight: '600',
  },
  rmHistoryMeta: {
    color: '#a0b4e8',
    fontSize: 11,
    marginTop: 2,
  },
  rmHistoryCancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  rmHistoryCancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
