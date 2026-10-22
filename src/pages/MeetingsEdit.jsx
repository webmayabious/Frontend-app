import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
  KeyboardAvoidingView,
  Dimensions,
  Animated,
  Easing,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

const SCREEN_WIDTH = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (screenHeight / 812) * size;

// ─── COLORS (Leads List / ChangeRM theme) ────────────────────────────────────

const COLORS = {
  accent: '#00cfff',
  white: '#FFFFFF',
  mutedText: '#8A90B4',
  gold: '#f4c542',
  red: '#FF6B6B',
  cardBg: '#ffffff0e',
  modalBg: '#21283a',
  fieldBg: '#2b3348',
  fieldBorder: '#39415a',
  sectionBg: 'rgba(255,255,255,0.13)',
};

const LeadStatus = [
  { label: 'Active', value: '1' },
  { label: 'Inactive', value: '2' },
  { label: 'Booking Done', value: '5' },
];

/* ================= INLINE DROPDOWN ================= */
const ITEM_H = 42;
const SEARCH_H = 44;
const MAX_LIST_H = 220;
const FIELD_TOP_OFFSET = Platform.OS === 'ios' ? 280 : 200;

// gives every DropdownField access to the page ScrollView
const ScrollCtx = createContext({ scrollRef: null, scrollYRef: null });

