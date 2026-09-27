import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { StorageService } from '../services/storage';

export default function ShiftScreen({
  activeShift,
  onUpdateActiveShift,
  activeEmployee,
  shiftHistory,
  onUpdateShiftHistory,
}) {
  const [isEndShiftModalOpen, setIsEndShiftModalOpen] = useState(false);
  const [isStartShiftModalOpen, setIsStartShiftModalOpen] = useState(false);

  // End Shift inputs
  const [actualCash, setActualCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Start Shift inputs
  const [selectedShiftName, setSelectedShiftName] = useState('Shift Pagi (07:00 - 15:00)');
  const [newOpeningCash, setNewOpeningCash] = useState('100000');

  // Calculations for current active shift
  const openingCash = activeShift ? Number(activeShift.openingCash) || 0 : 0;
  const cashSales = activeShift ? Number(activeShift.totalCashSales) || 0 : 0;
  const qrisSales = activeShift ? Number(activeShift.totalQrisSales) || 0 : 0;
  const totalShiftSales = cashSales + qrisSales;
  const expectedDrawerCash = openingCash + cashSales;

  const actualCashNumber = parseInt(actualCash.replace(/[^0-9]/g, ''), 10) || 0;
  const cashDifference = actualCashNumber - expectedDrawerCash;

  // Tutup Shift
  const handleConfirmEndShift = async () => {
    if (!actualCash) {
      Alert.alert('Perhatian', 'Masukkan jumlah uang fisik di laci kasir.');
      return;
    }

    const now = new Date();
    const closedRecord = {
      id: activeShift.id,
      shiftName: activeShift.shiftName,
      employeeName: activeShift.employeeName,
      startDate: activeShift.startDate,
      startTime: activeShift.startTime,
      endDate: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      endTime: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      openingCash: openingCash,
      totalCashSales: cashSales,
      totalQrisSales: qrisSales,
      grandTotalSales: totalShiftSales,
      transactionCount: activeShift.transactionCount || 0,
      expectedCash: expectedDrawerCash,
      actualCash: actualCashNumber,
      cashDifference: cashDifference,
      notes: closingNotes.trim(),
    };

    const newHistory = await StorageService.addShiftHistory(closedRecord);
    onUpdateShiftHistory(newHistory);

    // Reset active shift
    await StorageService.setActiveShift(null);
    onUpdateActiveShift(null);

    setIsEndShiftModalOpen(false);
    setActualCash('');
    setClosingNotes('');

    Alert.alert(
      'Shift Ditutup',
      `Rekap shift berhasil disimpan!\nSelisih Kas: ${StorageService.formatIDR(cashDifference)}`
    );
  };

  // Buka Shift Baru
  const handleConfirmStartShift = async () => {
    const openingNum = parseInt(newOpeningCash.replace(/[^0-9]/g, ''), 10) || 0;
    const now = new Date();

    const newShift = {
      id: 'SHIFT-' + Date.now(),
      shiftName: selectedShiftName,
      employeeName: activeEmployee ? activeEmployee.name : 'Kasir',
      employeeId: activeEmployee ? activeEmployee.id : 'EMP-01',
      startTime: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      startDate: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      openingCash: openingNum,
      status: 'ACTIVE',
      totalCashSales: 0,
      totalQrisSales: 0,
      transactionCount: 0,
    };

    await StorageService.setActiveShift(newShift);
    onUpdateActiveShift(newShift);
    setIsStartShiftModalOpen(false);

    Alert.alert('Shift Dimulai', `${newShift.shiftName} telah aktif.`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Current Shift Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>STATUS SHIFT SAAT INI</Text>
        <View
          style={[
            styles.statusPill,
            activeShift ? styles.statusPillActive : styles.statusPillInactive,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              activeShift ? styles.statusDotActive : styles.statusDotInactive,
            ]}
          />
          <Text
            style={[
              styles.statusPillText,
              activeShift ? styles.statusPillTextActive : styles.statusPillTextInactive,
            ]}
          >
            {activeShift ? 'Sedang Berjalan' : 'Belum Dimulai'}
          </Text>
        </View>
      </View>

      {activeShift ? (
        <View style={styles.shiftCard}>
          <View style={styles.shiftCardHeader}>
            <View>
              <Text style={styles.shiftNameTitle}>{activeShift.shiftName}</Text>
              <Text style={styles.shiftMetaText}>
                Dimulai: {activeShift.startDate} pukul {activeShift.startTime}
              </Text>
            </View>
            <View style={styles.cashierBadge}>
              <Ionicons name="person" size={12} color={THEME.colors.primary} />
              <Text style={styles.cashierBadgeText}>{activeShift.employeeName}</Text>
            </View>
          </View>

          {/* Drawer Cash Expected */}
          <View style={styles.expectedCashBox}>
            <Text style={styles.expectedCashLabel}>Uang Seharusnya di Laci (Modal + Tunai)</Text>
            <Text style={styles.expectedCashValue}>
              {StorageService.formatIDR(expectedDrawerCash)}
            </Text>
          </View>

          {/* Breakdown Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Modal Awal</Text>
              <Text style={styles.statVal}>{StorageService.formatIDR(openingCash)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Penjualan Tunai</Text>
              <Text style={[styles.statVal, { color: THEME.colors.success }]}>
                {StorageService.formatIDR(cashSales)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Penjualan QRIS</Text>
              <Text style={[styles.statVal, { color: THEME.colors.primary }]}>
                {StorageService.formatIDR(qrisSales)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Transaksi</Text>
              <Text style={styles.statVal}>{activeShift.transactionCount || 0} order</Text>
            </View>
          </View>

          {/* End Shift Button */}
          <TouchableOpacity
            style={styles.endShiftButton}
            onPress={() => setIsEndShiftModalOpen(true)}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.endShiftButtonText}>Tutup Shift & Rekap Kasir</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noShiftCard}>
          <Ionicons name="time-outline" size={48} color={THEME.colors.textLight} />
          <Text style={styles.noShiftTitle}>Tidak Ada Shift Aktif</Text>
          <Text style={styles.noShiftSubtitle}>
            Buka shift baru untuk mulai melayani transaksi kasir dan mencatat modal awal laci.
          </Text>
          <TouchableOpacity
            style={styles.startShiftBtn}
            onPress={() => setIsStartShiftModalOpen(true)}
          >
            <Ionicons name="play" size={18} color="#FFFFFF" />
            <Text style={styles.startShiftBtnText}>Buka Shift Baru</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Shift History Section */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>
          Riwayat Serah Terima Shift ({shiftHistory.length})
        </Text>

        {shiftHistory.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyHistoryText}>Belum ada riwayat shift yang ditutup.</Text>
          </View>
        ) : (
          shiftHistory.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.histShiftName}>{item.shiftName}</Text>
                  <Text style={styles.histDate}>
                    {item.startDate} ({item.startTime} - {item.endTime})
                  </Text>
                </View>
                <View style={styles.histUserPill}>
                  <Text style={styles.histUserText}>{item.employeeName}</Text>
                </View>
              </View>

              <View style={styles.histDivider} />

              <View style={styles.histRow}>
                <Text style={styles.histLabel}>Total Penjualan</Text>
                <Text style={styles.histValue}>
                  {StorageService.formatIDR(item.grandTotalSales)}
                </Text>
              </View>
              <View style={styles.histRow}>
                <Text style={styles.histLabel}>Uang Fisik Aktual</Text>
                <Text style={styles.histValue}>{StorageService.formatIDR(item.actualCash)}</Text>
              </View>
              <View style={styles.histRow}>
                <Text style={styles.histLabel}>Kesesuaian / Selisih</Text>
                <Text
                  style={[
                    styles.histValue,
                    {
                      color:
                        item.cashDifference === 0
                          ? THEME.colors.success
                          : item.cashDifference > 0
                          ? THEME.colors.primary
                          : THEME.colors.danger,
                    },
                  ]}
                >
                  {item.cashDifference === 0
                    ? 'Sesuai (Rp 0)'
                    : `${item.cashDifference > 0 ? '+' : ''}${StorageService.formatIDR(
                        item.cashDifference
                      )}`}
                </Text>
              </View>
              {item.notes ? (
                <Text style={styles.histNotes}>Catatan: "{item.notes}"</Text>
              ) : null}
            </View>
          ))
        )}
      </View>

      {/* MODAL END SHIFT / TUTUP SHIFT */}
      <Modal visible={isEndShiftModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Tutup Shift & Rekap Kas</Text>
                <Text style={styles.modalSubtitle}>Kesesuaian Uang Fisik vs Sistem</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEndShiftModalOpen(false)}>
                <Ionicons name="close" size={24} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {/* Expected Box */}
              <View style={styles.reconcileBox}>
                <View style={styles.reconcileRow}>
                  <Text style={styles.reconcileLabel}>Modal Awal Laci</Text>
                  <Text style={styles.reconcileVal}>{StorageService.formatIDR(openingCash)}</Text>
                </View>
                <View style={styles.reconcileRow}>
                  <Text style={styles.reconcileLabel}>Total Penjualan Tunai</Text>
                  <Text style={[styles.reconcileVal, { color: THEME.colors.success }]}>
                    +{StorageService.formatIDR(cashSales)}
                  </Text>
                </View>
                <View style={[styles.reconcileRow, styles.reconcileTotalRow]}>
                  <Text style={styles.reconcileTotalLabel}>Uang Seharusnya di Laci</Text>
                  <Text style={styles.reconcileTotalVal}>
                    {StorageService.formatIDR(expectedDrawerCash)}
                  </Text>
                </View>
              </View>

              {/* Input Actual Cash */}
              <Text style={styles.inputLabel}>Hitung Uang Fisik di Laci Kasir (Rp) *</Text>
              <View style={styles.cashInputContainer}>
                <Text style={styles.rpText}>Rp</Text>
                <TextInput
                  style={styles.cashInputLarge}
                  keyboardType="numeric"
                  placeholder="0"
                  value={actualCash ? parseInt(actualCash, 10).toLocaleString('id-ID') : ''}
                  onChangeText={(txt) => setActualCash(txt.replace(/[^0-9]/g, ''))}
                />
              </View>

              {/* Quick Preset: Uang Pas */}
              <TouchableOpacity
                style={styles.presetMatchBtn}
                onPress={() => setActualCash(expectedDrawerCash.toString())}
              >
                <Ionicons name="checkmark-done" size={16} color={THEME.colors.primary} />
                <Text style={styles.presetMatchText}>
                  Uang Fisik Sesuai ({StorageService.formatIDR(expectedDrawerCash)})
                </Text>
              </TouchableOpacity>

              {/* Discrepancy Indicator */}
              {actualCash.length > 0 && (
                <View
                  style={[
                    styles.diffBox,
                    cashDifference === 0
                      ? styles.diffBoxMatch
                      : cashDifference > 0
                      ? styles.diffBoxOver
                      : styles.diffBoxShort,
                  ]}
                >
                  <Ionicons
                    name={
                      cashDifference === 0
                        ? 'checkmark-circle'
                        : cashDifference > 0
                        ? 'trending-up'
                        : 'alert-circle'
                    }
                    size={22}
                    color={
                      cashDifference === 0
                        ? THEME.colors.success
                        : cashDifference > 0
                        ? THEME.colors.primary
                        : THEME.colors.danger
                    }
                  />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.diffLabel}>
                      {cashDifference === 0
                        ? 'KAS SESUAI TEPAT'
                        : cashDifference > 0
                        ? 'KELEBIHAN KAS FISIK'
                        : 'SELISIH / KEKURANGAN KAS'}
                    </Text>
                    <Text
                      style={[
                        styles.diffValue,
                        {
                          color:
                            cashDifference === 0
                              ? THEME.colors.success
                              : cashDifference > 0
                              ? THEME.colors.primary
                              : THEME.colors.danger,
                        },
                      ]}
                    >
                      {cashDifference === 0
                        ? 'Tidak ada selisih'
                        : `${cashDifference > 0 ? '+' : ''}${StorageService.formatIDR(
                            cashDifference
                          )}`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Notes */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                Catatan Serah Terima / Shift
              </Text>
              <TextInput
                style={styles.notesInputArea}
                placeholder="Catatan untuk shift berikutnya atau alasan selisih..."
                multiline
                numberOfLines={3}
                value={closingNotes}
                onChangeText={setClosingNotes}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEndShiftModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmEndBtn}
                onPress={handleConfirmEndShift}
              >
                <Text style={styles.confirmEndBtnText}>Selesaikan Tutup Shift</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL START SHIFT / BUKA SHIFT BARU */}
      <Modal visible={isStartShiftModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Buka Shift Baru</Text>
                <Text style={styles.modalSubtitle}>Pilih shift & tentukan modal awal</Text>
              </View>
              <TouchableOpacity onPress={() => setIsStartShiftModalOpen(false)}>
                <Ionicons name="close" size={24} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formScroll}>
              <Text style={styles.inputLabel}>Pilih Shift</Text>
              {[
                'Shift Pagi (07:00 - 15:00)',
                'Shift Siang (12:00 - 20:00)',
                'Shift Malam (15:00 - 23:00)',
              ].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.shiftOption,
                    selectedShiftName === s && styles.shiftOptionActive,
                  ]}
                  onPress={() => setSelectedShiftName(s)}
                >
                  <Ionicons
                    name={selectedShiftName === s ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedShiftName === s ? THEME.colors.primary : THEME.colors.textLight}
                  />
                  <Text
                    style={[
                      styles.shiftOptionText,
                      selectedShiftName === s && styles.shiftOptionTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                Modal Awal di Laci Kasir (Opening Cash)
              </Text>
              <View style={styles.cashInputContainer}>
                <Text style={styles.rpText}>Rp</Text>
                <TextInput
                  style={styles.cashInputLarge}
                  keyboardType="numeric"
                  value={newOpeningCash ? parseInt(newOpeningCash, 10).toLocaleString('id-ID') : ''}
                  onChangeText={(txt) => setNewOpeningCash(txt.replace(/[^0-9]/g, ''))}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsStartShiftModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.startConfirmBtn}
                onPress={handleConfirmStartShift}
              >
                <Text style={styles.startConfirmBtnText}>Mulai Shift Sekarang</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  statusPillActive: {
    backgroundColor: THEME.colors.successLight,
  },
  statusPillInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: THEME.colors.success,
  },
  statusDotInactive: {
    backgroundColor: THEME.colors.textLight,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillTextActive: {
    color: THEME.colors.success,
  },
  statusPillTextInactive: {
    color: THEME.colors.textMuted,
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 20,
    ...THEME.shadows.md,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  shiftNameTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  shiftMetaText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  cashierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  cashierBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  expectedCashBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    alignItems: 'center',
  },
  expectedCashLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  expectedCashValue: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
    marginTop: 2,
  },
  endShiftButton: {
    backgroundColor: THEME.colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  endShiftButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  noShiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 20,
    ...THEME.shadows.sm,
  },
  noShiftTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
    marginTop: 10,
  },
  noShiftSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 16,
  },
  startShiftBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  startShiftBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  historySection: {
    paddingBottom: 40,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 10,
  },
  emptyHistory: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: THEME.colors.textLight,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  histShiftName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  histDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  histUserPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  histUserText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  histDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginVertical: 8,
  },
  histRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  histLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  histValue: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  histNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    color: THEME.colors.warning,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  modalSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  formScroll: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  reconcileBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  reconcileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reconcileLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  reconcileVal: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  reconcileTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 6,
    marginTop: 4,
  },
  reconcileTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  reconcileTotalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  cashInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 8,
  },
  rpText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginRight: 6,
  },
  cashInputLarge: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  presetMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 4,
  },
  presetMatchText: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  diffBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  diffBoxMatch: {
    backgroundColor: THEME.colors.successLight,
    borderColor: '#A7F3D0',
  },
  diffBoxOver: {
    backgroundColor: THEME.colors.primaryLight,
    borderColor: '#BFDBFE',
  },
  diffBoxShort: {
    backgroundColor: THEME.colors.dangerLight,
    borderColor: '#FECACA',
  },
  diffLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  diffValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  notesInputArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: THEME.colors.text,
    height: 60,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  confirmEndBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: THEME.colors.danger,
    alignItems: 'center',
  },
  confirmEndBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shiftOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 10,
  },
  shiftOptionActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  shiftOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  shiftOptionTextActive: {
    color: THEME.colors.primaryDark,
    fontWeight: '700',
  },
  startConfirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
  },
  startConfirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
