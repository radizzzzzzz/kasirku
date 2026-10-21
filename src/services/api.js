/**
 * ApiService & ApiClient
 * Arsitektur API Berbasis Token JWT & Standard Fetch Integration
 * Mendukung autentikasi, proteksi endpoint, penanganan error HTTP (2xx, 4xx, 5xx),
 * deteksi offline, timeout handling, retry mechanism, dan empty state.
 * 
 * Mengacu pada kurikulum Mobile Programming:
 * - TASK 01: Handle API Error (2xx, 4xx, 5xx, Network Error)
 * - TASK 02: Loading, Error & Retry (Request -> Loading -> Error -> Retry -> Request Again)
 * - TASK 03: Handle Offline (Request -> No Internet -> Offline State -> User Feedback -> Retry)
 * - SPRINT 05: Error Handling & Offline Checklist
 */

import { generateJWT, verifyJWT, decodeJWT } from './jwt';
import { StorageService } from './storage';
import { SecureStorage, SECURE_KEYS } from './secureStorage';
import { networkService } from './network';

// Base URL API KasirKu
export const API_BASE_URL = 'https://api.kasirku.id';

// Skenario Simulasi API untuk keperluan Pengujian & Demo Dosen (Sprint 05)
export const API_SCENARIOS = {
  NORMAL: 'NORMAL',               // HTTP 200 OK (Data Produk dimuat sukses)
  CLIENT_ERROR_404: '404',        // HTTP 404 Not Found (Data tidak ditemukan)
  CLIENT_ERROR_401: '401',        // HTTP 401 Unauthorized (Akses ditolak)
  SERVER_ERROR_500: '500',        // HTTP 500 Internal Server Error (Gangguan server)
  TIMEOUT: 'TIMEOUT',             // Request Timeout (> 3.5 detik)
  OFFLINE: 'OFFLINE',             // Network Error / Tidak ada koneksi internet
  EMPTY: 'EMPTY',                 // HTTP 200 OK tapi data kosong []
};

// Skenario simulasi global saat ini
let currentScenario = API_SCENARIOS.NORMAL;

// Log aktivitas API yang dapat dibaca oleh UI untuk kebutuhan Demo / Presentasi
export const ApiEventLogs = {
  logs: [],
  listeners: [],
  add(stepNumber, action, details = '') {
    const entry = {
      id: Date.now() + Math.random().toString(),
      timestamp: new Date().toLocaleTimeString('id-ID'),
      step: `[${stepNumber}]`,
      action,
      details,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 50) this.logs.pop();

    console.log(`[${stepNumber}] ${action} ${details ? '-> ' + details : ''}`);
    this.listeners.forEach((fn) => fn(this.logs));
  },
  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  },
  clear() {
    this.logs = [];
    this.listeners.forEach((fn) => fn(this.logs));
  },
};

/**
 * Custom ApiError Class
 * Membantu mengklasifikasi kondisi error API sesuai checklist Sprint 05:
 * - 4xx: Client Error
 * - 5xx: Server Error
 * - Timeout: Waktu permintaan habis
 * - Offline / Network: Tidak ada koneksi internet
 */
