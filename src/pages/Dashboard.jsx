import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../Layout/Header';
import BottomNav from '../navigations/BottomNav';
import { useNavigation } from '@react-navigation/native';
import api from '../api/AxiosInstance';
import { useQuery } from '@tanstack/react-query';

/* ================= Reusable Card ================= */
const Card = ({ title, subtitle, value, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.cardLeft}>
      <Icon name="calendar-today" size={18} color="#9be7a1" />

      <View style={styles.textContainer}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </View>

    <View style={styles.valueContainer}>
      <Text style={styles.cardValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </TouchableOpacity>
);

/* ================= Main Screen ================= */
const Dashboard = () => {
  const navigation = useNavigation();

  const { data: dashboardCards } = useQuery({
    queryKey: ['dashboardCards'],
    queryFn: async () => {
      const res = await api.get('/api/pm/PropertyCrmDashboardData');
      return res.data?.data;
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <Header />

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 15 }}
        >
          {/* Header */}
          <View style={styles.dashboardHeader}>
            <Icon name="dashboard" size={18} color="#cfd8dc" />
            <Text style={styles.dashboardText}>Dashboard</Text>
          </View>

          {/* Cards */}
          <Card
            title="Follow-ups / Meetings"
            subtitle="Today"
            value={`${dashboardCards?.todays_callbacks || 0} / ${dashboardCards?.todays_meetings || 0}`}
            onPress={() => navigation.navigate('FollowUpsScreen')}
          />

          <Card
            title="Site Visits / Bookings"
            subtitle="Today"
            value={`${dashboardCards?.todays_site_visits || 0} / ${dashboardCards?.todays_booking || 0}`}
            onPress={() => navigation.navigate('SiteVisitsScreen')}
          />

          <Card
            title="Active Leave / Total Leads"
            subtitle="Month"
            value={`${dashboardCards?.total_active_leads || 0} / ${dashboardCards?.total_leads_count || 0}`}
            onPress={() => navigation.navigate('TotalLeadScreen')}
          />

          <Card
            title="Total Bookings / Agreements"
            subtitle="Month"
            value={`${dashboardCards?.total_bookings_per_month || 0} / ₹${dashboardCards?.total_agreement_value_per_month || 0}`}
          />

          <Card
            title="Total Bookings / Agreements"
            subtitle="Till Date"
            value={`${dashboardCards?.total_booking_till_date || 0} / ₹${dashboardCards?.total_agreement_value_till_date || 0}`}
          />

          <Card
            title="Missed Follow Up"
            subtitle="Month"
            value={`${dashboardCards?.total_missed_callback || 0}`}
            onPress={() => navigation.navigate('MissedFollowup')}
          />

          <Card
            title="Uploaded Leads"
            subtitle="Today"
            value={`${dashboardCards?.total_leads_uploaded_today || 0}`}
            onPress={() => navigation.navigate('UploadedLeads')}
          />

          <Card
            title="Leads List"
            subtitle="Till Date"
            value="-"
            onPress={() => navigation.navigate('LeadsListScreen')}
          />
        </ScrollView>
      </SafeAreaView>

      <BottomNav />
    </View>
  );
};

export default Dashboard;

/* ================= Styles ================= */

const STATUSBAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight : 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070c4d',
  },

  /* Card */
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(233, 225, 225, 0.41)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
  },

  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  textContainer: {
    marginLeft: 10,
    flex: 1,
  },

  cardTitle: {
    color: '#fff',
    fontSize: 14,
    flexShrink: 1,
  },

  cardSubtitle: {
    color: '#fbc02d',
    fontSize: 12,
  },

  valueContainer: {
    marginLeft: 10,
    maxWidth: 100,
    alignItems: 'flex-end',
  },

  cardValue: {
    color: '#fbc02d',
    fontWeight: 'bold',
    textAlign: 'right',
  },

  /* Header */
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 15,
  },

  dashboardText: {
    color: '#cfd8dc',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
});