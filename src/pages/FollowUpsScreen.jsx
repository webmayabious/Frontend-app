// FollowUpsScreen.js (Fixed - Real server-side infinite scroll with useInfiniteQuery)
import React, { useRef, useState, useEffect } from 'react';
import { Dropdown } from 'react-native-element-dropdown';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  Alert,
  Linking,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../Layout/Header';
import BottomNav from '../navigations/BottomNav';
import { useNavigation } from '@react-navigation/native';
import api from '../api/AxiosInstance';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

const STATUSBAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight : 44;

const makeCall = phoneNumber => {
  if (!phoneNumber) return;

  const cleanNumber = phoneNumber.replace(/\D/g, '');

  Alert.alert('Contact', `Choose an action for ${phoneNumber}`, [
    {
      text: 'Cancel',
      style: 'cancel',
    },
    {
      text: 'WhatsApp',
      onPress: async () => {
        const message = encodeURIComponent('Hello!');
        const appUrl = `whatsapp://send?phone=${cleanNumber}&text=${message}`;
        const webUrl = `https://wa.me/${cleanNumber}?text=${message}`;

        try {
          const supported = await Linking.canOpenURL(appUrl);

          if (supported) {
            await Linking.openURL(appUrl);
          } else {
            // Opens WhatsApp Web or the app if installed
            await Linking.openURL(webUrl);
          }
        } catch (error) {
          Alert.alert('Error', 'Unable to open WhatsApp.');
        }
      },
    },
    {
      text: 'Call',
      onPress: () => Linking.openURL(`tel:${phoneNumber}`),
    },
  ]);
};

const sendMail = async (email) => {
  if (!email) return;

  try {
    if (Platform.OS === 'android') {
      const gmailUrl = `googlegmail://co?to=${email}`;
      const supported = await Linking.canOpenURL(gmailUrl);

      if (supported) {
        await Linking.openURL(gmailUrl);
      } else {
        // Fallback to mailto
        await Linking.openURL(`mailto:${email}`);
      }
    } else {
      // iOS
      await Linking.openURL(`mailto:${email}`);
    }
  } catch (error) {
    Alert.alert('Error', 'Unable to open email app.');
  }
};

/* ================= FORMAT CALL BACK DATE/TIME ================= */
const formatCallBackDateTime = (date, time) => {
  if (!date) return null;

  const d = new Date(date);
  const formattedDate = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (!time) return formattedDate;

  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const formattedTime = `${hour}:${String(m).padStart(2, '0')} ${ampm}`;

  return `${formattedDate}, ${formattedTime}`;
};

const RemarksText = ({ remarks }) => {
  const [expanded, setExpanded] = useState(false);

  const shouldShowReadMore = remarks.length > 80;

  return (
    <Text style={styles.remarksCardText}>
      {expanded || !shouldShowReadMore
        ? remarks
        : `${remarks.substring(0, 80)}... `}

      {shouldShowReadMore && (
        <Text
          style={styles.readMore}
          onPress={() => setExpanded(!expanded)}
        >
          {expanded ? ' Read Less' : ' Read More'}
        </Text>
      )}
    </Text>
  );
};

