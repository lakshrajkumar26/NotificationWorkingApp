// // App.tsx
// import React, { useEffect, useRef, useState } from 'react';
// import { SafeAreaView, Platform, Alert } from 'react-native';
// import { WebView, WebViewMessageEvent } from 'react-native-webview';
// import messaging from '@react-native-firebase/messaging';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import DeviceInfo from 'react-native-device-info';

// const SERVER_BASE = 'https://aparkfinder-abackend.onrender.com';
// const SAVE_TOKEN_BASIC_URL = `${SERVER_BASE}/api/users/save-token`;
// const WEB_URL = 'https://park-vech-android.vercel.app';

// const LOCAL_TOKEN_KEY = '@pv_pending_token';
// const LOCAL_USERID_KEY = '@pv_pending_userid';

// const INJECTED = `
// (function(){
//   try {
//     window.__IS_RN_WEBVIEW = true;
//     window.__sendUserToRN = function(){ 
//       try {
//         if (typeof window.sendUserToRN === 'function') {
//           window.sendUserToRN(window.__CURRENT_USER_FOR_RN || null);
//           return;
//         }
//         if (window.__CURRENT_USER_FOR_RN && window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
//           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'USER_INFO', user: window.__CURRENT_USER_FOR_RN }));
//         }
//       } catch(e){}
//     }
//   } catch(e){}
//   true;
// })();
// `;

// export default function App() {
//   const webRef = useRef<WebView | null>(null);
//   const [nativeToken, setNativeToken] = useState<string | null>(null);
//   const [userIdFromWeb, setUserIdFromWeb] = useState<string | null>(null);
//   const postedSetRef = useRef<Set<string>>(new Set());

//   // AsyncStorage helpers
//   async function saveTokenLocally(token: string) {
//     await AsyncStorage.setItem(LOCAL_TOKEN_KEY, token).catch(e => console.warn('[App] saveTokenLocally error', e));
//     console.log('[App] Stored pending token locally.');
//   }
//   async function getLocalToken() {
//     return await AsyncStorage.getItem(LOCAL_TOKEN_KEY).catch(e => { console.warn('[App] getLocalToken error', e); return null; });
//   }
//   async function clearLocalToken() {
//     await AsyncStorage.removeItem(LOCAL_TOKEN_KEY).catch(() => {});
//     console.log('[App] Cleared pending token.');
//   }
//   async function saveUserIdLocally(userId: string) {
//     await AsyncStorage.setItem(LOCAL_USERID_KEY, userId).catch(e => console.warn('[App] saveUserIdLocally error', e));
//     console.log('[App] Stored pending userId locally.');
//   }
//   async function getLocalUserId() {
//     return await AsyncStorage.getItem(LOCAL_USERID_KEY).catch(e => { console.warn('[App] getLocalUserId error', e); return null; });
//   }
//   async function clearLocalUserId() {
//     await AsyncStorage.removeItem(LOCAL_USERID_KEY).catch(() => {});
//     console.log('[App] Cleared pending userId.');
//   }

// // build a descriptive deviceInfo string using react-native-device-info
// async function getDeviceInfoString() {
//   try {
//     const isEmulator = await DeviceInfo.isEmulator();
//     const brand = DeviceInfo.getBrand?.() ?? '';
//     const model = DeviceInfo.getModel?.() ?? '';
//     const systemVersion = DeviceInfo.getSystemVersion?.() ?? Platform.Version?.toString?.();
//     const appVersion = DeviceInfo.getVersion?.() ?? '';
//     const kind = isEmulator ? (Platform.OS === 'android' ? 'Emulator' : 'Simulator') : 'Device';

//     const info = `${Platform.OS} / RN ${kind} - ${brand} ${model} (OS ${systemVersion}) app ${appVersion}`;

//     // 🔎 DEBUG log
//     console.log('[App] Built deviceInfo string:', info);

