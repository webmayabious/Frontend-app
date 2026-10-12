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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import DateTimePicker from '@react-native-community/datetimepicker';

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
const STATUSBAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight : 44;
const SCREEN_HEIGHT = Dimensions.get('window').height;

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
const LIST_HEIGHT = 220;
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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropAnim = useRef(new Animated.Value(0)).current;
  const wrapRef = useRef(null);

  const options = data || [];
  const selected = options.find(o => o.value === value);

  const filtered = options.filter(o =>
    String(o.label ?? '')
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const maxHeight = dropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LIST_HEIGHT],
  });

  // Scroll the modal so this field moves up toward the top
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
      {label ? <Text style={styles.dropLabel}>{label}</Text> : null}

      {/* Trigger */}
      <TouchableOpacity
        style={[
          styles.dropdown,
          open && styles.dropdownOpen,
          error && styles.inputError,
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
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
            <Icon
              name="search"
              size={16}
              color="#000"
              style={{ marginRight: 6 }}
            />
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
                    style={[
                      styles.dropdownItem,
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

/* ================= FILTER MODAL ================= */
const FilterModal = ({
  visible,
  onClose,
  filters,
  onChange,
  onApply,
  onReset,
  Property,
  Rm,
  projectOptions,
  LeadStatus,
  showFromPicker,
  showToPicker,
  setShowFromPicker,
  setShowToPicker,
  onDateChange,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  // refs for inline dropdown auto-scroll
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
          ref={scrollRef1}
          onScroll={e => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          style={styles.filterScrollView}
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
          {/* extra space so the last dropdown can scroll fully into view */}
          <View style={{ height: 120 }} />
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

/* ================= CARD ================= */
const SiteCard = ({ data, navigation, setShowRemarks, setRemarksText }) => (
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
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState('');
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
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  /* ================= API ================= */
  const { data: Lead, isLoading } = useQuery({
    queryKey: ['totalBookingAndAgreementTillDate', appliedFilters],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get('/api/pm/totalBookingAndAgreementTillDate', {
        params: {
          page: pageParam,
          limit: 'all',
          company_id: filters.company_id || undefined,
          rm: filters.rm || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          project: filters.project || undefined,
          location: filters.location || undefined,
          booking_approval_status: filters.booking_approval_status || undefined,
          lead_status: filters.lead_status || undefined,
          lead_sub_status: filters.lead_sub_status || undefined,
          lead_qualification: filters.lead_qualification || undefined,
          call_status: filters.call_status || undefined,
          siteVisitFromDate: filters.siteVisitFromDate || undefined,
          siteVisitToDate: filters.siteVisitToDate || undefined,
          reference: filters.lead_source || undefined,
        },
      });
      return res?.data?.data?.Bookings;
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

  const onDateChange = (event, selectedDate, key) => {
    if (key === 'fromDate') {
      setShowFromPicker(false);
    } else {
      setShowToPicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) return;

    const date = selectedDate.toISOString().split('T')[0];

    setFilters(prev => ({
      ...prev,
      [key]: date,
    }));
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

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
            <Icon name="history" size={18} color="#cfd8dc" />
            <Text style={styles.screenTitle}>
              Total Bookings Agreements Till Date
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
          const y = event.nativeEvent.contentOffset.y;
          setShowTopBtn(y > 200);
        }}
        scrollEventThrottle={16}
      >
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

        {/* COUNT + FILTER (same line) */}
        <View style={styles.countFilterRow}>
          <Text style={styles.countText}>
            Showing {filteredfollowUps?.length || 0}
            {Lead?.length != null ? ` of ${Lead.length}` : ''} Records
          </Text>

          <TouchableOpacity onPress={() => setShowFilterModal(true)}>
            <Icon name="filter-alt" size={18} color="#00e5ff" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
            Loading...
          </Text>
        ) : filteredfollowUps?.length > 0 ? (
          filteredfollowUps?.map((visit, i) => (
            <SiteCard
              key={visit?.id != null ? `booking-${visit.id}` : `booking-idx-${i}`}
              data={visit}
              setShowRemarks={setShowRemarks}
              setRemarksText={setRemarksText}
              navigation={navigation}
            />
          ))
        ) : (
          <Text
            style={{ textAlign: 'center', marginTop: 20, color: '#ffffff' }}
          >
            No data found
          </Text>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* REMARKS MODAL */}
      {showRemarks && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
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

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onChange={onChange}
        onApply={applyFilter}
        onReset={resetFilters}
        Property={Property}
        Rm={Rm}
        projectOptions={projectOptions}
        LeadStatus={LeadStatus}
        showFromPicker={showFromPicker}
        showToPicker={showToPicker}
        onDateChange={onDateChange}
        setShowFromPicker={setShowFromPicker}
        setShowToPicker={setShowToPicker}
      />

      {showTopBtn && (
        <TouchableOpacity style={styles.topButton} onPress={scrollToTop}>
          <Icon name="keyboard-arrow-up" size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default TotalBookingsAgreementsTillDateScreen;

/* ================= STYLES ================= */
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

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backText: { color: '#fff', fontSize: 12 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    marginTop: 0,
    height: 40,
  },
  searchInput: {
    color: COLORS.white,
    marginLeft: 8,
    fontSize: 13,
    flex: 1,
    paddingVertical: 0,
  },

  countFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 15,
    marginTop: 8,
    marginBottom: 8,
  },

  countText: {
    color: '#a0b4e8',
    fontSize: 12,
    fontWeight: '600',
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
  emailText: {
    color: '#00acc1',
    textDecorationLine: 'underline',
    fontWeight: '500',
    fontSize: 12,
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

  phoneText: {
    color: '#00acc1',
    backgroundColor: 'rgba(0, 172, 193, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },

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
    paddingTop: 2,
  },
  value: {
    color: '#fff',
    flexShrink: 1,
  },

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

  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 80, // BottomNav height
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: 999,
  },
  modalCard: {
    width: '85%',
    backgroundColor: '#2f2f8f',
    borderRadius: 12,
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

  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#3d55cc',
    borderRadius: 2,
    marginBottom: 14,
  },

  /* ---- filter fields ---- */
  field: { marginBottom: 12, width: '100%' },

  filterLabel: {
    color: '#a0b4e8',
    fontSize: 12,
    marginBottom: 5,
    fontWeight: '500',
  },
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

  /* ---- inline dropdown ---- */
  dropLabel: {
    color: '#00cfff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  dropdown: {
    height: 40,
    backgroundColor: '#2b2f66',
    borderRadius: 12,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#39415a',
  },
  dropdownOpen: { borderColor: '#4aa3df' },
  inputError: { borderColor: '#FF6B6B' },
  errorText: { color: '#FF6B6B', fontSize: 11, marginTop: 4 },
  dropdownMenu: {
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownItemActive: { backgroundColor: 'rgba(74,163,223,0.15)' },
  dropdownItemText: { flex: 1, fontSize: 13, color: '#000', fontWeight: '500' },
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
    borderBottomColor: '#babdc5',
    backgroundColor: '#b1b5c0',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  ddSearchInput: { flex: 1, fontSize: 13, color: '#000', padding: 0 },
  ddNoResult: {
    textAlign: 'center',
    color: '#6b7690',
    fontSize: 12,
    paddingVertical: 16,
  },
});