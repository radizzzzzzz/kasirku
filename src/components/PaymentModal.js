import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { StorageService } from '../services/storage';
import { showAlert } from '../utils/alert';

const QRIS_IMAGE = require('../../assets/qris.jpg');

export default function PaymentModal({
  visible,
  totalAmount,
  onClose,
  onConfirmPayment,
}) {
  const [method, setMethod] = useState('TUNAI'); // 'TUNAI' | 'QRIS'
  const [cashGiven, setCashGiven] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isQrZoomed, setIsQrZoomed] = useState(false);

  const discountAmount = Math.round((totalAmount * discountPercent) / 100);
  const grandTotal = Math.max(0, totalAmount - discountAmount);

  const cashNumber = parseInt(cashGiven.replace(/[^0-9]/g, ''), 10) || 0;
  const change = cashNumber - grandTotal;
  const isCashSufficient = cashNumber >= grandTotal;

  // Preset quick cash amounts
  const quickAmounts = [
    grandTotal,
    Math.ceil(grandTotal / 10000) * 10000,
    Math.ceil(grandTotal / 50000) * 50000 || 50000,
    100000,
  ].filter((v, idx, arr) => v >= grandTotal && arr.indexOf(v) === idx);

  const handleSelectQuickCash = (amount) => {
    setCashGiven(amount.toString());
  };

  const handlePay = () => {
    if (method === 'TUNAI' && !isCashSufficient) {
      showAlert('Uang Kurang', `Uang tunai kurang ${StorageService.formatIDR(Math.abs(change))}`);
      return;
    }

    onConfirmPayment({
      paymentMethod: method,
      subtotal: totalAmount,
      discount: discountAmount,
      grandTotal: grandTotal,
      cashGiven: method === 'TUNAI' ? cashNumber : grandTotal,
      change: method === 'TUNAI' ? Math.max(0, change) : 0,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Pembayaran Pesanan</Text>
              <Text style={styles.subtitle}>Pilih metode pembayaran pelanggan</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Grand Total Card */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Tagihan</Text>
              <Text style={styles.totalValue}>{StorageService.formatIDR(grandTotal)}</Text>
              {discountAmount > 0 && (
                <Text style={styles.discountInfo}>
                  Hemat {StorageService.formatIDR(discountAmount)} ({discountPercent}% diskon)
                </Text>
              )}
            </View>

            {/* Discount selector */}
            <View style={styles.discountRow}>
              <Text style={styles.discountLabel}>Diskon:</Text>
              {[0, 5, 10, 15].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.discBadge, discountPercent === d && styles.discBadgeActive]}
                  onPress={() => setDiscountPercent(d)}
                >
                  <Text
                    style={[
                      styles.discBadgeText,
                      discountPercent === d && styles.discBadgeTextActive,
                    ]}
                  >
                    {d === 0 ? 'Normal' : `${d}%`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payment Method Switcher */}
            <Text style={styles.sectionTitle}>Pilih Metode</Text>
            <View style={styles.methodSwitcher}>
              <TouchableOpacity
                style={[styles.methodBtn, method === 'TUNAI' && styles.methodBtnActive]}
                onPress={() => setMethod('TUNAI')}
              >
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={method === 'TUNAI' ? '#FFFFFF' : THEME.colors.textMuted}
                />
                <Text
                  style={[styles.methodBtnText, method === 'TUNAI' && styles.methodBtnTextActive]}
                >
                  Tunai / Cash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodBtn, method === 'QRIS' && styles.methodBtnActive]}
                onPress={() => setMethod('QRIS')}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={20}
                  color={method === 'QRIS' ? '#FFFFFF' : THEME.colors.textMuted}
                />
                <Text
                  style={[styles.methodBtnText, method === 'QRIS' && styles.methodBtnTextActive]}
                >
                  QRIS / Transfer
                </Text>
              </TouchableOpacity>
            </View>

            {/* TUNAI View */}
            {method === 'TUNAI' ? (
              <View style={styles.cashSection}>
                <Text style={styles.sectionTitle}>Pecahan Cepat</Text>
                <View style={styles.chipsContainer}>
                  {quickAmounts.map((amt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.chip,
                        cashNumber === amt && styles.chipActive,
                      ]}
                      onPress={() => handleSelectQuickCash(amt)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          cashNumber === amt && styles.chipTextActive,
                        ]}
                      >
                        {amt === grandTotal ? 'Uang Pas' : StorageService.formatIDR(amt)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>Uang Tunai Diterima</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencyPrefix}>Rp</Text>
                  <TextInput
                    style={styles.cashInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={THEME.colors.textLight}
                    value={cashGiven ? parseInt(cashGiven, 10).toLocaleString('id-ID') : ''}
                    onChangeText={(txt) => {
                      const cleaned = txt.replace(/[^0-9]/g, '');
                      setCashGiven(cleaned);
                    }}
                  />
                  {cashGiven.length > 0 && (
                    <TouchableOpacity onPress={() => setCashGiven('')}>
                      <Ionicons name="close-circle" size={20} color={THEME.colors.textLight} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Change Calculation Box */}
                {cashNumber > 0 && (
                  <View
                    style={[
                      styles.changeBox,
                      isCashSufficient ? styles.changeBoxSuccess : styles.changeBoxDanger,
                    ]}
                  >
                    <Ionicons
                      name={isCashSufficient ? 'checkmark-circle' : 'alert-circle'}
                      size={24}
                      color={isCashSufficient ? THEME.colors.success : THEME.colors.danger}
                    />
                    <View style={{ marginLeft: 10 }}>
                      <Text
                        style={[
                          styles.changeLabel,
                          { color: isCashSufficient ? THEME.colors.success : THEME.colors.danger },
                        ]}
                      >
                        {isCashSufficient ? 'Kembalian:' : 'Uang Kurang:'}
                      </Text>
                      <Text
                        style={[
                          styles.changeValue,
                          { color: isCashSufficient ? THEME.colors.success : THEME.colors.danger },
                        ]}
                      >
                        {StorageService.formatIDR(Math.abs(change))}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              /* QRIS View */
              <View style={styles.qrisSection}>
                {/* Merchant Header Info */}
                <View style={styles.merchantHeaderCard}>
                  <View style={styles.merchantLogoBadge}>
                    <Ionicons name="game-controller" size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.merchantTitleRow}>
                      <Text style={styles.merchantName}>radiz gaming</Text>
                      <View style={styles.qrisOfficialBadge}>
                        <Text style={styles.qrisOfficialText}>QRIS RESMI</Text>
                      </View>
                    </View>
                    <Text style={styles.merchantNMID}>NMID: ID1026562556963 • A01</Text>
                  </View>
                </View>

                {/* QR Image Card */}
                <View style={styles.qrisCard}>
                  <TouchableOpacity
                    style={styles.qrisImageContainer}
                    onPress={() => setIsQrZoomed(true)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={QRIS_IMAGE}
                      style={styles.qrisImage}
                      resizeMode="contain"
                    />
                    <View style={styles.zoomHintOverlay}>
                      <Ionicons name="expand-outline" size={13} color="#FFFFFF" />
                      <Text style={styles.zoomHintText}>Ketuk untuk perbesar</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.qrisAmountBanner}>
                    <Text style={styles.qrisAmountLabel}>Nominal Pembayaran:</Text>
                    <Text style={styles.qrisAmountValue}>
                      {StorageService.formatIDR(grandTotal)}
                    </Text>
                  </View>

                  <Text style={styles.qrisHint}>
                    Pindai QRIS di atas dengan BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay, atau m-Banking apapun.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Footer Submit */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.payButton,
                method === 'TUNAI' && !isCashSufficient && styles.payButtonDisabled,
              ]}
              onPress={handlePay}
              disabled={method === 'TUNAI' && !isCashSufficient}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>
                {method === 'TUNAI'
                  ? `Selesaikan Bayar (${StorageService.formatIDR(grandTotal)})`
                  : 'Konfirmasi QRIS Diterima'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Fullscreen QR Zoom Modal */}
      <Modal visible={isQrZoomed} transparent animationType="fade">
        <View style={styles.zoomModalOverlay}>
          <View style={styles.zoomModalHeader}>
            <View>
              <Text style={styles.zoomModalTitle}>QRIS radiz gaming</Text>
              <Text style={styles.zoomModalSubtitle}>Tunjukkan ke pelanggan untuk dipindai</Text>
            </View>
            <TouchableOpacity
              style={styles.zoomModalCloseBtn}
              onPress={() => setIsQrZoomed(false)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.zoomImageWrapper}>
            <Image
              source={QRIS_IMAGE}
              style={styles.zoomedImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.zoomAmountFooter}>
            <Text style={styles.zoomAmountLabel}>Total Tagihan:</Text>
            <Text style={styles.zoomAmountValue}>{StorageService.formatIDR(grandTotal)}</Text>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    overflow: 'hidden',
    ...THEME.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  totalCard: {
    backgroundColor: THEME.colors.primaryLight,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
    marginTop: 2,
  },
  discountInfo: {
    fontSize: 11,
    color: THEME.colors.success,
    fontWeight: '700',
    marginTop: 4,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  discountLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  discBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  discBadgeActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  discBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  discBadgeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  methodSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 16,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  methodBtnActive: {
    backgroundColor: THEME.colors.primary,
    ...THEME.shadows.sm,
  },
  methodBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  methodBtnTextActive: {
    color: '#FFFFFF',
  },
  cashSection: {
    marginBottom: 14,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginRight: 8,
  },
  cashInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.text,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  changeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
  },
  changeBoxSuccess: {
    backgroundColor: THEME.colors.successLight,
    borderColor: '#A7F3D0',
  },
  changeBoxDanger: {
    backgroundColor: THEME.colors.dangerLight,
    borderColor: '#FECACA',
  },
  changeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  changeValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  qrisSection: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  merchantHeaderCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 10,
    ...THEME.shadows.sm,
  },
  merchantLogoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  merchantName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  qrisOfficialBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qrisOfficialText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  merchantNMID: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  qrisCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...THEME.shadows.sm,
  },
  qrisImageContainer: {
    width: '100%',
    height: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrisImage: {
    width: '100%',
    height: '100%',
  },
  zoomHintOverlay: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 5,
  },
  zoomHintText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  qrisAmountBanner: {
    width: '100%',
    backgroundColor: THEME.colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  qrisAmountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  qrisAmountValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
    marginTop: 2,
  },
  qrisHint: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
  zoomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  zoomModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  zoomModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  zoomModalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  zoomModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  zoomedImage: {
    width: '100%',
    height: '100%',
  },
  zoomAmountFooter: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  zoomAmountLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  zoomAmountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: '#FFFFFF',
  },
  payButton: {
    backgroundColor: THEME.colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    ...THEME.shadows.md,
  },
  payButtonDisabled: {
    backgroundColor: '#94A3B8',
    elevation: 0,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
