// TotalLeadScreen.js (Updated - Same Filter Modal as LeadsListScreen)
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../Layout/Header';
import BottomNav from '../navigations/BottomNav';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import { Dropdown } from 'react-native-element-dropdown';

const STATUSBAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight : 44;
const SCREEN_HEIGHT = Dimensions.get('window').height;
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

/* ================= DROPDOWN FIELD (card use) ================= */
// const DropdownField = ({ label, data, placeholder, value, onChange }) => {
//   const [isFocus, setIsFocus] = useState(false);
//   return (
//     <View style={styles.filterInputWrapper}>
//       <Text style={styles.filterLabel}>{label}</Text>
//       <Dropdown
//         style={[
//           styles.filterDropdown,
//           isFocus && { borderColor: '#00e5ff', borderWidth: 1.5 },
//         ]}
//         containerStyle={styles.dropdownContainer}
//         placeholderStyle={styles.placeholderStyle}
//         selectedTextStyle={styles.selectedTextStyle}
//         itemTextStyle={{ color: '#0b0b0b', fontWeight: '500' }}
//         activeColor="#e6f7ff"
//         data={data || []}
//         labelField="label"
//         valueField="value"
//         placeholder={placeholder}
//         value={value}
//         onFocus={() => setIsFocus(true)}
//         onBlur={() => setIsFocus(false)}
//         onChange={item => {
//           setIsFocus(false);
//           onChange && onChange(item.value);
//         }}
//         renderRightIcon={() => (
//           <Icon
//             name={isFocus ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
//             size={20}
//             color="#00e5ff"
//           />
//         )}
//       />
//     </View>
//   );
// };
const LIST_HEIGHT = 220;

const FIELD_TOP_OFFSET = Platform.OS === 'ios' ? 280 : 200;
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
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Icon
          name="edit"
          size={18}
          color="#00e5ff"
          style={{ marginLeft: 8 }}
          onPress={() =>
            navigation.navigate('MeetingsEdit', {
              id: data?.id,
            })
          }
        />
      </View>
    </View>

    {/* Info */}
    <Text style={styles.location}>
      {data?.propertyproject?.project_name} | {data?.propertylocation?.name}
    </Text>
    <View style={styles.rowBetween}>
      <TouchableOpacity onPress={() => makeCall(data?.phone)}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.label}>Phone:{' '}</Text>

          <Text style={styles.phoneText}>
            {data?.phone || 'N/A'}
          </Text>
        </View>
      </TouchableOpacity>

    </View>
    <View style={styles.rowBetween}>

      <TouchableOpacity

        onPress={() => sendMail(data?.email)}

      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.label}>Email:{' '}</Text>


          <Text style={styles.emailText}>
            {data?.email || 'N/A'}
          </Text>

        </View>
      </TouchableOpacity>
    </View>
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
    

<View style={styles.rowBetween}>
  <View style={{ flex: 1 }}>
    <Text style={styles.label}>
      Call Back:{' '}
      <Text style={styles.value}>
        {data?.propertyfeedbacks
          ?.map(x => formatCallBackDateTime(x?.call_back_date, x?.call_back_time))
          .filter(Boolean)
          .join(', ') || 'N/A'}
      </Text>
    </Text>
  </View>
</View>

    <Text style={{ color: '#fb9e08', fontSize: 12, marginTop: 4 }}>
      Lead Source:{' '}
      <Text style={styles.value}>{data?.mrreference?.mrf_name}</Text>
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
        <Text style={styles.buttonText}>View Interaction</Text>
      </TouchableOpacity>

      <Text style={styles.completed}>
        {data?.propertyfeedbacks
          ?.map(x => x.propertycallstatus?.name)
          .join(', ') || 'N/A'}
      </Text>
    </View>
  </View>
)};

/* ================= FILTER MODAL (same as LeadsListScreen) ================= */
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          <DropdownField
            label="Lead Source"
            data={leadSourceOptions}
            placeholder="Select Lead Source"
            value={filters.lead_source}
            onChange={value => onChange('lead_source', value)}
               scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
          />
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

