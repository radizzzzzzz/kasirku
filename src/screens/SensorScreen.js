import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Vibration,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';
import { THEME } from '../constants/theme';

export default function SensorScreen() {
  // Sensor Data States
  const [accData, setAccData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const [magData, setMagData] = useState({ x: 0, y: 0, z: 0 });

  // Status & Permission States
  const [isActive, setIsActive] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [hasPermission, setHasPermission] = useState(true);
  const [activeTab, setActiveTab] = useState('ACCELEROMETER'); // ACCELEROMETER | GYROSCOPE | MAGNETOMETER

  // Shake Detection Feedback States
  const [shakeDetected, setShakeDetected] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [lastShakeTime, setLastShakeTime] = useState(null);

  // Threshold Configuration
  const SHAKE_THRESHOLD = 1.78; // Ambang batas gravitasi (1.0 = diam, > 1.75 = guncangan)
  const UPDATE_INTERVAL_MS = 100; // 100ms update interval sesuai Task 02

  // Refs for Subscriptions and Debouncing
  const accSubscription = useRef(null);
  const gyroSubscription = useRef(null);
  const magSubscription = useRef(null);
  const lastShakeTimestamp = useRef(0);
  const shakeBannerTimeout = useRef(null);

  // Pulse animation for shake feedback
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 1. Initial Permission & Availability Check
  useEffect(() => {
    let isMounted = true;

    async function initSensors() {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (isMounted) setIsAvailable(available);

        // Periksa / minta runtime permission jika didukung
        if (Accelerometer.requestPermissionsAsync) {
          const { status } = await Accelerometer.requestPermissionsAsync();
          if (isMounted) setHasPermission(status === 'granted');
        } else {
          if (isMounted) setHasPermission(true);
        }
      } catch (err) {
        console.warn('[Sensor] Inisialisasi sensor peringatan:', err);
        if (isMounted) setIsAvailable(false);
      }
    }

    initSensors();

    return () => {
      isMounted = false;
      unsubscribeAll();
    };
  }, []);

  // 2. Manage Subscriptions when isActive or activeTab changes
  useEffect(() => {
    if (isActive) {
      subscribeSensors();
    } else {
      unsubscribeAll();
    }

    return () => {
      unsubscribeAll();
    };
  }, [isActive, activeTab]);

  // Subscribe to sensors
  const subscribeSensors = () => {
    unsubscribeAll();

    // Pada Web / browser desktop tanpa modul native accelerometer, gunakan fallback aman
    if (Platform.OS === 'web') {
      console.log('[Sensor] Mode Web terdeteksi: Sensor fisik aktif saat dijalankan di HP (Expo Go). Gunakan tombol "Uji Getaran & Goyangan" untuk testing di browser.');
      return;
    }

    try {
      // Atur interval update 100ms (Task 02)
      Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

      accSubscription.current = Accelerometer.addListener((sensorData) => {
        setAccData(sensorData);

        const { x, y, z } = sensorData;
        // Hitung magnitudo percepatan total: |a| = sqrt(x^2 + y^2 + z^2)
        const magnitude = Math.sqrt(x * x + y * y + z * z);

        // Cetak data X, Y, Z yang sudah diformat ke console.log (Task 01 & Task 02)
        console.log(
          `[Accelerometer] X: ${x.toFixed(2)} | Y: ${y.toFixed(2)} | Z: ${z.toFixed(2)} | Mag: ${magnitude.toFixed(2)}G`
        );

        // Deteksi Guncangan (Shake Detection - Task 03)
        if (magnitude > SHAKE_THRESHOLD) {
          triggerShakeFeedback(magnitude);
        }
      });

      // Subscribe Gyroscope jika tab sedang aktif
      if (activeTab === 'GYROSCOPE') {
        Gyroscope.setUpdateInterval(UPDATE_INTERVAL_MS);
        gyroSubscription.current = Gyroscope.addListener((data) => {
          setGyroData(data);
          console.log(
            `[Gyroscope] X(Roll): ${data.x.toFixed(2)} | Y(Pitch): ${data.y.toFixed(2)} | Z(Yaw): ${data.z.toFixed(2)}`
          );
        });
      }

      // Subscribe Magnetometer jika tab sedang aktif
      if (activeTab === 'MAGNETOMETER') {
        Magnetometer.setUpdateInterval(UPDATE_INTERVAL_MS);
        magSubscription.current = Magnetometer.addListener((data) => {
          setMagData(data);
          console.log(
            `[Magnetometer] X: ${data.x.toFixed(2)} | Y: ${data.y.toFixed(2)} | Z: ${data.z.toFixed(2)}`
          );
        });
      }
    } catch (e) {
      console.warn('[Sensor] Gagal subscribe sensor:', e);
    }
  };

  // Unsubscribe and cleanup listeners (Task 01)
  const unsubscribeAll = () => {
    if (accSubscription.current) {
      accSubscription.current.remove();
      accSubscription.current = null;
    }
    if (gyroSubscription.current) {
      gyroSubscription.current.remove();
      gyroSubscription.current = null;
    }
    if (magSubscription.current) {
      magSubscription.current.remove();
      magSubscription.current = null;
    }
  };

  // Trigger Shake Feedback (Task 03)
  const triggerShakeFeedback = (magValue = SHAKE_THRESHOLD) => {
    const now = Date.now();
    // Debounce 750ms agar getaran tidak berulang berlebihan dalam 1 gerakan guncang
    if (now - lastShakeTimestamp.current < 750) {
      return;
    }
    lastShakeTimestamp.current = now;

    const timeStr = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // 1. Picu getaran fisik pada perangkat menggunakan Vibration.vibrate() (Task 03)
    try {
      if (Platform.OS === 'android') {
        // Pola getar pendek ganda: diam 0ms, getar 180ms, diam 80ms, getar 180ms
        Vibration.vibrate([0, 180, 80, 180]);
      } else {
        Vibration.vibrate(300);
      }
    } catch (err) {
      console.warn('Vibration error:', err);
    }

    // 2. Pembaruan UI visual (Task 03)
    setShakeDetected(true);
    setShakeCount((prev) => prev + 1);
    setLastShakeTime(timeStr);

    // Animasi Pulse
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.08,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss visual alert setelah 2.5 detik
    if (shakeBannerTimeout.current) clearTimeout(shakeBannerTimeout.current);
    shakeBannerTimeout.current = setTimeout(() => {
      setShakeDetected(false);
    }, 2500);
  };

  // Manual Test Shake (berguna untuk simulasi/testing di browser/emulator)
  const handleTestShakeSimulation = () => {
    triggerShakeFeedback(2.45);
  };

  // Reset counter
  const handleResetCounter = () => {
    setShakeCount(0);
    setLastShakeTime(null);
    setShakeDetected(false);
  };

  // Toggle active state
  const handleToggleActive = () => {
    setIsActive((prev) => !prev);
  };

  // Helper untuk progress level bar (-1.5g s/d +1.5g)
  const getBarPercentage = (val) => {
    const clamped = Math.max(-1.5, Math.min(1.5, val));
    return ((clamped + 1.5) / 3.0) * 100;
  };

  // Hitung magnitudo accelerometer saat ini
  const currentMagnitude = Math.sqrt(
    accData.x * accData.x + accData.y * accData.y + accData.z * accData.z
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header Banner & Status Indikator (Task 03) */}
      <View style={styles.statusBarCard}>
        <View style={styles.statusBarLeft}>
          <View
            style={[
              styles.statusPulseDot,
              isActive ? styles.dotActive : styles.dotInactive,
            ]}
          />
          <View>
            <Text style={styles.statusTitle}>
              Status: {isActive ? 'Active (Siap Mendeteksi)' : 'Nonaktif / Dijeda'}
            </Text>
            <Text style={styles.statusSubtitle}>
              Update Interval: {UPDATE_INTERVAL_MS}ms • {isAvailable ? 'Sensor Tersedia' : 'Mode Fallback / Emulator'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.toggleBtn, isActive ? styles.toggleBtnActive : styles.toggleBtnInactive]}
          onPress={handleToggleActive}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isActive ? 'pause-circle' : 'play-circle'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.toggleBtnText}>{isActive ? 'Jeda' : 'Mulai'}</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Visual Alert Banner: Goyangan Terdeteksi! (Task 03 Feedback) */}
      {shakeDetected && (
        <Animated.View
          style={[
            styles.shakeAlertBanner,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View style={styles.shakeAlertIconWrap}>
            <Ionicons name="phone-portrait" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shakeAlertTitle}>Goyangan Terdeteksi! 🔔</Text>
            <Text style={styles.shakeAlertDesc}>
              Gerakan fisik melebihi ambang batas ({SHAKE_THRESHOLD.toFixed(2)}G). Getaran & feedback dipicu!
            </Text>
          </View>
          <View style={styles.shakeBadgePill}>
            <Text style={styles.shakeBadgePillText}>#{shakeCount}</Text>
          </View>
        </Animated.View>
      )}

      {/* 3. Sensor Selector Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'ACCELEROMETER' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('ACCELEROMETER')}
        >
          <Ionicons
            name="speedometer-outline"
            size={16}
            color={activeTab === 'ACCELEROMETER' ? THEME.colors.primary : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'ACCELEROMETER' && styles.tabTextActive,
            ]}
          >
            Accelerometer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'GYROSCOPE' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('GYROSCOPE')}
        >
          <Ionicons
            name="compass-outline"
            size={16}
            color={activeTab === 'GYROSCOPE' ? THEME.colors.primary : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'GYROSCOPE' && styles.tabTextActive,
            ]}
          >
            Gyroscope
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'MAGNETOMETER' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('MAGNETOMETER')}
        >
          <Ionicons
            name="navigate-outline"
            size={16}
            color={activeTab === 'MAGNETOMETER' ? THEME.colors.primary : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'MAGNETOMETER' && styles.tabTextActive,
            ]}
          >
            Magnetometer
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. Display Koordinat Numerik Real-time X, Y, Z (Task 02) */}
      {activeTab === 'ACCELEROMETER' && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Data Accelerometer Real-Time</Text>
            <Text style={styles.sectionSubtitle}>
              Mendeteksi percepatan 3 sumbu ($X$, $Y$, $Z$) dengan format 2 desimal
            </Text>
          </View>

          {/* Sumbu X Card */}
          <View style={styles.axisCard}>
            <View style={styles.axisHeader}>
              <View style={[styles.axisTag, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <Text style={[styles.axisTagText, { color: '#1D4ED8' }]}>Sumbu X</Text>
              </View>
              <Text style={styles.axisDirectionLabel}>
                {accData.x > 0.2 ? 'Miring Kanan ➔' : accData.x < -0.2 ? '⬅ Miring Kiri' : 'Posisi Seimbang'}
              </Text>
              <Text style={styles.axisValue}>{accData.x.toFixed(2)} G</Text>
            </View>
            <View style={styles.meterTrack}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${getBarPercentage(accData.x)}%`,
                    backgroundColor: THEME.colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Sumbu Y Card */}
          <View style={styles.axisCard}>
            <View style={styles.axisHeader}>
              <View style={[styles.axisTag, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={[styles.axisTagText, { color: '#15803D' }]}>Sumbu Y</Text>
              </View>
              <Text style={styles.axisDirectionLabel}>
                {accData.y > 0.2 ? 'Miring ke Atas ⬆' : accData.y < -0.2 ? '⬇ Miring ke Bawah' : 'Posisi Seimbang'}
              </Text>
              <Text style={styles.axisValue}>{accData.y.toFixed(2)} G</Text>
            </View>
            <View style={styles.meterTrack}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${getBarPercentage(accData.y)}%`,
                    backgroundColor: THEME.colors.success,
                  },
                ]}
              />
            </View>
          </View>

          {/* Sumbu Z Card */}
          <View style={styles.axisCard}>
            <View style={styles.axisHeader}>
              <View style={[styles.axisTag, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
                <Text style={[styles.axisTagText, { color: '#7E22CE' }]}>Sumbu Z</Text>
              </View>
              <Text style={styles.axisDirectionLabel}>
                {accData.z > 0.5 ? 'Layar Hadap Atas ☀️' : accData.z < -0.5 ? 'Layar Hadap Bawah 🌙' : 'Miring'}
              </Text>
              <Text style={styles.axisValue}>{accData.z.toFixed(2)} G</Text>
            </View>
            <View style={styles.meterTrack}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${getBarPercentage(accData.z)}%`,
                    backgroundColor: THEME.colors.accent,
                  },
                ]}
              />
            </View>
          </View>

          {/* 5. Shake Detection & Magnitude Overview Card (Task 03) */}
          <View style={styles.magnitudeCard}>
            <View style={styles.magnitudeRow}>
              <View>
                <Text style={styles.magnitudeLabel}>Total Magnitudo (|a|)</Text>
                <Text style={styles.magnitudeValue}>
                  {currentMagnitude.toFixed(2)} <Text style={styles.unitText}>G</Text>
                </Text>
              </View>
              <View style={styles.thresholdBox}>
                <Text style={styles.thresholdLabel}>Ambang Batas (Threshold)</Text>
                <Text style={styles.thresholdValue}>{SHAKE_THRESHOLD.toFixed(2)} G</Text>
              </View>
            </View>

            {/* Visual Threshold Bar */}
            <View style={styles.magnitudeTrack}>
              <View
                style={[
                  styles.magnitudeFill,
                  {
                    width: `${Math.min(100, (currentMagnitude / 2.5) * 100)}%`,
                    backgroundColor:
                      currentMagnitude > SHAKE_THRESHOLD
                        ? THEME.colors.danger
                        : THEME.colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.magnitudeTip}>
              {currentMagnitude > SHAKE_THRESHOLD
                ? '⚡ Melebihi Threshold! Goyangan terpicu.'
                : 'Kondisi stabil. Gerakkan atau guncang perangkat untuk memicu respon.'}
            </Text>
          </View>
        </>
      )}

      {/* Gyroscope View */}
      {activeTab === 'GYROSCOPE' && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Data Gyroscope (Rotasi)</Text>
            <Text style={styles.sectionSubtitle}>
              Mendeteksi kecepatan sudut (rad/s) pada Roll, Pitch, dan Yaw
            </Text>
          </View>
          <View style={styles.axisCard}>
            <View style={styles.axisHeader}>
              <Text style={styles.axisValueName}>X (Roll)</Text>
              <Text style={styles.axisValue}>{gyroData.x.toFixed(2)} rad/s</Text>
            </View>
          </View>
          <View style={styles.axisCard}>
            <View style={styles.axisHeader}>
              <Text style={styles.axisValueName}>Y (Pitch)</Text>
              <Text style={styles.axisValue}>{gyroData.y.toFixed(2)} rad/s</Text>
            </View>
          </View>
          <View style={styles.axisCard}>
            <View style={styles.axisHeader}>
              <Text style={styles.axisValueName}>Z (Yaw)</Text>
              <Text style={styles.axisValue}>{gyroData.z.toFixed(2)} rad/s</Text>
            </View>
          </View>
        </>
      )}

      {/* Magnetometer View */}
      {activeTab === 'MAGNETOMETER' && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Data Magnetometer (Medan Magnet)</Text>
            <Text style={styles.sectionSubtitle}>
              Mendeteksi kekuatan medan magnet bumi dalam mikrotesla (µT)
            </Text>
          </View>
          <View style={styles.axisCard}>
            <View style={styles.axisHeader}>
              <Text style={styles.axisValueName}>X (Medan Magnet X)</Text>
              <Text style={styles.axisValue}>{magData.x.toFixed(2)} µT</Text>
            </View>
          </View>
          <View style={styles.axisCard}>
            <View style={styles.axisHeader}>
              <Text style={styles.axisValueName}>Y (Medan Magnet Y)</Text>
              <Text style={styles.axisValue}>{magData.y.toFixed(2)} µT</Text>
            </View>
          </View>
          <View style={styles.axisCard}>
            <View style={styles.axisHeader}>
              <Text style={styles.axisValueName}>Z (Medan Magnet Z)</Text>
              <Text style={styles.axisValue}>{magData.z.toFixed(2)} µT</Text>
            </View>
          </View>
        </>
      )}

      {/* 6. Statistik & Riwayat Goyangan (Interactive Feedback) */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Statistik Goyangan (Shake Counter)</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxNumber}>{shakeCount}</Text>
            <Text style={styles.statBoxLabel}>Total Terdeteksi</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxNumber}>{lastShakeTime || '-'}</Text>
            <Text style={styles.statBoxLabel}>Terakhir Terdeteksi</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.testShakeBtn}
            onPress={handleTestShakeSimulation}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={16} color="#FFFFFF" />
            <Text style={styles.testShakeBtnText}>Uji Getaran & Goyangan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleResetCounter}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color={THEME.colors.textMuted} />
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Card Penggunaan */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={18} color={THEME.colors.primary} />
          <Text style={styles.infoTitle}>Panduan Pengujian Sensor</Text>
        </View>
        <Text style={styles.infoText}>
          1. Goyangkan perangkat fisik Anda di Expo Go untuk memicu getaran dan notifikasi.{'\n'}
          2. Nilai koordinat X, Y, Z dan magnitudo dicetak secara otomatis di console (Task 01 & 02).{'\n'}
          3. Jika menguji di browser atau emulator tanpa sensor fisik, klik tombol "Uji Getaran & Goyangan" untuk mensimulasikan gerakan guncangan.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  // Status Bar Card
  statusBarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm,
  },
  statusBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statusPulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotActive: {
    backgroundColor: THEME.colors.success,
  },
  dotInactive: {
    backgroundColor: THEME.colors.warning,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  statusSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: THEME.colors.warning,
  },
  toggleBtnInactive: {
    backgroundColor: THEME.colors.primary,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Shake Alert Banner
  shakeAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.danger,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    gap: 12,
    ...THEME.shadows.md,
  },
  shakeAlertIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shakeAlertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shakeAlertDesc: {
    fontSize: 11,
    color: '#FEE2E2',
    marginTop: 2,
    lineHeight: 14,
  },
  shakeBadgePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shakeBadgePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.danger,
  },

  // Tabs Row
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.primaryLight,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  tabTextActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },

  // Section Header
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },

  // Axis Cards
  axisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm,
  },
  axisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  axisTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  axisTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  axisDirectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    flex: 1,
    textAlign: 'center',
  },
  axisValue: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.text,
    fontVariant: ['tabular-nums'],
  },
  axisValueName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  meterTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Magnitude Card
  magnitudeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm,
  },
  magnitudeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  magnitudeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
  },
  magnitudeValue: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.primary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  thresholdBox: {
    alignItems: 'flex-end',
  },
  thresholdLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  thresholdValue: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.danger,
    marginTop: 2,
  },
  magnitudeTrack: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  magnitudeFill: {
    height: '100%',
    borderRadius: 5,
  },
  magnitudeTip: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 15,
  },

  // Stats Card
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statBoxNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.text,
  },
  statBoxLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testShakeBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    ...THEME.shadows.sm,
  },
  testShakeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
  },
  infoText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 18,
  },
});

