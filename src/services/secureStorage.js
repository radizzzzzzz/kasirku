import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Keys used in Secure Storage
export const SECURE_KEYS = {
  AUTH_SESSION: 'kasirku_auth_session',
  USERS_DB: 'kasirku_secure_users',
  REMEMBERED_USER: 'kasirku_remembered_user',
};

// Default accounts seeded securely on first run
const DEFAULT_ACCOUNTS = [
  {
    id: 'USR-01',
    employeeId: 'EMP-01',
    name: 'Syauqi Iwan',
    username: 'syauqi',
    email: 'syauqi@kasirku.com',
    password: 'password123',
    role: 'Kasir & Barista',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'USR-02',
    employeeId: 'EMP-02',
    name: 'Siti Rahma',
    username: 'siti',
    email: 'siti@kasirku.com',
    password: 'password123',
    role: 'Kasir & Kitchen',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'USR-03',
    employeeId: 'EMP-03',
    name: 'Administrator',
    username: 'admin',
    email: 'admin@kasirku.com',
    password: 'admin123',
    role: 'Supervisor & Kasir',
    createdAt: new Date().toISOString(),
  },
];

// Helper to determine if native SecureStore is supported (Android/iOS)
// On Web, SecureStore is not natively supported, so we safely fallback to AsyncStorage with prefix
let _isSecureStoreAvailable = null;

async function checkAvailability() {
  if (_isSecureStoreAvailable !== null) return _isSecureStoreAvailable;
  try {
    if (Platform.OS === 'web') {
      _isSecureStoreAvailable = false;
      return false;
    }
    const available = await SecureStore.isAvailableAsync();
    _isSecureStoreAvailable = !!available;
    return _isSecureStoreAvailable;
  } catch (e) {
    _isSecureStoreAvailable = false;
    return false;
  }
}

/**
 * Low-level Secure Storage Wrappers with Web / Device fallback
 */
export const SecureStorage = {
  async setItem(key, value) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const isNativeSecure = await checkAvailability();

    if (isNativeSecure) {
      try {
        await SecureStore.setItemAsync(key, stringValue, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
        return true;
      } catch (err) {
        console.warn(`[SecureStore.setItemAsync] failed for ${key}, falling back:`, err);
      }
    }

    // Fallback for Web or unencrypted fallback
    try {
      await AsyncStorage.setItem(`@sec_${key}`, stringValue);
      return true;
    } catch (e) {
      console.error(`[SecureStorage Fallback] setItem failed for ${key}:`, e);
      return false;
    }
  },

  async getItem(key, fallback = null) {
    const isNativeSecure = await checkAvailability();

    if (isNativeSecure) {
      try {
        const result = await SecureStore.getItemAsync(key);
        if (result !== null && result !== undefined) {
          try {
            return JSON.parse(result);
          } catch {
            return result;
          }
        }
      } catch (err) {
        console.warn(`[SecureStore.getItemAsync] failed for ${key}, checking fallback:`, err);
      }
    }

    // Fallback
    try {
      const fallbackResult = await AsyncStorage.getItem(`@sec_${key}`);
      if (fallbackResult !== null && fallbackResult !== undefined) {
        try {
          return JSON.parse(fallbackResult);
        } catch {
          return fallbackResult;
        }
      }
      return fallback;
    } catch (e) {
      console.error(`[SecureStorage Fallback] getItem failed for ${key}:`, e);
      return fallback;
    }
  },

  async deleteItem(key) {
    const isNativeSecure = await checkAvailability();

    if (isNativeSecure) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (err) {
        console.warn(`[SecureStore.deleteItemAsync] error for ${key}:`, err);
      }
    }

    try {
      await AsyncStorage.removeItem(`@sec_${key}`);
      return true;
    } catch (e) {
      return false;
    }
  },
};

/**
 * Authentication Service built on top of Secure Storage
 */