/* ================= MAIN SCREEN ================= */
const TotalLeadScreen = () => {
  const navigation = useNavigation();
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
 const [pagination, setPagination] = useState(null);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const scrollRef = useRef(null);

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

  /* ================= INFINITE QUERY ================= */
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching } =
    useInfiniteQuery({
      queryKey: ['TotalLead', appliedFilters],
      queryFn: async ({ pageParam = 1 }) => {
        const res = await api.get(
          '/api/pm/getAllPropertyLeadsWithAndWihoutRM',
          {
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
          },
        );
        console.log('LEAD API RESPONSE:', JSON.stringify(res.data?.data?.[0], null, 2)); 
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

  // ✅ সব pages থেকে data flatten করো
  const leads = data?.pages?.flatMap(page => page.data) || [];
  const filteredleads = leads?.filter(item => {
    const name = item?.name?.toLowerCase() || '';
    const phone = item?.phone?.toString() || '';
    const email = item?.email?.toLowerCase() || '';
    const project = item?.propertyproject?.project_name?.toLowerCase() || '';
    const address = item?.propertylocation?.name?.toLowerCase() || '';
    const rm = `${item?.relationshipManager?.usr_fname || ''} ${item?.relationshipManager?.usr_lname || ''}`
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
  // ✅ Infinite scroll handler — scroll position দেখে trigger করে
  const startEntry = pagination
  ? (pagination.current_page - 1) * pagination.per_page + 1
  : 0;

const endEntry = pagination
  ? Math.min(
      pagination.current_page * pagination.per_page,
      pagination.total_records
    )
  : 0;
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
  /* ================= RENDER ================= */
  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* Title Row */}
      <View style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="people" size={18} color="#cfd8dc" />
            <Text style={styles.screenTitle}>Active Leads / Total Leads</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={[
                styles.backBtn,
                { marginRight: 8, borderColor: '#00e5ff' },
              ]}
              onPress={() => setShowFilterModal(true)}
            >
              <Icon name="filter-alt" size={18} color="#00e5ff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
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

          const isNearBottom =
            layoutMeasurement.height + y >= contentSize.height - 150;

          if (isNearBottom && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        scrollEventThrottle={16}
      >
        {/* Search Box */}
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
{pagination && (
  <Text  style={{
                      alignSelf: 'flex-start',
                    marginLeft: 15,
                    // marginTop: 2,
                    marginBottom: 8,
                    color:'#a0b4e8',
                    fontSize:12,
                    fontWeight:'600'
                  }}>
    Showing {startEntry} to {endEntry} of {pagination.total_records} entries
  </Text>
)}
        {isLoading ? (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
            Loading...
          </Text>
        ) : isFetching && !isFetchingNextPage && filteredleads?.length > 0 ? (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
            Refreshing...
          </Text>
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
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#fff' }}>
            No data found
          </Text>
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
      )}

      {/* ✅ FILTER — Centered modal with scale+fade animation (same as LeadsListScreen) */}
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

      {/* Scroll to Top Button */}
      {showTopBtn && (
        <TouchableOpacity style={styles.topButton} onPress={scrollToTop}>
          <Icon name="keyboard-arrow-up" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Bottom Nav */}
      {/* <BottomNav /> */}
    </View>
  );
};

export default TotalLeadScreen;

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070c4d' },

  topBarContainer: { paddingHorizontal: 15, marginTop: 10 },

  emailText: {
    color: '#00acc1',
    textDecorationLine: 'underline',
    fontWeight: '500',
    fontSize: 12,


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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff15',
    padding: 10,
    borderRadius: 20,
    marginBottom: 10,
  },

  screenTitle: {
    color: '#cfd8dc',
    fontSize: 13,
    marginLeft: 6,
  },

  backBtn: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },

  backText: { color: '#fff', fontSize: 12 },

 searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    marginBottom:8,
    borderWidth: 1,
 borderColor: COLORS.borderColor, borderRadius: 20,  backgroundColor: 'rgba(255,255,255,0.06)', 
    paddingHorizontal: 12,
    marginTop: 0,
    height: Platform.OS === 'ios' ? 40 : 40,
  },
searchInput: { color: COLORS.white, marginLeft: 8, fontSize: 13, flex: 1, paddingVertical: 0 },

  card: {
    marginHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffffff6e',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff20',
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

  name: {
    color: '#fff',
    fontWeight: 'bold',
    flexShrink: 1,
  },

  activeBadge: {
    backgroundColor: '#4caf50',
    borderRadius: 10,
    paddingHorizontal: 6,
    marginLeft: 6,
  },

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
    // color: '#a0b4e8',
     color: '#FFB85D',
    fontSize: 12,
    fontWeight: '500',
  },
leftBox: {
  flex: 1,
  minWidth: 0,
},

rightBox: {
  flex: 1,
  minWidth: 0,
},
  value: {
    color: '#fff',
    flexShrink: 1,
  },

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

  completed: {
    color: '#aaa',
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },

  topButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 125 : 100,
    right: 20,
    backgroundColor: '#00acc1',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ✅ Centered overlay */
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

  /* ✅ Filter modal — centered, max 72% screen height (same as LeadsListScreen) */
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

  modalTitle: {
    color: '#00e5ff',
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
  },

  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#3d45b033',
    marginVertical: 10,
  },

  modalText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },

  modalCloseBtn: {
    backgroundColor: '#00acc1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 6,
    width: '100%',
    alignItems: 'center',
  },

  modalCloseText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

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

  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#3d55cc',
    borderRadius: 2,
    marginBottom: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // dropdownContainer: { backgroundColor: '#fff', borderRadius: 8 },
  dropLabel: { color: '#00cfff', fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 5 },
  dropdown: {
    height: 40,
  backgroundColor: '#2b2f66',
    borderRadius: 12,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#39415a',
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
  // dropdownContainer: { backgroundColor: '#fff', borderRadius: 8 },
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
});