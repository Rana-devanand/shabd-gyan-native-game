import React from "react";
import { useForm } from "react-hook-form";
import { TouchableOpacity, View, Text, StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AuthWrapper from "../../common/AuthWrapper";
import CustomInput from "../../common/CustomInput";
import { router } from "expo-router";
import { AppTheme } from "@/src/constants/Colors";
import { Button } from "react-native-paper";

type FormData = {
  householdName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};

const CreateHousehold = () => {
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      householdName: "",
      street: "",
      city: "",
      state: "",
      zip: "",
    },
  });

  const handleContinue = (data: FormData) => {
    router.push(`/success?skip=${false}`);
    // redirect logic or API call here
  };

  const handleSkip = () => {
    console.log("Skipped");
    router.push(`/success?skip=${true}`);
  };

  return (
    <AuthWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Create Household</Text>
        <Text style={styles.subtitle}>
          Fill the details to create your household
        </Text>
        {/* Name of Household */}
        <CustomInput
          name="householdName"
          label="Name of Household"
          control={control}
          placeholder="Give name to household"
        />

        {/* Address Section */}
        <View style={styles.addressHeader}>
          <Text style={styles.addressLabel}>Address</Text>
          <TouchableOpacity style={styles.locationRow}>
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={16}
              color={`${AppTheme?.lightColors?.primary}`}
            />
            <Text style={styles.locationText}>Use current location</Text>
          </TouchableOpacity>
        </View>

        <CustomInput
          name="street"
          label="Street Address"
          control={control}
          placeholder="Enter full address"
        />

        <CustomInput
          name="city"
          label="City"
          control={control}
          placeholder="Enter city name"
        />

        {/* State and Zip Code Row */}
        <View style={styles.row}>
          <View style={styles.half}>
            <CustomInput
              name="state"
              label="State"
              control={control}
              placeholder="Enter state name"
            />
          </View>
          <View style={styles.half}>
            <CustomInput
              name="zip"
              label="Zip Code"
              control={control}
              placeholder="Enter zip code"
            />
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleSubmit(handleContinue)}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>

        {/* Skip Option */}
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip Now</Text>
        </TouchableOpacity>
      </View>
    </AuthWrapper>
  );
};

export default CreateHousehold;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    marginTop: Platform.OS === "android" ? 100 : 10,
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontFamily: "PlusJakartaSans_600SemiBold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_400Regular",
    color: AppTheme.lightColors?.grey5,
    textAlign: "center",
    marginBottom: 30,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
    marginBottom: 18,
  },
  addressLabel: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: AppTheme?.darkColors?.black,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    color: AppTheme?.lightColors?.primary,
    marginLeft: 4,
    fontSize: 13,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  half: {
    flex: 0.48,
  },
  continueButton: {
    backgroundColor: AppTheme?.lightColors?.primary,
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 16,
  },
  continueText: {
    color: AppTheme?.lightColors?.white,
    fontSize: 16,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  skipText: {
    textAlign: "center",
    color: AppTheme?.lightColors?.primary,
    marginTop: 16,
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});
