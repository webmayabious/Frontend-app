import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  StatusBar,
  Platform,
  TouchableOpacity,
  Modal,
  Alert,
  Text,
  Dimensions,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import Entypo from 'react-native-vector-icons/Entypo';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import api from '../api/AxiosInstance';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from 'react-native-vector-icons/Ionicons';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCREEN_FULL_HEIGHT = Dimensions.get('screen').height;
const {height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (SCREEN_HEIGHT / 812) * size;
const Header = ({ routeName }) => {
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === "android"
    ? (StatusBar.currentHeight || insets.top || 24)
    : insets.top;

  const userInfo = useSelector(state => state.userInfo);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [avatarLayout, setAvatarLayout] = useState(null);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });
  const handleLogout = async () => {
    try {
      const fcmToken = await messaging().getToken();

      // 1. ALWAYS clear app state first
      await AsyncStorage.removeItem('PM_TOKEN');
      await AsyncStorage.removeItem('PM_USER');
      await AsyncStorage.removeItem('PM_ROLES');

      dispatch({ type: 'LOGOUT' });

      // Badge reset + tray clear
      try {
        await notifee.cancelAllNotifications();
        if (Platform.OS === 'ios') {
          await notifee.setBadgeCount(0);
        }
      } catch (e) {
        console.log('Badge reset error:', e);
      }

      // 2. navigate immediately
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });

      // 3. then call API in background (non-blocking)
      api.post('/api/pm/auth/logout', { fcm_token: fcmToken })
        .catch(err => console.log('logout API failed (ignored)', err));

      await messaging().deleteToken();

      setProfileModalVisible(false);
    } catch (error) {
      console.log('Logout error:', error);
      Alert.alert('Error', 'Logout failed');
    }
  };
const avatarRef = useRef(null);

const openProfileMenu = () => {
  avatarRef.current?.measure((fx, fy, width, height, px, py) => {
    setMenuAnchor({ x: px, y: py + height });
    setProfileModalVisible(true);
  });
};
  return (
    <View style={[styles.header, { paddingTop: statusBarHeight + 10 }]}>
      {/* Same background as Meeting / Dashboard screens */}
      <Image
        source={require('../asset/image/bg-img.png')}
        style={styles.bgImageFixed}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Left Section */}
      <View style={styles.leftSection}>
        <Image
          source={require("../asset/image/logo/mokhsLogo.png")}
          style={styles.logoImage}
        />
      </View>

      {/* Profile Avatar Trigger */}
      {/* <TouchableOpacity
        // onPress={() => setProfileModalVisible(true)}
        ref={avatarRef} onPress={openProfileMenu}
        onLayout={(e) => setAvatarLayout(e.nativeEvent.layout)}
      >
        <Image
          source={
            userInfo?.image
              ? { uri: userInfo.image || '' }
              : { uri: "https://cdn-icons-png.flaticon.com/512/5951/5951752.png" }
          }
          style={styles.avatar}
        />
      </TouchableOpacity> */}
{userInfo ? (
  <TouchableOpacity
    ref={avatarRef}
    onPress={openProfileMenu}
    onLayout={e => setAvatarLayout(e.nativeEvent.layout)}
  >
    <Image
      source={{
        uri: userInfo.image || 'https://cdn-icons-png.flaticon.com/512/5951/5951752.png',
      }}
      style={styles.avatar}
    />
  </TouchableOpacity>
) : null}
      {/* Profile Modal */}
      {/* <Modal
        visible={profileModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setProfileModalVisible(false)}
        >
          <View
            // style={styles.modalContainer}
             style={[
                styles.modalContainer,
                {
                  position: 'absolute',
                  top: menuAnchor.y + (Platform.OS === 'ios' ? 12 : -18),
                  right: 18,
                },
              ]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.arrow} />

            <Text style={styles.modalName}>
              {userInfo?.Fname || 'User'} {userInfo?.Lname || ''}
            </Text>

            <Text style={styles.modalRole}>
              {userInfo?.departments?.length > 0
                ? userInfo.departments.map(d => d.dep_name).join(', ')
                : 'No Department'}
            </Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Entypo name="log-out" size={20} color="#fff" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 10 }}
              onPress={() => setProfileModalVisible(false)}
            >
              <Text style={{ color: '#4f6d7a', textAlign: 'center' }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal> */}
      <Modal
  transparent
  visible={profileModalVisible}
  animationType="fade"
  onRequestClose={() => setProfileModalVisible(false)}
