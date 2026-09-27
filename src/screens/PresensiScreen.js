import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { StorageService } from '../services/storage';

export default function PresensiScreen({
  activeEmployee,
  employees,
  onSelectEmployee,
  attendanceList,
  onUpdateAttendance,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSwitchEmployeeModal, setIsSwitchEmployeeModal] = useState(false);

  // Live timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const timeStr = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Find today's attendance for active employee
  const todayDateOnly = currentTime.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const currentEmpRecord = attendanceList.find(
    (item) => item.employeeId === activeEmployee?.id && item.date === todayDateOnly
  );

  // Clock In Action
  const handleClockIn = async () => {
    if (currentEmpRecord && currentEmpRecord.clockIn) {
      Alert.alert('Sudah Presensi', 'Anda sudah melakukan presensi masuk hari ini.');
      return;
    }

    const now = new Date();
    const inTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Check if late (e.g. after 08:15)
    const isLate = hour > 8 || (hour === 8 && minute > 15);

    const newRecord = {
      id: 'ATT-' + Date.now(),
      employeeId: activeEmployee.id,
      employeeName: activeEmployee.name,
      employeeRole: activeEmployee.role,
      date: todayDateOnly,
      dayName: now.toLocaleDateString('id-ID', { weekday: 'long' }),
      clockIn: inTime,
      clockOut: null,
      status: isLate ? 'Terlambat' : 'Tepat Waktu',
      workDuration: '-',
    };

    const updated = await StorageService.recordAttendance(newRecord);
    onUpdateAttendance(updated);

    Alert.alert(
      'Presensi Masuk Berhasil!',
      `Halo ${activeEmployee.name}, waktu masuk Anda tercatat pukul ${inTime} (${newRecord.status}).`
    );
  };

  // Clock Out Action
  const handleClockOut = async () => {
    if (!currentEmpRecord || !currentEmpRecord.clockIn) {
      Alert.alert('Belum Presensi Masuk', 'Anda harus melakukan presensi masuk terlebih dahulu.');
      return;
    }
    if (currentEmpRecord.clockOut) {
      Alert.alert('Sudah Presensi Pulang', 'Anda sudah menyelesaikan jam kerja hari ini.');
      return;
    }

    const now = new Date();
    const outTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Calculate duration
    const [inH, inM] = currentEmpRecord.clockIn.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    let totalMinutes = outH * 60 + outM - (inH * 60 + inM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const durHours = Math.floor(totalMinutes / 60);
    const durMins = totalMinutes % 60;
    const durationStr = `${durHours} Jam ${durMins} Menit`;

    const updatedList = attendanceList.map((item) =>
      item.id === currentEmpRecord.id
        ? {
            ...item,
            clockOut: outTime,
            workDuration: durationStr,
          }
        : item
    );

    await StorageService.saveAttendance(updatedList);
    onUpdateAttendance(updatedList);

    Alert.alert(
      'Presensi Pulang Berhasil!',
      `Terima kasih atas kerja keras hari ini, ${activeEmployee.name}!\nTotal jam kerja: ${durationStr}`
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Real-time Clock Card */}
      <View style={styles.clockCard}>
        <Text style={styles.todayDateText}>{todayStr}</Text>
        <Text style={styles.liveClockText}>{timeStr}</Text>

        <View style={styles.activeEmployeePill}>
          <Ionicons name="person-circle" size={18} color={THEME.colors.primary} />
          <Text style={styles.activeEmployeeName}>{activeEmployee?.name || 'Kasir'}</Text>
          <TouchableOpacity
            style={styles.switchEmpBtn}
            onPress={() => setIsSwitchEmployeeModal(true)}
          >
            <Text style={styles.switchEmpBtnText}>Ganti</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Attendance Action Section */}
      <View style={styles.actionCard}>
        <Text style={styles.cardHeaderTitle}>Presensi Hari Ini</Text>

        <View style={styles.statusDisplayRow}>
          <View style={styles.statusCol}>
            <Text style={styles.statusColLabel}>Jam Masuk</Text>
            <Text style={styles.statusColVal}>
              {currentEmpRecord?.clockIn ? currentEmpRecord.clockIn : '--:--'}
            </Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusCol}>
            <Text style={styles.statusColLabel}>Jam Pulang</Text>
            <Text style={styles.statusColVal}>
              {currentEmpRecord?.clockOut ? currentEmpRecord.clockOut : '--:--'}
            </Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusCol}>
            <Text style={styles.statusColLabel}>Status</Text>
            <View
              style={[
                styles.badge,
                currentEmpRecord?.status === 'Terlambat'
                  ? styles.badgeWarning
                  : currentEmpRecord?.clockIn
                  ? styles.badgeSuccess
                  : styles.badgeNeutral,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  currentEmpRecord?.status === 'Terlambat'
                    ? styles.badgeTextWarning
                    : currentEmpRecord?.clockIn
                    ? styles.badgeTextSuccess
                    : styles.badgeTextNeutral,
                ]}
              >
                {currentEmpRecord ? currentEmpRecord.status : 'Belum Hadir'}
              </Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.clockButton,
              styles.clockInBtn,
              currentEmpRecord?.clockIn && styles.clockBtnDisabled,
            ]}
            onPress={handleClockIn}
            disabled={!!currentEmpRecord?.clockIn}
          >
            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
            <Text style={styles.clockBtnText}>
              {currentEmpRecord?.clockIn ? 'Sudah Masuk' : 'Presensi Masuk (Clock-In)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.clockButton,
              styles.clockOutBtn,
              (!currentEmpRecord?.clockIn || currentEmpRecord?.clockOut) &&
                styles.clockBtnDisabled,
            ]}
            onPress={handleClockOut}
            disabled={!currentEmpRecord?.clockIn || !!currentEmpRecord?.clockOut}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.clockBtnText}>
              {currentEmpRecord?.clockOut
                ? 'Selesai Bekerja'
                : 'Presensi Pulang (Clock-Out)'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Attendance History */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>
          Riwayat Kehadiran Pekerja ({attendanceList.length})
        </Text>

        {attendanceList.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color={THEME.colors.textLight} />
            <Text style={styles.emptyText}>Belum ada data presensi tercatat.</Text>
          </View>
        ) : (
          attendanceList.map((item) => (
            <View key={item.id} style={styles.historyItemCard}>
              <View style={styles.historyItemHeader}>
                <View>
                  <Text style={styles.histName}>{item.employeeName}</Text>
                  <Text style={styles.histRole}>{item.employeeRole || 'Pekerja'}</Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    item.status === 'Terlambat' ? styles.badgeWarning : styles.badgeSuccess,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      item.status === 'Terlambat'
                        ? styles.badgeTextWarning
                        : styles.badgeTextSuccess,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.historyItemDivider} />

              <View style={styles.historyItemDetails}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Tanggal</Text>
                  <Text style={styles.detailVal}>{item.date}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Masuk - Pulang</Text>
                  <Text style={styles.detailVal}>
                    {item.clockIn} - {item.clockOut || 'Aktif'}
                  </Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Durasi</Text>
                  <Text style={styles.detailVal}>{item.workDuration || '-'}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Switch Employee Modal */}
      <Modal visible={isSwitchEmployeeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Akun Pekerja</Text>
              <TouchableOpacity onPress={() => setIsSwitchEmployeeModal(false)}>
                <Ionicons name="close" size={24} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.empList}>
              {employees.map((emp) => {
                const isSelected = activeEmployee?.id === emp.id;
                return (
                  <TouchableOpacity
                    key={emp.id}
                    style={[styles.empOption, isSelected && styles.empOptionSelected]}
                    onPress={() => {
                      onSelectEmployee(emp);
                      setIsSwitchEmployeeModal(false);
                    }}
                  >
                    <View style={styles.empAvatar}>
                      <Ionicons
                        name="person"
                        size={20}
                        color={isSelected ? '#FFFFFF' : THEME.colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.empOptionName,
                          isSelected && styles.empOptionNameSelected,
                        ]}
                      >
                        {emp.name}
                      </Text>
                      <Text style={styles.empOptionRole}>{emp.role}</Text>
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
  clockCard: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    ...THEME.shadows.md,
  },
  todayDateText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  liveClockText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 2,
    marginVertical: 4,
  },
  activeEmployeePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  activeEmployeeName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  switchEmpBtn: {
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  switchEmpBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
    ...THEME.shadows.sm,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 14,
  },
  statusDisplayRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusCol: {
    alignItems: 'center',
    flex: 1,
  },
  statusColLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  statusColVal: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  statusDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#CBD5E1',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: THEME.colors.successLight,
  },
  badgeWarning: {
    backgroundColor: THEME.colors.warningLight,
  },
  badgeNeutral: {
    backgroundColor: '#E2E8F0',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextSuccess: {
    color: THEME.colors.success,
  },
  badgeTextWarning: {
    color: THEME.colors.warning,
  },
  badgeTextNeutral: {
    color: THEME.colors.textMuted,
  },
  buttonRow: {
    flexDirection: 'column',
    gap: 10,
  },
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  clockInBtn: {
    backgroundColor: THEME.colors.primary,
  },
  clockOutBtn: {
    backgroundColor: THEME.colors.secondary,
  },
  clockBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  clockBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
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
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textLight,
    marginTop: 8,
  },
  historyItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  histName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  histRole: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  historyItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginVertical: 10,
  },
  historyItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  detailVal: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    ...THEME.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  empList: {
    gap: 8,
  },
  empOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  empOptionSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  empAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  empOptionNameSelected: {
    color: THEME.colors.primaryDark,
  },
  empOptionRole: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
});
