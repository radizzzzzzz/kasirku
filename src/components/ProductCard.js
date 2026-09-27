import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { StorageService } from '../services/storage';

export default function ProductCard({
  product,
  cartQuantity = 0,
  onAddToCart,
  onRemoveFromCart,
  onPress,
}) {
  const isOutOfStock = product.stock <= 0 || !product.isAvailable;

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Makanan':
        return 'restaurant-outline';
      case 'Minuman':
        return 'cafe-outline';
      case 'Snack':
        return 'fast-food-outline';
      default:
        return 'cube-outline';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, isOutOfStock && styles.cardDisabled]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={getCategoryIcon(product.category)}
            size={22}
            color={isOutOfStock ? THEME.colors.textLight : THEME.colors.primary}
          />
        </View>
        <View style={styles.badgeRow}>
          <Text style={styles.categoryBadge}>{product.category}</Text>
          <Text
            style={[
              styles.stockBadge,
              product.stock <= 5 ? styles.stockLow : styles.stockNormal,
            ]}
          >
            Stok: {product.stock}
          </Text>
        </View>
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {product.name}
      </Text>
      <Text style={styles.description} numberOfLines={1}>
        {product.description || 'Pilihan terbaik untuk menu harian'}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.price}>{StorageService.formatIDR(product.price)}</Text>

        {isOutOfStock ? (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Habis</Text>
          </View>
        ) : cartQuantity > 0 ? (
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={onRemoveFromCart}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="remove" size={16} color={THEME.colors.primary} />
            </TouchableOpacity>

            <Text style={styles.counterValue}>{cartQuantity}</Text>

            <TouchableOpacity
              style={[
                styles.counterBtn,
                cartQuantity >= product.stock && styles.counterBtnDisabled,
              ]}
              onPress={onAddToCart}
              disabled={cartQuantity >= product.stock}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={16} color={THEME.colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={onAddToCart}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Pilih</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockNormal: {
    color: THEME.colors.primaryDark,
    backgroundColor: THEME.colors.primaryLight,
  },
  stockLow: {
    color: THEME.colors.danger,
    backgroundColor: THEME.colors.dangerLight,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 2,
  },
  description: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  addBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  counterBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  counterBtnDisabled: {
    opacity: 0.4,
  },
  counterValue: {
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
  },
  outOfStockBadge: {
    backgroundColor: THEME.colors.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outOfStockText: {
    color: THEME.colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
});
