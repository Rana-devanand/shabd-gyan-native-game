import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Dimensions,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeMode } from "@rneui/themed";

export interface SelectionOption {
  label: string;
  value: string;
  icon?: string; // emoji or text prefix
  subtitle?: string;
}

interface SelectionModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: SelectionOption[];
  selectedValue: string;
  onSelect: (option: SelectionOption) => void;
  onClose: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  accentColor?: string;
}

const { height } = Dimensions.get("window");

export default function SelectionModal({
  visible,
  title,
  subtitle,
  options,
  selectedValue,
  onSelect,
  onClose,
  searchable = false,
  searchPlaceholder = "Search...",
  accentColor = "#3B82F6",
}: SelectionModalProps) {
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  const bgColor = isDark ? "#021A30" : "#FFFFFF";
  const handleBg = isDark ? "#1E3A5F" : "#E2E8F0";
  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const subTextColor = isDark ? "#8AB4D4" : "#475569";
  const borderColor = isDark ? "#072C50" : "#E8EDF4";
  const inputBg = isDark ? "#05203B" : "#F1F5F9";

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, options]);

  const handleSelect = (opt: SelectionOption) => {
    onSelect(opt);
    setQuery("");
    onClose();
  };

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={[styles.sheet, { backgroundColor: bgColor }]}>
        {/* Handle bar */}
        <View style={[styles.handle, { backgroundColor: handleBg }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: textColor }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: subTextColor }]}>{subtitle}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: inputBg }]}>
            <Ionicons name="close" size={18} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        {searchable && (
          <View style={[styles.searchWrap, { backgroundColor: inputBg, borderColor }]}>
            <Ionicons name="search-outline" size={16} color={subTextColor} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={subTextColor}
              style={[styles.searchInput, { color: textColor }]}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={16} color={subTextColor} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Options List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.value}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: borderColor }]} />
          )}
          renderItem={({ item }) => {
            const isSelected = item.value === selectedValue;
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelect(item)}
                style={[
                  styles.optionRow,
                  isSelected && { backgroundColor: isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.05)" },
                ]}
              >
                {item.icon ? (
                  <Text style={styles.optionIcon}>{item.icon}</Text>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, { color: isSelected ? accentColor : textColor }]}>
                    {item.label}
                  </Text>
                  {item.subtitle ? (
                    <Text style={[styles.optionSubtitle, { color: subTextColor }]}>{item.subtitle}</Text>
                  ) : null}
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color={accentColor} />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={32} color={subTextColor} />
              <Text style={[styles.emptyText, { color: subTextColor }]}>No results found</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    maxHeight: height * 0.72,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  separator: {
    height: 1,
    marginHorizontal: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 10,
  },
  optionIcon: {
    fontSize: 22,
    width: 30,
    textAlign: "center",
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
  },
  optionSubtitle: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 1,
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 30,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_500Medium",
  },
});
