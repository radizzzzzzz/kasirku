/**
 * NotificationService
 * Modul Layanan Push Notification KasirKu (Expo Notifications SDK 58)
 * 
 * Mengimplementasikan 3 Task Inti:
 * - TASK 01: Registrasi Perangkat & Permintaan Izin (Permission Handling, Physical Device Check, Expo Push Token)
 * - TASK 02: Pengiriman Notifikasi (Expo Push API / FCM / Local Fallback saat di Emulator)
 * - TASK 03: Penanganan Respon Notifikasi (Received Listener, Response/Tap Listener, Cold Start Handling & Deep Navigation)
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// -----------------------------------------------------------------------------
// KONFIGURASI HANDLER NOTIFIKASI FOREGROUND (TASK 02)
// Menentukan bagaimana notifikasi ditampilkan saat aplikasi sedang dibuka/aktif di layar.
// -----------------------------------------------------------------------------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // Tampilkan popup banner/alert
    shouldPlaySound: true,   // Bunyikan suara notifikasi
    shouldSetBadge: true,    // Perbarui badge angka pada ikon aplikasi
  }),
});

/**
 * TASK 01: Registrasi Perangkat untuk Notifikasi
 * 1. Verifikasi perangkat fisik (Device.isDevice).
 * 2. Setup Channel Android (Notifikasi dengan prioritas tinggi/MAX).
 * 3. Meminta izin ke pengguna (Permission Handling).
 * 4. Mengambil Expo Push Token resmi dari EAS / Expo Project.
 */
export async function registerForPushNotificationsAsync() {
  let token = null;

  // 1. Setup Android Notification Channel (Wajib untuk Android 8.0+)
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'KasirKu Notifikasi',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    } catch (channelError) {
      console.warn('[Notification] Gagal mengonfigurasi Android channel:', channelError);
    }
  }

  // 2. Cek apakah berjalan di perangkat fisik
  const isPhysical = Device.isDevice;
  if (!isPhysical) {
    console.warn('[Notification] Perangkat simulator/emulator terdeteksi. Remote Push Token memerlukan perangkat fisik.');
    // Berikan token simulasi khusus emulator agar alur registrasi & testing lokal tetap berjalan tanpa error
    const simulatedToken = `ExponentPushToken[Simulated_Emulator_${Platform.OS}_${Date.now().toString().slice(-6)}]`;
    return {
      success: true,
      token: simulatedToken,
      isDevice: false,
      message: 'Berjalan di Emulator/Simulator. Token simulasi aktif untuk pengujian lokal.',
    };
  }

  try {
    // 3. Periksa Izin Notifikasi yang sudah ada
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Jika belum diizinkan, minta izin ke pengguna
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Jika pengguna menolak izin notifikasi
    if (finalStatus !== 'granted') {
      console.warn('[Notification] Izin notifikasi ditolak oleh pengguna!');
      return {
        success: false,
        token: null,
        isDevice: true,
        error: 'Izin notifikasi tidak diberikan oleh pengguna.',
      };
    }

    // 4. Ambil Project ID dari app.json atau EAS Config
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      'kasirku-pos-app';

    // 5. Ambil Expo Push Token
    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = pushTokenData?.data || null;

    console.log('[Notification] Berhasil mendapatkan Expo Push Token:', token);
    return {
      success: true,
      token,
      isDevice: true,
      message: 'Token berhasil diperoleh dari Expo Push Service.',
    };
  } catch (error) {
    console.error('[Notification] Terjadi kesalahan saat registrasi token:', error);
    return {
      success: false,
      token: null,
      isDevice: isPhysical,
      error: error.message || 'Gagal mengambil push token.',
    };
  }
}

/**
 * TASK 02: Mengirim Push Notifikasi melalui Expo Push API Server
 * Endpoint resmi: https://exp.host/--/api/v2/push/send
 * 
 * @param {Object} params
 * @param {string} params.to - Expo Push Token target (ExponentPushToken[xxx])
 * @param {string} params.title - Judul notifikasi
 * @param {string} params.body - Isi teks notifikasi
 * @param {Object} params.data - Custom payload data (mis. { screen: 'RIWAYAT', transactionId: '...' })
 */
