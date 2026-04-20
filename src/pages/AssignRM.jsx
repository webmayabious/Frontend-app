import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Image,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomNav from '../navigations/BottomNav';
import Header from '../Layout/Header';
import { useNavigation } from '@react-navigation/native';
import api from '../api/AxiosInstance';
import { useMutation, useQuery } from '@tanstack/react-query';
import { pick, types } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { useSelector } from 'react-redux';
import { PermissionsAndroid } from 'react-native';

const screenHeight = Dimensions.get('window').height;

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
  const [isFocus, setIsFocus] = React.useState(false);
  return (
    <View style={styles.inputWrapper}>
      {label ? <Text style={styles.dropLabel}>{label}</Text> : null}
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
    {label ? <Text style={styles.dropLabel}>{label}</Text> : null}
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={COLORS.mutedText}
          style={styles.input}
          value={value}
          onChangeText={onChange}
          editable={!onPress}
          pointerEvents={onPress ? 'none' : 'auto'}
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

const AssignRM = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [selected, setSelected] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRM, setSelectedRM] = useState(null);
  const [rmList, setRmList] = useState([]);
  const [rmLoading, setRmLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [uploadProspect, setUploadProspect] = useState({
    reference: '',
    com_id: '',
    location: '',
  });

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState();
  const [filters, setFilters] = useState({
    fromDate: null,
    toDate: null,
    project: null,
    location: null,
  });

  const filterAnim = useRef(new Animated.Value(screenHeight)).current;

  const userRole = useSelector(state => state.userRole);
  const isAdmin = userRole?.includes('ADMIN');

  useEffect(() => { fetchRMList(); }, []);

  // ── Bottom Sheet ──
  const openFilterModal = () => {
    setShowFilterModal(true);
    Animated.spring(filterAnim, { toValue: 0, useNativeDriver: true, damping: 15 }).start();
  };

  const closeFilterModal = () => {
    Animated.timing(filterAnim, { toValue: screenHeight, duration: 280, useNativeDriver: true })
      .start(() => setShowFilterModal(false));
  };

  // ── Date ──
  const formatDate = date => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const onDateChange = (event, selectedDate, key) => {
    key === 'fromDate' ? setShowFromPicker(false) : setShowToPicker(false);
    if (selectedDate) onFilterChange(key, formatDate(selectedDate));
  };

  // ── RM List ──
  const fetchRMList = async () => {
    setRmLoading(true);
    try {
      const res = await api.get('/api/pm/getAllRM');
      if (res?.data?.success) setRmList(res.data.data || []);
    } catch (error) {
      console.log('RM fetch error:', error);
    } finally {
      setRmLoading(false);
    }
  };

  // ── Queries ──
  const { data: AllReferences } = useQuery({
    queryKey: ['AllReferences'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllMrReferences');
      return res?.data?.data;
    },
  });
  const References = AllReferences?.map(item => ({ label: item.mrf_name, value: item.id }));

  const { data: allCompanies } = useQuery({
    queryKey: ['allOwnCompany'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getOwnCompany');
      return res.data.data || [];
    },
  });
  const Company = allCompanies?.map(item => ({ label: item.com_name, value: item.id }));

  const { data: AllProperty } = useQuery({
    queryKey: ['AllProperty'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLocation');
      return res.data.data;
    },
  });
  const Property = AllProperty?.map(item => ({ label: item.name, value: item.id }));

  const { data: projectList = [] } = useQuery({
    queryKey: ['project'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyProjects');
      return res.data.data || [];
    },
  });
  const projectOptions = projectList?.map(item => ({ label: item.project_name, value: item.id }));

  const { data: Rm, isLoading, refetch: rmrefetch } = useQuery({
    queryKey: ['AssignRm', appliedFilters],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLeadWithoutRM', {
        params: {
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          project: filters.project || undefined,
          location: filters.location || undefined,
        },
      });
      return res?.data;
    },
  });

  const filteredrm = Rm?.data?.filter(item => {
    const search = searchText.toLowerCase();
    return (
      (item?.name?.toLowerCase() || '').includes(search) ||
      (item?.propertylead?.phone || '').includes(search) ||
      (item?.propertylead?.email?.toLowerCase() || '').includes(search)
    );
  });

  const selectedLeadIds = selected.map(index => Rm?.data?.[index]?.id);

  // ── Assign RM ──
  const handleAssignRM = async () => {
    if (!selectedRM) { Alert.alert('Please select an RM'); return; }
    if (selectedLeadIds.length === 0) { Alert.alert('No leads selected'); return; }
    setAssigning(true);
    try {
      const res = await api.put('/api/pm/assignRM', {
        rm_id: selectedRM,
        property_lead_id: selectedLeadIds,
      });
      if (res?.data?.status) {
        Alert.alert(res?.data?.message || 'RM Assigned Successfully!');
        setShowModal(false);
        setSelected([]);
        setSelectedRM(null);
        rmrefetch();
      } else {
        Alert.alert(res?.data?.message || 'Failed to assign RM');
      }
    } catch (error) {
      Alert.alert('Something went wrong');
    } finally {
      setAssigning(false);
    }
  };

  // ── Select ──
  const toggleSelect = index => {
    setSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const toggleSelectAll = () => {
    if (selected.length === Rm?.data?.length) setSelected([]);
    else setSelected(Rm?.data?.map((_, i) => i));
  };

  const isAllSelected = selected.length === Rm?.data?.length && Rm?.data?.length > 0;

  // ── Delete ──
  const handleDeleteProspect = (id, status) => {
    Alert.alert('Are you sure?', 'This lead will be deleted permanently.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Delete', style: 'destructive', onPress: () => deleteProspect({ id, status }) },
    ], { cancelable: true });
  };

  const { mutate: deleteProspect } = useMutation({
    mutationFn: ({ id, status }) =>
      api.put('/api/pm/changePropertyLeadStatus', { property_lead_id: id, active: status }),
    onSuccess: () => rmrefetch(),
  });

  // ── Upload ──
  const handleDownloadFormat = async () => {
    const fileName = 'mulyam_new.xlsx';
    const destPath = `${RNFS.ExternalDirectoryPath}/${fileName}`;
    try {
      if (Platform.OS === 'android' && Platform.Version < 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }
      await RNFS.copyFileAssets(fileName, destPath);
      await notifee.createChannel({ id: 'download', name: 'Downloads', importance: AndroidImportance.HIGH });
      await notifee.displayNotification({
        title: 'Download Complete ✅',
        body: 'Tap to open file',
        android: { channelId: 'download', pressAction: { id: 'open-file' } },
        data: { path: destPath },
      });
    } catch (err) {
      console.log('Download Error:', err);
    }
  };

  const pickExcelFile = async () => {
    try {
      const [file] = await pick({ type: [types.xls, types.xlsx, types.csv] });
      if (file) setSelectedFile({ uri: file.uri, type: file.type, name: file.name });
    } catch (err) {
      console.log('Pick error:', err);
    }
  };

  const handleUpload = async () => {
    if (!uploadProspect.reference || !uploadProspect.com_id || !selectedFile) {
      Alert.alert('Error', 'Please select Reference, Company and File');
      return;
    }
    const formData = new FormData();
    formData.append('excelUpload', { uri: selectedFile.uri, type: selectedFile.type, name: selectedFile.name });
    formData.append('reference', String(uploadProspect.reference));
    formData.append('com_id', String(uploadProspect.com_id));
    formData.append('location', String(uploadProspect.location || ''));
    try {
      await api.post('/api/pm/uploadPropertyLeadFromExcel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadProspect({ reference: '', com_id: '', location: '' });
      setSelectedFile(null);
      setShowUploadModal(false);
      rmrefetch();
    } catch (err) {
      console.log('UPLOAD ERROR:', err?.response?.data || err);
    }
  };

  const onChange = (key, value) => {
    setUploadProspect(prev => ({ ...prev, [key]: value }));
  };

  const onFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilter = () => { setAppliedFilters(filters); closeFilterModal(); };

  const resetFilters = () => {
    const cleared = { fromDate: null, toDate: null, project: null, location: null };
    setFilters(cleared);
    setAppliedFilters(cleared);
    closeFilterModal();
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0A0F2E" />

        {/* ── Header pinned to top ── */}
        <Header />

        {/* ── Section Header ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="account-details" size={16} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>Assign RM</Text>
            {Rm?.totalRecords ? (
              <View style={styles.recordBadge}>
                <Text style={styles.recordText}>{Rm.totalRecords} Records</Text>
              </View>
            ) : null}
          </View>
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

        {/* ── Action Buttons Row ── */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              if (selected.length === 0) { Alert.alert('Please select at least one lead'); return; }
              setShowModal(true);
            }}
            activeOpacity={0.75}
          >
            <Icon name="person-add" size={13} color="#fff" />
            <Text style={styles.actionBtnText}>Assign RM</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Rmform')}
            activeOpacity={0.75}
          >
            <Icon name="add" size={13} color="#fff" />
            <Text style={styles.actionBtnText} numberOfLines={1} adjustsFontSizeToFit>
              Add New Lead
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowUploadModal(true)}
            activeOpacity={0.75}
          >
            <Icon name="upload-file" size={13} color="#fff" />
            <Text style={styles.actionBtnText} numberOfLines={1} adjustsFontSizeToFit>
              Upload List
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Scrollable Content ── */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Search */}
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

          {/* Select All + Filter */}
          <View style={styles.selectAllRow}>
            <TouchableOpacity style={styles.selectAllLeft} onPress={toggleSelectAll}>
              <View style={[styles.checkbox, isAllSelected && styles.checkboxChecked]}>
                {isAllSelected && <Icon name="check" size={11} color="#fff" />}
              </View>
              <Text style={styles.selectAllText}>
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </Text>
              {selected.length > 0 && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>{selected.length} selected</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterBtn} onPress={openFilterModal}>
              <Icon name="filter-list" size={13} color="#fff" />
              <Text style={styles.filterBtnText}>By Details</Text>
              <Icon name="keyboard-arrow-down" size={13} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Lead Cards */}
          {isLoading ? (
            <Text style={styles.centeredText}>Loading...</Text>
          ) : filteredrm?.length === 0 ? (
            <Text style={styles.centeredText}>No leads found</Text>
          ) : (
            filteredrm?.map((item, index) => {
              const isChecked = selected.includes(index);
              return (
                <View
                  key={item.id}
                  style={[styles.card, isChecked && styles.cardSelected]}
                >
                  {/* Card Top */}
                  <View style={styles.cardTop}>
                    <View style={styles.nameRow}>
                      <TouchableOpacity
                        onPress={() => toggleSelect(index)}
                        style={[styles.checkbox, isChecked && styles.checkboxChecked]}
                      >
                        {isChecked && <Icon name="check" size={11} color="#fff" />}
                      </TouchableOpacity>
                      <View style={styles.nameIndicator} />
                      <Text style={styles.cardName}>{item.name} |{' '}
                        <Text style={styles.section}>
                          {item?.propertyproject?.project_name}
                        </Text></Text>
                    </View>
                    <View style={styles.iconRow}>
                      <TouchableOpacity
                        onPress={() => handleDeleteProspect(item?.id, item?.active == 1 ? 0 : 1)}
                      >
                        <Icon name="delete" size={16} color={COLORS.red} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('MeetingsEdit', { id: item?.id })}
                      >
                        <Icon name="edit" size={16} color={COLORS.accent} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <Text style={styles.sectionLabel}>Contact Details:</Text>

                  <View style={styles.contactRow}>
                    <View style={styles.contactItem}>
                      <Icon name="call" size={12} color={COLORS.accent} />
                      <Text style={styles.infoText} onPress={() => makeCall(item?.phone)}>
                        {item?.phone || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.contactItem}>
                      <Icon name="email" size={12} color={COLORS.accent} />
                      <Text style={styles.infoText} numberOfLines={1}>
                        {item?.email || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Icon name="location-on" size={12} color={COLORS.gold} />
                    <Text style={styles.infoText}>{item?.address || 'N/A'}</Text>
                  </View>

                  <View style={styles.refRow}>
                    <Text style={styles.refLabel}>Reference: </Text>
                    <Text style={styles.refValue}>{item?.mrreference?.mrf_name || 'N/A'}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* ── Assign RM Modal ── */}
        {showModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assign RM</Text>
                <TouchableOpacity onPress={() => { setShowModal(false); setSelectedRM(null); }}>
                  <Icon name="close" size={20} color={COLORS.mutedText} />
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <Icon name="people" size={14} color={COLORS.gold} />
                <Text style={styles.infoBoxText}>
                  {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
                </Text>
              </View>

              <Text style={styles.rmLabel}>Select RM</Text>

              {rmLoading ? (
                <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} />
              ) : (
                <ScrollView
                  style={styles.dropdownList}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {rmList.length === 0 ? (
                    <Text style={styles.noRMText}>No RM found</Text>
                  ) : (
                    rmList.map(rm => {
                      const isSelected = selectedRM === rm.id;
                      return (
                        <TouchableOpacity
                          key={rm.id}
                          style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                          onPress={() => setSelectedRM(rm.id)}
                        >
                          <View style={styles.rmItemLeft}>
                            <View style={[styles.rmRadio, isSelected && styles.rmRadioSelected]}>
                              {isSelected && <View style={styles.rmRadioInner} />}
                            </View>
                            <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                              {rm.name}
                            </Text>
                          </View>
                          {isSelected && <Icon name="check-circle" size={16} color={COLORS.accent} />}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              )}

              {selectedRM && (
                <View style={styles.selectedRMBadge}>
                  <Icon name="person-pin" size={14} color={COLORS.accent} />
                  <Text style={styles.selectedRMText}>
                    {rmList.find(r => r.id === selectedRM)?.name}
                  </Text>
                </View>
              )}

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setShowModal(false); setSelectedRM(null); }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.assignBtn, (!selectedRM || assigning) && styles.assignBtnDisabled]}
                  onPress={handleAssignRM}
                  disabled={!selectedRM || assigning}
                >
                  {assigning
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.assignBtnText}>Assign</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Upload Modal ── */}
        {showUploadModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.uploadModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload Files</Text>
                <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                  <Icon name="close" size={20} color={COLORS.mutedText} />
                </TouchableOpacity>
              </View>

              <View style={styles.formBox}>
                <DropdownField
                  label="Location of Property *"
                  data={Property}
                  placeholder="Select"
                  value={uploadProspect.location}
                  onChange={value => onChange('location', value)}
                />
                <DropdownField
                  label="Reference *"
                  data={References}
                  placeholder="Select"
                  value={uploadProspect.reference}
                  onChange={value => onChange('reference', value)}
                />
                {isAdmin && (
                  <DropdownField
                    label="Company *"
                    data={Company}
                    placeholder="Select"
                    value={uploadProspect.com_id}
                    onChange={value => onChange('com_id', value)}
                  />
                )}
                <View style={styles.uploadRow}>
                  <TouchableOpacity style={styles.browseBtn} onPress={pickExcelFile}>
                    <Icon name="folder-open" size={15} color="#fff" />
                    <Text style={styles.browseText} numberOfLines={1}>
                      {selectedFile ? selectedFile.name : 'Browse file...'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
                    <Text style={styles.uploadBtnText}>Upload</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.downloadCard}>
                <Text style={styles.downloadTitle}>Download Format</Text>
                <Text style={styles.downloadDesc}>
                  Download the template file to prepare your lead data for upload.
                </Text>
                <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadFormat}>
                  <Icon name="download" size={15} color="#000" />
                  <Text style={styles.downloadBtnText}>Download</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.cancelBtnBottom}
                onPress={() => setShowUploadModal(false)}
              >
                <Text style={styles.cancelBtnBottomText}>Cancel</Text>
              </TouchableOpacity>
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
              style={[styles.bottomSheet, { transform: [{ translateY: filterAnim }] }]}
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

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                <DropdownField
                  label="Property Location"
                  data={Property}
                  placeholder="Select location"
                  value={filters.location}
                  onChange={value => onFilterChange('location', value)}
                />
                <DropdownField
                  label="Project"
                  data={projectOptions}
                  placeholder="Select project"
                  value={filters.project}
                  onChange={value => onFilterChange('project', value)}
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
        <BottomNav style={{ paddingBottom: insets.bottom }} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AssignRM;

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Layout ──
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
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
    flex: 1,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  recordBadge: {
    backgroundColor: COLORS.goldDim,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  recordText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '600',
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
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

  // ── Action Buttons ──
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(58,63,122,0.85)',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    minHeight: 36,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Search ──
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
    marginTop: 2,
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
    flex: 1,
    flexShrink: 1,
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
    flexShrink: 0,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  nameIndicator: {
    width: 3,
    height: 15,
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  cardName: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
  },
  sectionLabel: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  infoText: {
    color: COLORS.mutedText,
    fontSize: 11,
    flexShrink: 1,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  refLabel: {
    color: COLORS.labelText,
    fontSize: 11,
    fontWeight: '600',
  },
  refValue: {
    color: COLORS.white,
    fontSize: 11,
  },

  // ── Assign RM Modal ──
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  rmRadioSelected: { borderColor: COLORS.accent },
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
  assignBtnDisabled: { backgroundColor: 'rgba(0,207,255,0.3)' },
  assignBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Upload Modal ──
  uploadModalContainer: {
    width: '90%',
    backgroundColor: COLORS.modalBg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  formBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: COLORS.borderColor,
  },
  uploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
  },
  browseText: {
    color: '#fff',
    fontSize: 11,
    flex: 1,
  },
  uploadBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  uploadBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  downloadCard: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: COLORS.borderColor,
  },
  downloadTitle: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  downloadDesc: {
    color: COLORS.mutedText,
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 16,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  downloadBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 12,
  },
  cancelBtnBottom: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
  },
  cancelBtnBottomText: {
    color: COLORS.red,
    fontWeight: '600',
    fontSize: 13,
  },

  // ── Filter Bottom Sheet ──
  bottomSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  dropLabel: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 5,
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
  itemContainer: {
    paddingVertical: 0,
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
   section:{
    color:'rgba(0, 208, 255, 0.84)'
  }
});