import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import Header from '../Layout/Header';
import BottomNav from '../navigations/BottomNav';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

// ─── ERROR TEXT ───────────────────────────────────────────────────────────────

const ErrorText = ({ msg }) =>
  msg ? (
    <View style={styles.errorRow}>
      <Icon name="error-outline" size={12} color="#ff6b6b" />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  ) : null;

// ─── DROPDOWN FIELD ───────────────────────────────────────────────────────────

const DropdownField = ({ label, data, placeholder, value, onChange }) => {
  const [isFocus, setIsFocus] = React.useState(false);
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.label}>{label}</Text>
      <Dropdown
        style={[
          styles.dropdown,
          isFocus && { borderColor: '#00e5ff', borderWidth: 1.5 },
        ]}
        containerStyle={styles.dropdownContainer}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        itemTextStyle={{ color: '#0b0b0b', fontWeight: '500' }}
        activeColor="#e6f7ff"
        data={data || []}
        labelField="label"
        valueField="value"
        placeholder={placeholder}
        value={value}
        itemContainerStyle={styles.itemContainer}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={item => {
          setIsFocus(false);
          onChange && onChange(item.value);
        }}
        renderRightIcon={() => (
          <Icon
            name={isFocus ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color="#00e5ff"
          />
        )}
      />
    </View>
  );
};

// ─── DOB + GENDER ROW ─────────────────────────────────────────────────────────

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
      {/* DOB */}
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={styles.label}>Date of Birth</Text>
        <TouchableOpacity style={styles.inputWithIcon} onPress={() => setShow(true)}>
          <Text style={{ color: date ? '#fff' : '#aaa' }}>{displayDate}</Text>
          <Icon name="calendar-today" size={18} color="#00e5ff" />
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

      {/* Gender */}
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

const InputField = ({ label, placeholder, value, onChangeText, keyboardType }) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#aaa"
      style={styles.input}
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
      <Icon name={icon || 'info'} size={14} color="#ffb84d" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionDivider} />
    {children}
  </View>
);

// ─── STATIC DATA ──────────────────────────────────────────────────────────────

