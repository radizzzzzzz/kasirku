import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { INITIAL_CATEGORIES } from '../constants/initialData';
import { StorageService } from '../services/storage';

export default function MenuScreen({ products, onUpdateProducts }) {
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Makanan');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  const resetForm = () => {
    setName('');
    setCategory('Makanan');
    setPrice('');
    setCost('');
    setStock('');
    setDescription('');
    setIsAvailable(true);
    setEditingProduct(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setCategory(product.category);
    setPrice(product.price.toString());
    setCost(product.cost ? product.cost.toString() : '');
    setStock(product.stock.toString());
    setDescription(product.description || '');
    setIsAvailable(product.isAvailable !== false);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!name.trim()) {
      Alert.alert('Perhatian', 'Nama menu wajib diisi.');
      return;
    }
    const priceNum = parseInt(price.replace(/[^0-9]/g, ''), 10);
    if (!priceNum || priceNum <= 0) {
      Alert.alert('Perhatian', 'Harga jual harus lebih dari 0.');
      return;
    }

    const stockNum = parseInt(stock.replace(/[^0-9]/g, ''), 10) || 0;
    const costNum = parseInt(cost.replace(/[^0-9]/g, ''), 10) || 0;

    let updatedList;
    if (editingProduct) {
      updatedList = products.map((item) =>
        item.id === editingProduct.id
          ? {
              ...item,
              name: name.trim(),
              category,
              price: priceNum,
              cost: costNum,
              stock: stockNum,
              description: description.trim(),
              isAvailable: isAvailable && stockNum > 0,
            }
          : item
      );
    } else {
      const newProduct = {
        id: `PRD-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        category,
        price: priceNum,
        cost: costNum,
        stock: stockNum,
        description: description.trim(),
        isAvailable: isAvailable && stockNum > 0,
      };
      updatedList = [newProduct, ...products];
    }

    await StorageService.saveProducts(updatedList);
    onUpdateProducts(updatedList);
    setIsModalOpen(false);
    resetForm();
  };

  const handleDeleteProduct = (productId, productName) => {
    Alert.alert(
      'Hapus Menu',
      `Yakin ingin menghapus "${productName}" dari daftar menu?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const updated = products.filter((p) => p.id !== productId);
            await StorageService.saveProducts(updated);
            onUpdateProducts(updated);
          },
        },
      ]
    );
  };

  const handleToggleStock = async (product) => {
    const updated = products.map((p) =>
      p.id === product.id ? { ...p, isAvailable: !p.isAvailable } : p
    );
    await StorageService.saveProducts(updated);
    onUpdateProducts(updated);
  };

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <View style={styles.container}>
      {/* Top Search & Filter */}
      <View style={styles.topFilterSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={THEME.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari menu & harga..."
            placeholderTextColor={THEME.colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
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
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>
            Daftar Produk ({filteredProducts.length} Menu)
          </Text>
          <TouchableOpacity style={styles.addMenuBtn} onPress={openAddModal}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addMenuBtnText}>Tambah Menu</Text>
          </TouchableOpacity>
        </View>

        {filteredProducts.map((prod) => (
          <View key={prod.id} style={styles.menuItemCard}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuItemHeader}>
                <Text style={styles.menuItemCategory}>{prod.category}</Text>
                <Text
                  style={[
                    styles.menuItemStockBadge,
                    prod.stock <= 5 ? styles.stockLow : styles.stockNormal,
                  ]}
                >
                  Stok: {prod.stock}
                </Text>
              </View>

              <Text style={styles.menuItemName}>{prod.name}</Text>
              {prod.description ? (
                <Text style={styles.menuItemDesc} numberOfLines={1}>
                  {prod.description}
                </Text>
              ) : null}

              <View style={styles.priceRow}>
                <Text style={styles.menuItemPrice}>
                  {StorageService.formatIDR(prod.price)}
                </Text>
                {prod.cost > 0 && (
                  <Text style={styles.menuItemCost}>
                    (Modal: {StorageService.formatIDR(prod.cost)})
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.menuItemRight}>
              <View style={styles.switchWrapper}>
                <Text style={styles.switchLabel}>
                  {prod.isAvailable ? 'Tersedia' : 'Habis'}
                </Text>
                <Switch
                  value={prod.isAvailable}
                  onValueChange={() => handleToggleStock(prod)}
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={prod.isAvailable ? THEME.colors.primary : '#F1F5F9'}
                />
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => openEditModal(prod)}
                >
                  <Ionicons name="create-outline" size={18} color={THEME.colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconBtn, styles.deleteBtn]}
                  onPress={() => handleDeleteProduct(prod.id, prod.name)}
                >
                  <Ionicons name="trash-outline" size={18} color={THEME.colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Menu' : 'Tambah Menu Baru'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={24} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nama Menu *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: Es Kopi Gula Aren"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Kategori *</Text>
              <View style={styles.categorySelectRow}>
                {['Makanan', 'Minuman', 'Snack', 'Paket'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChoice,
                      category === cat && styles.categoryChoiceActive,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChoiceText,
                        category === cat && styles.categoryChoiceTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.twoColRow}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Harga Jual (Rp) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="15000"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Harga Modal (Rp)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="8000"
                    keyboardType="numeric"
                    value={cost}
                    onChangeText={setCost}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Jumlah Stok</Text>
              <TextInput
                style={styles.textInput}
                placeholder="50"
                keyboardType="numeric"
                value={stock}
                onChangeText={setStock}
              />

              <Text style={styles.inputLabel}>Deskripsi / Catatan Singkat</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Penjelasan bahan, varian, atau rasa..."
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />

              <View style={styles.availableSwitchRow}>
                <Text style={styles.inputLabel}>Status Menu Aktif</Text>
                <Switch
                  value={isAvailable}
                  onValueChange={setIsAvailable}
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={isAvailable ? THEME.colors.primary : '#F1F5F9'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProduct}>
                <Text style={styles.saveBtnText}>Simpan Menu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingTop: 14,
    paddingBottom: 30,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  addMenuBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addMenuBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  menuItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    ...THEME.shadows.sm,
  },
  menuItemLeft: {
    flex: 1,
    paddingRight: 10,
  },
  menuItemHeader: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  menuItemCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  menuItemStockBadge: {
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
  menuItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  menuItemDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  menuItemCost: {
    fontSize: 11,
    color: THEME.colors.textLight,
  },
  menuItemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  switchWrapper: {
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: -4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: THEME.colors.dangerLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  formScroll: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.colors.text,
    marginBottom: 14,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  categorySelectRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  categoryChoice: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChoiceActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  categoryChoiceText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  categoryChoiceTextActive: {
    color: '#FFFFFF',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  availableSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
