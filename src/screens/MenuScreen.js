import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Switch,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { INITIAL_CATEGORIES } from '../constants/initialData';
import { StorageService } from '../services/storage';
import { ApiClient } from '../services/api';
import { networkService } from '../services/network';
import { showAlert } from '../utils/alert';
import ApiStateView from '../components/ApiStateView';

export default function MenuScreen({ products = [], onUpdateProducts }) {
  // --- State Manajemen Siklus API (Sesuai Kurikulum Sprint 05) ---
  // Status: 'idle' | 'loading' | 'retrying' | 'success' | 'error' | 'empty'
  const [apiStatus, setApiStatus] = useState('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorDetails, setErrorDetails] = useState({
    type: 'generic',
    status: 0,
    title: '',
    message: '',
  });

  // UI Filter & Modal State
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

  /**
   * IMPLEMENTASI ALUR API ALAMI (TASK 01, 02, 03 & SPRINT 05):
   * 1. setLoading(true) & setError(null) -> Tampilkan Loading State ("Memuat data...")
   * 2. Panggil API dengan timeout controller & deteksi koneksi nyata
   * 3. Periksa response.ok & HTTP status code (2xx, 4xx, 5xx)
   * 4. Jika sukses -> Simpan & tampilkan data (Success State)
   * 5. Jika gagal / offline / timeout -> Tangkap di catch & tampilkan pesan error spesifik
   * 6. Sediakan tombol "Coba Lagi" (Retry Mechanism)
   */
  const loadProducts = useCallback(
    async (isRetry = false) => {
      if (isRetry) {
        setApiStatus('retrying');
      } else {
        setApiStatus('loading');
      }

      setErrorDetails({ type: 'generic', status: 0, title: '', message: '' });

      try {
        // Ambil data produk melalui ApiClient (menangani status code, timeout 4s, dan offline check)
        const data = await ApiClient.fetchProductsWithHandling({
          timeoutMs: 4000,
        });

        if (Array.isArray(data) && data.length === 0) {
          // Sprint 05 Item 7: Empty State (Kondisi saat belum ada menu)
          setApiStatus('empty');
          onUpdateProducts([]);
        } else {
          // Sprint 05 Item 1: HTTP 2xx Success State
          setApiStatus('success');
          onUpdateProducts(data || []);
        }
      } catch (err) {
        console.log('API Error:', err);
        // Tangkap & Klasifikasi Error (Task 01, Task 02, Task 03)
        setErrorDetails({
          type: err.type || 'generic',
          status: err.status || 0,
          title: err.title || 'Gagal Mengambil Data',
          message: err.friendlyMessage || err.message || 'Terjadi kesalahan pada sistem.',
        });
        setApiStatus('error');
      } finally {
        setIsRefreshing(false);
      }
    },
    [onUpdateProducts]
  );

  // Initial Fetch pada saat pertama kali layar dibuka
  useEffect(() => {
    loadProducts(false);
  }, [loadProducts]);

  // Handler Tombol "Coba Lagi" (Retry Mechanism - Task 02 & Task 03)
  const handleRetry = async () => {
    // Jika sebelumnya error karena offline, cek konektivitas internet nyata terlebih dahulu
    if (errorDetails.type === 'offline') {
      await networkService.checkRealConnectivity();
    }
    loadProducts(true);
  };

  // Pull to refresh handler (Tarik ke bawah untuk memuat ulang data)
  const handlePullRefresh = () => {
    setIsRefreshing(true);
    loadProducts(false);
  };

  // Form CRUD methods
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
      showAlert('Perhatian', 'Nama menu wajib diisi.');
      return;
    }
    const priceNum = parseInt(price.replace(/[^0-9]/g, ''), 10);
    if (!priceNum || priceNum <= 0) {
      showAlert('Perhatian', 'Harga jual harus lebih dari 0.');
      return;
    }

    const rawStock = parseInt(stock.replace(/[^0-9]/g, ''), 10) || 0;
    const stockNum = isAvailable ? rawStock : 0;
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
    showAlert(
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
            if (updated.length === 0) {
              setApiStatus('empty');
            }
          },
        },
      ]
    );
  };

  const handleToggleStock = async (product) => {
    const nextAvailable = !product.isAvailable;
    const updated = products.map((p) => {
      if (p.id === product.id) {
        return {
          ...p,
          isAvailable: nextAvailable,
          stock: nextAvailable ? (p.stock > 0 ? p.stock : 20) : 0,
        };
      }
      return p;
    });
    await StorageService.saveProducts(updated);
    onUpdateProducts(updated);
  };

  const filteredProducts = (products || []).filter((p) => {
    const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <View style={styles.container}>
      {/* 1. Kondisi Loading & Retrying State (Task 02) */}
      {(apiStatus === 'loading' || apiStatus === 'retrying') && (
        <ApiStateView
          type={apiStatus}
          isOfflineRetry={errorDetails.type === 'offline'}
        />
      )}

      {/* 2. Kondisi Error State (Task 01, Task 02, Task 03, Sprint 05) */}
      {apiStatus === 'error' && (
        <ApiStateView
          type={errorDetails.type}
          title={errorDetails.title}
          message={errorDetails.message}
          onRetry={handleRetry}
          retryLabel="Coba Lagi"
        />
      )}

      {/* 3. Kondisi Empty State (Sprint 05 Item 7: Belum Ada Data) */}
      {apiStatus === 'empty' && (
        <ApiStateView
          type="empty"
          title="Belum ada data"
          message="Saat ini belum ada menu atau produk yang tersedia."
          onRetry={async () => {
            // Pulihkan menu bawaan jika data sempat terhapus semua
            await StorageService.init();
            loadProducts(true);
          }}
          retryLabel="Muat Menu Bawaan"
        />
      )}

      {/* 4. Kondisi Sukses (2xx): Tampilkan Katalog & Daftar Menu */}
      {apiStatus === 'success' && (
        <>
          {/* Top Search & Filter Bar */}
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
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handlePullRefresh}
                colors={[THEME.colors.primary]}
                tintColor={THEME.colors.primary}
              />
            }
          >
            <View style={styles.listHeaderRow}>
              <Text style={styles.listTitle}>
                Daftar Menu ({filteredProducts.length} Produk)
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
                    <View
                      style={[
                        styles.statusBadge,
                        prod.isAvailable ? styles.statusBadgeAvailable : styles.statusBadgeHabis,
                      ]}
                    >
                      <Text
                        style={[
                          styles.switchLabel,
                          prod.isAvailable ? styles.switchLabelAvailable : styles.switchLabelHabis,
                        ]}
                      >
                        {prod.isAvailable ? 'Tersedia' : 'Habis'}
                      </Text>
                    </View>
                    <Switch
                      value={prod.isAvailable}
                      onValueChange={() => handleToggleStock(prod)}
                      trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                      thumbColor={prod.isAvailable ? THEME.colors.primary : '#F1F5F9'}
                      style={Platform.select({
                        web: { transform: [{ scale: 0.82 }], cursor: 'pointer', marginVertical: 2 },
                        ios: { transform: [{ scale: 0.78 }], marginVertical: 2 },
                        android: { transform: [{ scale: 0.88 }], marginVertical: 1 },
                        default: { marginVertical: 2 },
                      })}
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
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
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
                  onValueChange={(val) => {
                    setIsAvailable(val);
                    if (!val) setStock('0');
                  }}
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
        </KeyboardAvoidingView>
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
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  statusBadgeAvailable: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeHabis: {
    backgroundColor: '#FEF2F2',
  },
  switchLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  switchLabelAvailable: {
    color: '#059669',
  },
  switchLabelHabis: {
    color: '#DC2626',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
    ...THEME.shadows.lg,
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
    textAlignVertical: 'center',
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
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    gap: 10,
    backgroundColor: '#FFFFFF',
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