const FollowCard = ({ data, navigation, setShowRemarks, setRemarksText }) => {
  const remarks = data?.remarks || 'No Remarks Available';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{data?.propertylead?.name}</Text>

          <View
            style={[
              styles.activeBadge,
              {
                backgroundColor: data?.active === '1' ? '#4caf50' : '#f44336',
              },
            ]}
          >
            <Text style={styles.activeText}>
              {data?.active === '1' ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <Icon
            name="edit"
            size={18}
            color="#00e5ff"
            style={{ marginLeft: 8 }}
            onPress={() =>
              navigation.navigate('MeetingsEdit', {
                id: data?.property_lead_id,
              })
            }
          />
        </View>
      </View>

      {/* Info */}
      <Text style={styles.location}>
        {data?.propertylead?.propertyproject?.project_name} |{' '}
        {data?.propertylead?.propertylocation?.name}
      </Text>

      <View style={styles.rowBetween}>
        <TouchableOpacity onPress={() => makeCall(data?.propertylead?.phone)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.label1}>Phone:{' '}</Text>
            <Text style={styles.phoneText}>
              {data?.propertylead?.phone || 'N/A'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.rowBetween}>
        <TouchableOpacity onPress={() => sendMail(data?.propertylead?.email)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.label1}>Email:{' '}</Text>
            <Text style={styles.emailText}>
              {data?.propertylead?.email || 'N/A'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.label}>
          <Text style={styles.label}>
            Site Visit Date:
            <Text style={styles.value}> {data?.site_visit_date}</Text>
          </Text>
        </Text>

        <Text style={styles.label}>
          RM:{' '}
          <Text style={styles.value}>
            {data?.propertylead?.relationshipManager
              ? `${data.propertylead.relationshipManager.usr_fname} ${data.propertylead.relationshipManager.usr_lname}`
              : 'N/A'}
          </Text>
        </Text>
      </View>

      {/* Call Back Date & Time */}
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>
            Call Back:{' '}
            <Text style={styles.value}>
              {formatCallBackDateTime(data?.call_back_date, data?.call_back_time) || 'N/A'}
            </Text>
          </Text>
        </View>
      </View>

      <Text style={{ color: '#fb9e08', fontSize: 12, marginTop: 4 }}>
        Lead Source:{' '}
        <Text style={styles.value}>
          {data?.propertylead?.mrreference?.mrf_name}
        </Text>
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginTop: 8,
        }}
      >
        <Text
          style={{
            color: '#fb9e08',
            fontSize: 12,
            fontWeight: '600',
            marginRight: 5,
          }}
        >
          Remarks:
        </Text>

        <View style={{ flex: 1 }}>
          <RemarksText remarks={remarks} />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate('AllInteractionsScreen', {
              id: data?.property_lead_id,
            })
          }
        >
          <Text style={styles.buttonText}>View Interaction</Text>
        </TouchableOpacity>

        <Text style={styles.completed}>{data?.propertycallstatus?.name}</Text>
      </View>
    </View>
  );
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
            onChangeText={onChange}
            editable={!onPress}
          />

          {icon && <Icon name={icon} size={18} color="#00bcd4" />}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const FollowUpsScreen = () => {
  const navigation = useNavigation();
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    company_id: null,
    rm_id: null,
    fromDate: null,
    toDate: null,
    project: null,
    location: null,
    status: null,
    reference: null,
  });
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState();

  /* ================= API CALL (Real server-side pagination) ================= */
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['TodaysFollowUpsandMeetings', appliedFilters],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get('/api/pm/followUpAndMeetingsData', {
        params: {
          page: pageParam,
          limit: 20,
          company_id: filters.company_id || undefined,
          rm_id: filters.rm_id || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          project: filters.project || undefined,
          location: filters.location || undefined,
          status: filters.status || undefined,
          reference: filters.reference || undefined,
        },
      });
      return res.data.data;
    },
    getNextPageParam: lastPage => {
      const { currentPage, totalPages } = lastPage.pagination || {};
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minute porjonto data "fresh" dhora hobe, tai back kore ashle abar sob page refetch hobe na
    gcTime: 1000 * 60 * 10, // 10 minute cache-e thakbe, screen unmount hoyeo data muche jabe na
    refetchOnMount: false, // screen a re-focus/re-mount hole auto refetch bondho
  });

  // ✅ সব pages থেকে followUps ও meetings flatten করা হচ্ছে
  const followUps = data?.pages?.flatMap(page => page.todays_followUps) || [];
  const meetings = data?.pages?.flatMap(page => page.todays_meetings) || [];

  const filteredfollowUps = followUps.filter(item => {
    const name = item?.propertylead?.name?.toLowerCase() || '';
    const phone = item?.propertylead?.phone || '';
    const email = item?.propertylead?.email?.toLowerCase() || '';
    const project = item?.propertylead?.propertyproject?.project_name?.toLowerCase() || '';
    const remarks = (item?.remarks || 'no remarks available').toLowerCase();
    const search = searchText.toLowerCase();

    return (
      name.includes(search) ||
      phone.includes(search) ||
      email.includes(search) ||
      project.includes(search) ||
      remarks.includes(search)
    );
  });

  const { data: AllProperty } = useQuery({
    queryKey: ['AllProperty'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyLocation');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 10, // filter dropdown data ghono ghono change hoy na, tai 10 minute cache rakha hocche
  });

  // Fetch RMs
  const { data: allRmList = [] } = useQuery({
    queryKey: ['allRMList'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllRM');
      return res?.data?.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fetch Projects
  const { data: projectList = [] } = useQuery({
    queryKey: ['project'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllPropertyProjects');
      return res.data.data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fetch Lead Sources (MR References)
  const { data: mrReferenceList = [] } = useQuery({
    queryKey: ['mrReferenceList'],
    queryFn: async () => {
      const res = await api.get('/api/pm/getAllMrReferences', {
        params: { limit: 'all' },
      });
      return res.data.data || [];
    },
    staleTime: 1000 * 60 * 10,
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
  const leadSourceOptions = mrReferenceList?.map(item => ({
    label: item.mrf_name,
    value: item.id,
  }));

  const LeadStatus = [
    { label: 'Active', value: '1' },
    { label: 'Inactive', value: '2' },
    { label: 'Booking Done', value: '5' },
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
      status: null,
      reference: null,
    };

    setFilters(cleared);
    setAppliedFilters(cleared);
    setShowFilterModal(false);
  };

  const [showTopBtn, setShowTopBtn] = useState(false);
  const scrollRef = useRef();

  const scrollToTop = () => {
    scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* Title Row */}
      <View style={styles.topBarContainer}>
        <View style={styles.topBar}>
          {/* Left */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="phone-callback" size={18} color="#cfd8dc" />
            <Text style={styles.screenTitle}>Remaining  / Total Followups</Text>
          </View>

          {/* Right */}
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
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
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
      </View>

      {/* List - FlatList byabohar kora hocche jate sudhu screen a dekha jawa card gulo render hoy (virtualization), na hole beshi page load hole re-open korte time lagbe */}
      {isLoading ? (
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
          Loading...
        </Text>
      ) : (
        <FlatList
          ref={scrollRef}
          data={filteredfollowUps}
          keyExtractor={(visit, i) => String(visit.id || i)}
          renderItem={({ item }) => (
            <FollowCard
              data={item}
              setShowRemarks={setShowRemarks}
              setRemarksText={setRemarksText}
              navigation={navigation}
            />
          )}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
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
          }
          ListEmptyComponent={
            <Text
              style={{ textAlign: 'center', marginTop: 20, color: '#ffffff' }}
            >
              No data found
            </Text>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 15 }}>
                <ActivityIndicator size="small" color="#00e5ff" />
              </View>
            ) : (
              <View style={{ height: 100 }} />
            )
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          onScroll={event => {
            const y = event.nativeEvent.contentOffset.y;
            setShowTopBtn(y > 200);
          }}
          scrollEventThrottle={16}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={true}
        />
      )}

      {/* ✅ REMARKS MODAL */}
      {showRemarks && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
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

      {/* ✅ FILTER MODAL */}
      {showFilterModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalCard}>
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
                placeholder="Select Location"
                value={filters.location}
                onChange={value => onChange('location', value)}
              />

              <DropdownField
                label="Lead Source"
                data={leadSourceOptions}
                placeholder="Select Lead Source"
                value={filters.reference}
                onChange={value => onChange('reference', value)}
              />

              <DropdownField
                label="Relationship Manager"
                data={Rm}
                placeholder="Select RM"
                value={filters.rm_id}
                onChange={value => onChange('rm_id', value)}
              />

              <DropdownField
                label="Project"
                data={projectOptions}
                placeholder="Select Project"
                value={filters.project}
                onChange={value => onChange('project', value)}
              />

              <DropdownField
                label="Lead Status"
                data={LeadStatus}
                placeholder="Select Status"
                value={filters.status}
                onChange={value => onChange('status', value)}
              />
            </ScrollView>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={applyFilter}
            >
              <Text style={styles.modalCloseText}>Apply Filter</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={resetFilters} style={{ marginTop: 14 }}>
              <Text style={styles.resetText}>Reset All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowFilterModal(false)}
              style={{ marginTop: 12 }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showTopBtn && (
        <TouchableOpacity style={styles.topButton} onPress={scrollToTop}>
          <Icon name="keyboard-arrow-up" size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default FollowUpsScreen;

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
  remarksCardText: {
    fontSize: 13,
    color: '#ffffff',
    lineHeight: 20,
  },

  readMore: {
    color: '#00a8ff',
    fontWeight: '600',
    marginTop: 3,
  },
  screenTitle: {
    color: '#cfd8dc',
    fontSize: 13,
    marginLeft: 6,
  },

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
    height: Platform.OS === 'ios' ? 45 : 45,
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

  activeBadge: {
    backgroundColor: '#4caf50',
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
    maxWidth: 80,
  },

  remarksText: { color: '#fff', fontSize: 10 },
  phoneText: {
    color: '#00acc1',
    backgroundColor: 'rgba(0, 172, 193, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  location: {
    color: '#00e5ff',
    marginTop: 5,
    flexWrap: 'wrap',
    lineHeight: 16,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    gap: 6,
  },

  label: {
    color: '#eae8e5df',
    fontSize: 12,
    flex: 1,
    flexWrap: 'wrap',
    paddingTop: 2,
    paddingBottom: 5,
    fontWeight: '500',
  },
  label1: {
    color: '#eae8e5df',
    fontSize: 12,
    paddingTop: 2,
    paddingBottom: 5,
    fontWeight: '500',
  },
  emailText: {
    color: '#00acc1',
    textDecorationLine: 'underline',
    fontWeight: '500',
    fontSize: 12,
  },
  value: {
    color: '#fff',
    flexShrink: 1,
  },

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
  completed: {
    color: '#aaa',
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },

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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    bottom: 45,
  },
  modalCard: {
    width: '85%',
    backgroundColor: '#2f2f8f',
    borderRadius: 12,
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

  modalTitle: {
    color: '#00e5ff',
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
  },

  modalText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },

  modalCloseBtn: {
    backgroundColor: '#00acc1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 6,
    width: '100%',
    alignItems: 'center',
  },

  modalCloseText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },

  name: {
    color: '#fff',
    fontWeight: 'bold',
    flexShrink: 1,
  },
  field: {
    marginBottom: 12,
    width: '100%',
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
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    paddingVertical: Platform.OS === 'ios' ? 0 : 6,
    height: '100%',
  },
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
  filterModalCard: {
    width: '88%',
    backgroundColor: '#1a1f6b',
    borderWidth: 1,
    borderColor: '#3d45b0',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    maxHeight: '78%',
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
  resetText: {
    color: '#ff6b6b',
    fontWeight: 'bold',
    fontSize: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelText: {
    color: '#a0b4e8',
    fontSize: 13,
  },
});