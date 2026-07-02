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
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
const LeadStatus = [
  { label: 'Active', value: '1' },
  { label: 'Inactive', value: '2' },
  { label: 'Booking Done', value: '5' },
];
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
        data={data}
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
      {/* <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={styles.label}>Date of Birth *</Text>
        <TouchableOpacity style={styles.inputWithIcon} onPress={() => setShow(true)}>
          <Text style={{ color: '#fff' }}>{displayDate}</Text>
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
      </View> */}
<View style={{ flex: 1, marginRight: 10 }}>
  <Text style={styles.label}>Date of Birth</Text>

 <TouchableOpacity
  style={styles.inputWithIcon}
  onPress={() => setShow(true)}
>
  <Text style={{ color: date ? '#fff' : '#aaa' }}>
    {displayDate}
  </Text>

  {date ? (
    <TouchableOpacity
      onPress={(e) => {
        e.stopPropagation(); // Prevent opening the date picker
        setDate(null);
        onChange('date_of_birth', null);
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Icon name="close" size={20} color="#ff5252" />
    </TouchableOpacity>
  ) : (
    <Icon name="calendar-today" size={18} color="#00e5ff" />
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
      placeholderTextColor="#aaa"
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
    />
  </View>
);

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
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
      style={{ flex: 1, backgroundColor: '#1e2140' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2B2E81" />

        {/* Top Bar */}
        <View style={styles.topBarContainer}>
          <View style={styles.topBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="event-note" size={18} color="#cfd8dc" />
              <Text style={styles.screenTitle}>Follow-ups / Meetings Edit</Text>
            </View>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Image
                source={require('../asset/image/icon/Arrow.png')}
                style={{ width: 11, height: 11, marginRight: 4 }}
              />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Personal Details */}
          <Section title="Personal Details">
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
          <Section title="Lead Profile">
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
            style={styles.button}
            onPress={onSave}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Updating...' : 'Update'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBarContainer: { paddingHorizontal: 12, marginTop: 10 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3b3f6b',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  screenTitle: { color: '#cfd8dc', fontSize: 13, marginLeft: 6, fontWeight: '500' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 10,
  },
  backText: { color: '#fff', fontSize: 12 },

  section: {
    backgroundColor: '#3b3f6b',
    margin: 12,
    padding: 12,
    borderRadius: 12,
    marginTop: 0,
  },
  sectionTitle: { color: '#ffb84d', fontWeight: '600', marginBottom: 10 },

  inputWrapper: { marginBottom: 10 },
  label: { color: '#ccc', fontSize: 12, marginBottom: 3 },

  input: {
    backgroundColor: '#5a5e85',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    color: '#fff',
  },

  inputWithIcon: {
    backgroundColor: '#5a5e85',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dropdown: {
    backgroundColor: '#5a5e85',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dropdownContainer: { backgroundColor: '#FFFF', borderRadius: 10, elevation: 8 },
  placeholderStyle: { color: '#bbb', fontSize: 13 },
  selectedTextStyle: { color: '#fff', fontSize: 14, fontWeight: '500' },
  itemContainer: { paddingVertical: 0 },

  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  genderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  radioContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
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

  button: {
    backgroundColor: '#2bb3c0',
    margin: 15,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },

  error: { color: '#ff6b6b', fontSize: 11, marginBottom: 6 },
});