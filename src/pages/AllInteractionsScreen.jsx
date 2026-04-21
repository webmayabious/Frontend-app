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

// ─── Status Colors ────────────────────────────────────────────────────────────

const statusColors = {
  'Call Completed': '#00C48C',
  BusyT: '#F5A623',
  'Unable To Contact': '#FF6B6B',
  'Call Status-3': '#8A90B4',
};

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = ({ navigation, route }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionIcon}>👥</Text>
      <Text style={styles.sectionTitle}>All Interactions</Text>
    </View>
    <View style={styles.sectionActions}>
      <TouchableOpacity
        style={styles.addNewBtn}
        onPress={() =>
          navigation.navigate('AddNewInteraction', { id: route.params.id })
        }
        activeOpacity={0.75}
      >
        <Text style={styles.addNewText}>Add New Interaction</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.75}
      >
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Interaction Card ─────────────────────────────────────────────────────────

const InteractionCard = ({ item, setShowRemarks, setRemarksText }) => (
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
          setRemarksText(item?.remarks || 'No remarks available');
          setShowRemarks(true);
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.remarksBtnText}>Remarks</Text>
      </TouchableOpacity>
    </View>

    {/* Lead Qualification */}
    <Text style={styles.leadQualification}>
      Lead Qualification:{' '}
      <Text style={styles.leadQualificationValue}>
        {item?.lead_qualification?.name}
      </Text>
    </Text>

    {/* Status Row */}
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>
        Lead Status:{' '}
        <Text style={styles.statusValue}>{item?.lead_status?.name}</Text>
      </Text>
      <Text style={styles.fieldLabel}>
        Site Visit Date:{' '}
        <Text style={styles.fieldValue}>{item?.dates?.site_visit}</Text>
      </Text>
    </View>

    {/* Lead Sub Status */}
    <Text style={styles.statusLabel}>
      Lead Sub Status:{' '}
      <Text style={styles.statusValue}>{item?.lead_sub_status?.name}</Text>
    </Text>

    {/* Call Back */}
    <Text style={styles.fieldLabelHighlight}>
      Call Back Date & Time:{' '}
      <Text style={styles.fieldValueHighlight}>
        {item?.dates?.call_back}/{item?.dates?.call_back_time}
      </Text>
    </Text>

    {/* Closure Row */}
    <View style={styles.closureRow}>
      <Text style={styles.fieldLabel}>
        Expected Closure Date:{' '}
        <Text style={styles.fieldValue}>{item?.dates?.expected_closure}</Text>
      </Text>
      <Text
        style={[
          styles.callResult,
          { color: statusColors[item?.call_status?.name] || '#8A90B4' },
        ]}
      >
        {item?.call_status?.name}
      </Text>
    </View>
  </View>
);

// ─── Remarks Modal ────────────────────────────────────────────────────────────

const RemarksModal = ({ visible, text, onClose }) => {
  if (!visible) return null;
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={styles.checkIcon}>
          <Icon name="check-circle" size={32} color="#00acc1" />
        </View>
        <Text style={styles.modalTitle}>Latest Remarks</Text>
        <Text style={styles.modalText}>{text}</Text>
        <TouchableOpacity
          style={styles.modalCloseBtn}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.modalCloseText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AllInteractionsScreen = ({ route }) => {
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState('');
  const { id } = route.params;
  const navigation = useNavigation();

  const {
    data: feedback,
    isLoading,
  } = useQuery({
    queryKey: ['feedback', id],
    queryFn: async () => {
      const res = await api.get(`/api/pm/getAllLeadFeedbacksById/${id}`);
      return res?.data?.data || [];
    },
    onError: err => {
      // Toast.show({
      //   type: 'error',
      //   text1: err?.response?.data?.message || 'Failed to fetch feedback',
      // });
    },
  });

  return (
    <View  style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F2E" />

      {/* ── Header pinned to top ── */}
      <Header />

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader navigation={navigation} route={route} />

        {isLoading ? (
          <Text style={styles.centeredText}>Loading...</Text>
        ) : feedback?.length > 0 ? (
          feedback.map(item => (
            <InteractionCard
              key={item.id}
              item={item}
              setShowRemarks={setShowRemarks}
              setRemarksText={setRemarksText}
            />
          ))
        ) : (
          <Text style={styles.centeredText}>No Data Found</Text>
        )}
      </ScrollView>

      {/* ── Remarks Modal (absolute overlay) ── */}
      <RemarksModal
        visible={showRemarks}
        text={remarksText}
        onClose={() => setShowRemarks(false)}
      />

      {/* ── Bottom Nav pinned to bottom ── */}
      <BottomNav />
    </View >
  );
};

// ─── Colors ───────────────────────────────────────────────────────────────────

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
  orange: '#F5A623',
  green: '#00C48C',
  red: '#FF6B6B',
  remarksBg: '#2488B5',
  addNewBg: 'rgba(30,42,110,0.28)',
  borderColor: '#1E2550',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Layout ──
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    gap: 6,
  },
  sectionIcon: {
    fontSize: 15,
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
  addNewBtn: {
    backgroundColor: COLORS.addNewBg,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  addNewText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
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
    lineHeight: 14,
  },

  // ── Card ──
  card: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  cardName: {
    color: COLORS.white,
    fontWeight: '800',
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
    fontWeight: '600',
  },
  leadQualification: {
    color: COLORS.accent,
    fontSize: 11.5,
    marginBottom: 5,
  },
  leadQualificationValue: {
    color: COLORS.accentLight,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: 6,
  },
  statusLabel: {
    color: COLORS.labelText,
    fontSize: 11,
    flex: 1,
    flexWrap: 'wrap',
    marginBottom: 3,
  },
  statusValue: {
    color: COLORS.white,
    fontWeight: '700',
  },
  fieldLabel: {
    color: COLORS.labelText,
    fontSize: 11,
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  fieldValue: {
    color: COLORS.white,
    fontWeight: '600',
  },
  fieldLabelHighlight: {
    color: COLORS.orange,
    fontSize: 11,
    marginBottom: 3,
    fontWeight: '600',
  },
  fieldValueHighlight: {
    color: COLORS.white,
    fontWeight: '700',
  },
  closureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  callResult: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  // ── Remarks Modal ──
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalCard: {
    width: '82%',
    backgroundColor: '#2f2f8f',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  checkIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e6f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#00e5ff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalText: {
    color: COLORS.white,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
    opacity: 0.9,
  },
  modalCloseBtn: {
    backgroundColor: '#00acc1',
    paddingHorizontal: 32,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalCloseText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default AllInteractionsScreen;