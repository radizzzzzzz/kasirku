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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from './src/constants/theme';
import { StorageService } from './src/services/storage';

// Screens
import KasirScreen from './src/screens/KasirScreen';
import MenuScreen from './src/screens/MenuScreen';
import ShiftScreen from './src/screens/ShiftScreen';
import PresensiScreen from './src/screens/PresensiScreen';
import RiwayatScreen from './src/screens/RiwayatScreen';

// Components
import Header from './src/components/Header';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Initial load
  useEffect(() => {
    async function loadData() {
      try {
        await StorageService.init();

        const [prods, emps, activeEmp, shift, shiftHist, attend, txs, store] =
          await Promise.all([
            StorageService.getProducts(),
            StorageService.getEmployees(),
            StorageService.getActiveEmployee(),
            StorageService.getActiveShift(),
            StorageService.getShiftHistory(),
            StorageService.getAttendance(),
            StorageService.getTransactions(),
            StorageService.getStoreInfo(),
          ]);

        setProducts(prods || []);
        setEmployees(emps || []);
        setActiveEmployee(activeEmp || null);
        setActiveShift(shift || null);
        setShiftHistory(shiftHist || []);
        setAttendanceList(attend || []);
        setTransactions(txs || []);
        setStoreInfo(store || null);
      } catch (err) {
        console.error('Error loading app data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSelectEmployee = async (emp) => {
    setActiveEmployee(emp);
    await StorageService.setActiveEmployee(emp);
    setIsProfileModalOpen(false);
  };

  const handleTransactionComplete = async (newTx) => {
    setTransactions((prev) => [newTx, ...prev]);
    // Refresh shift stats
    const currentShift = await StorageService.getActiveShift();
    setActiveShift(currentShift);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Memuat KasirKu...</Text>
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Universal Header */}
      <Header
        title={getScreenTitle()}
        activeEmployee={activeEmployee}
        activeShift={activeShift}
        onPressProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Screen Views */}
      <View style={styles.screenContainer}>
        {activeTab === 'KASIR' && (
          <KasirScreen
            products={products}
            onUpdateProducts={setProducts}
            activeEmployee={activeEmployee}
            activeShift={activeShift}
            storeInfo={storeInfo}
            onTransactionComplete={handleTransactionComplete}
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
          />
        )}

        {activeTab === 'PRESENSI' && (
          <PresensiScreen
            activeEmployee={activeEmployee}
            employees={employees}
            onSelectEmployee={handleSelectEmployee}
            attendanceList={attendanceList}
            onUpdateAttendance={setAttendanceList}
          />
        )}

        {activeTab === 'RIWAYAT' && (
          <RiwayatScreen
            transactions={transactions}
            storeInfo={storeInfo}
          />
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

      {/* Profile Switcher Modal */}
      <Modal visible={isProfileModalOpen} transparent animationType="fade">
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalCard}>
            <View style={styles.profileModalHeader}>
              <View>
                <Text style={styles.profileModalTitle}>Ganti Akun Kasir</Text>
                <Text style={styles.profileModalSubtitle}>Pilih pekerja yang bertugas di kasir saat ini</Text>
              </View>
              <TouchableOpacity onPress={() => setIsProfileModalOpen(false)}>
                <Ionicons name="close" size={24} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileEmpList}>
              {employees.map((emp) => {
                const isSelected = activeEmployee?.id === emp.id;
                return (
                  <TouchableOpacity
                    key={emp.id}
                    style={[styles.profileEmpOption, isSelected && styles.profileEmpOptionSelected]}
                    onPress={() => handleSelectEmployee(emp)}
                  >
                    <View style={styles.profileEmpAvatar}>
                      <Ionicons
                        name="person"
                        size={20}
                        color={isSelected ? '#FFFFFF' : THEME.colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.profileEmpName,
                          isSelected && styles.profileEmpNameSelected,
                        ]}
                      >
                        {emp.name}
                      </Text>
                      <Text style={styles.profileEmpRole}>{emp.role} • {emp.phone}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={THEME.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingBottom: 10,
    elevation: 10,
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
});
