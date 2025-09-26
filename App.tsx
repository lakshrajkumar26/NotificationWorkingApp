// // App.tsx
// import React, { useEffect, useRef, useState } from 'react';
// import { SafeAreaView, Platform, Alert } from 'react-native';
// import { WebView, WebViewMessageEvent } from 'react-native-webview';
// import messaging from '@react-native-firebase/messaging';

// const WEB_URL = 'https://apark-phi.vercel.app';
// const BACKEND_SAVE_TOKEN = 'https://aparkfinder-abackend.onrender.com/api/users/save-token';

// export default function App() {
//   const webRef = useRef<WebView | null>(null);
//   const [nativeToken, setNativeToken] = useState<string | null>(null);
//   const [userIdFromWeb, setUserIdFromWeb] = useState<string | null>(null);
//   const INJECTED = `window.__IS_RN_WEBVIEW = true; true;`;

//   useEffect(() => {
//     let mounted = true;

//     async function initFCM() {
//       try {
//         const authStatus = await messaging().requestPermission();
//         const enabled =
//           authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
//           authStatus === messaging.AuthorizationStatus.PROVISIONAL;

//         if (!enabled) {
//           console.log('Notification permission not granted.');
//           return;
//         }

//         const token = await messaging().getToken();
//         console.log('FCM Token (native):', token);
//         if (!mounted || !token) return;

//         setNativeToken(token);

//         // Post token into WebView so website sees it (website will save to backend using userId)
//         if (webRef.current) {
//           webRef.current.postMessage(JSON.stringify({ type: 'FCM_TOKEN', token }));
//         }

//         // Optionally: if we already have userId from web, save to backend from native too
//         // (only do this if userIdFromWeb is present)
//         if (userIdFromWeb) {
//           try {
//             await fetch(BACKEND_SAVE_TOKEN, {
//               method: 'POST',
//               headers: { 'Content-Type': 'application/json' },
//               body: JSON.stringify({
//                 userId: userIdFromWeb,
//                 fcmToken: token,
//                 deviceInfo: Platform.OS + ' / RN',
//               }),
//             });
//             console.log('Native saved token to backend because userId known');
//           } catch (err) {
//             console.warn('Failed native save-token', err);
//           }
//         }
//       } catch (err) {
//         console.warn('FCM init error', err);
//       }
//     }

//     initFCM();

//     const unsubRefresh = messaging().onTokenRefresh(newToken => {
//       console.log('Token refreshed:', newToken);
//       setNativeToken(newToken);
//       if (webRef.current) {
//         webRef.current.postMessage(JSON.stringify({ type: 'FCM_TOKEN', token: newToken }));
//       }
//       // If we have userIdFromWeb, update backend from native too
//       if (userIdFromWeb) {
//         fetch(BACKEND_SAVE_TOKEN, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ userId: userIdFromWeb, fcmToken: newToken, deviceInfo: Platform.OS + ' / RN' }),
//         }).catch(e => console.warn('save-token error', e));
//       }
//     });

//     const unsubForeground = messaging().onMessage(async remoteMessage => {
//       console.log('Foreground message:', remoteMessage);
//       if (remoteMessage?.notification) {
//         Alert.alert(remoteMessage.notification.title ?? 'Notification', remoteMessage.notification.body ?? '');
//       }
//     });

//     return () => {
//       mounted = false;
//       unsubRefresh();
//       unsubForeground();
//     };
//   }, [userIdFromWeb]); // re-run native save behavior when userIdFromWeb set

//   const onWebMessage = (event: WebViewMessageEvent) => {
//     try {
//       const data = JSON.parse(event.nativeEvent.data);

//       if (data?.type === 'REQUEST_NATIVE_TOKEN') {
//         if (nativeToken && webRef.current) {
//           webRef.current.postMessage(JSON.stringify({ type: 'FCM_TOKEN', token: nativeToken }));
//         } else {
//           // if no token yet, get and send when ready
//           messaging().getToken().then(token => {
//             setNativeToken(token);
//             if (webRef.current) webRef.current.postMessage(JSON.stringify({ type: 'FCM_TOKEN', token }));
//           }).catch(e => console.warn('getToken error', e));
//         }
//       }

//       // Web sends user info when user logs in — store it so native can optionally call backend
//       if (data?.type === 'USER_INFO' && data.userId) {
//         setUserIdFromWeb(data.userId);
//         console.log('Received userId from web:', data.userId);
//       }

//       if (data?.type === 'LOG') {
//         console.log('LOG from web:', data.message);
//       }
//     } catch (e) {
//       console.warn('Invalid message from web', e);
//     }
//   };

