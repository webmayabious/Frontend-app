import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../Layout/Header';
import { useSelector } from 'react-redux';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Linking } from 'react-native';

const STATUSBAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight : 44;

/*  FILE URL BUILDER */
const buildFileUrl = (value) => {
  if (!value) return null;

  const v = String(value);

  if (v.startsWith('http')) return v;

  const key = v.replace(/^\/+/, '');

  return `https://pm2-files.s3.ap-south-1.amazonaws.com/property_booking/${key}`;
};

/* OPEN FILE */
const openFile = (url) => {
  if (!url) return;
  Linking.openURL(url);
};

/*  DOWNLOAD FILE */
const downloadFile = (url) => {
  if (!url) return;

  const fileName = url.split('/').pop();

  ReactNativeBlobUtil.config({
    fileCache: true,
    addAndroidDownloads: {
      useDownloadManager: true,
      notification: true,
      path: `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`,
    },
  })
    .fetch('GET', url)
    .then(() => console.log('Downloaded'))
    .catch(err => console.log(err));
};

/*  SAFE INFO ROW */
const InfoRow = ({ label, value }) => {
  let displayValue = value;

  if (value && typeof value === 'object') {
    displayValue =
      `${value.usr_fname || ''} ${value.usr_lname || ''}`.trim() || 'N/A';
  }

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{displayValue || 'N/A'}</Text>
    </View>
  );
};

/*  FILE ROW WITH ICONS */
const FileRow = ({ label, value }) => {
  const url = buildFileUrl(value);

  return (
    <View style={styles.row}>

      {/*  LABEL FIX */}
      <Text style={[styles.label, { flex: 2 }]}>
        {label}
      </Text>

      <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>

        <Text style={[styles.value, { flex: 0 }]}>
          {url ? 'File' : 'N/A'}
        </Text>

        {url && (
          <View style={{ flexDirection: 'row', marginLeft: 10 }}>

            {/* 👁 VIEW */}
            <TouchableOpacity onPress={() => openFile(url)} style={{ marginHorizontal: 5 }}>
              <Icon name="visibility" size={18} color="#4da3ff" />
            </TouchableOpacity>

            {/* ⬇ DOWNLOAD */}
            <TouchableOpacity onPress={() => downloadFile(url)} style={{ marginHorizontal: 5 }}>
              <Icon name="download" size={18} color="#4caf50" />
            </TouchableOpacity>

          </View>
        )}

      </View>

    </View>
  );
};

const SectionCard = ({ title, children }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

const BookingDetailScreen = ({ navigation, route }) => {
  const data = route?.params?.data || {};
  const userRole = useSelector(state => state.userRole);
  const isAdmin = userRole?.includes('ADMIN');

  return (
    <View style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* BASIC DETAILS */}
        <SectionCard title="BASIC BOOKING & CUSTOMER DETAILS">
          <InfoRow label="Booking Date:" value={data?.date_of_booking} />
          <InfoRow label="Project:" value={data?.propertyproject?.project_name} />
          <InfoRow label="Location:" value={data?.location} />
          <InfoRow label="Customer Name:" value={data?.name} />
          <InfoRow label="Mobile:" value={data?.mobile} />
          <InfoRow label="Email:" value={data?.email} />
          <InfoRow label="Address:" value={data?.address} />
          <InfoRow label="DOB:" value={data?.date_of_birth} />
          <InfoRow label="Gender:" value={data?.gender == 1 ? 'Male' : 'Female'} />
          <InfoRow label="Marital Status:" value={data?.marital_status} />
        </SectionCard>

        {/* PROFESSIONAL */}
        <SectionCard title="PROFESSIONAL & PROPERTY DETAILS">
          <InfoRow label="Occupation:" value={data?.occupation} />
          <InfoRow label="Industry:" value={data?.industry} />
          <InfoRow label="Office Location:" value={data?.office_location} />
          <InfoRow label="Flat Type:" value={data?.flat_type} />
          <InfoRow label="Flat No:" value={data?.flat_number} />
          <InfoRow label="Tower:" value={data?.tower_no} />
          <InfoRow label="Floor:" value={data?.floor} />
          <InfoRow label="Carpet Area:" value={data?.carpet_area} />
          <InfoRow label="Saleable Area:" value={data?.saleable_area} />
          <InfoRow label="Agreement Value:" value={data?.agreement_value} />
          <InfoRow label="Loan:" value={data?.loan_requirement} />
        </SectionCard>

        {/* SALES */}
        <SectionCard title="SALES, DOCUMENTS & STATUS">

          <InfoRow label="Base Brokerage:" value={data?.base_brokerage} />
          <InfoRow label="Ladder Brokerage:" value={data?.ladder_brokerage} />
          <InfoRow label="Source:" value={data?.source} />
          <InfoRow label="Sales Manager:" value={data?.sales_manager} />

          <InfoRow
            label="City Head:"
            value={
              data?.cityhead
                ? `${data.cityhead.usr_fname || ''} ${data.cityhead.usr_lname || ''}`.trim()
                : 'N/A'
            }
          />

          <InfoRow label="Team Lead:" value={data?.teamlead} />

          <InfoRow
            label="RelationshipManager:"
            value={
              data?.relationshipmanager
                ? `${data.relationshipmanager.usr_fname || ''} ${data.relationshipmanager.usr_lname || ''}`.trim()
                : 'N/A'
            }
          />

          <InfoRow
            label="Approval Status:"
            value={
              data?.booking_approval_status == 0
                ? 'Pending'
                : data?.booking_approval_status == 1
                ? 'Approved By City Head'
                : data?.booking_approval_status == 2
                ? isAdmin
                  ? 'Approved By Admin'
                  : 'Approved By Business Head'
                : 'N/A'
            }
          />

          {/* FILES WITH VIEW + DOWNLOAD */}
          <FileRow label="Agreement:" value={data?.agreement} />
          <FileRow label="Booking Form:" value={data?.booking_form} />
          <FileRow label="Cost Sheet:" value={data?.cost_sheet} />
          <FileRow label="PanCard:" value={data?.pan_card} />
          <FileRow label="AdharCard:" value={data?.aadhar_card} />
          <FileRow label="Others:" value={data?.others} />

          <InfoRow label="Status:" value={data?.active==1?'Active':'InActive'} />

          <InfoRow
            label="CreatedBy:"
            value={
              data?.createdby
                ? `${data.createdby.usr_fname || ''} ${data.createdby.usr_lname || ''}`.trim()
                : 'N/A'
            }
          />

        </SectionCard>

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

/* STYLES */
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
//   justifyContent: 'space-between',
  alignItems: 'center',
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