// AllInteractionsScreen.js
// React Native CLI - JavaScript
// Usage: Drop this file in your screens/ folder and register in your navigator

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import BottomNav from '../navigations/BottomNav';
import Header from '../Layout/Header';
import { useQuery } from '@tanstack/react-query';
import api from '../api/AxiosInstance';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
// import Toast from 'react-native-toast-message';
// ─── Mock Data ────────────────────────────────────────────────────────────────

const statusColors = {
  'Call Completed': 'green',
  'BusyT': 'orange',
  'Unable To Contact': 'red',
  'Call Status-3': 'gray',
};
const SectionHeader = ({ navigation, route }) => (

  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionIcon}>👥</Text>
      <Text style={styles.sectionTitle}>All Interactions</Text>
    </View>
    <View style={styles.sectionActions}>
      <TouchableOpacity style={styles.addNewBtn} onPress={() => navigation.navigate('AddNewInteraction', { id: route.params.id })}>
        <Text style={styles.addNewText}>Add New Interaction</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  </View>
);
const InfoRow = ({ label, value, style }) => (
  <View style={[styles.infoRow, style]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const InteractionCard = ({ item , setShowRemarks, setRemarksText }) => (
  <View style={styles.card}>
    {/* Card Header */}
    <View style={styles.cardHeader}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardName}>{item?.lead?.name}</Text>
        <Text style={styles.cardTemp}> | {item?.rating?.name}</Text>
      </View>
      <TouchableOpacity
        style={styles.remarksBtn}
        onPress={() => {
          setRemarksText(item?.remarks || "No remarks available");
          setShowRemarks(true);
        }}
      >
        <Text style={styles.remarksBtnText}>Remarks</Text>
      </TouchableOpacity>
    </View>

    {/* Lead Qualification */}
    <Text style={styles.leadQualification}>
      Lead Qualification:{' '}
      <Text style={styles.leadQualificationValue}>{item?.lead_qualification?.name}</Text>
    </Text>

    {/* Status Row */}
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>
        Lead Status: <Text style={styles.statusValue}>{item?.lead_status?.name}</Text>
      </Text>
      <Text style={styles.fieldLabel}>
        Site Visit Date: <Text style={styles.fieldValue}>{item?.dates?.site_visit}</Text>
      </Text>
    </View>

    {/* Site Visit */}

    <Text style={styles.statusLabel}>
      Lead Sub Status: <Text style={styles.statusValue}>{item?.lead_sub_status?.name}</Text>
    </Text>
    {/* Call Back */}
    <Text style={styles.fieldLabelHighlight}>
      Call Back Date & Time:{' '}
      <Text style={styles.fieldValueHighlight}>{item?.dates?.call_back}/{item?.dates?.call_back_time}</Text>
    </Text>

    {/* Closure Row */}
    <View style={styles.closureRow}>
      <Text style={styles.fieldLabel}>
        Expected Closure Date: <Text style={styles.fieldValue}>{item?.dates?.expected_closure}</Text>
      </Text>
      <Text
        style={[
          styles.callResult,
          {
            color:
              statusColors[item?.call_status?.name] || 'black',
          },
        ]}
      >
        {item?.call_status?.name}
      </Text>
    </View>
  </View>
);


// ─── Main Screen ──────────────────────────────────────────────────────────────

const AllInteractionsScreen = ({ route }) => {
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState("");
  const { id } = route.params;
  const navigation = useNavigation();
  // ================= Fetch Feedback =================
  const { data: feedback, isLoading, refetch } = useQuery({
    queryKey: ['feedback', id],
    queryFn: async () => {
      const res = await api.get(`/api/pm/getAllLeadFeedbacksById/${id}`);
      return res?.data?.data || [];
    },
    onError: err => {
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message || 'Failed to fetch feedback',
      });
    },
  });
  console.log('feedback', feedback);

  return (
    <>

      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0F2E" />

        <Header />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <SectionHeader navigation={navigation} route={route} />

          {feedback?.map(item => (
            <InteractionCard
              key={item.id}
              item={item}
              setShowRemarks={setShowRemarks}
              setRemarksText={setRemarksText}
            />
          ))}
        </ScrollView>

         {showRemarks && (
  <View style={styles.modalOverlay}>
    <View style={styles.modalCard}>
      
      <View style={styles.checkIcon}>
        <Icon name="check-circle" size={32} color="#00acc1" />
      </View>

      <Text style={styles.modalTitle}>Latest Remarks</Text>

      <Text style={styles.modalText}>
        {remarksText}
      </Text>

      <TouchableOpacity
        style={styles.modalCloseBtn}
        onPress={() => setShowRemarks(false)}
      >
        <Text style={styles.modalCloseText}>OK</Text>
      </TouchableOpacity>

    </View>
  </View>
)}
        <BottomNav />
      </SafeAreaView>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#080d5a',
  cardBg: '#ffffff16',
  headerBg: '#0D1230',
  accent: '#1784b7',
  accentLight: '#7B9FFF',
  gold: '#F5A623',
  white: '#FFFFFF',
  mutedText: '#8A90B4',
  labelText: '#FFB85D',
  valueText: '#FFFFFF',
  orange: '#F5A623',
  green: '#00C48C',
  red: '#FF6B6B',
  remarksBg: '#2488B5',
  addNewBg: '#1e2a6e47',
  borderColor: '#1E2550',
  navBg: '#0D1230',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // ── Header ──

  menuLine: {
    width: 22,
    height: 2,
    backgroundColor: COLORS.white,
    borderRadius: 2,
    marginVertical: 2,
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
    backgroundColor: '#ffffff5a', // slightly lighter for header
    borderRadius: 20,
    marginHorizontal: 12,
    marginTop: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addNewBtn: {
    backgroundColor: COLORS.addNewBg,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  addNewText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '500',
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2488B5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Card ──
  card: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 10,
    padding: 14,
    borderWidth: .5,
    borderColor: COLORS.borderColor,
    borderColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  cardName: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
    flexShrink: 1,
  },
  cardTemp: {
    color: COLORS.mutedText,
    fontSize: 13,
  },
  remarksBtn: {
    backgroundColor: COLORS.remarksBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  remarksBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  leadQualification: {
    color: COLORS.accent,
    fontSize: 12,
    marginBottom: 6,
  },
  leadQualificationValue: {
    color: COLORS.accentLight,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 6,
  },
  statusLabel: {
    color: COLORS.labelText,
    fontSize: 11.5,
    flex: 1,
    flexWrap: 'wrap',
  },
  statusValue: {
    color: COLORS.white,
    fontWeight: '600',
  },
  fieldLabel: {
    color: COLORS.labelText,
    fontSize: 11.5,
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  fieldValue: {
    color: COLORS.white,
    fontWeight: '500',
  },
  fieldLabelHighlight: {
    color: COLORS.orange,
    fontSize: 11.5,
    marginBottom: 3,
    fontWeight: '500',
  },
  fieldValueHighlight: {
    color: COLORS.white,
    fontWeight: '600',
  },
  closureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  callResult: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Info Row (generic) ──
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  infoLabel: {
    color: COLORS.labelText,
    fontSize: 12,
    marginRight: 4,
  },
  infoValue: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
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
});

export default AllInteractionsScreen;