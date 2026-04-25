import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Linking,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { ScrollView } from 'react-native';
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
const PAGE_SIZE = 20;

// ─── COLORS ──────────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#080d5a',
  cardBg: '#ffffff0e',
  cardSelected: '#0d1a6e',
  headerBg: '#0A0F2E',
  accent: '#00cfff',
  accentDim: '#00cfff18',
  accentBorder: '#00cfff40',
  white: '#FFFFFF',
  mutedText: '#8A90B4',
  labelText: '#FFB85D',
  gold: '#f4c542',
  goldDim: '#f4c54218',
  goldBorder: '#f4c54235',
  green: '#00C48C',
  red: '#FF6B6B',
  borderColor: '#ffffff20',
  modalBg: '#0f1550',
  sectionBg: 'rgba(255,255,255,0.13)',
};

// ─── DROPDOWN FIELD ───────────────────────────────────────────────────────────

const DropdownField = ({ label, data, placeholder, value, onChange }) => {
  const [isFocus, setIsFocus] = useState(false);
  return (
    <View style={styles.inputWrapper}>
      {label ? <Text style={styles.filterLabel}>{label}</Text> : null}
      <Dropdown
        style={[
          styles.dropdown,
          isFocus && { borderColor: COLORS.accent, borderWidth: 1.5 },
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
            color={COLORS.accent}
          />
        )}
      />
    </View>
  );
};

// ─── INPUT FIELD ──────────────────────────────────────────────────────────────

const InputField = ({ label, placeholder, icon, value, onChange, onPress }) => (
  <View style={styles.field}>
    {label ? <Text style={styles.filterLabel}>{label}</Text> : null}
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={COLORS.mutedText}
          style={styles.input}
          value={value}
          onChangeText={onChange}
          editable={!onPress}
        />
        {icon && <Icon name={icon} size={18} color={COLORS.accent} />}
      </View>
    </TouchableOpacity>
  </View>
);

// ─── MAKE CALL ────────────────────────────────────────────────────────────────

