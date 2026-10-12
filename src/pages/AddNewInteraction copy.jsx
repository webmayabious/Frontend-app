import React, { useState, useRef } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Dropdown } from 'react-native-element-dropdown';
import api from '../api/AxiosInstance';
import { useQuery } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

const DropdownField = ({ label, data, value, onChange, error }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Dropdown
      style={[styles.dropdown, error && styles.inputError]}
      data={data || []}
      labelField="label"
      valueField="value"
      placeholder="Select..."
      placeholderStyle={styles.placeholder}
      selectedTextStyle={styles.selectedText}
      value={value}
      onChange={item => onChange && onChange(item.value)}
      renderRightIcon={() => (
        <Icon name="keyboard-arrow-down" size={20} color="#8aa0c8" />
      )}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const InputField = ({ label, placeholder, icon, value, onChange, onPress, onClear, error }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#8aa0c8"
          style={styles.input}
          value={value}
          onChangeText={onChange}
          editable={!onPress}
          pointerEvents="none"
        />
        {value && onClear ? (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onClear();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="close" size={18} color="#ff5252" />
          </TouchableOpacity>
        ) : (
          icon && <Icon name={icon} size={18} color="#00bcd4" />
        )}
      </View>
    </TouchableOpacity>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

export default function AddNewInteraction({ route }) {
  const { id } = route.params;
  const navigation = useNavigation();

  const scrollRef = useRef(null);       // ✅ ScrollView ref
  const remarksRef = useRef(null);      // ✅ Remarks TextInput ref

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [interaction, setInteraction] = useState({
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
  });

  const [siteVisitDate, setSiteVisitDate] = useState(new Date());
  const [callBackDate, setCallBackDate] = useState(new Date());
  const [expectedClosureDate, setExpectedClosureDate] = useState(new Date());
  const [callBackTime, setCallBackTime] = useState(new Date());

  const [showSiteVisitPicker, setShowSiteVisitPicker] = useState(false);
  const [showCallBackPicker, setShowCallBackPicker] = useState(false);
  const [showExpectedClosurePicker, setShowExpectedClosurePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formatDate = d => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const onChangeDate = (event, selectedDate, field) => {
    if (!selectedDate) return;
    const formatted = formatDate(selectedDate);
    switch (field) {
      case 'site_visit_date':
        setShowSiteVisitPicker(false);
        setSiteVisitDate(selectedDate);
        break;
      case 'call_back_date':
        setShowCallBackPicker(false);
        setCallBackDate(selectedDate);
        break;
      case 'expected_closure_date':
        setShowExpectedClosurePicker(false);
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
    setInteraction(prev => ({ ...prev, call_back_time: `${hours}:${minutes}` }));
  };

  // ✅ Remarks focus হলে ScrollView নিচে scroll করবে
  const handleRemarksFocus = () => {
    setTimeout(() => {
      remarksRef.current?.measureLayout(
        scrollRef.current,
        (x, y) => {
          scrollRef.current?.scrollTo({ y: y - 20, animated: true });
        },
        () => {
          // fallback: একদম নিচে scroll
          scrollRef.current?.scrollToEnd({ animated: true });
        }
      );
    }, 300); // keyboard animate হওয়ার পর measure করতে হবে
  };

  const { data: AllCallStatus } = useQuery({
    queryKey: ['AllCallStatus'],
    queryFn: async () => (await api.get('/api/pm/getAllPropertyCallStatus')).data.data,
  });
  const { data: AllLeadQualification } = useQuery({
    queryKey: ['AllLeadQualification'],
    queryFn: async () => (await api.get('/api/pm/getAllPropertyLeadQualification')).data.data,
  });
  const { data: AllLeadStatus } = useQuery({
    queryKey: ['AllLeadStatus'],
    queryFn: async () => (await api.get('/api/pm/getAllPropertyLeadStatus')).data.data,
  });
  const { data: AllLeadSubStatus } = useQuery({
    queryKey: ['AllLeadSubStatus'],
    queryFn: async () => (await api.get('/api/pm/getAllPropertyLeadSubStatus')).data.data,
  });
  const { data: AllRating } = useQuery({
    queryKey: ['AllRating'],
    queryFn: async () => (await api.get('/api/pm/getAllPropertyRating')).data.data,
  });

  const toOptions = arr => arr?.map(item => ({ label: item.name, value: item.id }));

  const validate = () => {
    const newErrors = {};
    if (!interaction.call_status_id) newErrors.call_status_id = 'Call Status is required';
    if (!interaction.lead_qualification_id) newErrors.lead_qualification_id = 'Lead Qualification is required';
    if (!interaction.lead_status_id) newErrors.lead_status_id = 'Lead Status is required';
    if (!interaction.lead_sub_status_id) newErrors.lead_sub_status_id = 'Lead Sub Status is required';
    if (!interaction.rating_id) newErrors.rating_id = 'Rating is required';
    if (!interaction.remarks || interaction.remarks.trim() === '') newErrors.remarks = 'Remarks is required';
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
      const res = await api.post(`/api/pm/createPropertyLeadFeedback/${id}`, payload);
      if (res.data.status === true) {
        Alert.alert('Success', 'Interaction added successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setInteraction({
                call_status_id: '', lead_qualification_id: '', lead_status_id: '',
                lead_sub_status_id: '', rating_id: '', site_visit_date: '',
                call_back_date: '', call_back_time: '', expected_closure_date: '', remarks: '',
              });
              navigation.replace('AllInteractionsScreen', { id: route.params.id });
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
    // ✅ FIX: marginBottom: 50 সরানো হয়েছে — এটাই white background overlap-এর মূল কারণ ছিল।
    // এই margin পুরো screen-কে flex area থেকে নিচে নামিয়ে দিত, ফলে নিচে React Navigation-এর
    // default (সাদা) background দেখা যেত, বিশেষ করে keyboard খোলার সময়।
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#050a3a' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBarContainer}>
          <View style={styles.topBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="event-note" size={18} color="#cfd8dc" />
              <Text style={styles.screenTitle}>Add Interactions</Text>
            </View>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
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

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // ✅ FIX: BottomNav-এর জন্য জায়গা এখন এখানে paddingBottom দিয়ে রাখা হচ্ছে
          // (আগে outer view-এর marginBottom দিয়ে যেটা করা হচ্ছিল সেটাই সমস্যা তৈরি করছিল)
          contentContainerStyle={{ paddingBottom: 70 }}
        >
          <View style={styles.card}>
            <DropdownField
              label="Call Status *"
              data={toOptions(AllCallStatus)}
              value={interaction.call_status_id}
              onChange={val => updateField('call_status_id', val)}
              error={errors.call_status_id}
            />
            <DropdownField
              label="Lead Qualification *"
              data={toOptions(AllLeadQualification)}
              value={interaction.lead_qualification_id}
              onChange={val => updateField('lead_qualification_id', val)}
              error={errors.lead_qualification_id}
            />
            <DropdownField
              label="Lead Status *"
              data={toOptions(AllLeadStatus)}
              value={interaction.lead_status_id}
              onChange={val => updateField('lead_status_id', val)}
              error={errors.lead_status_id}
            />
            <DropdownField
              label="Lead Sub Status *"
              data={toOptions(AllLeadSubStatus)}
              value={interaction.lead_sub_status_id}
              onChange={val => updateField('lead_sub_status_id', val)}
              error={errors.lead_sub_status_id}
            />
            <DropdownField
              label="Rating *"
              data={toOptions(AllRating)}
              value={interaction.rating_id}
              onChange={val => updateField('rating_id', val)}
              error={errors.rating_id}
            />

            <InputField
              label="Site Visit Date"
              placeholder="dd-mm-yyyy"
              icon="calendar-today"
              value={interaction.site_visit_date}
              onPress={() => setShowSiteVisitPicker(true)}
              onClear={() => {
                setSiteVisitDate(new Date());
                updateField('site_visit_date', '');
              }}
            />
            {showSiteVisitPicker && (
              <DateTimePicker value={siteVisitDate} mode="date" display="default"
                onChange={(e, d) => onChangeDate(e, d, 'site_visit_date')} />
            )}

            <InputField
              label="Call Back Date"
              placeholder="dd-mm-yyyy"
              icon="calendar-today"
              value={interaction.call_back_date}
              onPress={() => setShowCallBackPicker(true)}
              onClear={() => {
                setCallBackDate(new Date());
                updateField('call_back_date', '');
              }}
            />
            {showCallBackPicker && (
              <DateTimePicker value={callBackDate} mode="date" display="default"
                onChange={(e, d) => onChangeDate(e, d, 'call_back_date')} />
            )}

            <InputField
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
              <DateTimePicker value={callBackTime} mode="time" display="default"
                is24Hour={true} onChange={onChangeTime} />
            )}

            <InputField
              label="Expected Closure Date"
              placeholder="dd-mm-yyyy"
              icon="calendar-today"
              value={interaction.expected_closure_date}
              onPress={() => setShowExpectedClosurePicker(true)}
              onClear={() => {
                setExpectedClosureDate(new Date());
                updateField('expected_closure_date', '');
              }}
            />
            {showExpectedClosurePicker && (
              <DateTimePicker value={expectedClosureDate} mode="date" display="default"
                onChange={(e, d) => onChangeDate(e, d, 'expected_closure_date')} />
            )}

            {/* ✅ Remarks — focus auto scroll */}
            <View
              ref={remarksRef}
              style={styles.field}
            >
              <Text style={styles.label}>Remarks *</Text>
              <TextInput
                placeholder="Remarks"
                placeholderTextColor="#8aa0c8"
                style={[styles.textArea, errors.remarks && styles.inputError]}
                multiline
                value={interaction.remarks}
                onChangeText={text => updateField('remarks', text)}
                onFocus={handleRemarksFocus}
              />
              {errors.remarks ? <Text style={styles.errorText}>{errors.remarks}</Text> : null}
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, loading && { opacity: 0.7 }]}
                onPress={handleCreate}
                disabled={loading}
              >
                <Text style={styles.addText}>{loading ? 'Submitting...' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050a3a',
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#0a0f5a',
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
  },
  field: { marginBottom: 12 },
  label: { color: '#cfd8dc', fontSize: 12, marginBottom: 4 },
  dropdown: {
    height: 40,
    backgroundColor: '#2b2f66',
    borderRadius: 6,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  placeholder: { color: '#8aa0c8', fontSize: 13 },
  selectedText: { color: '#fff', fontSize: 13 },
  inputContainer: {
    height: 40,
    backgroundColor: '#2b2f66',
    borderRadius: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: { flex: 1, color: '#fff', fontSize: 13 },
  textArea: {
    backgroundColor: '#2b2f66',
    borderRadius: 6,
    padding: 10,
    minHeight: 80,
    color: '#fff',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: { borderColor: '#ff5252', borderWidth: 1 },
  errorText: { color: '#ff5252', fontSize: 11, marginTop: 3, marginLeft: 2 },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#8aa0c8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 10,
  },
  cancelText: { color: '#cfd8dc', fontSize: 12 },
  addBtn: {
    backgroundColor: '#00acc1',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  addText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  topBarContainer: { marginTop: 10 },
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
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#fff', fontSize: 12 },
});