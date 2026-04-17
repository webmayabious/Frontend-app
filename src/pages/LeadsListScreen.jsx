// LeadsListScreen.js — Fixed iOS search + improved filter modal colors
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Dropdown } from 'react-native-element-dropdown';
import Header from '../Layout/Header';
import BottomNav from '../navigations/BottomNav';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import api from '../api/AxiosInstance';

const STATUSBAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight : 44;

const makeCall = phoneNumber => {
  if (!phoneNumber) return;
  Alert.alert('Call', `Do you want to call ${phoneNumber}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call', onPress: () => Linking.openURL(`tel:${phoneNumber}`) },
  ]);
};

const SiteCard = ({ data, navigation, setShowRemarks, setRemarksText }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.nameRow}>
        <Text style={styles.name}>{data?.name||[]}</Text>
        <View
          style={[
            styles.activeBadge,
            {
              backgroundColor:
                data?.active === '1' ? '#4caf50' : '#f44336',
            },
          ]}
        >
          <Text style={styles.activeText}>
            {data?.active === '1' ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
        <TouchableOpacity
          style={styles.remarksBtn}
          onPress={() => {
            setRemarksText(
              data?.propertyfeedbacks?.map(x => x?.remarks||[]).join(', ') ||
                'No remarks available',
            );
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
          onPress={() => navigation.navigate('MeetingsEdit', { id: data?.id })}
        />
      </View>
    </View>

    <Text style={styles.location}>
      {data?.propertyproject?.project_name||[]} | {data?.propertylocation?.name||[]}
    </Text>

    <View style={styles.rowBetween}>
      <TouchableOpacity onPress={() => makeCall(data?.phone)}>
        <Text style={styles.label}>
          Phone: <Text style={styles.value}>{data?.phone || 'N/A'}</Text>
        </Text>
      </TouchableOpacity>
      <Text style={styles.label}>
        Email: <Text style={styles.value}>{data?.email || 'N/A'}</Text>
      </Text>
    </View>

    <View style={styles.rowBetween}>
      <Text style={styles.label}>
        Site Visit Date:
        <Text style={styles.value}>
          {' '}{data?.propertyfeedbacks?.map(x => x?.site_visit_date||[]).join(', ')}
        </Text>
      </Text>
      <Text style={styles.label}>
        RM:{' '}
        <Text style={styles.value}>
          {data?.relationshipManager
            ? `${data.relationshipManager.usr_fname||[]} ${data.relationshipManager.usr_lname||[]}`
            : 'N/A'}
        </Text>
      </Text>
    </View>

    <Text style={{ color: '#fb9e08', fontSize: 12, marginTop: 4 }}>
      Lead Source:{' '}
      <Text style={styles.value}>{data?.mrreference?.mrf_name||[]}</Text>
    </Text>

    <View style={styles.cardFooter}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('AllInteractionsScreen', { id: data?.id })}
      >
        <Text style={styles.buttonText}>View Interaction</Text>
      </TouchableOpacity>

      <Text style={styles.completed}>
        {data?.propertyfeedbacks?.map(x => x.propertycallstatus?.name).join(', ') || 'N/A'}
      </Text>
    </View>
  </View>
);

const DropdownField = ({ label, data, placeholder, value, onChange }) => {
  const [isFocus, setIsFocus] = useState(false);
  return (
    <View style={styles.filterInputWrapper}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Dropdown
        style={[
          styles.filterDropdown,
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

const InputField = ({ label, placeholder, icon, value, onChange, onPress }) => {
  return (
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
};

const LeadsListScreen = () => {
  const navigation = useNavigation();
  const scrollRef = useRef();
  const isScrollingToTop = useRef(false);
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);

  const [filters, setFilters] = useState({
    company_id: null,
    rm_id: null,
    fromDate: null,
    toDate: null,
    project: null,
    location: null,
    active: null,
  });
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState();

  const formatDate = date => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const onDateChange = (event, selectedDate, key) => {
    key === 'fromDate' ? setShowFromPicker(false) : setShowToPicker(false);
    if (selectedDate) {
      onChange(key, formatDate(selectedDate));
    }
  };

  const { data: Lead, isLoading, fetchNextPage,
    hasNextPage,
    isFetchingNextPage, refetch: leadrefetch } = useInfiniteQuery({
    queryKey: ['AllPropertyLeads', appliedFilters, searchText],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get('/api/pm/getAllPropertyLeads', {
        params: {
           page: pageParam,
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
      return res.data;
    },
        getNextPageParam: lastPage => {
      const { currentPage, totalPages } = lastPage;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // useEffect(() => {
  //   leadrefetch();
  // }, [searchText]);
 const leads = Lead?.pages?.flatMap(page => page.data) || [];

  // ✅ Infinite scroll handler — scroll position দেখে trigger করে
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };
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

  const Property = AllProperty?.map(item => ({ label: item.name, value: item.id }));
  const Rm = allRmList?.map(item => ({ label: item.name, value: item.id }));
  const projectOptions = projectList?.map(item => ({
    label: item.project_name,
    value: item.id,
  }));

  const LeadStatus = [
    { label: 'Active', value: '1' },
    { label: 'Inactive', value: '2' },
  ];

  const onChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilter = () => {
    setAppliedFilters(filters);
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    const cleared = {
      company_id: null, rm_id: null, fromDate: null,
      toDate: null, project: null, location: null, active: null,
    };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setShowFilterModal(false);
  };

   const scrollToTop = () => {
    isScrollingToTop.current = true;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setTimeout(() => {
      isScrollingToTop.current = false; 
    }, 600);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Header />

      <View style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="event-note" size={18} color="#cfd8dc" />
            <Text style={styles.screenTitle}>Leads List</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.backBtn, { marginRight: 8, borderColor: '#00e5ff' }]}
              onPress={() => setShowFilterModal(true)}
            >
              <Icon name="filter-alt" size={18} color="#00e5ff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.navigate('Dashboard')}
            >
              <View style={styles.backButton}>
                             <Image
                               source={require('../asset/image/icon/Arrow.png')}
                               style={{ width:12, height: 12, marginRight: 6 }}
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

          // Scroll to top button
          setShowTopBtn(y > 200);
          if (isScrollingToTop.current) return;

         
          const isNearBottom =
            layoutMeasurement.height + y >= contentSize.height - 150;
          if (isNearBottom) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* ✅ FIXED SEARCH BOX — iOS compatible */}
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color="#aaa" />
          <TextInput
            placeholder="Search name / phone / email..."
            placeholderTextColor="#aaa"
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing" // iOS only — shows × button
          />
        </View>

        {isLoading ? (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
            Loading...
          </Text>
        ) : leads && leads.length > 0 ? (
          leads?.map((visit, i) => (
            <SiteCard
              key={visit.id || i}
              data={visit}
              setShowRemarks={setShowRemarks}
              setRemarksText={setRemarksText}
              navigation={navigation}
            />
          ))
        ) : (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
            No Data Found
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
              
        
                {/* ✅ End of list message */}
                {/* {!hasNextPage && leads.length > 0 && (
                  <Text
                    style={{
                      color: '#06f65a',
                      textAlign: 'center',
                      paddingBottom: 12,
                      fontSize: 15,
                      fontWeight: 'bold',
                    }}
                  >
                    You've reached the end of the list.
                  </Text>
                )} */}
      </ScrollView>

      {/* ✅ REMARKS MODAL */}
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

      {/* ✅ FILTER MODAL — improved colors */}
      {showFilterModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalCard}>

            {/* drag handle */}
            <View style={styles.dragHandle} />

            <Text style={styles.modalTitle}>Filter Leads</Text>
            <View style={styles.modalDivider} />

            <ScrollView
              style={{ width: '100%' }}
              showsVerticalScrollIndicator={false}
            >
              <DropdownField
                label="Property Location"
                data={Property}
                placeholder="Select location"
                value={filters.location}
                onChange={value => onChange('location', value)}
              />
              <DropdownField
                label="Relationship Manager"
                data={Rm}
                placeholder="Select RM"
                value={filters.rm_id}
                onChange={value => onChange('rm_id', value)}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
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
                placeholder="Select project"
                value={filters.project}
                onChange={value => onChange('project', value)}
              />
              <DropdownField
                label="Lead Status"
                data={LeadStatus}
                placeholder="Select status"
                value={filters.active}
                onChange={value => onChange('active', value)}
              />
            </ScrollView>

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

            <View style={styles.modalDivider} />

            <TouchableOpacity style={styles.modalCloseBtn} onPress={applyFilter}>
              <Text style={styles.modalCloseText}>Apply Filter</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={resetFilters} style={{ marginTop: 14 }}>
              <Text style={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: 14 }}>
                Reset All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: '#a0b4e8', fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showTopBtn && (
        <TouchableOpacity style={styles.topButton} onPress={scrollToTop}>
          <Icon name="keyboard-arrow-up" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <BottomNav />
    </View>
  );
};

export default LeadsListScreen;

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
  screenTitle: { color: '#cfd8dc', fontSize: 13, marginLeft: 6 },
  backBtn: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: { color: '#fff', fontSize: 12 },

  /* ✅ FIXED search box for iOS */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 0,
    minHeight: Platform.OS === 'ios' ? 44 : 40,
    backgroundColor: '#ffffff08',
  },
  searchInput: {
    marginLeft: 8,
    color: '#fff',
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    height: Platform.OS === 'ios' ? undefined : 40,
  },

  /* Cards */
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
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap' },
  name: { color: '#fff', fontWeight: 'bold', flexShrink: 1 },
  activeBadge: { borderRadius: 10, paddingHorizontal: 6, marginLeft: 6 },
  activeText: { color: '#fff', fontSize: 10 },
  remarksBtn: {
    backgroundColor: '#00acc1',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 80,
  },
  remarksText: { color: '#fff', fontSize: 10 },
  location: { color: '#00e5ff', marginTop: 5, flexWrap: 'wrap', lineHeight: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, gap: 6 },
  label: { color: '#FFB85D', fontSize: 12, flex: 1, flexWrap: 'wrap', paddingTop: 2 },
  value: { color: '#fff', flexShrink: 1 },
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
  completed: { color: '#aaa', fontSize: 12, flexShrink: 1, textAlign: 'right' },
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

  /* Modals */
  modalOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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

  /* ✅ IMPROVED Filter modal */
  filterModalCard: {
    width: '88%',
    backgroundColor: '#1a1f6b',       // deep navy base
    borderWidth: 1,
    borderColor: '#3d45b0',            // soft blue border
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    maxHeight: '88%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#3d55cc',
    borderRadius: 2,
    marginBottom: 14,
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#3d45b033',
    marginVertical: 10,
  },
  modalTitle: {
    color: '#00e5ff',
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  modalText: { color: '#fff', textAlign: 'center', marginBottom: 15 },
  modalCloseBtn: {
    backgroundColor: '#00acc1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 6,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  /* ✅ Filter form fields */
  filterInputWrapper: { width: '100%', marginBottom: 12 },
  filterLabel: {
    color: '#a0b4e8',    // muted blue-white — better contrast on dark bg
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
  dropdownContainer: { backgroundColor: '#fff', borderRadius: 8 },
  placeholderStyle: { color: '#7a8fc4', fontSize: 13 },
  selectedTextStyle: { color: '#fff', fontSize: 13 },

  /* Date input fields */
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
    backButton: {
  flexDirection: 'row',
  alignItems: 'center',
},
  filterInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    paddingVertical: 0,
  },
});