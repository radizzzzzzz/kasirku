import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { AuthService } from '../services/secureStorage';
import { StorageService } from '../services/storage';

export default function AuthScreen({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('LOGIN'); // 'LOGIN' | 'REGISTER'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('Kasir & Barista');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Check remembered user on mount
  useEffect(() => {
    async function checkRemembered() {
      try {
        const remembered = await AuthService.getRememberedUser();
        if (remembered && remembered.identifier) {
          setLoginIdentifier(remembered.identifier);
        }
      } catch (e) {
        console.warn('Error reading remembered user:', e);
      }
    }
    checkRemembered();
  }, []);

  const handleLogin = async (overrideIdentifier, overridePassword) => {
    const idToUse = overrideIdentifier || loginIdentifier;
    const passToUse = overridePassword || loginPassword;

    setErrorMessage('');
    setSuccessMessage('');

    if (!idToUse.trim()) {
      setErrorMessage('Silakan masukkan Username atau Email.');
      return;
    }
    if (!passToUse.trim()) {
      setErrorMessage('Silakan masukkan Kata Sandi (Password).');
      return;
    }

    setIsLoading(true);
    try {
      const session = await AuthService.login(idToUse, passToUse, rememberMe);
      
      // Also sync active employee with the logged in user
      const employees = await StorageService.getEmployees();
      let matchedEmp = employees.find(
        (e) =>
          (session.user.employeeId && e.id === session.user.employeeId) ||
          e.name.toLowerCase() === session.user.name.toLowerCase()
      );

      if (!matchedEmp) {
        matchedEmp = {
          id: session.user.employeeId || `EMP-${Date.now().toString().slice(-4)}`,
          name: session.user.name,
          role: session.user.role,
          phone: '0812-0000-0000',
          pin: '1234',
        };
        await StorageService.addEmployee(matchedEmp);
      }

      await StorageService.setActiveEmployee(matchedEmp);

      if (onLoginSuccess) {
        onLoginSuccess(session, matchedEmp);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Gagal masuk. Periksa kembali akun Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!regName.trim()) {
      setErrorMessage('Nama lengkap wajib diisi.');
      return;
    }
    if (!regUsername.trim()) {
      setErrorMessage('Username wajib diisi.');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage('Email wajib diisi.');
      return;
    }
    if (!regPassword) {
      setErrorMessage('Kata sandi wajib diisi.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);
    try {
      const { session, newUser } = await AuthService.register({
        name: regName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        role: regRole,
      });

      // Synchronize new registered employee to Local Storage (AsyncStorage)
      const newEmp = {
        id: newUser.employeeId,
        name: newUser.name,
        role: newUser.role,
        phone: '0812-8888-9999',
        pin: '1234',
      };
      await StorageService.addEmployee(newEmp);
      await StorageService.setActiveEmployee(newEmp);

      setSuccessMessage('Pendaftaran berhasil! Mengalihkan...');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(session, newEmp);
        }
      }, 500);
    } catch (err) {
      setErrorMessage(err.message || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick preset accounts for smooth testing
  const handleQuickLogin = (uname, pass) => {
    setLoginIdentifier(uname);
    setLoginPassword(pass);
    handleLogin(uname, pass);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Banner */}
        <View style={styles.brandHero}>
          <View style={styles.logoBadge}>
            <Ionicons name="storefront" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>KasirKu POS</Text>
          <Text style={styles.brandTagline}>
            Point of Sales, Shift & Presensi Karyawan
          </Text>

          {/* Security & Storage Architecture Badges */}
          <View style={styles.securityPillsRow}>
            <View style={styles.securityPill}>
              <Ionicons name="shield-checkmark" size={13} color={THEME.colors.success} />
              <Text style={styles.securityPillText}>Secure Storage (Keystore)</Text>
            </View>
            <View style={styles.securityPill}>
              <Ionicons name="file-tray-full" size={13} color={THEME.colors.primary} />
              <Text style={styles.securityPillText}>Local Storage (AsyncStorage)</Text>
            </View>
          </View>
        </View>

        {/* Main Card Container */}
        <View style={styles.authCard}>
          {/* Segmented Auth Mode Switcher */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tabButton, authMode === 'LOGIN' && styles.tabButtonActive]}
              onPress={() => {
                setAuthMode('LOGIN');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="log-in-outline"
                size={16}
                color={authMode === 'LOGIN' ? THEME.colors.primary : THEME.colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  authMode === 'LOGIN' && styles.tabButtonTextActive,
                ]}
              >
                Masuk
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, authMode === 'REGISTER' && styles.tabButtonActive]}
              onPress={() => {
                setAuthMode('REGISTER');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-add-outline"
                size={16}
                color={authMode === 'REGISTER' ? THEME.colors.primary : THEME.colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  authMode === 'REGISTER' && styles.tabButtonTextActive,
                ]}
              >
                Daftar Akun
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message Box */}
          {!!errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={THEME.colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Success Message Box */}
          {!!successMessage && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={18} color={THEME.colors.success} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* LOGIN FORM */}
          {authMode === 'LOGIN' ? (
            <View style={styles.formContainer}>
              {/* Username / Email Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username atau Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={THEME.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Contoh: syauqi atau admin@kasirku.com"
                    placeholderTextColor={THEME.colors.textLight}
                    value={loginIdentifier}
                    onChangeText={setLoginIdentifier}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {loginIdentifier.length > 0 && (
                    <TouchableOpacity onPress={() => setLoginIdentifier('')}>
                      <Ionicons name="close-circle" size={18} color={THEME.colors.textLight} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kata Sandi (Password)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={THEME.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Masukkan kata sandi..."
                    placeholderTextColor={THEME.colors.textLight}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIconBtn}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={THEME.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me Option */}
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.rememberText}>Simpan sesi di Secure Storage (Ingat Saya)</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={() => handleLogin()}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Masuk ke KasirKu</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </TouchableOpacity>

              {/* Quick Preset Login Chips (Great for testing) */}
              <View style={styles.quickAccessSection}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>AKUN DEMO CEPAT</Text>
                  <View style={styles.dividerLine} />
                </View>
                <Text style={styles.quickSubtitle}>
                  Klik salah satu akun bawaan berikut untuk langsung masuk:
                </Text>

                <View style={styles.chipGrid}>
                  <TouchableOpacity
                    style={styles.demoChip}
                    onPress={() => handleQuickLogin('syauqi', 'password123')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.chipAvatar}>
                      <Text style={styles.chipAvatarText}>SI</Text>
                    </View>
                    <View style={styles.chipDetails}>
                      <Text style={styles.chipName}>Syauqi Iwan</Text>
                      <Text style={styles.chipRole}>Kasir & Barista</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={THEME.colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.demoChip}
                    onPress={() => handleQuickLogin('admin', 'admin123')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.chipAvatar, { backgroundColor: '#F3E8FF' }]}>
                      <Text style={[styles.chipAvatarText, { color: '#7E22CE' }]}>AD</Text>
                    </View>
                    <View style={styles.chipDetails}>
                      <Text style={styles.chipName}>Administrator</Text>
                      <Text style={styles.chipRole}>Supervisor & Toko</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={THEME.colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.demoChip}
                    onPress={() => handleQuickLogin('siti', 'password123')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.chipAvatar, { backgroundColor: '#ECFDF5' }]}>
                      <Text style={[styles.chipAvatarText, { color: '#047857' }]}>SR</Text>
                    </View>
                    <View style={styles.chipDetails}>
                      <Text style={styles.chipName}>Siti Rahma</Text>
                      <Text style={styles.chipRole}>Kasir & Kitchen</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={THEME.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            /* REGISTER FORM */
            <View style={styles.formContainer}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Lengkap Karyawan</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={THEME.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Contoh: Rian Anggara"
                    placeholderTextColor={THEME.colors.textLight}
                    value={regName}
                    onChangeText={setRegName}
                  />
                </View>
              </View>

              {/* Username */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username Login</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="at-outline"
                    size={18}
                    color={THEME.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Contoh: rian_kasir"
                    placeholderTextColor={THEME.colors.textLight}
                    value={regUsername}
                    onChangeText={setRegUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alamat Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={THEME.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Contoh: rian@kasirku.com"
                    placeholderTextColor={THEME.colors.textLight}
                    value={regEmail}
                    onChangeText={setRegEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Role Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Peran / Jabatan</Text>
                <View style={styles.roleSelectionRow}>
                  {['Kasir & Barista', 'Kasir & Kitchen', 'Supervisor'].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleChip, regRole === r && styles.roleChipActive]}
                      onPress={() => setRegRole(r)}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          regRole === r && styles.roleChipTextActive,
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kata Sandi (Minimal 4 Karakter)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={THEME.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Masukkan kata sandi..."
                    placeholderTextColor={THEME.colors.textLight}
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry={!showRegPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowRegPassword(!showRegPassword)}
                    style={styles.eyeIconBtn}
                  >
                    <Ionicons
                      name={showRegPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={THEME.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ulangi Kata Sandi</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={THEME.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ulangi kata sandi..."
                    placeholderTextColor={THEME.colors.textLight}
                    value={regConfirmPassword}
                    onChangeText={setRegConfirmPassword}
                    secureTextEntry={!showRegPassword}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Register Submit Button */}
              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Daftar & Masuk Otomatis</Text>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Security & Local Storage Explanatory Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>Arsitektur Penyimpanan KasirKu</Text>
          <View style={styles.infoRow}>
            <Ionicons name="key" size={16} color={THEME.colors.primary} style={{ marginTop: 2 }} />
            <Text style={styles.infoRowText}>
              <Text style={{ fontWeight: '800', color: THEME.colors.text }}>Secure Storage: </Text>
              Menyimpan session token, password, dan kredensial terenkripsi dengan aman (Hardware Keystore / Keychain).
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons
              name="server"
              size={16}
              color={THEME.colors.secondary}
              style={{ marginTop: 2 }}
            />
            <Text style={styles.infoRowText}>
              <Text style={{ fontWeight: '800', color: THEME.colors.text }}>Local Storage: </Text>
              Menyimpan katalog menu, transaksi offline, log shift, dan data operasional toko dengan AsyncStorage.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...THEME.shadows.md,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: THEME.colors.text,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  securityPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 5,
  },
  securityPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...THEME.shadows.md,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...THEME.shadows.sm,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  tabButtonTextActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.dangerLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: THEME.colors.danger,
    fontWeight: '700',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.successLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 8,
  },
  successText: {
    fontSize: 12,
    color: THEME.colors.success,
    fontWeight: '700',
    flex: 1,
  },
  formContainer: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.inputBg,
    borderWidth: 1.2,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.text,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  eyeIconBtn: {
    padding: 6,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: THEME.colors.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  rememberText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    marginTop: 6,
    ...THEME.shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  quickAccessSection: {
    marginTop: 20,
    paddingTop: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.border,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textLight,
    paddingHorizontal: 10,
    letterSpacing: 0.8,
  },
  quickSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  chipGrid: {
    gap: 8,
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  chipAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  chipAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
  },
  chipDetails: {
    flex: 1,
  },
  chipName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  chipRole: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  roleSelectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleChipActive: {
    backgroundColor: THEME.colors.primaryLight,
    borderColor: THEME.colors.primary,
  },
  roleChipText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: THEME.colors.primaryDark,
    fontWeight: '800',
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  infoBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoRowText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
});
