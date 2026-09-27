import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { StorageService } from '../services/storage';

export default function ReceiptModal({ visible, transaction, onClose, storeInfo }) {
  if (!transaction) return null;

  const store = storeInfo || {
    name: 'KasirKu Cafe & Eatery',
    address: 'Jl. Kampus Merdeka No. 45',
    phone: '0812-9988-7766',
    footerMessage: 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar.',
  };

  const handleShare = async () => {
    try {
      const itemsList = (transaction.items || [])
        .map(
          (item) =>
            `${item.quantity}x ${item.name}\n   @${StorageService.formatIDR(item.price)} = ${StorageService.formatIDR(
              item.price * item.quantity
            )}${item.notes ? ` (${item.notes})` : ''}`
        )
        .join('\n');

      const receiptText = `
================================
       ${store.name.toUpperCase()}
  ${store.address}
  Telp: ${store.phone}
================================
No. Transaksi : ${transaction.id}
Tanggal       : ${transaction.date} ${transaction.time}
Kasir         : ${transaction.cashierName}
Shift         : ${transaction.shiftName || 'Reguler'}
--------------------------------
${itemsList}
--------------------------------
Subtotal      : ${StorageService.formatIDR(transaction.subtotal)}
Diskon        : ${StorageService.formatIDR(transaction.discount || 0)}
TOTAL         : ${StorageService.formatIDR(transaction.grandTotal)}
Metode Bayar  : ${transaction.paymentMethod}
${
  transaction.paymentMethod === 'TUNAI'
    ? `Bayar Tunai   : ${StorageService.formatIDR(transaction.cashGiven)}\nKembalian     : ${StorageService.formatIDR(
        transaction.change
      )}`
    : `Status Bayar  : LUNAS (QRIS Digital)`
}
================================
${store.footerMessage}
================================
      `;

      await Share.share({
        message: receiptText.trim(),
        title: `Nota Transaksi ${transaction.id}`,
      });
    } catch (error) {
      Alert.alert('Gagal Membagikan', error.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header Action */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="receipt-outline" size={22} color={THEME.colors.primary} />
              <Text style={styles.headerTitle}>Nota Digital</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={24} color={THEME.colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Receipt Body */}
          <ScrollView contentContainerStyle={styles.receiptScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.receiptPaper}>
              {/* Top Serrated Edge Decoration */}
              <View style={styles.zigzagBorder} />

              <View style={styles.storeHeader}>
                <Text style={styles.storeName}>{store.name}</Text>
                <Text style={styles.storeAddress}>{store.address}</Text>
                <Text style={styles.storePhone}>Telp: {store.phone}</Text>
              </View>

              <View style={styles.dividerDashed} />

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>No. Nota</Text>
                <Text style={styles.metaValue}>{transaction.id}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Waktu</Text>
                <Text style={styles.metaValue}>
                  {transaction.date} • {transaction.time}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Kasir</Text>
                <Text style={styles.metaValue}>{transaction.cashierName}</Text>
              </View>
              {transaction.shiftName && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Shift</Text>
                  <Text style={styles.metaValue}>{transaction.shiftName.split(' ')[0]}</Text>
                </View>
              )}

              <View style={styles.dividerDashed} />

              {/* Items List */}
              <Text style={styles.sectionHeading}>RINCIAN PESANAN</Text>
              {(transaction.items || []).map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemName}>
                      {item.quantity}x {item.name}
                    </Text>
                    {item.notes ? <Text style={styles.itemNotes}>* {item.notes}</Text> : null}
                    <Text style={styles.itemUnitPrice}>
                      @{StorageService.formatIDR(item.price)}
                    </Text>
                  </View>
                  <Text style={styles.itemSubtotal}>
                    {StorageService.formatIDR(item.price * item.quantity)}
                  </Text>
                </View>
              ))}

              <View style={styles.dividerDashed} />

              {/* Totals */}
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Subtotal</Text>
                <Text style={styles.calcValue}>{StorageService.formatIDR(transaction.subtotal)}</Text>
              </View>
              {transaction.discount > 0 && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Diskon Promo</Text>
                  <Text style={[styles.calcValue, { color: THEME.colors.danger }]}>
                    -{StorageService.formatIDR(transaction.discount)}
                  </Text>
                </View>
              )}
              <View style={[styles.calcRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>TOTAL BAYAR</Text>
                <Text style={styles.grandTotalValue}>
                  {StorageService.formatIDR(transaction.grandTotal)}
                </Text>
              </View>

              <View style={styles.dividerDashed} />

              {/* Payment Details */}
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Metode Pembayaran</Text>
                <View style={styles.payBadge}>
                  <Text style={styles.payBadgeText}>{transaction.paymentMethod}</Text>
                </View>
              </View>
              {transaction.paymentMethod === 'TUNAI' ? (
                <>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Tunai Diterima</Text>
                    <Text style={styles.calcValue}>
                      {StorageService.formatIDR(transaction.cashGiven)}
                    </Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={[styles.calcLabel, { fontWeight: '700', color: THEME.colors.success }]}>
                      Kembalian
                    </Text>
                    <Text style={[styles.calcValue, { fontWeight: '700', color: THEME.colors.success }]}>
                      {StorageService.formatIDR(transaction.change)}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Status QRIS</Text>
                  <Text style={[styles.calcValue, { color: THEME.colors.success, fontWeight: '700' }]}>
                    LUNAS TERVERIFIKASI
                  </Text>
                </View>
              )}

              <View style={styles.dividerDashed} />

              <View style={styles.footerNote}>
                <Text style={styles.footerText}>{store.footerMessage}</Text>
                <Text style={styles.powerByText}>KasirKu POS System</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>Bagikan Nota</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Ionicons name="checkmark-done" size={18} color={THEME.colors.primary} />
              <Text style={styles.doneButtonText}>Transaksi Baru</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    ...THEME.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: '#F8FAFC',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  receiptScroll: {
    padding: 16,
  },
  receiptPaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  zigzagBorder: {
    height: 4,
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
    marginBottom: 12,
  },
  storeHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  storeAddress: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  storePhone: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  dividerDashed: {
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemLeft: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  itemNotes: {
    fontSize: 10,
    color: THEME.colors.warning,
    fontStyle: 'italic',
  },
  itemUnitPrice: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  calcLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  calcValue: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  grandTotalRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  payBadge: {
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  payBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  footerNote: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  footerText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  powerByText: {
    fontSize: 9,
    color: THEME.colors.textLight,
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  shareButton: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  doneButton: {
    flex: 1,
    backgroundColor: THEME.colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  doneButtonText: {
    color: THEME.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
