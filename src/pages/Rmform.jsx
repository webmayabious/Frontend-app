import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Dimensions,
  Animated,
  Keyboard,
  DeviceEventEmitter,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon1 from 'react-native-vector-icons/Ionicons';
const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── COLORS (Leads List / ChangeRM theme) ────────────────────────────────────

const COLORS = {
  accent: '#00cfff',
  white: '#FFFFFF',
  mutedText: '#8A90B4',
  gold: '#f4c542',
  red: '#FF6B6B',
  borderColor: '#ffffff20',
  cardBg: '#ffffff0e',
  modalBg: '#21283a',
  fieldBg: '#2b3348',
  fieldBorder: '#39415a',
  sectionBg: 'rgba(255,255,255,0.13)',
};

// ─── ERROR TEXT ───────────────────────────────────────────────────────────────

const ErrorText = ({ msg }) =>
  msg ? (
    <View style={styles.errorRow}>
      <Icon name="error-outline" size={12} color="#ff6b6b" />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  ) : null;

// ─── DROPDOWN FIELD ───────────────────────────────────────────────────────────

// Used only for calculation (nothing is resized)
const LIST_HEIGHT = 220;
const FIELD_TOP_OFFSET = 120;

// Inline dropdown
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

  const close = (duration = 180) => {
    Keyboard.dismiss();
    Animated.timing(dropAnim, {
      toValue: 0,
      duration,
      useNativeDriver: false,
    }).start(() => {
      setOpen(false);
      setSearch('');
      DeviceEventEmitter.emit('toggleBottomNav', true); // show the nav again
    });
  };

  const toggle = () => {
    if (open) {
      close();
    } else {
      DeviceEventEmitter.emit('toggleBottomNav', false); // hide the nav as soon as it opens
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
    return () => DeviceEventEmitter.emit('toggleBottomNav', true); // restore on leaving the screen
  }, []);

  const handleSelect = item => {
    onChange && onChange(item.value);
    close(150);
  };

  return (
    <View ref={wrapRef} collapsable={false} style={styles.field}>
      <Text style={styles.label}>{label}</Text>

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
          color={COLORS.accent}
        />
      </TouchableOpacity>

      {/* Inline list */}
      {open && (
        <Animated.View
          style={[styles.dropdownMenu, { maxHeight, opacity: dropAnim }]}
        >
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
                    style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
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

// ─── DOB + GENDER ROW ─────────────────────────────────────────────────────────

const DobGenderRow = ({ form, onChange,errors }) => {
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

  // const handleDateChange = (event, selectedDate) => {
  //   setShow(false);
  //   if (selectedDate) {
  //     setDate(selectedDate);
  //     onChange('date_of_birth', selectedDate.toISOString().split('T')[0]);
  //   } else {
  //     setDate(null);
  //     onChange('date_of_birth', null);
  //   }
  // };
const handleDateChange = (event, selectedDate) => {
  setShow(false);
  if (event?.type === 'dismissed') return; // user cancelled, keep existing value
  if (selectedDate) {
    setDate(selectedDate);
    onChange('date_of_birth', selectedDate.toISOString().split('T')[0]);
  }
};
  const displayDate = date
    ? `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
    : 'dd-mm-yyyy';
console.log(errors)
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
<ErrorText msg={errors.date_of_birth} />
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
        <Text style={styles.label}>Gender</Text>
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

// ─── INPUT FIELD ──────────────────────────────────────────────────────────────

// const InputField = ({ label, placeholder, value, onChangeText, keyboardType }) => (
//   <View style={styles.inputWrapper}>
//     <Text style={styles.label}>{label}</Text>
//     <TextInput
//       placeholder={placeholder}
//       placeholderTextColor={COLORS.mutedText}
//       style={styles.input}
//       value={value}
//       onChangeText={onChangeText}
//       keyboardType={keyboardType || 'default'}
//     />
//   </View>
// );
const InputField = ({ label, placeholder, value, onChangeText, keyboardType, error }) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={COLORS.mutedText}
      style={[styles.input, error && styles.inputError]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType || 'default'}
    />
  </View>
);
// ─── SECTION ──────────────────────────────────────────────────────────────────

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

// ─── STATIC DATA ──────────────────────────────────────────────────────────────

const maritalData = [
  { label: 'SINGLE', value: 'single' },
  { label: 'MARRIED', value: 'married' },
  { label: 'UNMARRIED', value: 'unmarried' },
];
const LeadStatus = [
  { label: 'Active', value: '1' },
  { label: 'Inactive', value: '2' },
  { label: 'Booking Done', value: '5' },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Rmform() {
  const userRole = useSelector(state => state.userRole);
  const isAdmin = userRole?.includes('ADMIN');
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    active: '',
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
  });

  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const onChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    const fetchProjects = async () => {
      const res = await api.get('/api/pm/getAllPropertyProjects');
      setProjects(res?.data?.data || []);
    };
    fetchProjects();
  }, []);

  const projectOptions = projects?.map(item => ({ label: item.project_name, value: item.id }));

  const { data: AllReferences } = useQuery({
    queryKey: ['AllReferences'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllMrReferences');
      return res?.data?.data;
    },
  });
  const References = AllReferences?.map(item => ({ label: item.mrf_name, value: item.id }));

  const { data: AllProperty } = useQuery({
    queryKey: ['AllProperty'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLocation');
      return res.data.data;
    },
  });
  const Property = AllProperty?.map(item => ({ label: item.name, value: item.id }));

  const { data: allOwnCompany } = useQuery({
    queryKey: ['ownCompany'],
    queryFn: () => api.get('/api/pm/getOwnCompany'),
  });
  const Company = allOwnCompany?.data?.data?.map(item => ({ label: item.com_name, value: item.id }));

  // const validateForm = () => {
  //   let e = {};
  //   if (!form.reference) e.reference = 'Reference is required';
  //   if (!form.name?.trim()) e.name = 'Name is required';
  //   if (!form.phone?.trim()) e.phone = 'Phone number is required';
  //   else if (!/^[0-9]{10}$/.test(form.phone.trim())) e.phone = 'Enter a valid 10-digit phone number';
  //   if (!form.email?.trim()) e.email = 'Email is required';
  //   else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
  //   if (!form.project_id) e.project_id = 'Project is required';
  //   if (!form.location_of_property) e.location_of_property = 'Location of property is required';
  //     if (!form.date_of_birth) e.date_of_birth = 'date of birth  is required';
  //   return e;
  // };
const validateForm = () => {
  let e = {};

  if (!form.reference) e.reference = 'Reference is required';
  if (!form.name?.trim()) e.name = 'Name is required';

  // Residential address
  const address = form.address?.trim();
  if (!address) e.address = 'Residence address is required';
  else if (address.length < 5) e.address = 'Address must be at least 5 characters';
  else if (address.length > 200) e.address = 'Address must be under 200 characters';

  if (!form.phone?.trim()) e.phone = 'Phone number is required';
  else if (!/^[0-9]{10}$/.test(form.phone.trim())) e.phone = 'Enter a valid 10-digit phone number';

  if (!form.email?.trim()) e.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address';

  // Date of birth
  if (!form.date_of_birth) {
    e.date_of_birth = 'Date of birth is required';
  } else {
    const dob = new Date(form.date_of_birth);
    const today = new Date();
    if (isNaN(dob.getTime())) {
      e.date_of_birth = 'Enter a valid date of birth';
    } else if (dob > today) {
      e.date_of_birth = 'Date of birth cannot be in the future';
    } else {
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) e.date_of_birth = 'Lead must be at least 18 years old';
      else if (age > 100) e.date_of_birth = 'Enter a valid date of birth';
    }
  }

  if (!form.project_id) e.project_id = 'Project is required';
    if (!form.com_id) e.com_id = 'Company is required';
  if (!form.location_of_property) e.location_of_property = 'Location of property is required';

  return e;
};
  const onSave = async () => {
    const err = validateForm();
    setErrors(err);

    if (Object.keys(err).length > 0) {
      Alert.alert(
        '⚠️ Incomplete Form',
        'Please fill in all required fields correctly before submitting.',
        [{ text: 'OK', style: 'default' }],
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        date_of_birth:
          form.date_of_birth && !isNaN(new Date(form.date_of_birth))
            ? form.date_of_birth
            : null,
      };

      const res = await api.post('/api/pm/createPropertyLead', payload);

      if (res.data.status === true) {
        Alert.alert(
          '✅ Lead Created',
          'New lead has been added successfully!',
          [
            {
              text: 'OK',
              onPress: async () => {
                await queryClient.invalidateQueries({
                  predicate: query =>
                    [
                      'TotalLead',
                      'SiteVisitandBookingsData',
                      'TodaysFollowUpsandMeetings',
                      'AllPropertyLeads',
                      'Uploadleads',
                      'dashboardCards',
                      'AssignRm',
                    ].includes(query.queryKey[0]),
                });
                navigation.goBack();
              },
            },
          ],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          '❌ Submission Failed',
          res.data.message || 'Something went wrong. Please try again.',
          [{ text: 'OK', style: 'cancel' }],
        );
      }
    } catch (e) {
      console.log('create ERROR:', e.response?.data || e.message);
      const msg = e.response?.data?.message || 'Lead already exists for this phone and project.';
      Alert.alert('❌ Error', msg, [{ text: 'OK', style: 'cancel' }]);
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

        {/* ── Section Header ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRowHeader}>
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
                              style={styles.backIcon}
                            />
                          </TouchableOpacity>
            <Icon name="person-add" size={20} color='#ffffff' />
            <Text style={styles.headerTitle}>Add New Lead</Text>
          </View>

          {/* <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.goBack()}
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

        <ScrollView
          ref={scrollRef}
          onScroll={e => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Personal Details */}
          <Section title="Personal Details" icon="person">
            <DropdownField
              label="Reference *"
              data={References}
              placeholder="Select Reference"
              value={form.reference}
              onChange={value => onChange('reference', value)}
              scrollRef={scrollRef}
              scrollYRef={scrollYRef}
            />
            <ErrorText msg={errors.reference} />

            <InputField
              label="Name *"
              placeholder="Enter Full Name"
              value={form.name}
              onChangeText={v => onChange('name', v)}
            />
            <ErrorText msg={errors.name} />

            <InputField
              label="Residence Address"
              placeholder="City / Area"
              value={form.address}
              onChangeText={v => onChange('address', v)}
            />
<ErrorText msg={errors.address} />
            <InputField
              label="Mobile No. *"
              placeholder="Enter 10-digit mobile number"
              value={form.phone}
              onChangeText={v => onChange('phone', v)}
              keyboardType="phone-pad"
            />
            <ErrorText msg={errors.phone} />

            <InputField
              label="Email *"
              placeholder="Enter Email Address"
              value={form.email}
              onChangeText={v => onChange('email', v)}
              keyboardType="email-address"
            />
            <ErrorText msg={errors.email} />

            <DobGenderRow form={form} onChange={onChange} errors={errors}/>

            <DropdownField
              label="Marital Status"
              data={maritalData}
              placeholder="Select Marital Status"
              value={form.marital_status}
              onChange={value => onChange('marital_status', value)}
              scrollRef={scrollRef}
              scrollYRef={scrollYRef}
            />

            <InputField
              label="Office Location"
              placeholder="Office City / Area"
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
                data={Company}
                placeholder="Select Company"
                value={form.com_id}
                onChange={value => onChange('com_id', value)}
                scrollRef={scrollRef}
                scrollYRef={scrollYRef}
              />
            )}
   <ErrorText msg={errors.com_id} />
            <DropdownField
              label="Project *"
              data={projectOptions}
              placeholder="Select Project"
              value={form.project_id}
              onChange={value => onChange('project_id', value)}
              scrollRef={scrollRef}
              scrollYRef={scrollYRef}
            />
            <ErrorText msg={errors.project_id} />
          </Section>

          {/* Lead Profile */}
          <Section title="Lead Profile" icon="leaderboard">
            <DropdownField
              label="Lead Status"
              data={LeadStatus}
              placeholder="Select"
              value={form.active}
              onChange={value => onChange('active', value)}
              scrollRef={scrollRef}
              scrollYRef={scrollYRef}
            />
            <DropdownField
              label="Location of Property *"
              data={Property}
              placeholder="Select Location"
              value={form.location_of_property}
              onChange={value => onChange('location_of_property', value)}
              scrollRef={scrollRef}
              scrollYRef={scrollYRef}
            />
            <ErrorText msg={errors.location_of_property} />

            <InputField
              label="Budget"
              placeholder="Budget"
              value={form.budget}
              onChangeText={v => onChange('budget', v)}
            />

            <InputField
              label="BHK"
              placeholder="BHK"
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
              value={form.purpose_type}
              onChangeText={v => onChange('purpose_type', v)}
            />

            <InputField
              label="Planning to Buy"
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

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={onSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Icon name={saving ? 'hourglass-top' : 'check-circle'} size={16} color="#fff" />
            <Text style={styles.buttonText}>
              {saving ? 'Submitting...' : 'Submit Lead'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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

  // ── Section Header (same as Leads List) ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.sectionBg,
    borderRadius: 20,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionTitleRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerTitle: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
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
  closeBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
  backButton: { flexDirection: 'row', alignItems: 'center' },

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
  field: { marginBottom: 5 },
  label: {
    color: '#8a9daf',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
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
  inputError: { borderColor: COLORS.red },

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

  // ── Inline dropdown ──
  dropdown: {
    height: 44,
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
  },
  dropdownOpen: { borderColor: '#4aa3df' },
  dropdownMenu: {
    marginTop: 4,
    backgroundColor: COLORS.modalBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#323a52',
  },
  dropdownItemActive: { backgroundColor: 'rgba(74,163,223,0.15)' },
  dropdownItemText: { flex: 1, fontSize: 13, color: COLORS.mutedText, fontWeight: '500' },
  dropdownItemTextActive: { color: COLORS.accent, fontWeight: '600' },
  placeholder: { color: COLORS.mutedText, fontSize: 13 },
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
  ddSearchInput: { flex: 1, fontSize: 13, color: COLORS.white, padding: 0 },
  ddNoResult: { textAlign: 'center', color: '#6b7690', fontSize: 12, paddingVertical: 16 },

  // ── DOB / gender ──
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  genderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  radioContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
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

  // ── Errors ──
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -4,
    marginBottom: 8,
  },
  errorText: { color: '#ff6b6b', fontSize: 11, fontWeight: '500' },

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
});