//   return (
//     <SafeAreaView style={{ flex: 1 }}>
//       <WebView
//         injectedJavaScript={INJECTED}
//         ref={webRef}
//         source={{ uri: WEB_URL }}
//         onMessage={onWebMessage}
//         originWhitelist={['*']}
//         javaScriptEnabled={true}
//       />
//     </SafeAreaView>
//   );
// }
// App.tsx


//---------------------------MID---------------------------------

// import React, { useEffect, useRef, useState } from 'react';
// import { SafeAreaView, Platform, Alert } from 'react-native';
// import { WebView, WebViewMessageEvent } from 'react-native-webview';
// import messaging from '@react-native-firebase/messaging';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const WEB_URL = 'https://apark-phi.vercel.app';
// const BACKEND_SAVE_TOKEN = 'https://aparkfinder-abackend.onrender.com/api/users/save-token';

// const LOCAL_TOKEN_KEY = '@pv_pending_token';

// export default function App() {
//   const webRef = useRef<WebView | null>(null);
//   const [nativeToken, setNativeToken] = useState<string | null>(null);
//   const [userIdFromWeb, setUserIdFromWeb] = useState<string | null>(null);
//   const INJECTED = `window.__IS_RN_WEBVIEW = true; true;`;

//   // --- AsyncStorage helpers ---
//   async function saveTokenLocally(token: string) {
//     try {
//       await AsyncStorage.setItem(LOCAL_TOKEN_KEY, token);
//       console.log('[App] Stored token locally (pending user login).');
//     } catch (e) {
//       console.warn('[App] Failed to save token locally', e);
//     }
//   }

//   async function getLocalToken(): Promise<string | null> {
//     try {
//       return await AsyncStorage.getItem(LOCAL_TOKEN_KEY);
//     } catch (e) {
//       console.warn('[App] Failed to read local token', e);
//       return null;
//     }
//   }

//   async function clearLocalToken() {
//     try {
//       await AsyncStorage.removeItem(LOCAL_TOKEN_KEY);
//       console.log('[App] Cleared local pending token.');
//     } catch (e) {
//       /* ignore */
//     }
//   }

//   // --- Post to backend with simple retry/backoff and logging ---
//   async function postTokenToBackend(userId: string, token: string, retries = 3) {
//     if (!userId || !token) return false;
//     const payload = {
//       userId,
//       fcmToken: token,
//       deviceInfo: Platform.OS + ' / RN',
//     };

//     for (let attempt = 1; attempt <= retries; attempt++) {
//       try {
//         const res = await fetch(BACKEND_SAVE_TOKEN, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(payload),
//         });

//         const bodyText = await res.text().catch(() => '');
//         if (res.ok) {
//           console.log(`[App] Saved token to backend for user ${userId} (attempt ${attempt}).`);
//           return true;
//         } else {
//           console.warn(`[App] save-token attempt ${attempt} failed: status=${res.status}, body=${bodyText}`);
//         }
//       } catch (err) {
//         console.warn(`[App] save-token attempt ${attempt} network error:`, err);
//       }
//       // exponential-ish backoff
//       await new Promise<void>(resolve => setTimeout(resolve, attempt * 500));
//     }

//     console.warn('[App] All attempts to save token failed; token remains pending for retry.');
//     return false;
//   }

//   // --- FCM init & listeners (runs once) ---
//   useEffect(() => {
//     let mounted = true;

//     async function initFCM() {
//       try {
//         // Request permission (iOS / Android newer)
//         const authStatus = await messaging().requestPermission();
//         const enabled =
//           authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
//           authStatus === messaging.AuthorizationStatus.PROVISIONAL;

//         if (!enabled) {
//           console.log('[App] Notification permission not granted.');
//           return;
//         }

//         // Get token
//         const token = await messaging().getToken();
//         console.log('FCM Token (native):', token);
//         if (!mounted || !token) return;

//         setNativeToken(token);

//         // Post token into WebView so website sees it
//         if (webRef.current) {
//           webRef.current.postMessage(JSON.stringify({ type: 'FCM_TOKEN', token }));
//         }

//         // If we already know logged-in user, try to send immediately
//         if (userIdFromWeb) {
//           const ok = await postTokenToBackend(userIdFromWeb, token);
//           if (!ok) {
//             // persist token for later retry
//             await saveTokenLocally(token);
//           } else {
//             await clearLocalToken();
//           }
//         } else {
//           // No user yet — persist pending token until USER_INFO arrives
//           await saveTokenLocally(token);
//         }
//       } catch (err) {
//         console.warn('[App] FCM init error', err);
//       }
//     }

//     initFCM();

//     // token refresh handling
//     const unsubRefresh = messaging().onTokenRefresh(async newToken => {
//       console.log('Token refreshed:', newToken);
//       setNativeToken(newToken);

