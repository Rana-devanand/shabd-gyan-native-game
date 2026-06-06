import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { AppTheme } from "@/src/constants/Colors";

const HouseholdCreated = () => {
  const router = useRouter();
  const { skip } = useLocalSearchParams();
  const handleContinue = () => {
    router.replace("/");
  };
  const data = {
    title:
      skip === "true"
        ? "We’ve created a starter\nhousehold for you."
        : "Household Created",
    subtitle:
      skip === "true"
        ? "You can rename or update it\nanytime in Settings."
        : "Your household has been\ncreated successfully!",
  };
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Image source={require("@/assets/images/png/houseHoldSuccess.png")} />
      </View>

      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.subtitle}>{data.subtitle}</Text>

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
};

export default HouseholdCreated;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme?.lightColors?.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconWrapper: {
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#181818",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_400Regular",
    color: AppTheme?.darkColors?.grey4,
    textAlign: "center",
    marginBottom: 60,
    lineHeight: 22,
  },
  button: {
    backgroundColor: AppTheme?.lightColors?.primary,
    borderRadius: 10,
    paddingVertical: 18,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    color: AppTheme?.lightColors?.white,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});
