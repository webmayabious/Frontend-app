import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import ReactNativeBlobUtil from 'react-native-blob-util';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (SCREEN_HEIGHT / 812) * size;

/* FILE URL BUILDER */
const buildFileUrl = value => {
  if (!value) return null;

  const v = String(value);

  if (v.startsWith('http')) return v;

  const key = v.replace(/^\/+/, '');

  return `https://pm2-files.s3.ap-south-1.amazonaws.com/property_booking/${key}`;
};

/* OPEN FILE */
const openFile = url => {
  if (!url) return;
  Linking.openURL(url);
};

/* DOWNLOAD FILE */
const downloadFile = url => {
  if (!url) return;

  const fileName = url.split('/').pop();

  if (Platform.OS === 'ios') {
    // iOS has no public "Downloads" folder or DownloadManager like Android.
    // Save into the app's Documents directory, then hand it to
    // previewDocument() so the user gets the native preview/share sheet
    // and can save it to Files, AirDrop it, etc.
    const path = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${fileName}`;

    ReactNativeBlobUtil.config({
      fileCache: true,
      path,
    })
      .fetch('GET', url)
      .then(res => {
        const filePath = res.path();
        ReactNativeBlobUtil.ios.previewDocument(filePath);
      })
      .catch(err => console.log('iOS download error:', err));
  } else {
    ReactNativeBlobUtil.config({
      fileCache: true,
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: fileName,
        path: `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`,
      },
    })
      .fetch('GET', url)
      .then(() => console.log('Downloaded'))
      .catch(err => console.log('Android download error:', err));
  }
};

/* SAFE INFO ROW */
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

/* FILE ROW WITH ICONS */
const FileRow = ({ label, value }) => {
  const url = buildFileUrl(value);

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { flex: 2 }]}>{label}</Text>

      <View
        style={{
          flex: 2,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        {url ? (
          <Icon name="insert-drive-file" size={24} color="#f5be0b" />
        ) : (
          <Text style={styles.value}>N/A</Text>
        )}

        {url && (
          <View style={{ flexDirection: 'row', marginLeft: 10 }}>
            {/* VIEW */}
            <TouchableOpacity
              onPress={() => openFile(url)}
              style={{ marginHorizontal: 5 }}
            >
              <Icon name="visibility" size={18} color="#4da3ff" />
            </TouchableOpacity>

            {/* DOWNLOAD */}
            <TouchableOpacity
              onPress={() => downloadFile(url)}
              style={{ marginHorizontal: 5 }}
            >
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

  const fullName = u =>
    u ? `${u.usr_fname || ''} ${u.usr_lname || ''}`.trim() || 'N/A' : 'N/A';

  const approvalText =
    data?.booking_approval_status == 0
      ? 'Pending'
      : data?.booking_approval_status == 1
      ? 'Approved By City Head'
      : data?.booking_approval_status == 2
      ? 'Approved By Admin/Approved By Business Head'
      : 'N/A';

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

        {/* TOP BAR */}
        <View style={[styles.topBarContainer, { paddingTop: verticalScale(10) }]}>
          <View style={styles.topBar}>
            <View style={styles.leftHeader}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon1 name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              <Icon name="description" size={20} color="#ffffff" />
              <Text style={styles.screenTitle} numberOfLines={1}>
                Booking Details
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
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
            <InfoRow label="Total Brokerage:" value={data?.base_brokerage} />
            <InfoRow label="Ladder Brokerage:" value={data?.ladder_brokerage} />
            <InfoRow label="Source:" value={data?.source} />
            <InfoRow label="Sales Manager:" value={data?.sales_manager} />
            <InfoRow label="City Head:" value={fullName(data?.cityhead)} />
            <InfoRow label="Team Lead:" value={data?.teamlead} />
            <InfoRow
              label="RelationshipManager:"
              value={fullName(data?.relationshipmanager)}
            />
            <InfoRow label="Approval Status:" value={approvalText} />

            {/* FILES WITH VIEW + DOWNLOAD */}
            <FileRow label="Agreement:" value={data?.agreement} />
            <FileRow label="Booking Form:" value={data?.booking_form} />
            <FileRow label="Cost Sheet:" value={data?.cost_sheet} />
            <FileRow label="PanCard:" value={data?.pan_card} />
            <FileRow label="AdharCard:" value={data?.aadhar_card} />
            <FileRow label="Others:" value={data?.others} />

            <InfoRow label="Status:" value={data?.active == 1 ? 'Active' : 'InActive'} />
            <InfoRow label="CreatedBy:" value={fullName(data?.createdby)} />
          </SectionCard>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default BookingDetailScreen;

/* STYLES */
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

  /* Header pill */
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
  backBtn: { paddingRight: 8, justifyContent: 'center', alignItems: 'center' },
  screenTitle: {
    color: '#ffffff',
    fontSize: 15,
    marginLeft: 6,
    fontWeight: '700',
    flexShrink: 1,
  },

  listContent: { paddingHorizontal: 14, paddingBottom: 120 },

  /* Card (same as list page) */
  card: {
    backgroundColor: 'rgba(4, 35, 70, 0.62)',
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 0,
    borderLeftColor: '#52c97c',
  },
  cardTitle: {
    color: '#ffb300',
    fontSize: 12,
    marginBottom: 10,
    fontWeight: '700',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: { color: '#afaea5', fontSize: 11.5, flex: 1, lineHeight: 18 },
  value: { color: '#ffffff', fontSize: 11.5, flex: 1, textAlign: 'right' },

  cancelBtn: {
    backgroundColor: '#1e9ce8',
    marginTop: 5,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});