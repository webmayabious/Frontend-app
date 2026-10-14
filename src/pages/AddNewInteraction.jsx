import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import api from '../api/AxiosInstance';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (SCREEN_HEIGHT / 812) * size;

// ─── COLORS (Meeting Edit theme) ─────────────────────────────────────────────

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

// ─── DROPDOWN ────────────────────────────────────────────────────────────────

const DropdownField = ({
  label,
  data,
  placeholder,
  value,
  onChange,
  error,
}) => {
  const [isFocus, setIsFocus] = React.useState(false);
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.label}>{label}</Text>
      <Dropdown
        style={[
          styles.dropdown,
          isFocus && { borderColor: '#4aa3df' },
          error && { borderColor: COLORS.red },
        ]}
        containerStyle={styles.dropdownContainer}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        itemTextStyle={styles.itemTextStyle}
        inputSearchStyle={styles.inputSearchStyle}
        activeColor="rgba(74,163,223,0.15)"
        data={data || []}
        labelField="label"
        valueField="value"
        placeholder={placeholder || 'Select'}
        searchPlaceholder="Search..."
        search={(data || []).length > 6}
        maxHeight={240}
        dropdownPosition="auto"
        statusBarIsTranslucent
        showsVerticalScrollIndicator={false}
        value={value}
        itemContainerStyle={styles.itemContainer}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={item => {
          setIsFocus(false);
          onChange && onChange(item.value);
        }}
        renderItem={(item, selected) => (
          <View style={[styles.itemRow, selected && styles.itemRowActive]}>
            <Text
              style={[styles.itemTextStyle, selected && styles.itemTextActive]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            {selected && <Icon name="check" size={16} color="#4aa3df" />}
          </View>
        )}
        renderRightIcon={() => (
          <Icon
            name={isFocus ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color={COLORS.accent}
          />
        )}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

// ─── DATE / TIME FIELD ───────────────────────────────────────────────────────

const PickerField = ({ label, placeholder, icon, value, onPress, onClear }) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity
      style={styles.inputWithIcon}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={{
          color: value ? '#e6ebf2' : COLORS.mutedText,
          fontSize: 13,
        }}
      >
        {value || placeholder}
      </Text>

      {value ? (
        <TouchableOpacity
          onPress={e => {
            e.stopPropagation(); // do not open the picker
            onClear && onClear();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="close" size={20} color="#ff5252" />
        </TouchableOpacity>
      ) : (
        <Icon name={icon} size={18} color={COLORS.accent} />
      )}
    </TouchableOpacity>
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

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function AddNewInteraction({ route }) {
  const { id } = route.params;
  const navigation = useNavigation();

  const scrollRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const emptyInteraction = {
    call_status_id: '',
    lead_qualification_id: '',
    lead_status_id: '',
    lead_sub_status_id: '',
    rating_id: '',
    site_visit_date: '',
    call_back_date: '',
    call_back_time: '',
    expected_closure_date: '',
    remarks: '',
    project_id: '',
  };

  const [interaction, setInteraction] = useState(emptyInteraction);

  const [siteVisitDate, setSiteVisitDate] = useState(new Date());
  const [callBackDate, setCallBackDate] = useState(new Date());
  const [expectedClosureDate, setExpectedClosureDate] = useState(new Date());
  const [callBackTime, setCallBackTime] = useState(new Date());
  const [projects, setProjects] = useState([]);
  const [showSiteVisitPicker, setShowSiteVisitPicker] = useState(false);
  const [showCallBackPicker, setShowCallBackPicker] = useState(false);
  const [showExpectedClosurePicker, setShowExpectedClosurePicker] =
    useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formatDate = d => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const onChangeDate = (event, selectedDate, field) => {
    // close the picker first (also when the user cancels)
    if (field === 'site_visit_date') setShowSiteVisitPicker(false);
    if (field === 'call_back_date') setShowCallBackPicker(false);
    if (field === 'expected_closure_date') setShowExpectedClosurePicker(false);

    if (!selectedDate) return;
    const formatted = formatDate(selectedDate);

    switch (field) {
      case 'site_visit_date':
        setSiteVisitDate(selectedDate);
        break;
      case 'call_back_date':
        setCallBackDate(selectedDate);
        break;
      case 'expected_closure_date':
        setExpectedClosureDate(selectedDate);
        break;
    }
    setInteraction(prev => ({ ...prev, [field]: formatted }));
  };

  const onChangeTime = (event, selectedTime) => {
    setShowTimePicker(false);
    if (!selectedTime) return;
    const hours = String(selectedTime.getHours()).padStart(2, '0');
    const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
    setCallBackTime(selectedTime);
    setInteraction(prev => ({
      ...prev,
      call_back_time: `${hours}:${minutes}`,
    }));
  };

  // Keep Remarks visible when the keyboard opens
  const handleRemarksFocus = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 300); // wait for the keyboard animation
  };

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

  const { data: AllCallStatus } = useQuery({
    queryKey: ['AllCallStatus'],
    queryFn: async () =>
      (await api.get('/api/pm/getAllPropertyCallStatus')).data.data,
  });
  const { data: AllLeadQualification } = useQuery({
    queryKey: ['AllLeadQualification'],
    queryFn: async () =>
      (await api.get('/api/pm/getAllPropertyLeadQualification')).data.data,
  });
  const { data: AllLeadStatus } = useQuery({
    queryKey: ['AllLeadStatus'],
    queryFn: async () =>
      (await api.get('/api/pm/getAllPropertyLeadStatus')).data.data,
  });
  const { data: AllLeadSubStatus } = useQuery({
    queryKey: ['AllLeadSubStatus'],
    queryFn: async () =>
      (await api.get('/api/pm/getAllPropertyLeadSubStatus')).data.data,
  });
  const { data: AllRating } = useQuery({
    queryKey: ['AllRating'],
    queryFn: async () =>
      (await api.get('/api/pm/getAllPropertyRating')).data.data,
  });

  const toOptions = arr =>
    arr?.map(item => ({ label: item.name, value: item.id }));

  const validate = () => {
    const newErrors = {};
    if (!interaction.call_status_id)
      newErrors.call_status_id = 'Call Status is required';
    if (!interaction.lead_qualification_id)
      newErrors.lead_qualification_id = 'Lead Qualification is required';
    if (!interaction.lead_status_id)
      newErrors.lead_status_id = 'Lead Status is required';
    if (!interaction.lead_sub_status_id)
      newErrors.lead_sub_status_id = 'Lead Sub Status is required';
    if (!interaction.rating_id) newErrors.rating_id = 'Rating is required';
    if (!interaction.project_id) newErrors.project_id = 'Project is required';
    if (!interaction.remarks || interaction.remarks.trim() === '')
      newErrors.remarks = 'Remarks is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateField = (field, val) => {
    setInteraction(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleCreate = async () => {
    if (loading) return;
    if (!validate()) return;
    setLoading(true);
    const payload = {
      ...interaction,
      site_visit_date: interaction.site_visit_date || null,
      call_back_date: interaction.call_back_date || null,
      call_back_time: interaction.call_back_time || null,
      expected_closure_date: interaction.expected_closure_date || null,
    };
    try {
      const res = await api.post(
        `/api/pm/createPropertyLeadFeedback/${id}`,
        payload,
      );
      if (res.data.status === true) {
        Alert.alert('Success', 'Interaction added successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setInteraction(emptyInteraction);
              navigation.replace('AllInteractionsScreen', {
                id: route.params.id,
              });
            },
          },
        ]);
      } else {
        Alert.alert('Error', res.data.message || 'Something went wrong.');
      }
    } catch (err) {
      console.log('Error Data:', JSON.stringify(err.response?.data));
      Alert.alert('Error', 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#1a2d3e' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
    >
      <View style={styles.container}>
        {/* Same background as Meeting Edit / Leads List screens */}
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

        {/* TOP BAR: [back + icon + title] */}
        <View
          style={[styles.topBarContainer, { paddingTop: verticalScale(10) }]}
        >
          <View style={styles.topBar}>
            <View style={styles.leftHeader}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon1 name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              <Icon name="event-note" size={20} color="#ffffff" />
              <Text style={styles.screenTitle} numberOfLines={1}>
                Add Interaction
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Interaction Details */}
          <Section title="Interaction Details" icon="call">
            <DropdownField
              label="Call Status *"
              data={toOptions(AllCallStatus)}
              placeholder="Select"
              value={interaction.call_status_id}
              onChange={val => updateField('call_status_id', val)}
              error={errors.call_status_id}
            />
            <DropdownField
              label="Lead Qualification *"
              data={toOptions(AllLeadQualification)}
              placeholder="Select"
              value={interaction.lead_qualification_id}
              onChange={val => updateField('lead_qualification_id', val)}
              error={errors.lead_qualification_id}
            />
            <DropdownField
              label="Lead Status *"
              data={toOptions(AllLeadStatus)}
              placeholder="Select"
              value={interaction.lead_status_id}
              onChange={val => updateField('lead_status_id', val)}
              error={errors.lead_status_id}
            />
            <DropdownField
              label="Lead Sub Status *"
              data={toOptions(AllLeadSubStatus)}
              placeholder="Select"
              value={interaction.lead_sub_status_id}
              onChange={val => updateField('lead_sub_status_id', val)}
              error={errors.lead_sub_status_id}
            />
            <DropdownField
              label="Rating *"
              data={toOptions(AllRating)}
              placeholder="Select"
              value={interaction.rating_id}
              onChange={val => updateField('rating_id', val)}
              error={errors.rating_id}
            />
            <DropdownField
              label="Project *"
              data={projectOptions}
              placeholder="Select Project"
              value={interaction.project_id}
              onChange={val => updateField('project_id', val)}
              error={errors.project_id}
            />
          </Section>

          {/* Follow-up & Remarks */}
          <Section title="Follow-up & Remarks" icon="event">
            <PickerField
              label="Site Visit Date"
              placeholder="yyyy-mm-dd"
              icon="calendar-today"
              value={interaction.site_visit_date}
              onPress={() => setShowSiteVisitPicker(true)}
              onClear={() => {
                setSiteVisitDate(new Date());
                updateField('site_visit_date', '');
              }}
            />
            {showSiteVisitPicker && (
              <DateTimePicker
                value={siteVisitDate}
                mode="date"
                display="default"
                onChange={(e, d) => onChangeDate(e, d, 'site_visit_date')}
              />
            )}

            <PickerField
              label="Call Back Date"
              placeholder="yyyy-mm-dd"
              icon="calendar-today"
              value={interaction.call_back_date}
              onPress={() => setShowCallBackPicker(true)}
              onClear={() => {
                setCallBackDate(new Date());
                updateField('call_back_date', '');
              }}
            />
            {showCallBackPicker && (
              <DateTimePicker
                value={callBackDate}
                mode="date"
                display="default"
                onChange={(e, d) => onChangeDate(e, d, 'call_back_date')}
              />
            )}

            <PickerField
              label="Call Back Time"
              placeholder="--:--"
              icon="access-time"
              value={interaction.call_back_time}
              onPress={() => setShowTimePicker(true)}
              onClear={() => {
                setCallBackTime(new Date());
                updateField('call_back_time', '');
              }}
            />
            {showTimePicker && (
              <DateTimePicker
                value={callBackTime}
                mode="time"
                display="default"
                is24Hour={true}
                onChange={onChangeTime}
              />
            )}

            <PickerField
              label="Expected Closure Date"
              placeholder="yyyy-mm-dd"
              icon="calendar-today"
              value={interaction.expected_closure_date}
              onPress={() => setShowExpectedClosurePicker(true)}
              onClear={() => {
                setExpectedClosureDate(new Date());
                updateField('expected_closure_date', '');
              }}
            />
            {showExpectedClosurePicker && (
              <DateTimePicker
                value={expectedClosureDate}
                mode="date"
                display="default"
                onChange={(e, d) => onChangeDate(e, d, 'expected_closure_date')}
              />
            )}

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Remarks *</Text>
              <TextInput
                placeholder="Remarks"
                placeholderTextColor={COLORS.mutedText}
                style={[
                  styles.textArea,
                  errors.remarks && { borderColor: COLORS.red },
                ]}
                multiline
                value={interaction.remarks}
                onChangeText={text => updateField('remarks', text)}
                onFocus={handleRemarksFocus}
              />
              {errors.remarks ? (
                <Text style={styles.error}>{errors.remarks}</Text>
              ) : null}
            </View>
          </Section>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Icon
                name={loading ? 'hourglass-top' : 'check-circle'}
                size={16}
                color="#fff"
              />
              <Text style={styles.buttonText}>
                {loading ? 'Submitting...' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── STYLES (Meeting Edit theme) ─────────────────────────────────────────────

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

  safeArea: { flex: 1, backgroundColor: 'transparent' },

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
    paddingRight: 8,
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
  textArea: {
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 90,
    color: '#e6ebf2',
    fontSize: 13,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
  },

  // ── Dropdown (react-native-element-dropdown) ──
  dropdown: {
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
  },
  dropdownContainer: {
    backgroundColor: COLORS.modalBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
    marginTop: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  placeholderStyle: { color: COLORS.mutedText, fontSize: 13 },
  selectedTextStyle: { color: '#e6ebf2', fontSize: 13, fontWeight: '600' },
  inputSearchStyle: {
    height: 42,
    fontSize: 13,
    color: '#e6ebf2',
    backgroundColor: '#28304a',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.fieldBorder,
    borderRadius: 0,
    margin: 0,
    paddingHorizontal: 12,
  },
  itemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#323a52',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  itemRowActive: { backgroundColor: 'rgba(74,163,223,0.15)' },
  itemTextStyle: { flex: 1, color: '#c3cbdb', fontSize: 13, fontWeight: '500' },
  itemTextActive: { color: '#7cc4f2', fontWeight: '700' },

  // ── Buttons ──
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 4,
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cancelText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e9ce8',
    paddingVertical: 13,
    borderRadius: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  error: { color: '#ff6b6b', fontSize: 11, marginTop: 4 },
});