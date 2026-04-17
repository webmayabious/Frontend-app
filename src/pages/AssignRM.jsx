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
} from 'react-native';
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
import { PermissionsAndroid, Platform, NativeModules } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const screenHeight = Dimensions.get('window').height;
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
        value={value} // ✅ from parent
        itemContainerStyle={styles.itemContainer}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={item => {
          setIsFocus(false);
          onChange && onChange(item.value); // ✅ update parent form
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
            pointerEvents={onPress ? 'none' : 'auto'}
          />
          {icon && (
            <TouchableOpacity onPress={onPress}>
              <Icon name={icon} size={18} color="#00bcd4" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};
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

  useEffect(() => {
    console.log(uploadProspect);
  }, [uploadProspect]);
  useEffect(() => {
    fetchRMList();
  }, []);
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

  // ── Bottom Sheet Animation ──
  const filterAnim = useRef(new Animated.Value(screenHeight)).current;

  const openFilterModal = () => {
    setShowFilterModal(true);
    Animated.spring(filterAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 15,
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
  const userRole = useSelector(state => state.userRole);
  const isAdmin = userRole?.includes('ADMIN');
  const fetchRMList = async () => {
    setRmLoading(true);
    try {
      // ✅ তোমার RM list API endpoint এখানে বসাও
      const res = await api.get('/api/pm/getAllRM');
      console.log('res', res.data.data);

      if (res?.data?.success) {
        setRmList(res.data.data || []);
      }
    } catch (error) {
      console.log('RM fetch error:', error);
    } finally {
      setRmLoading(false);
    }
  };
  const { data: AllReferences } = useQuery({
    queryKey: ['AllReferences'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllMrReferences');
      return res?.data?.data;
    },
  });
  const References = AllReferences?.map(item => ({
    label: item.mrf_name,
    value: item.id,
  }));
  const { data: allCompanies } = useQuery({
    queryKey: ['allOwnCompany'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getOwnCompany');
      return res.data.data || [];
    },
  });
  const Company = allCompanies?.map(item => ({
    label: item.com_name,
    value: item.id,
  }));
  // *************************************** get all  AllPropertyLocation  ***************************************//
  const { data: AllProperty, isLoading: AllPropertyLoading } = useQuery({
    queryKey: ['AllProperty'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLocation');
      console.log('Projects:', res.data.data);
      return res.data.data;
    },
  });
  const Property = AllProperty?.map(item => ({
    label: item.name,
    value: item.id,
  }));
  /* ================= PROJECTS ================= */
  const { data: projectList = [] } = useQuery({
    queryKey: ['project'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyProjects');
      return res.data.data || [];
    },
  });
  const projectOptions = projectList?.map(item => ({
    label: item.project_name,
    value: item.id,
  }));
  /* ================= API ================= */
  const {
    data: Rm,
    isLoading,
    refetch: rmrefetch,
  } = useQuery({
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
    const name = item?.name?.toLowerCase() || '';
    const phone = item?.propertylead?.phone || '';
    const email = item?.propertylead?.email?.toLowerCase() || '';

    const search = searchText.toLowerCase();

    return (
      name.includes(search) || phone.includes(search) || email.includes(search)
    );
  });
  // ✅ Selected leads এর actual ID array
  const selectedLeadIds = selected.map(index => Rm?.data?.[index]?.id);

  const handleAssignRM = async () => {
    if (!selectedRM) {
      Alert.alert('Please select an RM');
      return;
    }
    if (selectedLeadIds.length === 0) {
      Alert.alert('No leads selected');
      return;
    }
    setAssigning(true);
    try {
      // ✅ Exact payload: { rm_id: 1110, property_lead_id: [1234567963] }
      const payload = {
        rm_id: selectedRM,
        property_lead_id: selectedLeadIds,
      };
      console.log('Assign payload:', payload);

      const res = await api.put('/api/pm/assignRM', payload);

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
      console.log('Assign RM error:', error);
      Alert.alert('Something went wrong');
    } finally {
      setAssigning(false);
    }
  };

  const toggleSelect = index => {
    setSelected(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index],
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === Rm?.data?.length) {
      setSelected([]);
    } else {
      setSelected(Rm?.data?.map((_, i) => i));
    }
  };

  const isAllSelected =
    selected.length === Rm?.data?.length && Rm?.data?.length > 0;
  const handleDeleteProspect = (id, status) => {
    Alert.alert(
      'Are you sure?', // Title
      'This lead will be deleted permanently.', // Message
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: () => deleteProspect({ id, status }),
        },
      ],
      { cancelable: true },
    );
  };

  const { mutate: deleteProspect, isPending: isProspectDeleting } = useMutation(
    {
      mutationFn: ({ id, status }) => {
        return api.put(`/api/pm/changePropertyLeadStatus`, {
          property_lead_id: id,
          active: status,
        });
      },
      onSuccess: data => {
        rmrefetch();
      },
      onError: error => {
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          'Something went wrong';
      },
    },
  );
  const handleDownloadFormat = async () => {
    const fileName = 'mulyam_new.xlsx';
    const destPath = `${RNFS.ExternalDirectoryPath}/${fileName}`;
    // const destPath = `${RNFS.ExternalDirectoryPath}/mulyam_new.xlsx`;
    // const destPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
    try {
      // 1️⃣ Request storage permission on Android
      if (Platform.OS === 'android' && Platform.Version < 33) {
        // Android < 13
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs permission to save files',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Storage permission denied');
          return;
        }
      }

      // 2️⃣ Copy file from assets to Downloads
      await RNFS.copyFileAssets(fileName, destPath);
      const exists = await RNFS.exists(destPath);
      if (!exists) {
        console.log('File copy failed! File not found at:', destPath);
        return;
      }
      console.log('File copied to:', destPath);

      // 3️⃣ Create notification channel (only once)
      await notifee.createChannel({
        id: 'download',
        name: 'Downloads',
        importance: AndroidImportance.HIGH,
      });

      // 4️⃣ Show notification with file path
      await notifee.displayNotification({
        title: 'Download Complete ✅',
        body: 'Tap to open file',
        android: {
          channelId: 'download',
          pressAction: { id: 'open-file' },
        },
        data: { path: destPath },
      });

      console.log('Notification displayed successfully');
    } catch (err) {
      console.log('Download Error:', err);
    }
  };

  const pickExcelFile = async () => {
    try {
      const [file] = await pick({
        type: [types.xls, types.xlsx, types.csv],
      });
      if (file)
        setSelectedFile({ uri: file.uri, type: file.type, name: file.name });
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

    formData.append('excelUpload', {
      uri: selectedFile.uri,
      type: selectedFile.type,
      name: selectedFile.name,
    });

    formData.append('reference', String(uploadProspect.reference));
    formData.append('com_id', String(uploadProspect.com_id));
    formData.append('location', String(uploadProspect.location || ''));

    console.log('UPLOAD PAYLOAD:', {
      reference: uploadProspect.reference,
      com_id: uploadProspect.com_id,
    });

    try {
      const res = await api.post(
        '/api/pm/uploadPropertyLeadFromExcel',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      console.log('UPLOAD SUCCESS', res.data);
      setUploadProspect({
        reference: '',
        com_id: '',
        location: '',
      });
      setSelectedFile(null);
      setShowUploadModal(false);
      rmrefetch();
    } catch (err) {
      console.log('UPLOAD ERROR:', err?.response?.data || err);
    }
  };
  const onChange = (key, value) => {
    setUploadProspect(prev => ({
      ...prev,
      [key]: value,
    }));
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  /* ================= FILTER HANDLERS ================= */

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
  /* ================= CALL ================= */
  const makeCall = phoneNumber => {
    if (!phoneNumber) return;
    Alert.alert('Call', `Do you want to call ${phoneNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL(`tel:${phoneNumber}`) },
    ]);
  };
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" />
        <Header />

        <View style={[styles.topBarContainer, { paddingTop: 10 }]}>
          <View style={styles.topBar}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons
                name="account-details"
                size={18}
                color="#00cfff"
              />
              <Text style={styles.title}>Assign RM</Text>
              <View style={styles.badge}>
                <Text style={styles.total}>{Rm?.totalRecords} Records</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Dashboard')}
              style={styles.backBtn}
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

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => {
              if (selected.length === 0) {
                Alert.alert('Please select at least one lead');
                return;
              }
              setShowModal(true);
            }}
          >
            <Text style={styles.btnText}>Assign RM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => navigation.navigate('Rmform')}
          >
            <Text style={styles.btnText} numberOfLines={1} adjustsFontSizeToFit>
              Add New Lead
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn}>
            <Text
              style={styles.btnText}
              numberOfLines={1}
              adjustsFontSizeToFit
              onPress={() => setShowUploadModal(true)}
            >
              Upload Lead Info List
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingBottom: 10,
            paddingBottom: insets.bottom + 80,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          <View style={styles.selectAllRow}>
            {/* LEFT SIDE */}
            <View style={styles.selectAllLeft}>
              <TouchableOpacity
                style={styles.selectAllLeft}
                onPress={toggleSelectAll}
              >
                <View
                  style={[
                    styles.checkbox,
                    isAllSelected && styles.checkboxChecked,
                  ]}
                >
                  {isAllSelected && (
                    <Icon name="check" size={12} color="#fff" />
                  )}
                </View>

                <Text style={styles.selectAllText}>
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </Text>

                {selected.length > 0 && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>
                      {selected.length} selected
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* RIGHT SIDE (FIXED) */}
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={openFilterModal}
            >
              <Icon name="filter-list" size={14} color="#fff" />
              <Text style={styles.filterText}>By Details</Text>
              <Icon name="keyboard-arrow-down" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
              Loading...
            </Text>
          ) : (
            filteredrm?.map((item, index) => {
              const isChecked = selected.includes(index);
              return (
                <View
                  key={item.id}
                  style={[styles.card, isChecked && styles.cardSelected]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.nameRow}>
                      <TouchableOpacity
                        onPress={() => toggleSelect(index)}
                        style={[
                          styles.checkbox,
                          isChecked && styles.checkboxChecked,
                        ]}
                      >
                        {isChecked && (
                          <Icon name="check" size={12} color="#fff" />
                        )}
                      </TouchableOpacity>
                      <View style={styles.nameIndicator} />
                      <Text style={styles.name}>{item.name}</Text>
                    </View>
                    <View style={styles.iconRow}>
                      <Icon
                        name="delete"
                        size={16}
                        color="#ff4444"
                        onPress={() =>
                          handleDeleteProspect(
                            item?.id,
                            item?.active == 1 ? 0 : 1,
                          )
                        }
                      />
                      <Icon
                        name="edit"
                        size={16}
                        color="#00cfff"
                        onPress={() =>
                          navigation.navigate('MeetingsEdit', {
                            id: item?.id,
                          })
                        }
                      />
                    </View>
                  </View>

                  <View style={styles.divider} />
                  <Text style={styles.section}>Contact Details:</Text>

                  <View style={styles.contactRow}>
                    <View style={styles.contactItem}>
                      <Icon name="call" size={13} color="#00cfff" />
                      <Text
                        style={styles.text}
                        onPress={() => makeCall(item?.phone)}
                      >
                        {item?.phone}
                      </Text>
                    </View>
                    <View style={styles.contactItem}>
                      <Icon name="email" size={13} color="#00cfff" />
                      <Text style={styles.text} numberOfLines={1}>
                        {item.email}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <Icon name="location-on" size={13} color="#00cfff" />
                    <Text style={styles.text}>{item.address || 'N/A'}</Text>
                  </View>

                  <View style={styles.refRow}>
                    <Text style={styles.refLabel}>Reference: </Text>
                    <Text style={styles.refValue}>
                      {item?.mrreference?.mrf_name || 'N/A'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* ✅ ASSIGN RM MODAL */}
        {showModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assign RM</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowModal(false);
                    setSelectedRM(null);
                  }}
                >
                  <Icon name="close" size={20} color="#aaa" />
                </TouchableOpacity>
              </View>

              {/* Selected leads count info */}
              <View style={styles.infoBox}>
                <Icon name="people" size={14} color="#f4c542" />
                <Text style={styles.infoText}>
                  {selectedLeadIds.length} lead
                  {selectedLeadIds.length > 1 ? 's' : ''} selected
                </Text>
              </View>

              <Text style={styles.label}>Select RM</Text>

              {rmLoading ? (
                <ActivityIndicator
                  color="#00cfff"
                  style={{ marginVertical: 20 }}
                />
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
                          style={[
                            styles.dropdownItem,
                            isSelected && styles.dropdownItemSelected,
                          ]}
                          onPress={() => setSelectedRM(rm.id)}
                        >
                          <View style={styles.rmItemLeft}>
                            <View
                              style={[
                                styles.rmRadio,
                                isSelected && styles.rmRadioSelected,
                              ]}
                            >
                              {isSelected && (
                                <View style={styles.rmRadioInner} />
                              )}
                            </View>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                isSelected && styles.dropdownItemTextSelected,
                              ]}
                            >
                              {rm.name}
                            </Text>
                          </View>
                          {isSelected && (
                            <Icon
                              name="check-circle"
                              size={16}
                              color="#00cfff"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              )}

              {selectedRM && (
                <View style={styles.selectedRMBadge}>
                  <Icon name="person-pin" size={14} color="#00cfff" />
                  <Text style={styles.selectedRMText}>
                    {rmList.find(r => r.id === selectedRM)?.name}
                  </Text>
                </View>
              )}

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowModal(false);
                    setSelectedRM(null);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.assignBtn,
                    (!selectedRM || assigning) && styles.assignBtnDisabled,
                  ]}
                  onPress={handleAssignRM}
                  disabled={!selectedRM || assigning}
                >
                  {assigning ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.assignBtnText}>Assign</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        {showUploadModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.uploadModalContainer}>
              {/* HEADER */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload Files</Text>
                <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                  <Icon name="close" size={20} color="#aaa" />
                </TouchableOpacity>
              </View>
              <View style={styles.formBox}>
                {/* FORM */}
                <DropdownField
                  label="Location of Property *"
                  data={Property}
                  placeholder="Select"
                  value={uploadProspect.location}
                  onChange={value => onChange('location', value)}
                />

                {/* Reference */}

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

                {/* Upload Row */}
                <View style={styles.uploadRow}>
                  <TouchableOpacity
                    style={styles.browseBtn}
                    onPress={pickExcelFile}
                  >
                    <Icon name="folder-open" size={16} color="#fff" />
                    <Text style={styles.browseText}>
                      {selectedFile ? selectedFile.name : 'Browse file...'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={handleUpload}
                  >
                    <Text style={styles.uploadBtnText}>Upload</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* DOWNLOAD BOX */}
              <View style={styles.downloadCard}>
                <Text style={styles.downloadTitle}>Download Format</Text>
                <Text style={styles.downloadDesc}>
                  It is a long established fact that a reader will be distracted
                  by readable content.
                </Text>

                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={handleDownloadFormat}
                >
                  <Icon name="download" size={16} color="#000" />
                  <Text style={styles.downloadBtnText}>Download</Text>
                </TouchableOpacity>
              </View>

              {/* FOOTER */}
              <TouchableOpacity
                style={styles.cancelBtnBottom}
                onPress={() => setShowUploadModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
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
              style={[
                styles.bottomSheet,
                { transform: [{ translateY: filterAnim }] },
              ]}
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
                <Text style={styles.filterLabel}>Project</Text>
                <DropdownField
                  data={projectOptions}
                  placeholder="Select project"
                  value={filters.project}
                  onChange={value => onChange('project', value)}
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
              </ScrollView>

              {showFromPicker && (
                <DateTimePicker
                  value={
                    filters.fromDate ? new Date(filters.fromDate) : new Date()
                  }
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
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={resetFilters}
                >
                  <Icon name="refresh" size={14} color="#ff5252" />
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
                <View style={styles.filterActionBtns}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={closeFilterModal}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={applyFilter}
                  >
                    <Icon name="check" size={14} color="#fff" />
                    <Text style={styles.applyBtnText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </View>
        )}
        <BottomNav style={{ paddingBottom: insets.bottom }} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AssignRM;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f4a' },
  topBarContainer: { paddingHorizontal: 15, marginTop: 10, marginBottom: 6 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff15',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    flexShrink: 1,
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  badge: {
    backgroundColor: '#f4c54220',
    borderWidth: 1,
    borderColor: '#f4c54255',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  total: { color: '#f4c542', fontSize: 11, fontWeight: '500' },
  backBtn: {
    borderWidth: 1,
    borderColor: '#ffffff40',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#ffffff10',
    marginLeft: 8,
  },
  backText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  btn: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#3a3f7a',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  btnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 20,
    paddingHorizontal: 10,
    flex: 1,
    height: 38,
    marginBottom: 10,
  },
  input: { color: '#fff', marginLeft: 5, flex: 1, fontSize: 13 },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  filterBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  selectAllLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // 👈 important
    flexShrink: 1, // 👈 prevents overflow pushing right side
    gap: 8,
  },

  selectAllText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  selectedBadge: {
    backgroundColor: '#00cfff22',
    borderWidth: 1,
    borderColor: '#00cfff55',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  selectedBadgeText: { color: '#00cfff', fontSize: 11, fontWeight: '500' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#3a3f7a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffffff20',
    flexShrink: 0, // 👈 keeps it fixed right
  },
  filterText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  card: {
    backgroundColor: '#1e2260',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,

    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },

    // Android
    elevation: 4,
  },
  cardSelected: { borderColor: '#00cfff55', backgroundColor: '#1a2a6a' },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff60',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: { backgroundColor: '#00cfff', borderColor: '#00cfff' },
  nameIndicator: {
    width: 4,
    height: 16,
    backgroundColor: '#00cfff',
    borderRadius: 4,
  },
  name: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  iconRow: { flexDirection: 'row', gap: 12 },
  divider: { height: 1, backgroundColor: '#ffffff15', marginBottom: 8 },
  section: {
    color: '#f4c542',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    gap: 8,
  },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  text: { color: '#ccc', fontSize: 11, flexShrink: 1 },
  refRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  refLabel: { color: '#f4c542', fontSize: 11, fontWeight: '600' },
  refValue: { color: '#fff', fontSize: 11 },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#1e2260',
    borderRadius: 20,
    padding: 16,
    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },

    // Android
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { color: '#00cfff', fontSize: 16, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f4c54215',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f4c54230',
  },
  infoText: { color: '#f4c542', fontSize: 12, fontWeight: '500' },
  label: { color: '#fff', marginBottom: 8, fontSize: 13, fontWeight: '500' },
  dropdownList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ffffff20',
    borderRadius: 8,
    marginBottom: 12,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ffffff10',
  },
  dropdownItemSelected: { backgroundColor: '#00cfff12' },
  rmItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rmRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ffffff40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rmRadioSelected: { borderColor: '#00cfff' },
  rmRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00cfff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff10',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  dropdownItemText: { color: '#bbb', fontSize: 13 },
  dropdownItemTextSelected: { color: '#00cfff', fontWeight: '600' },
  noRMText: { color: '#aaa', textAlign: 'center', padding: 20, fontSize: 13 },
  selectedRMBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00cfff12',
    borderWidth: 1,
    borderColor: '#00cfff35',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
  },
  selectedRMText: { color: '#00cfff', fontSize: 12, fontWeight: '600' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: {
    backgroundColor: '#ffffff15',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffffff25',
  },
  backButton: {
  flexDirection: 'row',
  alignItems: 'center',
},
  cancelBtnText: { color: '#fff', fontWeight: '500', fontSize: 13 },
  assignBtn: {
    backgroundColor: '#00cfff',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  assignBtnDisabled: { backgroundColor: '#00cfff40' },
  assignBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  modalOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  uploadModalContainer: {
    width: '88%',
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffffff20',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  modalTitle: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '700',
  },

  formBox: {
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  label: {
    color: '#9ca3af',
    fontSize: 11,
    marginBottom: 4,
    marginTop: 6,
  },

  inputBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: '#374151',
  },

  inputValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },

  placeholder: {
    color: '#6b7280',
    fontSize: 13,
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

  dropdownContainer: {
    backgroundColor: '#FFFF',
    borderRadius: 10,
    elevation: 8,
  },

  placeholderStyle: {
    color: '#bbb',
    fontSize: 13,
  },

  selectedTextStyle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  itemContainer: {
    paddingVertical: 0,
  },

  itemText: {
    color: '#0b0b0b',
    fontSize: 13,
    fontWeight: '500',
  },
  uploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 25,
  },

  browseText: {
    color: '#fff',
    fontSize: 12,
  },

  uploadBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 25,
  },

  uploadBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  downloadCard: {
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },

  downloadTitle: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },

  downloadDesc: {
    color: '#9ca3af',
    fontSize: 11,
    marginBottom: 10,
  },

  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },

  downloadBtnText: {
    color: '#000',
    fontWeight: '500',
  },

  cancelBtnBottom: {
    marginTop: 14,
    alignSelf: 'flex-end',
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  bottomSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },

  bottomSheet: {
    backgroundColor: '#1e2260',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '85%',
  },

  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 10,
  },

  filterDivider: {
    height: 1,
    backgroundColor: '#ffffff20',
    marginVertical: 10,
  },

  filterModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  filterLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  dateField: {
    flex: 1,
  },

  dateSeparator: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  dateSubLabel: {
    color: '#aaa',
    fontSize: 11,
    marginBottom: 4,
  },

  filterBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },

  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  resetBtnText: {
    color: '#ff5252',
    fontSize: 12,
  },

  filterActionBtns: {
    flexDirection: 'row',
    gap: 10,
  },

  cancelBtn: {
    backgroundColor: '#ffffff15',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  cancelBtnText: {
    color: '#fff',
    fontWeight: '500',
  },

  applyBtn: {
    backgroundColor: '#00cfff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  applyBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelText: {
    color: '#fff',
    fontWeight: '500',
  },
});
