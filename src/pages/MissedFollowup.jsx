// MissedFollowup.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../Layout/Header';
import BottomNav from '../navigations/BottomNav';
import { Dropdown } from 'react-native-element-dropdown';
const STATUSBAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight : 44;

/* ================= CALL ================= */
const makeCall = phoneNumber => {
  if (!phoneNumber) return;
  Alert.alert('Call', `Do you want to call ${phoneNumber}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call', onPress: () => Linking.openURL(`tel:${phoneNumber}`) },
  ]);
};
const DropdownField = ({ label, data, placeholder, value, onChange }) => {
  const [isFocus, setIsFocus] = useState(false);
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
/* ================= CARD ================= */
const LeadCard = ({ item, navigation, setShowRemarks, setRemarksText }) => {
  const feedback = item?.propertyfeedbacks?.[0];

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item?.name || 'N/A'} ||</Text>

          <Text style={{ color: '#00e5ff', fontSize: 11 }}>
            {feedback?.propertyrating?.name}
          </Text>

          <View
            style={[
              styles.activeBadge,
              {
                backgroundColor: item?.active == 1 ? '#4caf50' : '#f44336',
              },
            ]}
          >
            <Text style={styles.activeText}>
              {item?.active == 1 ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.remarksBtn}
            onPress={() => {
              setRemarksText(feedback?.remarks || 'No remarks available');
              setShowRemarks(true);
            }}
          >
            <Text style={styles.remarksText}>Remarks</Text>
          </TouchableOpacity>

          <Icon
            name="edit"
            size={18}
            color="#00e5ff"
            style={{ marginLeft: 8 }}
            onPress={() => navigation.navigate('MeetingsEdit', { id: item.id })}
          />
        </View>
      </View>

      {/* PROJECT + LOCATION */}
      <Text style={styles.location}>
        {item?.propertyproject?.project_name} | {item?.propertylocation?.name}
      </Text>

      {/* PHONE + EMAIL */}
      <View style={styles.rowBetween}>
        <TouchableOpacity onPress={() => makeCall(item?.phone)}>
          <Text style={styles.label}>
            Phone: <Text style={styles.value}>{item?.phone || 'N/A'}</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>
          Email: <Text style={styles.value}>{item?.email || 'N/A'}</Text>
        </Text>
      </View>

      {/* RM + CALLBACK */}
      <View style={styles.rowBetween}>
        <Text style={styles.label}>
          RM:{' '}
          <Text style={styles.value}>
            {item?.relationshipManager
              ? `${item.relationshipManager.usr_fname} ${item.relationshipManager.usr_lname}`
              : 'N/A'}
          </Text>
        </Text>

        <Text style={styles.label}>
          Callback:{' '}
          <Text style={styles.value}>{feedback?.call_back_date || 'N/A'}</Text>
        </Text>
      </View>

      {/* LEAD SOURCE */}
      <Text style={{ color: '#fb9e08', fontSize: 12, marginTop: 4 }}>
        Lead Source:{' '}
        <Text style={styles.value}>{item?.mrreference?.mrf_name}</Text>
      </Text>

      {/* FOOTER */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate('AllInteractionsScreen', { id: item.id })
          }
        >
          <Text style={styles.buttonText}>View Interaction</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.completed}>
            {feedback?.propertycallstatus?.name}
          </Text>
        </View>
      </View>
    </View>
  );
};

/* ================= MAIN ================= */
const MissedFollowup = () => {
  const navigation = useNavigation();
  const scrollRef = useRef();

  const [searchText, setSearchText] = useState('');
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    company_id: null,
    rm_id: null,
    fromDate: null,
    toDate: null,
    project: null,
    location: null,
    active: null,
  });
  const [appliedFilters, setAppliedFilters] = useState();
  const { data, isLoading } = useQuery({
    queryKey: ['MissedFollowups', appliedFilters],
    queryFn: async () => {
      const res = await api.get('/api/pm/missedCallBackLeads', {
        params: {
          search: searchText || undefined,
          company_id: filters.company_id || undefined,
          rm_id: filters.rm_id || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          project: filters.project || undefined,
          location: filters.location || undefined,
          active: filters.active || undefined,
        },
      });
      return res.data.data;
    },
  });

  const leads = data || [];

  const filteredLeads = leads.filter(item => {
    const search = searchText.toLowerCase();
    return (
      item?.name?.toLowerCase().includes(search) ||
      item?.phone?.includes(search) ||
      item?.email?.toLowerCase().includes(search)
    );
  });
  const { data: AllProperty } = useQuery({
    queryKey: ['AllProperty'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLocation');
      return res.data.data;
    },
  });

  // Fetch RMs
  const { data: allRmList = [] } = useQuery({
    queryKey: ['allRMList'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllRM');
      return res?.data?.data;
    },
  });

  // Fetch Projects
  const { data: projectList = [] } = useQuery({
    queryKey: ['project'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyProjects');
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

  const LeadStatus = [
    { label: 'Active', value: '1' },
    { label: 'Inactive', value: '2' },
    // { label: 'Site Visit', value: '3' },
    // { label: 'Meeting Done', value: '4' },
    // { label: 'Booking Done', value: '5' },
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
    };

    setFilters(cleared);
    setAppliedFilters(cleared);
    setShowFilterModal(false);
  };

  // if (isLoading) {
  //   return (
  //     <View style={styles.loader}>
  //       <ActivityIndicator size="large" color="#00acc1" />
  //     </View>
  //   );
  // }

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <Header />

      {/* TOP BAR */}
      <View style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="call-missed" size={18} color="#cfd8dc" />
            <Text style={styles.screenTitle}>Missed Followups</Text>
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
              onPress={() => navigation.navigate('Dashboard')}
              style={styles.backBtn}
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* LIST */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={e => {
          setShowTopBtn(e.nativeEvent.contentOffset.y > 200);
        }}
        scrollEventThrottle={16}
      >
        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color="#aaa" />
          <TextInput
            placeholder="Search name / phone / email..."
            placeholderTextColor="#aaa"
            value={searchText}
            onChangeText={setSearchText}
            style={{ marginLeft: 8, color: '#fff', flex: 1 }}
          />
        </View>

        {/* CARDS */}
        {isLoading ? (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
            Loading...
          </Text>
        ) : filteredLeads.length > 0 ? (
          filteredLeads.map((item, i) => (
            <LeadCard
              key={item.id || i}
              item={item}
              navigation={navigation}
              setShowRemarks={setShowRemarks}
              setRemarksText={setRemarksText}
            />
          ))
        ) : (
          <Text style={styles.empty}>No missed followups found</Text>
        )}
      </ScrollView>

      {/* REMARKS MODAL */}
      {showRemarks && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Icon name="check-circle" size={32} color="#00acc1" />
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
    {showFilterModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filter Leads</Text>

            <ScrollView
              style={{ width: '100%' }}
              showsVerticalScrollIndicator={false}
            >
              <DropdownField
                label="Property Location"
                data={Property}
                placeholder="Select"
                value={filters.location}
                onChange={value => onChange('location', value)}
              />
              <DropdownField
                label="RM"
                data={Rm}
                placeholder="Select"
                value={filters.rm_id}
                onChange={value => onChange('rm_id', value)}
              />

              {/* Date Row */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              ></View>

              <DropdownField
                label="Project"
                data={projectOptions}
                placeholder="Select"
                value={filters.project}
                onChange={value => onChange('project', value)}
              />
              <DropdownField
                label="Lead Status"
                data={LeadStatus}
                placeholder="Select"
                value={filters.active}
                onChange={value => onChange('active', value)}
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={applyFilter}
            >
              <Text style={styles.modalCloseText}>Apply Filter</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={resetFilters} style={{ marginTop: 12 }}>
              <Text style={{ color: '#ff5252', fontWeight: 'bold' }}>
                Reset All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowFilterModal(false)}
              style={{ marginTop: 15 }}
            >
              <Text style={{ color: '#fff' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* TOP BUTTON */}
      {showTopBtn && (
        <TouchableOpacity
          style={styles.topButton}
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        >
          <Icon name="keyboard-arrow-up" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <BottomNav />
    </View>
  );
};

export default MissedFollowup;

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070c4d' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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
  },

  backText: { color: '#fff', fontSize: 12 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 20,
    paddingHorizontal: 10,
    marginTop: 0,
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

  name: { color: '#fff', fontWeight: 'bold', flexShrink: 1 },

  activeBadge: {
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
  },

  remarksText: { color: '#fff', fontSize: 10 },

  location: {
    color: '#00e5ff',
    marginTop: 5,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    gap: 6,
  },

  label: { color: '#FFB85D', fontSize: 12, flex: 1 },

  value: { color: '#fff' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  button: {
    backgroundColor: '#00acc1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  buttonText: { color: '#fff', fontSize: 12 },

  completed: { color: '#aaa', fontSize: 12 },

  empty: { color: '#aaa', textAlign: 'center', marginTop: 20 },

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
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCard: {
    width: '85%',
    backgroundColor: '#2f2f8f',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },

  modalTitle: {
    color: '#00e5ff',
    fontSize: 18,
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
    paddingVertical: 6,
    borderRadius: 20,
  },

  modalCloseText: { color: '#fff' },
   inputWrapper: { width: '100%', marginBottom: 12 },
  dropdown: {
    height: 40,
    backgroundColor: '#ffffff10',
    borderRadius: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  dropdownContainer: { backgroundColor: '#fff', borderRadius: 8 },
  placeholderStyle: { color: '#aaa', fontSize: 14 },
  selectedTextStyle: { color: '#fff', fontSize: 14 },
});
