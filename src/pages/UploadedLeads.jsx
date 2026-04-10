import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../Layout/Header';
import BottomNav from '../navigations/BottomNav';

const STATUSBAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight : 44;

/* ================= CALL ================= */
const makeCall = phone => {
  if (!phone) return;
  Alert.alert('Call', `Call ${phone}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call', onPress: () => Linking.openURL(`tel:${phone}`) },
  ]);
};

/* ================= CARD ================= */
const LeadCard = ({ item }) => {
  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item?.name || 'N/A'}</Text>

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
      </View>

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

      {/* ADDRESS */}
      <Text style={styles.label}>
        Address: <Text style={styles.value}>{item?.address || 'N/A'}</Text>
      </Text>

      {/* FOOTER */}
      <View style={styles.cardFooter}>
        <Text style={styles.completed}>Uploaded Today</Text>
      </View>
    </View>
  );
};

/* ================= MAIN ================= */
const UploadedLeads = () => {
  const scrollRef = useRef();
  const [searchText, setSearchText] = useState('');
  const [showTopBtn, setShowTopBtn] = useState(false);

 const { data, isLoading } = useQuery({
  queryKey: ['UploadedLeads'],
  queryFn: async () => {
    const res = await api.get('/api/pm/getLeadsUploadedToday');
    return res.data; 
  },
});

  const leads = data?.data || [];

  /* ================= FILTER ================= */
  const filteredLeads = leads.filter(item => {
    const search = searchText.toLowerCase();
    return (
      item?.name?.toLowerCase().includes(search) ||
      item?.phone?.includes(search) ||
      item?.email?.toLowerCase().includes(search)
    );
  });

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#00acc1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <Header />

      {/* TOP BAR */}
      <View style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="upload-file" size={18} color="#cfd8dc" />
            <Text style={styles.screenTitle}>Uploaded Leads</Text>
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
        {filteredLeads.length > 0 ? (
          filteredLeads.map((item, i) => (
            <LeadCard key={item.id || i} item={item} />
          ))
        ) : (
          <Text style={styles.empty}>No leads found</Text>
        )}
      </ScrollView>

      {/* SCROLL TOP */}
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

export default UploadedLeads;

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
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  name: { color: '#fff', fontWeight: 'bold' },

  activeBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    marginLeft: 6,
  },

  activeText: { color: '#fff', fontSize: 10 },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },

  label: { color: '#FFB85D', fontSize: 12 },

  value: { color: '#fff' },

  cardFooter: {
    marginTop: 10,
    alignItems: 'flex-end',
  },

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
});