//     return info;
//   } catch (e) {
//     console.warn('[App] getDeviceInfoString failed', e);
//     const fallback = `${Platform.OS} / RN (OS ${Platform.Version})`;
//     console.log('[App] Using fallback deviceInfo string:', fallback);
//     return fallback;
//   }
// }


//   // POST token to backend with deviceInfo
//   async function postTokenToBackend(userId: string | null, token: string) {
//     if (!token) return false;
//     const key = `${userId ?? 'null'}|${token}`;
//     if (postedSetRef.current.has(key)) {
//       console.log('[App] Already posted this token for this userId -> skip', key);
//       return true;
//     }

//     const deviceInfo = await getDeviceInfoString();
//     const payload: any = { fcmToken: token, deviceInfo };
//     if (userId) payload.userId = userId;

//     try {
//       console.log('[App] POSTing token to backend', { url: SAVE_TOKEN_BASIC_URL, payload });
//       const res = await fetch(SAVE_TOKEN_BASIC_URL, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       });
//       const txt = await res.text().catch(() => '');
//       console.log('[App] postTokenToBackend response', res.status, txt);
//       if (res.ok) {
//         postedSetRef.current.add(key);
//         return true;
//       } else {
//         return false;
//       }
//     } catch (err) {
//       console.warn('[App] postTokenToBackend network error', err);
//       return false;
//     }
//   }

//   // try flush stored token + userId to backend
//   async function tryFlushPending() {
//     const token = nativeToken ?? (await getLocalToken());
//     const userId = userIdFromWeb ?? (await getLocalUserId());
//     if (!token) {
//       console.log('[App] tryFlushPending: no token yet');
//       return;
//     }
//     if (!userId) {
//       console.log('[App] tryFlushPending: no userId yet');
//       return;
//     }
//     const ok = await postTokenToBackend(userId, token);
//     if (ok) {
//       await clearLocalToken();
//       await clearLocalUserId();
//       console.log('[App] Token attached to user on backend; cleared local pending values.');
//     } else {
//       await saveTokenLocally(token);
//       await saveUserIdLocally(userId);
//       console.log('[App] Failed to attach token; saved pending values locally.');
//     }
//   }

//   // FCM init & listeners (runs once, reacts to userIdFromWeb changes indirectly)
//   useEffect(() => {
//     let mounted = true;

//     async function initFCM() {
//       try {
//         const authStatus = await messaging().requestPermission();
//         const enabled =
//           authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
//           authStatus === messaging.AuthorizationStatus.PROVISIONAL;

//         console.log('[App] messaging permission:', authStatus, 'enabled=', enabled);
//         if (!enabled) return;

//         const token = await messaging().getToken();
//         console.log('[App] FCM Token (native):', token);
//         if (!mounted || !token) return;

//         setNativeToken(token);
//         await tryFlushPending();
//       } catch (err) {
//         console.warn('[App] FCM init error', err);
//       }
//     }

//     initFCM();

//     const unsubRefresh = messaging().onTokenRefresh(async newToken => {
//       console.log('[App] Token refreshed:', newToken);
//       setNativeToken(newToken);
//       await tryFlushPending();
//     });

//     const unsubForeground = messaging().onMessage(async remoteMessage => {
//       console.log('[App] Foreground message:', remoteMessage);
//       if (remoteMessage?.notification) {
//         Alert.alert(remoteMessage.notification.title ?? 'Notification', remoteMessage.notification.body ?? '');
//       }
//     });

//     return () => {
//       mounted = false;
//       unsubRefresh();
//       unsubForeground();
//     };
//   }, [userIdFromWeb]);

//   // Ask web page to send user on load complete
//   const onWebViewLoadEnd = () => {
//     if (webRef.current) {
//       webRef.current.injectJavaScript('window.__sendUserToRN && window.__sendUserToRN(); true;');
//       webRef.current.injectJavaScript('try{ if (typeof window.sendUserToRN === "function") window.sendUserToRN(window.__CURRENT_USER_FOR_RN||null);}catch(e){}; true;');
//     }
//   };

