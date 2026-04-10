// FollowUpsScreen.js
import React, { useRef, useState } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../Layout/Header';
import BottomNav from '../navigations/BottomNav';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import api from '../api/AxiosInstance';

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
// ✅ CARD
const SiteCard = ({ data, navigation, setShowRemarks, setRemarksText }) => (
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
        {/* ✅ REMARKS BUTTON */}
        <TouchableOpacity
          style={styles.remarksBtn}
          onPress={() => {
            setRemarksText(data?.remarks || 'No remarks available');
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
        <Text style={styles.label}>
          Phone:{' '}
          <Text style={styles.value}>{data?.propertylead?.phone || 'N/A'}</Text>
        </Text>
      </TouchableOpacity>
      <Text style={styles.label}>
        Email:{' '}
        <Text style={styles.value}>{data?.propertylead?.email || 'N/A'}</Text>
      </Text>
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

    <Text style={{ color: '#fb9e08', fontSize: 12, marginTop: 4 }}>
      Lead Source:{' '}
      <Text style={styles.value}>
        {data?.propertylead?.mrreference?.mrf_name}
      </Text>
    </Text>

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

// ✅ MAIN SCREEN
const SiteVisitsScreen = () => {
  const navigation = useNavigation();

  const [showRemarks, setShowRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState('');
  const [searchText, setSearchText] = useState('');
  const { data } = useQuery({
    queryKey: ['SiteVisitandBookingsData'],
    queryFn: async () => {
      const res = await api.get('/api/pm/siteVisitAndBookingsData');
      console.log('res site visite', res.data);

      return res.data.data;
    },
  });

  const siteVisits = data?.todays_siteVisit || [];
  const filteredSiteVisits = siteVisits.filter(item => {
    const name = item?.propertylead?.name?.toLowerCase() || '';
    const phone = item?.propertylead?.phone || '';
    const email = item?.propertylead?.email?.toLowerCase() || '';

    const search = searchText.toLowerCase();

    return (
      name.includes(search) || phone.includes(search) || email.includes(search)
    );
  });
  const scrollRef = useRef();
  const [showTopBtn, setShowTopBtn] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <Header />

      {/* Top Bar */}
      <View style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="event-note" size={18} color="#cfd8dc" />
            <Text style={styles.screenTitle}>Site-Visits</Text>
          </View>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={e => {
          const y = e.nativeEvent.contentOffset.y;
          setShowTopBtn(y > 200);
        }}
        scrollEventThrottle={16}
      >
        {/* Search */}
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

        {/* Cards */}
        {filteredSiteVisits.map((visit, i) => (
          <SiteCard
            key={visit.id || i}
            data={visit}
            navigation={navigation}
            setShowRemarks={setShowRemarks}
            setRemarksText={setRemarksText}
          />
        ))}
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

      {/* Scroll Top */}
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

export default SiteVisitsScreen;

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

  remarksText: { color: '#fff', fontSize: 10 },

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
    color: '#FFB85D',
    fontSize: 12,
    flex: 1,
    flexWrap: 'wrap',
    paddingTop: 2,
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

  modalCloseText: {
    color: '#fff',
    fontWeight: '600',
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
});