const DropdownField = ({ label, data, value, onChange, error, placeholder }) => {
  const { scrollRef, scrollYRef } = useContext(ScrollCtx);

  const [open, setOpen] = useState(false); // what the user wants
  const [mounted, setMounted] = useState(false); // keeps list alive while closing
  const [search, setSearch] = useState('');
  const heightAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const wrapRef = useRef(null);
  const justOpened = useRef(false);

  const options = data || [];

  // String() compare so "1" and 1 both match
  const isSame = (a, b) =>
    a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);

  const selected = options.find(o => isSame(o.value, value));

  const filtered = options.filter(o =>
    String(o.label ?? '').toLowerCase().includes(search.toLowerCase()),
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
      }
    });
  }, [open, targetH]);

  const toggle = () => {
    if (open) {
      Keyboard.dismiss();
      setOpen(false);
    } else {
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
    <View ref={wrapRef} collapsable={false} style={styles.inputWrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {/* Trigger */}
      <TouchableOpacity
        style={[styles.dropdown, open && styles.dropdownOpen, error && styles.inputError]}
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
            <Icon name="search" size={16} color="#aaa" style={{ marginRight: 6 }} />
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
                const isActive = isSame(item.value, value);
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

const DobGenderRow = ({ form, onChange }) => {
  const [date, setDate] = React.useState(null);
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (form.date_of_birth) {
      const d = new Date(form.date_of_birth);
      setDate(isNaN(d.getTime()) ? null : d);
    } else {
      setDate(null);
    }
  }, [form.date_of_birth]);

  const handleDateChange = (event, selectedDate) => {
    setShow(false);
    if (selectedDate) {
      setDate(selectedDate);
      onChange('date_of_birth', selectedDate.toISOString().split('T')[0]);
    } else {
      setDate(null);
      onChange('date_of_birth', null);
    }
  };

  const displayDate = date
    ? `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
    : 'dd-mm-yyyy';

  return (
    <View style={styles.row}>
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={styles.label}>Date of Birth</Text>

        <TouchableOpacity
          style={styles.inputWithIcon}
          onPress={() => setShow(true)}
        >
          <Text style={{ color: date ? '#e6ebf2' : COLORS.mutedText, fontSize: 13 }}>
            {displayDate}
          </Text>

          {date ? (
            <TouchableOpacity
              onPress={e => {
                e.stopPropagation(); // Prevent opening the date picker
                setDate(null);
                onChange('date_of_birth', null);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={20} color="#ff5252" />
            </TouchableOpacity>
          ) : (
            <Icon name="calendar-today" size={18} color={COLORS.accent} />
          )}
        </TouchableOpacity>

        {show && (
          <DateTimePicker
            value={date || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Gender *</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity style={styles.radioContainer} onPress={() => onChange('gender', '1')}>
            <View style={[styles.radio, String(form.gender) === '1' && styles.radioActive]} />
            <Text style={styles.radioText}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.radioContainer} onPress={() => onChange('gender', '2')}>
            <View style={[styles.radio, String(form.gender) === '2' && styles.radioActive]} />
            <Text style={styles.radioText}>Female</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const InputField = ({ label, placeholder, value, onChangeText }) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={COLORS.mutedText}
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
    />
  </View>
);

const Section = ({ title, icon, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionTitleRow}>
      <Icon name={icon || 'info'} size={14} color={COLORS.accent} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionDivider} />
    {children}
  </View>
);

const maritalData = [
  { label: 'SINGLE', value: 'single' },
  { label: 'MARRIED', value: 'married' },
  { label: 'UNMARRIED', value: 'unmarried' },
];

export default function MeetingsEdit({ route }) {
  const { id } = route.params;
  const userRole = useSelector(state => state.userRole);
  const isAdmin = userRole?.includes('ADMIN');
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    active: 'active',
    office_location: '',
    industry: '',
    occupation: '',
    com_id: '',
    location_of_property: '',
    budget: '',
    flat_type: '',
    loan_requirement: '',
    preferred_bank: '',
    reference: '',
    purpose_type: '',
    project_id: '',
    purpose_of_purchase: '',
    planning_to_buy_date: '',
    interested_in_site_visit: '',
    active: ''
  });

  const navigation = useNavigation();
  const queryClient = useQueryClient();
const scrollRef = useRef(null);
const scrollYRef = useRef(0);
  const onChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    const fetchProjects = async () => {
      const res = await api.get('/api/pm/getAllPropertyProjects');
      setProjects(res?.data?.data || []);
    };
    fetchProjects();
  }, []);

  const projectOptions = projects?.map(item => ({
    label: item.project_name,
    value: item.id,
  }));

  useEffect(() => {
    const load = async () => {
      const res = await api.get(`/api/pm/getAllPropertyLeadsById/${id}`);
      const root = res?.data?.data;
      setForm({
        name: root?.name || '',
        address: root?.address || '',
        phone: root?.phone || '',
        email: root?.email || '',
        date_of_birth: root?.date_of_birth || '',
        gender: root?.gender?.toString() || '',
        marital_status: root?.marital_status || '',
        office_location: root?.office_location || '',
        active: root?.active || '',
        industry: root?.industry || '',
        occupation: root?.occupation || '',
        com_id: root?.com_id || '',
        location_of_property: root?.location_of_property || '',
        budget: root?.budget || '',
        flat_type: root?.flat_type || '',
        loan_requirement: root?.loan_requirement || '',
        preferred_bank: root?.preferred_bank || '',
        reference: root?.reference || '',
        purpose_type: root?.purpose_type || '',
        project_id: root?.project_id || '',
        purpose_of_purchase: root?.purpose_of_purchase || '',
        planning_to_buy_date: root?.planning_to_buy_date || '',
        interested_in_site_visit: root?.interested_in_site_visit || '',
      });
    };
    if (id) load();
  }, [id]);

  const { data: AllReferences } = useQuery({
    queryKey: ['AllReferences'],
    queryFn: async () => (await api.get('/api/pm/getAllMrReferences')).data?.data,
  });
  const References = AllReferences?.map(item => ({ label: item.mrf_name, value: item.id }));

  const { data: AllProperty } = useQuery({
    queryKey: ['AllProperty'],
    queryFn: async () => (await api.get('/api/pm/getAllPropertyLocation')).data.data,
  });
  const Property = AllProperty?.map(item => ({ label: item.name, value: item.id }));

  const { data: allOwnCompany } = useQuery({
    queryKey: ['ownCompany'],
    queryFn: () => api.get('/api/pm/getOwnCompany'),
  });
  const Company = allOwnCompany?.data?.data?.map(item => ({ label: item.com_name, value: item.id }));

  const validateForm = () => {
    let e = {};
    if (!form.name) e.name = 'Name required';
    if (!form.phone) e.phone = 'Phone required';
    if (!form.email) e.email = 'Email required';
    if (!form.project_id) e.project_id = 'Project required';
    return e;
  };

  const onSave = async () => {
    const err = validateForm();
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        date_of_birth:
          form.date_of_birth && !isNaN(new Date(form.date_of_birth))
            ? form.date_of_birth
            : null,
      };

      const res = await api.put(`/api/pm/updatePropertyLead/${id}`, payload);

      if (res.data.status === true) {
        await queryClient.invalidateQueries({
          predicate: query =>
            [
              'TotalLead',
              'SiteVisitandBookingsData',
              'TodaysFollowUpsandMeetings',
              'AllPropertyLeads',
              'leads_infinite',
              'Uploadleads',
              'Leads Assigned',
              'AssignRm',
              
            ].includes(query.queryKey[0]),
        });
        navigation.goBack();
      } else {
        console.log('API error:', res.data.message);
      }
    } catch (e) {
      console.log('UPDATE ERROR:', e.response?.data || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#1a2d3e' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
    >
      <View style={styles.container}>
        {/* Same background as Leads List / ChangeRM / Meeting / Dashboard screens */}
        <Image
          source={require('../asset/image/bg-img.png')}
          style={styles.bgImageFixed}
          resizeMode="cover"
        />
        <View style={styles.overlay} />

        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* TOP BAR: [back + icon + title] (same as ChangeRM) */}
        <View style={[styles.topBarContainer, { paddingTop: verticalScale(10) }]}>
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
              <Icon name="event-note" size={20} color="#ffffff" />
              <Text style={styles.screenTitle} numberOfLines={1}>
                Follow-ups / Meetings Edit
              </Text>
            </View>
          </View>
        </View>

   <ScrollCtx.Provider value={{ scrollRef, scrollYRef }}>
  <ScrollView
    ref={scrollRef}
    onScroll={e => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
    scrollEventThrottle={16}
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={{ paddingBottom: 120 }}
  >
          {/* Personal Details */}
          <Section title="Personal Details" icon="person">
            <DropdownField
              label="Reference *"
              data={References || []}
              placeholder="Select"
              value={form.reference}
              onChange={value => onChange('reference', value)}
            />
            <InputField
              label="Name *"
              placeholder="Your Name"
              value={form.name}
              onChangeText={v => onChange('name', v)}
            />
            {errors.name && <Text style={styles.error}>{errors.name}</Text>}

            <InputField
              label="Residence Address"
              placeholder="City"
              value={form.address}
              onChangeText={v => onChange('address', v)}
            />

            <InputField
              label="Mobile No. *"
              placeholder="Enter Mobile"
              value={form.phone}
              onChangeText={v => onChange('phone', v)}
            />
            {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}

            <InputField
              label="Email id *"
              placeholder="Enter Email"
              value={form.email}
              onChangeText={v => onChange('email', v)}
            />
            {errors.email && <Text style={styles.error}>{errors.email}</Text>}

            <DobGenderRow form={form} onChange={onChange} />

            <DropdownField
              label="Marital Status"
              data={maritalData}
              placeholder="Select"
              value={form.marital_status}
              onChange={value => onChange('marital_status', value)}
            />
            <InputField
              label="Office Location"
              placeholder="Location"
              value={form.office_location}
              onChangeText={v => onChange('office_location', v)}
            />
            <InputField
              label="Industry"
              placeholder="Industry"
              value={form.industry}
              onChangeText={v => onChange('industry', v)}
            />
            <InputField
              label="Occupation"
              placeholder="Occupation"
              value={form.occupation}
              onChangeText={v => onChange('occupation', v)}
            />
            {isAdmin && (
              <DropdownField
                label="Company *"
                data={Company || []}
                placeholder="Select"
                value={form.com_id}
                onChange={value => onChange('com_id', value)}
              />
            )}
            <DropdownField
              label="Project *"
              data={projectOptions || []}
              placeholder="Select"
              value={form.project_id}
              onChange={value => onChange('project_id', value)}
            />
            {errors.project_id && <Text style={styles.error}>{errors.project_id}</Text>}
          </Section>

          {/* Lead Profile */}
          <Section title="Lead Profile" icon="leaderboard">
            <DropdownField
              label="Lead Status"
              data={LeadStatus}
              placeholder="Select"
              value={form.active}
              onChange={value => onChange('active', value)}
            />
            <DropdownField
              label="Location of Property *"
              data={Property || []}
              placeholder="Select"
              value={form.location_of_property}
              onChange={value => onChange('location_of_property', value)}
            />
            <InputField
              label="Budget"
              placeholder="Enter Budget"
              value={form.budget}
              onChangeText={v => onChange('budget', v)}
            />
            <InputField
              label="BHK"
              placeholder="2BHK / 3BHK"
              value={form.flat_type}
              onChangeText={v => onChange('flat_type', v)}
            />
            <InputField
              label="Loan Requirement"
              placeholder="Yes / No"
              value={form.loan_requirement}
              onChangeText={v => onChange('loan_requirement', v)}
            />
            <InputField
              label="Preferred Bank"
              placeholder="Bank Name"
              value={form.preferred_bank}
              onChangeText={v => onChange('preferred_bank', v)}
            />
            <InputField
              label="Purpose of Purchase"
              placeholder="Purpose"
              value={form.purpose_type}
              onChangeText={v => onChange('purpose_type', v)}
            />
            <InputField
              label="Planning To Buy"
              placeholder="Time"
              value={form.planning_to_buy_date}
              onChangeText={v => onChange('planning_to_buy_date', v)}
            />
            <InputField
              label="Interested in Site Visit"
              placeholder="Yes / No"
              value={form.interested_in_site_visit}
              onChangeText={v => onChange('interested_in_site_visit', v)}
            />
          </Section>

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={onSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Icon name={saving ? 'hourglass-top' : 'check-circle'} size={16} color="#fff" />
            <Text style={styles.buttonText}>
              {saving ? 'Updating...' : 'Update'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </ScrollCtx.Provider>
      </View>
      
    </KeyboardAvoidingView>
  );
}

// ─── STYLES (Leads List / ChangeRM theme) ────────────────────────────────────

const styles = StyleSheet.create({
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

  // ── Section card ──
  section: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: 0,
    padding: 14,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: { color: COLORS.gold, fontWeight: '700', fontSize: 13 },
  sectionDivider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 12,
  },

  // ── Fields ──
  inputWrapper: { marginBottom: 10 },
  label: {
    color: '#8a9daf',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  input: {
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    color: '#e6ebf2',
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
  },

  inputWithIcon: {
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
  },

  // ── Dropdown (react-native-element-dropdown) ──
  // ── Inline Dropdown ──
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.fieldBg,
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  dropdownOpen: { borderColor: '#4aa3df', backgroundColor: '#28304a' },
  inputError: { borderColor: '#e05a2b' },
  errorText: { color: '#e05a2b', fontSize: 11, marginTop: 4 },
  dropdownMenu: {
    marginTop: 4,
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
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
  dropdownItemText: { flex: 1, fontSize: 13, color: '#c3cbdb', fontWeight: '500' },
  dropdownItemTextActive: { color: '#7cc4f2', fontWeight: '700' },
  placeholder: { color: '#8a9daf', fontSize: 13 },
  selectedText: { color: '#e6ebf2', fontSize: 13, fontWeight: '600' },
  ddTriggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  ddSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.fieldBorder,
    backgroundColor: '#28304a',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  ddSearchInput: { flex: 1, fontSize: 13, color: '#e6ebf2', padding: 0 },
  ddNoResult: { textAlign: 'center', color: '#6b7690', fontSize: 12, paddingVertical: 16 },
  placeholderStyle: { color: COLORS.mutedText, fontSize: 13 },
  selectedTextStyle: { color: '#e6ebf2', fontSize: 13, fontWeight: '600' },
  itemTextStyle: { color: '#c3cbdb', fontSize: 13, fontWeight: '500' },
  itemContainer: {
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#323a52',
  },

  // ── DOB / gender ──
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  genderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  radioContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.accent,
    marginRight: 6,
  },
  radioActive: { backgroundColor: COLORS.accent },
  radioText: { color: '#e6ebf2', fontSize: 13 },

  // ── Submit ──
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e9ce8',
    marginHorizontal: 12,
    marginTop: 4,
    paddingVertical: 13,
    borderRadius: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  error: { color: '#ff6b6b', fontSize: 11, marginBottom: 6, marginTop: -4 },
});