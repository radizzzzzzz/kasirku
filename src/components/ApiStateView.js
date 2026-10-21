/**
 * ApiStateView Component
 * Komponen visual universal untuk menampilkan kondisi response API sesuai kurikulum Mobile Programming:
 * - Loading State (Request sedang berjalan)
 * - Retrying State (Mencoba request ulang)
 * - Offline State (Tidak ada koneksi internet)
 * - Client Error 4xx (404 Data Tidak Ditemukan, 401 Akses Ditolak)
 * - Server Error 5xx (500 Gangguan Server)
 * - Timeout State (Batas waktu koneksi habis)
 * - Empty State (Data kosong)
 * 
 * Mengacu pada desain visual persis seperti di slide PPT (TASK 01, TASK 02, TASK 03, SPRINT 05).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

export default function ApiStateView({
  type = 'loading', // 'loading' | 'retrying' | 'offline' | '4xx' | '5xx' | 'timeout' | 'empty' | 'generic'
  title,
  message,
  onRetry,
  retryLabel = 'Coba Lagi',
  isOfflineRetry = false,
}) {
  // 1. Tampilan Loading (Request)
  if (type === 'loading') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.spinnerWrapper}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
        <Text style={styles.titleText}>{title || 'Memuat data...'}</Text>
        <Text style={styles.subtitleText}>
          {message || 'Mohon tunggu sebentar.'}
        </Text>
      </View>
    );
  }

  // 2. Tampilan Retrying (Request Ulang saat tombol Coba Lagi ditekan)
  if (type === 'retrying') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.spinnerWrapper}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
        <Text style={styles.titleText}>{title || 'Mencoba lagi...'}</Text>
        <Text style={styles.subtitleText}>
          {message || (isOfflineRetry ? 'Menghubungkan ke internet.' : 'Mengambil data terbaru.')}
        </Text>
      </View>
    );
  }

  // Helper untuk menentukan icon dan konten berdasarkan tipe error
  const renderIconAndDefaultContent = () => {
    switch (type) {
      case 'offline':
        return {
          icon: (
            <View style={styles.iconCircleWrapper}>
              <Ionicons name="wifi" size={56} color="#64748B" />
              <View style={styles.errorBadgeSmall}>
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </View>
            </View>
          ),
          defaultTitle: 'Tidak ada koneksi internet.',
          defaultMessage: 'Periksa koneksi Anda dan coba lagi.',
        };

      case '4xx':
        return {
          icon: (
            <View style={[styles.iconCircleWrapper, styles.circleRed]}>
              <Ionicons name="alert-circle" size={68} color="#EF4444" />
            </View>
          ),
          defaultTitle: 'Data tidak ditemukan',
          defaultMessage: 'Menu yang Anda cari tidak tersedia. (404 Not Found)',
        };

      case '5xx':
        return {
          icon: (
            <View style={styles.iconCircleWrapper}>
              <View style={styles.serverIconBox}>
                <Ionicons name="server-outline" size={52} color="#475569" />
                <View style={styles.errorBadgeSmall}>
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </View>
              </View>
            </View>
          ),
          defaultTitle: 'Terjadi kesalahan pada server.',
          defaultMessage: 'Server sedang mengalami gangguan. Silakan coba lagi nanti. (500 Internal Server Error)',
        };

      case 'timeout':
        return {
          icon: (
            <View style={[styles.iconCircleWrapper, styles.circleAmber]}>
              <Ionicons name="time-outline" size={60} color="#F59E0B" />
              <View style={[styles.errorBadgeSmall, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="alert" size={14} color="#FFFFFF" />
              </View>
            </View>
          ),
          defaultTitle: 'Waktu permintaan habis.',
          defaultMessage: 'Server tidak merespons. Silakan coba lagi.',
        };

      case 'empty':
        return {
          icon: (
            <View style={[styles.iconCircleWrapper, styles.circleSlate]}>
              <Ionicons name="cube-outline" size={60} color="#94A3B8" />
            </View>
          ),
          defaultTitle: 'Belum ada data',
          defaultMessage: 'Saat ini belum ada menu atau produk yang tersedia.',
        };

      default:
        return {
          icon: (
            <View style={[styles.iconCircleWrapper, styles.circleRed]}>
              <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
            </View>
          ),
          defaultTitle: 'Gagal mengambil data.',
          defaultMessage: 'Terjadi kesalahan pada server. Silakan coba lagi.',
        };
    }
  };

  const { icon, defaultTitle, defaultMessage } = renderIconAndDefaultContent();

  return (
    <View style={styles.centerContainer}>
      {/* Icon Ilustrasi Sesuai PPT */}
      <View style={styles.illustrationWrapper}>{icon}</View>

      {/* Judul & Pesan Error */}
      <Text style={styles.titleText}>{title || defaultTitle}</Text>
      <Text style={styles.subtitleText}>{message || defaultMessage}</Text>

      {/* Tombol Coba Lagi (Retry Button Sesuai PPT) */}
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Ionicons name="reload" size={16} color="#FFFFFF" style={styles.retryIcon} />
          <Text style={styles.retryButtonText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    minHeight: 380,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  spinnerWrapper: {
    marginBottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationWrapper: {
    marginBottom: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleWrapper: {
    position: 'relative',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleRed: {
    backgroundColor: '#FEF2F2',
  },
  circleAmber: {
    backgroundColor: '#FFFBEB',
  },
  circleSlate: {
    backgroundColor: '#F1F5F9',
  },
  errorBadgeSmall: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serverIconBox: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
    marginBottom: 26,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444', // Merah cerah khas slide PPT
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    minWidth: 160,
    ...THEME.shadows.md,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
