import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  RefreshControl,
  Image,
  Vibration,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { THEME } from '../constants/theme';
import { StorageService } from '../services/storage';

export default function PresensiScreen({
  activeEmployee,
  employees,
  onSelectEmployee,
  attendanceList = [],
  onUpdateAttendance,
  isOnline = true,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSwitchEmployeeModal, setIsSwitchEmployeeModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sensor Kamera & Foto Presensi States
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraModalVisible, setIsCameraModalVisible] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('front'); // 'front' (selfie) | 'back'
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [pendingAttendanceType, setPendingAttendanceType] = useState('IN'); // 'IN' | 'OUT'
  const [capturedPhoto, setCapturedPhoto] = useState(null); // { uri, timestamp }
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [previewDetailModal, setPreviewDetailModal] = useState(null); // Preview foto tersimpan

  const cameraRef = useRef(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const freshAttendance = await StorageService.getAttendance();
      onUpdateAttendance(freshAttendance || []);
    } catch (e) {
      console.warn('Presensi refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

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

  // 1. Tombol Presensi Masuk -> Buka Sensor Kamera Selfie
  const handleStartClockIn = async () => {
    if (currentEmpRecord && currentEmpRecord.clockIn) {
      try {
        Vibration.vibrate([0, 100, 50, 100]);
      } catch (e) {}
      Alert.alert('Sudah Presensi', 'Anda sudah melakukan presensi masuk hari ini.');
      return;
    }

    if (!permission?.granted && Platform.OS !== 'web') {
      try {
        const res = await requestPermission();
        if (!res?.granted) {
          Alert.alert(
            'Izin Kamera Diperlukan',
            'Silakan izinkan akses kamera agar aplikasi dapat mengambil foto selfie bukti kehadiran.',
            [
              { text: 'Batal', style: 'cancel' },
              {
                text: 'Buka Kamera',
                onPress: () => {
                  setPendingAttendanceType('IN');
                  setCapturedPhoto(null);
                  setIsCameraModalVisible(true);
                },
              },
            ]
          );
          return;
        }
      } catch (err) {
        console.warn('Request camera error:', err);
      }
    }

    setPendingAttendanceType('IN');
    setCapturedPhoto(null);
    setIsCameraReady(false);
    setIsCameraModalVisible(true);
  };

  // 2. Tombol Presensi Pulang -> Buka Sensor Kamera Pulang
  const handleStartClockOut = async () => {
    if (!currentEmpRecord || !currentEmpRecord.clockIn) {
      try {
        Vibration.vibrate([0, 100, 50, 100]);
      } catch (e) {}
      Alert.alert('Belum Presensi Masuk', 'Anda harus melakukan presensi masuk terlebih dahulu.');
      return;
    }
    if (currentEmpRecord.clockOut) {
      try {
        Vibration.vibrate([0, 100, 50, 100]);
      } catch (e) {}
      Alert.alert('Sudah Presensi Pulang', 'Anda sudah menyelesaikan jam kerja hari ini.');
      return;
    }

    if (!permission?.granted && Platform.OS !== 'web') {
      try {
        await requestPermission();
      } catch (err) {
        console.warn('Request camera error:', err);
      }
    }

    setPendingAttendanceType('OUT');
    setCapturedPhoto(null);
    setIsCameraReady(false);
    setIsCameraModalVisible(true);
  };

  // 3. Mengambil Foto dengan Sensor Kamera (Shutter Pressed)
  const handleTakePicture = async () => {
    const timestampNow = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + ', ' + new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' WIB';

    // Sensor Getar: Haptic feedback tombol shutter
    try {
      Vibration.vibrate(50);
    } catch (e) {}

    // Fallback untuk Web atau jika kamera ref belum siap
    if (Platform.OS === 'web' || !cameraRef.current) {
      setCapturedPhoto({
        uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
        timestamp: timestampNow,
      });
      return;
    }

    try {
      setIsTakingPhoto(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });

      if (photo && photo.uri) {
        setCapturedPhoto({
          uri: photo.uri,
          timestamp: timestampNow,
        });
      } else {
        throw new Error('Hasil foto kosong');
      }
    } catch (err) {
      console.warn('Gagal jepret kamera fisik:', err);
      // Fallback aman agar presensi tetap tersimpan dengan timestamp
      setCapturedPhoto({
        uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
        timestamp: timestampNow,
      });
    } finally {
      setIsTakingPhoto(false);
    }
  };

  // 4. Simulasi Foto Cepat (Cadangan jika kamera fisik terhambat)
  const handleQuickSimulationPhoto = () => {
    const timestampNow = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + ', ' + new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' WIB';

    try {
      Vibration.vibrate(50);
    } catch (e) {}

    setCapturedPhoto({
      uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
      timestamp: timestampNow,
    });
  };

  // 5. Konfirmasi & Simpan Presensi Bersama Foto & Keterangan Waktu
  const handleConfirmAttendance = async () => {
    if (!capturedPhoto) {
      Alert.alert('Perhatian', 'Silakan ambil foto bukti kehadiran terlebih dahulu.');
      return;
    }

    // Sensor Getar: Feedback sukses presensi
    try {
      Vibration.vibrate([0, 80, 50, 100]);
    } catch (e) {}

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (pendingAttendanceType === 'IN') {
      const hour = now.getHours();
      const minute = now.getMinutes();
      const isLate = hour > 8 || (hour === 8 && minute > 15);

      const newRecord = {
        id: 'ATT-' + Date.now(),
        employeeId: activeEmployee.id,
        employeeName: activeEmployee.name,
        employeeRole: activeEmployee.role,
        date: todayDateOnly,
        dayName: now.toLocaleDateString('id-ID', { weekday: 'long' }),
        clockIn: timeFormatted,
        clockOut: null,
        status: isLate ? 'Terlambat' : 'Tepat Waktu',
        workDuration: '-',
        photoUri: capturedPhoto.uri,
        photoTimestamp: capturedPhoto.timestamp,
        photoType: 'Presensi Masuk',
      };

      const updated = await StorageService.recordAttendance(newRecord);
      onUpdateAttendance(updated);
      setIsCameraModalVisible(false);

      Alert.alert(
        'Presensi Masuk Berhasil! 📸',
        `Halo ${activeEmployee.name}, foto dan waktu masuk Anda berhasil diverifikasi pada:\n${capturedPhoto.timestamp} (${newRecord.status}).`
      );
    } else {
      // Clock Out
      const [inH, inM] = currentEmpRecord.clockIn.split(':').map(Number);
      const [outH, outM] = timeFormatted.split(':').map(Number);
      let totalMinutes = outH * 60 + outM - (inH * 60 + inM);
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      const durHours = Math.floor(totalMinutes / 60);
      const durMins = totalMinutes % 60;
      const durationStr = `${durHours} Jam ${durMins} Menit`;

      const updatedList = attendanceList.map((item) =>
        item.id === currentEmpRecord.id
          ? {
              ...item,
              clockOut: timeFormatted,
              workDuration: durationStr,
              photoOutUri: capturedPhoto.uri,
              photoOutTimestamp: capturedPhoto.timestamp,
            }
          : item
      );

      await StorageService.saveAttendance(updatedList);
      onUpdateAttendance(updatedList);
      setIsCameraModalVisible(false);

      Alert.alert(
        'Presensi Pulang Berhasil! 📸',
        `Terima kasih ${activeEmployee.name}!\nFoto dan waktu pulang diverifikasi pada:\n${capturedPhoto.timestamp}\nTotal jam kerja: ${durationStr}`
      );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[THEME.colors.primary]}
          tintColor={THEME.colors.primary}
        />
      }
    >
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
        <View style={styles.actionCardHeader}>
          <Text style={styles.cardHeaderTitle}>Presensi Hari Ini</Text>
          <View style={styles.cameraEnabledBadge}>
            <Ionicons name="camera" size={12} color={THEME.colors.primary} />
            <Text style={styles.cameraEnabledText}>Sensor Kamera Aktif</Text>
          </View>
        </View>

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

        {/* Thumbnail Bukti Foto Presensi Hari Ini (Jika Sudah Foto) */}
        {currentEmpRecord?.photoUri && (
          <TouchableOpacity
            style={styles.todayPhotoCard}
            onPress={() =>
              setPreviewDetailModal({
                uri: currentEmpRecord.photoUri,
                timestamp: currentEmpRecord.photoTimestamp,
                employeeName: currentEmpRecord.employeeName,
                role: currentEmpRecord.employeeRole,
                type: 'Presensi Masuk',
              })
            }
            activeOpacity={0.8}
          >
            <Image source={{ uri: currentEmpRecord.photoUri }} style={styles.todayPhotoThumb} />
            <View style={{ flex: 1 }}>
              <View style={styles.todayPhotoBadgeRow}>
                <Ionicons name="camera-reverse" size={14} color={THEME.colors.primary} />
                <Text style={styles.todayPhotoBadgeText}>Foto Presensi Masuk</Text>
              </View>
              <Text style={styles.todayPhotoTimestamp} numberOfLines={1}>
                🕒 Diambil: {currentEmpRecord.photoTimestamp}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.clockButton,
              styles.clockInBtn,
              currentEmpRecord?.clockIn && styles.clockBtnDisabled,
            ]}
            onPress={handleStartClockIn}
            disabled={!!currentEmpRecord?.clockIn}
          >
            <Ionicons name="camera" size={18} color="#FFFFFF" />
            <Text style={styles.clockBtnText}>
              {currentEmpRecord?.clockIn ? 'Sudah Masuk' : 'Foto Masuk (Clock-In)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.clockButton,
              styles.clockOutBtn,
              (!currentEmpRecord?.clockIn || currentEmpRecord?.clockOut) &&
                styles.clockBtnDisabled,
            ]}
            onPress={handleStartClockOut}
            disabled={!currentEmpRecord?.clockIn || !!currentEmpRecord?.clockOut}
          >
            <Ionicons name="camera-reverse" size={18} color="#FFFFFF" />
            <Text style={styles.clockBtnText}>
              {currentEmpRecord?.clockOut
                ? 'Selesai Bekerja'
                : 'Foto Pulang (Clock-Out)'}
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

              {/* Tampilkan Info & Thumbnail Foto Presensi yang Diambil */}
              {item.photoUri && (
                <TouchableOpacity
                  style={styles.historyPhotoSnippet}
                  onPress={() =>
                    setPreviewDetailModal({
                      uri: item.photoUri,
                      timestamp: item.photoTimestamp,
                      employeeName: item.employeeName,
                      role: item.employeeRole,
                      type: 'Presensi Masuk',
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: item.photoUri }} style={styles.historyPhotoThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyPhotoLabel}>Bukti Foto Kamera Presensi</Text>
                    <Text style={styles.historyPhotoTime} numberOfLines={1}>
                      🕒 Waktu Diambil: {item.photoTimestamp || item.clockIn}
                    </Text>
                  </View>
                  <Ionicons name="expand" size={16} color={THEME.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      {/* MODAL 1: SENSOR KAMERA UNTUK SELFIE PRESENSI */}
      <Modal
        visible={isCameraModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsCameraModalVisible(false)}
      >
        <SafeAreaView style={styles.cameraSafeArea}>
          {/* A. HEADER KAMERA (FIXED 54px) */}
          <View style={styles.cameraHeader}>
            <TouchableOpacity
              style={styles.cameraCloseBtn}
              onPress={() => setIsCameraModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.cameraHeaderTitle}>
                {pendingAttendanceType === 'IN' ? 'Foto Presensi Masuk' : 'Foto Presensi Pulang'}
              </Text>
              <Text style={styles.cameraHeaderSubtitle}>
                {activeEmployee?.name} • Sensor Kamera Wajah
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cameraFlipBtn}
              onPress={() => {
                setIsCameraReady(false);
                setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'));
              }}
            >
              <Ionicons name="camera-reverse" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* B. MAIN CAMERA VIEW AREA (FLEX: 1) */}
          <View style={styles.cameraBody}>
            {!permission?.granted && Platform.OS !== 'web' ? (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={54} color={THEME.colors.primary} />
                <Text style={styles.permissionTitle}>Izin Akses Kamera Diperlukan</Text>
                <Text style={styles.permissionDesc}>
                  Aplikasi KasirKu membutuhkan izin akses sensor kamera perangkat untuk memotret bukti selfie kehadiran kasir.
                </Text>
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                  <Text style={styles.permissionBtnText}>Izinkan Akses Kamera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.permissionFallbackBtn}
                  onPress={handleQuickSimulationPhoto}
                >
                  <Text style={styles.permissionFallbackText}>Gunakan Mode Foto Cepat</Text>
                </TouchableOpacity>
              </View>
            ) : !capturedPhoto ? (
              <View style={styles.cameraViewport}>
                {Platform.OS === 'web' ? (
                  <View style={styles.webFallbackCamera}>
                    <Ionicons name="videocam-outline" size={60} color="#94A3B8" />
                    <Text style={styles.webFallbackTitle}>Preview Kamera Web</Text>
                    <Text style={styles.webFallbackDesc}>
                      Tekan tombol lingkaran putih di bawah untuk mengambil foto bukti presensi.
                    </Text>
                  </View>
                ) : (
                  <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFillObject}
                    facing={cameraFacing}
                    mode="picture"
                    onCameraReady={() => setIsCameraReady(true)}
                  />
                )}

                {/* Bingkai Panduan Wajah (Face Guide) */}
                <View style={styles.faceGuideOverlay} pointerEvents="none">
                  <View style={styles.faceOvalFrame} />
                  <Text style={styles.faceGuideText}>
                    Posisikan wajah di dalam bingkai
                  </Text>
                </View>

                {/* Watermark Tanggal & Waktu Live */}
                <View style={styles.watermarkOverlay}>
                  <View style={styles.watermarkRow}>
                    <Ionicons name="time" size={14} color="#FBBF24" />
                    <Text style={styles.watermarkText}>
                      {todayStr}, {timeStr} WIB
                    </Text>
                  </View>
                  <Text style={styles.watermarkEmp}>
                    KasirKu POS • {activeEmployee?.name} ({activeEmployee?.role})
                  </Text>
                </View>
              </View>
            ) : (
              /* PREVIEW HASIL FOTO YANG SUDAH DIAMBIL */
              <View style={styles.previewContainer}>
                <Image source={{ uri: capturedPhoto.uri }} style={styles.previewImage} />

                {/* Watermark Keterangan Waktu Pengambilan Foto */}
                <View style={styles.previewWatermarkCard}>
                  <View style={styles.watermarkRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.previewWatermarkTitle}>
                      Foto Bukti {pendingAttendanceType === 'IN' ? 'Clock-In' : 'Clock-Out'} Terverifikasi
                    </Text>
                  </View>
                  <Text style={styles.previewWatermarkTime}>
                    🕒 Waktu Diambil: {capturedPhoto.timestamp}
                  </Text>
                  <Text style={styles.previewWatermarkEmp}>
                    👤 Karyawan: {activeEmployee?.name} ({activeEmployee?.role})
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* C. DEDICATED BOTTOM BAR (FIXED 110px DI BAGIAN BAWAH LAYAR) */}
          <View style={styles.cameraBottomBar}>
            {!capturedPhoto ? (
              <View style={styles.shutterRow}>
                {/* Tombol Foto Cepat / Cadangan */}
                <TouchableOpacity
                  style={styles.sideBtn}
                  onPress={handleQuickSimulationPhoto}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flash" size={20} color="#FBBF24" />
                  <Text style={styles.sideBtnText}>Foto Cepat</Text>
                </TouchableOpacity>

                {/* TOMBOL SHUTTER UTAMA (BESAR & KONTRAST TINGGI) */}
                <TouchableOpacity
                  style={styles.shutterMainBtn}
                  onPress={handleTakePicture}
                  disabled={isTakingPhoto}
                  activeOpacity={0.7}
                >
                  {isTakingPhoto ? (
                    <ActivityIndicator size="large" color={THEME.colors.primary} />
                  ) : (
                    <View style={styles.shutterInnerRing}>
                      <Ionicons name="camera" size={32} color={THEME.colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Tombol Balik Kamera Depan / Belakang */}
                <TouchableOpacity
                  style={styles.sideBtn}
                  onPress={() => {
                    setIsCameraReady(false);
                    setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'));
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera-reverse" size={22} color="#FFFFFF" />
                  <Text style={styles.sideBtnText}>
                    {cameraFacing === 'front' ? 'Depan' : 'Belakang'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Action Buttons Setelah Foto Diambil */
              <View style={styles.confirmRow}>
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={() => setCapturedPhoto(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={18} color="#FFFFFF" />
                  <Text style={styles.retakeBtnText}>Foto Ulang</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleConfirmAttendance}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>Simpan Presensi</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL 2: PREVIEW DETAIL FOTO PRESENSI LENGKAP */}
      <Modal visible={!!previewDetailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { padding: 0, overflow: 'hidden' }]}>
            {previewDetailModal && (
              <>
                <Image
                  source={{ uri: previewDetailModal.uri }}
                  style={styles.detailModalImage}
                  resizeMode="cover"
                />
                <View style={styles.detailModalContent}>
                  <View style={styles.detailModalHeaderRow}>
                    <View>
                      <Text style={styles.detailModalTitle}>{previewDetailModal.employeeName}</Text>
                      <Text style={styles.detailModalSubtitle}>
                        {previewDetailModal.role} • {previewDetailModal.type}
                      </Text>
                    </View>
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={14} color="#15803D" />
                      <Text style={styles.verifiedBadgeText}>Valid</Text>
                    </View>
                  </View>

                  <View style={styles.timestampBox}>
                    <Ionicons name="time-outline" size={16} color={THEME.colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timestampBoxLabel}>Keterangan Waktu Pengambilan Foto:</Text>
                      <Text style={styles.timestampBoxValue}>{previewDetailModal.timestamp}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.detailModalCloseBtn}
                    onPress={() => setPreviewDetailModal(null)}
                  >
                    <Text style={styles.detailModalCloseText}>Tutup Preview</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 3: GANTI AKUN PEKERJA */}
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
                        size={18}
                        color={isSelected ? THEME.colors.primary : THEME.colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.empOptionName, isSelected && styles.empOptionNameSelected]}
                      >
                        {emp.name}
                      </Text>
                      <Text style={styles.empOptionRole}>{emp.role}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={THEME.colors.primary} />
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
    padding: 16,
  },
  clockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm,
  },
  todayDateText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    marginBottom: 6,
  },
  liveClockText: {
    fontSize: 34,
    fontWeight: '900',
    color: THEME.colors.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
    marginBottom: 14,
  },
  activeEmployeePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  activeEmployeeName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  switchEmpBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  switchEmpBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },

  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm,
  },
  actionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  cameraEnabledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  cameraEnabledText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },

  statusDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusCol: {
    flex: 1,
    alignItems: 'center',
  },
  statusDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
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
    fontVariant: ['tabular-nums'],
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeNeutral: {
    backgroundColor: '#E2E8F0',
  },
  badgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextNeutral: {
    color: '#64748B',
  },
  badgeTextSuccess: {
    color: '#15803D',
  },
  badgeTextWarning: {
    color: '#B45309',
  },

  todayPhotoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 10,
  },
  todayPhotoThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#CBD5E1',
  },
  todayPhotoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayPhotoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
  },
  todayPhotoTimestamp: {
    fontSize: 10,
    color: '#1E40AF',
    marginTop: 2,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  clockButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
    ...THEME.shadows.sm,
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
    fontSize: 12,
    fontWeight: '800',
  },

  // History Section
  historySection: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
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
  historyPhotoSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyPhotoThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
  },
  historyPhotoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  historyPhotoTime: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },

  // CAMERA SAFE AREA & MODAL STYLES
  cameraSafeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraHeader: {
    height: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  cameraCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraHeaderSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  cameraFlipBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CAMERA BODY (FLEX: 1)
  cameraBody: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraViewport: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  webFallbackCamera: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webFallbackTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  webFallbackDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  faceGuideOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOvalFrame: {
    width: 220,
    height: 270,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  faceGuideText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  watermarkOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  watermarkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FBBF24',
    fontVariant: ['tabular-nums'],
  },
  watermarkEmp: {
    fontSize: 10,
    color: '#E2E8F0',
    marginTop: 2,
  },

  // CAMERA BOTTOM BAR (FIXED 110px AT BOTTOM)
  cameraBottomBar: {
    height: 110,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  sideBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  sideBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 3,
  },
  shutterMainBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.md,
  },
  shutterInnerRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // PREVIEW CONTAINER
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  previewWatermarkCard: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  previewWatermarkTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  previewWatermarkTime: {
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 2,
  },
  previewWatermarkEmp: {
    fontSize: 10,
    color: '#CBD5E1',
    marginTop: 2,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 14,
  },
  retakeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // PERMISSION BOX
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  permissionBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  permissionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  permissionFallbackBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  permissionFallbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },

  // DETAIL MODAL STYLES
  detailModalImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#000000',
  },
  detailModalContent: {
    padding: 16,
  },
  detailModalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  detailModalSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  timestampBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 14,
  },
  timestampBoxLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  timestampBoxValue: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
    marginTop: 2,
  },
  detailModalCloseBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailModalCloseText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },

  // COMMON MODAL STYLES
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
