import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

export default function Header({
  activeEmployee,
  activeShift,
  onPressProfile,
  title = 'KasirKu',
  subtitle,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="storefront" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>{title}</Text>
            <Text style={styles.brandSubtitle}>
              {subtitle || (activeShift ? `${activeShift.shiftName.split(' ')[0]} • Aktif` : 'Shift Belum Buka')}
            </Text>
          </View>
        </View>

        {activeEmployee && (
          <TouchableOpacity
            style={styles.profileBadge}
            onPress={onPressProfile}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Ionicons name="person" size={14} color={THEME.colors.primary} />
            </View>
            <View style={styles.employeeInfo}>
              <Text style={styles.employeeName} numberOfLines={1}>
                {activeEmployee.name}
              </Text>
              <Text style={styles.employeeRole}>{activeEmployee.role}</Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    ...THEME.shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: THEME.colors.success,
    fontWeight: '600',
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 20,
    maxWidth: 160,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  employeeInfo: {
    marginRight: 4,
  },
  employeeName: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  employeeRole: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
});
