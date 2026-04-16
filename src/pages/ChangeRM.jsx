import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Linking,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomNav from '../navigations/BottomNav';
import Header from '../Layout/Header';
import { useNavigation } from '@react-navigation/native';
import api from '../api/AxiosInstance';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';

const screenHeight = Dimensions.get('window').height;

/* ================= DROPDOWN FIELD ================= */
const DropdownField = ({ label, data, placeholder, value, onChange }) => {
  const [isFocus, setIsFocus] = useState(false);
  return (

    <View style={styles.inputWrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
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

/* ================= INPUT FIELD ================= */
const InputField = ({ label, placeholder, icon, value, onChange, onPress }) => {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder={placeholder}
            placeholderTextColor="#8aa0c8"
            style={styles.input}
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

/* ================= CALL ================= */
const makeCall = phoneNumber => {
  if (!phoneNumber) return;
  Alert.alert('Call', `Do you want to call ${phoneNumber}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call', onPress: () => Linking.openURL(`tel:${phoneNumber}`) },
  ]);
};

/* ================= MAIN COMPONENT ================= */
const ChangeRM = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [showrmModal, setShowrmModal] = useState(false);
  const [rms, setrms] = useState(null);
  const [selected, setSelected] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState();

  const [filters, setFilters] = useState({
    company_id: null,
    rm_id: null,
    fromDate: null,
    toDate: null,
    project: null,
    location: null,
    active: null,
  });

  // ── Bottom Sheet Animation ──
  const filterAnim = useRef(new Animated.Value(screenHeight)).current;

  const openFilterModal = () => {
    setShowFilterModal(true);
    Animated.spring(filterAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const closeFilterModal = () => {
    Animated.timing(filterAnim, {
      toValue: screenHeight,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setShowFilterModal(false));
  };

  /* ================= DATE ================= */
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
    if (selectedDate) onChange(key, formatDate(selectedDate));
  };

  /* ================= RM LIST ================= */
  const { data: allRmList = [] } = useQuery({
    queryKey: ['allRMList'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/pm/getAllRM');
        return res?.data?.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const Rm = allRmList?.map(item => ({ label: item.name, value: item.id }));

  /* ================= LEADS ================= */
  const { data: Lead = [], refetch: leadrefetch, isLoading } = useQuery({
    queryKey: ['AllPropertyLeads', appliedFilters, searchText],
    queryFn: async () => {
      try {
        const res = await api.get('/api/pm/getAllPropertyLeads', {
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
        return res?.data?.data ?? [];
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    leadrefetch();
  }, [searchText]);

  /* ================= LOCATIONS ================= */
  const { data: AllProperty } = useQuery({
    queryKey: ['AllProperty'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLocation');
      return res.data.data;
    },
  });

  /* ================= PROJECTS ================= */
  const { data: projectList = [] } = useQuery({
    queryKey: ['project'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyProjects');
      return res.data.data || [];
    },
  });

  /* ================= DATA MAPPING ================= */
  const Property = AllProperty?.map(item => ({ label: item.name, value: item.id }));
  const projectOptions = projectList?.map(item => ({
    label: item.project_name,
    value: item.id,
  }));

  const LeadStatus = [
    { label: 'Active', value: '1' },
    { label: 'Inactive', value: '2' },
    { label: 'Site Visit', value: '3' },
    { label: 'Meeting Done', value: '4' },
    { label: 'Booking Done', value: '5' },
  ];

  /* ================= SELECT ================= */
  const toggleSelect = id => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === Lead.length) {
      setSelected([]);
    } else {
      setSelected(Lead.map(d => d.id));
    }
  };

  const isAllSelected = selected.length === Lead.length && Lead.length > 0;

  /* ================= ASSIGN RM ================= */
  const { mutate: handleAssignRm } = useMutation({
    mutationFn: async () => {
      if (!selected.length) throw new Error('Please select prospects');
      if (!rms) throw new Error('Please select a RM');
      return await api.put('/api/pm/assignRM', {
        rm_id: rms,
        property_lead_id: selected,
      });
    },
    onSuccess: () => {
      setSelected([]);
      setrms(null);
      setShowrmModal(false);
      leadrefetch();
    },
    onError: error => {
      Alert.alert('Error', error?.message || 'Something went wrong');
    },
  });

  /* ================= FILTER HANDLERS ================= */
  const onChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilter = () => {
    setAppliedFilters(filters);
    closeFilterModal();
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
    closeFilterModal();
  };

  /* ================= RENDER ================= */
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar
        barStyle="light-content"
        translucent={true}
        backgroundColor="transparent"
      />
      <Header />

      {/* ── TOP BAR ── */}
      <View
        style={[
          styles.topBarContainer,
          { paddingTop: Platform.OS === 'ios' ? insets.top : 10 },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <MaterialCommunityIcons name="account-switch" size={18} color="#00cfff" />
            <Text style={styles.title}>Change RM</Text>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.changeBtn}
              onPress={() => {
                if (selected.length === 0) {
                  Alert.alert('', 'Please select at least one lead');
                  return;
                }
                setShowrmModal(true);
              }}
            >
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.navigate('Dashboard')}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── LIST ── */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 80 }}
      >
        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon name="search" size={16} color="#aaa" />
            <TextInput
              placeholder="Search name / phone / email..."
              placeholderTextColor="#aaa"
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Icon name="close" size={15} color="#aaa" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Select All + Filter */}
        <View style={styles.selectAllRow}>
          <TouchableOpacity style={styles.selectAllLeft} onPress={toggleSelectAll}>
            <View style={[styles.checkbox, isAllSelected && styles.checkboxChecked]}>
              {isAllSelected && <Icon name="check" size={11} color="#fff" />}
            </View>
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>

          {selected.length > 0 && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>{selected.length} selected</Text>
            </View>
          )}

          {/* ✅ By Details — animation trigger */}
          <TouchableOpacity style={styles.filterBtn} onPress={openFilterModal}>
            <Icon name="filter-list" size={14} color="#fff" />
            <Text style={styles.filterText}>By Details</Text>
            <Icon name="keyboard-arrow-down" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Lead Cards */}
        {isLoading ? (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
            Loading...
          </Text>
        ) :
          Lead.length === 0 ? (
            <Text style={styles.emptyText}>No leads found</Text>
          ) : (
            Lead.map(item => {
              const isChecked = selected.includes(item.id);
              return (
                <View
                  key={item.id}
                  style={[styles.card, isChecked && styles.cardSelected]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.nameRow}>
                      <TouchableOpacity
                        onPress={() => toggleSelect(item.id)}
                        style={[styles.checkbox, isChecked && styles.checkboxChecked]}
                      >
                        {isChecked && <Icon name="check" size={11} color="#fff" />}
                      </TouchableOpacity>

                      <Text style={styles.name}>{item?.name || 'N/A'}</Text>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              item?.active === '1' ? '#4caf50' : '#f44336',
                          },
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {item?.active === '1' ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.cardBody}>
                    <View style={styles.leftCol}>
                      <View style={styles.infoRow}>
                        <Icon name="call" size={12} color="#00cfff" />
                        <Text
                          style={styles.infoText}
                          onPress={() => makeCall(item?.phone)}
                        >
                          {item?.phone || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <MaterialCommunityIcons
                          name="file-document-outline"
                          size={12}
                          color="#00cfff"
                        />
                        <Text style={styles.infoText}>
                          {item?.company?.com_name || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Icon name="email" size={12} color="#00cfff" />
                        <Text style={styles.infoText}>{item?.email || 'N/A'}</Text>
                      </View>
                    </View>

                    <View style={styles.rightCol}>
                      <View style={styles.infoRow}>
                        <Text style={styles.rmLabelCard}>RM: </Text>
                        <Text style={styles.rmValue}>
                          {item?.relationshipManager
                            ? `${item.relationshipManager.usr_fname} ${item.relationshipManager.usr_lname}`
                            : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Icon name="location-on" size={12} color="#f4c542" />
                        <Text style={styles.infoText}>
                          {item?.propertylocation?.name || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.refLabel}>Reference: </Text>
                        <Text style={styles.refValue}>
                          {item?.mrreference?.mrf_name || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
      </ScrollView>

      {/* ── CHANGE RM MODAL (center) ── */}
      {showrmModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change RM</Text>
              <TouchableOpacity onPress={() => { setShowrmModal(false); setrms(null); }}>
                <Icon name="close" size={20} color="#aaa" />
              </TouchableOpacity>
            </View>

            {/* Selected leads info */}
            <View style={styles.infoBox}>
              <Icon name="people" size={14} color="#f4c542" />
              <Text style={styles.infoBoxText}>
                {selected.length} lead{selected.length > 1 ? 's' : ''} selected
              </Text>
            </View>

            <Text style={styles.rmLabel}>Select RM</Text>

            {/* RM List */}
            <ScrollView
              style={styles.dropdownList}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {Rm.length === 0 ? (
                <Text style={styles.noRMText}>No RM found</Text>
              ) : (
                Rm.map(rm => {
                  const isSelected = rms === rm.value;
                  return (
                    <TouchableOpacity
                      key={rm.value}
                      style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                      onPress={() => setrms(rm.value)}
                    >
                      <View style={styles.rmItemLeft}>
                        <View style={[styles.rmRadio, isSelected && styles.rmRadioSelected]}>
                          {isSelected && <View style={styles.rmRadioInner} />}
                        </View>
                        <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                          {rm.label}
                        </Text>
                      </View>
                      {isSelected && <Icon name="check-circle" size={16} color="#00cfff" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Selected RM badge */}
            {rms && (
              <View style={styles.selectedRMBadge}>
                <Icon name="person-pin" size={14} color="#00cfff" />
                <Text style={styles.selectedRMText}>
                  {Rm.find(r => r.value === rms)?.label}
                </Text>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowrmModal(false); setrms(null); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.assignBtn, !rms && styles.assignBtnDisabled]}
                onPress={handleAssignRm}
                disabled={!rms}
              >
                <Text style={styles.assignBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── FILTER BOTTOM SHEET ── */}
      {showFilterModal && (
        <View style={styles.bottomSheetOverlay}>
          {/* Dark bg tap to close */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeFilterModal}
          />

          <Animated.View
            style={[styles.bottomSheet, { transform: [{ translateY: filterAnim }] }]}
          >
            {/* Handle Bar */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.filterModalTitleRow}>
                <Icon name="filter-list" size={18} color="#00cfff" />
                <Text style={styles.modalTitle}>Filter Leads</Text>
              </View>
              <TouchableOpacity onPress={closeFilterModal}>
                <Icon name="close" size={20} color="#aaa" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterDivider} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <Text style={styles.filterLabel}>Property Location</Text>
              <DropdownField
                data={Property}
                placeholder="Select location"
                value={filters.location}
                onChange={value => onChange('location', value)}
              />

              <Text style={styles.filterLabel}>Relationship Manager</Text>
              <DropdownField
                data={Rm}
                placeholder="Select RM"
                value={filters.rm_id}
                onChange={value => onChange('rm_id', value)}
              />

              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.dateSubLabel}>From</Text>
                  <InputField
                    placeholder="YYYY-MM-DD"
                    icon="calendar-today"
                    value={filters.fromDate}
                    onPress={() => setShowFromPicker(true)}
                  />
                </View>
                <View style={styles.dateSeparator}>
                  <Icon name="arrow-forward" size={16} color="#555" />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.dateSubLabel}>To</Text>
                  <InputField
                    placeholder="YYYY-MM-DD"
                    icon="calendar-today"
                    value={filters.toDate}
                    onPress={() => setShowToPicker(true)}
                  />
                </View>
              </View>

              <Text style={styles.filterLabel}>Project</Text>
              <DropdownField
                data={projectOptions}
                placeholder="Select project"
                value={filters.project}
                onChange={value => onChange('project', value)}
              />

              <Text style={styles.filterLabel}>Lead Status</Text>
              <View style={styles.statusRow}>
                {LeadStatus.map(status => {
                  const isActive = filters.active === status.value;
                  return (
                    <TouchableOpacity
                      key={status.value}
                      style={[styles.statusChip, isActive && styles.statusChipActive]}
                      onPress={() => onChange('active', isActive ? null : status.value)}
                    >
                      <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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

            <View style={styles.filterDivider} />

            {/* Footer */}
            <View style={styles.filterBtnRow}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Icon name="refresh" size={14} color="#ff5252" />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <View style={styles.filterActionBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeFilterModal}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyBtn} onPress={applyFilter}>
                  <Icon name="check" size={14} color="#fff" />
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      )}

      <BottomNav />
    </SafeAreaView>
  );
};

export default ChangeRM;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f4a' },
  topBarContainer: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#ffffff10', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#fff', fontSize: 14, fontWeight: '700' },
  changeBtn: {
    borderWidth: 1, borderColor: '#ffffff40', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5, backgroundColor: '#ffffff10',
  },
  changeBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  backBtn: {
    borderWidth: 1, borderColor: '#ffffff40', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5, backgroundColor: '#ffffff10',
  },
  backText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#3a3f7a',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#ffffff20',
  },
  filterText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
 searchBox: {
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#555',
  borderRadius: 20,
  paddingHorizontal: 12,
  height: 40,

  // iOS fix
  backgroundColor: '#ffffff08',
},
  searchInput: {
  color: '#fff',
  marginLeft: 6,
  fontSize: 13,
  flex: 1,

  // 🔥 iOS specific fix
  paddingVertical: Platform.OS === 'ios' ? 0 : 0,
  textAlignVertical: 'center',
},
  selectAllRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 13, marginBottom: 8,
  },
  selectAllLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectAllText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  selectedBadge: {
    backgroundColor: '#00cfff22', borderWidth: 1, borderColor: '#00cfff55',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2,
  },
  selectedBadgeText: { color: '#00cfff', fontSize: 11, fontWeight: '500' },
  checkbox: {
    width: 17, height: 17, borderRadius: 3, borderWidth: 1.5,
    borderColor: '#ffffff50', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: { backgroundColor: '#00cfff', borderColor: '#00cfff' },
  emptyText: { color: '#aaa', textAlign: 'center', marginTop: 40, fontSize: 14 },
  card: {
    backgroundColor: '#1e2260', borderRadius: 12, padding: 12,
    marginBottom: 10, borderWidth: 0.3, borderColor: '#ffffff30',
  },
  cardSelected: { borderColor: '#00cfff55', backgroundColor: '#1a2a6a' },
  cardTop: { marginBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.3 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { color: '#ffffff', fontSize: 10, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#ffffff15', marginBottom: 8 },
  cardBody: { flexDirection: 'row', gap: 8 },
  leftCol: { flex: 1, gap: 5 },
  rightCol: { flex: 1, gap: 5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoText: { color: '#ccc', fontSize: 11, flexShrink: 1 },
  rmLabelCard: { color: '#f4c542', fontSize: 11, fontWeight: '600' },
  rmValue: { color: '#f4c542', fontSize: 11, fontWeight: '600', flexShrink: 1 },
  refLabel: { color: '#f4c542', fontSize: 10, fontWeight: '600' },
  refValue: { color: '#f4c542', fontSize: 10, flexShrink: 1 },

  // ── Center Modal (Change RM) ──
  modalOverlay: {
    position: 'absolute', width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center',
    alignItems: 'center', zIndex: 1000
  },
  modalContainer: {
    width: '90%', backgroundColor: '#1e2260', borderRadius: 14,
    padding: 18, maxHeight: '75%', borderWidth: 1, borderColor: '#ffffff15',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  modalTitle: { color: '#00cfff', fontSize: 16, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f4c54215', borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 6, marginBottom: 12, borderWidth: 1, borderColor: '#f4c54230',
  },
  infoBoxText: { color: '#f4c542', fontSize: 12, fontWeight: '500' },
  rmLabel: { color: '#fff', marginBottom: 8, fontSize: 13, fontWeight: '500' },
  dropdownList: {
    maxHeight: 200, borderWidth: 1, borderColor: '#ffffff20',
    borderRadius: 8, marginBottom: 12, marginTop: 8,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 11,
    borderBottomWidth: 0.5, borderBottomColor: '#ffffff10',
  },
  dropdownItemSelected: { backgroundColor: '#00cfff12' },
  rmItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rmRadio: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 1.5,
    borderColor: '#ffffff40', alignItems: 'center', justifyContent: 'center',
  },
  rmRadioSelected: { borderColor: '#00cfff' },
  rmRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00cfff' },
  dropdownItemText: { color: '#bbb', fontSize: 13 },
  dropdownItemTextSelected: { color: '#00cfff', fontWeight: '600' },
  noRMText: { color: '#aaa', textAlign: 'center', padding: 20, fontSize: 13 },
  selectedRMBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#00cfff12', borderWidth: 1, borderColor: '#00cfff35',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 14,
  },
  selectedRMText: { color: '#00cfff', fontSize: 12, fontWeight: '600' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: {
    backgroundColor: '#ffffff15', paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1, borderColor: '#ffffff25',
  },
  cancelBtnText: { color: '#fff', fontWeight: '500', fontSize: 13 },
  assignBtn: {
    backgroundColor: '#00cfff', paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 20, minWidth: 80, alignItems: 'center',
  },
  assignBtnDisabled: { backgroundColor: '#00cfff40' },
  assignBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // ── Bottom Sheet (Filter) ──
  bottomSheetOverlay: {
    position: 'absolute', width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', zIndex: 1000,
  },
  bottomSheet: {
    backgroundColor: '#1e2260', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 50,
    padding: 18, maxHeight: '85%', borderWidth: 1,
    borderColor: '#ffffff15', borderBottomWidth: 0,
  },
  handleBar: {
    width: 40, height: 4, backgroundColor: '#ffffff30',
    borderRadius: 4, alignSelf: 'center', marginBottom: 12,
  },
  filterModalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterDivider: { height: 1, backgroundColor: '#ffffff15', marginVertical: 12 },
  filterLabel: {
    color: '#00cfff', fontSize: 11, fontWeight: '600',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6, marginTop: 4,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dateField: { flex: 1 },
  dateSubLabel: { color: '#aaa', fontSize: 11, marginBottom: 4 },
  dateSeparator: { paddingTop: 18 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statusChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#ffffff10', borderWidth: 1, borderColor: '#ffffff20',
  },
  statusChipActive: { backgroundColor: '#00cfff20', borderColor: '#00cfff60' },
  statusChipText: { color: '#aaa', fontSize: 12, fontWeight: '500' },
  statusChipTextActive: { color: '#00cfff', fontWeight: '600' },
  filterBtnRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4,
  },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 20, borderWidth: 1,
    borderColor: '#ff525240', backgroundColor: '#ff525215',
  },
  resetBtnText: { color: '#ff5252', fontSize: 13, fontWeight: '500' },
  filterActionBtns: { flexDirection: 'row', gap: 10 },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#00cfff',
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    minWidth: 80, justifyContent: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // ── Dropdown Field styles ──
  inputWrapper: { marginBottom: 10, width: '100%' },
  label: { color: '#aaa', fontSize: 12, marginBottom: 4 },
  dropdown: {
    height: 40, backgroundColor: '#ffffff10', borderRadius: 8,
    paddingHorizontal: 8, borderWidth: 1, borderColor: '#444',
  },
  dropdownContainer: { backgroundColor: '#fff', borderRadius: 8 },
  placeholderStyle: { color: '#aaa', fontSize: 14 },
  selectedTextStyle: { color: '#fff', fontSize: 14 },

  // ── Input Field styles ──
  field: { marginBottom: 10 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff10',
    borderWidth: 1, borderColor: '#444', borderRadius: 8, paddingHorizontal: 10, height: 40,
  },
  input: { color: '#fff', flex: 1, fontSize: 13 },
});