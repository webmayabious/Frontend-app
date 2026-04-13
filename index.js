import { AppRegistry, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import store from './src/redux/store';
import 'react-native-gesture-handler'; 
// ✅ BACKGROUND HANDLER
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log("🔥 BG MSG:", JSON.stringify(remoteMessage));

  if (remoteMessage.notification) return;
  
  const title = remoteMessage.data?.title;
  const body = remoteMessage.data?.body;
  if (!title) return;

  const badgeCount = Number(remoteMessage.data?.badge || 0);

  if (Platform.OS === "ios") {
    await notifee.setBadgeCount(badgeCount);
  }

  if (Platform.OS === "android") {
    await notifee.createChannel({
      id: "souravk-notification",
      name: "Default Channel",
      importance: AndroidImportance.HIGH,
    });
  }

  await notifee.displayNotification({
    title,
    body: body ?? "",
    data: remoteMessage.data,
    android: {
      channelId: "souravk-notification",
      smallIcon: "ic_launcher",
      pressAction: { id: "default" },
      sound: "default",
    },
    ios: {
      sound: "default",
      badgeCount,
    },
  });
});

// ✅ FOREGROUND HANDLER
const lastMessageId = { current: null };

messaging().onMessage(async remoteMessage => {
  console.log("🔔 Foreground MSG:", JSON.stringify(remoteMessage));

  const state = store.getState();
  if (!state.isLoggedIn) return;

  const msgId = remoteMessage?.data?.message_id || remoteMessage?.messageId;
  if (msgId && lastMessageId.current === msgId) {
    console.log("⛔ Duplicate skip");
    return;
  }
  if (msgId) lastMessageId.current = msgId;

  const { type, sender_id, group_id } = remoteMessage.data || {};
  const incomingChatId = type === "group_chat" ? group_id : sender_id;

  if (
    incomingChatId &&
    state.isChatOpen &&
    String(state.activeChatId) === String(incomingChatId)
  ) {
    return;
  }

  if (Platform.OS === "ios") {
    const badgeCount = Number(remoteMessage.data?.badge || 0);
    if (badgeCount > 0) await notifee.setBadgeCount(badgeCount);

    if (remoteMessage.notification) {
      const sentTime = remoteMessage.sentTime;

      // ✅ sentTime
      if (sentTime) {
        const diffSeconds = (Date.now() - sentTime) / 1000;
        console.log("⏱️ diffSeconds:", diffSeconds);

        if (diffSeconds > 5) {
          console.log("⛔ Old iOS pending message, skip");
          return;
        }
      }
      // sentTime 
    }
  }

  if (Platform.OS === "android") {
    await notifee.createChannel({
      id: "souravk-notification",
      name: "Default Channel",
      importance: AndroidImportance.HIGH,
    });
  }

  const title =
    remoteMessage.data?.title ||
    remoteMessage.notification?.title ||
    "New Message";

  const body =
    remoteMessage.data?.body ||
    remoteMessage.notification?.body ||
    "";

  await notifee.displayNotification({
    title,
    body,
    data: remoteMessage.data,
    android: {
      channelId: "souravk-notification",
      smallIcon: "ic_launcher",
      pressAction: { id: "default" },
      sound: "default",
    },
    ios: {
      sound: "default",
      foregroundPresentationOptions: {
        alert: true,
        badge: false,
        sound: true,
      },
    },
  });
});

AppRegistry.registerComponent(appName, () => App);