import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { getFCMToken } from '../pages/utils/fcm';
import socket from '../socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import api from '../api/AxiosInstance';
import messaging from '@react-native-firebase/messaging';
import DeviceInfo from 'react-native-device-info';
import SplashScreen from '../Layout/SplashScreen';
// import socket from '../../socket'
// import AnimatedSplash from "../../AnimatedSplash";
const bgImage = require("../asset/image/mulyambg.png");
const mayaLogo = require('../asset/image/logo/mokhsLogo.png');

const LoginUI = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ userid: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [checkingLogin, setCheckingLogin] = useState(true);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  // Auto-login check with loading
  useEffect(() => {
    const checkToken = async () => {

       await new Promise(resolve => setTimeout(resolve, 2000));
      const token = await AsyncStorage.getItem('PM_TOKEN');
      const user = await AsyncStorage.getItem('PM_USER');
      const roles = await AsyncStorage.getItem('PM_ROLES'); // 👈 add this

      if (token && user) {
        dispatch({ type: 'setToken', payload: token });
        dispatch({ type: 'setUserInfo', payload: JSON.parse(user) });

        if (roles) {
          dispatch({ type: 'setRole', payload: JSON.parse(roles) });
        }

        // if (!socket.connected) {
        //   socket.auth = { token };
        //   socket.connect();
        // }
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          })
        );
      } else {
        setCheckingLogin(false);
      }
    };

    checkToken();
  }, []);
  if (checkingLogin) {
    return <SplashScreen />;
  }
  const handleLogin = async () => {
    if (!loginData.userid.trim() || !loginData.password.trim()) {
      Alert.alert('Error', 'Please enter User ID and Password');
      return;
    }

    try {
      setLoading(true);

      // FCM TOKEN
      const fcmToken = await getFCMToken();

      // DEVICE INFO (SAFE)
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceType = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
      const appVersion = DeviceInfo.getVersion();
      const buildNumber = DeviceInfo.getBuildNumber();
      let deviceName = 'Unknown Device';
      try {
        deviceName = await DeviceInfo.getDeviceName();
      } catch (e) { }

      const body = {
        ...loginData,
        fcm_token: fcmToken,
        mobile_device_id: deviceId,
        device_type: deviceType,
        device_name: deviceName,
        application_name: 'CRM_APP',
        app_version: appVersion,
        build_number: buildNumber,
      };
      console.log('📤 LOGIN REQUEST BODY:', body);
      const response = await api.post('/api/pm/auth/login', body);
      const data = response.data;

      if (!data.status) {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
        return;
      }

      // Save to AsyncStorage
      await AsyncStorage.setItem('PM_TOKEN', data.token);
      await AsyncStorage.setItem('PM_USER', JSON.stringify(data.user));
      await AsyncStorage.setItem('PM_ROLES', JSON.stringify(data.roles));

      // Redux Dispatch
      dispatch({ type: 'setToken', payload: data.token });
      dispatch({ type: 'setUserInfo', payload: data.user });
      dispatch({ type: 'setRole', payload: data.roles });

      // ✅ Socket Connect
      if (!socket.connected) {
        socket.auth = { token: data.token };
        socket.connect();
      }

      navigation.replace('Dashboard', {
        screen: 'Dashboard',
      });
    } catch (error) {
      console.log('❌ LOGIN ERROR:', error);

      Alert.alert(
        'Login Failed',
        error?.response?.data?.message || 'Something went wrong',
      );
    } finally {
      setLoading(false);
    }
  };

  // if (showSplash) {
  //   return <AnimatedSplash onFinish={() => setShowSplash(false)} />;
  // }

  return (
    <ImageBackground source={bgImage} style={styles.container}>
      <View style={styles.card}>
        <Image source={mayaLogo} style={styles.logo} />

        {/* User ID */}
        <View style={styles.inputBox}>
          <TextInput
            placeholder="User Id"
            placeholderTextColor="#888"
            style={styles.input}
            value={loginData.userid}
            onChangeText={text => setLoginData({ ...loginData, userid: text })}
          />
          <Image
            source={require('../asset/image/icon/face-scanner.png')}
            style={styles.icon}
          />
        </View>

        {/* Password */}
        <View style={styles.inputBox}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry={!showPassword}
            style={styles.input}
            value={loginData.password}
            onChangeText={text =>
              setLoginData({ ...loginData, password: text })
            }
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={require('../asset/image/icon/visual.png')}
              style={styles.icon}
            />
          </TouchableOpacity>
        </View>

        {/* Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

export default LoginUI;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '83%',
    backgroundColor: 'rgba(250, 248, 248, 0.21)',
    borderRadius: 20,
    padding: 20,
  },
  logo: {
    width: 150,
    height: 40,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 20,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  input: { flex: 1, height: 38, fontSize: 15, color: '#000' },
  icon: { width: 20, height: 20, resizeMode: 'contain', tintColor: '#0667bb' },
  button: {
    backgroundColor: '#0d6efd',
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
