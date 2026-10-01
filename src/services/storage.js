import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_PRODUCTS, INITIAL_EMPLOYEES, INITIAL_STORE_INFO } from '../constants/initialData';

const KEYS = {
  PRODUCTS: '@kasirku_products',
  EMPLOYEES: '@kasirku_employees',
  ACTIVE_EMPLOYEE: '@kasirku_active_employee',
  ACTIVE_SHIFT: '@kasirku_active_shift',
  SHIFT_HISTORY: '@kasirku_shift_history',
  ATTENDANCE: '@kasirku_attendance',
  TRANSACTIONS: '@kasirku_transactions',
  STORE_INFO: '@kasirku_store_info',
};

// Memory fallback in case storage has issues or is initializing
let memoryStorage = {};

const safeGet = async (key, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    if (memoryStorage[key]) return memoryStorage[key];
    return fallback;
  } catch (e) {
    console.warn(`Storage get error for ${key}:`, e);
    return memoryStorage[key] || fallback;
  }
};

const safeSet = async (key, value) => {
  try {
    memoryStorage[key] = value;
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`Storage set error for ${key}:`, e);
    return false;
  }
};

export const StorageService = {
  // Initialization & seeding default data if empty
  init: async () => {
    try {
      const existingProducts = await safeGet(KEYS.PRODUCTS, null);
      if (!existingProducts || existingProducts.length === 0) {
        await safeSet(KEYS.PRODUCTS, INITIAL_PRODUCTS);
      }

      const existingEmployees = await safeGet(KEYS.EMPLOYEES, null);
      if (!existingEmployees || existingEmployees.length === 0) {
        await safeSet(KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
      }

      const activeEmp = await safeGet(KEYS.ACTIVE_EMPLOYEE, null);
      if (!activeEmp) {
        await safeSet(KEYS.ACTIVE_EMPLOYEE, INITIAL_EMPLOYEES[0]);
      }

      const store = await safeGet(KEYS.STORE_INFO, null);
      if (!store) {
        await safeSet(KEYS.STORE_INFO, INITIAL_STORE_INFO);
      }

      // Check active shift - if none, start a default morning shift so app is ready to sell
      const activeShift = await safeGet(KEYS.ACTIVE_SHIFT, null);
      if (!activeShift) {
        const defaultShift = {
          id: 'SHIFT-' + Date.now(),
          shiftName: 'Shift Pagi (07:00 - 15:00)',
          employeeName: INITIAL_EMPLOYEES[0].name,
          employeeId: INITIAL_EMPLOYEES[0].id,
          startTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          startDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          openingCash: 100000, // Rp 100.000 modal awal laci
          status: 'ACTIVE',
          totalCashSales: 0,
          totalQrisSales: 0,
          transactionCount: 0,
        };
        await safeSet(KEYS.ACTIVE_SHIFT, defaultShift);
      }
    } catch (e) {
      console.error('StorageService init error:', e);
    }
  },

  // Products
  getProducts: async () => safeGet(KEYS.PRODUCTS, INITIAL_PRODUCTS),
  saveProducts: async (products) => safeSet(KEYS.PRODUCTS, products),

  // Employees
  getEmployees: async () => safeGet(KEYS.EMPLOYEES, INITIAL_EMPLOYEES),
  saveEmployees: async (employees) => safeSet(KEYS.EMPLOYEES, employees),
  addEmployee: async (emp) => {
    const list = await safeGet(KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    const exists = list.some((e) => e.id === emp.id || e.name.toLowerCase() === emp.name.toLowerCase());
    if (!exists) {
      const updated = [...list, emp];
      await safeSet(KEYS.EMPLOYEES, updated);
      return updated;
    }
    return list;
  },
  getActiveEmployee: async () => safeGet(KEYS.ACTIVE_EMPLOYEE, INITIAL_EMPLOYEES[0]),
  setActiveEmployee: async (emp) => safeSet(KEYS.ACTIVE_EMPLOYEE, emp),

  // Active Shift
  getActiveShift: async () => safeGet(KEYS.ACTIVE_SHIFT, null),
  setActiveShift: async (shift) => safeSet(KEYS.ACTIVE_SHIFT, shift),

  // Shift History
  getShiftHistory: async () => safeGet(KEYS.SHIFT_HISTORY, []),
  addShiftHistory: async (shiftRecord) => {
    const history = await safeGet(KEYS.SHIFT_HISTORY, []);
    const updated = [shiftRecord, ...history];
    await safeSet(KEYS.SHIFT_HISTORY, updated);
    return updated;
  },

  // Attendance (Presensi)
  getAttendance: async () => safeGet(KEYS.ATTENDANCE, []),
  saveAttendance: async (attendanceList) => safeSet(KEYS.ATTENDANCE, attendanceList),
  recordAttendance: async (record) => {
    const list = await safeGet(KEYS.ATTENDANCE, []);
    const updated = [record, ...list];
    await safeSet(KEYS.ATTENDANCE, updated);
    return updated;
  },

  // Transactions
  getTransactions: async () => safeGet(KEYS.TRANSACTIONS, []),
  addTransaction: async (tx) => {
    const list = await safeGet(KEYS.TRANSACTIONS, []);
    const updated = [tx, ...list];
    await safeSet(KEYS.TRANSACTIONS, updated);

    // Update active shift stats if shift is active
    const activeShift = await safeGet(KEYS.ACTIVE_SHIFT, null);
    if (activeShift && activeShift.status === 'ACTIVE') {
      const isCash = tx.paymentMethod === 'TUNAI';
      const newShift = {
        ...activeShift,
        transactionCount: (activeShift.transactionCount || 0) + 1,
        totalCashSales: (activeShift.totalCashSales || 0) + (isCash ? tx.grandTotal : 0),
        totalQrisSales: (activeShift.totalQrisSales || 0) + (!isCash ? tx.grandTotal : 0),
      };
      await safeSet(KEYS.ACTIVE_SHIFT, newShift);
    }

    return updated;
  },

  // Store Info
  getStoreInfo: async () => safeGet(KEYS.STORE_INFO, INITIAL_STORE_INFO),
  saveStoreInfo: async (info) => safeSet(KEYS.STORE_INFO, info),

  // Format IDR Helper
  formatIDR: (amount) => {
    const num = Number(amount) || 0;
    return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },
};
