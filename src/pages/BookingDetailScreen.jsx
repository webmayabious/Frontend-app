import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../Layout/Header';
const STATUSBAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight : 44;
const InfoRow = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || 'N/A'}</Text>
  </View>
);

const SectionCard = ({ title, children }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

const BookingDetailScreen = ({ navigation, route }) => {
  const data = route?.params?.id || {};
  console.log('id',data);
  

  return (
    <View  style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      
  <StatusBar
         translucent
         backgroundColor="transparent"
         barStyle="light-content"
       />
  {/* <Header /> */}
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* BASIC DETAILS */}
        <SectionCard title="BASIC BOOKING & CUSTOMER DETAILS">
          <InfoRow label="Booking Date:" value={data?.date_of_booking} />
          <InfoRow label="Project:" value={data?.project_name} />
          <InfoRow label="Location:" value={data?.location} />
          <InfoRow label="Customer Name:" value={data?.customer_name} />
          <InfoRow label="Mobile:" value={data?.mobile} />
          <InfoRow label="Email:" value={data?.email} />
          <InfoRow label="Address:" value={data?.address} />
          <InfoRow label="DOB:" value={data?.dob} />
          <InfoRow label="Gender:" value={data?.gender} />
          <InfoRow label="Marital Status:" value={data?.marital_status} />
        </SectionCard>

        {/* PROFESSIONAL */}
        <SectionCard title="PROFESSIONAL & PROPERTY DETAILS">
          <InfoRow label="Occupation:" value={data?.occupation} />
          <InfoRow label="Industry:" value={data?.industry} />
          <InfoRow label="Office Location:" value={data?.office_location} />
          <InfoRow label="Flat Type:" value={data?.flat_type} />
          <InfoRow label="Flat No:" value={data?.flat_no} />
          <InfoRow label="Tower:" value={data?.tower} />
          <InfoRow label="Floor:" value={data?.floor} />
          <InfoRow label="Carpet Area:" value={data?.carpet_area} />
          <InfoRow label="Saleable Area:" value={data?.saleable_area} />
          <InfoRow label="Agreement Value:" value={data?.agreement_value} />
          <InfoRow label="Loan:" value={data?.loan} />
        </SectionCard>

        {/* SALES */}
        <SectionCard title="SALES, DOCUMENTS & STATUS">
          <InfoRow label="Base Brokerage:" value={data?.base_brokerage} />
          <InfoRow label="Ladder Brokerage:" value={data?.ladder_brokerage} />
          <InfoRow label="Source:" value={data?.source} />
          <InfoRow label="Sales Manager:" value={data?.sales_manager} />
          <InfoRow label="City Head:" value={data?.city_head} />
          <InfoRow label="Team Lead:" value={data?.team_lead} />
        </SectionCard>

        {/* CANCEL BUTTON */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

export default BookingDetailScreen;
const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: '#0C0E41' },



  card: {
    backgroundColor: '#ffffff20',
    borderColor: '#ffffff6e',
    margin: 12,
    padding: 12,
    borderRadius: 12,
  },

  cardTitle: {
    color: '#cfd8dc',
    fontSize: 13,
    marginBottom: 10,
    fontWeight: 'bold',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  label: {
    color: '#ffb74d',
    fontSize: 12,
    flex: 1,
  },

  value: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },

  cancelBtn: {
    backgroundColor: '#2bb3c0',
    margin: 15,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  cancelText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});