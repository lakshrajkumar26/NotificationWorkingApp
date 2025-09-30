// index.js
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// IMPORTANT: this runs in the background JS context (separate from UI).
// It cannot access your WebView UI. Use it to log, persist, or show a
// local notification (with notifee / react-native-push-notification).
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Message handled in the background!', remoteMessage);

  // Example: persist to AsyncStorage for later consumption by UI
  // (note: AsyncStorage is available in background JS too)
  try {
    const key = '@pv_bg_notification';
    const raw = JSON.stringify(remoteMessage);
    await require('@react-native-async-storage/async-storage').default.setItem(key, raw);
    console.log('[FCM] persisted background message to AsyncStorage');
  } catch (e) {
    console.warn('[FCM] persist bg message failed', e);
  }

  // If you want a visible system notification while app is backgrounded/killed,
  // use "notification" payload from server OR show a local notification here using
  // notifee / react-native-push-notification (not included in this snippet).
});

AppRegistry.registerComponent(appName, () => App);
