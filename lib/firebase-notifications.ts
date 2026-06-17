import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && Capacitor.getPlatform() === 'web') {
  messaging = getMessaging(app);
}

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export class NotificationService {
  private token: string | null = null;
  private platform: string = 'web';
  // Prevent duplicate initialisation on mobile
  private mobileInitialised = false;

  async initialize() {
    if (typeof window === 'undefined') return;

    this.platform = Capacitor.getPlatform() as string;

    try {
      if (this.platform === 'web') {
        await this.initWeb();
      }
      // Mobile init is intentionally NOT called here.
      // Call initMobileWhenReady() from the dashboard instead,
      // so the Capacitor bridge / Activity is fully active first.
    } catch (error) {
      console.error('Notification init error:', error);
    }
  }

  private async initWeb() {
    if (!messaging) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    this.token = await getToken(messaging, { vapidKey });
    if (this.token) {
      console.log('FCM Token (Web):', this.token);
      localStorage.setItem('fcm_token', this.token);
    }

    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('inAppNotification', {
          detail: {
            title: payload.notification?.title || 'Notification',
            body: payload.notification?.body || '',
            data: payload.data || {}
          }
        }));
      }
    });
  }

  /**
   * Safe mobile initialisation.
   *
   * MUST be called from a mounted React component (e.g. dashboard useEffect),
   * NEVER from a login handler or navigation callback.
   *
   * Strategy:
   * 1. Wait for the App plugin to report the app is active (foreground).
   * 2. checkPermissions() first — only call requestPermissions() when status
   *    is 'prompt'. Never call it when already 'granted' or 'denied'.
   * 3. An additional 500 ms settling delay before any PushNotifications call
   *    to avoid the NullPointerException on the CapacitorPlugins thread.
   */
  async initMobileWhenReady(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (Capacitor.getPlatform() === 'web') return;
    if (this.mobileInitialised) return;
    this.mobileInitialised = true;

    try {
      const { App } = await import('@capacitor/app');
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Wait until the app is in the foreground (active).
      // If it already is, the promise resolves immediately.
      await new Promise<void>((resolve) => {
        App.getState().then((state) => {
          if (state.isActive) {
            resolve();
          } else {
            const handle = App.addListener('appStateChange', (s) => {
              if (s.isActive) {
                handle.then(h => h.remove());
                resolve();
              }
            });
          }
        }).catch(() => {
          // Fallback: just proceed after a delay if App plugin fails
          setTimeout(resolve, 1000);
        });
      });

      // Extra settling time after the Activity becomes active
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check current permission state — never call requestPermissions()
      // unless the status is genuinely 'prompt'.
      let permStatus: { receive: string };
      try {
        permStatus = await PushNotifications.checkPermissions();
      } catch (e) {
        console.warn('checkPermissions failed, skipping notifications:', e);
        return;
      }

      if (permStatus.receive === 'prompt') {
        try {
          permStatus = await PushNotifications.requestPermissions();
        } catch (e) {
          console.warn('requestPermissions failed:', e);
          return;
        }
      }

      if (permStatus.receive !== 'granted') {
        console.log('Push notification permission not granted:', permStatus.receive);
        return;
      }

      await this.registerAndListen(PushNotifications);

    } catch (error) {
      console.error('initMobileWhenReady error:', error);
    }
  }

  private async registerAndListen(PushNotifications: any): Promise<void> {
    try {
      await PushNotifications.register();
    } catch (e) {
      console.error('PushNotifications.register() failed:', e);
      return;
    }

    PushNotifications.addListener('registration', (token: any) => {
      this.token = token.value;
      console.log('FCM Token:', token.value);
      localStorage.setItem('fcm_token', token.value);
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
      console.log('Push received in foreground:', notification);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('inAppNotification', {
          detail: {
            title: notification.title || 'Notification',
            body: notification.body || '',
            data: notification.data || {}
          }
        }));
      }
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
      console.log('Push action:', action);
    });

    // Also get token via Firebase Messaging as fallback
    try {
      const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
      const result = await FirebaseMessaging.getToken();
      if (result.token) {
        this.token = result.token;
        console.log('FCM Token (Firebase Messaging):', result.token);
        localStorage.setItem('fcm_token', result.token);
      }
    } catch (error) {
      console.error('Firebase Messaging token error:', error);
    }
  }

  getToken() {
    return this.token || localStorage.getItem('fcm_token');
  }

  getPlatform() {
    return this.platform;
  }

  /**
   * @deprecated Use initMobileWhenReady() from a mounted dashboard component.
   * Kept for compatibility — now a no-op on mobile to prevent crashes.
   */
  async requestMobileNotificationPermissions(): Promise<void> {
    // No-op: all mobile permission logic moved to initMobileWhenReady()
    // which is called safely from the dashboard useEffect.
    console.log('requestMobileNotificationPermissions: delegating to initMobileWhenReady()');
    return this.initMobileWhenReady();
  }
}

export const notificationService = new NotificationService();
export default app;
