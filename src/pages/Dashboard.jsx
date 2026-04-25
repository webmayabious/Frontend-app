import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../Layout/Header';
import BottomNav from '../navigations/BottomNav';
import { useNavigation } from '@react-navigation/native';
import api from '../api/AxiosInstance';
import { useQuery } from '@tanstack/react-query';

const { width } = Dimensions.get('window');

/* ─────────────────────────────────────────
   Card data config
───────────────────────────────────────── */
const CARDS = (d, nav) => [
   {
    icon: 'phone-callback',
    label: 'Follow-ups / Meetings',
    period: 'Today',
    accent: '#4ade80',
    value: `${d?.todays_callbacks ?? 0}  /  ${d?.todays_meetings ?? 0}`,
    route: 'FollowUpsScreen',
  },
  {
    icon: 'place',
    label: 'Site Visits / Bookings',
    period: 'Today',
    accent: '#4ade80',
    value: `${d?.todays_site_visits ?? 0}  /  ${d?.todays_booking ?? 0}`,
    route: 'SiteVisitsScreen',
  },
  {
    icon: 'upload',
    label: 'Uploaded Leads',
    period: 'Today',
    accent: '#4ade80',
    value: `${d?.total_leads_uploaded_today ?? 0}`,
    route: 'UploadedLeads',
  },
  {
    icon: 'assignment-ind',
    label: 'Leads Assigned',
    period: 'Today',
    accent: '#4ade80',
    value: `${d?.total_assigned_lead ?? 0}`,
    route: 'LeadsassignedScreen',
  },

  {
    icon: 'people',
    label: 'Active Leads / Total Leads',
    period: 'Month',
    accent: '#f472b6',
    value: `${d?.total_active_leads ?? 0}  /  ${d?.total_leads_count ?? 0}`,
    route: 'TotalLeadScreen',
  },
  {
    icon: 'receipt-long',
    label: 'Bookings / Agreements',
    period: 'Month',
    accent: '#f472b6',
    value: `${d?.total_bookings_per_month ?? 0}  /  ₹${d?.total_agreement_value_per_month ?? 0}`,
    route: 'TotalBookingsAgreementsPerMonth',
  },
 
      {
    icon: 'history',
    label: 'Bookings / Agreements',
    period: 'Till Date',
    accent: '#a78bfa',
    value: `${d?.total_booking_till_date ?? 0}  /  ₹${d?.total_agreement_value_till_date ?? 0}`,
    route: 'TotalBookingsAgreementsTillDateScreen',
  },
  {
    icon: 'notifications-off',
    label: 'Missed Follow Up',
    period: 'Till Date',
    accent: '#a78bfa',
    value: `${d?.total_missed_callback ?? 0}`,
    route: 'MissedFollowup',
  },
  
  {
    icon: 'list-alt',
    label: 'Leads List',
    period: 'Till Date',
    accent: '#a78bfa',
    value: '—',
    route: 'LeadsListScreen',
  },

];

/* ─────────────────────────────────────────
   Reusable Card
───────────────────────────────────────── */
const Card = ({ icon, label, period, accent, value, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.75}
    style={styles.card}
    onPress={onPress}
  >
    {/* Left accent bar */}
    <View style={[styles.accentBar, { backgroundColor: accent }]} />

    {/* Icon bubble */}
    <View style={[styles.iconBubble, { backgroundColor: accent + '22' }]}>
      <Icon name={icon} size={20} color={accent} />
    </View>

    {/* Text */}
    <View style={styles.cardBody}>
      <Text style={styles.cardLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.cardPeriod, { color: accent }]}>{period}</Text>
    </View>

    {/* Value */}
    <View style={styles.cardValueWrap}>
      <Text style={[styles.cardValue, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
      <Icon name="chevron-right" size={18} color={accent + '88'} />
    </View>
  </TouchableOpacity>
);

/* ─────────────────────────────────────────
   Main Screen
───────────────────────────────────────── */
const Dashboard = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { data: dashboardCards, refetch: dashboardRefetch } = useQuery({
    queryKey: ['dashboardCards'],
    queryFn: async () => {
      const res = await api.get('/api/pm/PropertyCrmDashboardData');
      return res.data?.data;
    },
  });

  useEffect(() => {
    dashboardRefetch();
  }, []);

  // BottomNav height: 60px + device bottom inset
  const bottomNavHeight = 5 + insets.bottom;

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Fixed Header — sits above content */}
      <Header />

      {/* Scrollable content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          // ✅ iOS fix: add bottom padding = bottomNav height so last card is not hidden
          { paddingBottom: bottomNavHeight },
        ]}
      >
        {/* Section heading */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>Dashboard</Text>
          <View style={styles.sectionLine} />
        </View>

        {/* Stat summary strip */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{dashboardCards?.total_leads_count ?? '—'}</Text>
            <Text style={styles.summaryLbl}>Total Leads</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{dashboardCards?.total_booking_till_date ?? '—'}</Text>
            <Text style={styles.summaryLbl}>Bookings</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{dashboardCards?.total_missed_callback ?? '—'}</Text>
            <Text style={styles.summaryLbl}>Missed</Text>
          </View>
        </View>

        {/* Cards */}
        {CARDS(dashboardCards, navigation).map((card, i) => (
          <Card
            key={i}
            {...card}
            onPress={() => navigation.navigate(card.route)}
          />
        ))}
      </ScrollView>

      {/* BottomNav pinned at the very bottom, respects safe area */}
      <BottomNav />
    </View>
  );
};

export default Dashboard;

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080d5a',
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  /* Section heading */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
    marginRight: 8,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 10,
  },

  /* Summary strip */
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryVal: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summaryLbl: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },

  /* Card */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
  Platform.OS === 'ios'
    ? 'rgba(255,255,255,0.22)'
    : 'rgba(233,225,225,0.36)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 10,
    overflow: 'hidden',
    paddingVertical: 14,
    paddingRight: 12,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 12,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardLabel: {
    color: '#e2e8f0',
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  cardPeriod: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  cardValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginRight: 2,
  },
});