const maritalData = [
  { label: 'Single', value: 'single' },
  { label: 'Married', value: 'married' },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Rmform() {
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
    active: '1',
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

  // ── Fetch Projects ──
  useEffect(() => {
    const fetchProjects = async () => {
      const res = await api.get('/api/pm/getAllPropertyProjects');
      setProjects(res?.data?.data || []);
    };
    fetchProjects();
  }, []);

  const projectOptions = projects?.map(item => ({ label: item.project_name, value: item.id }));

  // ── Queries ──
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

  // ── Validation ──
  const validateForm = () => {
    let e = {};
    if (!form.reference) e.reference = 'Reference is required';
    if (!form.name?.trim()) e.name = 'Name is required';
    if (!form.phone?.trim()) e.phone = 'Phone number is required';
    else if (!/^[0-9]{10}$/.test(form.phone.trim())) e.phone = 'Enter a valid 10-digit phone number';
    if (!form.email?.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (!form.project_id) e.project_id = 'Project is required';
    if (!form.location_of_property) e.location_of_property = 'Location of property is required';
    return e;
  };

  // ── Save ──
  const onSave = async () => {
    const err = validateForm();
    setErrors(err);

    if (Object.keys(err).length > 0) {
      Alert.alert(
        '⚠️ Incomplete Form',
        'Please fill in all required fields correctly before submitting.',
        [{ text: 'OK', style: 'default' }]
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
          { cancelable: false }
        );
      } else {
        Alert.alert(
          '❌ Submission Failed',
          res.data.message || 'Something went wrong. Please try again.',
          [{ text: 'OK', style: 'cancel' }]
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

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#1e2140' }}>
      <Header />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2B2E81" />

        {/* ── Top Bar ── */}
        <View style={styles.topBarContainer}>
          <View style={styles.topBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="person-add" size={16} color="#00e5ff" />
              <Text style={styles.screenTitle}>Add New Lead</Text>
            </View>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Icon name="arrow-back-ios" size={11} color="#fff" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Personal Details ── */}
          <Section title="Personal Details" icon="person">

            <DropdownField
              label="Reference *"
              data={References}
              placeholder="Select reference"
              value={form.reference}
              onChange={value => onChange('reference', value)}
            />
            <ErrorText msg={errors.reference} />

            <InputField
              label="Name *"
              placeholder="Enter full name"
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
              placeholder="Enter email address"
              value={form.email}
              onChangeText={v => onChange('email', v)}
              keyboardType="email-address"
            />
            <ErrorText msg={errors.email} />

            <DobGenderRow form={form} onChange={onChange} />

            <DropdownField
              label="Marital Status"
              data={maritalData}
              placeholder="Select marital status"
              value={form.marital_status}
              onChange={value => onChange('marital_status', value)}
            />

            <InputField
              label="Office Location"
              placeholder="Office city / area"
              value={form.office_location}
              onChangeText={v => onChange('office_location', v)}
            />

            <InputField
              label="Industry"
              placeholder="e.g. IT, Healthcare"
              value={form.industry}
              onChangeText={v => onChange('industry', v)}
            />

            <InputField
              label="Occupation"
              placeholder="e.g. Engineer, Doctor"
              value={form.occupation}
              onChangeText={v => onChange('occupation', v)}
            />

            {isAdmin && (
              <DropdownField
                label="Company *"
                data={Company}
                placeholder="Select company"
                value={form.com_id}
                onChange={value => onChange('com_id', value)}
              />
            )}

            <DropdownField
              label="Project *"
              data={projectOptions}
              placeholder="Select project"
              value={form.project_id}
              onChange={value => onChange('project_id', value)}
            />
            <ErrorText msg={errors.project_id} />

          </Section>

          {/* ── Lead Profile ── */}
          <Section title="Lead Profile" icon="leaderboard">

            <DropdownField
              label="Location of Property *"
              data={Property}
              placeholder="Select location"
              value={form.location_of_property}
              onChange={value => onChange('location_of_property', value)}
            />
            <ErrorText msg={errors.location_of_property} />

            <InputField
              label="Budget"
              placeholder="e.g. 50 Lakhs"
              value={form.budget}
              onChangeText={v => onChange('budget', v)}
            />

            <InputField
              label="BHK"
              placeholder="e.g. 2BHK / 3BHK"
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
              placeholder="Bank name"
              value={form.preferred_bank}
              onChangeText={v => onChange('preferred_bank', v)}
            />

            <InputField
              label="Purpose of Purchase"
              placeholder="e.g. Investment / Self Use"
              value={form.purpose_type}
              onChangeText={v => onChange('purpose_type', v)}
            />

            <InputField
              label="Planning to Buy"
              placeholder="e.g. Within 3 months"
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

          {/* ── Submit Button ── */}
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

        <BottomNav />
      </View>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBarContainer: { paddingHorizontal: 12, marginTop: 10 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3b3f6b',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 10,
  },
  screenTitle: { color: '#cfd8dc', fontSize: 13, marginLeft: 7, fontWeight: '600' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  backText: { color: '#fff', fontSize: 12 },

  section: {
    backgroundColor: '#3b3f6b',
    margin: 12,
    padding: 14,
    borderRadius: 14,
    marginTop: 0,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: { color: '#ffb84d', fontWeight: '700', fontSize: 13 },
  sectionDivider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 12,
  },

  inputWrapper: { marginBottom: 10 },
  label: { color: '#ccc', fontSize: 11, marginBottom: 4, fontWeight: '500' },

  input: {
    backgroundColor: '#5a5e85',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: '#fff',
    fontSize: 13,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  inputWithIcon: {
    backgroundColor: '#5a5e85',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  dropdown: {
    backgroundColor: '#5a5e85',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dropdownContainer: { backgroundColor: '#fff', borderRadius: 10, elevation: 8 },
  placeholderStyle: { color: '#aaa', fontSize: 13 },
  selectedTextStyle: { color: '#fff', fontSize: 13, fontWeight: '500' },
  itemContainer: { paddingVertical: 0 },

  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  genderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  radioContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#00e5ff',
    marginRight: 6,
  },
  radioActive: { backgroundColor: '#00e5ff' },
  radioText: { color: '#fff', fontSize: 13 },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 6,
  },
  errorText: { color: '#ff6b6b', fontSize: 11, fontWeight: '500' },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2bb3c0',
    margin: 15,
    marginTop: 4,
    paddingVertical: 13,
    borderRadius: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});