export async function sendExpoPushNotification({ to, title, body, data = {} }) {
  if (!to) {
    throw new Error('Target push token (to) tidak boleh kosong.');
  }

  // Jika token simulasi di emulator, lakukan fallback ke jadwal notifikasi lokal
  if (to.includes('Simulated_Emulator')) {
    console.log('[Notification] Token emulator terdeteksi, memicu notifikasi lokal terjadwal.');
    return await scheduleLocalTestNotification({ title, body, data, delaySeconds: 1 });
  }

  const message = {
    to,
    sound: 'default',
    title: title || 'KasirKu POS',
    body: body || 'Pemberitahuan dari sistem KasirKu',
    data: data,
    priority: 'high',
    channelId: 'default',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('[Notification] Response dari Expo Push API:', result);
    return result;
  } catch (error) {
    console.error('[Notification] Gagal mengirim push notifikasi via Expo API:', error);
    throw error;
  }
}

/**
 * TASK 02 (Helper Pengujian): Mengirim Notifikasi Lokal Terjadwal
 * Berguna untuk memverifikasi tampilan notifikasi & penanganan tap di emulator atau offline.
 */
export async function scheduleLocalTestNotification({ title, body, data = {}, delaySeconds = 1 }) {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'KasirKu Transaksi Baru',
        body: body || 'Transaksi senilai Rp 85.000 berhasil diproses.',
        data: data,
        sound: 'default',
      },
      trigger: delaySeconds > 0 ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds } : null,
    });
    console.log('[Notification] Notifikasi lokal berhasil dijadwalkan. ID:', identifier);
    return { status: 'ok', identifier };
  } catch (error) {
    console.error('[Notification] Gagal menjadwalkan notifikasi lokal:', error);
    throw error;
  }
}

/**
 * TASK 03: Memasang Listener Penerimaan & Respon Notifikasi (Tap)
 * 
 * @param {Object} handlers
 * @param {Function} handlers.onNotificationReceived - Dijalankan saat notifikasi tiba saat aplikasi aktif (Foreground)
 * @param {Function} handlers.onNotificationResponse - Dijalankan saat pengguna menekan/mengetuk notifikasi (Tap / Deep Navigation)
 * @returns {Function} cleanup - Fungsi untuk mencabut subscription listener saat unmount
 */
export function setupNotificationListeners({ onNotificationReceived, onNotificationResponse }) {
  // Listener saat notifikasi tiba di foreground
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[Notification Listener] Notifikasi diterima di foreground:', notification);
    if (typeof onNotificationReceived === 'function') {
      onNotificationReceived(notification);
    }
  });

  // Listener saat notifikasi ditekan oleh pengguna (Notification Tap Listener)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[Notification Listener] Pengguna mengetuk notifikasi:', response);
    const notificationData = response?.notification?.request?.content?.data || {};
    if (typeof onNotificationResponse === 'function') {
      onNotificationResponse({
        response,
        data: notificationData,
      });
    }
  });

  // Return fungsi cleanup untuk useEffect
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * TASK 03: Penanganan Cold Start (Aplikasi Tertutup/Killed State Lalu Dibuka via Notifikasi)
 * Mengecek apakah peluncuran aplikasi dipicu oleh pengguna yang mengetuk notifikasi.
 */
export async function checkColdStartNotification(onNotificationResponse) {
  try {
    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastResponse && typeof onNotificationResponse === 'function') {
      console.log('[Notification] Aplikasi dibuka dari kondisi cold start melalui notifikasi.');
      const notificationData = lastResponse?.notification?.request?.content?.data || {};
      onNotificationResponse({
        response: lastResponse,
        data: notificationData,
        isColdStart: true,
      });
    }
  } catch (error) {
    console.warn('[Notification] Gagal memeriksa status cold start notifikasi:', error);
  }
}
