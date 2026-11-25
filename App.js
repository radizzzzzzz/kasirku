import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  TextInput,
  ScrollView,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from './src/constants/theme';
import { StorageService } from './src/services/storage';
import { AuthService } from './src/services/secureStorage';
import { ApiClient, ApiEventLogs } from './src/services/api';
import { networkService } from './src/services/network';
import { showAlert } from './src/utils/alert';
import {
  registerForPushNotificationsAsync,
  setupNotificationListeners,
  checkColdStartNotification,
  sendExpoPushNotification,
  scheduleLocalTestNotification,
} from './src/services/notifications';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import KasirScreen from './src/screens/KasirScreen';
import MenuScreen from './src/screens/MenuScreen';
import ShiftScreen from './src/screens/ShiftScreen';
import PresensiScreen from './src/screens/PresensiScreen';
import RiwayatScreen from './src/screens/RiwayatScreen';
import SensorScreen from './src/screens/SensorScreen';

// Components
import Header from './src/components/Header';
import ApiStateView from './src/components/ApiStateView';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [authSession, setAuthSession] = useState(null);
  const [activeTab, setActiveTab] = useState('KASIR'); // KASIR | MENU | SHIFT | PRESENSI | RIWAYAT | SENSOR

  // Central Application State
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeEmployee, setActiveEmployee] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);

  // Global Profile Switcher Modal
  // History Login Users & Switch Account with Password Verification
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);
  const [switchAccountTarget, setSwitchAccountTarget] = useState(null);
  const [switchPasswordInput, setSwitchPasswordInput] = useState('');
  const [switchPasswordError, setSwitchPasswordError] = useState('');
  const [isSwitchPasswordModalOpen, setIsSwitchPasswordModalOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Helper supervisor check for account switching privilege
  const isSupervisor =
    AuthService.isSupervisorRole(authSession?.user?.role) ||
    AuthService.isSupervisorRole(activeEmployee?.role);

  const handleSelectEmployee = async (emp) => {
    setActiveEmployee(emp);
    await StorageService.setActiveEmployee(emp);
  };

  const [isOnline, setIsOnline] = useState(networkService.isConnected());

  // Push Notification States (Task 01, Task 02, Task 03)
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [pushStatusText, setPushStatusText] = useState('Memeriksa izin & token...');
  const [isPushRegistered, setIsPushRegistered] = useState(false);
  const [isPhysicalPhone, setIsPhysicalPhone] = useState(false);
  const [lastNotification, setLastNotification] = useState(null);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [hasUnreadNotification, setHasUnreadNotification] = useState(false);
  const [isSendingTestNotif, setIsSendingTestNotif] = useState(false);

  // TASK 03: Penanganan Respon Notifikasi saat Pengguna Mengetuk Notifikasi (Notification Tap Listener)
  const handleNotificationResponse = ({ response, data, isColdStart }) => {
    console.log('[App] Respon Notifikasi Diklik (Task 03):', data);
    setHasUnreadNotification(false);
    setLastNotification({
      title: response?.notification?.request?.content?.title || 'KasirKu',
      body: response?.notification?.request?.content?.body || '',
      data: data || {},
      timestamp: new Date().toLocaleTimeString('id-ID'),
    });

    const targetScreen = data?.screen;
    if (targetScreen) {
      const validTabs = ['KASIR', 'MENU', 'SHIFT', 'PRESENSI', 'RIWAYAT', 'SENSOR'];
      if (validTabs.includes(targetScreen)) {
        setActiveTab(targetScreen);
        showAlert(
          'Navigasi Notifikasi (Task 03)',
          `Membuka layar ${targetScreen} berdasarkan aksi notifikasi!${data?.transactionId ? `\n(ID Transaksi: ${data.transactionId})` : ''}`
        );
      }
    }
  };

  // TASK 02: Penanganan Notifikasi Masuk saat Aplikasi Foreground
  const handleNotificationReceived = (notification) => {
    console.log('[App] Notifikasi Diterima Foreground (Task 02):', notification);
    setHasUnreadNotification(true);
    setLastNotification({
      title: notification?.request?.content?.title || 'KasirKu',
      body: notification?.request?.content?.body || '',
      data: notification?.request?.content?.data || {},
      timestamp: new Date().toLocaleTimeString('id-ID'),
    });
  };

  // Setup Push Notification Lifecycle (Task 01 & Task 03)
  useEffect(() => {
    let isMounted = true;

    async function initPushNotification() {
      try {
        const result = await registerForPushNotificationsAsync();
        if (!isMounted) return;

        if (result.success && result.token) {
          setExpoPushToken(result.token);
          setIsPhysicalPhone(result.isDevice);
          setIsPushRegistered(true);
          setPushStatusText(result.isDevice ? 'Token Terdaftar (Perangkat Fisik)' : 'Token Simulasi (Mode Emulator)');

          // Daftarkan ke Backend Server (Task 01)
          await ApiClient.registerPushToken(result.token, authSession?.user);
        } else {
          setPushStatusText(result.error || 'Izin notifikasi tidak diberikan');
          setIsPushRegistered(false);
        }
      } catch (err) {
        console.warn('[App] Push notification init error:', err);
        if (isMounted) setPushStatusText('Gagal inisialisasi notifikasi');
      }
    }

    initPushNotification();

    // Pasang Listener Notifikasi (Task 03)
    const cleanupListeners = setupNotificationListeners({
      onNotificationReceived: handleNotificationReceived,
      onNotificationResponse: handleNotificationResponse,
    });

    // Cek Cold Start (Aplikasi dibuka dari notifikasi saat killed state) (Task 03)
    checkColdStartNotification(handleNotificationResponse);

    return () => {
      isMounted = false;
      if (cleanupListeners) cleanupListeners();
    };
  }, [authSession?.user?.id]);

  // TASK 02: Fungsi Mengirim Notifikasi Uji Coba dari Dalam Aplikasi
  const handleSendTestNotification = async (scenarioType) => {
    if (isSendingTestNotif) return;
    setIsSendingTestNotif(true);

    let title = 'KasirKu POS';
    let body = 'Pemberitahuan dari KasirKu';
    let payloadData = { screen: 'KASIR' };

    switch (scenarioType) {
      case 'TRANSACTION':
        title = 'Transaksi Baru Berhasil!';
        body = 'Pesanan Meja 03 senilai Rp 85.000 telah lunas.';
        payloadData = {
          screen: 'RIWAYAT',
          transactionId: 'TRX-' + Date.now().toString().slice(-4),
          action: 'VIEW_TRANSACTION',
        };
        break;
      case 'SHIFT':
        title = 'Shift Kasir Ditutup';
        body = 'Shift Pagi telah selesai. Total omset laci: Rp 1.450.000.';
        payloadData = {
          screen: 'SHIFT',
          shiftId: activeShift?.id || 'SHIFT-001',
        };
        break;
      case 'PRESENSI':
        title = 'Pengingat Presensi Karyawan';
        body = 'Waktu shift segera dimulai. Silakan lakukan presensi & foto diri.';
        payloadData = {
          screen: 'PRESENSI',
        };
        break;
      case 'MENU':
        title = 'Peringatan Stok Menu!';
        body = 'Stok bahan baku Kopi Susu Aren tersisa kurang dari 5 porsi.';
        payloadData = {
          screen: 'MENU',
        };
        break;
      default:
        break;
    }

    try {
      if (isPhysicalPhone && expoPushToken && !expoPushToken.includes('Simulated_Emulator')) {
        // Kirim via Expo Push API (Task 02)
        await sendExpoPushNotification({
          to: expoPushToken,
          title,
          body,
          data: payloadData,
        });
      } else {
        // Fallback jadwal notifikasi lokal (1 detik) untuk emulator / offline
        await scheduleLocalTestNotification({
          title,
          body,
          data: payloadData,
          delaySeconds: 1,
        });
      }

      showAlert(
        'Notifikasi Terkirim (Task 02)',
        `Notifikasi "${title}" telah dikirimkan!\n\nKetuk banner notifikasi yang muncul di layar untuk menguji auto-routing ke tab ${payloadData.screen} (Task 03).`
      );
    } catch (e) {
      showAlert('Gagal Kirim', e.message || 'Gagal mengirim push notifikasi.');
    } finally {
      setIsSendingTestNotif(false);
    }
  };

  useEffect(() => {
    // [1] App started log
    ApiClient.logAppStarted();

    // Listen to network changes (Task 03)
    const unsub = networkService.subscribe((online) => {
      setIsOnline(online);
    });
    return unsub;
  }, []);

  // Initial load
  useEffect(() => {
    async function loadData() {
      try {
        // Initialize Local Storage & Secure Storage
        await StorageService.init();
        await AuthService.init();

        const [prods, emps, activeEmp, shift, shiftHist, attend, txs, store, session, loginHist] =
          await Promise.all([
            StorageService.getProducts(),
            StorageService.getEmployees(),
            StorageService.getActiveEmployee(),
            StorageService.getActiveShift(),
            StorageService.getShiftHistory(),
            StorageService.getAttendance(),
            StorageService.getTransactions(),
            StorageService.getStoreInfo(),
            AuthService.getSession(),
            StorageService.getLoginHistory(),
          ]);

        // Load products (use protected endpoint if session exists)
        let loadedProducts = prods || [];
        if (session && session.token) {
          try {
            const protectedProds = await ApiClient.getProtectedProducts();
            if (protectedProds) loadedProducts = protectedProds;
          } catch (e) {
            console.warn('Initial protected product load fallback:', e);
          }
        }

        setProducts(loadedProducts);
        setEmployees(emps || []);
        setActiveEmployee(activeEmp || null);
        setActiveShift(shift || null);
        setShiftHistory(shiftHist || []);
        setAttendanceList(attend || []);
        setTransactions(txs || []);
        setStoreInfo(store || null);
        setAuthSession(session || null);
        setLoginHistory(loginHist || []);
      } catch (err) {
        console.error('Error loading app data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleLoginSuccess = async (session, emp) => {
    setAuthSession(session);
    if (emp) {
      setActiveEmployee(emp);
    }
    try {
      // Panggil protected endpoint GET /products menggunakan Bearer token (Task 02)
      const protectedProducts = await ApiClient.getProtectedProducts();
      setProducts(protectedProducts || []);
    } catch (e) {
      console.warn('Gagal memuat protected products pada login:', e);
    }
    const freshEmployees = await StorageService.getEmployees();
    setEmployees(freshEmployees || []);
    const freshHistory = await StorageService.getLoginHistory();
    setLoginHistory(freshHistory || []);
  };

  const handleLogout = () => {
    const executeLogout = async () => {
      // Panggil ApiClient.logout() -> menghapus access_token dari SecureStore
      await ApiClient.logout();
      setAuthSession(null);
      setIsProfileModalOpen(false);
      setIsSwitchPasswordModalOpen(false);
    };

    showAlert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar dari KasirKu? Sesi login Anda akan ditutup.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Keluar', style: 'destructive', onPress: executeLogout },
      ]
    );
  };

  const handlePressProfile = () => {
    setIsProfileModalOpen(true);
  };

  const handleInitiateSwitchAccount = (targetUser) => {
    // Jika akun target adalah akun yang sedang aktif saat ini
    const isCurrentActive =
      (authSession?.user?.id && authSession.user.id === targetUser.id) ||
      (authSession?.user?.username && authSession.user.username === targetUser.username);

    if (isCurrentActive) {
      showAlert('Informasi', `Anda saat ini sedang bertugas sebagai ${targetUser.name}.`);
      return;
    }

    // Jika user saat ini adalah SUPERVISOR, dapat langsung beralih akun
    if (isSupervisor) {
      showAlert(
        'Konfirmasi Supervisor',
        `Sebagai Supervisor, apakah Anda ingin langsung beralih ke akun ${targetUser.name}?`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Beralih Akun',
            onPress: () => executeSwitchAccountDirectly(targetUser),
          },
        ]
      );
      return;
    }

    // User biasa (non-supervisor) TIDAK DAPAT mengakses akun lain tanpa kata sandi!
    setSwitchAccountTarget(targetUser);
    setSwitchPasswordInput('');
    setSwitchPasswordError('');
    setIsSwitchPasswordModalOpen(true);
  };

  const handleConfirmSwitchWithPassword = async () => {
    if (!switchPasswordInput.trim()) {
      setSwitchPasswordError('Silakan masukkan kata sandi akun ini!');
      return;
    }

    setIsSwitching(true);
    setSwitchPasswordError('');
    try {
      // Login via ApiClient dengan password target user
      const { session } = await ApiClient.login(
        switchAccountTarget.username || switchAccountTarget.email,
        switchPasswordInput
      );

      const emps = await StorageService.getEmployees();
      let matchedEmp = emps.find(
        (e) =>
          (session.user.employeeId && e.id === session.user.employeeId) ||
          e.name.toLowerCase() === session.user.name.toLowerCase()
      );

      if (!matchedEmp) {
        matchedEmp = {
          id: session.user.employeeId || `EMP-${Date.now().toString().slice(-4)}`,
          name: session.user.name,
          role: session.user.role,
          phone: '0812-0000-0000',
          pin: '1234',
        };
        await StorageService.addEmployee(matchedEmp);
      }

      await StorageService.setActiveEmployee(matchedEmp);
      await StorageService.recordLoginHistory(session.user);
      const freshHistory = await StorageService.getLoginHistory();
      setLoginHistory(freshHistory || []);

      setAuthSession(session);
      setActiveEmployee(matchedEmp);

      // Refresh data produk terlindungi untuk sesi baru
      try {
        const prods = await ApiClient.getProtectedProducts();
        setProducts(prods || []);
      } catch (e) {
        console.warn('Fallback refresh products:', e);
      }

      setIsSwitchPasswordModalOpen(false);
      setIsProfileModalOpen(false);
      setSwitchPasswordInput('');
      setSwitchAccountTarget(null);

      showAlert(
        'Beralih Akun Berhasil',
        `Sekarang Anda bertugas sebagai ${session.user.name} (${session.user.role}).`
      );
    } catch (err) {
      // Sensor Getar: Picu getaran fisik saat salah kata sandi beralih akun
      try {
        Vibration.vibrate([0, 120, 80, 160]);
      } catch (e) {}
      setSwitchPasswordError(err.message || 'Kata sandi salah. Akses ditolak!');
    } finally {
      setIsSwitching(false);
    }
  };

  const executeSwitchAccountDirectly = async (targetUser) => {
    try {
      const users = await AuthService.getAllUsers();
      const fullTarget = users.find(
        (u) => u.id === targetUser.id || u.username === targetUser.username
      );

      if (fullTarget) {
        const { session } = await ApiClient.login(fullTarget.username, fullTarget.password);
        setAuthSession(session);

        const emps = await StorageService.getEmployees();
        const matched = emps.find(
          (e) => e.name.toLowerCase() === targetUser.name.toLowerCase()
        );
        if (matched) {
          setActiveEmployee(matched);
          await StorageService.setActiveEmployee(matched);
        }
        await StorageService.recordLoginHistory(session.user);
        const freshHistory = await StorageService.getLoginHistory();
        setLoginHistory(freshHistory || []);
      }

      setIsProfileModalOpen(false);
      showAlert('Berhasil', `Supervisor telah beralih ke akun ${targetUser.name}.`);
    } catch (err) {
      showAlert('Gagal Beralih', err.message || 'Gagal mengganti akun.');
    }
  };

  const handleTransactionComplete = async (newTx) => {
    setTransactions((prev) => [newTx, ...prev]);
    // Refresh shift stats
    const currentShift = await StorageService.getActiveShift();
    setActiveShift(currentShift);
  };

  if (isLoading) {
    return (
      <View style={styles.appContainer}>
        <View style={styles.responsiveWrapper}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Memuat KasirKu...</Text>
          </View>
        </View>
      </View>
    );
  }

  // If user is not authenticated, render AuthScreen
  if (!authSession) {
    return (
      <View style={styles.appContainer}>
        <View style={styles.responsiveWrapper}>
          <SafeAreaView style={styles.safeArea}>
            <StatusBar
              barStyle="dark-content"
              backgroundColor="#FFFFFF"
              translucent={Platform.OS === 'android'}
            />
            <AuthScreen onLoginSuccess={handleLoginSuccess} />
          </SafeAreaView>
        </View>
      </View>
    );
  }

  const getScreenTitle = () => {
    switch (activeTab) {
      case 'KASIR':
        return 'KasirKu POS';
      case 'MENU':
        return 'Katalog Menu & Harga';
      case 'SHIFT':
        return 'Manajemen Shift Kasir';
      case 'PRESENSI':
        return 'Presensi & Kehadiran';
      case 'RIWAYAT':
        return 'Riwayat Transaksi';
      case 'SENSOR':
        return 'Sensor Perangkat';
      default:
        return 'KasirKu';
    }
  };

  return (
    <View style={styles.appContainer}>
      <View style={styles.responsiveWrapper}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor="#FFFFFF"
            translucent={Platform.OS === 'android'}
          />

          {/* Top Universal Header */}
          <Header
            title={getScreenTitle()}
            activeEmployee={activeEmployee}
            activeShift={activeShift}
            onPressProfile={() => setIsProfileModalOpen(true)}
            onPressNotification={() => {
              setIsNotifModalOpen(true);
              setHasUnreadNotification(false);
            }}
            hasNotification={hasUnreadNotification}
            onLogout={handleLogout}
            isOnline={isOnline}
          />

      {/* Screen Views */}
      <View style={styles.screenContainer}>
        {!isOnline ? (
          <ApiStateView
            type="offline"
            title="Tidak ada koneksi internet."
            message="Periksa koneksi Anda dan coba lagi."
            onRetry={async () => {
              networkService.setSimulatedOffline(false);
              const connected = await networkService.checkRealConnectivity();
              if (!connected) {
                showAlert('Status Jaringan', 'Perangkat masih dalam kondisi offline.');
              } else {
                showAlert('Terhubung', 'Koneksi internet berhasil dipulihkan!');
              }
            }}
            retryLabel="Coba Lagi"
          />
        ) : (
          <>
            {activeTab === 'KASIR' && (
              <KasirScreen
                products={products}
                onUpdateProducts={setProducts}
                activeEmployee={activeEmployee}
                activeShift={activeShift}
                storeInfo={storeInfo}
                onTransactionComplete={handleTransactionComplete}
                isOnline={isOnline}
              />
            )}

            {activeTab === 'MENU' && (
              <MenuScreen
                products={products}
                onUpdateProducts={setProducts}
              />
            )}

            {activeTab === 'SHIFT' && (
              <ShiftScreen
                activeShift={activeShift}
                onUpdateActiveShift={setActiveShift}
                activeEmployee={activeEmployee}
                shiftHistory={shiftHistory}
                onUpdateShiftHistory={setShiftHistory}
                isOnline={isOnline}
              />
            )}

            {activeTab === 'PRESENSI' && (
              <PresensiScreen
                activeEmployee={activeEmployee}
                employees={employees}
                onSelectEmployee={handleSelectEmployee}
                attendanceList={attendanceList}
                onUpdateAttendance={setAttendanceList}
                isOnline={isOnline}
              />
            )}

            {activeTab === 'SENSOR' && (
              <SensorScreen />
            )}

            {activeTab === 'RIWAYAT' && (
              <RiwayatScreen
                transactions={transactions}
                storeInfo={storeInfo}
                isOnline={isOnline}
              />
            )}
          </>
        )}
      </View>

      {/* Bottom Navigation Tab Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('KASIR')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'KASIR' ? 'calculator' : 'calculator-outline'}
            size={22}
            color={activeTab === 'KASIR' ? THEME.colors.primary : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'KASIR' && styles.tabLabelActive,
            ]}
          >
            Kasir
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('MENU')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'MENU' ? 'restaurant' : 'restaurant-outline'}
            size={22}
            color={activeTab === 'MENU' ? THEME.colors.primary : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'MENU' && styles.tabLabelActive,
            ]}
          >
            Menu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('SHIFT')}
          activeOpacity={0.7}
        >
          <View style={styles.shiftTabIconWrapper}>
            <Ionicons
              name={activeTab === 'SHIFT' ? 'time' : 'time-outline'}
              size={22}
              color={activeTab === 'SHIFT' ? THEME.colors.primary : THEME.colors.textMuted}
            />
            {activeShift && <View style={styles.activeShiftDot} />}
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'SHIFT' && styles.tabLabelActive,
            ]}
          >
            Shift
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('PRESENSI')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'PRESENSI' ? 'finger-print' : 'finger-print-outline'}
            size={22}
            color={activeTab === 'PRESENSI' ? THEME.colors.primary : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'PRESENSI' && styles.tabLabelActive,
            ]}
          >
            Presensi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('RIWAYAT')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'RIWAYAT' ? 'receipt' : 'receipt-outline'}
            size={22}
            color={activeTab === 'RIWAYAT' ? THEME.colors.primary : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'RIWAYAT' && styles.tabLabelActive,
            ]}
          >
            Riwayat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('SENSOR')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'SENSOR' ? 'hardware-chip' : 'hardware-chip-outline'}
            size={22}
            color={activeTab === 'SENSOR' ? THEME.colors.primary : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'SENSOR' && styles.tabLabelActive,
            ]}
          >
            Sensor
          </Text>
        </TouchableOpacity>
      </View>

      {/* Profile Switcher Modal (Histori Akun & Proteksi Password) */}
      <Modal visible={isProfileModalOpen} transparent animationType="fade">
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalCard}>
            <View style={styles.profileModalHeader}>
              <View>
                <Text style={styles.profileModalTitle}>Ganti Akun Kasir</Text>
                <Text style={styles.profileModalSubtitle}>Histori akun yang pernah login pada perangkat ini</Text>
              </View>
              <TouchableOpacity onPress={() => setIsProfileModalOpen(false)}>
                <Ionicons name="close" size={24} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Current Active Account Card */}
            <View style={styles.currentAccountCard}>
              <View style={styles.currentAccountAvatar}>
                <Ionicons name="person" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.currentAccountName}>{activeEmployee?.name || authSession?.user?.name}</Text>
                  <View style={styles.activePillBadge}>
                    <Text style={styles.activePillText}>Sedang Aktif</Text>
                  </View>
                </View>
                <Text style={styles.currentAccountRole}>{activeEmployee?.role || authSession?.user?.role}</Text>
              </View>
            </View>

            {/* History List of Previously Logged In Users */}
            <View style={styles.historyListSection}>
              <Text style={styles.historySectionTitle}>Pilih Akun untuk Beralih:</Text>
              <Text style={styles.historySectionSubtitle}>
                {isSupervisor
                  ? 'Sebagai Supervisor, Anda memiliki akses bebas beralih akun.'
                  : 'Pengguna lain wajib memasukkan kata sandi akun terkait.'}
              </Text>

              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                {loginHistory.map((histUser) => {
                  const isCurrent =
                    (activeEmployee?.name && activeEmployee.name.toLowerCase() === histUser.name.toLowerCase()) ||
                    (authSession?.user?.id && authSession.user.id === histUser.id);
                  const isHistSupervisor = AuthService.isSupervisorRole(histUser.role);

                  return (
                    <TouchableOpacity
                      key={histUser.id || histUser.username}
                      style={[
                        styles.profileEmpOption,
                        isCurrent && styles.profileEmpOptionSelected,
                      ]}
                      onPress={() => handleInitiateSwitchAccount(histUser)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.profileEmpAvatar,
                          isCurrent && { backgroundColor: THEME.colors.primary },
                        ]}
                      >
                        <Ionicons
                          name={isHistSupervisor ? 'shield' : 'person'}
                          size={18}
                          color={isCurrent ? '#FFFFFF' : THEME.colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.profileEmpName,
                            isCurrent && styles.profileEmpNameSelected,
                          ]}
                        >
                          {histUser.name}
                        </Text>
                        <Text style={styles.profileEmpRole}>
                          {histUser.role} • @{histUser.username}
                        </Text>
                      </View>
                      {isCurrent ? (
                        <View style={styles.activeCheckBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={THEME.colors.primary} />
                        </View>
                      ) : (
                        <View style={styles.switchKeyBadge}>
                          <Ionicons
                            name={isSupervisor ? 'swap-horizontal' : 'lock-closed'}
                            size={13}
                            color={THEME.colors.primary}
                          />
                          <Text style={styles.switchKeyText}>
                            {isSupervisor ? 'Beralih' : 'Sandi'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.modalLogoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color={THEME.colors.danger} />
              <Text style={styles.modalLogoutText}>Keluar dari Akun (Logout)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Masukkan Sandi untuk Ganti Akun */}
      <Modal visible={isSwitchPasswordModalOpen} transparent animationType="fade">
        <View style={styles.passwordModalOverlay}>
          <View style={styles.passwordModalCard}>
            <View style={styles.passwordModalHeader}>
              <View style={styles.passwordLockIcon}>
                <Ionicons name="lock-closed" size={22} color={THEME.colors.primary} />
              </View>
              <Text style={styles.passwordModalTitle}>Verifikasi Kata Sandi</Text>
              <Text style={styles.passwordModalSubtitle}>
                Masukkan kata sandi untuk akun{' '}
                <Text style={{ fontWeight: '800', color: THEME.colors.text }}>
                  {switchAccountTarget?.name}
                </Text>
              </Text>
            </View>

            {switchPasswordError ? (
              <View style={styles.passwordErrorBox}>
                <Ionicons name="alert-circle" size={15} color={THEME.colors.danger} />
                <Text style={styles.passwordErrorText}>{switchPasswordError}</Text>
              </View>
            ) : null}

            <View style={styles.passwordInputWrapper}>
              <Ionicons name="key-outline" size={18} color={THEME.colors.textMuted} />
              <TextInput
                style={styles.passwordInput}
                placeholder="Kata sandi akun..."
                placeholderTextColor={THEME.colors.textLight}
                secureTextEntry
                value={switchPasswordInput}
                onChangeText={(t) => {
                  setSwitchPasswordInput(t);
                  setSwitchPasswordError('');
                }}
              />
            </View>

            <View style={styles.passwordModalActions}>
              <TouchableOpacity
                style={styles.passwordCancelBtn}
                onPress={() => {
                  setIsSwitchPasswordModalOpen(false);
                  setSwitchPasswordInput('');
                  setSwitchPasswordError('');
                  setSwitchAccountTarget(null);
                }}
              >
                <Text style={styles.passwordCancelText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.passwordSubmitBtn, isSwitching && styles.btnDisabled]}
                onPress={handleConfirmSwitchWithPassword}
                disabled={isSwitching}
              >
                {isSwitching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.passwordSubmitText}>Masuk & Beralih</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Push Notification Panel Modal (Task 01, Task 02, Task 03) */}
      <Modal visible={isNotifModalOpen} transparent animationType="slide">
        <View style={styles.notifModalOverlay}>
          <View style={styles.notifModalCard}>
            <View style={styles.notifModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.notifHeaderIcon}>
                  <Ionicons name="notifications" size={20} color={THEME.colors.primary} />
                </View>
                <View>
                  <Text style={styles.notifModalTitle}>Push Notifications</Text>
                  <Text style={styles.notifModalSubtitle}>Status & Simulator Task 01, 02, 03</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsNotifModalOpen(false)}
                style={styles.notifCloseButton}
              >
                <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Task 01: Status Device Token & Registrasi */}
              <View style={styles.notifSectionBox}>
                <View style={styles.notifSectionHeader}>
                  <Ionicons name="hardware-chip-outline" size={16} color={THEME.colors.primary} />
                  <Text style={styles.notifSectionTitle}>Task 01 – Register Device</Text>
                </View>
                <View style={styles.tokenStatusRow}>
                  <View style={[styles.statusIndicatorDot, isPushRegistered ? styles.dotActive : styles.dotInactive]} />
                  <Text style={styles.tokenStatusText}>{pushStatusText}</Text>
                </View>
                <View style={styles.tokenCodeBox}>
                  <Text style={styles.tokenCodeLabel}>Expo Push Token:</Text>
                  <Text style={styles.tokenCodeValue} numberOfLines={2} selectable>
                    {expoPushToken || 'Belum terdaftar'}
                  </Text>
                </View>
              </View>

              {/* Task 02 & 03: Panel Pengujian Notifikasi */}
              <View style={styles.notifSectionBox}>
                <View style={styles.notifSectionHeader}>
                  <Ionicons name="paper-plane-outline" size={16} color={THEME.colors.primary} />
                  <Text style={styles.notifSectionTitle}>Task 02 & 03 – Kirim & Uji Deep Navigasi</Text>
                </View>
                <Text style={styles.notifTestInstructions}>
                  Pilih skenario notifikasi di bawah. Saat notifikasi muncul, ketuk banner notifikasi untuk memverifikasi auto-routing (Task 03):
                </Text>

                <TouchableOpacity
                  style={styles.notifActionBtn}
                  onPress={() => handleSendTestNotification('TRANSACTION')}
                  disabled={isSendingTestNotif}
                >
                  <View style={[styles.notifBtnIcon, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="receipt-outline" size={18} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifBtnTitle}>1. Transaksi Baru Masuk</Text>
                    <Text style={styles.notifBtnDesc}>Payload: target screen 'RIWAYAT'</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.notifActionBtn}
                  onPress={() => handleSendTestNotification('SHIFT')}
                  disabled={isSendingTestNotif}
                >
                  <View style={[styles.notifBtnIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="time-outline" size={18} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifBtnTitle}>2. Shift Ditutup</Text>
                    <Text style={styles.notifBtnDesc}>Payload: target screen 'SHIFT'</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.notifActionBtn}
                  onPress={() => handleSendTestNotification('PRESENSI')}
                  disabled={isSendingTestNotif}
                >
                  <View style={[styles.notifBtnIcon, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="finger-print-outline" size={18} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifBtnTitle}>3. Pengingat Presensi</Text>
                    <Text style={styles.notifBtnDesc}>Payload: target screen 'PRESENSI'</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.notifActionBtn}
                  onPress={() => handleSendTestNotification('MENU')}
                  disabled={isSendingTestNotif}
                >
                  <View style={[styles.notifBtnIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifBtnTitle}>4. Peringatan Stok Menu</Text>
                    <Text style={styles.notifBtnDesc}>Payload: target screen 'MENU'</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Data Notifikasi Terakhir yang Diterima */}
              {lastNotification && (
                <View style={[styles.notifSectionBox, { backgroundColor: '#F8FAFC' }]}>
                  <View style={styles.notifSectionHeader}>
                    <Ionicons name="checkmark-done-circle-outline" size={16} color="#059669" />
                    <Text style={[styles.notifSectionTitle, { color: '#059669' }]}>
                      Notifikasi Terakhir Diterima ({lastNotification.timestamp})
                    </Text>
                  </View>
                  <Text style={styles.lastNotifTitle}>{lastNotification.title}</Text>
                  <Text style={styles.lastNotifBody}>{lastNotification.body}</Text>
                  <Text style={styles.lastNotifData}>
                    Payload: {JSON.stringify(lastNotification.data)}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#0F172A' : '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  responsiveWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.35,
          shadowRadius: 25,
        }
      : {}),
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  screenContainer: {
    flex: 1,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginTop: 3,
  },
  tabLabelActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  shiftTabIconWrapper: {
    position: 'relative',
  },
  activeShiftDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.success,
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...THEME.shadows.lg,
  },
  profileModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  profileModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  profileModalSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  profileEmpList: {
    gap: 10,
  },
  profileEmpOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  profileEmpOptionSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  profileEmpAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileEmpName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  profileEmpNameSelected: {
    color: THEME.colors.primaryDark,
  },
  profileEmpRole: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  sessionBadgeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sessionBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sessionBadgeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.success,
  },
  sessionBadgeUser: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  sessionBadgeRole: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  modalLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.dangerLight,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 8,
  },
  modalLogoutText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.danger,
  },
  // Current Active Account in Profile Modal
  currentAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryLight,
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 12,
  },
  currentAccountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentAccountName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
  },
  currentAccountRole: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  activePillBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  historyListSection: {
    marginBottom: 10,
  },
  historySectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 2,
  },
  historySectionSubtitle: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 10,
    lineHeight: 14,
  },
  activeCheckBadge: {
    marginLeft: 6,
  },
  switchKeyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  switchKeyText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  // Password Verification Modal
  passwordModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  passwordModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    ...THEME.shadows.lg,
  },
  passwordModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  passwordLockIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  passwordModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  passwordModalSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  passwordErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  passwordErrorText: {
    fontSize: 11,
    color: THEME.colors.danger,
    fontWeight: '700',
    flex: 1,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    marginBottom: 18,
    gap: 10,
  },
  passwordInput: {
    flex: 1,
    height: 44,
    fontSize: 13,
    color: THEME.colors.text,
  },
  passwordModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  passwordCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  passwordSubmitBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.sm,
  },
  passwordSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Notification Modal Styles (Task 01, 02, 03)
  notifModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  notifModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    ...THEME.shadows.lg,
  },
  notifModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  notifHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  notifModalSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  notifCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifSectionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  notifSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  tokenStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusIndicatorDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: '#10B981',
  },
  dotInactive: {
    backgroundColor: '#F59E0B',
  },
  tokenStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textDark,
  },
  tokenCodeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tokenCodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 2,
  },
  tokenCodeValue: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: THEME.colors.textDark,
  },
  notifTestInstructions: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 10,
    lineHeight: 16,
  },
  notifActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  notifBtnIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textDark,
  },
  notifBtnDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  lastNotifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textDark,
    marginBottom: 2,
  },
  lastNotifBody: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  lastNotifData: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: 6,
    borderRadius: 6,
  },
});
