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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from './src/constants/theme';
import { StorageService } from './src/services/storage';
import { AuthService } from './src/services/secureStorage';
import { ApiClient, ApiEventLogs } from './src/services/api';
import { networkService } from './src/services/network';
import { showAlert } from './src/utils/alert';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import KasirScreen from './src/screens/KasirScreen';
import MenuScreen from './src/screens/MenuScreen';
import ShiftScreen from './src/screens/ShiftScreen';
import PresensiScreen from './src/screens/PresensiScreen';
import RiwayatScreen from './src/screens/RiwayatScreen';

// Components
import Header from './src/components/Header';
import ApiStateView from './src/components/ApiStateView';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [authSession, setAuthSession] = useState(null);
  const [activeTab, setActiveTab] = useState('KASIR'); // KASIR | MENU | SHIFT | PRESENSI | RIWAYAT

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
});
