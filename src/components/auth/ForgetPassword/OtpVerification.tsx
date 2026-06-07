import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "@/src/constants/Colors";
import { OtpInput } from "react-native-otp-entry";
import Toast from "react-native-toast-message";
import AuthWrapper from "../../common/AuthWrapper";

const OTP_LENGTH = 4;

const OtpVerification = () => {
  const router = useRouter();
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(59);
  const { email } = useLocalSearchParams();

  // Timer logic
  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const maskEmail = (email: string) => {
    if (!email.includes("@")) return email;
    const [localPart, domain] = email.split("@");
    if (localPart.length <= 3) return email;
    const maskedLocal = `${localPart.substring(0, 3)}******`;
    const [domainName] = domain.split(".");
    return `${maskedLocal}@${domainName}.com`;
  };

  const handleResend = () => {
    // Add your resend OTP logic here
    Toast.show({
      type: 'success',
      text1: 'OTP Resent',
      text2: 'A new OTP has been sent to your email.'
    });
    setTimer(59); // Reset timer
    setOtp(new Array(OTP_LENGTH).fill("")); // Clear OTP fields
  };

  const handleContinue = () => {
    const enteredOtp = otp.join("");
    if (enteredOtp.length === OTP_LENGTH) {
      Toast.show({
        type: 'success',
        text1: 'OTP Verified',
      })
      router.replace(`/reset-password?type=reset-password`);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Wrong OTP',
        text2: 'Please enter the complete OTP.'
      })
    }
  };

  return (
    <AuthWrapper>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons
          name="arrow-back"
          size={28}
          color={AppTheme.darkColors?.black}
        />
      </TouchableOpacity>
      <View style={styles.container}>
        <Text style={styles.title}>OTP Verification {"\n"}</Text>
        <Text style={styles.subtitle}>
          Enter OTP sent on you Email{"\n"}
          <Text style={styles.maskedEmail}>{maskEmail(email.toString())}</Text>
        </Text>

        <Text style={styles.otpLabel}>OTP</Text>

        {/* --- OTP Input Fields --- */}
        <OtpInput
          numberOfDigits={OTP_LENGTH}
          focusColor={`${AppTheme.lightColors?.primary}`}
          onTextChange={(text) => setOtp(text.split(""))}
          onFilled={(text) => {
            setOtp(text.split(""));
          }}
          theme={{
            pinCodeContainerStyle: styles.otpInput,
            pinCodeTextStyle: {
              color: AppTheme.darkColors?.black,
              fontSize: 18,
            },
          }}
        />

        {/* --- Resend Timer --- */}
        <View style={styles.resendContainer}>
          {timer > 0 ? (
            <Text style={styles.timerText}>
              Resend code in{" "}
              <Text style={styles.timerHighlight}>{timer} seconds</Text>
            </Text>
          ) : (
            <View style={styles.resendButton}>
              <Text style={styles.resendText}>Didn`t receive the code? </Text>
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendButtonText}>Resend code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </AuthWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
  },
  backButton: {
    position: "absolute",
    top: 10,
    left: 25,
  },
  title: {
    textAlign: "center",
    lineHeight: 24,
    fontSize: 20,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_400Regular",
    color: AppTheme.lightColors?.grey5,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  maskedEmail: {
    fontWeight: "400",
    color: AppTheme.lightColors?.grey5,
  },
  otpLabel: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: AppTheme.lightColors?.grey5,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  otpInput: {
    width: 70,
    height: 60,
    borderWidth: 1.5,
    borderColor: "#E9E9E9",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "400",
    backgroundColor: "#FAFAFA",
    color: AppTheme.darkColors?.black,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  resendContainer: {
    alignSelf: "flex-end",
    marginVertical: 30,
  },
  resendButton: {
    flexDirection: "row",
    alignSelf: "flex-end",
    alignItems: "center",
  },
  resendText: {
    color: AppTheme.lightColors?.grey5,
    fontFamily: "PlusJakartaSans_400Regular",

  },
  timerText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: AppTheme.lightColors?.grey5,
  },
  timerHighlight: {
    fontFamily: "PlusJakartaSans_400Regular",
    color: AppTheme.lightColors?.primary,
  },
  resendButtonText: {
    fontSize: 14,
    color: AppTheme.lightColors?.primary,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  continueButton: {
    backgroundColor: AppTheme.lightColors?.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  continueButtonText: {
    color: AppTheme.lightColors?.white,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "bold",
    fontSize: 18,
  },
});

export default OtpVerification;
