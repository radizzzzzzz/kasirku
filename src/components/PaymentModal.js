import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { StorageService } from '../services/storage';

export default function PaymentModal({
  visible,
  totalAmount,
  onClose,
  onConfirmPayment,
}) {
  const [method, setMethod] = useState('TUNAI'); // 'TUNAI' | 'QRIS'
  const [cashGiven, setCashGiven] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

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
      Alert.alert('Uang Kurang', `Uang tunai kurang ${StorageService.formatIDR(Math.abs(change))}`);
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
                <View style={styles.qrisCard}>
                  <View style={styles.qrisHeader}>
                    <Text style={styles.qrisBadge}>QRIS STANDAR PEMBAYARAN NASIONAL</Text>
                  </View>
                  <View style={styles.qrisBox}>
                    <Ionicons name="qr-code" size={140} color="#0F172A" />
                  </View>
                  <Text style={styles.qrisNMID}>NMID: ID1029384756201</Text>
                  <Text style={styles.qrisAmount}>
                    Nominal: {StorageService.formatIDR(grandTotal)}
                  </Text>
                  <Text style={styles.qrisHint}>
                    Mendukung GoPay, OVO, Dana, ShopeePay, BCA, Mandiri, BRI, dll.
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
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
    paddingVertical: 10,
  },
  qrisCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...THEME.shadows.sm,
  },
  qrisHeader: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  qrisBadge: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qrisBox: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  qrisNMID: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 10,
  },
  qrisAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
    marginTop: 4,
  },
  qrisHint: {
    fontSize: 11,
    color: THEME.colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    padding: 16,
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