export class ApiError extends Error {
  constructor({
    status = 0,
    statusText = 'Error',
    message = 'Terjadi kesalahan pada sistem.',
    type = 'generic', // '4xx' | '5xx' | 'offline' | 'timeout' | 'empty' | 'generic'
    title = 'Terjadi Kesalahan',
    details = '',
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.type = type;
    this.title = title;
    this.friendlyMessage = message;
    this.details = details;
    this.isClientError = status >= 400 && status < 500;
    this.isServerError = status >= 500 && status < 600;
    this.isOffline = type === 'offline';
    this.isTimeout = type === 'timeout';
  }
}

/**
 * Server Mock / API Handlers
 * Mensimulasikan server backend yang menerima request HTTP, memeriksa token,
 * dan mengembalikan response JSON beserta kode status HTTP.
 */
export const ApiServer = {
  /**
   * Endpoint: POST /login
   */
  handleLogin: async (identifier, password) => {
    // Cek konektivitas terlebih dahulu (Task 03)
    if (!networkService.isConnected()) {
      return {
        status: 0,
        ok: false,
        type: 'offline',
        error: 'Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi.',
      };
    }

    await new Promise((r) => setTimeout(r, 200));

    const trimmedId = (identifier || '').trim().toLowerCase();
    const trimmedPass = (password || '').trim();

    if (!trimmedId || !trimmedPass) {
      return {
        status: 400,
        ok: false,
        data: { error: 'Username/Email dan Password wajib diisi!' },
      };
    }

    const users = await SecureStorage.getItem(SECURE_KEYS.USERS_DB, []);
    const user = (users || []).find(
      (u) =>
        u.username.toLowerCase() === trimmedId ||
        (u.email && u.email.toLowerCase() === trimmedId)
    );

    if (!user) {
      return {
        status: 401,
        ok: false,
        data: { error: 'Kredensial tidak valid: Akun tidak ditemukan.' },
      };
    }

    if (user.password !== trimmedPass) {
      return {
        status: 401,
        ok: false,
        data: { error: 'Kredensial tidak valid: Kata sandi salah.' },
      };
    }

    const tokenPayload = {
      sub: user.id,
      employeeId: user.employeeId,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateJWT(tokenPayload, 3600);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    return {
      status: 200,
      ok: true,
      data: {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_at: expiresAt,
        user: {
          id: user.id,
          employeeId: user.employeeId,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    };
  },

  /**
   * Endpoint: GET /products
   * Mendukung skenario Sprint 05 (2xx, 4xx, 5xx, Offline, Timeout, Empty)
   */
  handleGetProducts: async (authHeader, options = {}) => {
    const scenario = options.scenario || currentScenario;

    // 1. Tangani Kondisi Offline (Task 03)
    if (scenario === API_SCENARIOS.OFFLINE || !networkService.isConnected()) {
      ApiEventLogs.add('NET', 'Network failure: Tidak ada koneksi internet.');
      throw new ApiError({
        status: 0,
        statusText: 'Network Error',
        type: 'offline',
        title: 'Tidak ada koneksi internet.',
        message: 'Periksa koneksi Anda dan coba lagi.',
        details: 'Koneksi perangkat terputus atau dalam mode pesawat.',
      });
    }

    // 2. Tangani Kondisi Timeout (Sprint 05 Item 10)
    if (scenario === API_SCENARIOS.TIMEOUT) {
      ApiEventLogs.add('TIME', 'Request Timeout: Server terlalu lambat merespons (> 3500ms)');
      // Delay 3.5 detik untuk mensimulasikan timeout
      await new Promise((r) => setTimeout(r, 3600));
      throw new ApiError({
        status: 408,
        statusText: 'Request Timeout',
        type: 'timeout',
        title: 'Waktu permintaan habis.',
        message: 'Server tidak merespons. Silakan coba lagi.',
        details: 'HTTP 408: Batas waktu tunggu koneksi habis.',
      });
    }

    // Simulasi Latency Normal (400ms)
    await new Promise((r) => setTimeout(r, 400));

    // 3. Tangani HTTP 5xx Server Error (Task 01 & Sprint 05 Item 3)
    if (scenario === API_SCENARIOS.SERVER_ERROR_500) {
      ApiEventLogs.add('5xx', 'HTTP 500 Internal Server Error');
      return {
        status: 500,
        statusText: 'Internal Server Error',
        ok: false,
        json: async () => ({
          error: 'Internal Server Error',
          message: 'Server sedang mengalami gangguan. Silakan coba lagi nanti. (500 Internal Server Error)',
        }),
      };
    }

    // 4. Tangani HTTP 4xx Client Error (Task 01 & Sprint 05 Item 2)
    if (scenario === API_SCENARIOS.CLIENT_ERROR_404) {
      ApiEventLogs.add('4xx', 'HTTP 404 Not Found');
      return {
        status: 404,
        statusText: 'Not Found',
        ok: false,
        json: async () => ({
          error: 'Not Found',
          message: 'Data tidak ditemukan. Menu yang Anda cari tidak tersedia. (404 Not Found)',
        }),
      };
    }

    if (scenario === API_SCENARIOS.CLIENT_ERROR_401) {
      ApiEventLogs.add('4xx', 'HTTP 401 Unauthorized');
      return {
        status: 401,
        statusText: 'Unauthorized',
        ok: false,
        json: async () => ({
          error: 'Unauthorized',
          message: 'Akses ditolak: Token autentikasi tidak valid atau kedaluwarsa. (401 Unauthorized)',
        }),
      };
    }

    // 5. Validasi Header Authorization Normal
    if (!authHeader) {
      return {
        status: 401,
        statusText: 'Unauthorized',
        ok: false,
        json: async () => ({
          error: 'Unauthorized',
          message: 'Akses ditolak: Header Authorization tidak ditemukan!',
        }),
      };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return {
        status: 401,
        statusText: 'Unauthorized',
        ok: false,
        json: async () => ({
          error: 'Unauthorized',
          message: 'Akses ditolak: Skema otentikasi harus Bearer Token!',
        }),
      };
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const verification = verifyJWT(token);

    if (!verification.valid) {
      return {
        status: 401,
        statusText: 'Unauthorized',
        ok: false,
        json: async () => ({
          error: 'Unauthorized',
          message: `Akses ditolak: ${verification.error || 'Token tidak valid'}`,
        }),
      };
    }

    // 6. Tangani Kondisi Empty State (Sprint 05 Item 7)
    if (scenario === API_SCENARIOS.EMPTY) {
      ApiEventLogs.add('2xx', 'HTTP 200 OK (Empty state: 0 items)');
      return {
        status: 200,
        statusText: 'OK',
        ok: true,
        json: async () => [],
      };
    }

    // 7. Kondisi Sukses 200 OK (Task 01 & Sprint 05 Item 1)
    const products = await StorageService.getProducts();
    ApiEventLogs.add('2xx', `HTTP 200 OK (${products?.length || 0} menu dimuat)`);
    return {
      status: 200,
      statusText: 'OK',
      ok: true,
      json: async () => products || [],
    };
  },

  /**
   * Endpoint: POST /logout
   */
  handleLogout: async () => {
    await new Promise((r) => setTimeout(r, 100));
    return {
      status: 200,
      ok: true,
      data: { message: 'Logout berhasil. Sesi server telah diakhiri.' },
    };
  },
};

/**
 * ApiClient (Sisi Klien / Aplikasi KasirKu)
 * Menyediakan implementasi lengkap sesuai Slide PPT:
 * - Task 01: Handle API Error (2xx, 4xx, 5xx, Network)
 * - Task 02: Loading, Error & Retry
 * - Task 03: Handle Offline
 * - Sprint 05: Error Handling & Offline Final Checklist
 */
export const ApiClient = {
  /**
   * Mengatur skenario simulasi aktif (NORMAL, 404, 500, TIMEOUT, OFFLINE, EMPTY)
   */
  setSimulationScenario: (scenario) => {
    currentScenario = scenario;
    if (scenario === API_SCENARIOS.OFFLINE) {
      networkService.setSimulatedOffline(true);
    } else {
      networkService.setSimulatedOffline(false);
    }
    ApiEventLogs.add('SCENARIO', `Skenario API diubah -> ${scenario}`);
  },

  getSimulationScenario: () => currentScenario,

  /**
   * Reset skenario simulasi kembali ke NORMAL
   */
  resetScenario: () => {
    currentScenario = API_SCENARIOS.NORMAL;
    networkService.setSimulatedOffline(false);
    ApiEventLogs.add('SCENARIO', 'Skenario API direset -> NORMAL');
  },

  /**
   * [1] App Started
   */
  logAppStarted: () => {
    ApiEventLogs.add('1', 'App started');
  },

  /**
   * Login request (POST /login)
   */
  login: async (identifier, password) => {
    ApiEventLogs.add('2', 'Login request -> POST /login', `email/user: ${identifier}`);

    const res = await ApiServer.handleLogin(identifier, password);

    if (res.type === 'offline') {
      const err = new ApiError({
        status: 0,
        type: 'offline',
        title: 'Tidak ada koneksi internet.',
        message: res.error,
      });
      throw err;
    }

    if (!res.ok) {
      throw new Error(res.data?.error || 'Gagal masuk ke sistem.');
    }

    const { access_token, user, expires_at } = res.data;
    ApiEventLogs.add('3', `Response: { access_token: "${access_token.substring(0, 24)}..." }`);

    await SecureStorage.setItem(SECURE_KEYS.ACCESS_TOKEN, access_token);
    const session = {
      token: access_token,
      expires_at,
      user,
      loggedInAt: new Date().toISOString(),
    };
    await SecureStorage.setItem(SECURE_KEYS.AUTH_SESSION, session);

    ApiEventLogs.add('4', 'Token saved to SecureStore', 'access_token tersimpan aman');
    return { session, user, access_token };
  },

  /**
   * IMPLEMENTASI TASK 01, 02, 03 & SPRINT 05:
   * Mengambil data produk dengan pemeriksaan status code (2xx, 4xx, 5xx),
   * timeout handling, deteksi offline, dan klasifikasi error terstruktur.
   * 
   * Contoh Alur Kode sesuai Slide Task 01:
   * try {
   *   const response = await fetch(API_URL);
   *   if (!response.ok) {
   *     throw new Error(`HTTP ${response.status}`);
   *   }
   *   const data = await response.json();
   *   setData(data);
   * } catch (error) { ... }
   */
  fetchProductsWithHandling: async (options = {}) => {
    const { scenario = currentScenario, timeoutMs = 4000 } = options;

    ApiEventLogs.add('REQ', `Request API -> GET /products (Skenario: ${scenario})`);

    // 1. Ambil Bearer Token dari Secure Storage (dengan fallback ke sesi tersimpan)
    let token = await SecureStorage.getItem(SECURE_KEYS.ACCESS_TOKEN, null);
    if (!token) {
      const session = await SecureStorage.getItem(SECURE_KEYS.AUTH_SESSION, null);
      if (session && (session.token || session.access_token)) {
        token = session.token || session.access_token;
        // Simpan kembali ke ACCESS_TOKEN agar tersinkronisasi
        await SecureStorage.setItem(SECURE_KEYS.ACCESS_TOKEN, token);
      }
    }
    const authHeader = token ? `Bearer ${token}` : null;

    // 2. Bungkus request dengan Timeout Abort Controller
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new ApiError({
            status: 408,
            statusText: 'Request Timeout',
            type: 'timeout',
            title: 'Waktu permintaan habis.',
            message: 'Server tidak merespons. Silakan coba lagi.',
            details: 'Waktu permintaan melebihi batas waktu (Request Timeout).',
          })
        );
      }, timeoutMs);
    });

    try {
      // Jalankan request ke endpoint server
      const fetchPromise = ApiServer.handleGetProducts(authHeader, { scenario });
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      clearTimeout(timeoutId);

      // 3. Periksa status response (Sesuai Checklist Task 01: "Response diperiksa")
      if (!response.ok) {
        let errJson = {};
        try {
          errJson = await response.json();
        } catch (_) {}

        // Tangani Status 4xx (Client Error)
        if (response.status >= 400 && response.status < 500) {
          const is404 = response.status === 404;
          throw new ApiError({
            status: response.status,
            statusText: response.statusText,
            type: '4xx',
            title: is404 ? 'Data tidak ditemukan' : 'Permintaan Ditolak',
            message:
              errJson.message ||
              `Program atau menu yang Anda cari tidak tersedia. (${response.status} ${response.statusText})`,
            details: `Client Error HTTP ${response.status}`,
          });
        }

        // Tangani Status 5xx (Server Error)
        if (response.status >= 500) {
          throw new ApiError({
            status: response.status,
            statusText: response.statusText,
            type: '5xx',
            title: 'Terjadi kesalahan pada server.',
            message:
              errJson.message ||
              `Server sedang mengalami gangguan. Silakan coba lagi nanti. (${response.status} Internal Server Error)`,
            details: `Server Error HTTP ${response.status}`,
          });
        }

        // Fallback HTTP status lainnya
        throw new ApiError({
          status: response.status,
          statusText: response.statusText,
          type: 'generic',
          title: 'Gagal mengambil data.',
          message: errJson.message || `HTTP ${response.status}: Terjadi kesalahan.`,
        });
      }

      // 4. Request Sukses (2xx) -> Ambil data JSON
      const data = await response.json();

      // Cek apakah data kosong (Empty State)
      if (Array.isArray(data) && data.length === 0) {
        ApiEventLogs.add('EMPTY', 'Response 200 OK dengan data kosong (Empty State)');
      } else {
        ApiEventLogs.add('SUCCESS', `Request berhasil: ${data.length} item diterima.`);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Jika error sudah bertipe ApiError, teruskan
      if (error instanceof ApiError) {
        throw error;
      }

      // Deteksi Network Error / Offline (TypeError: Network request failed)
      const isNetFail =
        error.message?.includes('Network') ||
        error.message?.includes('Failed to fetch') ||
        !networkService.isConnected();

      if (isNetFail) {
        throw new ApiError({
          status: 0,
          statusText: 'Network Error',
          type: 'offline',
          title: 'Tidak ada koneksi internet.',
          message: 'Periksa koneksi Anda dan coba lagi.',
          details: error.message || 'Koneksi jaringan terputus',
        });
      }

      // Fallback Generic Error
      throw new ApiError({
        status: 0,
        type: 'generic',
        title: 'Terjadi Kesalahan',
        message: error.message || 'Gagal memuat data menu.',
      });
    }
  },

  /**
   * Shortcut untuk kompatibilitas kode sebelumnya
   */
  getProtectedProducts: async () => {
    return await ApiClient.fetchProductsWithHandling({ scenario: API_SCENARIOS.NORMAL });
  },

  /**
   * Simulasi Akses Protected API TANPA TOKEN (Untuk Uji Coba 401)
   */
  testWithoutToken: async () => {
    ApiEventLogs.add('TEST', 'Simulasi Request Tanpa Token -> GET /products');
    const res = await ApiServer.handleGetProducts(null, { scenario: API_SCENARIOS.NORMAL });
    return res;
  },

  /**
   * Logout -> Hapus token dari SecureStore
   */
  logout: async () => {
    await ApiServer.handleLogout();
    await SecureStorage.deleteItem(SECURE_KEYS.ACCESS_TOKEN);
    await SecureStorage.deleteItem(SECURE_KEYS.AUTH_SESSION);
    ApiEventLogs.add('8', 'Logout -> token deleted', 'access_token dihapus');
    ApiEventLogs.add('9', 'Navigate to login screen', 'Sesi ditutup');
    return true;
  },

  getStoredToken: async () => {
    return await SecureStorage.getItem(SECURE_KEYS.ACCESS_TOKEN, null);
  },

  getStoredTokenDetails: async () => {
    const token = await SecureStorage.getItem(SECURE_KEYS.ACCESS_TOKEN, null);
    if (!token) return null;
    return {
      rawToken: token,
      decoded: decodeJWT(token),
      verification: verifyJWT(token),
    };
  },
};
