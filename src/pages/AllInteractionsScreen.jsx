// AllInteractionsScreen.js
// React Native CLI - JavaScript

import React, { useState , useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/Ionicons';
import api from '../api/AxiosInstance';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (SCREEN_HEIGHT / 812) * size;

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLORS = {
  white: '#FFFFFF',
  mutedText: '#8A90B4',
  labelText: '#afaea5',
  orange: '#ffb300',
  cyan: '#4FC3F7',
};

// ─── Status Colors ────────────────────────────────────────────────────────────

const statusColors = {
  'Call Completed': '#2da85e',
  BusyT: '#F5A623',
  'Unable To Contact': '#e05a2b',
  'Call Status-3': '#aab8c4',
};

// ─── Remarks (Read more / less) ───────────────────────────────────────────────

const RemarksText = ({ remarks }) => {
  const [expanded, setExpanded] = useState(false);
  const shouldShowReadMore = remarks.length > 80;

  return (
    <Text style={styles.remarksCardText}>
      {expanded || !shouldShowReadMore
        ? remarks
        : `${remarks.substring(0, 80)}... `}

      {shouldShowReadMore && (
        <Text style={styles.readMore} onPress={() => setExpanded(!expanded)}>
          {expanded ? ' Read Less' : ' Read More'}
        </Text>
      )}
    </Text>
  );
};

// ─── Interaction Card ─────────────────────────────────────────────────────────

const InteractionCard = ({ item }) => {
  const remarks = item?.remarks || 'No Remarks Available';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item?.lead?.name || 'N/A'}</Text>
          {item?.rating?.name ? (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{item.rating.name}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Project */}
      <Text style={styles.projectText}>
        {item?.project_id?.name || 'N/A'}
      </Text>

      {/* Lead Qualification */}
      <View style={styles.rowBetween}>
        <Text style={styles.label}>
          Lead Qualification:{' '}
          <Text style={styles.value}>
            {item?.lead_qualification?.name || 'N/A'}
          </Text>
        </Text>
      </View>

      {/* Lead Status */}
      <View style={styles.rowBetween}>
        <Text style={styles.label}>
          Lead Status:{' '}
          <Text style={styles.value}>{item?.lead_status?.name || 'N/A'}</Text>
        </Text>
      </View>

      {/* Lead Sub Status */}
      <View style={styles.rowBetween}>
        <Text style={styles.label}>
          Lead Sub Status:{' '}
          <Text style={styles.value}>
            {item?.lead_sub_status?.name || 'N/A'}
          </Text>
        </Text>
      </View>

      {/* Site Visit */}
      <View style={styles.rowBetween}>
        <Text style={styles.label}>
          Site Visit Date:{' '}
          <Text style={styles.value}>{item?.dates?.site_visit || 'N/A'}</Text>
        </Text>
      </View>

      {/* Call Back */}
      <View style={styles.rowBetween}>
        <Text style={styles.labelHighlight}>
          Call Back Date & Time:{' '}
          <Text style={styles.value}>
            {item?.dates?.call_back || 'N/A'}/
            {item?.dates?.call_back_time || 'N/A'}
          </Text>
        </Text>
      </View>

      {/* Closure + call status */}
      <View style={styles.rowBetween}>
        <Text style={styles.label}>
          Expected Closure Date:{' '}
          <Text style={styles.value}>
            {item?.dates?.expected_closure || 'N/A'}
          </Text>
        </Text>
        <Text
          style={[
            styles.callResult,
            { color: statusColors[item?.call_status?.name] || '#aab8c4' },
          ]}
        >
          {item?.call_status?.name}
        </Text>
      </View>

      {/* Remarks */}
      <View style={styles.remarksRow}>
        <Text style={styles.remarksLabel}>Remarks:</Text>
        <View style={{ flex: 1 }}>
          <RemarksText remarks={remarks} />
        </View>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AllInteractionsScreen = ({ route }) => {
  const { id } = route.params;
  const navigation = useNavigation();

  // ─── Scroll to Top Logic ────────────────────────────────────────────────────
  const [showTopBtn, setShowTopBtn] = useState(false);
  const scrollRef = useRef();

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['feedback', id],
    queryFn: async () => {
      const res = await api.get(`/api/pm/getAllLeadFeedbacksById/${id}`);
      return res?.data?.data || [];
    },
  });

  return (
    <View style={styles.container}>
      <Image
        source={require('../asset/image/bg-img.png')}
        style={styles.bgImageFixed}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />

        {/* TOP BAR: [back + icon + title] ............ [add new] */}
        <View
          style={[styles.topBarContainer, { paddingTop: verticalScale(10) }]}
        >
          <View style={styles.topBar}>
            <View style={styles.leftHeader}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon1 name="chevron-back" size={23} color="#fff" />
              </TouchableOpacity>
              <Icon name="forum" size={20} color="#ffffff" />
              <Text style={styles.screenTitle} numberOfLines={1}>
                All Interactions
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addNewBtn}
              onPress={() => navigation.navigate('AddNewInteraction', { id })}
              activeOpacity={0.75}
            >
              <Icon name="add" size={14} color="#fff" />
              <Text style={styles.addNewText}>Add New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* LIST */}
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onScroll={event => {                               // ← added
            const y = event.nativeEvent.contentOffset.y;
            setShowTopBtn(y > 200);
          }}
          scrollEventThrottle={16}
        >
          {/* COUNT */}
          {!isLoading && (
            <Text style={styles.countText}>
              Showing {feedback?.length || 0} Records
            </Text>
          )}

          {isLoading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : feedback?.length > 0 ? (
            feedback.map((item, i) => (
              <InteractionCard
                key={item?.id != null ? `fb-${item.id}` : `fb-idx-${i}`}
                item={item}
              />
            ))
          ) : (
            <View style={styles.emptyWrap}>
              <Icon name="forum" size={48} color="rgba(255,255,255,0.25)" />
              <Text style={styles.empty}>No data found</Text>
            </View>
          )}
        </ScrollView>

        {/* ─── TOP BUTTON ───────────────────────────────────────────────────── */}
        {showTopBtn && (
          <TouchableOpacity style={styles.topButton} onPress={scrollToTop}>
            <Icon name="keyboard-arrow-up" size={26} color="#fff" />
          </TouchableOpacity>
        )}

      </SafeAreaView>
    </View>
  );
};

