/**
 * NetworkService
 * Layanan pemantau status koneksi internet (Online / Offline).
 * Mendukung deteksi koneksi nyata di Web/Mobile dan mode simulasi offline
 * untuk pengujian Task 03 & Sprint 05 (Error Handling & Offline).
 */

import { Platform } from 'react-native';

class NetworkService {
  constructor() {
    this.isSimulatedOffline = false;
    this.listeners = [];
    this.isOnline = true;

    this.init();
  }

  init() {
    // Deteksi awal di environment Web / Browser
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      this.isOnline = navigator.onLine !== false;

      window.addEventListener('online', () => {
        this.setOnlineStatus(true);
      });

      window.addEventListener('offline', () => {
        this.setOnlineStatus(false);
      });
    }
  }

  setOnlineStatus(status) {
    this.isOnline = status;
    this.notifyListeners();
  }

  /**
   * Set simulasi mode offline (sangat berguna untuk demo di emulator / presentasi)
   */
  setSimulatedOffline(isOffline) {
    this.isSimulatedOffline = !!isOffline;
    this.notifyListeners();
  }

  /**
   * Cek apakah perangkat saat ini online (mempertimbangkan simulasi & status nyata)
   */
  isConnected() {
    if (this.isSimulatedOffline) {
      return false;
    }
    return this.isOnline;
  }

  /**
   * Cek konektivitas nyata dengan melakukan ping cepat ke server / endpoint ringan
   */
  async checkRealConnectivity(timeoutMs = 2500) {
    if (this.isSimulatedOffline) return false;

    // Di browser jika navigator.onLine bernilai false, langsung return false
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.isOnline = false;
      this.notifyListeners();
      return false;
    }

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      // Ping endpoint ringan yang stabil dengan no-cache
      const res = await fetch('https://clients3.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(id);
      this.isOnline = true;
      this.notifyListeners();
      return true;
    } catch (e) {
      // Jika fetch gagal (karena koneksi putus atau timeout)
      this.isOnline = false;
      this.notifyListeners();
      return false;
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    // Segera panggil sekali dengan status saat ini
    listener(this.isConnected(), this.isSimulatedOffline);

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notifyListeners() {
    const connected = this.isConnected();
    this.listeners.forEach((fn) => {
      try {
        fn(connected, this.isSimulatedOffline);
      } catch (err) {
        console.warn('Network listener error:', err);
      }
    });
  }
}

export const networkService = new NetworkService();
