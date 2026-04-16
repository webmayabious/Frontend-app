import messaging from '@react-native-firebase/messaging';

export async function initFCM() {
  await messaging().registerDeviceForRemoteMessages();
}

export async function getFCMToken() {
  await messaging().registerDeviceForRemoteMessages(); // SAFE GUARD
  return await messaging().getToken();
}