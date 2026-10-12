import { Platform, AppState } from 'react-native';
import React, { useEffect, useRef } from 'react';
import StackNavigations from './src/navigations/StackNavigations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, useSelector } from 'react-redux';
import store from './src/redux/store';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { openFile } from './src/pages/utils/openFile';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { syncBadge } from './src/pages/Notification/syncBadge';

const queryClient = new QueryClient();

// ✅ MAIN APP (ALL LOGIC HERE)
function MainApp() {
  const stateRef = useRef(store.getState());
  const wasLoggedIn = useRef(false);
  const isLoggedIn = useSelector(state => state.isLoggedIn);

  // ✅ Foreground notification press (file open)
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

  // ✅ Notification Channel (Android)
  async function createNotificationChannel() {
    await notifee.createChannel({
      id: 'souravk-notification',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  // ✅ App Active hole: Tray Clear + Count Sync (only when logged in)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async state => {
      if (state === 'active' && stateRef.current.isLoggedIn) {
        try {
          await notifee.cancelAllNotifications();
          await syncBadge();
        } catch (err) {
          console.log('❌ Error:', err);
        }
      }
    });

    return () => sub.remove();
  }, []);

  // ✅ Login hole Count Sync, Logout hole iOS Badge 0
  useEffect(() => {
    if (isLoggedIn) {
      wasLoggedIn.current = true;
      syncBadge();
    } else if (wasLoggedIn.current) {
      wasLoggedIn.current = false;
      if (Platform.OS === 'ios') {
        notifee.setBadgeCount(0).catch(err =>
          console.log('❌ Badge reset error:', err),
        );
      }
    }
  }, [isLoggedIn]);

  // ✅ NEW: Foreground e notun push ashle count auto update
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async () => {
      if (stateRef.current.isLoggedIn) {
        await syncBadge();
      }
    });
    return unsubscribe;
  }, []);

  // ✅ Background / Quit Notification Click
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
    <SafeAreaProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MainApp />
        </QueryClientProvider>
      </Provider>
    </SafeAreaProvider>
  );
}