export default AllInteractionsScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2d3e' },
  bgImageFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: Dimensions.get('screen').height,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: Dimensions.get('screen').height,
    backgroundColor: 'rgba(18,32,48,0.72)',
  },
  safeArea: { flex: 1, backgroundColor: 'transparent' },

  /* ── Header pill ── */
  topBarContainer: {
    paddingHorizontal: scale(10),
    paddingBottom: verticalScale(10),
  },
  topBar: {
    height: 42,
    borderRadius: scale(22),
    backgroundColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(14),
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  backBtn: {
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    color: '#ffffff',
    fontSize: 15,
    marginLeft: 6,
    fontWeight: '700',
    flexShrink: 1,
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e9ce8',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addNewText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '600',
    marginLeft: 2,
  },

  /* ── List ── */
  listContent: { paddingHorizontal: 14, paddingBottom: 120 },
  centerLoader: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyWrap: { alignItems: 'center', marginTop: 80, gap: 12 },
  empty: { color: 'rgba(255,255,255,0.40)', fontSize: 15 },
  countText: {
    color: '#ffb300',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },

  /* ── Card ── */
  card: {
    backgroundColor: 'rgba(4, 35, 70, 0.62)',
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    marginRight: 8,
  },
  name: { color: '#ffffff', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  ratingBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6,
    backgroundColor: 'rgba(255,179,0,0.15)',
  },
  ratingText: { fontSize: 11, fontWeight: '600', color: '#ffb300' },
  projectText: {
    color: COLORS.cyan,
    marginTop: 2,
    fontSize: 12,
    flexWrap: 'wrap',
    lineHeight: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    gap: 6,
    flexWrap: 'wrap',
  },
  label: { fontSize: 11.5, color: COLORS.labelText, lineHeight: 18 },
  labelHighlight: {
    fontSize: 11.5,
    color: COLORS.orange,
    lineHeight: 18,
    fontWeight: '600',
  },
  value: { color: '#ffffff', fontSize: 11.5, flexShrink: 1 },
  callResult: { fontSize: 11.5, fontWeight: '700' },

  /* ── Remarks ── */
  remarksRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  remarksLabel: {
    color: COLORS.orange,
    fontSize: 11.5,
    fontWeight: '600',
    marginRight: 5,
    lineHeight: 18,
  },
  remarksCardText: {
    fontSize: 11.5,
    color: '#ffffff',
    lineHeight: 18,
  },
  readMore: {
    color: '#4FC3F7',
    fontWeight: '600',
  },

  /* ── Top button (FAB style) ── */
  topButton: {
    position: 'absolute',
    bottom: 100,                    // safe for bottom tab / home indicator
    right: 20,
    backgroundColor: '#4aa3df',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    // iOS shadow
    shadowColor: '#1a7abf',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    // Android shadow
    elevation: 12,
    zIndex: 999,
  },
});