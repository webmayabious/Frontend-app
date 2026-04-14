import { Platform, PermissionsAndroid, AppState } from 'react-native';
import React, { useEffect, useRef } from 'react';
import StackNavigations from './src/navigations/StackNavigations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, useSelector } from 'react-redux';
import store from './src/redux/store';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import api from './src/api/AxiosInstance';
import socket from './src/socket';
import { openFile } from './src/pages/utils/openFile';
import  { EventType } from '@notifee/react-native';
const queryClient = new QueryClient();

// ✅ MAIN APP (ALL LOGIC HERE)
function MainApp() {
  const stateRef = useRef(store.getState());
  const lastMessageId = useRef(null);
  const isLoggedIn = useSelector(state => state.isLoggedIn);


  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      console.log('NOTIFICATION DETAIL:', detail);
      if (type === EventType.PRESS) {
        const filePath = detail.notification?.data?.path;

        if (filePath) {
          await openFile(filePath);

          await notifee.cancelNotification(detail.notification.id);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ Notification permission (Android 13+)
  useEffect(() => {
    const requestPermission = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        await notifee.requestPermission();
      }
    };

    requestPermission();
  }, []);



  // ✅ Store state sync
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      stateRef.current = store.getState();
    });
    return unsubscribe;
  }, []);

  // ✅ INIT
  useEffect(() => {
    init();
  }, []);

  async function init() {
    if (Platform.OS === 'android') {
      await createNotificationChannel();
    }
    if (Platform.OS === 'ios') {
      await requestUserPermission();
    }
  }

  // ✅ Android 13+ Permission
  async function requestAndroidPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      console.log('🔔 Android Permission:', granted);
    }
  }

  
  // useEffect(() => {
  //   if (!isLoggedIn) return;

  //   let unsubscribeTokenRefresh;

  //   async function initNotifications() {
  //     console.log('✅ Login → Init Notification');
  //     requestAndroidPermission();

  //     const granted = await requestUserPermission();

  //     if (granted) {
  //       await getFCMToken();
  //       unsubscribeTokenRefresh = messaging().onTokenRefresh(newToken => {
  //         console.log('🔄 Token Refresh:', newToken);
  //       });
  //     }
  //   }

  //   initNotifications();

  //   return () => {
  //     if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
  //   };
  // }, [isLoggedIn]);

  // ✅ Login এ Badge Sync
  // useEffect(() => {
  //   if (!isLoggedIn) return;

  //   async function syncBadgeOnLogin() {
  //     try {
  //       const res = await api.get('/api/pm/fetchUnreadChatCount');
  //       console.log('📦 API RESPONSE:', res.data);
  //       const count = Number(res.data?.totalUnreadChat || 0);

  //       if (Platform.OS === 'ios') {
  //         await notifee.cancelAllNotifications();
  //         await notifee.setBadgeCount(count);
  //       }
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   }

  //   syncBadgeOnLogin();
  // }, [isLoggedIn]);

  // ✅ iOS Permission
  async function requestUserPermission() {
    const authStatus = await messaging().requestPermission({
      alert: true,
      badge: true,
      sound: true,
    });

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      if (Platform.OS === 'ios') {
        await messaging().registerDeviceForRemoteMessages();
      }
      console.log('✅ Permission granted:', authStatus);
    } else {
      console.warn('❌ Permission denied');
    }
    return enabled;
  }

  // ✅ FCM Token
  async function getFCMToken() {
    try {
      const token = await messaging().getToken();
      console.log('📱 FCM TOKEN:', token);
      return token;
    } catch (error) {
      console.log('❌ Token Error:', error);
    }
  }

  // ✅ Notification Channel (Android)
  async function createNotificationChannel() {
    await notifee.createChannel({
      id: 'souravk-notification',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  // ✅ App Active হলে Tray Clear + Badge Sync
  useEffect(() => {
    const sub = AppState.addEventListener('change', async state => {
      if (state === 'active') {
        try {
          console.log('📱 App Open → Clear Tray + Sync Badge');

          await notifee.cancelAllNotifications();

          const res = await api.get('/api/pm/fetchUnreadChatCount');
          console.log('unread count--', res.data);
          const count = Number(res.data?.totalUnreadChat || 0);

          if (Platform.OS === 'ios') {
            await notifee.setBadgeCount(count);
          }
        } catch (err) {
          console.log('❌ Error:', err);
        }
      }
    });

    return () => sub.remove();
  }, []);

  // ✅ Socket থেকে Badge Update
  // useEffect(() => {
  //   const handleUnreadCount = async data => {
  //     console.log('🔥 SOCKET HIT:', data);
  //     const count = Number(data?.total_unread || 0);

  //     try {
  //       if (Platform.OS === 'ios') {
  //         await notifee.setBadgeCount(count);
  //       }
  //       console.log('🎯 Badge Updated:', count);
  //     } catch (err) {
  //       console.log('❌ Badge update error:', err);
  //     }
  //   };

  //   socket.on('global_chat_unread_count_sk', handleUnreadCount);

  //   return () => {
  //     socket.off('global_chat_unread_count_sk', handleUnreadCount);
  //   };
  // }, []);

  // ✅ Background Notification Click
  useEffect(() => {
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📲 Background tap:', remoteMessage);
    });

    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('🚀 Open from quit:', remoteMessage);
        }
      });

    return unsubscribe;
  }, [isLoggedIn]);

  return <StackNavigations />;
}

// ✅ ROOT APP
export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MainApp />
      </QueryClientProvider>
    </Provider>
  );
}