//       if (webRef.current) {
//         webRef.current.postMessage(JSON.stringify({ type: 'FCM_TOKEN', token: newToken }));
//       }

//       if (userIdFromWeb) {
//         const ok = await postTokenToBackend(userIdFromWeb, newToken);
//         if (!ok) {
//           await saveTokenLocally(newToken);
//         } else {
//           await clearLocalToken();
//         }
//       } else {
//         await saveTokenLocally(newToken);
//       }
//     });

//     // foreground message handler
//     const unsubForeground = messaging().onMessage(async remoteMessage => {
//       console.log('Foreground message:', remoteMessage);
//       if (remoteMessage?.notification) {
//         Alert.alert(remoteMessage.notification.title ?? 'Notification', remoteMessage.notification.body ?? '');
//       }
//     });

//     return () => {
//       mounted = false;
//       unsubRefresh();
//       unsubForeground();
//     };
//     // Note: intentionally no dependency on userIdFromWeb here — we handle sending when USER_INFO arrives
//   }, []); // run once

//   // --- Handle incoming messages from WebView (USER_INFO, REQUEST_NATIVE_TOKEN, LOG) ---
//   const onWebMessage = (event: WebViewMessageEvent) => {
//     (async () => {
//       try {
//         const data = JSON.parse(event.nativeEvent.data);

//         if (data?.type === 'REQUEST_NATIVE_TOKEN') {
//           if (nativeToken && webRef.current) {
//             webRef.current.postMessage(JSON.stringify({ type: 'FCM_TOKEN', token: nativeToken }));
//           } else {
//             // get token then send
//             try {
//               const token = await messaging().getToken();
//               setNativeToken(token);
//               if (webRef.current) webRef.current.postMessage(JSON.stringify({ type: 'FCM_TOKEN', token }));
//             } catch (e) {
//               console.warn('[App] getToken error', e);
//             }
//           }
//         }

//         // When web tells us who the logged-in user is
//         if (data?.type === 'USER_INFO' && data.userId) {
//           const userId = data.userId;
//           setUserIdFromWeb(userId);
//           console.log('Received userId from web:', userId);

//           // Try to send token immediately:
//           // prefer in-memory token, fallback to persisted local token
//           const tokenToSend = nativeToken ?? (await getLocalToken());
//           if (!tokenToSend) {
//             console.log('[App] No token available to send to backend on USER_INFO.');
//             return;
//           }

//           const ok = await postTokenToBackend(userId, tokenToSend);
//           if (ok) {
//             // success: clear stored token
//             await clearLocalToken();
//           } else {
//             // failed: ensure it's persisted
//             await saveTokenLocally(tokenToSend);
//           }
//         }

//         if (data?.type === 'LOG') {
//           console.log('LOG from web:', data.message);
//         }
//       } catch (e) {
//         console.warn('Invalid message from web', e);
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

/**
 */
const SERVER_BASE = 'https://aparkfinder-abackend.onrender.com'; 
const SAVE_TOKEN_BASIC_URL = `${SERVER_BASE}/api/admin/save-token-basic`;
const ANDROID_BASIC_SAVE_URL = `${SERVER_BASE}/api/admin/android-basic-save`;

// Choose which endpoint to call in tests. App defaults to SAVE_TOKEN_BASIC_URL.
const BACKEND_SAVE_TOKEN = SAVE_TOKEN_BASIC_URL;
const BACKEND_BASIC_TEST = ANDROID_BASIC_SAVE_URL;

const WEB_URL = 'https://apark-phi.vercel.app';
const LOCAL_TOKEN_KEY = '@pv_pending_token';

