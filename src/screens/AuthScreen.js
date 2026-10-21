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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { AuthService } from '../services/secureStorage';
import { StorageService } from '../services/storage';
import { ApiClient } from '../services/api';

export default function AuthScreen({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('LOGIN'); // 'LOGIN' | 'REGISTER'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tokenSuccessModal, setTokenSuccessModal] = useState(null); // Modal Demo Slide 5 (Token Diterima & Disimpan)

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('Kasir & Barista');
  const [loginHistory, setLoginHistory] = useState([]);

  // Check remembered user and login history on mount
  useEffect(() => {
    async function initAuth() {
      try {
        const history = await StorageService.getLoginHistory();
        setLoginHistory(history || []);

        const remembered = await AuthService.getRememberedUser();
        if (remembered && remembered.identifier) {
          setLoginIdentifier(remembered.identifier);
        } else if (history && history.length > 0) {
          setLoginIdentifier(history[0].username || history[0].email);
        }
      } catch (e) {
        console.warn('Error loading login history:', e);
      }
    }
    initAuth();
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
      // Login via ApiClient -> triggers console [2], [3], [4] and stores access_token in SecureStore
      const { session } = await ApiClient.login(idToUse, passToUse);
      
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

      // Record to login history
      await StorageService.recordLoginHistory(session.user);
      const updatedHistory = await StorageService.getLoginHistory();
      setLoginHistory(updatedHistory || []);

      // Tampilkan popup "Login Berhasil" sederhana tanpa detail token
      setTokenSuccessModal({
        session,
        matchedEmp,
        user: session.user,
      });
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

      // Record to login history
      await StorageService.recordLoginHistory(session.user);
      const updatedHistory = await StorageService.getLoginHistory();
      setLoginHistory(updatedHistory || []);

      // Tampilkan popup "Login Berhasil" sederhana
      setTokenSuccessModal({
        session,
        matchedEmp: newEmp,
        user: session.user,
      });
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

              {/* History Login User (Pilih user lalu masukkan sandi) */}
              {loginHistory.length > 0 && (
                <View style={styles.quickAccessSection}>
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>HISTORI AKUN LOGIN</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  <Text style={styles.quickSubtitle}>
                    Pilih akun Anda di bawah, lalu masukkan kata sandi:
                  </Text>

                  <View style={styles.chipGrid}>
                    {loginHistory.slice(0, 3).map((item) => {
                      const isSelected =
                        loginIdentifier.toLowerCase() === (item.username || '').toLowerCase() ||
                        loginIdentifier.toLowerCase() === (item.email || '').toLowerCase();
                      const initials = (item.name || 'User')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <TouchableOpacity
                          key={item.id || item.username}
                          style={[styles.demoChip, isSelected && styles.demoChipSelected]}
                          onPress={() => {
                            setLoginIdentifier(item.username || item.email);
                            setLoginPassword('');
                            setErrorMessage('');
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.chipAvatar, isSelected && styles.chipAvatarSelected]}>
                            <Text style={[styles.chipAvatarText, isSelected && styles.chipAvatarTextSelected]}>
                              {initials}
                            </Text>
                          </View>
                          <View style={styles.chipDetails}>
                            <Text style={[styles.chipName, isSelected && styles.chipNameSelected]}>
                              {item.name}
                            </Text>
                            <Text style={styles.chipRole}>{item.role}</Text>
                          </View>
                          <Ionicons
                            name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                            size={16}
                            color={isSelected ? THEME.colors.primary : THEME.colors.textLight}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
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
      </ScrollView>

      {/* Modal: Login Berhasil (Sederhana & Bersih) */}
      <Modal visible={!!tokenSuccessModal} transparent animationType="fade">
        <View style={styles.tokenModalOverlay}>
          <View style={styles.tokenModalCard}>
            <View style={styles.tokenSuccessIcon}>
              <Ionicons name="checkmark-circle" size={56} color={THEME.colors.success} />
            </View>
            <Text style={styles.tokenModalTitle}>Login Berhasil</Text>
            <Text style={styles.tokenModalSubtitle}>
              Selamat datang kembali, {tokenSuccessModal?.user?.name || 'Kasir'}!
            </Text>

            <TouchableOpacity
              style={styles.tokenModalBtn}
              onPress={() => {
                const { session, matchedEmp } = tokenSuccessModal;
                setTokenSuccessModal(null);
                if (onLoginSuccess) {
                  onLoginSuccess(session, matchedEmp);
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.tokenModalBtnText}>Lanjut ke Kasir</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  demoChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: THEME.colors.primary,
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
  chipAvatarSelected: {
    backgroundColor: THEME.colors.primary,
  },
  chipAvatarTextSelected: {
    color: '#FFFFFF',
  },
  chipNameSelected: {
    color: THEME.colors.primaryDark,
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
  // Token Success Modal Styles (Demo Slide 5 Step 3)
  tokenModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tokenModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...THEME.shadows.lg,
  },
  tokenSuccessIcon: {
    marginBottom: 12,
  },
  tokenModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  tokenModalSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 18,
  },
  tokenBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 20,
  },
  tokenBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tokenBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tokenBoxContent: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    lineHeight: 15,
  },
  tokenBoxMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  tokenBoxFooter: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.success,
  },
  tokenModalBtn: {
    width: '100%',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.sm,
  },
  tokenModalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