//   // Handle messages from web
//   const onWebMessage = (event: WebViewMessageEvent) => {
//     console.log('[App] Raw WebView message:', event.nativeEvent.data);
//     let data: any = null;
//     try {
//       data = JSON.parse(event.nativeEvent.data);
//     } catch (e) {
//       console.warn('[App] Failed to parse WebView message JSON', e);
//       return;
//     }

//     (async () => {
//       try {
//         if (data?.type === 'REQUEST_NATIVE_TOKEN') {
//           // We're not sending the native token back to the web; ignore.
//           console.log('[App] web requested native token (ignored).');
//           return;
//         }

//         if (data?.type === 'USER_INFO') {
//           const user = data.user ?? null;
//           if (!user) {
//             console.log('[App] Received USER_INFO null -> clearing userIdFromWeb');
//             setUserIdFromWeb(null);
//             await clearLocalUserId();
//             return;
//           }
//           const userId = user.id ?? user._id ?? null;
//           if (!userId) {
//             console.warn('[App] USER_INFO missing id field', user);
//             return;
//           }
//           console.log('[App] Received userId from web:', userId);
//           setUserIdFromWeb(userId);
//           await saveUserIdLocally(userId);
//           await tryFlushPending();
//           return;
//         }

//         if (data?.type === 'LOG') {
//           console.log('[App] LOG from webview:', data.message);
//           return;
//         }

//         console.log('[App] Unknown message from webview', data);
//       } catch (e) {
//         console.warn('[App] Error handling WebView message', e);
//       }
//     })();
//   };

//   return (
//     <SafeAreaView style={{ flex: 1 }}>
//       <WebView
//         injectedJavaScript={INJECTED}
//         ref={webRef}
//         source={{ uri: WEB_URL }}
//         onMessage={onWebMessage}
//         onLoadEnd={onWebViewLoadEnd}
//         originWhitelist={['*']}
//         javaScriptEnabled={true}
//       />
//     </SafeAreaView>
//   );
// }


// App.tsx
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, Platform, Alert } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

const SERVER_BASE = 'https://aparkfinder-abackend.onrender.com';
const SAVE_TOKEN_BASIC_URL = `${SERVER_BASE}/api/users/save-token`;
const WEB_URL = 'https://park-vech-android.vercel.app';

const LOCAL_TOKEN_KEY = '@pv_pending_token';
const LOCAL_USERID_KEY = '@pv_pending_userid';
const LOCAL_INITIAL_NOTIFICATION = '@pv_initial_notification';

const INJECTED = `
(function(){
  try {
    window.__IS_RN_WEBVIEW = true;
    window.__sendUserToRN = function(){ 
      try {
        if (typeof window.sendUserToRN === 'function') {
          window.sendUserToRN(window.__CURRENT_USER_FOR_RN || null);
          return;
        }
        if (window.__CURRENT_USER_FOR_RN && window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'USER_INFO', user: window.__CURRENT_USER_FOR_RN }));
        }
      } catch(e){}
    }
  } catch(e){}
  true;
})();
`;

