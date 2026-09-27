import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { StorageService } from '../services/storage';
import ReceiptModal from '../components/ReceiptModal';

export default function RiwayatScreen({ transactions, storeInfo }) {
  const [selectedFilter, setSelectedFilter] = useState('SEMUA'); // 'SEMUA' | 'TUNAI' | 'QRIS'
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Financial summary
  const totalOmset = transactions.reduce((sum, tx) => sum + (tx.grandTotal || 0), 0);
  const totalCash = transactions
    .filter((tx) => tx.paymentMethod === 'TUNAI')
    .reduce((sum, tx) => sum + (tx.grandTotal || 0), 0);
  const totalQris = transactions
    .filter((tx) => tx.paymentMethod === 'QRIS')
    .reduce((sum, tx) => sum + (tx.grandTotal || 0), 0);

  const filteredTransactions = transactions.filter((tx) => {
    if (selectedFilter === 'SEMUA') return true;
    return tx.paymentMethod === selectedFilter;
  });

  return (
    <View style={styles.container}>
      {/* Top Financial Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.mainOmsetCard}>
          <View>
            <Text style={styles.mainOmsetLabel}>Total Pendapatan Transaksi</Text>
            <Text style={styles.mainOmsetValue}>{StorageService.formatIDR(totalOmset)}</Text>
          </View>
          <View style={styles.txCountBadge}>
            <Ionicons name="receipt" size={16} color="#FFFFFF" />
            <Text style={styles.txCountText}>{transactions.length} Order</Text>
          </View>
        </View>

        <View style={styles.miniStatsRow}>
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatLabel}>Tunai (Cash)</Text>
            <Text style={[styles.miniStatValue, { color: THEME.colors.success }]}>
              {StorageService.formatIDR(totalCash)}
            </Text>
          </View>

          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatLabel}>QRIS Digital</Text>
            <Text style={[styles.miniStatValue, { color: THEME.colors.primary }]}>
              {StorageService.formatIDR(totalQris)}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {['SEMUA', 'TUNAI', 'QRIS'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, selectedFilter === f && styles.filterTabActive]}
            onPress={() => setSelectedFilter(f)}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedFilter === f && styles.filterTabTextActive,
              ]}
            >
              {f === 'SEMUA' ? 'Semua' : f === 'TUNAI' ? 'Tunai' : 'QRIS'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transactions List */}
      <ScrollView
        style={styles.txList}
        contentContainerStyle={styles.txListContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={54} color={THEME.colors.textLight} />
            <Text style={styles.emptyTitle}>Belum Ada Transaksi</Text>
            <Text style={styles.emptySubtitle}>
              Transaksi yang selesai di kasir akan otomatis tercatat rapi di sini.
            </Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => (
            <TouchableOpacity
              key={tx.id}
              style={styles.txCard}
              onPress={() => setSelectedTransaction(tx)}
              activeOpacity={0.7}
            >
              <View style={styles.txCardTop}>
                <View style={styles.txIdRow}>
                  <Text style={styles.txId}>{tx.id}</Text>
                  <View
                    style={[
                      styles.methodBadge,
                      tx.paymentMethod === 'TUNAI'
                        ? styles.methodBadgeCash
                        : styles.methodBadgeQris,
                    ]}
                  >
                    <Text
                      style={[
                        styles.methodBadgeText,
                        tx.paymentMethod === 'TUNAI'
                          ? styles.methodBadgeTextCash
                          : styles.methodBadgeTextQris,
                      ]}
                    >
                      {tx.paymentMethod}
                    </Text>
                  </View>
                </View>
                <Text style={styles.txTotal}>{StorageService.formatIDR(tx.grandTotal)}</Text>
              </View>

              {/* Items summary */}
              <Text style={styles.txItemsSummary} numberOfLines={1}>
                {(tx.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ')}
              </Text>

              <View style={styles.txCardBottom}>
                <View style={styles.txMetaLeft}>
                  <Ionicons name="time-outline" size={13} color={THEME.colors.textLight} />
                  <Text style={styles.txTime}>
                    {tx.date} • {tx.time}
                  </Text>
                </View>

                <View style={styles.txCashierBadge}>
                  <Ionicons name="person-outline" size={12} color={THEME.colors.textMuted} />
                  <Text style={styles.txCashierName}>{tx.cashierName}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Digital Receipt Modal (when tapping transaction) */}
      <ReceiptModal
        visible={!!selectedTransaction}
        transaction={selectedTransaction}
        storeInfo={storeInfo}
        onClose={() => setSelectedTransaction(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  mainOmsetCard: {
    backgroundColor: THEME.colors.primaryDark,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    ...THEME.shadows.sm,
  },
  mainOmsetLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  mainOmsetValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  txCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  txCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  miniStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  miniStatLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  miniStatValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: THEME.colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  txList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  txListContent: {
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
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm,
  },
  txCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  txIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txId: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  methodBadgeCash: {
    backgroundColor: THEME.colors.successLight,
  },
  methodBadgeQris: {
    backgroundColor: THEME.colors.primaryLight,
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  methodBadgeTextCash: {
    color: THEME.colors.success,
  },
  methodBadgeTextQris: {
    color: THEME.colors.primaryDark,
  },
  txTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  txItemsSummary: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 10,
  },
  txCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  txMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  txTime: {
    fontSize: 11,
    color: THEME.colors.textLight,
  },
  txCashierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  txCashierName: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
});
