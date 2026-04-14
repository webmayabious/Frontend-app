import { AppRegistry, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import store from './src/redux/store';
import 'react-native-gesture-handler';

const CHANNEL_ID = 'souravk-notification';

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

async function displayNotification(remoteMessage) {
  await ensureChannel();

  const title =
    remoteMessage.data?.title ||
    remoteMessage.notification?.title ||
    'New Message';

  const body =
    remoteMessage.data?.body ||
    remoteMessage.notification?.body ||
    '';

  await notifee.displayNotification({
    title,
    body,
    data: remoteMessage.data,
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher',
      pressAction: { id: 'default' },
      sound: 'default',
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: {
        alert: true,
        badge: false,
        sound: true,
      },
    },
  });
}

// ✅ BACKGROUND HANDLER
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('🔥 BG MSG:', JSON.stringify(remoteMessage));

  // notification payload থাকলে FCM নিজেই দেখায়
  if (remoteMessage.notification) return;

  const title = remoteMessage.data?.title;
  if (!title) return;

  if (Platform.OS === 'ios') {
    const badgeCount = Number(remoteMessage.data?.badge || 0);
    await notifee.setBadgeCount(badgeCount);
  }

  await displayNotification(remoteMessage);
});

// ✅ FOREGROUND HANDLER
const seenMessageIds = new Set();

messaging().onMessage(async remoteMessage => {
  console.log('🔔 Foreground MSG:', JSON.stringify(remoteMessage));

  const state = store.getState();

  // ✅ undefined হলে block করবে না, শুধু false হলে skip
  if (state.isLoggedIn === false) return;

  // Deduplication
  const msgId = remoteMessage?.data?.message_id || remoteMessage?.messageId;
  if (msgId) {
    if (seenMessageIds.has(msgId)) {
      console.log('⛔ Duplicate skip');
      return;
    }
    seenMessageIds.add(msgId);
    if (seenMessageIds.size > 50) seenMessageIds.clear();
  }

  // Active chat-এ থাকলে notification দেখাবে না
  const { type, sender_id, group_id } = remoteMessage.data || {};
  const incomingChatId = type === 'group_chat' ? group_id : sender_id;
  if (
    incomingChatId &&
    state.isChatOpen &&
    String(state.activeChatId) === String(incomingChatId)
  ) {
    return;
  }

  // iOS stale message check
  if (Platform.OS === 'ios') {
    const badgeCount = Number(remoteMessage.data?.badge || 0);
    if (badgeCount > 0) await notifee.setBadgeCount(badgeCount);

    if (remoteMessage.notification && remoteMessage.sentTime) {
      const diffSeconds = (Date.now() - remoteMessage.sentTime) / 1000;
      if (diffSeconds > 5) {
        console.log('⛔ Old iOS pending message, skip');
        return;
      }
    }
  }

  console.log('📢 Displaying notification...');
  await displayNotification(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);