export default function App() {
  const webRef = useRef<WebView | null>(null);
  const [nativeToken, setNativeToken] = useState<string | null>(null);
  const [userIdFromWeb, setUserIdFromWeb] = useState<string | null>(null);
  const postedSetRef = useRef<Set<string>>(new Set());
  const authTokenKey = '@pv_auth_token'; // optional if you later pass auth token from web

  // ------------- AsyncStorage helpers -------------
  async function saveTokenLocally(token: string) {
    await AsyncStorage.setItem(LOCAL_TOKEN_KEY, token).catch(e => console.warn('[App] saveTokenLocally error', e));
    console.log('[App] Stored pending token locally.');
  }
  async function getLocalToken() {
    return await AsyncStorage.getItem(LOCAL_TOKEN_KEY).catch(e => { console.warn('[App] getLocalToken error', e); return null; });
  }
  async function clearLocalToken() {
    await AsyncStorage.removeItem(LOCAL_TOKEN_KEY).catch(() => {});
    console.log('[App] Cleared pending token.');
  }
  async function saveUserIdLocally(userId: string) {
    await AsyncStorage.setItem(LOCAL_USERID_KEY, userId).catch(e => console.warn('[App] saveUserIdLocally error', e));
    console.log('[App] Stored pending userId locally.');
  }
  async function getLocalUserId() {
    return await AsyncStorage.getItem(LOCAL_USERID_KEY).catch(e => { console.warn('[App] getLocalUserId error', e); return null; });
  }
  async function clearLocalUserId() {
    await AsyncStorage.removeItem(LOCAL_USERID_KEY).catch(() => {});
    console.log('[App] Cleared pending userId.');
  }

  // persist initial notification for web to read on load (cold start).
  async function saveInitialNotification(remoteMessage: any) {
    try {
      await AsyncStorage.setItem(LOCAL_INITIAL_NOTIFICATION, JSON.stringify(remoteMessage));
      console.log('[App] Saved initial notification to AsyncStorage for web to pick up.');
    } catch (e) {
      console.warn('[App] Failed saving initial notification', e);
    }
  }
  async function getInitialNotificationFromStorage() {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_INITIAL_NOTIFICATION);
      if (!raw) return null;
      await AsyncStorage.removeItem(LOCAL_INITIAL_NOTIFICATION);
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[App] getInitialNotificationFromStorage error', e);
      return null;
    }
  }

  // ------------- Device info -------------
  async function getDeviceInfoString() {
    try {
      const isEmulator = await DeviceInfo.isEmulator();
      const brand = (DeviceInfo.getBrand && DeviceInfo.getBrand()) || '';
      const model = (DeviceInfo.getModel && DeviceInfo.getModel()) || '';
      const systemVersion = (DeviceInfo.getSystemVersion && DeviceInfo.getSystemVersion()) || Platform.Version?.toString?.() || '';
      const appVersion = (DeviceInfo.getVersion && DeviceInfo.getVersion()) || '';
      const kind = isEmulator ? (Platform.OS === 'android' ? 'Emulator' : 'Simulator') : 'Device';

      const info = `${Platform.OS} / RN ${kind} - ${brand} ${model} (OS ${systemVersion}) app ${appVersion}`;
      console.log('[App] Built deviceInfo string:', info);
      return info;
    } catch (e) {
      console.warn('[App] getDeviceInfoString failed', e);
      const fallback = `${Platform.OS} / RN (OS ${Platform.Version})`;
      console.log('[App] Using fallback deviceInfo string:', fallback);
      return fallback;
    }
  }

  // ------------- POST token to backend -------------
  async function postTokenToBackend(userId: string | null, token: string) {
    if (!token) return false;
    const key = `${userId ?? 'null'}|${token}`;
    if (postedSetRef.current.has(key)) {
      console.log('[App] Already posted this token for this userId -> skip', key);
      return true;
    }

    const deviceInfo = await getDeviceInfoString();
    const payload: any = { fcmToken: token, deviceInfo, platform: 'android' };
    if (userId) payload.userId = userId;

    try {
      console.log('[App] POSTing token to backend', { url: SAVE_TOKEN_BASIC_URL, payload });
      const res = await fetch(SAVE_TOKEN_BASIC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const txt = await res.text().catch(() => '');
      console.log('[App] postTokenToBackend response', res.status, txt);
      if (res.ok) {
        postedSetRef.current.add(key);
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.warn('[App] postTokenToBackend network error', err);
      return false;
    }
  }

  // ------------- Flush pending token/user to backend -------------
  async function tryFlushPending() {
    const token = nativeToken ?? (await getLocalToken());
    const userId = userIdFromWeb ?? (await getLocalUserId());
    if (!token) {
      console.log('[App] tryFlushPending: no token yet');
      return;
    }
    if (!userId) {
      console.log('[App] tryFlushPending: no userId yet');
      return;
    }
    const ok = await postTokenToBackend(userId, token);
    if (ok) {
      await clearLocalToken();
      await clearLocalUserId();
      console.log('[App] Token attached to user on backend; cleared local pending values.');
    } else {
      await saveTokenLocally(token);
      await saveUserIdLocally(userId);
      console.log('[App] Failed to attach token; saved pending values locally.');
    }
  }

  // ------------- Send native token to WebView (so web can forward with auth) -------------
  function postNativeTokenToWeb(token: string | null) {
    if (!token || !webRef.current) return;
    try {
      webRef.current.postMessage(JSON.stringify({ type: 'FCM_TOKEN', token, platform: 'android' }));
      console.log('[App] Posted native FCM token to webview (for forwarding).');
    } catch (e) {
      console.warn('[App] failed to post native token to webview', e);
    }
  }

  // ------------- FCM init & listeners -------------
  useEffect(() => {
    let mounted = true;
    let unsubRefresh: (() => void) | null = null;
    let unsubForeground: (() => void) | null = null;

    async function initFCM() {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        console.log('[App] messaging permission:', authStatus, 'enabled=', enabled);
        if (!enabled) return;

        const token = await messaging().getToken();
        console.log('[App] FCM Token (native):', token);
        if (!mounted || !token) return;

        setNativeToken(token);
        // post to web so it can forward with auth header
        postNativeTokenToWeb(token);

        await tryFlushPending();
      } catch (err) {
        console.warn('[App] FCM init error', err);
      }
    }

    initFCM();

    // token refresh
    try {
      unsubRefresh = messaging().onTokenRefresh(async newToken => {
        console.log('[App] Token refreshed:', newToken);
        setNativeToken(newToken);
        postNativeTokenToWeb(newToken);
        await tryFlushPending();
      });
    } catch (e) {
      console.warn('[App] onTokenRefresh subscribe error', e);
    }

    // foreground message handler
    try {
      unsubForeground = messaging().onMessage(async remoteMessage => {
        console.log('[App] Foreground message:', remoteMessage);
        if (remoteMessage?.notification) {
          Alert.alert(remoteMessage.notification.title ?? 'Notification', remoteMessage.notification.body ?? '');
        }
        // forward to web app too
        try {
          webRef.current?.postMessage(JSON.stringify({ type: 'FCM_MESSAGE', payload: remoteMessage }));
        } catch (e) {
          console.warn('[App] Failed to forward foreground message to webview', e);
        }
      });
    } catch (e) {
      console.warn('[App] onMessage subscribe error', e);
    }

    return () => {
      mounted = false;
      try { unsubRefresh && unsubRefresh(); } catch (e) {}
      try { unsubForeground && unsubForeground(); } catch (e) {}
    };
  }, [userIdFromWeb]);

  // ------------- Handle notification taps (background & quit) -------------
  useEffect(() => {
    let unsubOpened: (() => void) | null = null;
    try {
      unsubOpened = messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('[FCM] App opened from background via notification:', remoteMessage);
        try {
          webRef.current?.postMessage(JSON.stringify({ type: 'NOTIFICATION_OPEN', payload: remoteMessage }));
        } catch (e) {
          console.warn('[App] failed to post notification-open to webview', e);
        }
      });
    } catch (e) {
      console.warn('[App] onNotificationOpenedApp subscribe error', e);
    }

    // cold-start (quit)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('[FCM] App opened from quit via notification:', remoteMessage);
          // Save to AsyncStorage so the web can read if WebView isn't ready yet
          saveInitialNotification(remoteMessage).catch(() => {});
          // try to post after short delay to let WebView mount
          setTimeout(async () => {
            try {
              // if webRef available, post directly
              if (webRef.current) {
                webRef.current.postMessage(JSON.stringify({ type: 'NOTIFICATION_OPEN', payload: remoteMessage }));
              } else {
                // otherwise rely on stored initial notification
                console.log('[App] WebView not ready yet; saved initial notification to storage');
              }
            } catch (e) {
              console.warn('[App] failed to forward initial notification to webview', e);
            }
          }, 700);
        }
      })
      .catch(err => console.warn('[FCM] getInitialNotification error', err));

    return () => {
      try { unsubOpened && unsubOpened(); } catch (e) {}
    };
  }, []);

  // ------------- Ask web page to send user on load complete -------------
  const onWebViewLoadEnd = () => {
    try {
      if (!webRef.current) return;
      webRef.current.injectJavaScript('window.__sendUserToRN && window.__sendUserToRN(); true;');
      webRef.current.injectJavaScript('try{ if (typeof window.sendUserToRN === "function") window.sendUserToRN(window.__CURRENT_USER_FOR_RN||null);}catch(e){}; true;');
      // If we had a persisted initial notification, send it now
      getInitialNotificationFromStorage().then(n => {
        if (n && webRef.current) {
          try {
            webRef.current.postMessage(JSON.stringify({ type: 'NOTIFICATION_OPEN', payload: n }));
            console.log('[App] forwarded persisted initial notification to webview after loadEnd');
          } catch (e) {
            console.warn('[App] failed to post persisted initial notification', e);
          }
        }
        // Also if we have an in-memory nativeToken, post it to web now (ensures web gets it)
        if (nativeToken && webRef.current) {
          postNativeTokenToWeb(nativeToken);
        }
      }).catch(() => {});
    } catch (e) {
      console.warn('[App] onWebViewLoadEnd inject error', e);
    }
  };

  // ------------- Handle incoming messages from WebView -------------
  const onWebMessage = (event: WebViewMessageEvent) => {
    console.log('[App] Raw WebView message:', event.nativeEvent.data);
    let data: any = null;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch (e) {
      console.warn('[App] Failed to parse WebView message JSON', e);
      return;
    }

    (async () => {
      try {
        if (data?.type === 'REQUEST_NATIVE_TOKEN') {
          // web requested native token — respond by posting native token to web
          console.log('[App] web requested native token; posting if available.');
          if (nativeToken) postNativeTokenToWeb(nativeToken);
          return;
        }

        if (data?.type === 'USER_INFO') {
          const user = data.user ?? null;
          // optionally the web may also pass an authToken (not recommended to store long-term)
          const authToken = data.authToken ?? null;
          if (!user) {
            console.log('[App] Received USER_INFO null -> clearing userIdFromWeb');
            setUserIdFromWeb(null);
            await clearLocalUserId();
            return;
          }
          const userId = user.id ?? user._id ?? null;
          if (!userId) {
            console.warn('[App] USER_INFO missing id field', user);
            return;
          }
          console.log('[App] Received userId from web:', userId);
          setUserIdFromWeb(userId);
          await saveUserIdLocally(userId);

          // if web provided an auth token and you want RN to call backend directly,
          // you could store it temporarily. Generally prefer web-forward approach.
          if (authToken) {
            try {
              await AsyncStorage.setItem(authTokenKey, authToken);
              console.log('[App] Stored auth token from web (temporary) for direct backend calls.');
            } catch (e) {
              console.warn('[App] failed to store auth token', e);
            }
          }

          // ensure any pending token is flushed to backend (direct call)
          await tryFlushPending();

          return;
        }

        if (data?.type === 'LOG') {
          console.log('[App] LOG from webview:', data.message);
          return;
        }

        console.log('[App] Unknown message from webview', data);
      } catch (e) {
        console.warn('[App] Error handling WebView message', e);
      }
    })();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <WebView
        injectedJavaScript={INJECTED}
        ref={webRef}
        source={{ uri: WEB_URL }}
        onMessage={onWebMessage}
        onLoadEnd={onWebViewLoadEnd}
        originWhitelist={['*']}
        javaScriptEnabled={true}
      />
    </SafeAreaView>
  );
}
