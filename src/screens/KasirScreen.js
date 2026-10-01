import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { INITIAL_CATEGORIES } from '../constants/initialData';
import { StorageService } from '../services/storage';
import { showAlert } from '../utils/alert';
import ProductCard from '../components/ProductCard';
import CartModal from '../components/CartModal';
import PaymentModal from '../components/PaymentModal';
import ReceiptModal from '../components/ReceiptModal';

export default function KasirScreen({
  products,
  onUpdateProducts,
  activeEmployee,
  activeShift,
  storeInfo,
  onTransactionComplete,
}) {
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [isPaymentVisible, setIsPaymentVisible] = useState(false);
  const [isReceiptVisible, setIsReceiptVisible] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);

  // Cart operations
  const handleAddToCart = (product) => {
    if (product.stock <= 0) {
      showAlert('Stok Habis', 'Produk ini sedang tidak tersedia.');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showAlert('Batas Stok', `Maksimal stok tersedia hanya ${product.stock}`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1, notes: '' }];
    });
  };

  const handleRemoveFromCart = (productId) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === productId);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter((item) => item.id !== productId);
      }
      return prev.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  };

  const handleUpdateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== productId));
    } else {
      const prod = products.find((p) => p.id === productId);
      if (prod && newQty > prod.stock) {
        showAlert('Batas Stok', `Maksimal stok tersedia hanya ${prod.stock}`);
        return;
      }
      setCart((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, quantity: newQty } : item))
      );
    }
  };

  const handleUpdateNotes = (productId, notes) => {
    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, notes } : item))
    );
  };

  const handleClearCart = () => {
    showAlert('Kosongkan Keranjang', 'Apakah Anda yakin ingin menghapus semua item?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya, Kosongkan', style: 'destructive', onPress: () => setCart([]) },
    ]);
  };

  // Filtered Products
  const filteredProducts = products.filter((prod) => {
    const matchCat = selectedCategory === 'Semua' || prod.category === selectedCategory;
    const matchSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const cartTotalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartTotalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Complete Payment Flow
  const handleConfirmPayment = async (paymentData) => {
    setIsPaymentVisible(false);
    setIsCartVisible(false);

    const now = new Date();
    const newTx = {
      id: `TRX-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now
        .getDate()
        .toString()
        .padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      cashierId: activeEmployee ? activeEmployee.id : 'EMP-01',
      cashierName: activeEmployee ? activeEmployee.name : 'Kasir',
      shiftId: activeShift ? activeShift.id : 'DEFAULT',
      shiftName: activeShift ? activeShift.shiftName : 'Shift Umum',
      items: cart,
      subtotal: paymentData.subtotal,
      discount: paymentData.discount,
      grandTotal: paymentData.grandTotal,
      paymentMethod: paymentData.paymentMethod,
      cashGiven: paymentData.cashGiven,
      change: paymentData.change,
    };

    // 1. Reduce product stock
    const updatedProducts = products.map((prod) => {
      const inCart = cart.find((item) => item.id === prod.id);
      if (inCart) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - inCart.quantity),
          isAvailable: prod.stock - inCart.quantity > 0,
        };
      }
      return prod;
    });

    await StorageService.saveProducts(updatedProducts);
    onUpdateProducts(updatedProducts);

    // 2. Save Transaction & update active shift
    await StorageService.addTransaction(newTx);
    if (onTransactionComplete) {
      onTransactionComplete(newTx);
    }

    // 3. Clear cart & open Receipt
    setCart([]);
    setLastTransaction(newTx);
    setIsReceiptVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Search & Category Filter */}
      <View style={styles.topFilterSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={THEME.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari menu makanan, minuman, snack..."
            placeholderTextColor={THEME.colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={THEME.colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {INITIAL_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Product List */}
      <ScrollView
        style={styles.productList}
        contentContainerStyle={[
          styles.productListContent,
          cart.length > 0 && { paddingBottom: 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={48} color={THEME.colors.textLight} />
            <Text style={styles.emptyTitle}>Menu Tidak Ditemukan</Text>
            <Text style={styles.emptySubtitle}>
              Coba gunakan kata kunci lain atau pilih kategori berbeda.
            </Text>
          </View>
        ) : (
          filteredProducts.map((prod) => {
            const inCart = cart.find((item) => item.id === prod.id);
            return (
              <ProductCard
                key={prod.id}
                product={prod}
                cartQuantity={inCart ? inCart.quantity : 0}
                onAddToCart={() => handleAddToCart(prod)}
                onRemoveFromCart={() => handleRemoveFromCart(prod.id)}
              />
            );
          })
        )}
      </ScrollView>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <View style={styles.floatingCart}>
          <TouchableOpacity
            style={styles.cartBarButton}
            onPress={() => setIsCartVisible(true)}
            activeOpacity={0.9}
          >
            <View style={styles.cartBarLeft}>
              <View style={styles.cartBadgeIcon}>
                <Ionicons name="bag-handle" size={20} color="#FFFFFF" />
                <View style={styles.itemCountBadge}>
                  <Text style={styles.itemCountText}>{cartTotalQty}</Text>
                </View>
              </View>
              <View style={styles.cartTextInfo}>
                <Text style={styles.cartTotalText}>
                  {StorageService.formatIDR(cartTotalAmount)}
                </Text>
                <Text style={styles.cartSubText}>{cart.length} macam item</Text>
              </View>
            </View>

            <View style={styles.cartBarRight}>
              <Text style={styles.payNowText}>Bayar</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart Modal */}
      <CartModal
        visible={isCartVisible}
        cartItems={cart}
        onClose={() => setIsCartVisible(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onUpdateNotes={handleUpdateNotes}
        onClearCart={handleClearCart}
        onProceedToPayment={() => {
          setIsCartVisible(false);
          setIsPaymentVisible(true);
        }}
      />

      {/* Payment Modal */}
      <PaymentModal
        visible={isPaymentVisible}
        totalAmount={cartTotalAmount}
        onClose={() => setIsPaymentVisible(false)}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        visible={isReceiptVisible}
        transaction={lastTransaction}
        storeInfo={storeInfo}
        onClose={() => setIsReceiptVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  topFilterSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.text,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  categoryScroll: {
    paddingVertical: 10,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  productList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  productListContent: {
    paddingTop: 12,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    paddingHorizontal: 30,
  },
  floatingCart: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
  },
  cartBarButton: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...THEME.shadows.lg,
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartBadgeIcon: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: THEME.colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  itemCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  cartTextInfo: {
    justifyContent: 'center',
  },
  cartTotalText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cartSubText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  cartBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  payNowText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
