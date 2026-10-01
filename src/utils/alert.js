import { Alert as RNAlert, Platform } from 'react-native';

/**
 * Cross-platform alert utility.
 * On Native (Android & iOS), delegates to React Native's native Alert.alert.
 * On Web, handles single-action alerts via window.alert and dual-action confirmations via window.confirm.
 */
export const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    const dialogMessage = title ? `${title}\n\n${message || ''}` : message || '';

    // If no buttons or only 1 button, show simple alert
    if (!buttons || buttons.length <= 1) {
      if (typeof window !== 'undefined') {
        window.alert(dialogMessage);
      }
      if (buttons && buttons[0] && typeof buttons[0].onPress === 'function') {
        buttons[0].onPress();
      }
      return;
    }

    // If multiple buttons (e.g. Cancel + Confirm/Destructive)
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const actionBtn = buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(dialogMessage);
      if (confirmed) {
        if (actionBtn && typeof actionBtn.onPress === 'function') {
          actionBtn.onPress();
        }
      } else {
        if (cancelBtn && typeof cancelBtn.onPress === 'function') {
          cancelBtn.onPress();
        }
      }
    }
  } else {
    RNAlert.alert(title, message, buttons);
  }
};

export default showAlert;
