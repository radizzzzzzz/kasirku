import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { StorageService } from '../services/storage';

export default function CartModal({
  visible,
  cartItems,
  onClose,
  onUpdateQuantity,
  onUpdateNotes,
  onClearCart,
  onProceedToPayment,
}) {
  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Keranjang Pesanan ({totalQty} item)</Text>
              <Text style={styles.subtitle}>Periksa dan sesuaikan pesanan</Text>
            </View>
            <View style={styles.headerRight}>
              {cartItems.length > 0 && (
                <TouchableOpacity onPress={onClearCart} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>Kosongkan</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Cart Items List */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {cartItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cart-outline" size={60} color={THEME.colors.textLight} />
                <Text style={styles.emptyTitle}>Keranjang Kosong</Text>
                <Text style={styles.emptySubtitle}>Silakan pilih menu makanan atau minuman terlebih dahulu.</Text>
              </View>
            ) : (
              cartItems.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemMain}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>
                        {StorageService.formatIDR(item.price)} x {item.quantity} ={' '}
                        <Text style={{ fontWeight: '800', color: THEME.colors.primaryDark }}>
                          {StorageService.formatIDR(item.price * item.quantity)}
                        </Text>
                      </Text>
                    </View>

                    {/* Quantity controls */}
                    <View style={styles.counterRow}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      >
                        <Ionicons
                          name={item.quantity === 1 ? 'trash-outline' : 'remove'}
                          size={16}
                          color={item.quantity === 1 ? THEME.colors.danger : THEME.colors.primary}
                        />
                      </TouchableOpacity>

                      <Text style={styles.counterVal}>{item.quantity}</Text>

                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={16} color={THEME.colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Notes per item */}
                  <View style={styles.notesContainer}>
                    <Ionicons name="create-outline" size={14} color={THEME.colors.textLight} />
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Catatan (contoh: Kurang manis, Pedas)"
                      placeholderTextColor={THEME.colors.textLight}
                      value={item.notes || ''}
                      onChangeText={(txt) => onUpdateNotes(item.id, txt)}
                    />
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer Checkout */}
          {cartItems.length > 0 && (
            <View style={styles.footer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal Pesanan</Text>
                <Text style={styles.totalValue}>{StorageService.formatIDR(totalAmount)}</Text>
              </View>

              <TouchableOpacity style={styles.checkoutBtn} onPress={onProceedToPayment}>
                <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
                <Text style={styles.checkoutBtnText}>Lanjut ke Pembayaran</Text>
              </TouchableOpacity>
            </View>
          )}
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
    maxHeight: '85%',
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
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 12,
    color: THEME.colors.danger,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  itemRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  itemPrice: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 2,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterVal: {
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    height: 32,
    marginTop: 8,
    gap: 6,
  },
  notesInput: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.text,
    paddingVertical: 0,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: '#FFFFFF',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
  },
  checkoutBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    ...THEME.shadows.md,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
