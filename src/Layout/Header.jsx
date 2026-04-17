import React, { useState } from "react";
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
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useSelector, useDispatch } from "react-redux";
import Entypo from 'react-native-vector-icons/Entypo';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import messaging from '@react-native-firebase/messaging';  // ✅ নতুন
import socket from '../socket';                             // ✅ নতুন (path ঠিক করো)
import api from '../api/AxiosInstance';                    // ✅ নতুন

const STATUSBAR_HEIGHT = Platform.OS === "android" ? StatusBar.currentHeight : 44;

const Header = () => {
  const userInfo = useSelector(state => state.userInfo);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [avatarLayout, setAvatarLayout] = useState(null);
  const navigation = useNavigation();
  const dispatch = useDispatch();  

  const handleLogout = async () => {
    try {
      
      const fcmToken = await messaging().getToken();
      await api.post('/api/pm/auth/logout', { fcm_token: fcmToken });

  
      await messaging().deleteToken();

      // ✅ Socket Disconnect
      if (socket.connected) {
        socket.disconnect();
      }

      // ✅ AsyncStorage Clear
      await AsyncStorage.removeItem('PM_TOKEN');
      await AsyncStorage.removeItem('PM_USER');
      await AsyncStorage.removeItem('PM_ROLES');

      // ✅ Redux Clear
      dispatch({ type: 'LOGOUT' });

      setProfileModalVisible(false);
      navigation.replace('Login');

    } catch (error) {
      console.log('❌ LOGOUT ERROR:', error);
      Alert.alert('Error', 'Logout failed');
    }
  };

  return (
    <View style={styles.header}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Left Section */}
      <View style={styles.leftSection}>
        {/* <Icon name="menu" size={24} color="#fff" /> */}
        <Image
          source={require("../asset/image/logo/mokhsLogo.png")}
          style={styles.logoImage}
        />
      </View>

      {/* Profile Avatar Trigger */}
      <TouchableOpacity
        onPress={() => setProfileModalVisible(true)}
        onLayout={(e) => setAvatarLayout(e.nativeEvent.layout)}
      >
        <Image
          source={
            userInfo?.image
              ? { uri: userInfo.image }
              : { uri: "https://i.pravatar.cc/100" }
          }
          style={styles.avatar}
        />
      </TouchableOpacity>

      {/* Profile Modal */}
      <Modal
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
            style={styles.modalContainer}
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
    paddingBottom: 12,
    paddingTop: STATUSBAR_HEIGHT + 10,
    backgroundColor: "#2B2E81",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
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
    top: STATUSBAR_HEIGHT + 40,
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
  modalName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  modalRole: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
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
});