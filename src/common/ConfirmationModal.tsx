import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeMode } from "@rneui/themed";

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

const { width } = Dimensions.get("window");

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmationModalProps) {
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  const bgColor = isDark ? "#021A30" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const subTextColor = isDark ? "#8AB4D4" : "#475569";
  const borderColor = isDark ? "#072C50" : "#E2E8F0";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        
        <View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconWrapper,
                {
                  backgroundColor: isDestructive
                    ? "rgba(239, 68, 68, 0.1)"
                    : "rgba(59, 130, 246, 0.1)",
                },
              ]}
            >
              <Ionicons
                name={isDestructive ? "alert-circle" : "information-circle"}
                size={32}
                color={isDestructive ? "#EF4444" : "#3B82F6"}
              />
            </View>
          </View>

          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          <Text style={[styles.message, { color: subTextColor }]}>{message}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.btn, styles.cancelBtn, { borderColor }]}
              onPress={onCancel}
            >
              <Text style={[styles.btnText, { color: textColor }]}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.btn,
                styles.confirmBtn,
                { backgroundColor: isDestructive ? "#EF4444" : "#3B82F6" },
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.btnText, styles.confirmBtnText]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 14, 28, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  confirmBtn: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  btnText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
  },
  confirmBtnText: {
    color: "#FFFFFF",
  },
});