const makeCall = phoneNumber => {
  if (!phoneNumber) return;
  Alert.alert('Call', `Do you want to call ${phoneNumber}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call', onPress: () => Linking.openURL(`tel:${phoneNumber}`) },
  ]);
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

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

  // ── Infinite Scroll State ──
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

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

  // ── Date ──
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

  // ── RM List ──
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

  // ── Fetch Leads (with pagination) ──
  const fetchLeads = useCallback(
    async (pageNum = 1, isReset = false) => {
      if (pageNum === 1) {
        setIsInitialLoading(true);
      } else {
        setIsFetchingMore(true);
      }

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
            page: pageNum,
            limit: PAGE_SIZE,
          },
        });

        const newData = res?.data?.data ?? [];

        if (isReset || pageNum === 1) {
          setLeads(newData);
        } else {
          setLeads(prev => {
            const combined = [...prev, ...newData];

            // 🔥 duplicate remove
            const unique = combined.filter(
              (item, index, self) =>
                index === self.findIndex(i => i.id === item.id)
            );

            return unique;
          });
        }

        setHasMore(newData.length === PAGE_SIZE);
        setPage(pageNum);
      } catch {
        // error 
      } finally {
        setIsInitialLoading(false);
        setIsFetchingMore(false);
      }
    },
    [searchText, filters],
  );

  // ── Reset & reload
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchLeads(1, true);
  }, [searchText, appliedFilters]);

  // ── Load more (next page) ──
  const loadMore = () => {
    if (!hasMore || isFetchingMore || isInitialLoading) return;
    fetchLeads(page + 1);
  };

  // ── Locations ──
  const { data: AllProperty } = useQuery({
    queryKey: ['AllProperty'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLocation');
      return res.data.data;
    },
  });

  // ── Projects ──
  const { data: projectList = [] } = useQuery({
    queryKey: ['project'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyProjects');
      return res.data.data || [];
    },
  });

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

  // ── Select ──
  const toggleSelect = id => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === leads.length) {
      setSelected([]);
    } else {
      setSelected(leads.map(d => d.id));
    }
  };

  const isAllSelected = selected.length === leads.length && leads.length > 0;

  // ── Assign RM ──
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
      Alert.alert(
        '🎉 Success',
        'RM has been changed successfully.',
        [
          {
            text: 'OK',
            onPress: () => console.log('Done'),
          },
        ]
      );
      setSelected([]);
      setrms(null);
      setShowrmModal(false);
      // Reset করে আবার load করো
      fetchLeads(1, true);
    },
    onError: error => {
      Alert.alert('Error', error?.message || 'Something went wrong');
    },
  });

  // ── Filter Handlers ──
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

  // ─── LEAD CARD (FlatList renderItem) ───────────────────────────────────────

  const renderLeadCard = useCallback(
    ({ item }) => {
      const isChecked = selected.includes(item.id);
      return (
        <View style={[styles.card, isChecked && styles.cardSelected]}>
          {/* Card Top */}
          <View style={styles.cardTop}>
            <View style={styles.nameRow}>
              <TouchableOpacity
                onPress={() => toggleSelect(item.id)}
                style={[styles.checkbox, isChecked && styles.checkboxChecked]}
              >
                {isChecked && <Icon name="check" size={11} color="#fff" />}
              </TouchableOpacity>
              <Text style={styles.cardName}>
                {item?.name || 'N/A'} |{' '}
                <Text style={styles.section}>
                  {item?.propertyproject?.project_name}
                </Text>
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item?.active === '1' ? '#00C48C22' : '#FF6B6B22',
                    borderColor:
                      item?.active === '1' ? '#00C48C60' : '#FF6B6B60',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: item?.active === '1' ? COLORS.green : COLORS.red },
                  ]}
                >
                  {item?.active === '1' ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Card Body */}
          <View style={styles.cardBody}>
            <View style={styles.leftCol}>
              <View style={styles.infoRow}>
                <Icon name="call" size={12} color={COLORS.accent} />
                <Text
                  style={[styles.infoText, { color: COLORS.accent }]}
                  onPress={() => makeCall(item?.phone)}
                >
                  {item?.phone || 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={12}
                  color={COLORS.accent}
                />
                <Text style={styles.infoText}>
                  {item?.company?.com_name || 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Icon name="email" size={12} color={COLORS.accent} />
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
                <Icon name="location-on" size={12} color={COLORS.gold} />
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
    },
    [selected],
  );

  // ─── Footer: loading spinner বা "no more data" ─────────────────────────────

  const renderFooter = () => {
    if (isFetchingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.footerText}>Loading more...</Text>
        </View>
      );
    }
    if (!hasMore && leads.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <Text style={styles.footerEndText}>✓ All leads loaded</Text>
        </View>
      );
    }
    return null;
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F2E" />

      {/* ── Header pinned to top ── */}
      <Header />

      {/* ── Top Bar (title + actions) ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="account-switch" size={16} color={COLORS.accent} />
          <Text style={styles.sectionTitle}>Change RM</Text>
        </View>
        <View style={styles.sectionActions}>
          <TouchableOpacity
            style={styles.changeBtn}
            onPress={() => {
              if (selected.length === 0) {
                Alert.alert(
                  '⚠️ Warning',
                  'Please select at least one lead',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'OK',
                      onPress: () => console.log('OK pressed'),
                    },
                  ],
                  {
                    cancelable: true,
                  }
                );
                return;
              }
              setShowrmModal(true);
            }}
            activeOpacity={0.75}
          >
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.navigate('Dashboard')}
            activeOpacity={0.75}
          >
            <View style={styles.backButton}>
              <Image
                source={require('../asset/image/icon/Arrow.png')}
                style={{ width: 11, height: 11, marginRight: 4 }}
              />
              <Text style={styles.closeBtnText}>Back</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── FlatList with Infinite Scroll ── */}
      <FlatList
        data={leads}
        keyExtractor={item => String(item.id)}
        renderItem={renderLeadCard}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}      // ৪০% বাকি থাকলেই পরের page fetch শুরু
        ListFooterComponent={renderFooter}
        ListHeaderComponent={
          <>
            {/* Search Bar */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Icon name="search" size={16} color={COLORS.mutedText} />
                <TextInput
                  placeholder="Search name / phone / email..."
                  placeholderTextColor={COLORS.mutedText}
                  value={searchText}
                  onChangeText={setSearchText}
                  style={styles.searchInput}
                />
                {searchText ? (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Icon name="close" size={15} color={COLORS.mutedText} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Select All + Filter Row */}
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

              <TouchableOpacity style={styles.filterBtn} onPress={openFilterModal}>
                <Icon name="filter-list" size={13} color="#fff" />
                <Text style={styles.filterBtnText}>By Details</Text>
                <Icon name="keyboard-arrow-down" size={13} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Initial Loading */}
            {isInitialLoading && (
              <View style={styles.initialLoader}>
                <ActivityIndicator size="large" color={COLORS.accent} />
              </View>
            )}

            {/* Empty State */}
            {!isInitialLoading && leads.length === 0 && (
              <Text style={styles.centeredText}>No leads found</Text>
            )}
          </>
        }
      />

      {/* ── Change RM Modal (center) ── */}
      {showrmModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change RM</Text>
              <TouchableOpacity
                onPress={() => { setShowrmModal(false); setrms(null); }}
              >
                <Icon name="close" size={20} color={COLORS.mutedText} />
              </TouchableOpacity>
            </View>

            {/* Selected leads info */}
            <View style={styles.infoBox}>
              <Icon name="people" size={14} color={COLORS.gold} />
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
                      style={[
                        styles.dropdownItem,
                        isSelected && styles.dropdownItemSelected,
                      ]}
                      onPress={() => setrms(rm.value)}
                    >
                      <View style={styles.rmItemLeft}>
                        <View
                          style={[
                            styles.rmRadio,
                            isSelected && styles.rmRadioSelected,
                          ]}
                        >
                          {isSelected && <View style={styles.rmRadioInner} />}
                        </View>
                        <Text
                          style={[
                            styles.dropdownItemText,
                            isSelected && styles.dropdownItemTextSelected,
                          ]}
                        >
                          {rm.label}
                        </Text>
                      </View>
                      {isSelected && (
                        <Icon name="check-circle" size={16} color={COLORS.accent} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Selected RM badge */}
            {rms && (
              <View style={styles.selectedRMBadge}>
                <Icon name="person-pin" size={14} color={COLORS.accent} />
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

      {/* ── Filter Bottom Sheet ── */}
      {showFilterModal && (
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeFilterModal}
          />
          <Animated.View
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: filterAnim }] },
            ]}
          >
            <View style={styles.handleBar} />

            <View style={styles.modalHeader}>
              <View style={styles.filterModalTitleRow}>
                <Icon name="filter-list" size={17} color={COLORS.accent} />
                <Text style={styles.modalTitle}>Filter Leads</Text>
              </View>
              <TouchableOpacity onPress={closeFilterModal}>
                <Icon name="close" size={20} color={COLORS.mutedText} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterDivider} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
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
                  <Icon name="arrow-forward" size={16} color={COLORS.mutedText} />
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

            <View style={styles.filterBtnRow}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Icon name="refresh" size={14} color={COLORS.red} />
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

      {/* ── Bottom Nav pinned to bottom ── */}
      <BottomNav />
    </View>
  );
};

export default ChangeRM;

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Layout ──
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  centeredText: {
    color: COLORS.white,
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    opacity: 0.7,
  },
  initialLoader: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  footerText: {
    color: COLORS.accent,
    fontSize: 12,
  },
  footerEndText: {
    color: COLORS.mutedText,
    fontSize: 12,
  },

  // ── Section Header ──
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeBtn: {
    backgroundColor: 'rgba(0,207,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  changeBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  closeBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Search ──
  searchRow: {
    marginBottom: 8,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: {
    color: COLORS.white,
    marginLeft: 8,
    fontSize: 13,
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 0 : 0,
  },

  // ── Select All Row ──
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  selectAllLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '500',
  },
  selectedBadge: {
    backgroundColor: COLORS.accentDim,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  selectedBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(58,63,122,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  filterBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '500',
  },

  // ── Checkbox ──
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  // ── Lead Card ──
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardSelected: {
    borderColor: 'rgba(0,207,255,0.45)',
    backgroundColor: COLORS.cardSelected,
  },
  cardTop: {
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 0.8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
  },
  cardBody: {
    flexDirection: 'row',
    gap: 8,
  },
  leftCol: {
    flex: 1,
    gap: 5,
  },
  rightCol: {
    flex: 1,
    gap: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    color: COLORS.mutedText,
    fontSize: 11,
    flexShrink: 1,
  },
  rmLabelCard: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '600',
  },
  rmValue: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  refLabel: {
    color: COLORS.labelText,
    fontSize: 10,
    fontWeight: '600',
  },
  refValue: {
    color: COLORS.labelText,
    fontSize: 10,
    flexShrink: 1,
  },

  // ── Change RM Modal ──
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: '90%',
    backgroundColor: COLORS.modalBg,
    borderRadius: 16,
    padding: 18,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.goldDim,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
  },
  infoBoxText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '500',
  },
  rmLabel: {
    color: COLORS.white,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  dropdownList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  dropdownItemSelected: {
    backgroundColor: COLORS.accentDim,
  },
  rmItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rmRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rmRadioSelected: {
    borderColor: COLORS.accent,
  },
  rmRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  dropdownItemText: {
    color: COLORS.mutedText,
    fontSize: 13,
  },
  dropdownItemTextSelected: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  noRMText: {
    color: COLORS.mutedText,
    textAlign: 'center',
    padding: 20,
    fontSize: 13,
  },
  selectedRMBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accentDim,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
  },
  selectedRMText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  cancelBtnText: {
    color: COLORS.white,
    fontWeight: '500',
    fontSize: 13,
  },
  assignBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  assignBtnDisabled: {
    backgroundColor: 'rgba(0,207,255,0.3)',
  },
  assignBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Filter Bottom Sheet ──
  bottomSheetOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  bottomSheet: {
    backgroundColor: COLORS.modalBg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 30,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderBottomWidth: 0,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 14,
  },
  filterModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterDivider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 12,
  },
  filterLabel: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dateField: { flex: 1 },
  dateSubLabel: {
    color: COLORS.mutedText,
    fontSize: 11,
    marginBottom: 4,
  },
  dateSeparator: { paddingTop: 18 },
  statusChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  statusChipActive: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
  },
  statusChipText: {
    color: COLORS.mutedText,
    fontSize: 12,
    fontWeight: '500',
  },
  statusChipTextActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  filterBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,82,82,0.35)',
    backgroundColor: 'rgba(255,82,82,0.1)',
  },
  resetBtnText: {
    color: COLORS.red,
    fontSize: 13,
    fontWeight: '500',
  },
  filterActionBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Dropdown Field ──
  inputWrapper: {
    marginBottom: 10,
    width: '100%',
  },
  dropdown: {
    height: 42,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  placeholderStyle: {
    color: COLORS.mutedText,
    fontSize: 13,
  },
  selectedTextStyle: {
    color: COLORS.white,
    fontSize: 13,
  },

  // ── Input Field ──
  field: {
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
  },
  input: {
    color: COLORS.white,
    flex: 1,
    fontSize: 13,
  },
  section: {
    color: 'rgba(0, 208, 255, 0.84)',
  },
});