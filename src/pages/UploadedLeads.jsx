// FollowUpsScreen.js
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
  Alert,
  Linking,
  Image,
  Animated,
  Keyboard,
  DeviceEventEmitter,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../Layout/Header';
import BottomNav from '../navigations/BottomNav';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import { Dropdown } from 'react-native-element-dropdown';
const STATUSBAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight : 44;
/* ================= CALL ================= */
// const makeCall = phoneNumber => {
//   if (!phoneNumber) return;
//   Alert.alert('Call', `Do you want to call ${phoneNumber}?`, [
//     { text: 'Cancel', style: 'cancel' },
//     { text: 'Call', onPress: () => Linking.openURL(`tel:${phoneNumber}`) },
//   ]);
// };
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
// const DropdownField = ({ label, data, placeholder, value, onChange }) => {
//   const [isFocus, setIsFocus] = useState(false);
//   return (
//     <View style={styles.inputWrapper}>
//       <Text style={styles.label}>{label}</Text>
//       <Dropdown
//         style={[
//           styles.dropdown,
//           isFocus && { borderColor: '#00e5ff', borderWidth: 1.5 },
//         ]}
//         containerStyle={styles.dropdownContainer}
//         placeholderStyle={styles.placeholderStyle}
//         selectedTextStyle={styles.selectedTextStyle}
//         itemTextStyle={{ color: '#0b0b0b', fontWeight: '500' }}
//         activeColor="#e6f7ff"
//         data={data || []}
//         labelField="label"
//         valueField="value"
//         placeholder={placeholder}
//         value={value}
//         itemContainerStyle={styles.itemContainer}
//         onFocus={() => setIsFocus(true)}
//         onBlur={() => setIsFocus(false)}
//         onChange={item => {
//           setIsFocus(false);
//           onChange && onChange(item.value);
//         }}
//         renderRightIcon={() => (
//           <Icon
//             name={isFocus ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
//             size={20}
//             color="#00e5ff"
//           />
//         )}
//       />
//     </View>
//   );
// };
// ✅ CARD
const LIST_HEIGHT = 220;
const FIELD_TOP_OFFSET = Platform.OS === 'ios' ? 280 : 250;
// Inline dropdown, same behaviour/look as EmployeeDropdown
const DropdownField = ({
  label,
  data,
  value,
  onChange,
  error,
  scrollRef,
  scrollYRef,
  placeholder,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropAnim = useRef(new Animated.Value(0)).current;
  const wrapRef = useRef(null);

  const options = data || [];
  const selected = options.find(o => o.value === value);
  const initial = selected?.label?.[0]?.toUpperCase();

  const filtered = options.filter(o =>
    String(o.label ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const maxHeight = dropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LIST_HEIGHT],
  });

  // After the list has expanded, scroll up just enough to keep it above the BottomNav
 // Animate the screen so this field moves up toward the top
const scrollFieldUp = () => {
  if (!wrapRef.current || !scrollRef?.current) return;
  wrapRef.current.measureInWindow((x, y) => {
    const delta = y - FIELD_TOP_OFFSET;
    if (delta > 0) {
      scrollRef.current.scrollTo({
        y: (scrollYRef?.current || 0) + delta,
        animated: true,
      });
    }
  });
};
// const handleSearchFocus = () => {
//     setTimeout(() => {
//       if (!wrapRef.current || !scrollRef?.current) return;
//       wrapRef.current.measureInWindow((x, y) => {
//         const delta = y - SEARCH_TOP_OFFSET;
//         if (delta > 0) {
//           scrollRef.current.scrollTo({
//             y: (scrollYRef?.current || 0) + delta,
//             animated: true,
//           });
//         }
//       });
//     }, 350); // wait for the keyboard animation
//   };
const close = (duration = 180) => {
  Keyboard.dismiss();
  Animated.timing(dropAnim, {
    toValue: 0,
    duration,
    useNativeDriver: false,
  }).start(() => {
    setOpen(false);
    setSearch('');
    DeviceEventEmitter.emit('toggleBottomNav', true);   // show the nav again
  });
};

const toggle = () => {
  if (open) {
    close();
  } else {
    DeviceEventEmitter.emit('toggleBottomNav', false);  // hide the nav as soon as it opens
    setOpen(true);
    scrollFieldUp();
    Animated.timing(dropAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start(scrollFieldUp);
  }
};

useEffect(() => {
  return () => DeviceEventEmitter.emit('toggleBottomNav', true);  // restore on leaving the screen
}, []);

  const handleSelect = item => {
    onChange && onChange(item.value);
    close(150);
  };

  return (
    <View ref={wrapRef} collapsable={false} style={styles.field}>
     {label ? <Text style={styles.dropLabel}>{label}</Text> : null}

      {/* Trigger */}
      <TouchableOpacity
        style={[
          styles.dropdown,
          open && styles.dropdownOpen,
          error && styles.inputError,
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        ]}
        onPress={toggle}
        activeOpacity={0.8}
      >
        <View style={styles.ddTriggerLeft}>
          {/* {selected ? (
            <View style={styles.ddAvatar}>
              <Text style={styles.ddAvatarTxt}>{initial}</Text>
            </View>
          ) : null} */}
          <Text
            style={selected ? styles.selectedText : styles.placeholder}
            numberOfLines={1}
          >
            {selected ? selected.label : placeholder || 'Select...'}
          </Text>
        </View>
        <Icon
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color="#8a9daf"
        />
      </TouchableOpacity>

      {/* Inline list */}
      {open && (
        <Animated.View
          style={[styles.dropdownMenu, { maxHeight, opacity: dropAnim }]}
        >
          <View style={styles.ddSearchWrap}>
            <Icon name="search" size={16} color="#000" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.ddSearchInput}
              placeholder="Search..."
              placeholderTextColor="#000"
              value={search}
              onChangeText={setSearch}
             
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon name="close" size={14} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={{ maxHeight: 155 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
          >
            {filtered.length === 0 ? (
              <Text style={styles.ddNoResult}>No results found</Text>
            ) : (
              filtered.map(item => {
                const isActive = item.value === value;
                return (
                  <TouchableOpacity
                    key={String(item.value)}
                    style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    {/* <View style={[styles.ddAvatar, isActive && styles.ddAvatarSelected]}>
                      <Text style={[styles.ddAvatarTxt, isActive && { color: '#fff' }]}>
                        {String(item.label ?? '')[0]?.toUpperCase()}
                      </Text>
                    </View> */}
                    <Text
                      style={[
                        styles.dropdownItemText,
                        isActive && styles.dropdownItemTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {isActive && <Icon name="check" size={16} color="#1482cc" />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
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
const SiteCard = ({ data, navigation, setShowRemarks, setRemarksText }) => {
    const remarks =
  data?.propertyfeedbacks
    ?.map(x => x?.remarks)
    ?.filter(Boolean)
    ?.join(', ') || 'No Remarks Available';
  return(
  <View style={styles.card}>
    {/* Header */}
    <View style={styles.cardHeader}>
      <View style={styles.nameRow}>
        <Text style={styles.name}>{data?.name}</Text>

               <View
         style={[
           styles.activeBadge,
           {
             backgroundColor:
               data?.active === '1'
                 ? '#4caf50'
                 : data?.active === '5'
                 ? '#6b7785'
                 : '#f44336',
           },
         ]}
       >
         <Text style={styles.activeText}>
           {data?.active === '1'
             ? 'Active'
             : data?.active === '5'
             ? 'Booking Done'
             : 'Inactive'}
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
        {/* ✅ REMARKS BUTTON */}
        {/* <TouchableOpacity
          style={styles.remarksBtn}
         
          onPress={() => {
            // setRemarksText(data?.propertyfeedbacks?.map(x=>x.remarks)|| 'No remarks available');
            // setShowRemarks(true);
            const remarks =
      data?.propertyfeedbacks?.length > 0
        ? data.propertyfeedbacks.map(x => x.remarks).join('\n')
        : 'No remarks available';

    setRemarksText(remarks);
    setShowRemarks(true);
          
          }}
        >
          <Text style={styles.remarksText}>Remarks</Text>
        </TouchableOpacity> */}

        <Icon
          name="edit"
          size={18}
          color="#00e5ff"
          style={{ marginLeft: 8 }}
          onPress={() =>
            navigation.navigate('MeetingsEdit', {
              id: data?.id,
            })
          }
        />
      </View>
    </View>

    {/* Info */}
    <Text style={styles.location}>
      {data?.propertyproject?.project_name} | {data?.propertylocation?.name}
    </Text>
     <View style={styles.rowBetween}>
            {/* <TouchableOpacity onPress={() => makeCall(data?.propertylead?.phone)}>
              <Text style={styles.label}>
                Phone:{' '}
                <Text style={styles.remarksBtn}>{data?.propertylead?.phone || 'N/A'}</Text>
              </Text>
            </TouchableOpacity> */}
            <TouchableOpacity onPress={() => makeCall(data?.phone)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.label1}>Phone:{' '}</Text>
      
                {/* <View style={styles.remarksBtn}> */}
                  <Text style={styles.phoneText}>
                    {data?.phone || 'N/A'}
                  </Text>
                {/* </View> */}
              </View>
            </TouchableOpacity>
            
          </View>
          <View style={styles.rowBetween}> 
            <TouchableOpacity
      
              onPress={() => sendMail(data?.email)}
      
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.label1}>Email:{' '}</Text>
      
      
                <Text style={styles.emailText}>
                  {data?.email || 'N/A'}
                </Text>
      
              </View>
            </TouchableOpacity>
          </View>
    <View style={styles.rowBetween}>
      <Text style={styles.label}>
        <Text style={styles.label}>
          Date_Of_Birth:
          <Text style={styles.value}> {data?.date_of_birth}</Text>
        </Text>
      </Text>

      <Text style={styles.label}>
        RM:{' '}
        <Text style={styles.value}>
          {data?.relationshipManager
            ? `${data.relationshipManager.usr_fname} ${data.relationshipManager.usr_lname}`
            : 'N/A'}
        </Text>
      </Text>
    </View>

    <Text style={{ color: '#fb9e08', fontSize: 12, marginTop: 4 }}>
      Lead Source:{' '}
      <Text style={styles.value}>{data?.mrreference?.mrf_name}</Text>
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
        // onPress={() =>
        //   navigation.navigate('AllInteractionsScreen', {
        //     id:data.propertyfeedbacks
        // .map(item => item.propertycallstatus?.id)
        // })
        // }
        onPress={() =>
  navigation.navigate('AllInteractionsScreen', {
    id: data?.id,
  })
}
      >
        <Text style={styles.buttonText}>View Interaction</Text>
      </TouchableOpacity>

     <Text style={styles.completed}>
  {data?.propertyfeedbacks?.length
    ? data.propertyfeedbacks
        .map(item => item.propertycallstatus?.name)
        .join(', ')
    : 'N/A'}
</Text>
    </View>
  </View>
)};

// ✅ MAIN SCREEN
const UploadedLeads = () => {
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
  });
  const [appliedFilters, setAppliedFilters] = useState();
  const { data: uploadleads, isLoading,fetchNextPage, hasNextPage, isFetchingNextPage  } = useInfiniteQuery({
    queryKey: ['Uploadleads', appliedFilters],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get('api/pm/getLeadsUploadedToday', {
        params: {
          page: pageParam,
        
          search: searchText || undefined,
          company_id: filters.company_id || undefined,
          rm_id: filters.rm_id || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          project: filters.project || undefined,
          location: filters.location || undefined,
          status: filters.status || undefined,
        },
      });
      console.log('res site visite', res.data.data);

      return res.data;
    },
      getNextPageParam: lastPage => {
      const { currentPage, totalPages } = lastPage;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
  });
const Uploadleads = uploadleads?.pages?.flatMap(page => page.data) || [];

  // ✅ Infinite scroll handler — scroll position দেখে trigger করে
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };
  // const siteVisits = data?.todays_siteVisit || [];
  const filteredSiteVisits = Uploadleads?.filter(item => {
    const name = item?.name?.toLowerCase() || '';
    const phone = item?.phone || '';
    const email = item?.email?.toLowerCase() || '';

    const search = searchText.toLowerCase();

    return (
      name.includes(search) || phone.includes(search) || email.includes(search)
    );
  });
  const scrollRef = useRef();
  const isScrollingToTop = useRef(false);
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
      status: null,
    };

    setFilters(cleared);
    setAppliedFilters(cleared);
    setShowFilterModal(false);
  };
  const [showTopBtn, setShowTopBtn] = useState(false);
  const scrollToTop = () => {
    isScrollingToTop.current = true;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setTimeout(() => {
      isScrollingToTop.current = false;
    }, 600);
  };
  const scrollRef1 = useRef(null);
    const scrollYRef = useRef(0); 
  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* <Header /> */}

      {/* Top Bar */}
      <View style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="upload" size={18} color="#cfd8dc" />
            <Text style={styles.screenTitle}>Today's Uploaded Leads</Text>
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
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
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

      {/* List */}
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
      >
        {/* Search */}
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color="#aaa" />
          <TextInput
            placeholder="Search name / phone / email..."
            placeholderTextColor="#aaa"
            value={searchText}
            onChangeText={setSearchText}
            style={{ marginLeft: 8, color: '#fff', flex: 1, height: '100%', paddingVertical: Platform.OS === 'ios' ? 0 : 6, }}
          />
        </View>

        {/* Cards */}
        {isLoading ? (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
            Loading...
          </Text>
        ) : filteredSiteVisits?.length > 0 ? (
          filteredSiteVisits?.map((visit, i) => (
            <SiteCard
              key={visit.id || i}
              data={visit}
              navigation={navigation}
              setShowRemarks={setShowRemarks}
              setRemarksText={setRemarksText}
            />
          ))
        ) : (
          <Text
            style={{ textAlign: 'center', marginTop: 20, color: '#ffffff' }}
          >
            No data found
          </Text>
        )}
        <View style={{paddingBottom:100}}/>
      </ScrollView>

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
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <Text style={styles.modalTitle}>Filter Leads</Text>

            <ScrollView
              style={{ width: '100%' }}
                  ref={scrollRef1}
          onScroll={e => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            >
              <DropdownField
                label="Property Location"
                data={Property}
                placeholder="Select"
                value={filters.location}
                onChange={value => onChange('location', value)}
                    scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
              />
              <DropdownField
                label="RM"
                data={Rm}
                placeholder="Select"
                value={filters.rm_id}
                onChange={value => onChange('rm_id', value)}
                    scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
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
                    scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
              />
              <DropdownField
                label="Lead Status"
                data={LeadStatus}
                placeholder="Select"
                value={filters.status}
                onChange={value => onChange('status', value)}
                    scrollRef={scrollRef1}
              scrollYRef={scrollYRef}
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
      {/* Scroll Top */}
      {showTopBtn && (
        <TouchableOpacity
          style={styles.topButton}
          onPress={scrollToTop}
        >
          <Icon name="keyboard-arrow-up" size={26} color="#fff" />
        </TouchableOpacity>
      )}
   <View style={{paddingBottom: 100}}/>
      {/* <BottomNav /> */}
    </View>
  );
};

export default UploadedLeads;

// ✅ STYLES (same as yours)
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
    borderWidth: 1,
     borderColor: '#ffffff20', 
       backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 10,
    marginTop: 0,
    height: Platform.OS === 'ios' ? 40 : 40,
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

  name: { color: '#fff', fontWeight: 'bold' },

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
  phoneText: {
  color: '#00acc1',
  backgroundColor: 'rgba(0, 172, 193, 0.15)',
  paddingHorizontal: 4,
  paddingVertical: 2,
  borderRadius: 4,
  fontWeight: '600',
},
  remarksText: { color: '#fff', fontSize: 10 },

  location: {
    color: '#00e5ff',
    marginTop: 5,
    flexWrap: 'wrap',
    lineHeight: 16,
  },
  backButton: {
  flexDirection: 'row',
  alignItems: 'center',
},
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    gap: 6,
  },

  label: {
       color: '#FFB85D',   // muted blue-white — better contrast on dark bg
    fontSize: 12,
    marginBottom: 5,
    fontWeight: '500',
  },
    label1: {
      color: '#FFB85D',   // muted blue-white — better contrast on dark bg
    fontSize: 12,
    // marginBottom: 5,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    bottom:45
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#3d55cc',
    borderRadius: 2,
    marginBottom: 14,
  },
  modalCard: {
   width: '88%',
    backgroundColor: '#1a1f6b',
    borderWidth: 1,
    borderColor: '#3d45b0',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    maxHeight: '68%',
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
  color: '#fff', fontWeight: '600', fontSize: 14 
  },
  inputWrapper: { width: '100%', marginBottom: 12 },
  // dropdown: {
  //  height: 40,
  //   backgroundColor: '#ffffff12',
  //   borderRadius: 8,
  //   paddingHorizontal: 10,
  //   borderWidth: 1,
  //   borderColor: '#3d55cc',
  // },
  // dropdownContainer: { backgroundColor: '#fff', borderRadius: 8 },
    dropLabel: { color: '#00cfff', fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 5 },
  dropdown: {
    height: 40,
  backgroundColor: '#2b2f66',
    borderRadius: 12,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#39415a',
  },
  dropdownOpen: { borderColor: '#4aa3df', 
    // backgroundColor: '#28304a' 
  },
  dropdownMenu: {
    marginTop: 4,
   backgroundColor: '#ffffff',
    borderRadius: 12,
    // borderWidth: 1,
    // borderColor: '#39415a',
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
   
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    // borderBottomWidth: 1,
    // borderBottomColor: '#323a52',
  },
  dropdownItemActive: { backgroundColor: 'rgba(74,163,223,0.15)' },
  dropdownItemText: { flex: 1, fontSize: 13, color: '#000', fontWeight: '500' },
  dropdownItemTextActive: { color: '#7cc4f2', fontWeight: '700' },
  placeholder: { color: '#8a9daf', fontSize: 13 },
  selectedText: { color: '#e6ebf2', fontSize: 13, fontWeight: '600' },
  ddTriggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  ddAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(20,130,204,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ddAvatarSelected: { backgroundColor: '#1482cc' },
  ddAvatarTxt: { fontSize: 11, fontWeight: '700', color: '#1482cc' },
  ddSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#babdc5',
    backgroundColor: '#b1b5c0',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  ddSearchInput: { flex: 1, fontSize: 13, color: '#000', padding: 0 },
  ddNoResult: { textAlign: 'center', color: '#6b7690', fontSize: 12, paddingVertical: 16 },
  placeholderStyle: { color: '#7a8fc4', fontSize: 13},
  selectedTextStyle: { color: '#fff', fontSize: 13 },
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
});

