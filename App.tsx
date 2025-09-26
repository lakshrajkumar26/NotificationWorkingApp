// /**
//  * Sample React Native App
//  * https://github.com/facebook/react-native
//  *
//  * @format
//  */

// import { NewAppScreen } from '@react-native/new-app-screen';
// import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
// import {
//   SafeAreaProvider,
//   useSafeAreaInsets,
// } from 'react-native-safe-area-context';

// function App() {
//   const isDarkMode = useColorScheme() === 'dark';

//   return (
//     <SafeAreaProvider>
//       <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
//       <AppContent />
//     </SafeAreaProvider>
//   );
// }

// function AppContent() {
//   const safeAreaInsets = useSafeAreaInsets();

//   return (
//     <View style={styles.container}>
//       <NewAppScreen
//         templateFileName="App.tsx"
//         safeAreaInsets={safeAreaInsets}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
// });

// export default App;
// App.js
import React, { useEffect } from 'react';
import { Alert, View, Text } from 'react-native';
import messaging from '@react-native-firebase/messaging';

async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  return enabled;
}

export default function App() {
  useEffect(() => {
    // 1. Request permission
    requestUserPermission().then(enabled => {
      if (enabled) console.log('Notification permission granted.');
      else console.log('Notification permission not granted.');
    });

    // 2. Get FCM token (device token)
    messaging()
      .getToken()
      .then(token => {
        console.log('FCM Token:', token);
        // send this token to your server or copy it to use in Firebase console
      })
      .catch(err => console.warn('getToken error', err));

    // 3. Listen to token refresh
    const tokenUnsub = messaging().onTokenRefresh(token => {
      console.log('Token refreshed:', token);
    });

    // 4. Foreground message handler
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      Alert.alert('A new FCM message arrived!', JSON.stringify(remoteMessage.notification));
    });

    // 5. Background & quit state: handle when user taps notification
    const unsubscribeOnOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      // navigate or handle the message
    });

    // 6. Check whether application opened from a quit state due to a notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('App opened from quit state by notification:', remoteMessage);
        }
      });

    return () => {
      tokenUnsub();
      unsubscribeOnMessage();
      unsubscribeOnOpened();
    };
  }, []);

  return (
    <View style={{flex:1, alignItems:'center', justifyContent:'center'}}>
      <Text>Firebase Push Demo</Text>
    </View>
  );
}


