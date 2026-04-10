import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Dropdown } from 'react-native-element-dropdown';
import Header from '../Layout/Header';
import BottomNav from '../navigations/BottomNav';
import api from '../api/AxiosInstance';
import { useQuery } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
const DropdownField = ({ label, data, value, onChange }) => {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <Dropdown
        style={styles.dropdown}
        data={data}
        labelField="label"
        valueField="value"
        placeholder="Select..."
        placeholderStyle={styles.placeholder}
        selectedTextStyle={styles.selectedText}
        value={value} // controlled by parent
        onChange={item => {
          if (onChange) onChange(item.value); // update parent
        }}
        renderRightIcon={() => (
          <Icon name="keyboard-arrow-down" size={20} color="#8aa0c8" />
        )}
      />
    </View>
  );
};

const InputField = ({ label, placeholder, icon, value, onChange, onPress }) => {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder={placeholder}
            placeholderTextColor="#8aa0c8"
            style={styles.input}
            value={value}
            onChangeText={onChange} // <-- Use onChangeText for TextInput
            editable={!onPress} // <-- Disable typing if onPress is used (like for date picker)
          />

          {icon && <Icon name={icon} size={18} color="#00bcd4" />}
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default function AddNewInteraction({ route }) {

  const { id } = route.params;
    const navigation=useNavigation()
  const [loading, setLoading] = useState(false);
  const [interaction, setinteraction] = useState({
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
 // ====== Date/Time States ======
const [siteVisitDate, setSiteVisitDate] = useState(new Date());
const [callBackDate, setCallBackDate] = useState(new Date());
const [expectedClosureDate, setExpectedClosureDate] = useState(new Date());
const [callBackTime, setCallBackTime] = useState(new Date());

// ====== Picker Visibility ======
const [showSiteVisitPicker, setShowSiteVisitPicker] = useState(false);
const [showCallBackPicker, setShowCallBackPicker] = useState(false);
const [showExpectedClosurePicker, setShowExpectedClosurePicker] = useState(false);
const [showTimePicker, setShowTimePicker] = useState(false);

// ====== Date Formatter ======
const formatDate = (d) => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// ====== OnChange Handlers ======
const onChangeDate = (event, selectedDate, field) => {
  if (!selectedDate) return; // user cancelled

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

  setinteraction(prev => ({ ...prev, [field]: formatted }));
};

const onChangeTime = (event, selectedTime) => {
  if (!selectedTime) {
    setShowTimePicker(false);
    return;
  }

  const hours = String(selectedTime.getHours()).padStart(2, '0');
  const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
  const formattedTime = `${hours}:${minutes}`;

  setCallBackTime(selectedTime);
  setShowTimePicker(false);

  setinteraction(prev => ({ ...prev, call_back_time: formattedTime }));
};
  // *************************************** get all call status ***************************************//
  const { data: AllCallStatus, isLoading: AllCallStatusLoading } = useQuery({
    queryKey: ['AllCallStatus'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyCallStatus');
      console.log('CallStatus:', res.data.data);
      return res.data.data;
    },
  });
  // console.log('AllCallStatus',AllCallStatus);
  const callStatusOptions = AllCallStatus?.map(item => ({
    label: item.name,
    value: item.id,
  }));
  // *************************************** get all lead qualification ***************************************//
  const { data: AllLeadQualification, isLoading: AllLeadQualificationLoading } =
    useQuery({
      queryKey: ['AllLeadQualification'],
      queryFn: async () => {
        const res = await api.get('/api/pm/getAllPropertyLeadQualification');
        console.log('LeadQualification:', res.data);
        return res.data.data;
      },
    });
  const AllLeadQualificationOptions = AllLeadQualification?.map(item => ({
    label: item.name,
    value: item.id,
  }));
  // *************************************** get all lead status ***************************************//
  const { data: AllLeadStatus, isLoading: AllLeadStatusLoading } = useQuery({
    queryKey: ['AllLeadStatus'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLeadStatus');
      console.log('LeadQualification:', res.data);
      return res.data.data;
    },
  });
  const AllLeadStatusOptions = AllLeadStatus?.map(item => ({
    label: item.name,
    value: item.id,
  }));
  // *************************************** get all lead sub status ***************************************//
  const { data: AllLeadSubStatus, isLoading: AllLeadSubStatusLoading } =
    useQuery({
      queryKey: ['AllLeadSubStatus'],
      queryFn: async () => {
        const res = await api.get('/api/pm/getAllPropertyLeadSubStatus');
        console.log('LeadSubStatus:', res.data);
        return res.data.data;
      },
    });
  const AllLeadSubStatusOptions = AllLeadSubStatus?.map(item => ({
    label: item.name,
    value: item.id,
  }));
  // *************************************** get all rating ***************************************//
  const { data: AllRating, isLoading: AllRatingLoading } = useQuery({
    queryKey: ['AllRating'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyRating');
      console.log('Rating:', res.data);
      return res.data.data;
    },
  });
  const AllRatingOptions = AllRating?.map(item => ({
    label: item.name,
    value: item.id,
  }));
  /* ================= CREATE ================= */
 const handleCreate = async () => {
  if (loading) return; // prevent multiple clicks

  setLoading(true); // start loading
  try {
    console.log('handleCreate called', interaction);

    const res = await api.post(
      `/api/pm/createPropertyLeadFeedback/${id}`,
      interaction
    );

    console.log('API response:', res.data);

    if (res.data.status === true) {
      // reset form
      setinteraction({
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

      // navigate immediately
      navigation.replace('AllInteractionsScreen', { id: route.params.id });
    }
  } catch (err) {
    console.log('handleCreate error:', err);
  } finally {
    setLoading(false); // stop loading regardless of success/failure
  }
};
  return (
    <View style={{ flex: 1, backgroundColor: '#050a3a' }}>
      <Header />

      <View style={styles.container}>
        <View style={styles.topBarContainer}>
          <View style={styles.topBar}>
            {/* Left */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="event-note" size={18} color="#cfd8dc" />
              <Text style={styles.screenTitle}>Add Interactions</Text>
            </View>

            {/* Right */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* <Icon name="filter-alt" size={18} color="#00e5ff" /> */}
              <TouchableOpacity style={styles.backBtn}onPress={()=>{navigation.replace('AllInteractionsScreen',{ id: route.params.id });}}>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <DropdownField
              label="Call Status *"
              data={callStatusOptions}
              value={interaction.call_status_id}
              onChange={val =>
                setinteraction({ ...interaction, call_status_id: val })
              }
            />
            <DropdownField
              label="Lead Qualification *"
              data={AllLeadQualificationOptions}
              value={interaction.lead_qualification_id}
              onChange={val =>
                setinteraction({ ...interaction, lead_qualification_id: val })
              }
            />
            <DropdownField
              label="Lead Status *"
              data={AllLeadStatusOptions}
              value={interaction.lead_status_id}
              onChange={val =>
                setinteraction({ ...interaction, lead_status_id: val })
              }
            />
            <DropdownField
              label="Lead Sub Status *"
              data={AllLeadSubStatusOptions}
              value={interaction.lead_sub_status_id}
              onChange={val =>
                setinteraction({ ...interaction, lead_sub_status_id: val })
              }
            />
            <DropdownField
              label="Rating *"
              data={AllRatingOptions}
              value={interaction.rating_id}
              onChange={val =>
                setinteraction({ ...interaction, rating_id: val })
              }
            />

         {/* Site Visit Date */}
<InputField
  label="Site Visit Date"
  placeholder="dd-mm-yyyy"
  icon="calendar-today"
  value={interaction.site_visit_date}
  onPress={() => setShowSiteVisitPicker(true)}
/>
{showSiteVisitPicker && (
  <DateTimePicker
    value={siteVisitDate}
    mode="date"
    display="default"
    onChange={(e, d) => onChangeDate(e, d, 'site_visit_date')}
  />
)}

{/* Call Back Date */}
<InputField
  label="Call Back Date"
  placeholder="dd-mm-yyyy"
  icon="calendar-today"
  value={interaction.call_back_date}
  onPress={() => setShowCallBackPicker(true)}
/>
{showCallBackPicker && (
  <DateTimePicker
    value={callBackDate}
    mode="date"
    display="default"
    onChange={(e, d) => onChangeDate(e, d, 'call_back_date')}
  />
)}

{/* Call Back Time */}
<InputField
  label="Call Back Time"
  placeholder="--:--"
  icon="access-time"
  value={interaction.call_back_time}
  onPress={() => setShowTimePicker(true)}
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

{/* Expected Closure Date */}
<InputField
  label="Expected Closure Date"
  placeholder="dd-mm-yyyy"
  icon="calendar-today"
  value={interaction.expected_closure_date}
  onPress={() => setShowExpectedClosurePicker(true)}
/>
{showExpectedClosurePicker && (
  <DateTimePicker
    value={expectedClosureDate}
    mode="date"
    display="default"
    onChange={(e, d) => onChangeDate(e, d, 'expected_closure_date')}
  />
)}
            {/* Remarks */}
           <View style={styles.field}>
  <Text style={styles.label}>Remarks *</Text>
  <TextInput
    placeholder="Remarks"
    placeholderTextColor="#8aa0c8"
    style={styles.textArea}
    multiline
    value={interaction.remarks}
    onChangeText={text => 
      setinteraction({ ...interaction, remarks: text })
    }
  />
</View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={navigation.goBack}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={handleCreate}
                
                disabled={loading}
              >
                <Text style={styles.addText}>
                  {loading ? 'Submitting...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
      <BottomNav />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050a3a',
    paddingHorizontal: 12,
  },

  header: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#0a0f5a',
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
  },

  field: {
    marginBottom: 12,
  },

  label: {
    color: '#cfd8dc',
    fontSize: 12,
    marginBottom: 4,
  },

  dropdown: {
    height: 40,
    backgroundColor: '#2b2f66',
    borderRadius: 6,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },

  placeholder: {
    color: '#8aa0c8',
    fontSize: 13,
  },

  selectedText: {
    color: '#fff',
    fontSize: 13,
  },

  inputContainer: {
    height: 40,
    backgroundColor: '#2b2f66',
    borderRadius: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  input: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
  },

  textArea: {
    backgroundColor: '#2b2f66',
    borderRadius: 6,
    padding: 10,
    height: 80,
    color: '#fff',
    textAlignVertical: 'top',
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },

  cancelBtn: {
    borderWidth: 1,
    borderColor: '#8aa0c8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 10,
  },

  cancelText: {
    color: '#cfd8dc',
    fontSize: 12,
  },

  addBtn: {
    backgroundColor: '#00acc1',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },

  addText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  topBarContainer: {
    marginTop: 10,
  },

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

  screenTitle: {
    color: '#cfd8dc',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },

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
});