>
  {/* invisible backdrop – tap outside to close */}
  <TouchableOpacity
    style={StyleSheet.absoluteFillObject}
    activeOpacity={1}
    onPress={() => setProfileModalVisible(false)}
  />

  <View
    style={[
      styles.menuContainer,
      {
        position: 'absolute',
        top: menuAnchor.y + (Platform.OS === 'ios' ? 12 : -18),
        right: 18,
      },
    ]}
  >
    <View style={styles.menuArrow} />

    {/* USER INFO */}
    <View style={{ paddingTop: verticalScale(4) }}>
      <Text style={styles.modalName}>
        {userInfo?.Fname || ''} {userInfo?.Lname || ''}
      </Text>
      <Text style={styles.modalRole}>
        {userInfo?.departments?.length > 0
          ? userInfo.departments.map(d => d.dep_name).join(', ')
          : ''}
      </Text>
    </View>

    <View style={styles.divider} />

    {/* LOGOUT */}
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={0.7}
      onPress={handleLogout}
    >
      <Ionicons
        name="log-out-outline"
        size={18}
        color="#ff5c5c"
        style={{ marginRight: scale(10) }}
      />
      <Text style={[styles.menuText, { color: '#ff5c5c', fontWeight: '600' }]}>
        Log Out
      </Text>
    </TouchableOpacity>
  </View>
</Modal>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 20,
    backgroundColor: "#1a2d3e",
    overflow: "hidden",
  },
  bgImageFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_FULL_HEIGHT,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_FULL_HEIGHT,
    backgroundColor: 'rgba(18,32,48,0.72)',
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    position: 'absolute',
    top: 90,
    right: 12,
    width: 240,
    backgroundColor: 'rgba(20, 20, 25, 0.98)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    borderBottomWidth: 3,
    borderBottomColor: '#2488b5',
  },
  arrow: {
    position: 'absolute',
    top: -7,
    right: 20,
    width: 14,
    height: 14,
    backgroundColor: 'rgba(20, 20, 25, 0.98)',
    transform: [{ rotate: '45deg' }],
  },
  // modalName: {
  //   color: '#fff',
  //   fontWeight: 'bold',
  //   fontSize: 16,
  //   marginBottom: 4,
  //   textAlign: 'center',
  //   textTransform: 'uppercase',
  // },
  modalRole: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  // menuItem: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   paddingVertical: 12,
  //   borderBottomWidth: 1,
  //   borderBottomColor: 'rgba(255,255,255,0.1)',
  // },
  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  logoImage: {
    width: 120,
    height: 33,
    resizeMode: "contain",
    marginLeft: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  menuContainer: {
  width: scale(151),
  backgroundColor: '#21283a',
  borderRadius: scale(14),
  paddingVertical: verticalScale(8),
  borderWidth: 1,
  borderColor: '#3a3a3a',
  elevation: 20,
  overflow: 'visible',
},
menuArrow: {
  position: 'absolute',
  top: -8,
  right: scale(18),
  width: 0,
  height: 0,
  borderLeftWidth: 8,
  borderRightWidth: 8,
  borderBottomWidth: 8,
  borderLeftColor: 'transparent',
  borderRightColor: 'transparent',
  borderBottomColor: '#2a2a2a',
},
modalName: {
  color: '#fff',
  fontSize: scale(12),
  fontWeight: '600',
  marginTop: verticalScale(5),
  marginBottom: verticalScale(4),
  paddingHorizontal: scale(12),
  textAlign: 'center',
  textTransform: 'uppercase',
},
modalRole: {
  color: '#aaa',
  fontSize: scale(10.5),
  marginBottom: verticalScale(10),
  paddingHorizontal: scale(10),
  textAlign: 'center',
},
divider: {
  height: StyleSheet.hairlineWidth,
  backgroundColor: '#444',
  marginHorizontal: scale(10),
},
menuItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: verticalScale(11),
  paddingHorizontal: scale(16),
  marginHorizontal: scale(6),
  marginTop: verticalScale(2),
  borderRadius: scale(8),
},
menuText: { color: '#fff', fontSize: scale(13), fontWeight: '500' },
});