export const AuthService = {
  // Initialize Default Users in Secure Storage if empty
  init: async () => {
    try {
      const existingUsers = await SecureStorage.getItem(SECURE_KEYS.USERS_DB, null);
      if (!existingUsers || !Array.isArray(existingUsers) || existingUsers.length === 0) {
        await SecureStorage.setItem(SECURE_KEYS.USERS_DB, DEFAULT_ACCOUNTS);
      }
    } catch (err) {
      console.error('[AuthService.init] Error initializing secure accounts:', err);
    }
  },

  // Get current active session
  getSession: async () => {
    return await SecureStorage.getItem(SECURE_KEYS.AUTH_SESSION, null);
  },

  // Get remembered credentials (if any)
  getRememberedUser: async () => {
    return await SecureStorage.getItem(SECURE_KEYS.REMEMBERED_USER, null);
  },

  // Login with Username or Email and Password
  login: async (identifier, password, rememberMe = false) => {
    const trimmedId = (identifier || '').trim().toLowerCase();
    const trimmedPass = (password || '').trim();

    if (!trimmedId) {
      throw new Error('Username atau Email wajib diisi!');
    }
    if (!trimmedPass) {
      throw new Error('Password wajib diisi!');
    }

    // Fetch registered users securely
    let users = await SecureStorage.getItem(SECURE_KEYS.USERS_DB, []);
    if (!users || users.length === 0) {
      users = DEFAULT_ACCOUNTS;
      await SecureStorage.setItem(SECURE_KEYS.USERS_DB, DEFAULT_ACCOUNTS);
    }

    // Match by username or email
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === trimmedId ||
        (u.email && u.email.toLowerCase() === trimmedId)
    );

    if (!user) {
      throw new Error('Akun tidak ditemukan. Periksa kembali username/email Anda.');
    }

    // Verify password
    if (user.password !== trimmedPass) {
      throw new Error('Password salah. Silakan coba lagi.');
    }

    // Create session payload
    const session = {
      token: `sec_tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      user: {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      loggedInAt: new Date().toISOString(),
    };

    // Save session in SecureStore
    await SecureStorage.setItem(SECURE_KEYS.AUTH_SESSION, session);

    // Save or clear remember-me preference
    if (rememberMe) {
      await SecureStorage.setItem(SECURE_KEYS.REMEMBERED_USER, {
        identifier: user.username || user.email,
      });
    } else {
      await SecureStorage.deleteItem(SECURE_KEYS.REMEMBERED_USER);
    }

    return session;
  },

  // Register a new user
  register: async ({ name, username, email, password, role = 'Kasir' }) => {
    const trimmedName = (name || '').trim();
    const trimmedUsername = (username || '').trim().toLowerCase();
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedPass = (password || '').trim();

    if (!trimmedName) throw new Error('Nama lengkap wajib diisi!');
    if (!trimmedUsername) throw new Error('Username wajib diisi!');
    if (trimmedUsername.length < 3) throw new Error('Username minimal 3 karakter!');
    if (!trimmedEmail || !trimmedEmail.includes('@')) throw new Error('Format email tidak valid!');
    if (!trimmedPass || trimmedPass.length < 4) throw new Error('Password minimal 4 karakter!');

    let users = await SecureStorage.getItem(SECURE_KEYS.USERS_DB, []);
    if (!users || !Array.isArray(users)) users = [...DEFAULT_ACCOUNTS];

    // Check duplicate username or email
    const exists = users.some(
      (u) =>
        u.username.toLowerCase() === trimmedUsername ||
        u.email.toLowerCase() === trimmedEmail
    );

    if (exists) {
      throw new Error('Username atau Email sudah terdaftar! Gunakan data lain.');
    }

    const newId = `USR-${String(users.length + 1).padStart(2, '0')}`;
    const employeeId = `EMP-${String(users.length + 1).padStart(2, '0')}`;

    const newUser = {
      id: newId,
      employeeId,
      name: trimmedName,
      username: trimmedUsername,
      email: trimmedEmail,
      password: trimmedPass,
      role: role || 'Kasir & Barista',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await SecureStorage.setItem(SECURE_KEYS.USERS_DB, users);

    // Auto login after register
    const session = {
      token: `sec_tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      user: {
        id: newUser.id,
        employeeId: newUser.employeeId,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
      loggedInAt: new Date().toISOString(),
    };

    await SecureStorage.setItem(SECURE_KEYS.AUTH_SESSION, session);
    return { session, newUser };
  },

  // Logout and clear active secure session
  logout: async () => {
    try {
      await SecureStorage.deleteItem(SECURE_KEYS.AUTH_SESSION);
      return true;
    } catch (e) {
      console.error('[AuthService.logout] Error clearing session:', e);
      return false;
    }
  },

  // Get all registered accounts (for developer/demo switcher)
  getAllUsers: async () => {
    return await SecureStorage.getItem(SECURE_KEYS.USERS_DB, DEFAULT_ACCOUNTS);
  },

  // Check if role has supervisor privileges
  isSupervisorRole: (role) => {
    if (!role) return false;
    const r = role.toLowerCase();
    return r.includes('supervisor') || r.includes('admin') || r.includes('manajer') || r.includes('manager');
  },

  // Verify Supervisor authorization by PIN or Password
  verifySupervisorAuth: async (pinOrPassword) => {
    const input = (pinOrPassword || '').trim();
    if (!input) {
      throw new Error('Masukkan PIN atau Kata Sandi Supervisor!');
    }

    // 1. Check against registered accounts in Secure Storage
    const users = await SecureStorage.getItem(SECURE_KEYS.USERS_DB, DEFAULT_ACCOUNTS);
    const matchingUser = (users || []).find(
      (u) =>
        u.role &&
        (u.role.toLowerCase().includes('supervisor') || u.role.toLowerCase().includes('admin')) &&
        (u.password === input || u.pin === input)
    );

    if (matchingUser) {
      return {
        success: true,
        supervisorName: matchingUser.name,
        role: matchingUser.role,
      };
    }

    // 2. Fallback check for default supervisor PIN / credentials (e.g. Andi Pratama PIN: 2222, admin: admin123)
    if (input === '2222' || input === 'admin123' || input === 'admin') {
      return {
        success: true,
        supervisorName: 'Andi Pratama (Supervisor)',
        role: 'Supervisor & Kasir',
      };
    }

    throw new Error('PIN atau Kata Sandi Supervisor salah. Akses ditolak!');
  },
};

