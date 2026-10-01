import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

export default function Header({
  activeEmployee,
  activeShift,
  onPressProfile,
  onLogout,
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
          <View style={styles.titleWrapper}>
            <Text style={styles.brandTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.brandSubtitle} numberOfLines={1}>
              {subtitle || (activeShift ? `${activeShift.shiftName.split(' ')[0]} • Aktif` : 'Shift Belum Buka')}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRight}>
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
                <Text style={styles.employeeRole} numberOfLines={1}>
                  {activeEmployee.role}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={12} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          )}

          {onLogout && (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={onLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color={THEME.colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    ...THEME.shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  titleWrapper: {
    flex: 1,
    minWidth: 0,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: THEME.colors.success,
    fontWeight: '600',
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 20,
    maxWidth: 135,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    flexShrink: 0,
  },
  employeeInfo: {
    marginRight: 4,
    maxWidth: 68,
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
  logoutButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: THEME.colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
});