export default function App() {
  const webRef = useRef<WebView | null>(null);
  const [nativeToken, setNativeToken] = useState<string | null>(null);
  const [userIdFromWeb, setUserIdFromWeb] = useState<string | null>(null);
  const INJECTED = `window.__IS_RN_WEBVIEW = true; true;`;

  // --- AsyncStorage helpers ---
  async function saveTokenLocally(token: string) {
    try {
      await AsyncStorage.setItem(LOCAL_TOKEN_KEY, token);
      console.log('[App] Stored token locally (pending user login).');
    } catch (e) {
      console.warn('[App] Failed to save token locally', e);
    }
  }

  async function getLocalToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LOCAL_TOKEN_KEY);
    } catch (e) {
      console.warn('[App] Failed to read local token', e);
      return null;
    }
  }

  async function clearLocalToken() {
    try {
      await AsyncStorage.removeItem(LOCAL_TOKEN_KEY);
      console.log('[App] Cleared local pending token.');
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * Post token to backend flexible endpoint /api/save-token-basic
   * This endpoint accepts optional userId — if provided, userId is attached.
   *
   * If you want a strict test use BACKEND_BASIC_TEST (android-basic-save).
   */
  async function postTokenToBackend(userId: string | null, token: string, retries = 3) {
    if (!token) return false;
    const payload: any = {
      fcmToken: token,
      deviceInfo: Platform.OS + ' / RN',
    };
    if (userId) payload.userId = userId;

    // choose URL that supports optional userId
    const url = BACKEND_SAVE_TOKEN;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[App] POSTing token to ${url} (attempt ${attempt})`, { userId: userId ?? null });
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const bodyText = await res.text().catch(() => '');
        if (res.ok) {
          console.log(`[App] Saved token to backend (attempt ${attempt}). serverReply:`, bodyText);
          return true;
        } else {
          console.warn(`[App] save-token attempt ${attempt} failed: status=${res.status}, body=${bodyText}`);
        }
      } catch (err) {
        console.warn(`[App] save-token attempt ${attempt} network error:`, err);
      }
      // backoff
      await new Promise<void>(resolve => setTimeout(resolve, attempt * 500));
    }

    console.warn('[App] All attempts to save token failed; token remains pending for retry.');
    return false;
  }

  // --- FCM init & listeners (runs once) ---
  useEffect(() => {
    let mounted = true;

    async function initFCM() {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('[App] Notification permission not granted.');
          return;
        }

        // Get token
        const token = await messaging().getToken();
        console.log('[App] FCM Token (native):', token);
        if (!mounted || !token) return;

        setNativeToken(token);

        // Post token into WebView so website sees it
        if (webRef.current) {
          webRef.current.postMessage(JSON.stringify({ type: 'FCM_TOKEN', token }));
        }

        // Try saving immediately (use flexible endpoint so userId optional)
        const ok = await postTokenToBackend(userIdFromWeb ?? null, token);
        if (!ok) {
          // persist token for later retry if save failed
          await saveTokenLocally(token);
        } else {
          await clearLocalToken();
        }
      } catch (err) {
        console.warn('[App] FCM init error', err);
      }
    }

    initFCM();

    // token refresh handling
    const unsubRefresh = messaging().onTokenRefresh(async newToken => {
      console.log('[App] Token refreshed:', newToken);
      setNativeToken(newToken);

      if (webRef.current) {
        webRef.current.postMessage(JSON.stringify({ type: 'FCM_TOKEN', token: newToken }));
      }

      const ok = await postTokenToBackend(userIdFromWeb ?? null, newToken);
      if (!ok) {
        await saveTokenLocally(newToken);
      } else {
        await clearLocalToken();
      }
    });

    // foreground message handler
    const unsubForeground = messaging().onMessage(async remoteMessage => {
      console.log('[App] Foreground message:', remoteMessage);
      if (remoteMessage?.notification) {
        Alert.alert(remoteMessage.notification.title ?? 'Notification', remoteMessage.notification.body ?? '');
      }
    });

    return () => {
      mounted = false;
      unsubRefresh();
      unsubForeground();
    };
  }, []); // run once

  // --- Handle incoming messages from WebView (USER_INFO, REQUEST_NATIVE_TOKEN, LOG) ---
  const onWebMessage = (event: WebViewMessageEvent) => {
    (async () => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data?.type === 'REQUEST_NATIVE_TOKEN') {
          if (nativeToken && webRef.current) {
            webRef.current.postMessage(JSON.stringify({ type: 'FCM_TOKEN', token: nativeToken }));
          } else {
            // get token then send
            try {
              const token = await messaging().getToken();
              setNativeToken(token);
              if (webRef.current) webRef.current.postMessage(JSON.stringify({ type: 'FCM_TOKEN', token }));
            } catch (e) {
              console.warn('[App] getToken error', e);
            }
          }
        }

        // When web tells us who the logged-in user is
        if (data?.type === 'USER_INFO' && data.userId) {
          const userId = data.userId;
          setUserIdFromWeb(userId);
          console.log('[App] Received userId from web:', userId);

          // Try to send token immediately: prefer in-memory token, fallback to persisted local token
          const tokenToSend = nativeToken ?? (await getLocalToken());
          if (!tokenToSend) {
            console.log('[App] No token available to send to backend on USER_INFO.');
            return;
          }

          const ok = await postTokenToBackend(userId, tokenToSend);
          if (ok) {
            // success: clear stored token
            await clearLocalToken();
          } else {
            // failed: ensure it's persisted
            await saveTokenLocally(tokenToSend);
          }
        }

        if (data?.type === 'LOG') {
          console.log('[App] LOG from web:', data.message);
        }
      } catch (e) {
        console.warn('[App] Invalid message from web', e);
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
        originWhitelist={['*']}
        javaScriptEnabled={true}
      />
    </SafeAreaView>
  );
}
